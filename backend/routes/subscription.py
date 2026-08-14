from fastapi import APIRouter, HTTPException, Depends, Request
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel
from typing import Optional
from utils.auth import get_current_user_id
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionRequest
)

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/subscription", tags=["Subscription"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')
SUBSCRIPTION_PRICE = 3.99  # $3.99/mes - Precio fijo definido en backend

# Pydantic models
class SubscriptionStatus(BaseModel):
    hasActiveSubscription: bool
    status: str
    invoicesUsed: int
    maxInvoices: Optional[int] = None
    canCreateInvoice: bool
    message: str
    currentPeriodStart: Optional[str] = None
    currentPeriodEnd: Optional[str] = None
    daysRemaining: Optional[int] = None

class CreateCheckoutRequest(BaseModel):
    originUrl: str  # Frontend envia solo el origin URL

@router.get("/status", response_model=SubscriptionStatus)
async def get_subscription_status(user_id: str = Depends(get_current_user_id)):
    """Get user's subscription status"""
    # La cuenta ADMIN siempre es Premium (se auto-repara si no lo está)
    ADMIN_EMAIL = "soportefactuya@gmail.com"
    admin_user = await db.users.find_one({"id": user_id})
    if admin_user and admin_user.get("email", "").lower() == ADMIN_EMAIL:
        existing = await db.subscriptions.find_one({"userId": user_id})
        if not existing or existing.get("status") != "active":
            now = datetime.now(timezone.utc)
            await db.subscriptions.update_one(
                {"userId": user_id},
                {"$set": {
                    "userId": user_id,
                    "status": "active",
                    "planId": "premium_gift",
                    "currentPeriodStart": now,
                    "currentPeriodEnd": now + timedelta(days=36500),
                    "autoRenewEnabled": False,
                    "giftedBy": "system:admin_auto",
                    "updatedAt": now,
                }},
                upsert=True,
            )

    # Get user's subscription
    subscription = await db.subscriptions.find_one({"userId": user_id})
    
    if not subscription:
        # Create trial subscription for new user
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
    invoices_used = subscription.get("trialInvoicesUsed", 0)
    max_trial = subscription.get("maxTrialInvoices", 10)
    
    # Get subscription dates
    current_period_start = subscription.get("currentPeriodStart")
    current_period_end = subscription.get("currentPeriodEnd")
    created_at = subscription.get("createdAt")

    # AUTO-EXPIRE: if subscription is "active" but its period has already ended,
    # mark it as "expired" both in this response and persistently in the DB.
    # This is the source of truth that the frontend SubscriptionGate relies on.
    if status == "active" and isinstance(current_period_end, datetime):
        end_aware = (
            current_period_end.replace(tzinfo=timezone.utc)
            if current_period_end.tzinfo is None else current_period_end
        )
        if end_aware < datetime.now(timezone.utc):
            status = "expired"
            await db.subscriptions.update_one(
                {"userId": user_id},
                {"$set": {"status": "expired", "updatedAt": datetime.now(timezone.utc)}},
            )
    
    # Calculate days remaining
    days_remaining = None
    if current_period_end:
        now = datetime.now(timezone.utc)
        if isinstance(current_period_end, datetime):
            # Ensure both datetimes are timezone-aware
            if current_period_end.tzinfo is None:
                current_period_end = current_period_end.replace(tzinfo=timezone.utc)
            delta = current_period_end - now
            days_remaining = max(0, delta.days)
    
    # Format dates for response
    period_start_str = None
    period_end_str = None
    
    if status == "active" or status == "expired":
        if current_period_start and isinstance(current_period_start, datetime):
            period_start_str = current_period_start.strftime("%Y-%m-%d")
        if current_period_end and isinstance(current_period_end, datetime):
            period_end_str = current_period_end.strftime("%Y-%m-%d")
    elif created_at and isinstance(created_at, datetime):
        # For trial users, show creation date
        period_start_str = created_at.strftime("%Y-%m-%d")
    
    # Check if user can create invoices
    can_create = False
    message = ""
    max_invoices = None
    
    if status == "active":
        can_create = True
        message = "Suscripción activa - Facturas ilimitadas"
    elif status == "trialing":
        if invoices_used < max_trial:
            can_create = True
            remaining = max_trial - invoices_used
            message = f"Período de prueba: {remaining} facturas restantes"
            max_invoices = max_trial
        else:
            can_create = False
            message = "Has alcanzado el límite de facturas gratuitas. Suscríbete para continuar."
            max_invoices = max_trial
    else:
        can_create = False
        message = "Suscripción inactiva. Por favor renueva tu suscripción."
    
    return SubscriptionStatus(
        hasActiveSubscription=(status == "active"),
        status=status,
        invoicesUsed=invoices_used,
        maxInvoices=max_invoices,
        canCreateInvoice=can_create,
        message=message,
        currentPeriodStart=period_start_str,
        currentPeriodEnd=period_end_str,
        daysRemaining=days_remaining
    )

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: Request,
    checkout_data: CreateCheckoutRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Create Stripe checkout session for subscription"""
    try:
        # Get user info
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Build URLs from frontend origin (NUNCA hardcodear)
        origin_url = checkout_data.originUrl
        success_url = f"{origin_url}/dashboard?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/dashboard?payment=canceled"
        
        # Initialize Stripe with emergentintegrations
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/subscription/webhook"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session with FIXED amount (backend controlled)
        checkout_request = CheckoutSessionRequest(
            amount=SUBSCRIPTION_PRICE,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "user_email": user.get("email", ""),
                "plan": "premium_monthly",
                "type": "subscription"
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record (MANDATORY per playbook)
        transaction = {
            "userId": user_id,
            "sessionId": session.session_id,
            "amount": SUBSCRIPTION_PRICE,
            "currency": "usd",
            "status": "pending",
            "paymentStatus": "initiated",
            "metadata": {
                "user_email": user.get("email", ""),
                "plan": "premium_monthly"
            },
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "sessionId": session.session_id,
            "url": session.url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/checkout-status/{session_id}")
async def get_checkout_status(
    request: Request,
    session_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get checkout session status and update subscription if paid"""
    try:
        # Initialize Stripe
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/subscription/webhook"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Get checkout status
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        # Find transaction
        transaction = await db.payment_transactions.find_one({"sessionId": session_id})
        
        # Update transaction status
        if transaction:
            await db.payment_transactions.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "status": status_response.status,
                        "paymentStatus": status_response.payment_status,
                        "updatedAt": datetime.now(timezone.utc)
                    }
                }
            )
        
        # If payment is successful, activate subscription (only once)
        if status_response.payment_status == "paid":
            # Check if already processed
            existing_subscription = await db.subscriptions.find_one({
                "userId": user_id,
                "status": "active"
            })
            
            if not existing_subscription:
                # Activate subscription with calendar-month renewal
                period_start = datetime.now(timezone.utc)
                period_end = period_start + relativedelta(months=1)
                await db.subscriptions.update_one(
                    {"userId": user_id},
                    {
                        "$set": {
                            "status": "active",
                            "planId": "premium_monthly",
                            "stripeSessionId": session_id,
                            "currentPeriodStart": period_start,
                            "currentPeriodEnd": period_end,
                            "updatedAt": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )

                # Fire-and-forget welcome email
                user = await db.users.find_one({"id": user_id})
                if user and user.get("email"):
                    try:
                        from utils.email_notifications import send_subscription_confirmation
                        await send_subscription_confirmation(
                            user_email=user["email"],
                            user_name=user.get("name", ""),
                            gateway="stripe",
                            period_end=period_end,
                            amount_label="$3.99 USD",
                        )
                    except Exception as e:
                        print(f"Stripe confirmation email failed: {e}")
        
        return {
            "status": status_response.status,
            "paymentStatus": status_response.payment_status,
            "amountTotal": status_response.amount_total,
            "currency": status_response.currency
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature", "")
        
        # Initialize Stripe
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/subscription/webhook"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(payload, sig_header)
        
        # Process based on event type
        if webhook_response.event_type == "checkout.session.completed":
            user_id = webhook_response.metadata.get("user_id")
            session_id = webhook_response.session_id
            
            if user_id and webhook_response.payment_status == "paid":
                # Update subscription with calendar-month renewal
                period_start = datetime.now(timezone.utc)
                period_end = period_start + relativedelta(months=1)
                await db.subscriptions.update_one(
                    {"userId": user_id},
                    {
                        "$set": {
                            "status": "active",
                            "planId": "premium_monthly",
                            "stripeSessionId": session_id,
                            "currentPeriodStart": period_start,
                            "currentPeriodEnd": period_end,
                            "updatedAt": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {"sessionId": session_id},
                    {
                        "$set": {
                            "status": "complete",
                            "paymentStatus": "paid",
                            "updatedAt": datetime.now(timezone.utc)
                        }
                    }
                )
        
        return {"status": "success"}
    except Exception as e:
        # Log but don't fail - webhooks should return 200
        print(f"Webhook error: {e}")
        return {"status": "received"}

@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(get_current_user_id)):
    """Cancel user's subscription"""
    subscription = await db.subscriptions.find_one({"userId": user_id})
    
    if not subscription or subscription.get("status") != "active":
        raise HTTPException(status_code=404, detail="No se encontró una suscripción activa")
    
    # If the subscription is from PayPal, cancel it upstream too so PayPal
    # stops issuing the next recurring charge. Wompi & Stripe stay manual.
    if subscription.get("gateway") == "paypal" and subscription.get("paypalSubscriptionId"):
        try:
            from routes.paypal import paypal_request
            await paypal_request(
                "POST",
                f"/v1/billing/subscriptions/{subscription['paypalSubscriptionId']}/cancel",
                {"reason": "User requested cancellation from FactuYa!"},
            )
        except Exception as e:
            # Log but don't block local cancellation
            print(f"PayPal cancel error (continuing): {e}")
    
    # Update in database - mark as canceled at period end
    await db.subscriptions.update_one(
        {"userId": user_id},
        {
            "$set": {
                "cancelAtPeriodEnd": True,
                "updatedAt": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "La suscripción se cancelará al final del período actual"}
