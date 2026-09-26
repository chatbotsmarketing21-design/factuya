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
