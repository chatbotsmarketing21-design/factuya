from fastapi import APIRouter, HTTPException, Depends
from models.user import CompanyInfo
from utils.auth import get_current_user_id
from pydantic import BaseModel
from typing import Optional
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/profile", tags=["Profile"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

class ProfileUpdate(BaseModel):
    name: str
    email: str
    gender: Optional[str] = None  # "male" or "female"
    companyInfo: Optional[CompanyInfo] = None

class LogoUpdate(BaseModel):
    logo: str  # Base64 encoded logo

class SignatureUpdate(BaseModel):
    signature: str  # Base64 encoded signature
    signatureRotation: Optional[int] = 0  # Rotation in degrees

@router.get("/company", response_model=CompanyInfo)
async def get_company_info(user_id: str = Depends(get_current_user_id)):
    """Get user's company information"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return CompanyInfo(**user.get("companyInfo", {}))

@router.put("/company", response_model=CompanyInfo)
async def update_company_info(
    company_info: CompanyInfo,
    user_id: str = Depends(get_current_user_id)
):
    """Update user's company information"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update company info
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"companyInfo": company_info.dict()}}
    )
    
    return company_info

@router.put("/logo")
async def update_company_logo(
    logo_data: LogoUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update user's company logo"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update logo in company info
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"companyInfo.logo": logo_data.logo}}
    )
    
    return {"message": "Logo guardado correctamente"}

@router.delete("/logo")
async def delete_company_logo(user_id: str = Depends(get_current_user_id)):
    """Delete user's company logo"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove logo from company info
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"companyInfo.logo": None}}
    )
    
    return {"message": "Logo eliminado correctamente"}

@router.put("/signature")
async def update_company_signature(
    signature_data: SignatureUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update user's signature for invoices"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update signature in company info
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "companyInfo.signature": signature_data.signature,
            "companyInfo.signatureRotation": signature_data.signatureRotation
        }}
    )
    
    return {"message": "Firma guardada correctamente"}

@router.delete("/signature")
async def delete_company_signature(user_id: str = Depends(get_current_user_id)):
    """Delete user's signature"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove signature from company info
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "companyInfo.signature": None,
            "companyInfo.signatureRotation": 0
        }}
    )
    
    return {"message": "Firma eliminada correctamente"}


class InvoiceDefaultsUpdate(BaseModel):
    notes: Optional[str] = None
    terms: Optional[str] = None
    template: Optional[int] = None

@router.put("/invoice-defaults")
async def update_invoice_defaults(
    defaults: InvoiceDefaultsUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update default notes, terms and template for invoices"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if defaults.notes is not None:
        update_data["companyInfo.defaultNotes"] = defaults.notes
    if defaults.terms is not None:
        update_data["companyInfo.defaultTerms"] = defaults.terms
    if defaults.template is not None:
        update_data["companyInfo.defaultTemplate"] = defaults.template
    
    if update_data:
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
    
    return {"message": "Valores por defecto guardados"}


@router.put("")
async def update_profile(
    profile: ProfileUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update user profile (name and company info)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data
    update_data = {"name": profile.name}
    
    if profile.gender:
        update_data["gender"] = profile.gender
    
    if profile.companyInfo:
        update_data["companyInfo"] = profile.companyInfo.dict()
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return {"message": "Perfil actualizado correctamente"}