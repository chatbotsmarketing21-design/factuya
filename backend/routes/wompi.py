from fastapi import APIRouter, HTTPException, Depends, Request
import os
import httpx
import hashlib
import json
from urllib.parse import urlencode, quote
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel
from typing import Optional, Dict, Any
from utils.auth import get_current_user_id
import uuid

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/wompi", tags=["Wompi Payments"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Wompi configuration
WOMPI_PUBLIC_KEY = os.environ.get('WOMPI_PUBLIC_KEY', '')
WOMPI_PRIVATE_KEY = os.environ.get('WOMPI_PRIVATE_KEY', '')
WOMPI_INTEGRITY_KEY = os.environ.get('WOMPI_INTEGRITY_KEY', '')

# Determine if using sandbox or production
IS_SANDBOX = 'test' in WOMPI_PUBLIC_KEY
WOMPI_API_URL = "https://sandbox.wompi.co/v1" if IS_SANDBOX else "https://production.wompi.co/v1"

# Subscription pricing configuration
# Source of truth: $5 USD per month, converted to COP at the live exchange rate
SUBSCRIPTION_PRICE_USD = 3.99
FALLBACK_USD_TO_COP_RATE = 4200  # Used only if all exchange rate APIs fail

# In-memory cache for the USD->COP exchange rate (1 hour TTL)
_exchange_rate_cache = {
    "rate": None,
    "fetched_at": None,
    "source": None,
}
_RATE_CACHE_TTL_SECONDS = 3600  # 1 hour

async def get_usd_to_cop_rate() -> dict:
    """Fetch current USD->COP exchange rate.

    Order of preference:
    1. Colombia's official TRM (Tasa Representativa del Mercado) from datos.gov.co
    2. open.er-api.com (community-maintained, no key required)
    3. Hardcoded fallback rate
    Results are cached in-memory for 1 hour.
    """
    now = datetime.now(timezone.utc)
    cached = _exchange_rate_cache

    # Serve from cache if still fresh
    if cached["rate"] and cached["fetched_at"]:
        age = (now - cached["fetched_at"]).total_seconds()
        if age < _RATE_CACHE_TTL_SECONDS:
            return {
                "rate": cached["rate"],
                "source": cached["source"],
                "fetched_at": cached["fetched_at"].isoformat(),
                "cached": True,
            }

    # 1. Try Colombia's official TRM
    try:
        async with httpx.AsyncClient(timeout=8.0) as http_client:
            resp = await http_client.get(
                "https://www.datos.gov.co/resource/32sa-8pi3.json",
                params={"$limit": 1, "$order": "vigenciadesde DESC"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data and data[0].get("valor"):
                    rate = float(data[0]["valor"])
                    if rate > 1000:  # sanity check
                        _exchange_rate_cache.update({
                            "rate": rate,
                            "fetched_at": now,
                            "source": "datos.gov.co (TRM oficial)",
                        })
                        return {
                            "rate": rate,
                            "source": "datos.gov.co (TRM oficial)",
                            "fetched_at": now.isoformat(),
                            "cached": False,
                        }
    except Exception as e:
        print(f"[Wompi] TRM API error: {e}")

    # 2. Fallback: open.er-api.com
    try:
        async with httpx.AsyncClient(timeout=8.0) as http_client:
            resp = await http_client.get("https://open.er-api.com/v6/latest/USD")
            if resp.status_code == 200:
                data = resp.json()
                cop_rate = data.get("rates", {}).get("COP")
                if cop_rate and float(cop_rate) > 1000:
                    rate = float(cop_rate)
                    _exchange_rate_cache.update({
                        "rate": rate,
                        "fetched_at": now,
                        "source": "open.er-api.com",
                    })
                    return {
                        "rate": rate,
                        "source": "open.er-api.com",
                        "fetched_at": now.isoformat(),
                        "cached": False,
                    }
    except Exception as e:
        print(f"[Wompi] open.er-api.com error: {e}")

    # 3. Last resort: hardcoded fallback rate
    return {
        "rate": float(FALLBACK_USD_TO_COP_RATE),
        "source": "fallback (hardcoded)",
        "fetched_at": now.isoformat(),
        "cached": False,
    }

async def calculate_subscription_price() -> dict:
    """Compute current subscription price in COP based on live USD->COP rate.

    Returns the amount in centavos (Wompi format) and additional metadata for transparency.
    """
    rate_info = await get_usd_to_cop_rate()
    rate = rate_info["rate"]

    # $5 USD * rate -> COP, rounded to the nearest 100 COP for a clean amount
    cop_raw = SUBSCRIPTION_PRICE_USD * rate
    cop_rounded = int(round(cop_raw / 100.0) * 100)
    centavos = cop_rounded * 100  # Wompi expects centavos

    return {
        "amount_centavos": centavos,
        "amount_cop": cop_rounded,
        "amount_usd": SUBSCRIPTION_PRICE_USD,
        "exchange_rate": rate,
        "rate_source": rate_info["source"],
        "rate_fetched_at": rate_info["fetched_at"],
        "rate_cached": rate_info.get("cached", False),
    }

# Pydantic models
class CreateWompiCheckoutRequest(BaseModel):
    originUrl: str

class WompiWebhookPayload(BaseModel):
    event: str
    data: Dict[str, Any]
    timestamp: int
    signature: Dict[str, Any]

def generate_integrity_signature(reference: str, amount_cents: int, currency: str = "COP") -> str:
    """Generate integrity signature for Wompi checkout"""
    # Format: reference + amount + currency + integrity_key
    string_to_hash = f"{reference}{amount_cents}{currency}{WOMPI_INTEGRITY_KEY}"
    return hashlib.sha256(string_to_hash.encode()).hexdigest()

@router.get("/config")
async def get_wompi_config():
    """Get Wompi public configuration for frontend, with live USD->COP price."""
    price = await calculate_subscription_price()
    return {
        "publicKey": WOMPI_PUBLIC_KEY,
        "currency": "COP",
        "amountInCents": price["amount_centavos"],
        "amountCOP": price["amount_cop"],
        "amountUSD": price["amount_usd"],
        "exchangeRate": price["exchange_rate"],
        "rateSource": price["rate_source"],
        "rateFetchedAt": price["rate_fetched_at"],
    }

@router.get("/exchange-rate")
async def get_exchange_rate():
    """Public endpoint to inspect the current USD->COP rate used for billing."""
    return await calculate_subscription_price()

@router.post("/create-checkout")
async def create_wompi_checkout(
    request: Request,
    checkout_data: CreateWompiCheckoutRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Create Wompi checkout session for subscription payment"""
    try:
        # Get user info
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Compute the live COP price for $5 USD at the current exchange rate
        price = await calculate_subscription_price()
        amount_centavos = price["amount_centavos"]

        # Generate unique reference (alphanumeric, no special chars except - and _)
        reference = f"factuya{uuid.uuid4().hex[:12]}"
        
        # Build redirect URLs
        origin_url = checkout_data.originUrl
        redirect_url = f"{origin_url}/subscription?payment=wompi&reference={reference}"
        
        # Generate integrity signature for widget
        # Format: reference + amount + currency + integrity_key
        integrity_signature = generate_integrity_signature(reference, amount_centavos)
        
        # Create payment transaction record
        transaction = {
            "userId": user_id,
            "reference": reference,
            "amount": amount_centavos,
            "amountCOP": price["amount_cop"],
            "amountUSD": price["amount_usd"],
            "exchangeRate": price["exchange_rate"],
            "rateSource": price["rate_source"],
            "currency": "COP",
            "status": "pending",
            "paymentGateway": "wompi",
            "metadata": {
                "user_email": user.get("email", ""),
                "plan": "premium_monthly"
            },
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        await db.wompi_transactions.insert_one(transaction)
        
        # Build Wompi Web Checkout URL (form method GET)
        # According to docs: https://checkout.wompi.co/p/
        # The signature:integrity parameter must have the colon
        base_url = "https://checkout.wompi.co/p/"
        params = [
            f"public-key={WOMPI_PUBLIC_KEY}",
            f"currency=COP",
            f"amount-in-cents={amount_centavos}",
            f"reference={reference}",
            f"signature:integrity={integrity_signature}",
            f"redirect-url={quote(redirect_url, safe='')}"
        ]
        
        checkout_url = f"{base_url}?{'&'.join(params)}"
        
        return {
            "checkoutUrl": checkout_url,
            "reference": reference,
            "publicKey": WOMPI_PUBLIC_KEY,
            "amountInCents": amount_centavos,
            "amountCOP": price["amount_cop"],
            "amountUSD": price["amount_usd"],
            "exchangeRate": price["exchange_rate"],
            "rateSource": price["rate_source"],
            "currency": "COP",
            "integritySignature": integrity_signature,
            "redirectUrl": redirect_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/verify/{reference}")
async def verify_wompi_payment(
    reference: str,
    user_id: str = Depends(get_current_user_id)
):
    """Verify payment status by reference"""
    try:
        # Find transaction in our database
        transaction = await db.wompi_transactions.find_one({"reference": reference})
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaccion no encontrada")
        
        # Query Wompi API to get transaction status
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f"{WOMPI_API_URL}/transactions",
                params={"reference": reference},
                headers={"Authorization": f"Bearer {WOMPI_PRIVATE_KEY}"},
                timeout=30.0
            )
            
            if response.status_code == 200:
                wompi_data = response.json()
                transactions = wompi_data.get("data", [])
                
                if transactions:
                    wompi_transaction = transactions[0]
                    wompi_status = wompi_transaction.get("status")
                    
                    # Update our transaction record
                    await db.wompi_transactions.update_one(
                        {"reference": reference},
                        {
                            "$set": {
                                "wompiTransactionId": wompi_transaction.get("id"),
                                "wompiStatus": wompi_status,
                                "status": "completed" if wompi_status == "APPROVED" else "failed",
                                "wompiResponse": wompi_transaction,
                                "updatedAt": datetime.now(timezone.utc)
                            }
                        }
                    )
                    
                    # If payment approved, activate subscription
                    if wompi_status == "APPROVED":
                        await activate_subscription(user_id, reference, wompi_transaction)
                    
                    return {
                        "status": wompi_status,
                        "approved": wompi_status == "APPROVED",
                        "reference": reference,
                        "transactionId": wompi_transaction.get("id"),
                        "paymentMethod": wompi_transaction.get("payment_method_type")
                    }
                else:
                    return {
                        "status": "PENDING",
                        "approved": False,
                        "reference": reference,
                        "message": "Transaccion pendiente o no encontrada en Wompi"
                    }
            else:
                return {
                    "status": "ERROR",
                    "approved": False,
                    "reference": reference,
                    "message": "Error al consultar Wompi"
                }
                
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def activate_subscription(user_id: str, reference: str, wompi_transaction: dict):
    """Activate user subscription after successful payment"""
    # Check if already activated
    existing = await db.subscriptions.find_one({
        "userId": user_id,
        "wompiReference": reference
    })
    
    if existing:
        return  # Already activated
    
    # Compute the next billing date as a CALENDAR month, not 30 days.
    # Examples:
    #   - Pay Jan 15 -> renew Feb 15
    #   - Pay Jan 31 -> renew Feb 28 (or Feb 29 in leap year)
    #   - Pay Mar 31 -> renew Apr 30
    period_start = datetime.now(timezone.utc)
    period_end = period_start + relativedelta(months=1)

    # Update or create subscription
    await db.subscriptions.update_one(
        {"userId": user_id},
        {
            "$set": {
                "status": "active",
                "planId": "premium_monthly",
                "wompiReference": reference,
                "wompiTransactionId": wompi_transaction.get("id"),
                "paymentMethod": wompi_transaction.get("payment_method_type"),
                "currentPeriodStart": period_start,
                "currentPeriodEnd": period_end,
                "updatedAt": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

@router.post("/webhook")
async def wompi_webhook(request: Request):
    """Handle Wompi webhook notifications"""
    try:
        payload = await request.json()
        
        event = payload.get("event")
        data = payload.get("data", {})
        transaction = data.get("transaction", {})
        
        reference = transaction.get("reference", "")
        status = transaction.get("status")
        transaction_id = transaction.get("id")
        
        # Find our transaction
        our_transaction = await db.wompi_transactions.find_one({"reference": reference})
        
        if our_transaction:
            user_id = our_transaction.get("userId")
            
            # Update transaction status
            await db.wompi_transactions.update_one(
                {"reference": reference},
                {
                    "$set": {
                        "wompiTransactionId": transaction_id,
                        "wompiStatus": status,
                        "status": "completed" if status == "APPROVED" else "failed",
                        "wompiResponse": transaction,
                        "updatedAt": datetime.now(timezone.utc)
                    }
                }
            )
            
            # If approved, activate subscription
            if status == "APPROVED" and user_id:
                await activate_subscription(user_id, reference, transaction)
        
        # Always return 200 to acknowledge receipt
        return {"status": "received"}
        
    except Exception as e:
        print(f"Wompi webhook error: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/transactions")
async def get_user_transactions(user_id: str = Depends(get_current_user_id)):
    """Get user's Wompi transaction history"""
    transactions = await db.wompi_transactions.find(
        {"userId": user_id}
    ).sort("createdAt", -1).to_list(length=20)
    
    # Convert ObjectId to string
    for t in transactions:
        t["_id"] = str(t["_id"])
        if "createdAt" in t and isinstance(t["createdAt"], datetime):
            t["createdAt"] = t["createdAt"].isoformat()
        if "updatedAt" in t and isinstance(t["updatedAt"], datetime):
            t["updatedAt"] = t["updatedAt"].isoformat()
    
    return transactions
