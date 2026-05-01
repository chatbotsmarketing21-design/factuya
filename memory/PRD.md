# FactuYa! - Product Requirements Document

## Original Problem Statement
Clone of "Invoice Home" application - a full-stack invoicing application named "FactuYa!" with apple green color scheme, deployed on user's Hostinger VPS.

## Current Status: PRODUCTION DEPLOYED ✅
- **Live URL**: User's custom domain on Hostinger VPS
- **Stack**: React frontend + FastAPI backend + MongoDB

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
