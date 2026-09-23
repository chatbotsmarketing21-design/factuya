#!/bin/bash
# Instalador del guardián FactuYa (ejecutar una sola vez en el VPS como root)
set -e

chmod +x /var/www/factuya/scripts/factuya-watchdog.sh

cat > /etc/cron.d/factuya-watchdog <<'EOF'
*/5 * * * * root /var/www/factuya/scripts/factuya-watchdog.sh >> /var/log/factuya-watchdog.log 2>&1
EOF
chmod 644 /etc/cron.d/factuya-watchdog

touch /var/log/factuya-watchdog.log

echo "✅ Guardián instalado. Se ejecuta cada 5 minutos."
echo "Prueba manual: /var/www/factuya/scripts/factuya-watchdog.sh && echo 'Backend OK'"
echo "Ver registro:  tail -f /var/log/factuya-watchdog.log"
