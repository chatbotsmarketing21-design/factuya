# FactuYa! - Product Requirements Document

## Original Problem Statement
Clone of "Invoice Home" application - a full-stack invoicing application named "FactuYa!" with apple green color scheme, deployed on user's Hostinger VPS.

## Current Status: PRODUCTION DEPLOYED ✅
- **Live URL**: User's custom domain on Hostinger VPS
- **Stack**: React frontend + FastAPI backend + MongoDB

---

## Session: March 16, 2026

### Changes Made This Session:

1. **Feature: Abono (Partial Payment) System** ✅ (TESTED)
   - Added ability to record partial payments against invoices
   - New status "Abono" (blue badge) for invoices with partial payments
   - Modal shows: Client name, invoice number, total, amount paid, and balance
   - Auto-status transitions: pending → partial → paid
   - Quotations cannot have payments (validation added)

2. **Backend Endpoints Added:**
   - `POST /api/invoices/{id}/payments` - Register a new payment
   - `GET /api/invoices/{id}/payments` - Get payment history
   - `DELETE /api/invoices/{id}/payments/{paymentId}` - Delete a payment
   
3. **Frontend Updates:**
   - Dashboard dropdown now includes "Agregar Abono" option
   - Payment modal with amount and optional note fields
   - Invoice list shows totalPaid and balance for each invoice
   - Stats update automatically after payment registration

4. **Backend Model Updates:**
   - `InvoiceListItem` now includes: totalPaid, balance, documentType
   - `PaymentRecord` model for storing individual payments
   - `AddPaymentRequest` model for payment API validation

5. **Test Suite Created:**
   - `/app/backend/tests/test_abono_payments.py` - 12 comprehensive tests
   - Tests: payment addition, status transitions, payment history, deletion, edge cases

### Testing Results: ✅ ALL PASSED
- Backend: 100% (12/12 tests)
- Frontend: 100% 
- Status transitions verified: pending → partial → paid

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
