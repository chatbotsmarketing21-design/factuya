"""In-app notifications module.

Stores per-user notifications shown via the bell icon in the header.
Kept intentionally small — only the 3 triggers the user requested today:
  • welcome  (with launch coupon LANZAMIENTO50)
  • payment_received
  • subscription_expires_tomorrow  (cron)
  • promo  (manual broadcast for future campaigns)
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
import os

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from routes.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Local DB handle (matches the pattern used by every other routes/*.py file)
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = _client[os.environ['DB_NAME']]


# ----------------------------- Helper -----------------------------

async def create_notification(
    user_id: str,
    *,
    type: str,
    title: str,
    body: str,
    link: Optional[str] = None,
    icon: str = "bell",
    accent: str = "lime",
    dedupe_key: Optional[str] = None,
) -> Optional[str]:
    """Insert a notification for a single user.

    If `dedupe_key` is provided we avoid creating duplicate notifications of the
    same key for the user (useful for cron-based reminders that may run multiple
    times per day).
    """
    if dedupe_key:
        existing = await db.notifications.find_one({
            "userId": user_id,
            "dedupeKey": dedupe_key,
        })
        if existing:
            return None

    doc = {
        "id": str(uuid4()),
        "userId": user_id,
        "type": type,
        "title": title,
        "body": body,
        "link": link,
        "icon": icon,
        "accent": accent,
        "dedupeKey": dedupe_key,
        "createdAt": datetime.now(timezone.utc),
        "readAt": None,
    }
    await db.notifications.insert_one(doc)
    return doc["id"]


# --------------------------- API models ---------------------------

class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: str
    link: Optional[str] = None
    icon: str
    accent: str
    createdAt: str
    readAt: Optional[str] = None


class UnreadCountOut(BaseModel):
    count: int


# ----------------------------- Routes -----------------------------

@router.get("/", response_model=list[NotificationOut])
async def list_notifications(user=Depends(get_current_user), limit: int = 50):
    cursor = db.notifications.find({"userId": user.id}).sort("createdAt", -1).limit(limit)
    out = []
    async for n in cursor:
        out.append(NotificationOut(
            id=n["id"],
            type=n["type"],
            title=n["title"],
            body=n["body"],
            link=n.get("link"),
            icon=n.get("icon", "bell"),
            accent=n.get("accent", "lime"),
            createdAt=n["createdAt"].isoformat() if isinstance(n["createdAt"], datetime) else n["createdAt"],
            readAt=(n["readAt"].isoformat() if isinstance(n.get("readAt"), datetime) else n.get("readAt")),
        ))
    return out


@router.get("/unread-count", response_model=UnreadCountOut)
async def unread_count(user=Depends(get_current_user)):
    n = await db.notifications.count_documents({"userId": user.id, "readAt": None})
    return UnreadCountOut(count=n)


@router.post("/{notif_id}/read")
async def mark_as_read(notif_id: str, user=Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notif_id, "userId": user.id, "readAt": None},
        {"$set": {"readAt": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        # Either it doesn't exist, doesn't belong to user, or is already read — all safe to ignore.
        pass
    return {"ok": True}


@router.post("/read-all")
async def mark_all_as_read(user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    result = await db.notifications.update_many(
        {"userId": user.id, "readAt": None},
        {"$set": {"readAt": now}},
    )
    return {"ok": True, "updated": result.modified_count}


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, user=Depends(get_current_user)):
    result = await db.notifications.delete_one({"id": notif_id, "userId": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


# ----------------------- Admin broadcast -----------------------

class BroadcastIn(BaseModel):
    title: str
    body: str
    link: Optional[str] = None
    icon: str = "megaphone"
    accent: str = "amber"
    type: str = "promo"


@router.post("/broadcast")
async def broadcast_notification(body: BroadcastIn, user=Depends(get_current_user)):
    """Admin-only — push a promo notification to every user.

    Uses the same identification pattern as routes/admin.py: a hard-coded
    ADMIN_EMAIL match against the current user's email (case-insensitive).
    """
    ADMIN_EMAIL = "soportefactuya@gmail.com"
    me = await db.users.find_one({"id": user.id})
    if not me or (me.get("email") or "").lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Admin only")

    now = datetime.now(timezone.utc)
    docs = []
    async for u in db.users.find({}, {"id": 1}):
        if not u.get("id"):
            continue
        docs.append({
            "id": str(uuid4()),
            "userId": u["id"],
            "type": body.type,
            "title": body.title,
            "body": body.body,
            "link": body.link,
            "icon": body.icon,
            "accent": body.accent,
            "dedupeKey": None,
            "createdAt": now,
            "readAt": None,
        })
    if docs:
        await db.notifications.insert_many(docs)
    return {"ok": True, "sent": len(docs)}
