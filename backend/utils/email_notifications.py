"""Email helper: send subscription confirmation emails via Resend.

Used by the PayPal, Wompi and Stripe activation paths. Fire-and-forget:
errors are logged but never block the subscription activation itself.
"""
import os
import logging
import asyncio
from datetime import datetime
from pathlib import Path

import resend
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
APP_URL = os.environ.get('APP_PUBLIC_URL', 'https://factuya.app')


def _format_date_es(dt: datetime) -> str:
    months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ]
    return f"{dt.day} de {months[dt.month - 1]} de {dt.year}"


def _confirmation_html(user_name: str, gateway: str, period_end: datetime, amount_label: str) -> str:
    name = user_name or 'Usuario'
    next_date = _format_date_es(period_end)
    gateway_label = {
        'paypal': 'PayPal',
        'wompi': 'Wompi',
        'stripe': 'Stripe',
    }.get(gateway, gateway.capitalize())
    auto_renew_note = (
        "Tu suscripción se renovará <strong>automáticamente</strong> cada mes mientras esté activa."
        if gateway == 'paypal' else
        "Te enviaremos un recordatorio por email 3 días antes de tu próximo vencimiento."
    )
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#f9fafb;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0a0a0a; margin: 0;">Factu<span style="background-color: #84cc16; color: white; padding: 2px 8px;">Ya!</span></h1>
        </div>

        <div style="background-color: #ecfccb; border-left: 4px solid #84cc16; padding: 24px 28px; margin-bottom: 24px; border-radius: 6px;">
            <h2 style="color: #365314; margin: 0 0 8px;">¡Bienvenido a Premium! 🎉</h2>
            <p style="color: #3f6212; line-height: 1.6; margin: 0;">
                Tu suscripción está activa y ya tienes acceso a facturas ilimitadas.
            </p>
        </div>

        <p style="color: #444; line-height: 1.7;">
            Hola <strong>{name}</strong>,
        </p>
        <p style="color: #444; line-height: 1.7;">
            Gracias por confiar en FactuYa! Confirmamos que tu pago se procesó correctamente.
        </p>

        <table style="width:100%; border-collapse:collapse; background:white; border-radius:8px; overflow:hidden; margin: 20px 0;">
            <tr><td style="padding:12px 16px; border-bottom:1px solid #eee; color:#666;">Plan</td>
                <td style="padding:12px 16px; border-bottom:1px solid #eee; text-align:right;"><strong>Premium Mensual</strong></td></tr>
            <tr><td style="padding:12px 16px; border-bottom:1px solid #eee; color:#666;">Monto</td>
                <td style="padding:12px 16px; border-bottom:1px solid #eee; text-align:right;"><strong>{amount_label}</strong></td></tr>
            <tr><td style="padding:12px 16px; border-bottom:1px solid #eee; color:#666;">Método de pago</td>
                <td style="padding:12px 16px; border-bottom:1px solid #eee; text-align:right;"><strong>{gateway_label}</strong></td></tr>
            <tr><td style="padding:12px 16px; color:#666;">Próxima renovación</td>
                <td style="padding:12px 16px; text-align:right;"><strong>{next_date}</strong></td></tr>
        </table>

        <p style="color: #444; line-height: 1.7;">
            {auto_renew_note}
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{APP_URL}/dashboard"
               style="background-color: #84cc16; color: white; padding: 14px 32px;
                      text-decoration: none; border-radius: 6px; font-weight: bold;
                      display: inline-block; font-size: 16px;">
                Ir al Panel
            </a>
        </div>

        <p style="color: #888; font-size: 14px; line-height: 1.6;">
            Puedes administrar o cancelar tu suscripción en cualquier momento desde
            <a href="{APP_URL}/subscription" style="color:#84cc16;">Mi Suscripción</a>.
        </p>

        <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
            FactuYa! &middot; Innova App Solutions &middot; Soporte: contacto@factuya.app
        </p>
    </body>
    </html>
    """


async def send_subscription_confirmation(
    user_email: str,
    user_name: str,
    gateway: str,
    period_end: datetime,
    amount_label: str = "$3.99 USD",
) -> bool:
    """Send a subscription confirmation email. Never raises."""
    if not user_email:
        return False
    if not os.environ.get('RESEND_API_KEY'):
        logger.warning("RESEND_API_KEY not set; skipping confirmation email")
        return False
    try:
        html = _confirmation_html(user_name, gateway, period_end, amount_label)
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user_email],
            "subject": "¡Bienvenido a FactuYa! Premium 🎉",
            "html": html,
        })
        return True
    except Exception as e:
        logger.error("Failed to send subscription confirmation to %s: %s", user_email, e)
        return False
