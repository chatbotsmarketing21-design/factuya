from fastapi import APIRouter, HTTPException, Depends
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from utils.auth import get_current_user_id

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/admin", tags=["Admin"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Admin email - only this email can access admin panel
ADMIN_EMAIL = "soportefactuya@gmail.com"

async def verify_admin(user_id: str = Depends(get_current_user_id)):
    """Verify that the current user is an admin"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.get("email", "").lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo administradores.")
    
    return user_id

@router.get("/stats")
async def get_admin_stats(user_id: str = Depends(verify_admin)):
    """Get admin dashboard statistics"""
    
    # Total users
    total_users = await db.users.count_documents({})
    
    # Total invoices
    total_invoices = await db.invoices.count_documents({})
    
    # Total revenue (sum of all paid invoices)
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.invoices.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Users registered this month
    now = datetime.now(timezone.utc)
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    users_this_month = await db.users.count_documents({
        "createdAt": {"$gte": first_day_of_month}
    })
    
    # Invoices this month
    invoices_this_month = await db.invoices.count_documents({
        "createdAt": {"$gte": first_day_of_month}
    })
    
    # Premium subscribers
    premium_users = await db.subscriptions.count_documents({"status": "active"})
    
    return {
        "totalUsers": total_users,
        "totalInvoices": total_invoices,
        "totalRevenue": total_revenue,
        "usersThisMonth": users_this_month,
        "invoicesThisMonth": invoices_this_month,
        "premiumUsers": premium_users
    }

@router.get("/users")
async def get_all_users(user_id: str = Depends(verify_admin)):
    """Get list of all registered users"""
    
    users = await db.users.find(
        {},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "createdAt": 1}
    ).sort("createdAt", -1).to_list(1000)
    
    # Get subscription status for each user
    for user in users:
        subscription = await db.subscriptions.find_one(
            {"userId": user.get("id")},
            {"_id": 0, "status": 1}
        )
        user["subscriptionStatus"] = subscription.get("status", "none") if subscription else "none"
        
        # Count invoices for this user
        invoice_count = await db.invoices.count_documents({"userId": user.get("id")})
        user["invoiceCount"] = invoice_count
        
        # Format date
        if user.get("createdAt"):
            if isinstance(user["createdAt"], datetime):
                user["createdAt"] = user["createdAt"].isoformat()
    
    return {"users": users, "total": len(users)}

@router.get("/check")
async def check_admin_access(user_id: str = Depends(get_current_user_id)):
    """Check if current user has admin access"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return {"isAdmin": False}
    
    is_admin = user.get("email", "").lower() == ADMIN_EMAIL.lower()
    return {"isAdmin": is_admin}
