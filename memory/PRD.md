# FactuYa! - Product Requirements Document

## Original Problem Statement
Clone of "Invoice Home" application - a full-stack invoicing application named "FactuYa!" with apple green color scheme, deployed on user's Hostinger VPS.

## Current Status: PRODUCTION DEPLOYED ✅
- **Live URL**: User's custom domain on Hostinger VPS
- **Stack**: React frontend + FastAPI backend + MongoDB

---

## Session: March 2, 2026

### Changes Made This Session:

1. **Responsive Header on Home Page** ✅
   - Desktop: Shows logo + "Iniciar Sesión" (text) + "Crear Factura" (green button)
   - Mobile: Shows only logo + "Iniciar Sesión" (green button)
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

### 3rd Party Integrations
- [x] Stripe (payments - test mode, to be replaced by Wompi)
- [x] Resend (transactional emails - test mode)
- [x] Google OAuth 2.0 (self-managed)

---

## Pending Issues (To Fix Later)
- [ ] **WhatsApp PDF Sharing** - Desktop can't attach files directly, only sends text message
- [ ] **Google OAuth on Production** - Need to verify redirect URIs are configured correctly

## Upcoming Tasks (P1)
- [ ] **Integrate Wompi Payment Gateway** - Replace Stripe for Colombian market (waiting for company bank account)
- [ ] **Configure Production Emailing** - Resend for VPS

## Future Tasks (P2)
- [ ] Add more custom invoice templates
- [ ] Client and Product management sections
- [ ] Advanced reporting with charts

## Backlog (P3)
- [ ] Mobile application (native)
- [ ] Migrate backend to systemd service (currently using nohup)

---

## Technical Details

### Database Schema
- **users**: `{id, email, hashed_password, name, companyInfo: {logo, nit, bank, bankAccount, defaultNotes, defaultTerms, defaultTemplate, defaultColor, signature, signatureRotation}}`
- **invoices**: `{id, userId, number, from, to, items, documentType, status, total, signature, signatureRotation, template, createdAt}`

### Key Files
- `/app/frontend/src/pages/InvoiceCreator.jsx` - Main invoice creation page
- `/app/frontend/src/pages/Templates.jsx` - Template selection with color picker
- `/app/frontend/src/mock/invoiceData.js` - Template and color definitions
- `/app/frontend/src/locales/es.json` & `en.json` - Translations
- `/app/backend/routes/profile.py` - Profile/signature endpoints
- `/app/backend/routes/invoices.py` - Invoice CRUD endpoints

### Test Credentials
- **Test User**: test@test.com / Test123!
- **Google OAuth Client ID**: 441119292026-ngpbt64126c5pnlv08rgugqhtg0fedlj.apps.googleusercontent.com
