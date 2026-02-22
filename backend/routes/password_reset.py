from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import secrets
import asyncio
import resend
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/password-reset", tags=["Password Reset"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

class RequestResetRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str

@router.post("/request")
async def request_password_reset(request: RequestResetRequest):
    """Request a password reset email"""
    # Find user
    user = await db.users.find_one({"email": request.email})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Si el email existe, recibirás un enlace de recuperación"}
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Save token to database
    await db.password_resets.delete_many({"email": request.email})  # Remove old tokens
    await db.password_resets.insert_one({
        "email": request.email,
        "token": token,
        "expiresAt": expires_at,
        "createdAt": datetime.now(timezone.utc),
        "used": False
    })
    
    # Build reset URL (frontend URL)
    frontend_url = os.environ.get('FRONTEND_URL', 'https://factuya-dev-1.preview.emergentagent.com')
    reset_url = f"{frontend_url}/reset-password?token={token}"
    
    # Send email
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">
                <span style="color: #333;">Factu</span><span style="background-color: #84cc16; color: white; padding: 2px 8px;">Ya!</span>
            </h1>
        </div>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Recuperar Contraseña</h2>
            <p style="color: #666; line-height: 1.6;">
                Hola <strong>{user.get('name', 'Usuario')}</strong>,
            </p>
            <p style="color: #666; line-height: 1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en FactuYa!
            </p>
            <p style="color: #666; line-height: 1.6;">
                Haz clic en el siguiente botón para crear una nueva contraseña:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" 
                   style="background-color: #84cc16; color: white; padding: 14px 30px; 
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Restablecer Contraseña
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.6;">
                Este enlace expirará en <strong>1 hora</strong>.
            </p>
            <p style="color: #999; font-size: 14px; line-height: 1.6;">
                Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña seguirá siendo la misma.
            </p>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px;">
            <p>© 2025 FactuYa! - Tu solución de facturación</p>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #84cc16;">{reset_url}</p>
        </div>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [request.email],
            "subject": "Recuperar Contraseña - FactuYa!",
            "html": html_content
        }
        
        # Send email asynchronously
        await asyncio.to_thread(resend.Emails.send, params)
        
    except Exception as e:
        print(f"Error sending email: {e}")
        # Don't expose email errors to user
    
    return {"message": "Si el email existe, recibirás un enlace de recuperación"}

@router.post("/verify-token")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    reset_request = await db.password_resets.find_one({
        "token": token,
        "used": False,
        "expiresAt": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not reset_request:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    return {"valid": True, "email": reset_request["email"]}

@router.post("/reset")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    from utils.auth import hash_password
    
    # Find valid token
    reset_request = await db.password_resets.find_one({
        "token": request.token,
        "used": False,
        "expiresAt": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not reset_request:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    # Validate password
    if len(request.newPassword) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # Update password
    email = reset_request["email"]
    new_hashed_password = hash_password(request.newPassword)
    
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password": new_hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Contraseña actualizada correctamente"}
