from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class SubscriptionPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    currency: str = "usd"
    interval: str = "month"  # month, year
    features: list[str] = []

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    planId: str
    stripeSubscriptionId: Optional[str] = None
    stripeCustomerId: Optional[str] = None
    status: str = "trialing"  # trialing, active, canceled, past_due
    currentPeriodStart: datetime = Field(default_factory=datetime.utcnow)
    currentPeriodEnd: datetime
    cancelAtPeriodEnd: bool = False
    trialInvoicesUsed: int = 0
    maxTrialInvoices: int = 3
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class CreateCheckoutSession(BaseModel):
    priceId: str
    successUrl: str
    cancelUrl: str

class SubscriptionStatus(BaseModel):
    hasActiveSubscription: bool
    status: str
    invoicesUsed: int
    maxInvoices: Optional[int] = None
    canCreateInvoice: bool
    message: str