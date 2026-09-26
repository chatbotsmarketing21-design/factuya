from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
import os
import asyncio
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel
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

# Normalización de nombres de país (texto libre del perfil) a código ISO
COUNTRY_NAME_TO_ISO = {
    "colombia": "CO", "estados unidos": "US", "united states": "US", "usa": "US",
    "eeuu": "US", "ee.uu.": "US", "mexico": "MX", "méxico": "MX", "espana": "ES",
    "españa": "ES", "spain": "ES", "argentina": "AR", "chile": "CL", "peru": "PE",
    "perú": "PE", "ecuador": "EC", "venezuela": "VE", "bolivia": "BO", "brasil": "BR",
    "brazil": "BR", "panama": "PA", "panamá": "PA", "costa rica": "CR", "guatemala": "GT",
    "honduras": "HN", "el salvador": "SV", "nicaragua": "NI", "paraguay": "PY",
    "uruguay": "UY", "republica dominicana": "DO", "república dominicana": "DO",
    "puerto rico": "PR", "cuba": "CU", "canada": "CA", "canadá": "CA", "francia": "FR",
    "france": "FR", "portugal": "PT", "italia": "IT", "italy": "IT", "alemania": "DE",
    "germany": "DE", "reino unido": "GB", "united kingdom": "GB", "uk": "GB",
}

def normalize_country(value):
    """Devuelve código ISO de 2 letras a partir de código o nombre libre."""
    if not value:
        return None
    v = value.strip()
    if len(v) == 2 and v.isalpha():
        return v.upper()
    return COUNTRY_NAME_TO_ISO.get(v.lower(), v)

async def verify_admin(user_id: str = Depends(get_current_user_id)):
    """Verify that the current user is an admin"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.get("email", "").lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo administradores.")
    
    return user_id

class GrantPremiumRequest(BaseModel):
    email: str
    duration: str  # '1m' | '6m' | '1y' | 'permanent'


@router.post("/grant-premium")
async def grant_premium(request: GrantPremiumRequest, user_id: str = Depends(verify_admin)):
    """Regala Premium a un usuario por su correo (solo admin)."""
    email = request.email.strip().lower()
    target = await db.users.find_one({"email": email})
    if not target:
        raise HTTPException(status_code=404, detail=f"No existe un usuario registrado con el correo {email}")

    durations = {
        "1m": relativedelta(months=1),
        "6m": relativedelta(months=6),
        "1y": relativedelta(years=1),
        "permanent": relativedelta(years=100),
    }
    if request.duration not in durations:
        raise HTTPException(status_code=400, detail="Duración inválida")

    now = datetime.now(timezone.utc)
    period_end = now + durations[request.duration]

    await db.subscriptions.update_one(
        {"userId": target["id"]},
        {"$set": {
            "userId": target["id"],
            "status": "active",
            "planId": "premium_gift",
            "currentPeriodStart": now,
            "currentPeriodEnd": period_end,
            "autoRenewEnabled": False,
            "giftedBy": ADMIN_EMAIL,
            "giftedAt": now,
            "updatedAt": now,
        }},
        upsert=True
    )

    try:
        from routes.notifications import create_notification
        await create_notification(
            target["id"],
            type="premium_gift",
            title="🎁 ¡Tienes Premium de regalo!",
            body="Te activamos FactuYa! Premium sin costo. Disfruta facturas ilimitadas y todas las plantillas.",
            link="/subscription",
            icon="gift",
            accent="lime",
            dedupe_key=f"premium_gift:{target['id']}:{now.date().isoformat()}",
        )
    except Exception as e:
        print(f"Gift notification failed: {e}")

    return {
        "success": True,
        "email": email,
        "name": target.get("name", ""),
        "duration": request.duration,
        "premiumUntil": None if request.duration == "permanent" else period_end.isoformat(),
    }


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
        {"_id": 0, "id": 1, "email": 1, "name": 1, "createdAt": 1, "lastSeenAt": 1, "lastSeenSource": 1, "country": 1, "countryName": 1, "companyInfo.country": 1}
    ).sort("createdAt", -1).to_list(1000)
    
    # Get subscription status for each user
    for user in users:
        # Country: geo-detected first, profile (companyInfo) as fallback
        raw_country = user.get("country") or (user.get("companyInfo") or {}).get("country")
        user["country"] = normalize_country(raw_country)
        user.pop("companyInfo", None)
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

@router.delete("/users/{target_user_id}")
async def admin_delete_user(target_user_id: str, user_id: str = Depends(verify_admin)):
    """Elimina permanentemente a un usuario y todos sus datos (solo admin)."""
    target = await db.users.find_one({"id": target_user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if target.get("email", "").lower() == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="No puedes eliminar la cuenta de administrador")

    target_email = target.get("email")
    collections = [
        "invoices", "invoice_counters", "products", "notifications",
        "paypal_subscriptions", "wompi_subscriptions", "wompi_payments",
        "subscriptions", "password_resets", "renewal_notifications",
        "company_logos", "reactivation_coupons",
    ]
    for coll in collections:
        try:
            await db[coll].delete_many({"$or": [{"userId": target_user_id}, {"user_id": target_user_id}]})
        except Exception:
            pass
    if target_email:
        for coll in ["password_resets", "contact_messages"]:
            try:
                await db[coll].delete_many({"email": target_email})
            except Exception:
                pass

    await db.users.delete_one({"id": target_user_id})
    return {"success": True, "email": target_email}


class EmailBroadcastIn(BaseModel):
    subject: str
    body: str
    include_raffle_banner: bool = True


def _broadcast_email_html(name: str, body_text: str, include_banner: bool) -> str:
    from utils.email_notifications import APP_URL
    greeting = (name or "").strip() or "Amigo/a"
    paragraphs = "".join(
        f'<p style="color:#444; line-height:1.7; margin: 0 0 14px;">{line}</p>'
        for line in body_text.split("\n") if line.strip()
    )
    banner_html = ""
    if include_banner:
        banner_html = f"""
        <a href="{APP_URL}/subscription" style="display:block; margin: 20px 0;">
            <img src="https://factuya.site/raffle-banner.webp" alt="Sorteo Halloween: Gana un TV KALLEY 60 QLED 4K"
                 style="width:100%; height:auto; border-radius: 10px; display:block;">
        </a>
        """
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#f9fafb;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0a0a0a; margin: 0;">Factu<span style="background-color: #84cc16; color: white; padding: 2px 8px;">Ya!</span></h1>
        </div>
        <p style="color:#444; line-height:1.7;">Hola <strong>{greeting}</strong>,</p>
        {paragraphs}
        {banner_html}
        <div style="text-align: center; margin: 26px 0;">
            <a href="{APP_URL}/subscription"
               style="background-color: #f97316; color: white; padding: 14px 32px;
                      text-decoration: none; border-radius: 999px; font-weight: bold;
                      display: inline-block; font-size: 16px;">
                🎃 ¡Quiero participar!
            </a>
        </div>
        <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
            FactuYa! &middot; Innova App Solutions &middot; Soporte: soportefactuya@gmail.com
        </p>
    </body>
    </html>
    """


async def _run_email_broadcast(broadcast_id: str, subject: str, body: str, include_banner: bool, recipients: list):
    import resend
    from utils.email_notifications import SENDER_EMAIL
    resend.api_key = os.environ.get("RESEND_API_KEY")
    for r in recipients:
        try:
            html = _broadcast_email_html(r.get("name"), body, include_banner)
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [r["email"]],
                "subject": subject,
                "html": html,
            })
            await db.email_broadcasts.update_one({"id": broadcast_id}, {"$inc": {"sent": 1}})
        except Exception:
            await db.email_broadcasts.update_one({"id": broadcast_id}, {"$inc": {"failed": 1}})
        await asyncio.sleep(0.6)
    await db.email_broadcasts.update_one({"id": broadcast_id}, {"$set": {"status": "done"}})


@router.post("/email-broadcast")
async def email_broadcast(payload: EmailBroadcastIn, background_tasks: BackgroundTasks, user_id: str = Depends(verify_admin)):
    """Envía un correo a todos los usuarios registrados (en segundo plano)."""
    if not os.environ.get("RESEND_API_KEY"):
        raise HTTPException(status_code=400, detail="RESEND_API_KEY no configurada")
    users = await db.users.find({}, {"_id": 0, "email": 1, "name": 1}).to_list(5000)
    recipients = [u for u in users if u.get("email")]
    broadcast_id = str(uuid4())
    await db.email_broadcasts.insert_one({
        "id": broadcast_id,
        "subject": payload.subject,
        "total": len(recipients),
        "sent": 0,
        "failed": 0,
        "status": "sending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    background_tasks.add_task(_run_email_broadcast, broadcast_id, payload.subject, payload.body, payload.include_raffle_banner, recipients)
    return {"ok": True, "broadcastId": broadcast_id, "total": len(recipients)}


@router.get("/email-broadcast/{broadcast_id}")
async def email_broadcast_status(broadcast_id: str, user_id: str = Depends(verify_admin)):
    doc = await db.email_broadcasts.find_one({"id": broadcast_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Broadcast no encontrado")
    return doc

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
