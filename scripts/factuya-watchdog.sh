#!/bin/bash
# FactuYa Watchdog: verifica el backend, lo reinicia si está caído y alerta por correo (Resend).
set -u

HEALTH_URL="https://factuya.site/api/"
SERVICE="factuya"
ENV_FILE="/var/www/factuya/backend/.env"
ALERT_EMAIL="chatbotsmarketing21@gmail.com"
STATE_FILE="/var/tmp/factuya-watchdog.state"
REALERT_MINUTES=60

RESEND_API_KEY=$(grep -E '^RESEND_API_KEY=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
SENDER_EMAIL=$(grep -E '^SENDER_EMAIL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
SENDER_EMAIL=${SENDER_EMAIL:-onboarding@resend.dev}
CUSTOM_ALERT=$(grep -E '^WATCHDOG_ALERT_EMAIL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
ALERT_EMAIL=${CUSTOM_ALERT:-$ALERT_EMAIL}

check_health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$HEALTH_URL" 2>/dev/null || echo "000"
}

send_email() {
  local subject="$1"
  local body="$2"
  [ -z "$RESEND_API_KEY" ] && return 1
  local payload="/tmp/factuya-watchdog-payload.json"
  SUBJECT="$subject" BODY="$body" FROM="FactuYa Monitor <$SENDER_EMAIL>" TO="$ALERT_EMAIL" python3 -c "
import json, os
with open('$payload', 'w') as f:
    json.dump({
        'from': os.environ['FROM'],
        'to': [os.environ['TO']],
        'subject': os.environ['SUBJECT'],
        'html': \"<pre style='font-family:monospace;font-size:13px'>\" + os.environ['BODY'].replace('<', '&lt;') + '</pre>',
    }, f)
"
  curl -s -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    -H "Content-Type: application/json" \
    --data @"$payload" --max-time 15 > /dev/null
  rm -f "$payload"
}

get_state() { [ -f "$STATE_FILE" ] && cut -d '|' -f1 "$STATE_FILE" || echo "up"; }
get_state_ts() { [ -f "$STATE_FILE" ] && cut -d '|' -f2 "$STATE_FILE" || echo "0"; }
set_state() { echo "$1|$(date +%s)" > "$STATE_FILE"; }

NOW=$(date '+%Y-%m-%d %H:%M:%S %Z')
CODE=$(check_health)

if [ "$CODE" = "200" ]; then
  if [ "$(get_state)" = "down" ]; then
    send_email "✅ FactuYa se ha RECUPERADO" "El backend de factuya.site volvió a responder correctamente.

Fecha: $NOW
Estado HTTP: 200"
  fi
  set_state "up"
  exit 0
fi

# Backend caído: recolectar diagnóstico
LOGS=$(journalctl -u "$SERVICE" -n 15 --no-pager 2>/dev/null | tail -15)
MONGO_STATUS=$(systemctl is-active mongod 2>/dev/null || echo "desconocido")

# Levantar MongoDB si está apagado
if [ "$MONGO_STATUS" != "active" ]; then
  systemctl start mongod 2>/dev/null
  sleep 5
fi

# Intento de reinicio automático
systemctl restart "$SERVICE" 2>/dev/null
sleep 20
CODE2=$(check_health)

if [ "$CODE2" = "200" ]; then
  send_email "🔧 FactuYa se cayó y fue REINICIADO automáticamente" "El backend no respondía (HTTP $CODE) y el guardián lo reinició con éxito.

Fecha: $NOW
MongoDB estaba: $MONGO_STATUS
Estado tras reinicio: 200 OK

Últimas líneas del log antes del reinicio:
$LOGS"
  set_state "up"
  exit 0
fi

# Sigue caído: alertar (máximo 1 correo por hora)
LAST_TS=$(get_state_ts)
ELAPSED=$(( $(date +%s) - LAST_TS ))
if [ "$(get_state)" != "down" ] || [ "$ELAPSED" -ge $((REALERT_MINUTES * 60)) ]; then
  send_email "🚨 FactuYa está CAÍDO — el reinicio automático NO funcionó" "El backend de factuya.site no responde y el reinicio automático falló.

Fecha: $NOW
Estado HTTP: $CODE (tras reinicio: $CODE2)
MongoDB estaba: $MONGO_STATUS

ACCIÓN REQUERIDA: conéctate al VPS y revisa:
  sudo journalctl -u factuya -n 50 --no-pager

Últimas líneas del log:
$LOGS"
  set_state "down"
fi
exit 1
