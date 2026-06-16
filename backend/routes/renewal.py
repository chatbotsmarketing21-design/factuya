"""Renewal notifications for subscriptions.

Sends emails to users whose Premium subscription is expiring soon (3 days before),
or has just expired (within the last 24 hours), to drive renewal.

Endpoints:
- GET  /api/renewal/check         - Inspect users that would receive notifications today (no send)
- POST /api/renewal/send-notifications - Actually send emails (idempotent: marks as sent)

To run automatically on the VPS, add a daily cron entry:
    0 9 * * * curl -X POST https://your-domain.com/api/renewal/send-notifications \\
              -H "X-Renewal-Token: <RENEWAL_CRON_TOKEN env var>"
"""
import os
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path

import resend
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/renewal", tags=["Renewal Notifications"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configuration
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
RENEWAL_CRON_TOKEN = os.environ.get('RENEWAL_CRON_TOKEN', '')
APP_URL = os.environ.get('APP_PUBLIC_URL', 'https://factuya.site')

DAYS_BEFORE_EXPIRY = 3  # Send "expiring soon" 3 days before
GRACE_DAYS = 1          # Send "just expired" within 24 h after expiry


def _format_date_es(dt: datetime) -> str:
    """Format a datetime in Spanish-style: '15 de enero de 2026'."""
    months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ]
    return f"{dt.day} de {months[dt.month - 1]} de {dt.year}"


def _renewal_email_html(user_name: str, expires_at: datetime, days_left: int, app_url: str) -> str:
    """HTML body for the 'subscription expiring soon' email."""
    name = user_name or 'Usuario'
    nice_date = _format_date_es(expires_at)
    days_text = (
        "hoy" if days_left == 0 else
        "mañana" if days_left == 1 else
        f"en {days_left} días"
    )
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #84cc16; margin: 0;">Factu<span style="background-color: #84cc16; color: white; padding: 2px 8px;">Ya!</span></h1>
        </div>

        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px 25px; margin-bottom: 24px; border-radius: 6px;">
            <h2 style="color: #92400e; margin-top: 0;">Tu suscripción Premium vence {days_text}</h2>
            <p style="color: #78350f; line-height: 1.6; margin: 0;">
                Vence el <strong>{nice_date}</strong>.
            </p>
        </div>

        <p style="color: #444; line-height: 1.7;">
            Hola <strong>{name}</strong>,
        </p>
        <p style="color: #444; line-height: 1.7;">
            Para que sigas creando facturas ilimitadas y disfrutando de todas las
            funciones Premium, renueva tu suscripción antes del vencimiento. El cobro
            es de <strong>$3,99 USD/mes</strong>.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{app_url}/subscription"
               style="background-color: #84cc16; color: white; padding: 14px 32px;
                      text-decoration: none; border-radius: 6px; font-weight: bold;
                      display: inline-block; font-size: 16px;">
                Renovar Premium
            </a>
        </div>

        <p style="color: #888; font-size: 14px; line-height: 1.6;">
            Si decides no renovar, tu cuenta volverá automáticamente al plan gratuito al
            vencer el período actual; tus facturas existentes no se eliminarán.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <div style="text-align: center; color: #aaa; font-size: 12px;">
            <p>© 2026 FactuYa! - Tu solución de facturación</p>
        </div>
    </body>
    </html>
    """


def _expired_email_html(user_name: str, expired_on: datetime, app_url: str) -> str:
    """HTML body for the 'subscription has just expired' email."""
    name = user_name or 'Usuario'
    nice_date = _format_date_es(expired_on)
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #84cc16; margin: 0;">Factu<span style="background-color: #84cc16; color: white; padding: 2px 8px;">Ya!</span></h1>
        </div>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px 25px; margin-bottom: 24px; border-radius: 6px;">
            <h2 style="color: #991b1b; margin-top: 0;">Tu suscripción Premium ha vencido</h2>
            <p style="color: #7f1d1d; line-height: 1.6; margin: 0;">
                Venció el <strong>{nice_date}</strong>.
            </p>
        </div>

        <p style="color: #444; line-height: 1.7;">
            Hola <strong>{name}</strong>,
        </p>
        <p style="color: #444; line-height: 1.7;">
            Tu cuenta volvió al plan gratuito. Tus facturas no se han eliminado, pero
            algunas funciones Premium están en pausa. Renueva ahora para recuperar el
            acceso completo.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{app_url}/subscription"
               style="background-color: #84cc16; color: white; padding: 14px 32px;
                      text-decoration: none; border-radius: 6px; font-weight: bold;
                      display: inline-block; font-size: 16px;">
                Reactivar Premium
            </a>
        </div>

        <p style="color: #888; font-size: 14px; line-height: 1.6;">
            ¿Tuviste algún problema con el último pago? Responde este correo y te ayudamos.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <div style="text-align: center; color: #aaa; font-size: 12px;">
            <p>© 2026 FactuYa! - Tu solución de facturación</p>
        </div>
    </body>
    </html>
    """


async def _find_renewal_targets():
    """Find subscriptions that should receive a notification today.

    Returns dict with two lists:
    - expiring_soon: active subs ending within DAYS_BEFORE_EXPIRY days (and not yet notified)
    - just_expired: active subs ended within the last GRACE_DAYS day (and not yet notified)
    """
    now = datetime.now(timezone.utc)
    soon_window_end = now + timedelta(days=DAYS_BEFORE_EXPIRY)
    just_expired_start = now - timedelta(days=GRACE_DAYS)

    expiring = await db.subscriptions.find({
        "status": "active",
        "currentPeriodEnd": {"$gte": now, "$lte": soon_window_end},
        "$or": [
            {"renewalReminderSentFor": {"$exists": False}},
            {"renewalReminderSentFor": {"$ne": "$currentPeriodEnd"}},  # placeholder; real check below
        ],
    }).to_list(length=500)

    expired = await db.subscriptions.find({
        "status": "active",
        "currentPeriodEnd": {"$gte": just_expired_start, "$lt": now},
        "$or": [
            {"expiredNoticeSentFor": {"$exists": False}},
        ],
    }).to_list(length=500)

    # Filter out subs already notified for the same period
    expiring = [
        s for s in expiring
        if s.get("renewalReminderSentFor") != s.get("currentPeriodEnd")
    ]
    expired = [
        s for s in expired
        if s.get("expiredNoticeSentFor") != s.get("currentPeriodEnd")
    ]
    return {"expiring_soon": expiring, "just_expired": expired}


def _strip_for_response(sub: dict) -> dict:
    """Make a Mongo subscription doc JSON-serializable + strip _id."""
    out = {k: v for k, v in sub.items() if k != "_id"}
    for key in ("currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt",
                "renewalReminderSentFor", "expiredNoticeSentFor"):
        v = out.get(key)
        if isinstance(v, datetime):
            out[key] = v.isoformat()
    return out


def _ensure_utc(dt):
    """Mongo returns naive datetimes; treat them as UTC for safe arithmetic."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("/check")
async def check_renewals():
    """Inspect (no email send) subscriptions that would be notified today."""
    targets = await _find_renewal_targets()
    return {
        "now": datetime.now(timezone.utc).isoformat(),
        "expiring_soon_count": len(targets["expiring_soon"]),
        "just_expired_count": len(targets["just_expired"]),
        "expiring_soon": [_strip_for_response(s) for s in targets["expiring_soon"]],
        "just_expired": [_strip_for_response(s) for s in targets["just_expired"]],
    }


@router.post("/send-notifications")
async def send_renewal_notifications(x_renewal_token: str = Header(default="")):
    """Send renewal/expiry emails to all matching users. Protected by a shared secret.

    Idempotent: marks each sub with renewalReminderSentFor / expiredNoticeSentFor so the
    same period is never notified twice, even if the cron runs more than once a day.
    """
    if not RENEWAL_CRON_TOKEN or x_renewal_token != RENEWAL_CRON_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid renewal token")
    return await run_renewal_notifications()


async def run_renewal_notifications() -> dict:
    """Core renewal notification logic. Called by both the HTTP endpoint
    and the internal scheduler. Safe to invoke multiple times per day.
    """
    targets = await _find_renewal_targets()
    now = datetime.now(timezone.utc)

    sent_reminder = 0
    sent_expired = 0
    errors = []

    # 1) Expiring soon
    for sub in targets["expiring_soon"]:
        user = await db.users.find_one({"id": sub.get("userId")})
        if not user or not user.get("email"):
            continue
        period_end = _ensure_utc(sub.get("currentPeriodEnd"))
        days_left = max(0, (period_end - now).days)
        try:
            html = _renewal_email_html(
                user_name=user.get("name", ""),
                expires_at=period_end,
                days_left=days_left,
                app_url=APP_URL,
            )
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [user["email"]],
                "subject": "Tu suscripción FactuYa! vence pronto",
                "html": html,
            })
            await db.subscriptions.update_one(
                {"_id": sub["_id"]},
                {"$set": {"renewalReminderSentFor": period_end, "updatedAt": now}},
            )
            sent_reminder += 1
        except Exception as e:
            errors.append({"userId": sub.get("userId"), "error": str(e)})

    # 2) Just expired
    for sub in targets["just_expired"]:
        user = await db.users.find_one({"id": sub.get("userId")})
        if not user or not user.get("email"):
            continue
        period_end = _ensure_utc(sub.get("currentPeriodEnd"))
        try:
            html = _expired_email_html(
                user_name=user.get("name", ""),
                expired_on=period_end,
                app_url=APP_URL,
            )
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [user["email"]],
                "subject": "Tu suscripción FactuYa! ha vencido",
                "html": html,
            })
            # Demote to free plan
            await db.subscriptions.update_one(
                {"_id": sub["_id"]},
                {"$set": {
                    "expiredNoticeSentFor": period_end,
                    "status": "expired",
                    "updatedAt": now,
                }},
            )
            sent_expired += 1
        except Exception as e:
            errors.append({"userId": sub.get("userId"), "error": str(e)})

    return {
        "sent_reminder_count": sent_reminder,
        "sent_expired_count": sent_expired,
        "errors": errors,
        "ran_at": now.isoformat(),
    }
