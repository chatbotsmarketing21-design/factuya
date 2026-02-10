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
    companyInfo: Optional[CompanyInfo] = None

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
    
    if profile.companyInfo:
        update_data["companyInfo"] = profile.companyInfo.dict()
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return {"message": "Perfil actualizado correctamente"}