from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import httpx
import uuid
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Setup logging
logger = logging.getLogger(__name__)

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
    logger.info(f"Processing Google session: {request.session_id[:20]}...")
    
    try:
        # Call Emergent Auth to get session data
        async with httpx.AsyncClient() as client_http:
            auth_response = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            logger.info(f"Auth response status: {auth_response.status_code}")
            
            if auth_response.status_code != 200:
                logger.error(f"Invalid session response: {auth_response.text}")
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = auth_response.json()
            logger.info(f"Session data received for email: {session_data.get('email')}")
        
        email = session_data.get("email")
        name = session_data.get("name")
        picture = session_data.get("picture")
        
        if not email:
            logger.error("No email in session data")
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user.get("id")
            logger.info(f"Existing user found: {user_id}")
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
            logger.info(f"Creating new user: {user_id}")
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
            logger.info(f"Created subscription for user: {user_id}")
        
        # Create session token (use JWT format like existing auth)
        from utils.auth import create_access_token
        token = create_access_token({"sub": user_id})
        
        logger.info(f"Created token for user: {user_id}")
        
        # Get user data to return
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        
        result = {
            "success": True,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "gender": user.get("gender"),
                "picture": user.get("picture"),
                "companyInfo": user.get("companyInfo")
            },
            "token": token
        }
        
        logger.info(f"Returning success response for user: {user['email']}")
        return result
        
    except httpx.RequestError as e:
        logger.error(f"HTTP error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to verify session: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")

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
