"""Sorteo Halloween 2026: TV pantalla plana via Lotería de Medellín #4859."""
from fastapi import APIRouter, Depends
import os
import random
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from utils.auth import get_current_user_id

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/raffle", tags=["Raffle"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

PROMO = {
    "id": "halloween2026",
    "title": "Sorteo de Halloween",
    "prize": "Televisor pantalla plana",
    "lottery": "Lotería de Medellín",
    "drawNumber": "4859",
    "drawDateLabel": "viernes 30 de octubre",
    "endsAt": "2026-10-31T04:59:59+00:00",
}


def promo_active() -> bool:
    return datetime.now(timezone.utc) < datetime.fromisoformat(PROMO["endsAt"])


async def _active_subscription(user_id: str):
    """Devuelve la suscripción si el usuario es Premium activo, si no None."""
    sub = await db.subscriptions.find_one({"userId": user_id, "status": "active"})
    if not sub:
        return None
    end = sub.get("currentPeriodEnd")
    if isinstance(end, str):
        try:
            end = datetime.fromisoformat(end.replace("Z", "+00:00"))
        except ValueError:
            end = None
    if isinstance(end, datetime):
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        if end < datetime.now(timezone.utc):
            return None
    return sub


async def get_or_assign_entry(user_id: str, email: str = None, name: str = None, plan: str = None):
    """Asigna (una sola vez) un número único de 4 cifras al usuario. Idempotente."""
    existing = await db.raffle_entries.find_one(
        {"promoId": PROMO["id"], "userId": user_id}, {"_id": 0}
    )
    if existing:
        return existing
    for _ in range(50):
        number = f"{random.randint(0, 9999):04d}"
        taken = await db.raffle_entries.find_one({"promoId": PROMO["id"], "number": number})
        if not taken:
            entry = {
                "promoId": PROMO["id"],
                "userId": user_id,
                "email": email,
                "name": name,
                "plan": plan,
                "number": number,
                "assignedAt": datetime.now(timezone.utc).isoformat(),
            }
            await db.raffle_entries.insert_one(dict(entry))
            return entry
    return None


@router.get("/promo")
async def get_promo():
    """Info pública de la promoción vigente."""
    return {**PROMO, "active": promo_active()}


async def get_raffle_number_for_email(user_id: str, user: dict):
    """Helper para los correos de confirmación de pago. Nunca lanza."""
    try:
        if not promo_active():
            return None
        entry = await get_or_assign_entry(
            user_id, email=user.get("email"), name=user.get("name"), plan="premium"
        )
        return entry["number"] if entry else None
    except Exception:
        return None


@router.get("/my-entry")
async def my_entry(user_id: str = Depends(get_current_user_id)):
    """Número del sorteo del usuario autenticado (lo asigna si es Premium y no tiene)."""
    if not promo_active():
        return {"active": False, "eligible": False}
    sub = await _active_subscription(user_id)
    if not sub:
        return {"active": True, "eligible": False}
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1, "name": 1})
    entry = await get_or_assign_entry(
        user_id,
        email=(user or {}).get("email"),
        name=(user or {}).get("name"),
        plan=sub.get("planId"),
    )
    return {"active": True, "eligible": True, "number": entry["number"] if entry else None}


async def _premium_user_ids(now):
    """IDs de usuarios con premium activo (no expirado)."""
    ids = set()
    subs = await db.subscriptions.find({"status": "active"}).to_list(5000)
    for sub in subs:
        end = sub.get("currentPeriodEnd")
        if isinstance(end, str):
            try:
                end = datetime.fromisoformat(end.replace("Z", "+00:00"))
            except ValueError:
                end = None
        if isinstance(end, datetime):
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            if end < now:
                continue
        if sub.get("userId"):
            ids.add(sub["userId"])
    return ids


def _reminder_subject_body(days_left: int):
    if days_left <= 1:
        subject = '🎃 ¡ÚLTIMO DÍA! Gana un TV KALLEY 60" QLED 4K con FactuYa'
        urgency = "¡HOY es tu última oportunidad!"
    else:
        subject = f'⏳ Faltan {days_left} días: Gana un TV KALLEY 60" QLED 4K 🎃'
        urgency = f"Solo quedan {days_left} días para el sorteo."
    body = (
        f"{urgency}\n"
        "Suscríbete a Premium en FactuYa y recibe tu número de la suerte de 4 cifras.\n"
        "Ganas el televisor si tu número coincide con el Sorteo #4859 de la Lotería de Medellín este viernes 30 de octubre en la noche.\n"
        "Además, con Premium tienes facturas ilimitadas y todas las plantillas. ¡No te quedes por fuera!"
    )
    return subject, body


async def run_raffle_reminders(force: bool = False, dry_run: bool = False):
    """Envía el recordatorio del sorteo (correo + notificación) a usuarios sin Premium.
    Solo actúa durante la última semana antes del sorteo. Idempotente (1 por usuario)."""
    import asyncio as _asyncio
    import resend as _resend
    from routes.admin import _broadcast_email_html
    from routes.notifications import create_notification

    now = datetime.now(timezone.utc)
    if not promo_active():
        return {"status": "skipped", "reason": "promo_inactive"}
    ends_at = datetime.fromisoformat(PROMO["endsAt"])
    days_left = max(0, (ends_at - now).days + (1 if (ends_at - now).seconds > 0 else 0))
    if days_left > 7 and not force:
        return {"status": "skipped", "reason": f"faltan {days_left} días (>7)"}

    premium_ids = await _premium_user_ids(now)
    already = set()
    async for r in db.raffle_reminders.find({"promoId": PROMO["id"]}, {"userId": 1}):
        already.add(r.get("userId"))

    targets = []
    async for u in db.users.find({}, {"_id": 0, "id": 1, "email": 1, "name": 1}):
        uid = u.get("id")
        if not uid or not u.get("email") or uid in premium_ids or uid in already:
            continue
        targets.append(u)

    if dry_run:
        return {"status": "dry_run", "would_send": len(targets), "days_left": days_left}

    _resend.api_key = os.environ.get("RESEND_API_KEY")
    subject, body = _reminder_subject_body(days_left)
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    sent, failed = 0, 0
    for u in targets:
        try:
            html = _broadcast_email_html(u.get("name"), body, include_banner=True)
            await _asyncio.to_thread(_resend.Emails.send, {
                "from": sender,
                "to": [u["email"]],
                "subject": subject,
                "html": html,
            })
            sent += 1
        except Exception:
            failed += 1
        try:
            await create_notification(
                u["id"],
                type="promo",
                title="🎃 ¡Última semana del sorteo!",
                body=f"Quedan {days_left} día(s). Suscríbete a Premium y participa por el TV KALLEY 60\".",
                link="/subscription",
                icon="gift",
                accent="amber",
                dedupe_key=f"raffle_reminder:{PROMO['id']}:{u['id']}",
            )
        except Exception:
            pass
        await db.raffle_reminders.insert_one({
            "promoId": PROMO["id"],
            "userId": u["id"],
            "email": u["email"],
            "sentAt": now.isoformat(),
        })
        await _asyncio.sleep(0.6)

    return {"status": "done", "sent": sent, "failed": failed, "days_left": days_left}


@router.post("/send-reminders")
async def send_reminders(user_id: str = Depends(get_current_user_id), dry_run: bool = False, force: bool = False, test_email: str = None):
    """Dispara manualmente el recordatorio (solo admin). test_email envía 1 muestra."""
    from routes.admin import verify_admin
    await verify_admin(user_id)
    if test_email:
        import resend as _resend
        from routes.admin import _broadcast_email_html
        _resend.api_key = os.environ.get("RESEND_API_KEY")
        subject, body = _reminder_subject_body(3)
        _resend.Emails.send({
            "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
            "to": [test_email],
            "subject": f"[PRUEBA] {subject}",
            "html": _broadcast_email_html("Prueba", body, include_banner=True),
        })
        return {"status": "test_sent", "to": test_email}
    return await run_raffle_reminders(force=force, dry_run=dry_run)


@router.get("/participants")
async def participants(user_id: str = Depends(get_current_user_id)):
    """Lista de participantes (solo admin). Asigna números a premium activos sin entrada."""
    from routes.admin import verify_admin
    await verify_admin(user_id)

    # Backfill: todo premium activo participa
    subs = await db.subscriptions.find({"status": "active"}).to_list(2000)
    now = datetime.now(timezone.utc)
    for sub in subs:
        end = sub.get("currentPeriodEnd")
        if isinstance(end, str):
            try:
                end = datetime.fromisoformat(end.replace("Z", "+00:00"))
            except ValueError:
                end = None
        if isinstance(end, datetime):
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            if end < now:
                continue
        uid = sub.get("userId")
        if not uid:
            continue
        user = await db.users.find_one({"id": uid}, {"_id": 0, "email": 1, "name": 1})
        if not user:
            continue
        await get_or_assign_entry(uid, email=user.get("email"), name=user.get("name"), plan=sub.get("planId"))

    entries = await db.raffle_entries.find(
        {"promoId": PROMO["id"]}, {"_id": 0}
    ).sort("assignedAt", -1).to_list(2000)
    return {"promo": {**PROMO, "active": promo_active()}, "participants": entries, "total": len(entries)}
