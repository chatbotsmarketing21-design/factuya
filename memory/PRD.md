# FactuYa! - Product Requirements Document

## Original Problem Statement
Clone of "Invoice Home" application - a full-stack invoicing application named "FactuYa!" with apple green color scheme, deployed on user's Hostinger VPS.

## Current Status: PRODUCTION DEPLOYED ✅ + OFFLINE MODE LIVE 🎉
- **Live URL**: https://factuya.site (Hostinger VPS)
- **Stack**: React frontend + FastAPI backend + MongoDB
- **PWA Offline Mode**: ACTIVE (Service Worker `#387 activated and running`, IndexedDB caching)

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

### ✅ Progress: 20 / 33 adjustments completed

**Batch #X — UX del Creador de Facturas (May 27, 2026):**
- [x] #32 — Botón `+` (verde) agregado a la izquierda del 🗑️ (rojo) en cada
      fila de ítem en `InvoiceCreator.jsx`. Al presionarlo, inserta un nuevo
      ítem JUSTO DEBAJO de la fila tocada (no al final). Si solo hay un ítem,
      el botón de papelera se oculta pero el `+` siempre permanece visible.
      Función `addItem(insertAfterIndex)` con `splice` + focus auto al nuevo
      campo de descripción. Probado en preview: pasa de 2 → 3 ítems correctamente.

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
