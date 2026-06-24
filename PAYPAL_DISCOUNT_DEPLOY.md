# 💳 Descuento real 50% en PayPal — Guía de Deploy

## Qué cambió
- Backend `routes/paypal.py` ahora acepta `couponCode` y aplica un **override del primer ciclo (TRIAL)** al precio descontado.
- `paypal_bootstrap.py` ahora crea planes con estructura **TRIAL (1 mes, $3.99) + REGULAR (infinito, $3.99)**. Sin cupón el comportamiento es idéntico al actual ($3.99/mes desde el primer cobro).
- Cuando se aplica `LANZAMIENTO50`, PayPal cobra **$2.00 USD el primer mes** y luego $3.99/mes automático.
- Cupón se marca como redimido server-side cuando la suscripción se activa.

---

## 🚀 Deploy en producción (VPS)

### 1. Save to GitHub
En Emergent click **"Save to GitHub"**.

### 2. En el VPS — pull + recrear plan PayPal

```bash
cd /var/www/factuya && git pull origin main

# Re-crear el plan LIVE con estructura TRIAL + REGULAR
cd /var/www/factuya/backend
PAYPAL_MODE=live python3 -m scripts.paypal_bootstrap
```

Esto imprime al final algo como:
```
DONE. Add this to backend/.env:
  PAYPAL_LIVE_PLAN_ID=P-XXXXXXXXXXXXXXXX
```

### 3. Actualizar `.env` con el nuevo plan ID

```bash
# Backup primero
cp /var/www/factuya/backend/.env /var/www/factuya/backend/.env.backup

# Reemplazar el plan ID (cambiá P-NUEVO_ID por el ID que imprimió el bootstrap)
nano /var/www/factuya/backend/.env
# Buscar la línea: PAYPAL_LIVE_PLAN_ID=P-...
# Cambiarla a: PAYPAL_LIVE_PLAN_ID=P-NUEVO_ID
```

### 4. Build frontend + restart

```bash
cd /var/www/factuya/frontend && yarn build
systemctl restart factuya
```

### 5. Verificar

```bash
curl -s https://factuya.site/api/paypal/config
# Debería responder: {"configured":true,"mode":"live","priceUSD":3.99}
```

---

## ⚠️ Sobre los suscriptores actuales
Los usuarios que YA están suscritos al plan VIEJO siguen pagando $3.99/mes — su suscripción no se toca. Sólo los **nuevos** suscriptores van al plan nuevo (TRIAL+REGULAR), y sólo ellos pueden aprovechar el descuento.

## 🧪 Probar
1. En tu celu, hacé logout
2. Crear cuenta nueva con un email diferente
3. Ir a Subscription → Aplicar cupón `LANZAMIENTO50`
4. Click "Pagar con PayPal"
5. En PayPal debería decir **"$2.00 USD ahora, luego $3.99 USD/mes"**
