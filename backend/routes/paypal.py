"""PayPal Subscriptions integration for FactuYa! premium plan.

International users (non-Colombia) pay $3.99 USD / month via PayPal Subscriptions
with automatic recurring billing. Wompi remains the Colombia-only gateway.

Flow:
  1. Frontend calls POST /api/paypal/create-subscription
  2. Backend creates subscription with PayPal REST API, returns approval_url
  3. User approves on PayPal, gets redirected to /subscription?paypal_subscription_id=...
  4. Frontend calls GET /api/paypal/verify/{subscription_id} to activate locally
  5. PayPal webhook BILLING.SUBSCRIPTION.* keeps server-side state in sync

ENV vars required:
  PAYPAL_MODE          sandbox | live
  PAYPAL_CLIENT_ID
  PAYPAL_SECRET
  PAYPAL_PLAN_ID       (created once with the bootstrap script)
  PAYPAL_WEBHOOK_ID    (optional; used to verify webhook signatures)
"""
from fastapi import APIRouter, HTTPException, Depends, Request
import os
import httpx
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel
from typing import Optional
from utils.auth import get_current_user_id

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/paypal", tags=["PayPal Subscriptions"])

# Database
mongo_url = os.environ['MONGO_URL']
db_client = AsyncIOMotorClient(mongo_url)
db = db_client[os.environ['DB_NAME']]

# PayPal configuration
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox').lower()
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')
PAYPAL_PLAN_ID = os.environ.get('PAYPAL_PLAN_ID', '')
PAYPAL_WEBHOOK_ID = os.environ.get('PAYPAL_WEBHOOK_ID', '')

PAYPAL_API_BASE = (
    "https://api-m.sandbox.paypal.com"
    if PAYPAL_MODE == 'sandbox'
    else "https://api-m.paypal.com"
)

SUBSCRIPTION_PRICE_USD = 3.99


# ---------- Pydantic models ----------
class CreateSubscriptionRequest(BaseModel):
    originUrl: str  # frontend origin (e.g., https://factuya.app)


# ---------- Helpers ----------
async def get_access_token() -> str:
    """Obtain an OAuth2 access token from PayPal."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(
            status_code=503,
            detail="PayPal aún no está configurado. Por favor contacta a soporte.",
        )
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
            data={"grant_type": "client_credentials"},
        )
    if resp.status_code != 200:
        logger.error("PayPal OAuth failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="No se pudo autenticar con PayPal")
    return resp.json()["access_token"]


async def paypal_request(method: str, path: str, json_body: Optional[dict] = None) -> dict:
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=20) as http:
        resp = await http.request(
            method,
            f"{PAYPAL_API_BASE}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=json_body,
        )
    if resp.status_code >= 400:
        logger.error("PayPal %s %s failed: %s %s", method, path, resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail=f"PayPal error: {resp.text[:200]}")
    if resp.status_code == 204 or not resp.content:
        return {}
    return resp.json()


# ---------- Endpoints ----------
@router.get("/config")
async def get_paypal_config():
    """Public configuration for the frontend (no secrets)."""
    return {
        "configured": bool(PAYPAL_CLIENT_ID and PAYPAL_SECRET and PAYPAL_PLAN_ID),
        "mode": PAYPAL_MODE,
        "priceUSD": SUBSCRIPTION_PRICE_USD,
    }


@router.post("/create-subscription")
async def create_subscription(
    body: CreateSubscriptionRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Create a PayPal subscription and return the approval URL."""
    if not PAYPAL_PLAN_ID:
        raise HTTPException(
            status_code=503,
            detail="El plan de PayPal aún no está configurado. Contacta a soporte.",
        )

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    origin = body.originUrl.rstrip('/')
    return_url = f"{origin}/subscription?paypal=success"
    cancel_url = f"{origin}/subscription?paypal=canceled"

    payload = {
        "plan_id": PAYPAL_PLAN_ID,
        "custom_id": user_id,  # comes back in webhooks so we know which user
        "subscriber": {
            "name": {
                "given_name": (user.get("name") or "FactuYa").split(" ")[0][:50],
                "surname": (user.get("name") or "User").split(" ")[-1][:50],
            },
            "email_address": user.get("email", ""),
        },
        "application_context": {
            "brand_name": "FactuYa!",
            "locale": "es-CO",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "SUBSCRIBE_NOW",
            "payment_method": {
                "payer_selected": "PAYPAL",
                "payee_preferred": "IMMEDIATE_PAYMENT_REQUIRED",
            },
            "return_url": return_url,
            "cancel_url": cancel_url,
        },
    }

    result = await paypal_request("POST", "/v1/billing/subscriptions", payload)
    subscription_id = result.get("id")
    approval_url = next(
        (link["href"] for link in result.get("links", []) if link.get("rel") == "approve"),
        None,
    )

    if not subscription_id or not approval_url:
        raise HTTPException(status_code=502, detail="Respuesta inválida de PayPal")

    # Track the pending subscription
    await db.paypal_subscriptions.insert_one({
        "userId": user_id,
        "subscriptionId": subscription_id,
        "status": result.get("status", "APPROVAL_PENDING"),
        "planId": PAYPAL_PLAN_ID,
        "createdAt": datetime.now(timezone.utc),
    })

    return {
        "subscriptionId": subscription_id,
        "approvalUrl": approval_url,
    }


@router.get("/verify/{subscription_id}")
async def verify_subscription(
    subscription_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Verify a subscription is active with PayPal and activate it locally."""
    data = await paypal_request("GET", f"/v1/billing/subscriptions/{subscription_id}")
    status = data.get("status", "").upper()
    approved = status in ("ACTIVE", "APPROVED")

    if approved:
        await _activate_local_subscription(user_id, subscription_id, data)

    return {
        "approved": approved,
        "status": status,
        "message": "Suscripción activa" if approved else f"Estado: {status}",
    }


@router.get("/verify-latest")
async def verify_latest_subscription(
    user_id: str = Depends(get_current_user_id),
):
    """Fallback: verify the user's most recent pending PayPal subscription.

    Used when the return_url does not contain the subscription_id query param.
    """
    pending = await db.paypal_subscriptions.find_one(
        {"userId": user_id},
        sort=[("createdAt", -1)],
    )
    if not pending:
        raise HTTPException(status_code=404, detail="No hay suscripción pendiente")
    return await verify_subscription(pending["subscriptionId"], user_id)


@router.post("/cancel")
async def cancel_paypal_subscription(
    user_id: str = Depends(get_current_user_id),
):
    """Cancel the user's PayPal subscription (stays active until period end)."""
    sub = await db.subscriptions.find_one({"userId": user_id})
    if not sub or not sub.get("paypalSubscriptionId"):
        raise HTTPException(
            status_code=404,
            detail="No tienes una suscripción de PayPal activa.",
        )

    subscription_id = sub["paypalSubscriptionId"]
    await paypal_request(
        "POST",
        f"/v1/billing/subscriptions/{subscription_id}/cancel",
        {"reason": "User requested cancellation from FactuYa!"},
    )

    await db.subscriptions.update_one(
        {"userId": user_id},
        {"$set": {
            "cancelAtPeriodEnd": True,
            "updatedAt": datetime.now(timezone.utc),
        }},
    )
    return {"message": "Suscripción cancelada. Mantendrás acceso hasta el fin del período actual."}


@router.post("/webhook")
async def paypal_webhook(request: Request):
    """Handle PayPal subscription webhooks.

    Important events:
      - BILLING.SUBSCRIPTION.ACTIVATED  -> activate user
      - BILLING.SUBSCRIPTION.CANCELLED  -> mark cancel_at_period_end
      - BILLING.SUBSCRIPTION.EXPIRED    -> mark expired
      - PAYMENT.SALE.COMPLETED          -> extend currentPeriodEnd +1 month
      - BILLING.SUBSCRIPTION.PAYMENT.FAILED -> mark payment_failed
    """
    try:
        payload = await request.json()
    except Exception:
        return {"status": "ignored"}

    event_type = payload.get("event_type", "")
    resource = payload.get("resource", {}) or {}
    subscription_id = resource.get("id") or resource.get("billing_agreement_id")
    custom_id = resource.get("custom_id")

    # If the resource doesn't carry custom_id (e.g., PAYMENT.SALE.COMPLETED),
    # try to look up the local mapping.
    user_id = custom_id
    if not user_id and subscription_id:
        mapping = await db.paypal_subscriptions.find_one({"subscriptionId": subscription_id})
        if mapping:
            user_id = mapping.get("userId")

    logger.info("PayPal webhook %s sub=%s user=%s", event_type, subscription_id, user_id)

    if not user_id:
        return {"status": "no_user"}

    if event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
        await _activate_local_subscription(user_id, subscription_id, resource)
    elif event_type == "PAYMENT.SALE.COMPLETED":
        # Recurring payment success -> extend period by 1 month
        await db.subscriptions.update_one(
            {"userId": user_id},
            {"$set": {
                "status": "active",
                "currentPeriodStart": datetime.now(timezone.utc),
                "currentPeriodEnd": datetime.now(timezone.utc) + relativedelta(months=1),
                "updatedAt": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
    elif event_type in ("BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED"):
        await db.subscriptions.update_one(
            {"userId": user_id},
            {"$set": {
                "cancelAtPeriodEnd": True,
                "updatedAt": datetime.now(timezone.utc),
            }},
        )
    elif event_type in (
        "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
        "PAYMENT.SALE.DENIED",
    ):
        await db.subscriptions.update_one(
            {"userId": user_id},
            {"$set": {
                "lastPaymentFailedAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }},
        )

    return {"status": "ok"}


async def _activate_local_subscription(user_id: str, subscription_id: str, data: dict):
    """Mark the user's subscription as active in the DB."""
    now = datetime.now(timezone.utc)
    # PayPal returns next_billing_time inside billing_info
    next_billing = (
        (data.get("billing_info") or {}).get("next_billing_time")
        if isinstance(data, dict) else None
    )
    period_end = now + relativedelta(months=1)
    if next_billing:
        try:
            period_end = datetime.fromisoformat(next_billing.replace('Z', '+00:00'))
        except Exception:
            pass

    await db.subscriptions.update_one(
        {"userId": user_id},
        {"$set": {
            "status": "active",
            "planId": "premium_monthly",
            "gateway": "paypal",
            "paypalSubscriptionId": subscription_id,
            "currentPeriodStart": now,
            "currentPeriodEnd": period_end,
            "cancelAtPeriodEnd": False,
            "updatedAt": now,
        }},
        upsert=True,
    )
    await db.paypal_subscriptions.update_one(
        {"subscriptionId": subscription_id},
        {"$set": {"status": "ACTIVE", "updatedAt": now}},
        upsert=True,
    )
