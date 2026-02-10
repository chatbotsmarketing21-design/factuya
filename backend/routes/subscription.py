from fastapi import APIRouter, HTTPException, Depends, Request
import stripe
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta
from models.subscription import CreateCheckoutSession, SubscriptionStatus, Subscription
from utils.auth import get_current_user_id

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/subscription", tags=["Subscription"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_dummy_key')
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID', 'price_dummy_id')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

@router.get("/status", response_model=SubscriptionStatus)
async def get_subscription_status(user_id: str = Depends(get_current_user_id)):
    """Get user's subscription status"""
    # Get user's subscription
    subscription = await db.subscriptions.find_one({"userId": user_id})
    
    if not subscription:
        # Create trial subscription for new user
        trial_end = datetime.utcnow() + timedelta(days=999)  # Unlimited trial with 3 invoices
        new_subscription = Subscription(
            userId=user_id,
            planId="trial",
            status="trialing",
            currentPeriodEnd=trial_end,
            trialInvoicesUsed=0,
            maxTrialInvoices=3
        )
        await db.subscriptions.insert_one(new_subscription.dict())
        subscription = new_subscription.dict()
    
    status = subscription.get("status", "trialing")
    invoices_used = subscription.get("trialInvoicesUsed", 0)
    max_trial = subscription.get("maxTrialInvoices", 3)
    
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
        message=message
    )

@router.post("/create-checkout-session")
async def create_checkout_session(
    session_data: CreateCheckoutSession,
    user_id: str = Depends(get_current_user_id)
):
    """Create Stripe checkout session"""
    try:
        # Get user email
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            customer_email=user["email"],
            payment_method_types=["card"],
            line_items=[
                {
                    "price": session_data.priceId,
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url=session_data.successUrl,
            cancel_url=session_data.cancelUrl,
            metadata={
                "user_id": user_id
            }
        )
        
        return {"sessionId": checkout_session.id, "url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"]["user_id"]
        
        # Update user's subscription
        await db.subscriptions.update_one(
            {"userId": user_id},
            {
                "$set": {
                    "status": "active",
                    "stripeSubscriptionId": session.get("subscription"),
                    "stripeCustomerId": session.get("customer"),
                    "currentPeriodStart": datetime.utcnow(),
                    "currentPeriodEnd": datetime.utcnow() + timedelta(days=30),
                    "updatedAt": datetime.utcnow()
                }
            }
        )
    
    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        # Update subscription in database
        await db.subscriptions.update_one(
            {"stripeSubscriptionId": subscription["id"]},
            {
                "$set": {
                    "status": subscription["status"],
                    "updatedAt": datetime.utcnow()
                }
            }
        )
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await db.subscriptions.update_one(
            {"stripeSubscriptionId": subscription["id"]},
            {
                "$set": {
                    "status": "canceled",
                    "updatedAt": datetime.utcnow()
                }
            }
        )
    
    return {"status": "success"}

@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(get_current_user_id)):
    """Cancel user's subscription"""
    subscription = await db.subscriptions.find_one({"userId": user_id})
    
    if not subscription or not subscription.get("stripeSubscriptionId"):
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    try:
        # Cancel at period end in Stripe
        stripe.Subscription.modify(
            subscription["stripeSubscriptionId"],
            cancel_at_period_end=True
        )
        
        # Update in database
        await db.subscriptions.update_one(
            {"userId": user_id},
            {
                "$set": {
                    "cancelAtPeriodEnd": True,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Subscription will be canceled at period end"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))