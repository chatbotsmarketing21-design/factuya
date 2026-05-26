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
    """Update user's company logo (logo activo) y lo añade a la galería."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company_info = user.get("companyInfo") or {}
    logos = list(company_info.get("logos") or [])
    
    # Auto-añadir a la galería si no está ya guardado (respetando el límite)
    if logo_data.logo and logo_data.logo not in logos and len(logos) < 10:
        logos.append(logo_data.logo)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "companyInfo.logo": logo_data.logo,
            "companyInfo.logos": logos,
        }}
    )
    
    return {"message": "Logo guardado correctamente", "logos": logos}

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


# ===== Galería de logos (hasta 10) =====

MAX_LOGOS = 10

class LogoGalleryItem(BaseModel):
    logo: str  # Base64 encoded logo

@router.get("/logos")
async def get_company_logos(user_id: str = Depends(get_current_user_id)):
    """Devuelve la lista de logos guardados por el usuario."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "companyInfo.logos": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logos = (user.get("companyInfo") or {}).get("logos") or []
    return {"logos": logos, "max": MAX_LOGOS}

@router.post("/logos")
async def add_logo_to_gallery(
    item: LogoGalleryItem,
    user_id: str = Depends(get_current_user_id),
):
    """Agrega un nuevo logo a la galería (límite 10)."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "companyInfo": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    company_info = user.get("companyInfo") or {}
    logos = list(company_info.get("logos") or [])

    if len(logos) >= MAX_LOGOS:
        raise HTTPException(
            status_code=400,
            detail=f"Has alcanzado el límite de {MAX_LOGOS} logos. Elimina uno antes de agregar otro.",
        )

    # Evitar duplicados exactos
    if item.logo not in logos:
        logos.append(item.logo)

    await db.users.update_one(
        {"id": user_id},
        {"$set": {"companyInfo.logos": logos}},
    )
    return {"logos": logos, "max": MAX_LOGOS}

@router.delete("/logos/{index}")
async def delete_logo_from_gallery(
    index: int,
    user_id: str = Depends(get_current_user_id),
):
    """Elimina un logo de la galería por su índice."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "companyInfo": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    company_info = user.get("companyInfo") or {}
    logos = list(company_info.get("logos") or [])

    if index < 0 or index >= len(logos):
        raise HTTPException(status_code=404, detail="Logo no encontrado")

    removed = logos.pop(index)

    update = {"companyInfo.logos": logos}
    # Si el logo borrado era el activo, también lo limpiamos
    if company_info.get("logo") == removed:
        update["companyInfo.logo"] = None

    await db.users.update_one({"id": user_id}, {"$set": update})
    return {"logos": logos, "max": MAX_LOGOS}

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
    color: Optional[str] = None  # Color hex de la plantilla

@router.put("/invoice-defaults")
async def update_invoice_defaults(
    defaults: InvoiceDefaultsUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update default notes, terms, template and color for invoices"""
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
    if defaults.color is not None:
        update_data["companyInfo.defaultColor"] = defaults.color
    
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
        # Merge with existing companyInfo so we don't accidentally erase fields
        # (signature, logo, defaultNotes, etc.) that aren't sent by the client.
        existing = user.get("companyInfo") or {}
        incoming = profile.companyInfo.dict(exclude_unset=True)
        merged = {**existing, **incoming}
        update_data["companyInfo"] = merged
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return {"message": "Perfil actualizado correctamente"}