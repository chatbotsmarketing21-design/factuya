from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import httpx
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/auth/google", tags=["Google Auth"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

class SessionRequest(BaseModel):
    session_id: str

@router.post("/session")
async def process_google_session(request: SessionRequest, response: Response):
    """
    Process Google OAuth session_id and create user session
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    try:
        # Call Emergent Auth to get session data
        async with httpx.AsyncClient() as client_http:
            auth_response = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = auth_response.json()
        
        email = session_data.get("email")
        name = session_data.get("name")
        picture = session_data.get("picture")
        google_session_token = session_data.get("session_token")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user.get("id")
            # Update user info if needed
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "name": name or existing_user.get("name"),
                    "picture": picture,
                    "updatedAt": datetime.now(timezone.utc)
                }}
            )
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": email,
                "name": name or email.split("@")[0],
                "password": None,  # Google users don't have password
                "picture": picture,
                "gender": None,
                "companyInfo": {},
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_user)
            
            # Create trial subscription for new user
            subscription = {
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "status": "trialing",
                "trialInvoicesUsed": 0,
                "createdAt": datetime.now(timezone.utc)
            }
            await db.subscriptions.insert_one(subscription)
        
        # Create session
        session_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        await db.user_sessions.insert_one(session_doc)
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60  # 7 days
        )
        
        # Get user data to return
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        
        return {
            "success": True,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "gender": user.get("gender"),
                "picture": user.get("picture"),
                "companyInfo": user.get("companyInfo")
            },
            "token": session_token  # Also return token for localStorage compatibility
        }
        
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify session: {str(e)}")

@router.post("/logout")
async def google_logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        # Delete session from database
        await db.user_sessions.delete_one({"session_token": session_token})
    
    # Clear cookie
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"success": True, "message": "Logged out successfully"}
