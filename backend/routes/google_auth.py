from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from datetime import datetime, timezone
import httpx
import uuid
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from urllib.parse import urlencode

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

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class TokenRequest(BaseModel):
    code: str
    redirect_uri: str


@router.get("/login")
async def google_login(request: Request):
    """
    Redirect user to Google OAuth consent screen
    """
    # Get the redirect URI from the frontend
    redirect_uri = request.query_params.get('redirect_uri', 'https://factuya.site/auth/google/callback')
    
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'select_account'
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.post("/token")
async def google_token(request: TokenRequest):
    """
    Exchange authorization code for tokens and create user session
    """
    logger.info(f"Processing Google auth code...")
    
    try:
        # Exchange code for tokens
        async with httpx.AsyncClient() as http_client:
            token_response = await http_client.post(
                GOOGLE_TOKEN_URL,
                data={
                    'client_id': GOOGLE_CLIENT_ID,
                    'client_secret': GOOGLE_CLIENT_SECRET,
                    'code': request.code,
                    'grant_type': 'authorization_code',
                    'redirect_uri': request.redirect_uri
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                raise HTTPException(status_code=401, detail="Failed to exchange code for token")
            
            token_data = token_response.json()
            access_token = token_data.get('access_token')
            
            if not access_token:
                raise HTTPException(status_code=401, detail="No access token received")
            
            # Get user info from Google
            userinfo_response = await http_client.get(
                GOOGLE_USERINFO_URL,
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if userinfo_response.status_code != 200:
                logger.error(f"Failed to get user info: {userinfo_response.text}")
                raise HTTPException(status_code=401, detail="Failed to get user info")
            
            user_info = userinfo_response.json()
            logger.info(f"Got user info for: {user_info.get('email')}")
        
        email = user_info.get("email")
        name = user_info.get("name")
        picture = user_info.get("picture")
        
        if not email:
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
        
        # Create session token
        from utils.auth import create_access_token
        token = create_access_token({"sub": user_id})
        
        logger.info(f"Created token for user: {user_id}")
        
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
            "token": token
        }
        
    except httpx.RequestError as e:
        logger.error(f"HTTP error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Google: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
