"""Seed script: create the LANZAMIENTO50 launch coupon.

Run once after deployment:
    python3 /var/www/factuya/backend/scripts/seed_launch_coupon.py

Idempotent — safe to run multiple times. Updates expiration to 30 days from "now"
each time it runs, so you can use it to "renew" the campaign window.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Make backend package importable when run as a script
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

COUPON_CODE = "LANZAMIENTO50"
DISCOUNT_PERCENT = 50
VALIDITY_DAYS = 30
APPLIES_TO = ["wompi", "paypal", "stripe"]


async def main() -> None:
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=VALIDITY_DAYS)

    # Upsert: create if missing, update expiration if it exists
    result = await db.reactivation_coupons.update_one(
        {"code": COUPON_CODE},
        {
            "$set": {
                "code": COUPON_CODE,
                "discount_percent": DISCOUNT_PERCENT,
                "applies_to": APPLIES_TO,
                "multi_use": True,
                "expires_at": expires_at,
                "status": "active",
                "reason": "launch_campaign",
                "updated_at": now,
            },
            "$setOnInsert": {
                "issued_at": now,
                "used_by_user_ids": [],
                "redeem_count": 0,
            },
        },
        upsert=True,
    )

    if result.upserted_id:
        print(f"✅ Coupon {COUPON_CODE} CREATED")
    else:
        print(f"♻️  Coupon {COUPON_CODE} UPDATED (expiration refreshed)")

    print(f"   Discount: {DISCOUNT_PERCENT}% OFF")
    print(f"   Valid until: {expires_at.strftime('%Y-%m-%d %H:%M UTC')} ({VALIDITY_DAYS} days)")
    print(f"   Applies to: {', '.join(APPLIES_TO)}")
    print(f"   Multi-use: yes (each user can redeem ONCE)")


if __name__ == "__main__":
    asyncio.run(main())
