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
import os

from utils.reactivation import validate_coupon, redeem_coupon
from utils.auth import get_current_user_id

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/coupons", tags=["Coupons"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


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
