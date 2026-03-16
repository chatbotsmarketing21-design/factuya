from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class Address(BaseModel):
    name: str
    nit: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    bank: Optional[str] = None
    bankAccount: Optional[str] = None

class InvoiceItem(BaseModel):
    description: str
    quantity: float
    rate: float
    amount: float

# Modelo para registrar abonos/pagos parciales
class PaymentRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    date: str
    note: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class InvoiceBase(BaseModel):
    number: str
    date: str
    dueDate: str
    status: str = "pending"  # pending, partial, paid, overdue
    documentType: str = "invoice"  # invoice, proforma, quotation, bill, receipt
    fromAddress: Address = Field(alias="from")
    toAddress: Address = Field(alias="to")
    items: List[InvoiceItem]
    subtotal: float
    taxRate: float
    taxName: Optional[str] = None
    tax: float
    total: float
    hasTax: bool = False
    logo: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    template: int = 1
    templateColor: Optional[str] = None  # Color hex code for the template
    signature: Optional[str] = None
    signatureRotation: Optional[int] = 0
    # Campos para abonos
    payments: Optional[List[PaymentRecord]] = []
    totalPaid: Optional[float] = 0
    balance: Optional[float] = None  # Lo que falta por pagar

    class Config:
        populate_by_name = True

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(InvoiceBase):
    pass

class InvoiceInDB(InvoiceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class InvoiceListItem(BaseModel):
    id: str
    number: str
    clientName: str
    date: str
    dueDate: str
    total: float
    status: str
    createdAt: datetime
    # Campos para abonos
    totalPaid: Optional[float] = 0
    balance: Optional[float] = None
    documentType: Optional[str] = "invoice"

class InvoiceStats(BaseModel):
    totalRevenue: float
    totalInvoices: int
    paidInvoices: int
    pendingInvoices: int
    draftInvoices: int
    overdueInvoices: int

class EmailInvoiceRequest(BaseModel):
    to: str
    subject: str
    message: str

# Request para agregar un abono
class AddPaymentRequest(BaseModel):
    amount: float
    date: Optional[str] = None
    note: Optional[str] = None