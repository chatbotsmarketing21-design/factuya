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
APP_URL = os.environ.get('APP_PUBLIC_URL', 'https://factuya.site')


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
            FactuYa! &middot; Innova App Solutions &middot; Soporte: soportefactuya@gmail.com
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



def _welcome_html(user_name: str | None, coupon_code: str = "LANZAMIENTO50") -> str:
    """Build the HTML for the signup welcome email (first-time user onboarding)."""
    name = (user_name or "").strip() or "Amigo/a"
    subscription_url = f"{APP_URL}/subscription?coupon={coupon_code}"

    return f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:24px 16px;">
    <div style="text-align:center; margin-bottom:24px;">
      <span style="font-size:28px; font-weight:bold; color:#0a0a0a;">Factu</span><span style="background-color:#84cc16; color:white; padding:4px 10px; border-radius:4px; font-size:24px; font-weight:bold;">Ya!</span>
    </div>

    <div style="background:linear-gradient(135deg, #84cc16 0%, #65a30d 100%); border-radius:16px; padding:40px 24px; text-align:center; color:white; margin-bottom:24px;">
      <div style="font-size:56px; margin-bottom:12px;">🎉</div>
      <h1 style="margin:0 0 8px; font-size:28px; font-weight:bold;">¡Bienvenido/a, {name}!</h1>
      <p style="margin:0; font-size:16px; opacity:0.95;">Tu cuenta está lista para usar</p>
    </div>

    <div style="background:white; border-radius:12px; padding:32px 24px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px;">Hola <strong>{name}</strong>, 👋</p>
      <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px;">¡Qué bueno tenerte en <strong>FactuYa!</strong> 🚀</p>
      <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px;">Tu cuenta ya está creada y lista para que empieces a facturar como un PRO desde tu celular o computador.</p>

      <p style="color:#0a0a0a; font-size:18px; font-weight:bold; margin:24px 0 16px;">🎯 Empieza con estos 3 pasos rápidos:</p>

      <div style="background:#f9fafb; border-left:4px solid #84cc16; border-radius:8px; padding:16px; margin-bottom:12px;">
        <div style="margin-bottom:8px;"><span style="font-size:24px; margin-right:10px;">📄</span><strong style="color:#0a0a0a; font-size:16px;">1. Crea tu primera factura</strong></div>
        <p style="color:#6b7280; font-size:14px; margin:0 0 12px 34px;">Solo necesitas 30 segundos para tener una factura profesional lista para enviar.</p>
        <div style="margin-left:34px;"><a href="{APP_URL}/create" style="display:inline-block; background-color:#84cc16; color:white; padding:10px 20px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px;">Crear factura ahora →</a></div>
      </div>

      <div style="background:#f9fafb; border-left:4px solid #84cc16; border-radius:8px; padding:16px; margin-bottom:12px;">
        <div style="margin-bottom:8px;"><span style="font-size:24px; margin-right:10px;">🏢</span><strong style="color:#0a0a0a; font-size:16px;">2. Configura tu empresa</strong></div>
        <p style="color:#6b7280; font-size:14px; margin:0 0 12px 34px;">Sube tu logo, agrega tu NIT/RUT y personaliza los datos fiscales.</p>
        <div style="margin-left:34px;"><a href="{APP_URL}/profile" style="display:inline-block; background-color:white; color:#84cc16; padding:10px 20px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px; border:2px solid #84cc16;">Configurar empresa →</a></div>
      </div>

      <div style="background:#f9fafb; border-left:4px solid #84cc16; border-radius:8px; padding:16px; margin-bottom:24px;">
        <div style="margin-bottom:8px;"><span style="font-size:24px; margin-right:10px;">🎨</span><strong style="color:#0a0a0a; font-size:16px;">3. Elige tu plantilla favorita</strong></div>
        <p style="color:#6b7280; font-size:14px; margin:0 0 12px 34px;">Tenemos +12 diseños profesionales. Encuentra el que más se ajuste a tu negocio.</p>
        <div style="margin-left:34px;"><a href="{APP_URL}/templates" style="display:inline-block; background-color:white; color:#84cc16; padding:10px 20px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px; border:2px solid #84cc16;">Ver plantillas →</a></div>
      </div>
    </div>

    <div style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border:2px dashed #f59e0b; border-radius:12px; padding:24px; margin-bottom:16px; text-align:center;">
      <div style="font-size:13px; color:#92400e; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">🎁 Regalo de bienvenida</div>
      <div style="font-size:24px; color:#0a0a0a; font-weight:bold; margin-bottom:12px;">50% OFF tu primer mes Premium</div>
      <div style="background:white; border:2px solid #84cc16; border-radius:8px; padding:12px 20px; display:inline-block; margin-bottom:12px;">
        <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Tu código:</div>
        <div style="font-family:'Courier New', monospace; font-size:24px; font-weight:bold; color:#0a0a0a; letter-spacing:2px;">{coupon_code}</div>
      </div>
      <div style="color:#78350f; font-size:14px; margin-bottom:16px;">⏰ Válido los próximos 30 días</div>

      <p style="color:#374151; font-size:14px; line-height:1.6; margin:16px 0; text-align:left;"><strong>✨ Con Premium obtienes:</strong></p>
      <ul style="color:#374151; font-size:14px; line-height:1.8; margin:0 0 16px; padding-left:20px; text-align:left;">
        <li>Documentos ilimitados</li>
        <li>12+ plantillas profesionales exclusivas</li>
        <li>Sin marca de agua</li>
        <li>Soporte prioritario por WhatsApp</li>
        <li>Envío automático por email</li>
      </ul>

      <a href="{subscription_url}" style="display:inline-block; background-color:#84cc16; color:white; padding:16px 32px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px; margin-top:8px;">Activar Premium con 50% OFF →</a>
    </div>

    <div style="background:white; border-radius:12px; padding:24px; margin-bottom:16px;">
      <h3 style="margin:0 0 12px; color:#0a0a0a; font-size:16px;">💬 ¿Tienes alguna duda?</h3>
      <p style="color:#374151; font-size:14px; line-height:1.6; margin:0;">Solo responde este email o escríbenos a:<br>📧 <a href="mailto:soportefactuya@gmail.com" style="color:#84cc16; font-weight:bold;">soportefactuya@gmail.com</a></p>
      <p style="color:#6b7280; font-size:13px; margin:12px 0 0;">Estamos aquí para ayudarte a hacer crecer tu negocio 💚</p>
    </div>

    <div style="text-align:center; color:#9ca3af; font-size:12px; padding:16px;">
      <p style="margin:0 0 12px;"><a href="{APP_URL}" style="color:#84cc16; text-decoration:none;">🌐 factuya.site</a></p>
      <p style="margin:0 0 12px;">
        <a href="{APP_URL}/terms" style="color:#9ca3af;">Términos</a> &nbsp;·&nbsp;
        <a href="{APP_URL}/privacy" style="color:#9ca3af;">Privacidad</a> &nbsp;·&nbsp;
        <a href="{APP_URL}/faq" style="color:#9ca3af;">FAQ</a>
      </p>
      <p style="margin:16px 0 4px; color:#d1d5db;">FactuYa! © 2026</p>
      <p style="margin:0; color:#d1d5db;">Hecho con 💚 en Colombia 🇨🇴</p>
      <p style="margin:16px 0 0; color:#d1d5db; font-size:11px;">PD: Si no abriste esta cuenta, escríbenos y la eliminaremos.</p>
    </div>
  </div>
</body>
</html>
"""


async def send_signup_welcome_email(user_email: str, user_name: str | None = None,
                                    coupon_code: str = "LANZAMIENTO50") -> bool:
    """Send the post-signup welcome email. Fire-and-forget; never raises."""
    if not user_email:
        return False
    if not os.environ.get('RESEND_API_KEY'):
        logger.warning("RESEND_API_KEY not set; skipping welcome email")
        return False
    try:
        html = _welcome_html(user_name, coupon_code)
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user_email],
            "subject": f"🎉 ¡Bienvenido/a a FactuYa, {(user_name or '').strip() or 'Amigo'}!",
            "html": html,
        })
        logger.info("Welcome email sent to %s", user_email)
        return True
    except Exception as e:
        logger.error("Failed to send welcome email to %s: %s", user_email, e)
        return False
