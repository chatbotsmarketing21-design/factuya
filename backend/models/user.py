from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
import uuid

class CompanyInfo(BaseModel):
    name: Optional[str] = None
    nit: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    logo: Optional[str] = None  # Base64 encoded logo
    bank: Optional[str] = None  # Bank name
    bankAccount: Optional[str] = None  # Bank account number
    defaultNotes: Optional[str] = None  # Default notes for invoices
    defaultTerms: Optional[str] = None  # Default terms for invoices
    defaultTemplate: Optional[int] = None  # Default template ID for invoices
    signature: Optional[str] = None  # Base64 encoded signature
    signatureRotation: Optional[int] = 0  # Signature rotation in degrees

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    companyName: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password: str  # Hashed
    name: str
    gender: Optional[str] = None  # "male" or "female"
    companyInfo: CompanyInfo = Field(default_factory=CompanyInfo)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    gender: Optional[str] = None
    companyInfo: Optional[CompanyInfo] = None

class AuthResponse(BaseModel):
    token: str
    user: UserResponse