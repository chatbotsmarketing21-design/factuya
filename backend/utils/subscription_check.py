from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_can_create_invoice(user_id: str, db):
    """Check if user can create a new invoice"""
    # Get user's subscription
    subscription = await db.subscriptions.find_one({"userId": user_id})
    
    if not subscription:
        return False, "No subscription found"
    
    status = subscription.get("status", "trialing")
    
    # Active subscription - unlimited invoices
    if status == "active":
        return True, "Active subscription"
    
    # Trial - check limit
    if status == "trialing":
        invoices_used = subscription.get("trialInvoicesUsed", 0)
        max_trial = subscription.get("maxTrialInvoices", 10)  # Default 10
        
        if invoices_used < max_trial:
            return True, f"Trial: {max_trial - invoices_used} remaining"
        else:
            return False, "Trial limit reached. Please subscribe."
    
    return False, "Inactive subscription"

async def increment_trial_invoice_count(user_id: str, db):
    """Increment trial invoice count"""
    subscription = await db.subscriptions.find_one({"userId": user_id})
    
    if subscription and subscription.get("status") == "trialing":
        await db.subscriptions.update_one(
            {"userId": user_id},
            {"$inc": {"trialInvoicesUsed": 1}}
        )