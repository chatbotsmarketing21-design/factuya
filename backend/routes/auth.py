from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user import UserCreate, UserLogin, UserInDB, UserResponse, AuthResponse
from utils.auth import hash_password, verify_password, create_access_token, get_current_user_id
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

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
        gender=user.get("gender"),
        companyInfo=user.get("companyInfo")
    )

from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, user_id: str = Depends(get_current_user_id)):
    """Change user password"""
    # Find user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verify current password
    if not verify_password(request.currentPassword, user["password"]):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    
    # Validate new password
    if len(request.newPassword) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
    
    # Update password
    new_hashed_password = hash_password(request.newPassword)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": new_hashed_password}}
    )
    
    return {"message": "Contraseña actualizada correctamente"}


class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str  # User must type "ELIMINAR" or "DELETE" to confirm


@router.delete("/account")
async def delete_account(
    request: DeleteAccountRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Permanently delete the user account and ALL associated data.

    Required by Google Play Store policy (since 2023) for any app with user accounts.
    Reference: https://support.google.com/googleplay/android-developer/answer/13327111

    This endpoint:
    - Verifies the user's password (extra security)
    - Requires a confirmation string ("ELIMINAR" or "DELETE")
    - Deletes the user record + all related documents (invoices, subscriptions, etc.)
    - Cancels any active PayPal subscriptions (best-effort)
    """
    # Validate confirmation phrase
    if request.confirmation.strip().upper() not in {"ELIMINAR", "DELETE"}:
        raise HTTPException(
            status_code=400,
            detail='Debes escribir "ELIMINAR" (o "DELETE") para confirmar.'
        )

    # Find user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Verify password (skip for Google OAuth users with no password)
    has_password = bool(user.get("password"))
    if has_password and not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")

    user_email = user.get("email")
    user_name = user.get("name")

    # Win-back: If user had Premium, issue a 50% off reactivation coupon and email it
    # BEFORE deleting their data. (User choice 5b: only premium users receive coupon.)
    farewell_coupon = None
    try:
        from utils.reactivation import (
            user_had_premium,
            create_reactivation_coupon,
            send_farewell_email,
        )
        if await user_had_premium(db, user_id):
            farewell_coupon = await create_reactivation_coupon(
                db, user_id=user_id, user_email=user_email, user_name=user_name
            )
            # Fire-and-forget email; we don't block deletion if email fails
            try:
                await send_farewell_email(
                    user_email=user_email,
                    user_name=user_name,
                    coupon_code=farewell_coupon["code"],
                    expires_at=farewell_coupon["expires_at"],
                )
            except Exception:
                pass
    except Exception as e:
        # Never block deletion because of win-back failure
        import logging
        logging.getLogger(__name__).warning("Win-back coupon flow failed: %s", e)

    # Best-effort: cancel active PayPal subscriptions before wiping data
    try:
        from routes.paypal import paypal_request  # type: ignore
        active_subs = db.paypal_subscriptions.find({
            "user_id": user_id,
            "status": {"$in": ["ACTIVE", "APPROVAL_PENDING", "APPROVED"]}
        })
        async for sub in active_subs:
            sub_id = sub.get("subscription_id") or sub.get("id")
            if sub_id:
                try:
                    await paypal_request(
                        "POST",
                        f"/v1/billing/subscriptions/{sub_id}/cancel",
                        {"reason": "Account deleted by user"}
                    )
                except Exception:
                    pass  # Non-blocking
    except Exception:
        pass  # PayPal cancel is best-effort; do not block deletion

    # Delete all user-owned documents across the database.
    # Collections that reference the user via user_id or email.
    collections_by_user_id = [
        "invoices",
        "paypal_subscriptions",
        "wompi_subscriptions",
        "wompi_payments",
        "subscriptions",
        "password_resets",
        "renewal_notifications",
        "company_logos",
    ]
    for coll in collections_by_user_id:
        try:
            await db[coll].delete_many({"user_id": user_id})
        except Exception:
            pass  # Collection may not exist yet

    # Also clean up by email where applicable (password resets, contact logs)
    if user_email:
        for coll in ["password_resets", "contact_messages"]:
            try:
                await db[coll].delete_many({"email": user_email})
            except Exception:
                pass

    # Finally, delete the user record itself
    await db.users.delete_one({"id": user_id})

    response = {
        "message": "Tu cuenta y todos tus datos han sido eliminados permanentemente.",
        "deleted_user_id": user_id,
    }
    if farewell_coupon:
        response["winback"] = {
            "sent": True,
            "coupon_code": farewell_coupon["code"],
            "discount_percent": farewell_coupon["discount_percent"],
        }
    return response