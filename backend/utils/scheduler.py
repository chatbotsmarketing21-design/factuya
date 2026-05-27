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
    _scheduler.start()
    logger.info("[scheduler] started; jobs=%s", [j.id for j in _scheduler.get_jobs()])


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[scheduler] stopped")
