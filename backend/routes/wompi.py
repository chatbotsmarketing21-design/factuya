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

# Subscription price in Colombian Pesos (approximately $5 USD)
# 20,000 COP = 2,000,000 centavos
SUBSCRIPTION_PRICE_COP = 2000000  # 20,000 COP in centavos (Wompi uses centavos)

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
    """Get Wompi public configuration for frontend"""
    return {
        "publicKey": WOMPI_PUBLIC_KEY,
        "currency": "COP",
        "amountInCents": SUBSCRIPTION_PRICE_COP
    }

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
        
        # Generate unique reference (alphanumeric, no special chars except - and _)
        reference = f"factuya{uuid.uuid4().hex[:12]}"
        
        # Build redirect URLs
        origin_url = checkout_data.originUrl
        redirect_url = f"{origin_url}/subscription?payment=wompi&reference={reference}"
        
        # Generate integrity signature for widget
        # Format: reference + amount + currency + integrity_key
        integrity_signature = generate_integrity_signature(reference, SUBSCRIPTION_PRICE_COP)
        
        # Create payment transaction record
        transaction = {
            "userId": user_id,
            "reference": reference,
            "amount": SUBSCRIPTION_PRICE_COP,
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
            f"amount-in-cents={SUBSCRIPTION_PRICE_COP}",
            f"reference={reference}",
            f"signature:integrity={integrity_signature}",
            f"redirect-url={quote(redirect_url, safe='')}"
        ]
        
        checkout_url = f"{base_url}?{'&'.join(params)}"
        
        return {
            "checkoutUrl": checkout_url,
            "reference": reference,
            "publicKey": WOMPI_PUBLIC_KEY,
            "amountInCents": SUBSCRIPTION_PRICE_COP,
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
                "currentPeriodStart": datetime.now(timezone.utc),
                "currentPeriodEnd": datetime.now(timezone.utc) + timedelta(days=30),
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
