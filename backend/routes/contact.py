from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import os
import resend
import asyncio
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/contact", tags=["Contact"])

# Configure Resend
resend.api_key = os.environ.get('RESEND_API_KEY')
SUPPORT_EMAIL = "soportefactuya@gmail.com"
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    message: str

@router.post("/send")
async def send_contact_message(form: ContactForm):
    """Send a contact/support message"""
    try:
        # Email to support team
        params = {
            "from": SENDER_EMAIL,
            "to": [SUPPORT_EMAIL],
            "subject": f"Soporte FactuYa! - Mensaje de {form.name}",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #84cc16; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">FactuYa!</h1>
                    </div>
                    <div style="padding: 30px; background: #f9f9f9;">
                        <h2 style="color: #333;">Nuevo mensaje de soporte</h2>
                        <p><strong>Nombre:</strong> {form.name}</p>
                        <p><strong>Email:</strong> {form.email}</p>
                        <hr style="border: 1px solid #ddd; margin: 20px 0;">
                        <p><strong>Mensaje:</strong></p>
                        <p style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #84cc16;">
                            {form.message}
                        </p>
                    </div>
                    <div style="padding: 15px; text-align: center; color: #666; font-size: 12px;">
                        Este mensaje fue enviado desde el formulario de soporte de FactuYa!
                    </div>
                </div>
            """
        }
        
        await asyncio.to_thread(resend.Emails.send, params)
        
        return {"success": True, "message": "Mensaje enviado correctamente"}
        
    except Exception as e:
        print(f"Error sending contact email: {e}")
        raise HTTPException(status_code=500, detail="Error al enviar el mensaje")
