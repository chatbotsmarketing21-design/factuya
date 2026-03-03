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
    
    # Premium subscribers (active)
    premium_users = await db.subscriptions.count_documents({"status": "active"})
    
    # New premium this month (subscriptions created this month)
    new_premium_this_month = await db.subscriptions.count_documents({
        "status": "active",
        "createdAt": {"$gte": first_day_of_month}
    })
    
    # Renewals this month (active subscriptions created before this month but renewed this month)
    renewals_this_month = await db.subscriptions.count_documents({
        "status": "active",
        "createdAt": {"$lt": first_day_of_month},
        "currentPeriodStart": {"$gte": first_day_of_month}
    })
    
    # Calculate revenues
    new_premium_revenue = new_premium_this_month * 5
    renewals_revenue = renewals_this_month * 5
    total_monthly_revenue = new_premium_revenue + renewals_revenue
    total_revenue = premium_users * 5
    
    return {
        "totalUsers": total_users,
        "totalInvoices": total_invoices,
        "totalRevenue": total_revenue,
        "usersThisMonth": users_this_month,
        "invoicesThisMonth": invoices_this_month,
        "premiumUsers": premium_users,
        "newPremiumThisMonth": new_premium_this_month,
        "renewalsThisMonth": renewals_this_month,
        "newPremiumRevenue": new_premium_revenue,
        "renewalsRevenue": renewals_revenue,
        "totalMonthlyRevenue": total_monthly_revenue
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

@router.get("/balance")
async def get_balance(user_id: str = Depends(verify_admin), year: int = None):
    """Get monthly revenue balance for a specific year"""
    
    if year is None:
        year = datetime.now(timezone.utc).year
    
    monthly_data = []
    
    for month in range(1, 13):
        # First day of the month
        first_day = datetime(year, month, 1, tzinfo=timezone.utc)
        
        # Last day of the month
        if month == 12:
            last_day = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            last_day = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        
        # New premium subscriptions this month
        new_premium = await db.subscriptions.count_documents({
            "status": "active",
            "createdAt": {"$gte": first_day, "$lt": last_day}
        })
        
        # Renewals this month
        renewals = await db.subscriptions.count_documents({
            "status": "active",
            "createdAt": {"$lt": first_day},
            "currentPeriodStart": {"$gte": first_day, "$lt": last_day}
        })
        
        # Calculate revenue
        new_revenue = new_premium * 5
        renewal_revenue = renewals * 5
        total_revenue = new_revenue + renewal_revenue
        
        monthly_data.append({
            "month": month,
            "newPremium": new_premium,
            "renewals": renewals,
            "newRevenue": new_revenue,
            "renewalRevenue": renewal_revenue,
            "totalRevenue": total_revenue
        })
    
    # Calculate year total
    year_total = sum(m["totalRevenue"] for m in monthly_data)
    
    return {
        "year": year,
        "months": monthly_data,
        "yearTotal": year_total
    }

@router.get("/balance/years")
async def get_available_years(user_id: str = Depends(verify_admin)):
    """Get list of years with subscription data"""
    
    # Get the earliest subscription
    earliest = await db.subscriptions.find_one(
        {},
        sort=[("createdAt", 1)]
    )
    
    current_year = datetime.now(timezone.utc).year
    
    if earliest and earliest.get("createdAt"):
        start_year = earliest["createdAt"].year
    else:
        start_year = current_year
    
    years = list(range(start_year, current_year + 1))
    
    return {"years": years}
