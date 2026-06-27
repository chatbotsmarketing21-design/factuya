"""Internal scheduler for FactuYa! background jobs.

Uses APScheduler running in-process inside the FastAPI app, so we no longer
depend on a separate VPS cron. Jobs:

  - renewal_notifications: every day at 09:00 UTC (≈ 04:00 Bogotá),
    runs the same logic as POST /api/renewal/send-notifications.
    Idempotent: each subscription is marked when notified so it never
    gets the same reminder twice in a single billing period.

Starts on FastAPI startup, stops cleanly on shutdown.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _renewal_job():
    """Daily renewal job: emails users whose sub expires soon / just expired."""
    try:
        from routes.renewal import run_renewal_notifications
        result = await run_renewal_notifications()
        logger.info(
            "[scheduler] renewal job done: reminders=%s expired=%s errors=%s",
            result.get("sent_reminder_count"),
            result.get("sent_expired_count"),
            len(result.get("errors", [])),
        )
    except Exception as e:
        logger.exception("[scheduler] renewal job crashed: %s", e)


async def _expiry_notification_job():
    """Daily job: in-app bell notification when a user's Premium expires tomorrow.

    Idempotent — uses a per-period dedupe key so the user only sees one
    'expires tomorrow' notification per billing cycle.
    """
    from datetime import datetime, timezone, timedelta
    import os
    from motor.motor_asyncio import AsyncIOMotorClient
    from routes.notifications import create_notification

    try:
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]

        now = datetime.now(timezone.utc)
        tomorrow_start = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_end = tomorrow_start + timedelta(days=1)

        cursor = db.subscriptions.find({
            "status": "active",
            "currentPeriodEnd": {"$gte": tomorrow_start, "$lt": tomorrow_end},
        })

        created = 0
        async for sub in cursor:
            user_id = sub.get("userId")
            if not user_id:
                continue
            # Skip admin lifetime plans
            if sub.get("planId") == "admin_lifetime":
                continue
            period_end = sub.get("currentPeriodEnd")
            dedupe = f"sub_expires_tomorrow:{period_end.isoformat() if hasattr(period_end, 'isoformat') else period_end}"
            inserted = await create_notification(
                user_id,
                type="subscription_expires_tomorrow",
                title="⚠️ Tu Premium vence mañana",
                body="Renová ahora para no perder el acceso a tus facturas y plantillas.",
                link="/subscription",
                icon="alert-triangle",
                accent="red",
                dedupe_key=dedupe,
            )
            if inserted:
                created += 1

        logger.info("[scheduler] expiry-tomorrow notifications created=%s", created)
    except Exception as e:
        logger.exception("[scheduler] expiry-tomorrow job crashed: %s", e)


def start_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        return
    _scheduler = AsyncIOScheduler(timezone="UTC")
    # 09:00 UTC daily ≈ 04:00 Bogotá ≈ early morning everywhere
    _scheduler.add_job(
        _renewal_job,
        CronTrigger(hour=9, minute=0),
        id="renewal_notifications",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    # In-app "expires tomorrow" bell notifications — runs 09:30 UTC
    _scheduler.add_job(
        _expiry_notification_job,
        CronTrigger(hour=9, minute=30),
        id="expiry_tomorrow_notifications",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("[scheduler] started; jobs=%s", [j.id for j in _scheduler.get_jobs()])


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[scheduler] stopped")
