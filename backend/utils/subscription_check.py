from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os

async def check_can_create_invoice(user_id: str, db):
    """Check if user can create a new invoice"""
    # Get user's subscription
    subscription = await db.subscriptions.find_one({"userId": user_id})
    
    # Auto-create trial subscription if none exists
    if not subscription:
        trial_end = datetime.now(timezone.utc) + timedelta(days=999)
        new_subscription = {
            "userId": user_id,
            "planId": "trial",
            "status": "trialing",
            "currentPeriodEnd": trial_end,
            "trialInvoicesUsed": 0,
            "maxTrialInvoices": 10,
            "createdAt": datetime.now(timezone.utc)
        }
        await db.subscriptions.insert_one(new_subscription)
        subscription = new_subscription
    
    status = subscription.get("status", "trialing")
    
    # Active subscription - unlimited invoices
    if status == "active":
        return True, "Active subscription"
    
    # Trial - check limit by counting ACTUAL invoices in database
    if status == "trialing":
        max_trial = subscription.get("maxTrialInvoices", 10)  # Default 10
        
        # Count REAL invoices from database (more reliable than counter)
        actual_invoice_count = await db.invoices.count_documents({"userId": user_id})
        
        # Update the counter to match reality
        if actual_invoice_count != subscription.get("trialInvoicesUsed", 0):
            await db.subscriptions.update_one(
                {"userId": user_id},
                {"$set": {"trialInvoicesUsed": actual_invoice_count}}
            )
        
        if actual_invoice_count < max_trial:
            remaining = max_trial - actual_invoice_count
            return True, f"Trial: {remaining} remaining"
        else:
            return False, "Trial limit reached. Please subscribe."
    
    return False, "Inactive subscription"

async def increment_trial_invoice_count(user_id: str, db):
    """Increment trial invoice count"""
    subscription = await db.subscriptions.find_one({"userId": user_id})
    
    if subscription and subscription.get("status") == "trialing":
        # Count actual invoices and update
        actual_count = await db.invoices.count_documents({"userId": user_id})
        await db.subscriptions.update_one(
            {"userId": user_id},
            {"$set": {"trialInvoicesUsed": actual_count}}
        )
