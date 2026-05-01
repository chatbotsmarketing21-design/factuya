"""Wompi auto-renewal (recurring subscription) module.

Manages automatic monthly charges using Wompi's tokenization feature.

Flow:
1. User opts-in during checkout -> their card is tokenized by Wompi (payment_source_id).
2. After successful payment, we save this token on subscriptions.paymentSourceId.
3. A daily cron hits POST /api/wompi/auto-charge which finds all subs where:
   - autoRenewEnabled = true
   - currentPeriodEnd is today (or in the past, for retries)
   - autoRenewFailedAttempts < MAX_RETRIES
4. For each, create a transaction via Wompi private API using the saved token.
5. If approved -> extend subscription one calendar month.
6. If declined -> increment failed attempts; notify user; after MAX_RETRIES, give up
   and let the normal expiry/modal flow take over.

Endpoints:
- POST /api/wompi/auto-charge         (cron, protected by X-Renewal-Token)
- POST /api/wompi/notify-upcoming     (cron, sends 1-day-before emails)
- DELETE /api/wompi/cancel-auto-renewal (user action, authenticated)
- GET  /api/wompi/auto-renewal-info    (user-visible status)
"""
import os
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import httpx
import resend
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException, Depends
from dateutil.relativedelta import relativedelta
from motor.motor_asyncio import AsyncIOMotorClient

from utils.auth import get_current_user_id

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/wompi", tags=["Wompi Auto-Renewal"])

# --- Configuration ---------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
db = _client[os.environ['DB_NAME']]

WOMPI_MODE = os.environ.get('WOMPI_MODE', 'production').lower()
if WOMPI_MODE == 'sandbox':
    WOMPI_PRIVATE_KEY = os.environ.get('WOMPI_SANDBOX_PRIVATE_KEY', '')
    WOMPI_API_URL = "https://sandbox.wompi.co/v1"
else:
    WOMPI_PRIVATE_KEY = os.environ.get('WOMPI_PRIVATE_KEY', '')
    WOMPI_API_URL = "https://production.wompi.co/v1"

RENEWAL_CRON_TOKEN = os.environ.get('RENEWAL_CRON_TOKEN', '')
APP_URL = os.environ.get('APP_PUBLIC_URL', 'https://factuya.app')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
resend.api_key = os.environ.get('RESEND_API_KEY')

MAX_RETRIES = 3          # After 3 failed attempts, stop trying
RETRY_WINDOW_DAYS = 3    # Retries span these many days after period_end


# --- Helpers ---------------------------------------------------------------
def _ensure_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _strip(sub: dict) -> dict:
    """Remove _id from a subscription doc for JSON responses."""
    out = {k: v for k, v in sub.items() if k != '_id'}
    for key in ('currentPeriodStart', 'currentPeriodEnd', 'updatedAt',
                'lastAutoChargeAt', 'lastAutoChargeFailedAt'):
        v = out.get(key)
        if isinstance(v, datetime):
            out[key] = v.isoformat()
    return out


async def _call_wompi_transaction(amount_in_cents: int, payment_source_id: str,
                                   customer_email: str, reference: str) -> dict:
    """Create a transaction in Wompi using a saved payment_source_id (token).

    Returns the Wompi transaction data dict on success (with status APPROVED,
    DECLINED, ERROR or PENDING).
    """
    url = f"{WOMPI_API_URL}/transactions"
    headers = {
        "Authorization": f"Bearer {WOMPI_PRIVATE_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "amount_in_cents": amount_in_cents,
        "currency": "COP",
        "customer_email": customer_email,
        "payment_source_id": payment_source_id,
        "reference": reference,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        return resp.json().get("data", {})


def _auto_charge_success_html(name: str, amount_cop: int, next_renewal: datetime, app_url: str) -> str:
    months_es = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre']
    nice = f"{next_renewal.day} de {months_es[next_renewal.month-1]} de {next_renewal.year}"
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #84cc16;">¡Cobro exitoso! ✅</h2>
      <p>Hola <strong>{name or 'Usuario'}</strong>,</p>
      <p>Acabamos de cobrar tu suscripción Premium de FactuYa!</p>
      <div style="background: #f0fdf4; border-left: 4px solid #84cc16; padding: 16px; border-radius: 6px;">
        <p style="margin:0"><strong>Monto cobrado:</strong> ${amount_cop:,} COP</p>
        <p style="margin:8px 0 0 0"><strong>Próxima renovación:</strong> {nice}</p>
      </div>
      <p style="color:#666;font-size:13px;margin-top:20px;">
        Si quieres cancelar el cobro automático, entra a FactuYa! -> Suscripción -> Cancelar cobro automático.
      </p>
    </div>
    """


def _auto_charge_failure_html(name: str, app_url: str, attempt: int) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626;">No pudimos cobrar tu renovación</h2>
      <p>Hola <strong>{name or 'Usuario'}</strong>,</p>
      <p>Intentamos cobrar tu suscripción Premium pero la tarjeta fue rechazada
         (intento {attempt} de {MAX_RETRIES}).</p>
      <p>Posibles causas: fondos insuficientes, tarjeta vencida o bloqueada.</p>
      <p style="margin-top:20px;">
        <a href="{app_url}/subscription"
           style="background:#84cc16;color:white;padding:12px 24px;
                  text-decoration:none;border-radius:6px;font-weight:bold;">
          Actualizar método de pago
        </a>
      </p>
      <p style="color:#666;font-size:13px;margin-top:20px;">
        Si no podemos cobrarte después de {MAX_RETRIES} intentos, tu cuenta volverá
        al plan gratuito. Pero no te preocupes, tus facturas existentes se conservan.
      </p>
    </div>
    """


def _upcoming_charge_html(name: str, amount_cop: int, card_last4: str | None, app_url: str) -> str:
    card_str = f"terminada en ****{card_last4}" if card_last4 else ""
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color:#84cc16;">Renovación automática mañana</h2>
      <p>Hola <strong>{name or 'Usuario'}</strong>,</p>
      <p>Mañana cobraremos <strong>${amount_cop:,} COP</strong> a tu tarjeta {card_str}
         para renovar tu suscripción Premium de FactuYa! por un mes más.</p>
      <p>No tienes que hacer nada. El cobro se procesará automáticamente.</p>
      <p style="margin-top:20px;color:#666;font-size:13px;">
        ¿Quieres cancelar la renovación automática? Entra a
        <a href="{app_url}/subscription">tu panel de suscripción</a> antes de las 9 AM de mañana.
      </p>
    </div>
    """


# --- User-facing endpoints -------------------------------------------------
@router.get("/auto-renewal-info")
async def get_auto_renewal_info(user_id: str = Depends(get_current_user_id)):
    """Return the current user's auto-renewal status for the Subscription panel."""
    sub = await db.subscriptions.find_one({"userId": user_id})
    if not sub:
        return {"autoRenewEnabled": False, "cardLast4": None, "failedAttempts": 0}
    return {
        "autoRenewEnabled": bool(sub.get("autoRenewEnabled")),
        "cardLast4": sub.get("cardLast4"),
        "failedAttempts": int(sub.get("autoRenewFailedAttempts", 0)),
        "lastAutoChargeAt": _ensure_utc(sub.get("lastAutoChargeAt")).isoformat()
            if sub.get("lastAutoChargeAt") else None,
    }


@router.delete("/cancel-auto-renewal")
async def cancel_auto_renewal(user_id: str = Depends(get_current_user_id)):
    """Stop future automatic charges for this user. Subscription remains active
    until currentPeriodEnd, then the user will see the normal expiry modal."""
    result = await db.subscriptions.update_one(
        {"userId": user_id},
        {"$set": {
            "autoRenewEnabled": False,
            "paymentSourceId": None,
            "cardLast4": None,
            "updatedAt": datetime.now(timezone.utc),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"success": True, "message": "Cobro automático cancelado"}


# --- Cron endpoints --------------------------------------------------------
@router.post("/auto-charge")
async def run_auto_charge(x_renewal_token: str = Header(default="")):
    """Daily cron: attempt automatic renewal for subscriptions due today.

    Also handles retries for subscriptions whose charge failed in previous days.
    """
    if not RENEWAL_CRON_TOKEN or x_renewal_token != RENEWAL_CRON_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid renewal token")

    now = datetime.now(timezone.utc)
    retry_window_start = now - timedelta(days=RETRY_WINDOW_DAYS)

    # Find subscriptions whose billing period ends today OR is already past (but
    # within retry window) and that have auto-renew enabled.
    candidates = await db.subscriptions.find({
        "autoRenewEnabled": True,
        "paymentSourceId": {"$exists": True, "$ne": None},
        "currentPeriodEnd": {"$gte": retry_window_start,
                              "$lte": now + timedelta(hours=6)},
    }).to_list(length=500)

    charged = 0
    failed = 0
    skipped = 0
    errors = []

    # Get live price
    from routes.wompi import calculate_subscription_price  # local import avoids cycle
    price = await calculate_subscription_price()
    amount_centavos = price["amount_centavos"]
    amount_cop = price["amount_cop"]

    for sub in candidates:
        # Skip if already reached max retries
        attempts = int(sub.get("autoRenewFailedAttempts", 0))
        if attempts >= MAX_RETRIES:
            skipped += 1
            continue

        user = await db.users.find_one({"id": sub.get("userId")})
        if not user:
            skipped += 1
            continue

        # Idempotency: if we already charged successfully for this period_end
        # within the last 24h, skip. (Protects against multiple cron runs.)
        last = _ensure_utc(sub.get("lastAutoChargeAt"))
        if last and (now - last).total_seconds() < 3600 * 20:
            skipped += 1
            continue

        reference = f"renew_{sub.get('userId')[:8]}_{uuid.uuid4().hex[:8]}"
        try:
            result = await _call_wompi_transaction(
                amount_in_cents=amount_centavos,
                payment_source_id=sub["paymentSourceId"],
                customer_email=user["email"],
                reference=reference,
            )
            status_ = (result.get("status") or "").upper()

            if status_ == "APPROVED":
                # Extend subscription one calendar month from the OLD period end
                # (not from "now") to keep billing dates consistent.
                old_end = _ensure_utc(sub.get("currentPeriodEnd")) or now
                new_end = old_end + relativedelta(months=1)
                await db.subscriptions.update_one(
                    {"_id": sub["_id"]},
                    {"$set": {
                        "status": "active",
                        "currentPeriodStart": old_end,
                        "currentPeriodEnd": new_end,
                        "lastAutoChargeAt": now,
                        "autoRenewFailedAttempts": 0,
                        "updatedAt": now,
                    }},
                )
                # Confirmation email
                try:
                    await asyncio.to_thread(resend.Emails.send, {
                        "from": SENDER_EMAIL,
                        "to": [user["email"]],
                        "subject": "Renovación automática exitosa - FactuYa!",
                        "html": _auto_charge_success_html(
                            user.get("name", ""), amount_cop, new_end, APP_URL,
                        ),
                    })
                except Exception:
                    pass
                charged += 1
            else:
                # DECLINED / ERROR / VOIDED / anything else
                attempts += 1
                await db.subscriptions.update_one(
                    {"_id": sub["_id"]},
                    {"$set": {
                        "autoRenewFailedAttempts": attempts,
                        "lastAutoChargeFailedAt": now,
                        "updatedAt": now,
                    }},
                )
                # Failure email
                try:
                    await asyncio.to_thread(resend.Emails.send, {
                        "from": SENDER_EMAIL,
                        "to": [user["email"]],
                        "subject": f"Falló el cobro automático (intento {attempts}/{MAX_RETRIES})",
                        "html": _auto_charge_failure_html(
                            user.get("name", ""), APP_URL, attempts,
                        ),
                    })
                except Exception:
                    pass
                failed += 1
        except Exception as e:
            errors.append({"userId": sub.get("userId"), "error": str(e)})
            failed += 1

    return {
        "ran_at": now.isoformat(),
        "candidates": len(candidates),
        "charged": charged,
        "failed": failed,
        "skipped": skipped,
        "errors": errors,
    }


@router.post("/notify-upcoming")
async def notify_upcoming_charges(x_renewal_token: str = Header(default="")):
    """Send email 1 day before each auto-charge. Should run daily via cron."""
    if not RENEWAL_CRON_TOKEN or x_renewal_token != RENEWAL_CRON_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid renewal token")

    now = datetime.now(timezone.utc)
    start = now + timedelta(hours=20)
    end = now + timedelta(hours=30)  # ~24h window

    candidates = await db.subscriptions.find({
        "autoRenewEnabled": True,
        "paymentSourceId": {"$exists": True, "$ne": None},
        "currentPeriodEnd": {"$gte": start, "$lte": end},
    }).to_list(length=500)

    from routes.wompi import calculate_subscription_price
    price = await calculate_subscription_price()
    amount_cop = price["amount_cop"]

    sent = 0
    for sub in candidates:
        # Don't re-send if already notified for this period
        if sub.get("upcomingNotifiedFor") == sub.get("currentPeriodEnd"):
            continue
        user = await db.users.find_one({"id": sub.get("userId")})
        if not user:
            continue
        try:
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [user["email"]],
                "subject": "Mañana renovaremos tu suscripción - FactuYa!",
                "html": _upcoming_charge_html(
                    user.get("name", ""), amount_cop,
                    sub.get("cardLast4"), APP_URL,
                ),
            })
            await db.subscriptions.update_one(
                {"_id": sub["_id"]},
                {"$set": {"upcomingNotifiedFor": sub.get("currentPeriodEnd")}},
            )
            sent += 1
        except Exception:
            pass

    return {"sent": sent, "candidates": len(candidates), "ran_at": now.isoformat()}
