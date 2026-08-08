# Test Credentials

## App Users
- **Admin User**: soportefactuya@gmail.com / 71361451
- **Primary Test User (Wompi prod email)**: chatbotsmarketing21@gmail.com / Cesar.2026
- **Standard Test User**: test@test.com / Test123!

## Renewal Cron (use on VPS daily cron)
- **Endpoint**: `POST /api/renewal/send-notifications`
- **Header required**: `X-Renewal-Token: fy_renewal_067bf0bfbcb515db58d987eeca5c53b5`
- (Token also stored in `/app/backend/.env` as `RENEWAL_CRON_TOKEN`)

## Resend (Email)
- API key set in `RESEND_API_KEY` env var.
- ⚠️ Currently in SANDBOX mode: only sends to `chatbotsmarketing21@gmail.com`.
- To enable sending to all users, verify a domain at https://resend.com/domains
  and update `SENDER_EMAIL` in `/app/backend/.env` to an address on that domain.

## Usuario gratuito de prueba (creado 2026-08-08, quedó Premium ANUAL tras pruebas)
- Email: free-test@test.com
- Password: Test123!
- Nota: planId premium_annual hasta 2027-08 (usado para probar activación del plan anual)
