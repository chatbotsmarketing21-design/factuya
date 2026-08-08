"""Public coupon validation endpoints.

Used by the signup flow and the subscription checkout to validate and apply
reactivation coupons (win-back discount for previously-Premium users that
deleted their account).
"""
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta, timezone
import os

from utils.reactivation import validate_coupon, redeem_coupon
from utils.auth import get_current_user_id

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/coupons", tags=["Coupons"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Campaña de lanzamiento: cupón multi-uso auto-renovable ---
LAUNCH_COUPON_CODE = "LANZAMIENTO50"
LAUNCH_DISCOUNT_PERCENT = 50
LAUNCH_VALIDITY_DAYS = 30
LAUNCH_CAMPAIGN_DAYS = 183  # ~6 meses de renovaciones automáticas
LAUNCH_APPLIES_TO = ["wompi", "paypal", "stripe"]


def _as_utc(dt):
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def ensure_launch_coupon_active() -> dict:
    """Crea o renueva el cupón LANZAMIENTO50.

    - Si no existe: lo crea con 30 días de vigencia y ventana de campaña de ~6 meses.
    - Si expiró y la campaña sigue activa (auto_renew_until en el futuro): renueva
      la vigencia otros 30 días (reinicia la cuenta regresiva del banner).
    - Si la campaña terminó: no hace nada.
    Idempotente — seguro de ejecutar a diario y en cada arranque.
    """
    now = datetime.now(timezone.utc)
    coupon = await db.reactivation_coupons.find_one({"code": LAUNCH_COUPON_CODE})

    if not coupon:
        expires_at = now + timedelta(days=LAUNCH_VALIDITY_DAYS)
        await db.reactivation_coupons.insert_one({
            "code": LAUNCH_COUPON_CODE,
            "discount_percent": LAUNCH_DISCOUNT_PERCENT,
            "applies_to": LAUNCH_APPLIES_TO,
            "multi_use": True,
            "expires_at": expires_at,
            "auto_renew_until": now + timedelta(days=LAUNCH_CAMPAIGN_DAYS),
            "status": "active",
            "reason": "launch_campaign",
            "issued_at": now,
            "updated_at": now,
            "used_by_user_ids": [],
            "redeem_count": 0,
        })
        return {"action": "created", "expires_at": expires_at.isoformat()}

    updates = {}
    auto_renew_until = _as_utc(coupon.get("auto_renew_until"))
    if not auto_renew_until:
        auto_renew_until = now + timedelta(days=LAUNCH_CAMPAIGN_DAYS)
        updates["auto_renew_until"] = auto_renew_until

    expires_at = _as_utc(coupon.get("expires_at"))
    if (not expires_at or now > expires_at) and now < auto_renew_until:
        updates["expires_at"] = now + timedelta(days=LAUNCH_VALIDITY_DAYS)
        updates["status"] = "active"

    if updates:
        updates["updated_at"] = now
        await db.reactivation_coupons.update_one(
            {"code": LAUNCH_COUPON_CODE}, {"$set": updates}
        )
        action = "renewed" if "expires_at" in updates else "campaign_window_set"
        return {"action": action, "expires_at": (updates.get("expires_at") or expires_at).isoformat()}

    return {"action": "none"}


@router.get("/launch")
async def launch_coupon_status():
    """Público: estado del cupón de lanzamiento para el banner de la Home."""
    coupon = await db.reactivation_coupons.find_one(
        {"code": LAUNCH_COUPON_CODE}, {"_id": 0}
    )
    now = datetime.now(timezone.utc)
    if not coupon:
        return {"active": False}
    expires_at = _as_utc(coupon.get("expires_at"))
    active = coupon.get("status") == "active" and expires_at and now < expires_at
    return {
        "active": bool(active),
        "code": LAUNCH_COUPON_CODE,
        "discount_percent": coupon.get("discount_percent", LAUNCH_DISCOUNT_PERCENT),
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


class ValidateCouponRequest(BaseModel):
    code: str


class RedeemCouponRequest(BaseModel):
    code: str


@router.post("/validate")
async def validate_coupon_endpoint(request: ValidateCouponRequest):
    """Public endpoint: validate a coupon code without authentication.

    Used on the signup page to preview the discount before creating the account.
    Returns the discount % and applicable gateways if valid.
    """
    result = await validate_coupon(db, request.code)
    if result["status"] != "valid":
        # Map to friendly HTTP errors
        messages = {
            "not_found": "El cupón no existe.",
            "expired": "Este cupón ya expiró.",
            "already_used": "Este cupón ya fue usado.",
        }
        raise HTTPException(
            status_code=400,
            detail=messages.get(result["status"], "Cupón inválido."),
        )
    return result


@router.post("/redeem")
async def redeem_coupon_endpoint(
    request: RedeemCouponRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Authenticated endpoint: mark a coupon as redeemed for the current user.

    Should be called server-side when the discounted payment succeeds at the
    gateway (Wompi/PayPal/Stripe). The frontend can also call it directly after
    a successful checkout; the coupon is single-use so duplicate calls are safe.
    """
    ok = await redeem_coupon(db, request.code, user_id=user_id)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail="No se pudo aplicar el cupón (puede estar expirado o ya usado).",
        )
    return {"message": "Cupón aplicado correctamente.", "code": request.code.strip().upper()}
