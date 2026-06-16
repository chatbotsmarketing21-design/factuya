"""Reactivation / win-back system.

When a Premium (or formerly Premium) user deletes their account, we:
1. Generate a unique reactivation coupon (50% off first renewal, valid 15 days).
2. Persist it in the `reactivation_coupons` collection BEFORE deleting the user.
3. Send a friendly farewell email via Resend with the coupon code + signup link.

Industry data suggests this recovers 15-20% of churning users.
"""
import os
import logging
import asyncio
import secrets
import string
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import resend
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorDatabase

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
APP_URL = os.environ.get('APP_PUBLIC_URL', 'https://factuya.site')

# Coupon configuration (matches user choices: 50% off / 15 days / all gateways)
COUPON_DISCOUNT_PERCENT = 50
COUPON_VALIDITY_DAYS = 15
COUPON_APPLIES_TO = ["wompi", "paypal", "stripe"]
COUPON_PREFIX = "VUELVE50"


def _generate_coupon_code() -> str:
    """Generate a unique, easy-to-type coupon code like VUELVE50-A8X9K2."""
    alphabet = string.ascii_uppercase + string.digits
    # Avoid ambiguous chars (0/O, 1/I)
    alphabet = alphabet.translate(str.maketrans('', '', '0O1I'))
    suffix = ''.join(secrets.choice(alphabet) for _ in range(6))
    return f"{COUPON_PREFIX}-{suffix}"


async def create_reactivation_coupon(
    db: AsyncIOMotorDatabase,
    user_id: str,
    user_email: str,
    user_name: Optional[str] = None,
) -> dict:
    """Persist a reactivation coupon in the database.

    Returns the coupon document. Survives the user's deletion because it lives in its
    own collection keyed by the original email.
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=COUPON_VALIDITY_DAYS)

    # Ensure uniqueness — retry up to 5 times on the (very unlikely) collision
    for _ in range(5):
        code = _generate_coupon_code()
        existing = await db.reactivation_coupons.find_one({"code": code})
        if not existing:
            break
    else:
        # Extremely unlikely; fall back to a longer code
        code = f"{COUPON_PREFIX}-{secrets.token_hex(6).upper()}"

    coupon = {
        "code": code,
        "discount_percent": COUPON_DISCOUNT_PERCENT,
        "applies_to": COUPON_APPLIES_TO,
        "original_user_id": user_id,
        "original_email": user_email.lower().strip() if user_email else None,
        "original_name": user_name,
        "issued_at": now,
        "expires_at": expires_at,
        "used_at": None,
        "used_by_user_id": None,
        "status": "active",  # active | redeemed | expired
        "reason": "account_deletion_winback",
    }
    await db.reactivation_coupons.insert_one(coupon)
    # Remove the Mongo _id from the returned dict
    coupon.pop("_id", None)
    return coupon


async def user_had_premium(db: AsyncIOMotorDatabase, user_id: str) -> bool:
    """Determine whether the user ever paid for Premium (active or canceled).

    We only send the farewell coupon to former premium customers (user choice 5b).
    """
    # Check the main subscriptions collection
    sub = await db.subscriptions.find_one({
        "userId": user_id,
        "status": {"$in": ["active", "canceled", "past_due", "cancel_at_period_end"]},
    })
    if sub:
        return True

    # Check PayPal-specific subscriptions
    paypal = await db.paypal_subscriptions.find_one({
        "user_id": user_id,
        "status": {"$in": ["ACTIVE", "CANCELLED", "SUSPENDED", "APPROVED"]},
    })
    if paypal:
        return True

    # Check Wompi-specific subscriptions
    wompi = await db.wompi_subscriptions.find_one({"user_id": user_id})
    if wompi:
        return True

    return False


def _farewell_html(user_name: Optional[str], coupon_code: str, expires_at: datetime) -> str:
    name = (user_name or "").strip() or "Amigo/a"
    expiry_str = expires_at.strftime("%d/%m/%Y")
    signup_url = f"{APP_URL}/signup?coupon={coupon_code}"

    return f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:24px 16px;">

    <!-- Logo -->
    <div style="text-align:center; margin-bottom:24px;">
      <span style="font-size:28px; font-weight:bold; color:#0a0a0a;">Factu</span><span style="background-color:#84cc16; color:white; padding:4px 10px; border-radius:4px; font-size:24px; font-weight:bold;">Ya!</span>
    </div>

    <!-- Hero card -->
    <div style="background:linear-gradient(135deg, #84cc16 0%, #65a30d 100%); border-radius:16px; padding:40px 24px; text-align:center; color:white; margin-bottom:24px;">
      <div style="font-size:48px; margin-bottom:8px;">🎁</div>
      <h1 style="margin:0 0 8px; font-size:28px; font-weight:bold;">¡Espera, {name}!</h1>
      <p style="margin:0; font-size:16px; opacity:0.95;">Antes de irte... tenemos algo para ti</p>
    </div>

    <!-- Message -->
    <div style="background:white; border-radius:12px; padding:32px 24px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px;">
        Tu cuenta ha sido <strong>eliminada exitosamente</strong> y todos tus datos personales borrados de nuestros servidores. Tu privacidad es importante para nosotros. 🔒
      </p>
      <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px;">
        Pero queremos que sepas que <strong>siempre serás bienvenido/a de vuelta</strong>. Como agradecimiento por haber sido cliente Premium, te dejamos este regalo:
      </p>

      <!-- Coupon box -->
      <div style="background:#f9fafb; border:2px dashed #84cc16; border-radius:12px; padding:24px; text-align:center; margin-bottom:24px;">
        <div style="color:#65a30d; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
          🎟️ Tu cupón de bienvenida
        </div>
        <div style="font-family: 'Courier New', monospace; font-size:32px; font-weight:bold; color:#0a0a0a; letter-spacing:2px; margin-bottom:8px;">
          {coupon_code}
        </div>
        <div style="color:#374151; font-size:18px; font-weight:bold; margin-bottom:4px;">
          50% OFF en tu primera renovación
        </div>
        <div style="color:#6b7280; font-size:14px;">
          Válido en Wompi, PayPal y Stripe<br>
          ⏰ Expira el <strong>{expiry_str}</strong> (15 días)
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center; margin-bottom:16px;">
        <a href="{signup_url}"
           style="display:inline-block; background-color:#84cc16; color:white; padding:16px 40px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px;">
          Volver con 50% OFF
        </a>
      </div>

      <p style="color:#9ca3af; font-size:13px; text-align:center; margin:8px 0 0;">
        Solo crea una cuenta nueva con este email y aplica el código al pagar.
      </p>
    </div>

    <!-- Why come back -->
    <div style="background:white; border-radius:12px; padding:24px; margin-bottom:16px;">
      <h3 style="margin:0 0 16px; color:#0a0a0a; font-size:16px;">¿Qué te perderás sin FactuYa!? 🤔</h3>
      <ul style="margin:0; padding-left:20px; color:#374151; line-height:1.8; font-size:14px;">
        <li>Crear facturas profesionales en segundos</li>
        <li>12+ tipos de documentos listos para usar</li>
        <li>Envío directo por WhatsApp y email</li>
        <li>Cálculo automático de IVA y retenciones</li>
        <li>Soporte para múltiples países e idiomas</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align:center; color:#9ca3af; font-size:12px; padding:16px;">
      <p style="margin:0 0 8px;">
        ¿Cambiaste de opinión? <a href="{signup_url}" style="color:#84cc16;">Vuelve aquí</a>
      </p>
      <p style="margin:0 0 8px;">
        Si tienes alguna duda, escríbenos a <a href="mailto:soportefactuya@gmail.com" style="color:#84cc16;">soportefactuya@gmail.com</a>
      </p>
      <p style="margin:16px 0 0; color:#d1d5db;">
        FactuYa! &copy; 2026 &middot; Innova App Solutions
      </p>
    </div>

  </div>
</body>
</html>
"""


async def send_farewell_email(
    user_email: str,
    user_name: Optional[str],
    coupon_code: str,
    expires_at: datetime,
) -> bool:
    """Send the farewell + winback coupon email. Fire-and-forget; never raises."""
    if not user_email:
        return False
    if not os.environ.get('RESEND_API_KEY'):
        logger.warning("RESEND_API_KEY not set; skipping farewell email")
        return False
    try:
        html = _farewell_html(user_name, coupon_code, expires_at)
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user_email],
            "subject": "🎁 ¡Espera! Antes de irte tenemos algo para ti",
            "html": html,
        })
        logger.info("Farewell email sent to %s (coupon %s)", user_email, coupon_code)
        return True
    except Exception as e:
        logger.error("Failed to send farewell email to %s: %s", user_email, e)
        return False


async def validate_coupon(db: AsyncIOMotorDatabase, code: str) -> dict:
    """Validate a coupon code. Returns a dict with status and details.

    Status values:
      - valid: coupon exists, not expired, not used
      - not_found: no such code
      - expired: past expires_at
      - already_used: already redeemed
    """
    if not code:
        return {"status": "not_found"}

    normalized = code.strip().upper()
    coupon = await db.reactivation_coupons.find_one({"code": normalized}, {"_id": 0})
    if not coupon:
        return {"status": "not_found"}

    now = datetime.now(timezone.utc)
    expires_at = coupon.get("expires_at")
    # Mongo returns naive datetimes in some configs; normalize
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if coupon.get("used_at"):
        return {"status": "already_used", "code": normalized}

    if expires_at and now > expires_at:
        return {"status": "expired", "code": normalized}

    # Multi-use coupons (e.g. LANZAMIENTO50): valid until expiration, no per-use lock
    if coupon.get("multi_use"):
        return {
            "status": "valid",
            "code": normalized,
            "discount_percent": coupon.get("discount_percent", COUPON_DISCOUNT_PERCENT),
            "applies_to": coupon.get("applies_to", COUPON_APPLIES_TO),
            "expires_at": expires_at.isoformat() if expires_at else None,
            "multi_use": True,
        }

    if coupon.get("used_at"):
        return {"status": "already_used", "code": normalized}

    return {
        "status": "valid",
        "code": normalized,
        "discount_percent": coupon.get("discount_percent", COUPON_DISCOUNT_PERCENT),
        "applies_to": coupon.get("applies_to", COUPON_APPLIES_TO),
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


async def redeem_coupon(
    db: AsyncIOMotorDatabase,
    code: str,
    user_id: str,
) -> bool:
    """Mark a coupon as redeemed. Returns True if successful.

    For single-use coupons: locks the coupon and records the redeemer.
    For multi-use coupons (e.g. LANZAMIENTO50): appends user_id to used_by_user_ids
        and rejects double-redemption by the SAME user.
    """
    if not code:
        return False
    normalized = code.strip().upper()
    now = datetime.now(timezone.utc)

    coupon = await db.reactivation_coupons.find_one({"code": normalized}, {"_id": 0})
    if not coupon:
        return False

    expires_at = coupon.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and now > expires_at:
        return False

    # Multi-use path: a user can only redeem once but the coupon stays valid for others
    if coupon.get("multi_use"):
        already = await db.reactivation_coupons.find_one({
            "code": normalized,
            "used_by_user_ids": user_id,
        })
        if already:
            return False
        result = await db.reactivation_coupons.update_one(
            {"code": normalized},
            {
                "$addToSet": {"used_by_user_ids": user_id},
                "$inc": {"redeem_count": 1},
                "$set": {"last_redeemed_at": now},
            }
        )
        return result.modified_count > 0

    # Single-use path (legacy win-back coupons)
    result = await db.reactivation_coupons.update_one(
        {"code": normalized, "used_at": None, "expires_at": {"$gt": now}},
        {"$set": {"used_at": now, "used_by_user_id": user_id, "status": "redeemed"}}
    )
    return result.modified_count > 0
