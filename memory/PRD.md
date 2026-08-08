# FactuYa! - Product Requirements Document

## Original Problem Statement
Clone of "Invoice Home" application - a full-stack invoicing application named "FactuYa!" with apple green color scheme, deployed on user's Hostinger VPS.

## Current Status: PRODUCTION DEPLOYED ✅ + OFFLINE MODE LIVE 🎉
- **Live URL**: https://factuya.site (Hostinger VPS)
- **Stack**: React frontend + FastAPI backend + MongoDB
- **PWA Offline Mode**: ACTIVE (Service Worker `#387 activated and running`, IndexedDB caching)

---
---
---
---
## 🔄 SESSION 2026-08-08 (parte 2) — PLAN ANUAL + FIX ROTACIÓN ✅ (DESPLEGADO)

### Plan Anual Wompi (LIVE en producción)
- $35.99 USD/año (~$113.600 COP a TRM live) = 25% ahorro vs $47.88. Solo Wompi/Colombia.
- Backend: `calculate_subscription_price(plan)`, request `plan` en create-checkout, cupón SOLO mensual, activación 12 meses (`premium_annual`), autoRenew forzado off en anual. Config expone `annual:{amountCOP,amountUSD}`.
- Frontend: toggle Mensual|Anual (plan-toggle, solo geo wompi), precio tachado $47.88→$35.99, PayPal oculto en anual.
- Probado: checkout anual ignora cupón ✓, mensual+cupón 50% ✓, activación 12 meses ✓, regresión mensual ✓.
- Bug preexistente arreglado: notificación "Pago recibido" fallaba (transaction_id undefined → wompi_transaction.get('id')).
- ⚠️ LECCIÓN: NO hacer search_replace paralelos sobre el MISMO archivo (una edición planId se perdió por conflicto y hubo que reaplicarla).

### Fix rotación móvil (bug reportado por usuario) — VERIFICADO testing agent iteration_11.json (100%)
- Causa: manifest.json `"orientation": "any"` → TWA fullSensor (ignora bloqueo de giro del usuario).
- Fix: clave orientation ELIMINADA del manifest. LIVE en factuya.site.
- ⚠️ La app de Play Store necesita AAB nuevo: al regenerar en PWABuilder usar **Orientation: default**.

### AAB v1.0.2 EN PROCESO (usuario trabajando en ello)
- PWABuilder: package site.factuya.twa, version 1.0.2, versionCode 3, Orientation default, keystore existente ("Use mine").
- DEBE apuntar a API 36 (Android 16) — fecha límite Google: 31 AGO 2026.
- Al recibir el ZIP del usuario: verificar target API 36 antes de subir a Play Console.

### Credenciales test nuevas
- free-test@test.com / Test123! — creado para probar UI de suscripción (quedó PREMIUM ANUAL tras pruebas de activación, planId premium_annual hasta 2027-08).

## 🎟️ SESSION 2026-08-08 — CUPÓN LANZAMIENTO50 AUTO-RENOVABLE + PLANTILLA EJECUTIVA ✅ (DESPLEGADO Y VERIFICADO EN PRODUCCIÓN)

### Cupón LANZAMIENTO50 reactivado con renovación automática
- `ensure_launch_coupon_active()` en `routes/coupons.py`: crea/renueva el cupón (30 días de vigencia, campaña `auto_renew_until` ~6 meses = hasta 2027-02-07).
- Job APScheduler `launch_coupon_renewal` (08:45 UTC diario + al arrancar con next_run_time=now) — al reiniciar el backend en el VPS el cupón se reactiva SOLO, sin scripts manuales.
- Endpoint público `GET /api/coupons/launch` → {active, code, discount_percent, expires_at}.
- `LaunchCouponBanner.jsx` ya NO tiene fecha hardcodeada: lee expires_at real del backend (couponAPI.launchStatus). Banner reaparece automáticamente en cada ciclo mensual.
- Probado: renovación tras expiración ✓, fin de campaña no renueva ✓, banner producción con countdown 29d ✓, validate multi_use wompi/paypal/stripe ✓.
- Vence actual: 2026-09-07; campaña hasta ~2027-02-07.

### Plantilla "Ejecutiva" (6ª plantilla) — DESPLEGADA
- `InvoiceTemplateEjecutiva.jsx`: header oscuro (#111827) + serif Georgia, acento bronce #B45309 (personalizable), bloque Facturar a con borde lateral, tabla minimalista, TOTAL en caja oscura, pie "GRACIAS POR SU CONFIANZA".
- Registrada: type 'ejecutiva' en InvoicePreview, id 6 en mockTemplates, thumbnail real en /templates/ejecutiva-thumb.png (generada por screenshot).
- Nota: quedó un `thumb_ejecutiva.png` suelto en la raíz del repo (limpieza menor pendiente).

### Recordatorios de sesión
- 🔴 **PLAY STORE API 36**: regenerar AAB con PWABuilder (target Android 16 / API 36) ANTES DEL 31 AGO 2026. Guía paso a paso ya entregada al usuario (package site.factuya.twa, keystore existente, version 1.0.2 code 3). Usuario lo hará "mañana".
- 🟡 Verificación de desarrollador Play Console antes del 30 sep 2026.
- El usuario iba a contar una "nueva función" y terminó siendo el cupón. Preguntar si había algo más.

## 🧹 SESSION 2026-07-13 (parte 3) + 2026-08-06 — AJUSTES UX + RASTREO DE ACTIVIDAD ✅ (TODO DESPLEGADO Y VERIFICADO)

### Ajustes UX (todos desplegados en factuya.site)
1. Placeholder producto: "Ej: su producto o servicio" (4 idiomas).
2. Eliminados toasts: "Documento cambiado", "Producto guardado", "Producto eliminado".
3. Flechita atrás en /products → navigate(-1) con fallback /create.
4. Botón flotante "Volver" en /products (mismo estilo que Guardar documento, products-floating-back-btn).
5. Grid ítems móvil: cantidad col-span-1, precio/monto col-span-2 c/u (grid-cols-5) — precios grandes caben.
6. Punto de mil también en cuadro Cantidad (formatRateDisplay).
7. formatCurrency default minimumFractionDigits 0 (PDF sin ",00"; centavos reales sí se muestran) — aplica a las 5 plantillas.
8. Botón "Mis Productos" en escritorio (/create header, my-products-btn-desktop).
9. Tablas PDF con table-fixed + anchos fijos (InvoicePreview w-10/desc/w-14/w-24/w-28; Wave, Moderno, Dexter, CuentaCobro) — descripción larga ya no aplasta Cant/Precio/Importe; columna Importe alineada con bloque Subtotal.
10. Botón "Cambiar Documento" (renombrado de "Tipo de Documento"): barra full-width sticky bajo header móvil, ícono + tipo actual a la derecha.

### Rastreo de actividad (Opción A — detección indirecta de desinstalación)
- `POST /api/auth/heartbeat {source: 'app'|'web'}` en auth.py → guarda lastSeenAt/lastSeenSource en users.
- AuthContext envía heartbeat 1 vez por sesión (detección TWA: referrer android-app://, display-mode standalone).
- Admin /users incluye lastSeenAt/lastSeenSource; AdminPanel muestra badge "Última actividad" (verde ≤7d, amarillo ≤30d, rojo >30d, ícono Smartphone/Globe). Usuarios antiguos muestran "Sin datos" hasta que abran la app.
- Futuro: detección exacta con FCM push (token inválido = desinstalada) — en backlog.

### Pendiente usuario
- Probar en iPhone: PDF preview (hoja compartir) + WhatsApp sin texto.
- Mejoras admin adicionales sugeridas (buscador usuarios, tabs, stats) — usuario no eligió aún.

## 📦 SESSION 2026-07-13 (parte 2) — CATÁLOGO DE PRODUCTOS COMPLETO ✅ (testing agent 100%)

### What got DONE (probado con testing agent — iteration_10.json, 100% backend y frontend)
1. **Backend CRUD** `/app/backend/routes/products.py`: GET/POST/PUT/DELETE `/api/products` (+ search por código/descripción, userId scoping, price ge=0, uuid ids, colección `db.products`). Registrado en server.py. Tests en `/app/backend/tests/test_products.py`.
2. **Página `/products` (Mis Productos)** `/app/frontend/src/pages/Products.jsx`: lista, búsqueda, agregar/editar (dialog), eliminar (confirm). Ruta protegida en App.js. `productAPI` en services/api.js.
3. **Autocompletado en InvoiceCreator**: al escribir en descripción del ítem aparecen sugerencias del catálogo (por código o descripción); al seleccionar llena descripción+precio y recalcula importe. z-[110] (sobre botón flotante Guardar z-[100]).
4. **Header /create móvil**: botón "Cambiar Documento" movido a barra full-width sticky debajo del header (icono doc a la izq, tipo actual a la der con current-doctype-label). Botón "Mis Productos" (my-products-btn-mobile) en el lugar del antiguo botón.
5. **Compartir WhatsApp**: eliminado texto/caption — solo se envía el PDF (iPhone mostraba la descripción). DESPLEGADO.
6. Traducciones `products.*` y `invoice.myProducts` en es/en/pt/fr.

### PENDIENTE DESPLIEGUE VPS
Los cambios del catálogo (items 1-4, 6) NO están desplegados aún en factuya.site — recordar Save to GitHub + git pull + yarn build + **sudo systemctl restart factuya** (backend cambió: nueva ruta products).

### Deuda técnica menor (del code review)
- InvoicePreview: `<span data-ve-dynamic>` dentro de `<tbody>` genera warnings de hidratación React (preexistente, sin impacto funcional).

## 🛠️ SESSION 2026-07-13 — REDISEÑO CUADRO DE ÍTEMS + FIX PDF iOS ✅ (TODO DESPLEGADO)

### What got DONE (verificado en factuya.site)
1. **Modal de ítems ELIMINADO** (`ItemEditDialog.jsx` borrado): edición 100% inline en cada tarjeta de ítem (Descripción textarea + Cantidad | Precio | Importe en grid de 3 columnas). Focus ring verde lima.
2. **Cantidad default 0 como placeholder** — se escribe sin borrar el cero (igual que precio).
3. **Separador de miles en vivo en Precio** — `formatRateDisplay()` en InvoiceCreator: escribe 1250000 → muestra 1.250.000 (es-CO), acepta coma decimal.
4. **Autofocus en Descripción al agregar ítem** — setTimeout + focus + scrollIntoView.
5. **Fix PDF en iPhone**: iOS bloqueaba `window.open(blobUrl)` tras async. Creado `/frontend/src/utils/openPdf.js` (`openPdfBlob`): iOS → `navigator.share` con File (hoja nativa: Vista Rápida/Archivos/WhatsApp); Android/desktop → window.open como antes. Aplicado en InvoiceCreator, InvoiceDetail e InvoiceDetailPage.
   ⚠️ Ruta iOS pendiente de verificación por el usuario en iPhone real.

### data-testids nuevos (para testing)
`item-row-{i}`, `item-description-{i}`, `item-quantity-{i}`, `item-rate-{i}`, `item-amount-{i}`, `add-item-button`, `remove-item-btn-{i}`

## 🔍 SESSION 2026-07-12 — SEO + AJUSTE SIGNUP ✅

### What got DONE today (parte 2 — DESPLEGADO EN PRODUCCIÓN ✅)
6. **Google Analytics GA4** integrado (`G-QB9C3353NK`) en index.html — LIVE en factuya.site.
7. **Pricing simplificado**: eliminado cuadro Premium del landing; solo cuadro "Gratis" con estilo verde (borde lime, fondo degradado, botón verde).
8. **Hero image optimizada**: PNG 1.3MB externo → WebP 88KB local (`/hero-invoice.webp`), con `fetchpriority=high` y dimensiones fijas.
9. **Fix app duplicada (TWA vs PWA)**: `manifest.json` con `prefer_related_applications: true` + `related_applications` (play id `site.factuya.twa`); detección TWA vía referrer `android-app://` en Home.jsx; botón "Descargar App" en Android abre Play Store directo; `getInstalledRelatedApps()` oculta botón si la app ya está instalada.
10. **Sitemap.xml + robots.txt** creados y LIVE. Usuario verificó Search Console y envió sitemap.

### What got DONE today (parte 1)
1. **Label "Nombre Completo" → "Nombre"** en registro (claves `auth.name` y `auth.nameRequired` en los 4 locales: es, en, pt, fr).
2. **Meta tag Google Search Console** agregado en `frontend/public/index.html`: `google-site-verification` content=`hJ-e3Hwr5M9U9X9Wg4g4VdzXf7iObpilzoKphUa16I0`.
3. Verificado con screenshot + curl (meta presente en HTML servido).

### Pending follow-ups (RECORDAR AL USUARIO)
- ~~**Google Analytics (GA4)**~~ ✅ COMPLETADO: ID `G-QB9C3353NK` integrado, usuario verificó visitas en "Tiempo real" — FUNCIONA.
- **Search Console**: tras desplegar en VPS (`yarn build`), el usuario debe hacer clic en "Verificar" en Search Console. Luego enviar sitemap.
- **P0 Catálogo de Productos**: usuario pidió recordárselo más tarde. Arquitectura Nivel 2 ya acordada (CRUD `/api/products`, página `/products`, autocomplete en `ItemEditDialog.jsx`).
- Rotar contraseña keystore Android (expuesta).
- Verificar dominio factuya.site en Resend (DNS Hostinger).

### Files modified
- `/app/frontend/src/locales/{es,en,pt,fr}.json`
- `/app/frontend/public/index.html`

---
## 🎟️ SESSION 2026-06-23 — DESCUENTO REAL 50% EN WOMPI (LANZAMIENTO50) ✅

### What got DONE today
1. **Frontend now envía `couponCode`** al crear el checkout Wompi (`subscriptionApi.createWompiCheckout(autoRenewOptIn, couponCode)`).
2. **`SubscriptionPanel.jsx` pasa `pendingCoupon?.code`** automáticamente al pulsar "Suscribirme" cuando hay un cupón activo.
3. **UI muestra precio tachado + precio con descuento** ($3.99 → $2.00 USD y $13.700 → $6.900 COP).
4. **Backend ya aplica el descuento real** en `POST /api/wompi/create-checkout` y guarda `couponApplied` en `wompi_transactions`.
5. **Redención server-side en `activate_subscription`**: cuando el pago se aprueba (vía `/verify/{reference}` o `/webhook`), el cupón se marca como redimido vía `redeem_coupon` (idempotente, cubre webhook-only flow).
6. **Response del create-checkout** ahora devuelve `amountCOP` con el monto descontado, `originalAmountCOP` y `couponApplied`.
7. **Tested with curl**:
   - Sin cupón → `amountInCents: 1370000` ($13.700 COP)
   - Cupón inválido → fallback al precio completo (`couponApplied: null`)
   - `LANZAMIENTO50` → `amountInCents: 680000` ($6.800 COP, 50% real)
8. **Multi-use coupon protection**: la lógica `used_by_user_ids` evita doble redención por el mismo usuario; el cupón sigue válido para otros usuarios hasta su expiración.

### Files modified
- `/app/backend/routes/wompi.py` (create-checkout + activate_subscription)
- `/app/frontend/src/services/subscriptionApi.js`
- `/app/frontend/src/pages/SubscriptionPanel.jsx`

### Pending follow-ups
- Aplicar el mismo flujo de descuento real a PayPal (deferred por el usuario)
- Verificar dominio `factuya.site` en Resend (acción usuario en Hostinger DNS)
- Rotar contraseña del keystore (`Cesar.2026` expuesta)
- Recordar usuario hacer **"Save to GitHub"** + `git pull` en VPS

---



## 🚀 SESSION 2026-05-27 — PAYPAL LIVE DEPLOYED TO VPS ✅

### What got DONE today
1. **PayPal Subscriptions integration** (backend + frontend) — `routes/paypal.py`, OAuth, create subscription, verify, cancel, webhook handler
2. **Bootstrap script** (`scripts/paypal_bootstrap.py`) — creates Product + Plan in PayPal
3. **Email confirmation helper** (`utils/email_notifications.py`) — Resend-based welcome emails fired on PayPal/Wompi/Stripe activation
4. **In-process Scheduler** (`utils/scheduler.py`) — APScheduler runs daily 09:00 UTC, replaces VPS cron, idempotent renewal emails
5. **Dual gateway UI in Colombia**:
   - Wompi remains primary button
   - PayPal secondary button below ("Pagar con PayPal $3.99 USD") so users without local cards can subscribe too
6. **`geo.py` updated**: gateway "stripe"→"paypal", `?force_gateway=paypal` testing override
7. **PayPal accounts created**:
   - Business: Innova App Solutions (Colombia, S.A.S.)
   - Sandbox app: client_id + secret + plan `P-13K23015GD503302VNILR2LA` + webhook `2FA59597AY934154L`
   - Live app: client_id + secret + plan `P-3HW358851R3605749NILR7GI` + webhook `4JU6617415333023F` (URL: `https://factuya.site/api/paypal/webhook` ✅)
8. **DEPLOYED to VPS** (`/var/www/factuya`):
   - `git pull origin main` brought all PayPal code
   - `.env` updated with 9 PayPal vars (PAYPAL_MODE=live)
   - `pip install APScheduler==3.11.2 --break-system-packages`
   - `yarn build` (43s, success)
   - `systemctl restart factuya` → active (running) ✅
   - `https://factuya.site/api/paypal/config` returns `{"configured":true,"mode":"live","priceUSD":3.99}` ✅
9. **Domain confirmed**: `factuya.site` (NOT `factuya.app`)

### .aab status (from May 22)
- `/root/factuya-twa/app-release-bundle.aab` (2.3 MB) exists
- `twa-manifest.json` points to `factuya.site` ✅
- Keystore at `/root/factuya-twa/android.keystore` with password `Cesar.2026` (user decided NOT to rotate it — only he uses his PC)
- **Ready to upload to Play Console as-is** — TWA shell loads `factuya.site` so all new code (PayPal, languages, etc.) is delivered automatically without rebuild

### WAITING ON USER
User is watching Play Console tutorials. When he returns, continue from here:

1. **Download `.aab` from VPS to PC** (scp or WinSCP)
   - `scp root@187.77.19.47:/root/factuya-twa/app-release-bundle.aab ~/Downloads/`
2. **Create Play Console account** ($25 USD one-time fee) if he doesn't have one
3. **Create app**: Name "FactuYa! - Facturación Fácil", Spanish (Colombia), Free, App
4. **Upload `.aab`** to Internal Testing track first (safer than direct production)
5. **Fill out Store Listing**:
   - Short description (80 chars) — drafted, user can use it
   - Long description (4000 chars) — DRAFT PENDING (offer to help)
   - Icon 512x512 → `/root/factuya-twa/store_icon.png`
   - Feature graphic 1024x500 — needs creation
   - Screenshots (min 2, max 8 phone screenshots) — user has 6 captures pending
6. **Privacy Policy URL**: `https://factuya.site/privacy`
7. **Content Rating** questionnaire (financial data → 18+)
8. **Target audience**: 18+
9. **Category**: Business
10. **Ads**: No ads

### Open testing/verifications NOT yet done
- 🟡 Real $3.99 PayPal Live payment test (recommended before public launch)
- 🟡 Test app from mobile device at `https://factuya.site` (PWA install + offline mode)
- 🟡 Verify Resend domain (`factuya.site`) so welcome emails reach real customers (currently restricted to owner email)

### Remaining UI/UX backlog (P0 — can be shipped AFTER Play Store, instant updates via TWA)
- #12 Plantillas se vean igual que el PDF
- #13 20 plantillas profesionales nuevas (recordar preguntar si llevan columna "Item")
- #14 Preservar selección de plantilla al salir de la página
- #19 Más info en página de confirmación
- #21 Página "Tipo de Documento" más profesional
- #22 Botón "Catálogo" para productos guardados
- #24 Páginas Editar/Compartir más profesionales

### P1 backlog
- Wompi JS Widget for true auto-renewal tokenization (currently disabled checkbox)
- Sentry integration for crash reporting in production

### P2 backlog
- Dedicated Clients section
- Dedicated Products catalog
- Reports section with charts
- iOS launch via Capacitor
- Stripe activation (only when user has LLC USA — descartado por ahora)
- WhatsApp reminders

### Critical for next agent
- **LANGUAGE**: Español únicamente
- **VPS deploys**: `cd /var/www/factuya && git pull && cd frontend && yarn build && systemctl restart factuya`
- **NEVER** touch `mentorcash.service` (other app)
- **TEST CREDENTIALS** (preview env): `test@test.com` / `Test123!`
- **PAYPAL TEST USER** (preview): `paypal-test@test.com` / `Test123!`
- **Test report fork email** (Resend owner): `chatbotsmarketing21@gmail.com`

---


## 💳 PayPal Subscriptions Integration (Feb 2026) — IN PROGRESS

### Decision tree finalized with user
- 🇨🇴 Colombia → **Wompi** (unchanged)
- 🌍 Resto del mundo → **PayPal Subscriptions** (auto-renewal, $3.99 USD/mes)
- ❌ Stripe descartado: Stripe NO opera en Colombia; agregar requiere LLC USA (futuro).
- Empresa registrada como **Innova App Solutions** (Colombia, S.A.S.) → PayPal Business.

### Backend (DONE — code complete, awaiting keys)
- `/app/backend/routes/paypal.py`:
  - OAuth2 helper `get_access_token()`
  - `GET /api/paypal/config` (public, returns `configured` flag)
  - `POST /api/paypal/create-subscription` → returns approvalUrl
  - `GET /api/paypal/verify/{subscription_id}` → activates locally
  - `GET /api/paypal/verify-latest` → fallback when return_url has no id
  - `POST /api/paypal/cancel` → cancels upstream + marks local
  - `POST /api/paypal/webhook` → handles BILLING.SUBSCRIPTION.ACTIVATED /
    CANCELLED / EXPIRED, PAYMENT.SALE.COMPLETED, PAYMENT.SALE.DENIED
- `/app/backend/scripts/paypal_bootstrap.py` → one-time script to create
  the PayPal Product + Plan (run after PAYPAL_CLIENT_ID/SECRET are set,
  outputs PAYPAL_PLAN_ID to add to .env)
- `/app/backend/routes/subscription.py` `/cancel` now routes to PayPal API
  if the active sub `gateway === 'paypal'`.
- `.env` placeholders added: PAYPAL_MODE, PAYPAL_CLIENT_ID, PAYPAL_SECRET,
  PAYPAL_PLAN_ID, PAYPAL_WEBHOOK_ID.

### Frontend (DONE — code complete, awaiting keys)
- `/app/frontend/src/services/subscriptionApi.js`: added PayPal endpoints.
- `/app/frontend/src/pages/SubscriptionPanel.jsx`:
  - `handleUpgrade` routes Colombia→Wompi, rest→PayPal.
  - Handles `?paypal=success&subscription_id=…` and `?paypal=canceled`
    on the return URL.
  - Visual: replaced Stripe info & icons with PayPal info & official logo.
  - Stripe code (`createCheckoutSession`) preserved in subscriptionApi but
    UNUSED (kept for future LLC USA activation).

### USER ACTION REMAINING
1. Finalize PayPal Business signup as **Innova App Solutions** (S.A.S. → "Empresa" → "Sociedad").
2. Verify bank account + identity.
3. At developer.paypal.com → create Sandbox + Live apps → copy Client ID + Secret.
4. Send keys to agent → agent stores in `.env` and runs
   `python -m scripts.paypal_bootstrap` to generate PAYPAL_PLAN_ID.
5. Configure Webhook URL `https://factuya.app/api/paypal/webhook` in developer
   dashboard subscribing to BILLING.SUBSCRIPTION.* and PAYMENT.SALE.* events,
   then store PAYPAL_WEBHOOK_ID in `.env`.
6. Test in Sandbox → switch PAYPAL_MODE=live → deploy to VPS.

### Confirmation Emails (Feb 2026 — DONE)
- `/app/backend/utils/email_notifications.py` — Resend-based helper
  `send_subscription_confirmation(email, name, gateway, period_end, amount_label)`.
- Fired on:
  - PayPal activation (`paypal._activate_local_subscription`)
  - Wompi activation (`wompi.activate_subscription`)
  - Stripe activation (`subscription.get_checkout_status`, first-time only)
- HTML template: bienvenida + tabla (Plan / Monto / Método / Próxima renovación)
  con CTA verde al panel y nota de auto-renovación.
- Idempotente: solo se envía la primera vez que `status != "active"`.
- Pruebas: `python -c "..."` → email enviado OK a chatbotsmarketing21@gmail.com.
- ⚠️ Resend en modo no verificado: solo manda al owner. Para producción,
  verificar el dominio `factuya.app` en resend.com/domains.

### In-process Scheduler (Feb 2026 — DONE)
- `/app/backend/utils/scheduler.py` — APScheduler corriendo dentro del proceso
  FastAPI. Reemplaza la dependencia del VPS cron.
- Job programado: `renewal_notifications` → diario 09:00 UTC (≈ 04:00 Bogotá).
- Llama a `routes.renewal.run_renewal_notifications()` (refactor extraído del endpoint).
- Idempotente: marca `renewalReminderSentFor` / `expiredNoticeSentFor` por sub.
- Pruebas:
  - Ajusté manualmente un periodEnd a +2 días → `sent_reminder_count: 1` ✅
  - 2da corrida con misma fecha → `sent_reminder_count: 0` (no duplica) ✅
- Endpoint público de testing: `POST /api/renewal/send-notifications`
  con header `X-Renewal-Token: <RENEWAL_CRON_TOKEN>` sigue disponible.
- `requirements.txt` actualizado con `APScheduler==3.11.2`.

---


## 🎯 ACTIVE SESSION GOAL (May 22, 2026 — late afternoon)
**User explicitly paused the Play Store launch checklist** to first polish the app.
User identified **33 UI/UX/functional adjustments** to make BEFORE submitting to
Google Play Store. Working through them ONE BY ONE (user's explicit preference,
no batching).

### 📌 Reglas explícitas del usuario (NO OLVIDAR)
- **Plantillas nuevas**: Antes de crear cualquier plantilla nueva (#13, etc.),
  PREGUNTAR al usuario si lleva columna "Item" o no. La columna Item se aplicó
  a Clásica/Wave/Moderno/Dexter, pero el usuario explícitamente pidió REVERTIRLA
  en la plantilla Cuenta de Cobro porque le gustaba como estaba.
- **Comunicación**: SIEMPRE en español.
- **Despliegue a producción**: Solo cuando el usuario lo indique. Esperar siempre.

### ✅ Progress: 21 / 33 adjustments completed

**Batch #X — Multi-idioma (May 27, 2026):**
- [x] #28/#29/#30 (parcial) — Soporte de 4 idiomas: **ES + EN + PT + FR**.
      Archivos `pt.json` y `fr.json` creados con traducciones completas.
      `i18n.js` registra los 4 idiomas. `LanguageSwitcher` muestra los 4.
      Backend `/api/geo/detect` sugiere idioma según país (Brasil/Portugal → pt,
      Francia/Canadá/África francófona → fr, hispanohablantes → es, resto → en).
      Defaults de pies de página (#31) tienen versión en los 4 idiomas.

**Batch #X — UX del Creador de Facturas (May 27, 2026):**
- [x] #32 — Botón `+` (blanco en cuadrito negro) agregado en cada fila de ítem
      en `InvoiceCreator.jsx`. Inserta nuevo ítem justo debajo de la fila tocada.
      Botón global "Add Item" removido del header (solo se usan los `+` inline).
- [x] #31 — Notas y términos por tipo de documento (12 tipos):
      Backend guarda en `companyInfo.defaultNotesByDocType.{tipo}` y
      `defaultTermsByDocType.{tipo}`. Frontend carga el texto del tipo activo
      al abrir creador o cambiar de tipo. Fallback: texto guardado → default
      por idioma (`/app/frontend/src/constants/defaultFooters.js`) → legacy global.
      11 defaults profesionales (Cuenta de Cobro mantiene su lógica especial).

**Batch #X — Home + Auth Polish (May 27, 2026):**
- [x] Links en `SignUp`: "términos de servicio" y "política de privacidad"
      ahora son links clickables (color primary).
- [x] Sección de **Precios** pública en Home (anchor `#pricing`) con dos cards:
      Gratis ($0 — 10 facturas de prueba) y Premium ($3.99 USD/mes con badge
      "Mejor precio del mercado"). Link del footer ahora apunta a `#pricing`.
- [x] Quitada palabra "pequeñas" en footerDesc (ES y EN).
- [x] Nueva página `/faq` con 10 preguntas frecuentes con acordeón shadcn.
      Métodos de pago en #8 incluyen Wompi + Stripe + PayPal.
- [x] Botón "Back to Home" → ahora usa `t('common.backToHome')` en Privacy,
      Terms, FAQ, SignIn y SignUp. Aplica el idioma del usuario.
- [x] `ScrollToTop` global: al cambiar de ruta, la página abre desde arriba
      (excepto cuando hay un anchor `#xxx`).

**Batch #1 — Critical Bugs (Dashboard + Abonos):**
- [x] #20 — Cotizaciones (COT-) blindadas: NUNCA cambian de status automáticamente
      (tap, swipe y backend bloqueados). Siempre muestran amarillo en `SwipeableInvoiceCard.jsx`.
      Tampoco aparecen en filtros financieros (paid/pending/overdue) del Dashboard.
      NOTA: Las proformas (PRO-) sí siguen siendo financieras y cambian normal.
- [x] #25 — Facturas con abono parcial (status='partial') aparecen en filtro
      "Pendientes" del dashboard. Frontend + backend (`/api/invoices/stats`).
- [x] #26 — Los abonos parciales se suman al `totalRevenue`. Además, las
      PROFORMAS se incluyen en revenue (solo se excluyen cotizaciones).
- [x] #27 — Modal de abono: placeholder ahora dice
      "Ej: Transferencia, Efectivo o Tarjeta de Crédito" (sin nombres de bancos).

**Batch #2 — Home + Textos:**
- [x] #7 — REVERTIDO. El splash personalizado fue eliminado. Vuelve al comportamiento
      original del manifest de Android.
- [x] #9 — "Items / Servicios" → "Items / Productos" en `es.json` y `en.json`.
- [ ] #33 — DEJADO PARA EL FINAL por petición explícita del usuario.

**Batch #3 — Creador de Facturas (parcial):**
- [x] #5 — Copiar documento idéntico: copia from, to, items, notas, términos,
      plantilla, color, logo, firma, IVA, descuento, moneda y documentType.
      Aplicado en Dashboard.jsx (handleCopyInvoice) Y en
      InvoiceDetailPage.jsx (handleCopy mobile).
- [x] #10 — Botón "Cambiar Plantilla": desktop con gradiente lime→emerald, mobile
      (dentro del menu Tipo de Documento) con fondo lime-500 sólido + texto e
      iconos blancos (igual al botón "Guardar").
- [x] #18 — Cuadro de "Términos y Condiciones" en notas/pie de página ahora tiene
      6 líneas visibles (antes 2).

**Batch #4 — Dashboard UI:**
- [x] #3 — Buscador sticky: queda pegado debajo del header al hacer scroll.
      Mantiene el comportamiento de ocultar tarjetas al hacer tap (que era lo
      que ya gustaba). `sticky top-[57px] sm:top-[73px] z-40` + backdrop blur.

**Batch #5 — Plantillas + PDF:**
- [x] #1 — Optimización de PDF (carga rápida en WhatsApp). Aplicado en
      Dashboard.jsx, InvoiceCreator.jsx, InvoiceDetailPage.jsx:
      - scale: 2 → 1.5
      - PNG → JPEG 0.85
      - compress: true en jsPDF
      - render mode 'FAST'
      Resultado: ~2MB → ~300-500KB. Tiempo upload WhatsApp 15s → 3-5s.
- [x] #2 — Nombre del PDF corto. Formato: `{NUMERO}_{PRIMERNOMBRE}.pdf`
      (ej: FAC-010_JOSE.pdf). Quita tildes, caracteres especiales, max 20 chars,
      mayúsculas. Aplicado en Dashboard.jsx y InvoiceDetailPage.jsx (mobile share).

**Batch #6 — Perfil (parcial):**
- [x] #16 — Bloque "Información para Cuenta de Cobro" creado como Card separado
      en Profile.jsx. Contiene Banco/Tipo Cuenta/Número (sacados del bloque de
      empresa) + sección de Firma debajo. Icon: Landmark. Placeholder banco:
      "Ej: Tu Banco" (no Bancolombia).
- [x] FIRMA MOVIDA: La sección de subir/rotar/eliminar firma fue SACADA del
      InvoiceCreator.jsx (sección notas/pie de página) y MOVIDA al Card de
      "Información para Cuenta de Cobro" en Profile.jsx. La firma sigue
      guardándose en companyInfo via profileAPI.updateSignature/deleteSignature.

**Otros ajustes UI mobile:**
- [x] BOTÓN GUARDAR mobile: ahora a la derecha (era left) en InvoiceCreator.jsx.
      Mismo estilo exacto que "+ Crear nueva factura" (Link+div, text-base,
      font-semibold, px-4 py-3, rounded-full, lime-500). Texto: "Guardar documento"
      / "Actualizar documento" para igualar ancho.
- [x] BOTÓN SALIR de InvoiceDetailPage.jsx: cambiado a "Volver al inicio",
      mismo estilo Link+div idéntico a los otros botones flotantes verdes.

### 🚧 Remaining 19 adjustments (queued, user picks order):
**Creador de Facturas (Batch #3 restante):**
- [ ] #11 — Agregar más tipos de documentos en la lista
- [ ] #22 — Botón "Catálogo" (productos guardados)
- [ ] #23 — Botón "Cambiar Documento" más notorio
- [ ] #32 — Botón "+ Agregar Item" siempre arriba

**Dashboard (UI):**
- [ ] #4 — Botones a la derecha, tamaño uniforme (parcialmente hecho con Guardar
      y Salir mobile, falta revisar otros botones que el usuario identifique)

**Plantillas + PDF:**
- [ ] #8 — Número del item en el PDF
- [ ] #12 — Plantillas se vean idénticas al PDF (sin datos personales/Colombia)
- [ ] #13 — Agregar al menos 20 plantillas profesionales únicas
- [ ] #14 — Conservar selección de plantilla al entrar/salir
- [ ] #15 — Más colores y tonos en plantillas

**Perfil (restante):**
- [ ] #6 — Poder añadir varios logos
- [ ] #17 — Cuenta de Cobro como bloque separado en perfil
      (NOTA: ya hecho con #16, verificar si user lo confirma como duplicado)
- [ ] #31 — Pie de página por tipo de documento

**Páginas pulidas:**
- [ ] #19 — Página de confirmación con más información
- [ ] #21 — Página "Tipo de Documento" más profesional
- [ ] #24 — Página "Editar Factura" y "Compartir" más profesional

**Internacionalización:**
- [ ] #28 — Más idiomas (pt-BR, fr, de, etc.)
- [ ] #29 — ❓ Pregunta: ¿Cómo cobrar en otros países? (Stripe configurado, pero
      decisión pendiente sobre qué cuenta usar internacionalmente)
- [ ] #30 — Funciones según país

**Pendiente al final:**
- [ ] #33 — Botones del footer del Home (ya implementado en código pero el
      usuario quiere validarlo de último)

### 🔧 Workflow agreed with user (2026-05-22 PM)
1. User reviews app live at preview URL on his phone:
   **https://factuya-invoices.preview.emergentagent.com**
2. User dictates ONE adjustment at a time (no batching)
3. Agent implements + confirms
4. User refreshes preview, validates
5. Production deployment (single `git pull && npm run build` on VPS) happens
   ONLY AFTER ALL 33 adjustments are done.

### ⏸️ Roadmap PAUSED until polish is done (then resume in this order)
1. 🔐 Change keystore password (`keytool -storepasswd`)
2. 📸 Capture 6 mobile screenshots
3. 📝 Fill Play Console store listing
4. 🚀 Upload .aab and publish to Play Store
5. 💳 Wompi Widget tokenization (Option B, real auto-renewal)
6. 👥 Clients module + 📦 Products module
7. 📊 Reports with charts
8. 🌍 Multi-language: pt-BR, fr, de
9. 🍎 Apple App Store via Capacitor (Jul/Aug 2026)
10. 💡 BONUS idea: Referral program ("1 free month for each referral")

---

## Session: May 22, 2026 — Android bundle (.AAB) successfully built! 🎉

### ✅ Completed today
1. **PWA configuration audit & fix**
   - Regenerated 17 icon files from user's official F design (sizes: 16, 32, 48, 72, 96, 144, 152, 167, 180, 192, 256, 384, 512 + 2 maskable + favicon.ico).
   - Fixed `manifest.json`: separated `"any"` and `"maskable"` icons (Android Adaptive Icons requirement).
   - Updated `index.html` with multiple `apple-touch-icon` sizes for iOS.
   - All published and verified at `https://factuya.site/icon-*.png` (HTTP 200).

2. **Digital Asset Links file created and published**
   - `https://factuya.site/.well-known/assetlinks.json`
   - Filled with **REAL SHA-256** from the production keystore:
     `EA:4D:4F:4E:DA:D3:52:B0:FF:75:53:F0:25:DA:21:E1:01:1F:5F:40:62:CD:0B:44:A1:23:17:2A:E4:B5:C8:60`
   - `package_name: site.factuya.twa`

3. **Bubblewrap fully installed and configured on VPS**
   - Java JDK 17 installed (`/usr/lib/jvm/java-17-openjdk-amd64`)
   - Android SDK auto-downloaded by Bubblewrap (`/root/.bubblewrap/android_sdk`)
   - Bubblewrap CLI 1.24.1 in `/root/factuya-twa/` (isolated from Mentor Cash)

4. **Android Bundle (.AAB) generated and SIGNED**
   - File: `/root/factuya-twa/app-release-bundle.aab` (2.3 MB)
   - APK: `/root/factuya-twa/app-release-signed.apk` (2.1 MB)
   - Keystore: `/root/factuya-twa/android.keystore` (2.6 KB)
   - Keystore password noted by user (NOT in PRD for security)
   - Cert info: `Cesar Guzman / IT / FactuYa / CO`
   - App ID: `site.factuya.twa`
   - Display: `standalone`, portrait-primary
   - Theme: `#84CC16`, splash white
   - Includes 2 shortcuts (Crear Factura, Dashboard)

### ⚠️ SECURITY NOTE
During the build, the user typed the keystore password `Cesar.2026` and the
terminal echoed it visibly in the chat output (instead of hiding it). User opted
to NOT change it now and proceed. **STRONG RECOMMENDATION: rotate this password
BEFORE uploading to Play Store** using:
```
keytool -storepasswd -keystore /root/factuya-twa/android.keystore
keytool -keypasswd -keystore /root/factuya-twa/android.keystore -alias android
```
The SHA-256 fingerprint does NOT change when rotating the password (it's tied to
the cert, not the password), so `assetlinks.json` does not need an update.

### 🚧 Pending before Play Store launch (in order)
- [ ] **CRITICAL: Backup keystore externally** (Google Drive + local PC + USB).
      File at `/root/factuya-twa/android.keystore` (2.6 KB).
      Without it, app can NEVER be updated again.
- [ ] **CRITICAL: Rotate keystore password** (currently `Cesar.2026`, exposed in chat).
- [ ] **Take 6 mobile screenshots** of the running app (Dashboard, Create invoice,
      PDF preview, Templates, Subscription, Share). User will take them from
      personal phone and upload them DIRECTLY to Play Console (not to repo, not to
      this chat). 1080×1920+ vertical, light mode, Spanish, realistic data.
- [ ] **Download `.AAB` to PC** (`/root/factuya-twa/app-release-bundle.aab`, 2.3 MB).
      User can use scp, FileZilla/WinSCP, or Hostinger File Manager.
- [ ] **Fill Play Console store listing**: app name, short description (80 chars),
      full description (4000 chars), category (Business/Finance), content rating
      questionnaire, target audience, data safety form (declare email, name,
      payment via Wompi/Stripe; no advertising; encryption in transit).
- [ ] **Upload .AAB** to Play Console (Production track or Internal Testing first).

### 🔄 How updates work after Play Store launch (explained to user)
TWA = web wrapper. 95%+ of changes do NOT require uploading a new .AAB:
- Frontend / backend code changes → just `git pull` + `npm run build` on VPS, all
  Android users see the change next time they open the app.
- Only re-build .AAB for: icon change, name change, color change, domain change,
  new permissions, new shortcuts. Estimated: 1-2 times per year.



### 🎯 Goal
Publish FactuYa! to Google Play Store as a Trusted Web Activity (TWA) using
Bubblewrap. User has Play Console account active and wants to ship FAST.

### ✅ Completed today
1. **Legal pages rewritten for Play Store compliance** (`/privacy`, `/terms`)
   - Privacy: 14 sections — Habeas Data Colombia (Ley 1581) + GDPR + Google Play
     requirements (app permissions, account deletion, third-party list with policy
     links, international transfers, retention, children's privacy).
   - Terms: 16 sections — minimum age, refund policy, acceptable use, liability cap
     (12 months paid), governing law Colombia.
   - Contact email switched from `chatbotsmarketing21@gmail.com` to
     `soportefactuya@gmail.com` (more professional).
   - Deployed to VPS, both routes return HTTP 200 in production.

2. **Play Store visual assets generated with Gemini Nano Banana**
   - Files saved in `/app/play_assets/` and `/app/frontend/public/play_assets/`:
     - `factuya_icon_original.png` (1024×1024) — user-uploaded custom F icon
     - `factuya_icon_playstore_512.png` ⭐ (512×512) — Play Store ready,
       white corners flood-filled with lime green to avoid halo when Android
       applies adaptive icon mask
     - `factuya_icon_playstore_1024.png` (1024×1024) — high-res backup
     - `feature_graphic_banner_1024x500.png` ⭐ (1024×500) — Play Store banner
       with "FactuYa!" logo + tagline "Crea facturas profesionales desde tu
       celular" + iPhone mockup + floating invoice illustrations
     - `icon_option_a_document_512.png` (alternative — document with check)
     - `icon_option_b_lightning_512.png` (alternative — document with lightning)
   - Helper script: `/app/scripts/generate_play_assets.py` (uses EMERGENT_LLM_KEY
     via emergentintegrations, model `gemini-3.1-flash-image-preview`).
   - `EMERGENT_LLM_KEY` added to `/app/backend/.env`.

3. **Brand decisions confirmed by user**:
   - Identity: keep current lime green #84cc16 + black/white
   - Tagline: "Crea facturas profesionales desde tu celular"
   - Icon style: custom F logo (user-provided, not the AI alternatives)
   - Landing page: keep current Home.jsx for both web and installed app
     (already redirects logged-in users to `/dashboard` via useEffect on line 16-20)

### 🚧 Remaining checklist for Play Store launch
- [ ] **#5 — Screenshots (4–6 mobile captures)** — NEXT STEP TOMORROW
   - User to pick approach: (a) take from real phone, (b) auto-generate via
     headless browser after seeding 2–3 demo invoices, (c) mix.
   - Required scenes:
     1. Dashboard with realistic invoices
     2. Create-invoice screen with client + products filled in
     3. Final invoice PDF preview
     4. Templates gallery
     5. Subscription panel
     6. Share screen (WhatsApp / PDF buttons)
   - Format: 1080×1920 or 1080×2340 PNG, vertical, light mode, Spanish, no
     personal notifications visible.
- [ ] **#6 — PWA config audit** (`public/manifest.json`, service worker, icon
      links in `index.html`, theme color, splash screen). Replace placeholder
      icons with the new `factuya_icon_playstore_512.png`. Also generate
      192×192, 144×144, 96×96, 72×72, 48×48 variants.
- [ ] **#7 — Digital Asset Links** — upload
      `/.well-known/assetlinks.json` to `https://factuya.site` so Android
      knows the app and the domain are the same publisher. Need SHA-256
      fingerprint from the signing key once Bubblewrap generates it.
- [ ] **#8 — Generate Android Bundle (AAB)** with Bubblewrap
      (`npx @bubblewrap/cli init --manifest=https://factuya.site/manifest.json`),
      sign it, and confirm size (~3–5 MB expected).
- [ ] **#9 — Play Console store listing**: app name, short description (80 chars),
      full description (4000 chars), category, content rating questionnaire,
      target audience, data safety form (declare we collect email, name, payment
      info via Wompi/Stripe, no sharing, encryption in transit).

### 📦 Current bundle weight
- `/app/frontend/build/`: 8.9 MB total (1.6 MB gzipped on first visit)
- Expected Android AAB after Bubblewrap: ~3–5 MB download, ~10–15 MB installed

### 🌐 P0 from previous session still pending
- First real paid transaction (end-to-end validation) — user wants to wait for an
  organic first customer instead of paying themselves.

### 🔮 Backlog unchanged
- **P1**: Option B (Wompi Widget tokenization for true auto-charge, 4–6h)
- **P2**: Dedicated Clients/Products module, more invoice templates, Reports with
  charts, post-payment onboarding email, multi-language (pt/fr/de).

---


## Session: May 3, 2026 — Security hardening + Production launch path

### Critical findings from sandbox validation
- User ran a sandbox checkout with `autoRenewOptIn: true`. The Wompi transaction was
  `APPROVED` but `payment_source_id` was **never** returned to us.
- Root cause: Wompi Web Checkout (URL redirect `https://checkout.wompi.co/p/?...`) does
  NOT tokenize cards. Tokenization requires either the Wompi Widget JS or the direct
  `/tokens/cards` + `/payment_sources` API.
- Consequence: auto-renewal cron was fully built but would never fire. DB confirms
  `subscriptions.paymentSourceId` is `null` in all records.

### Decision: Hybrid approach (chosen by user)
- **Option A (ship today)**: Keep Web Checkout for initial payment + send renewal emails
  3/1/0 days before expiry. User taps the email link, pays again with Web Checkout in
  ~30 seconds. No fake auto-renewal promises.
- **Option B (next iteration, P1 backlog)**: Migrate checkout to the Wompi Widget JS or
  direct API to enable real tokenization + fully automated monthly charges.

### Changes Made This Session (2026-05-03):
1. **Webhook signature verification** (`backend/routes/wompi.py`) ✅ CRITICAL SECURITY FIX
   - Added `_verify_wompi_event_signature()` using `WOMPI_EVENTS_KEY`.
   - Rejects any webhook POST without a valid `signature.checksum` with HTTP 401.
   - Prior behavior: anyone could hit `/api/wompi/webhook` with a forged payload and
     activate a Premium subscription without paying.

2. **Hidden "auto-charge" checkbox** (`frontend/src/pages/SubscriptionPanel.jsx`)
   - The opt-in checkbox is now gated behind `false &&` so it never renders.
   - Replaced with a lightweight info note: "Te enviaremos un recordatorio por email 3
     días antes de cada vencimiento para que renueves con un clic."
   - Cancel-auto-renewal section still works for any legacy subscription that had it set.

### Production launch checklist (completed 2026-05-03):
- [x] Validate Wompi event signature (code fix)
- [x] Hide misleading auto-charge checkbox (code fix)
- [x] `APP_PUBLIC_URL=https://factuya.site` (was `factuya.app` — wrong domain)
- [x] `WOMPI_MODE=production` (was `sandbox`)
- [x] `RENEWAL_CRON_TOKEN`, `SENDER_EMAIL`, `APP_PUBLIC_URL` added to VPS `.env`
      (they were missing entirely — cron endpoints would have returned 403)
- [x] Wompi webhook URL `https://factuya.site/api/wompi/webhook` registered in
      Wompi's merchant panel (Desarrollo > Programadores > URL de Eventos).
      Prior state: "Sin URL" — every historic webhook event was discarded.
- [x] Cron job added for daily renewal reminders
      (`0 14 * * *` UTC = 9:00 AM Colombia → `/api/renewal/send-notifications`)
- [x] **Resend domain `factuya.site` verified** (was already verified 2 months ago).
      `SENDER_EMAIL` switched from `onboarding@resend.dev` (sandbox) to
      `FactuYa! <no-reply@factuya.site>`. Verified end-to-end by sending a live
      email via Resend API — delivery confirmed.
- [ ] First real paid transaction (end-to-end production validation) — user opted
      to wait for an organic first customer instead of paying themselves.

### P1 Backlog — Option B (Widget tokenization for true auto-charge)
- Replace the Web Checkout redirect with the Wompi Widget JS (`<script data-render="button">`).
- Implement tokenize → create payment_source → first transaction flow.
- Re-enable the opt-in checkbox and auto-charge cron.
- Estimated effort: 4–6h including regression testing.

### P2 Backlog — Future enhancements (user-approved, deferred)
- **Onboarding email after first payment** (user approved 2026-05-03, deferred): Once
  10-20 paying clients exist, add a transactional email right after the first successful
  payment with a short "Create your first invoice in 2 minutes" walkthrough. Industry
  benchmarks suggest ~30-40% lift in month-2 retention for SaaS.

### P2 Backlog — Apple App Store launch (deferred ~July/August 2026)
**Why deferred**: Apple does NOT accept TWAs (Trusted Web Activities). Their App
Store Review Guideline 4.2 (Minimum Functionality) explicitly rejects "repackaged
web sites". So the Bubblewrap-generated `.aab` (which we are shipping for Google
Play now) cannot be reused for Apple.

**Plan when user is ready (after 2-3 months of Play Store validation)**:
1. **Wrap the existing React app with Capacitor** (https://capacitorjs.com/) — keeps
   100% of the codebase, only adds a native iOS shell.
2. **Add some native iOS features** to pass Apple review (camera for invoice photos,
   push notifications, share sheet) — needed to clear the "minimum functionality"
   bar.
3. **Mac requirement**: Apple's toolchain (Xcode) only runs on macOS. Either:
   - Buy / borrow a Mac mini (~$600 USD)
   - Rent a cloud Mac (e.g., MacStadium, ~$30-60 USD/month while building)
4. **Apple Developer Program**: $99 USD per year (recurring, mandatory).
5. **Estimated effort**: 8-12 hours dev work + 7-14 days Apple review.
6. **Trigger to start**: when FactuYa! has steady installs on Play Store and
   genuine demand from iPhone users (track in dashboard).

---


## Session: May 1, 2026

### Big Wins This Session:
1. **Wompi/Stripe Smart Routing by IP geolocation** — Colombian users see Wompi (PSE/Nequi/local cards), the rest of the world sees Stripe (auto multi-currency).
2. **Subscription Lifecycle Overhaul** — calendar-month renewals (not 30 days), real-time expiry detection, full-screen blocking modal when expired.
3. **Renewal Email Notifications** — automated reminders 3 days before expiry and at expiry.
4. **Multiple Bug Fixes** — timezone, draft preservation, paid stamp on quotations, stats counting quotations.

### Changes Made This Session:

1. **Auto-Detect Country (`backend/routes/geo.py`)** ✅ NEW MODULE
   - `GET /api/geo/detect` — extracts client IP (X-Forwarded-For), queries ipapi.co → ip-api.com → fallback.
   - Returns `country_code`, `country_name`, `gateway` (`wompi` for CO, `stripe` else), `suggested_language` (es/en).

2. **Dynamic USD → COP Exchange Rate (`backend/routes/wompi.py`)** ✅
   - `get_usd_to_cop_rate()` with cascade: TRM oficial datos.gov.co → open.er-api.com → 4200 fallback. 1h cache.
   - `/wompi/config` and new `/wompi/exchange-rate` return live price.
   - Each Wompi transaction stores the historical TRM used.

3. **Subscription Price = $3.99 USD/month** ✅
   - Changed from $5 in 5 frontend places + `wompi.py` + `subscription.py` (Stripe).

4. **"Mejor precio del mercado" Badge** ✅
   - Animated gradient badge (amber→orange→pink) above the price card on `SubscriptionPanel`.

5. **Geo-Based Language Detection (`components/GeoLanguageDetector.jsx`)** ✅
   - On first load: applies the suggested language. Manual choice via `LanguageSwitcher` is respected forever (`i18nextLngManual` flag).

6. **Subscription Cycle = Calendar Month** ✅
   - `wompi.py` and `subscription.py` use `relativedelta(months=1)` instead of `timedelta(days=30)`.
   - Edge cases verified: 31 Jan → 28/29 Feb, 31 Mar → 30 Apr, 31 Dec → 31 Jan next year.

7. **Renewal Notifications (`backend/routes/renewal.py`)** ✅ NEW MODULE
   - `GET /api/renewal/check` — inspect targets (no send).
   - `POST /api/renewal/send-notifications` — send emails (protected by `X-Renewal-Token` header).
   - Sends "Vence pronto" 3 days before, "Ha vencido" within 24h after (auto-marks status='expired').
   - Idempotent via `renewalReminderSentFor` / `expiredNoticeSentFor`.
   - Uses Resend (sandbox: only sends to chatbotsmarketing21@gmail.com until domain is verified).

8. **Subscription Gate Modal (`components/SubscriptionGate.jsx`)** ✅ NEW COMPONENT
   - Full-screen, non-dismissible modal when `status === 'expired'`.
   - Two escape paths: "Renovar Premium" or "Cerrar sesión".
   - Re-checks every 60s (auto-closes if user pays in another tab).
   - Backend `/api/subscription/status` auto-marks expired subs both in response and persistently in DB.

9. **Bug Fixes** ✅
   - **Timezone bug**: `new Date().toISOString().split('T')[0]` replaced with local-date helper `getLocalDateString()`. Audited 28 timezones × 4 critical moments = 112 tests passed.
   - **Draft preservation on Change Template**: sessionStorage `factuya:invoice-draft` saves form state when navigating to /templates and restores on return.
   - **Invoice numbering on type change in edit mode**: removed `!isEditMode` guard on `handleDocumentTypeChange`.
   - **PAGADO stamp on quotations**: when changing type to quotation/proforma, status/payments/totalPaid are reset. All 4 templates also defensively check `documentType` not in [quotation, proforma].
   - **Quotations counted in stats**: `/api/invoices/stats` filters `documentType in {quotation, proforma}` before computing all metrics.
   - **ESLint warnings**: cleaned all 9 `react-hooks/exhaustive-deps` warnings; build now passes with `CI=true`.

### Environment Variables Added:
- `RENEWAL_CRON_TOKEN` (auto-generated, in `/app/memory/test_credentials.md`)
- `APP_PUBLIC_URL=https://factuya.app`

### Key Learnings This Session:
- Wompi only operates in Colombia/Centroamérica → must use Stripe for international users.
- TRM oficial via datos.gov.co is reliable (~3637 COP/USD as of May 2026).
- Resend in sandbox mode only sends to the registered email — domain verification needed for production emails.
- python-dateutil's `relativedelta` is the correct way to handle calendar month arithmetic.

### Pending Verification by User:
- All session changes need to be deployed to VPS (`git pull && yarn build && systemctl restart factuya`).
- New env vars `RENEWAL_CRON_TOKEN` and `APP_PUBLIC_URL` must be added to VPS `.env`.
- Cron job for renewal notifications needs to be configured (one-line crontab entry).
- ⚠️ User's own subscription is expired — apenas despliegue, will see the SubscriptionGate modal (intentional, opcion A confirmed).

---

## Session: March 16, 2026

### Changes Made This Session:

1. **Feature: Abono (Partial Payment) System** ✅ (TESTED & DEPLOYED)
   - Added ability to record partial payments against invoices
   - New status "Abono" (blue badge) for invoices with partial payments
   - Modal shows: Client name (only first line), invoice number, total, amount paid, and balance
   - Auto-status transitions: pending → partial → paid
   - Quotations cannot have payments (validation added)
   - **Deployed to production VPS**

2. **Backend Endpoints Added:**
   - `POST /api/invoices/{id}/payments` - Register a new payment
   - `GET /api/invoices/{id}/payments` - Get payment history
   - `DELETE /api/invoices/{id}/payments/{paymentId}` - Delete a payment
   
3. **Frontend Updates:**
   - Dashboard dropdown now includes "Agregar Abono" option (desktop)
   - **Mobile Invoice Detail page**: New "Agregar Abono" button (blue) between "Copiar Factura" and "Marcar como Pagada"
   - Payment modal with amount formatting (dots for thousands: 50.000)
   - Payment modal positioned higher on mobile to avoid keyboard overlap
   - Invoice list shows only client name (first line) in desktop table
   - Modal shows only client name, not full address/phone

4. **UX Improvements:**
   - Fixed cursor jumping issue in client textarea (using CSS text-transform instead of JS toUpperCase)
   - Subscription page: Payment method icons (Visa, Mastercard, PSE, Nequi)

5. **Test Suite Created:**
   - `/app/backend/tests/test_abono_payments.py` - 12 comprehensive tests
   - Tests: payment addition, status transitions, payment history, deletion, edge cases

### Testing Results: ✅ ALL PASSED
- Backend: 100% (12/12 tests)
- Frontend: 100% 
- Status transitions verified: pending → partial → paid

### Pending for Future Sessions:
- Dynamic USD to COP exchange rate for subscription pricing
- Configure Wompi payment methods (disable Bancolombia, Nequi buttons due to minimum amounts)

---

## Session: March 3, 2026 (Continued)

### Changes Made This Session:

1. **Bug Fix: Settings Menu Closing Behavior** ✅
   - Fixed: Clicking outside the settings menu now only closes the menu without reloading the page

2. **UI Fix: Removed Dark Mode Toast Notification** ✅
   - Removed the notification when toggling theme

3. **Feature: Subscription Dates in Mi Suscripción Page** ✅
   - Added "Próxima renovación" date with days remaining for Premium users

4. **UI Fix: Moved Floating Buttons to Right** ✅
   - "Crear nueva factura" button moved to right
   - "Salir" button on invoice detail page moved to right

5. **Feature: Contact Support Form** ✅
   - Created contact form with Name, Email, Message fields
   - Emails sent from soporte@factuya.site to soportefactuya@gmail.com
   - Configured Resend with factuya.site domain (verified)

6. **Feature: Admin Panel** ✅
   - Created /admin page (access only for soportefactuya@gmail.com)
   - Stats: Users, Premium, Users/Month, Invoices
   - Monthly revenue: New Premium, Renewals, Total
   - List of all registered users

7. **Feature: Annual Balance Page** ✅
   - Created /admin/balance page
   - Monthly breakdown: New subscribers, Renewals, Revenue
   - Year selector to view historical data
   - Annual totals summary

8. **Removed Emergent Watermark** ✅
   - Removed "Made with Emergent" badge from production

9. **Configured Resend Domain** ✅
   - Verified factuya.site domain in Resend
   - Added DNS records (DKIM, SPF, MX, DMARC) in Hostinger

### Deployed to Production ✅
All changes deployed to factuya.site VPS
   - New page at route `/invoice/:id` for mobile users
   - Central hub for invoice actions after creating/viewing an invoice
   - Shows invoice preview with header (number + status + logo)
   - Action buttons: Editar, Descargar PDF, WhatsApp, Correo, Copiar Factura, Marcar como Pagada, Eliminar
   - Desktop users still go directly to editor (unchanged behavior)
   - After saving invoice on mobile, redirects to this detail page

2. **Files Created/Modified:**
   - `/app/frontend/src/pages/InvoiceDetailPage.jsx` - New page component
   - `/app/frontend/src/App.js` - Added route `/invoice/:id`
   - `/app/frontend/src/components/SwipeableInvoiceCard.jsx` - Navigate to detail page on tap
   - `/app/frontend/src/pages/InvoiceCreator.jsx` - Mobile save redirects to detail page

---

## Session: March 2, 2026

### Changes Made This Session:

1. **Responsive Header on Home Page** ✅
   - Desktop: Shows logo + "Iniciar Sesión" (text) + "Crear Factura" (green button)
   - Mobile: Shows only logo + "Iniciar Sesión" (green button)

2. **Dashboard Mobile Improvements** ✅
   - Removed "+" button from header on mobile
   - Added floating "Crear nueva factura" button at bottom
   - Invoice list redesigned as clean single-line cards (like Invoice Home)
   - Swipe gestures: Left reveals "Compartir", Right reveals "Pagado"
   - Search focus hides stats cards to show more results
   - Settings button made slightly bigger on mobile

3. **Swipeable Invoice Cards** ✅
   - New component: SwipeableInvoiceCard.jsx
   - Swipe sensitivity adjusted to prioritize vertical scrolling
   - Clean design: status dot, client name, invoice number, amount, date, arrow
   - Same website, different content based on device

---

## Session Completed: February 26, 2026

### Changes Made This Session:

1. **Feature: PWA (Progressive Web App)** ✅
   - Created manifest.json with app metadata
   - Service worker for caching and offline support
   - App icons in multiple sizes (16px, 32px, 192px, 384px, 512px)
   - Apple touch icon for iOS
   - Theme color set to lime green (#84cc16)
   - App can be installed on mobile home screen
   - Opens in standalone mode (no browser UI)
   - Shortcuts for "Create Invoice" and "Dashboard"

2. **Feature: Mobile Responsive Dashboard** ✅
   - Stats cards now 2x2 grid on mobile
   - Invoice list shows as cards (not table) on mobile
   - Header made sticky with compact buttons
   - Language switcher moved to settings menu on mobile
   - All text sizes adjusted for mobile readability

3. **Feature: Inline Invoice Preview on Mobile** ✅
   - Removed modal preview, now shows inline below the form
   - Preview scales automatically to fit screen width
   - Fixed buttons "PDF" and "Guardar" at bottom
   - Similar UX to InvoiceHome app

4. **UI Fix: Templates Page Header** ✅
   - Removed "Mis Facturas" button
   - Moved FactuYa! logo to the right side
   - Cleaner header design

5. **CSS Improvements for PWA** ✅
   - Safe area insets for iPhone notch support
   - Prevented pull-to-refresh interference
   - Smooth scrolling enabled
   - Better touch tap highlight handling

---

## Previous Session: February 23, 2026

### Changes Made This Session:
1. **Bug Fix: Cuenta de Cobro Data Persistence** ✅
   - Fixed routing issue (`/invoice` route added as alias for `/create`)
   - Signature, signatureRotation, and bank details now persist correctly

2. **Feature: Signature Auto-Save to Profile** ✅
   - Signatures now save to user profile automatically
   - Load automatically when creating new documents

3. **Feature: Dynamic Template Colors** ✅
   - Simplified to 5 base templates (Clásica, Moderno, Olas, Dexter, Cuenta de Cobro)
   - Added color picker with 12 colors (black, gray, brown, red, pink, purple, orange, yellow, blue, cyan, green, lime)
   - All templates now support dynamic color changes
   - Color preference saved to user profile

4. **UI Fix: Document Type Switching** ✅
   - Fixed issue where switching from "Cuenta de Cobro" to other document types wasn't changing the template
   - Now restores user's default template when switching away from Cuenta de Cobro

5. **Feature: Full Internationalization (i18n)** ✅
   - Dashboard buttons (Download PDF, Copy, Share) now translate
   - Invoice Creator page fully internationalized:
     - Invoice Details section
     - From (Your Company) section
     - To (Client) section
     - Items/Services section
     - Notes/Footer section
     - All form labels and buttons

6. **UX: Home Page Navigation** ✅
   - "Create Invoice" buttons now redirect to Dashboard when user is logged in

7. **Deployment to VPS** ✅
   - Code pushed to GitHub
   - VPS updated with latest changes

---

## Implemented Features

### Core Features
- [x] User authentication (email/password + Google OAuth 2.0)
- [x] Invoice CRUD operations
- [x] Multiple document types (Invoice, Proforma, Quotation, Bill of Collection, Receipt)
- [x] Company profile with logo, notes, terms, bank details
- [x] Invoice templates with dynamic colors (5 base templates, 12 colors)
- [x] Exclusive "Cuenta de Cobro" template
- [x] Sequential invoice numbering
- [x] PDF download and sharing
- [x] Invoice duplication
- [x] Signature upload with rotation
- [x] Full Spanish/English internationalization
- [x] **PWA Support** - Install as app on mobile devices
- [x] **Mobile Responsive** - Dashboard and all pages optimized for mobile
- [x] **Invoice Detail Page** - Mobile-only hub for invoice actions
- [x] **Abono (Partial Payments)** - Record partial payments, track balance, auto-status transitions

### 3rd Party Integrations
- [x] Wompi (payments - production mode, replaced Stripe)
- [x] Resend (transactional emails - configured with factuya.site domain)
- [x] Google OAuth 2.0 (self-managed)

---

## Pending Issues (To Fix Later)
- [ ] **WhatsApp PDF Sharing** - Desktop can't attach files directly, only sends text message
- [x] ~~**Settings Menu Bug** - Clicking outside menu caused page reload~~ ✅ FIXED March 3, 2026
- [ ] **Google OAuth on Production** - Need to verify redirect URIs are configured correctly

## Upcoming Tasks (P1)
- [ ] **DUNS Number for Google Play Store** - User needs guidance for registration
- [ ] **Submit to Google Play Store** - As Trusted Web Activity (TWA) after DUNS

## Pre-Play Store Launch Tasks (do LAST, right before TWA submission)
- [ ] **Add Multi-Language Support** - Currently only ES/EN. Before launching to Play Store globally, add:
  - [ ] Portuguese (pt-BR) — Brazil market (~210M speakers)
  - [ ] French (fr) — France, Canada, Africa
  - [ ] German (de) — Germany, Austria, Switzerland
  - [ ] (Optional) Italian, Japanese, etc.
  - **Implementation steps per language**:
    1. Create `/app/frontend/src/locales/{lng}.json` translating all keys from `es.json`
    2. Register in `/app/frontend/src/i18n.js` (resources + supportedLngs)
    3. Add `DropdownMenuItem` in `/app/frontend/src/components/LanguageSwitcher.jsx`
    4. Map countries to language in `/app/backend/routes/geo.py` (`_suggested_language` function)
  - **Why last?**: Locks down all UI strings before translation cost; Stripe already supports
    multi-currency globally so no additional payment infra needed.

## Future Tasks (P2)
- [ ] Add more custom invoice templates
- [ ] Client and Product management sections
- [ ] Advanced reporting with charts
- [ ] Payment history view in Invoice Detail page

## Backlog (P3)
- [ ] Mobile application (native)
- [ ] Migrate backend to systemd service (currently using nohup)
- [ ] Fix eslint warnings in frontend build
- [ ] WhatsApp PDF sharing on desktop (API limitation)

---

## Technical Details

### Database Schema
- **users**: `{id, email, hashed_password, name, companyInfo: {logo, nit, bank, bankAccount, defaultNotes, defaultTerms, defaultTemplate, defaultColor, signature, signatureRotation}}`
- **invoices**: `{id, userId, number, from, to, items, documentType, status, total, signature, signatureRotation, template, payments: [], totalPaid, balance, createdAt}`
- **payments**: Embedded in invoices as `{id, amount, date, note, createdAt}`

### Key Files
- `/app/frontend/src/pages/InvoiceCreator.jsx` - Main invoice creation page
- `/app/frontend/src/pages/InvoiceDetailPage.jsx` - Mobile invoice detail page
- `/app/frontend/src/pages/Dashboard.jsx` - Invoice list with abono modal
- `/app/frontend/src/pages/Templates.jsx` - Template selection with color picker
- `/app/frontend/src/components/SwipeableInvoiceCard.jsx` - Mobile invoice cards with swipe
- `/app/frontend/src/mock/invoiceData.js` - Template and color definitions
- `/app/frontend/src/locales/es.json` & `en.json` - Translations
- `/app/backend/routes/profile.py` - Profile/signature endpoints
- `/app/backend/routes/invoices.py` - Invoice CRUD + payment endpoints
- `/app/backend/routes/wompi.py` - Wompi payment gateway integration
- `/app/backend/tests/test_abono_payments.py` - Payment feature tests

### Test Credentials
- **Test User**: test@test.com / Test123!
- **Google OAuth Client ID**: 441119292026-ngpbt64126c5pnlv08rgugqhtg0fedlj.apps.googleusercontent.com

---

## Recent Changes — 2026-05-27 (Account Deletion for Play Store Compliance)

### What was added (P0 — required by Google Play since 2023)
- **Backend** (`/app/backend/routes/auth.py`):
  - `DELETE /api/auth/account` endpoint
  - Requires authenticated user, password verification, and `"ELIMINAR"` / `"DELETE"` confirmation phrase
  - Best-effort cancellation of active PayPal subscriptions
  - Wipes user record + all related collections: `invoices`, `paypal_subscriptions`, `wompi_subscriptions`, `wompi_payments`, `subscriptions`, `password_resets`, `renewal_notifications`, `company_logos`, `contact_messages`

- **Frontend**:
  - New public page `/delete-account` (`/app/frontend/src/pages/DeleteAccount.jsx`) — no login required, satisfies Google Play public URL requirement
  - "Zona de Peligro" section added at bottom of `/app/frontend/src/pages/Profile.jsx` with password + confirmation inputs
  - Footer link in `Home.jsx` → "Eliminar mi cuenta"
  - Reference updated in Privacy Policy section 10
  - API helper `authAPI.deleteAccount({ password, confirmation })` in `/app/frontend/src/services/api.js`

### Backend test results (curl)
| Scenario | Result |
|----------|--------|
| Wrong confirmation phrase | `400 — Debes escribir "ELIMINAR"` ✅ |
| Wrong password | `400 — Contraseña incorrecta` ✅ |
| Valid deletion | `200 — Cuenta eliminada permanentemente` ✅ |
| Login after deletion | `401 — Invalid email or password` ✅ |

### Play Store URL to use
`https://factuya.site/delete-account`

### Outstanding for Play Store launch
- [ ] User to upload 8 screenshots + feature graphic + icon to Play Console
- [ ] Fill IARC content rating, Data Safety, Ads declaration, Target Audience forms
- [ ] Promote internal testing release → Production
- [ ] (Security) rotate exposed keystore password `Cesar.2026` before public production launch


---

## Win-back System — 2026-05-27 (Retention via Reactivation Coupons)

### Goal
Recover 15-20% of users that delete their account by offering a one-time 50% off
reactivation coupon valid for 15 days. Sent only to users that previously had a
Premium subscription.

### Implementation
- **New module** `/app/backend/utils/reactivation.py`:
  - `_generate_coupon_code()` — random unambiguous codes like `VUELVE50-A8X9K2`
  - `user_had_premium(db, user_id)` — checks `subscriptions`, `paypal_subscriptions`, `wompi_subscriptions`
  - `create_reactivation_coupon(...)` — persists coupon in `reactivation_coupons` (survives user deletion)
  - `send_farewell_email(...)` — Resend email with gradient hero, coupon box, signup CTA
  - `validate_coupon(...)` / `redeem_coupon(...)` — public + authenticated helpers

- **New endpoints** in `/app/backend/routes/coupons.py`:
  - `POST /api/coupons/validate` (public) — used on signup to show preview discount
  - `POST /api/coupons/redeem` (auth) — marks coupon as redeemed after successful payment

- **Integrated into account deletion** (`/app/backend/routes/auth.py`):
  - Coupon is issued BEFORE wiping user data
  - Email is fire-and-forget (deletion never blocks on Resend errors)
  - Non-premium users get clean deletion with no coupon (per user choice 5b)

### Coupon configuration (user choices)
- Discount: 50% off first renewal (choice 1a)
- Validity: 15 days (choice 2b)
- Applies to: Wompi + PayPal + Stripe (choice 3b)
- Email tone: friendly + surprising 🎁 (choice 4c)
- Target: only ex-Premium users (choice 5b)

### Backend tests (curl)
| Scenario | Result |
|----------|--------|
| Premium user deletion | ✅ Coupon issued, email sent, response includes `winback.coupon_code` |
| Non-premium user deletion | ✅ Clean deletion, no `winback` field |
| Validate valid coupon | ✅ Returns discount %, applies_to, expires_at |
| Validate fake coupon | ✅ 400 "El cupón no existe." |
| Redeem coupon (auth) | ✅ Marked as redeemed |
| Re-validate redeemed coupon | ✅ 400 "Este cupón ya fue usado." |

### New collection: `reactivation_coupons`
```json
{
  "code": "VUELVE50-A8X9K2",
  "discount_percent": 50,
  "applies_to": ["wompi", "paypal", "stripe"],
  "original_user_id": "...",
  "original_email": "user@example.com",
  "original_name": "Juan",
  "issued_at": "2026-05-27T22:00:00Z",
  "expires_at": "2026-06-11T22:00:00Z",
  "used_at": null,
  "used_by_user_id": null,
  "status": "active",
  "reason": "account_deletion_winback"
}
```

### Frontend integration pending (next steps)
- [ ] Read `?coupon=...` query param on signup page and pre-fill in a banner
- [ ] Show "🎁 50% off applied" badge in subscription checkout (Wompi/PayPal pages)
- [ ] Call `POST /api/coupons/redeem` from frontend after successful payment
- [ ] Optional: pass coupon code into Wompi/PayPal as metadata so a webhook can redeem server-side

