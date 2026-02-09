from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user import UserCreate, UserLogin, UserInDB, UserResponse, AuthResponse
from utils.auth import hash_password, verify_password, create_access_token, get_current_user_id
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.post("/register", response_model=AuthResponse)
async def register(user: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_dict = user.dict()
    user_dict["password"] = hash_password(user_dict["password"])
    
    # Initialize company info with company name if provided
    company_name = user_dict.pop("companyName", None)
    user_dict["companyInfo"] = {
        "name": company_name or user.name,
        "email": user.email,
        "phone": None,
        "address": None,
        "city": None,
        "state": None,
        "zip": None,
        "country": None
    }
    
    user_in_db = UserInDB(**user_dict)
    await db.users.insert_one(user_in_db.dict())
    
    # Create token
    token = create_access_token({"sub": user_in_db.id})
    
    # Return response
    user_response = UserResponse(
        id=user_in_db.id,
        email=user_in_db.email,
        name=user_in_db.name,
        companyInfo=user_in_db.companyInfo
    )
    
    return AuthResponse(token=token, user=user_response)

@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """Login user"""
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    token = create_access_token({"sub": user["id"]})
    
    # Return response
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        companyInfo=user.get("companyInfo")
    )
    
    return AuthResponse(token=token, user=user_response)

@router.get("/me", response_model=UserResponse)
async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """Get current user info"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        companyInfo=user.get("companyInfo")
    )