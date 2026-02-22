# FactuYa! - Product Requirements Document

## Original Problem Statement
Create a full-stack invoicing application clone of "Invoice Home" with the following features:
- User authentication (signup/login)
- Invoice creation, editing, and deletion
- PDF download functionality
- Multiple document types (Invoice, Proforma, Quotation, Bill, Receipt)
- Company logo upload
- Invoice status management
- Multi-language support (Spanish/English)
- Subscription model: 10 free invoices, then $5/month via Stripe

## User Personas
1. **Small Business Owners** - Need simple invoicing without complex accounting software
2. **Freelancers** - Need to create professional invoices quickly
3. **Consultants** - Need multiple document types (quotes, invoices, receipts)

## Core Requirements
### Authentication
- [x] User registration with email/password
- [x] User login with JWT tokens
- [x] Protected routes
- [x] **Google OAuth login (FIXED Feb 2026)** - Fixed redirect loop by properly updating AuthContext state

### Invoice Management
- [x] Create invoices with customer details
- [x] Edit existing invoices
- [x] Delete invoices with confirmation dialog
- [x] View invoice list on dashboard
- [x] Invoice statistics (total revenue, paid, pending)
- [x] Multiple document types (Invoice, Proforma, Quote, Bill, Receipt)
- [x] Company logo upload (persistent in user profile)
- [x] Invoice status management (Pending, Paid, Overdue) - Draft removed
- [x] Auto-incrementing invoice numbers per document type
- [x] Quotations don't show payment status (only invoices/bills do)

### PDF & Export
- [x] Download invoice as PDF (using html2canvas + jspdf)
- [x] Multi-page PDF support for long invoices
- [x] PDF color based on selected template (not document type)
- [x] Share via WhatsApp with PDF link
- [x] Share via Email

### Dashboard Features
- [x] Filter invoices by clicking on "Pagadas" or "Pendientes" cards
- [x] Colombian currency formatting ($1.234.567,89)
- [x] Styled action buttons (Descargar PDF, Compartir)
- [x] Dark mode support with custom gray theme

### Invoice Creator Features
- [x] Quantity field with thousand separators
- [x] Price field with thousand separators (no spinner)
- [x] Auto-save Notes and Terms to user profile
- [x] Quantity starts at 0 (not 1)
- [x] Mobile-responsive layout with collapsible sections
- [x] Mobile preview modal with fullscreen invoice view
- [x] Responsive header with mobile menu

### Internationalization
- [x] Spanish language support
- [x] English language support
- [x] Language switcher component
- [x] Full UI translation
- [x] **AUTO-DETECT browser language on landing page** (Feb 2026)

### Subscription Model
- [x] 10 free invoices for trial users
- [x] $5/month Premium plan via Stripe
- [x] Subscription dialog when limit reached
- [x] Stripe Checkout integration
- [x] Payment return handling

### User Profile
- [x] Company information management
- [x] Logo upload and persistence
- [x] Gender selection for personalized greeting
- [x] Default Notes and Terms auto-save
- [x] Change password functionality
- [x] Dark/Light mode toggle

## Technical Architecture
```
/app
├── backend
│   ├── models/ (user.py, invoice.py, subscription.py)
│   ├── routes/ (auth.py, invoices.py, profile.py, subscription.py, password_reset.py, google_auth.py)
│   ├── utils/ (security.py, subscription_check.py)
│   ├── pdf_storage/ (temporary PDF files for sharing)
│   ├── .env
│   ├── requirements.txt
│   └── server.py
└── frontend
    ├── src/
    │   ├── components/ (InvoicePreview.jsx, ProtectedRoute.jsx, SubscriptionDialog.jsx, etc.)
    │   ├── context/ (AuthContext.jsx)
    │   ├── locales/ (en.json, es.json)
    │   ├── pages/ (Dashboard.jsx, InvoiceCreator.jsx, SignIn.jsx, SignUp.jsx, Profile.jsx, etc.)
    │   ├── services/ (api.js, subscriptionApi.js)
    │   └── i18n.js
    └── package.json
```

## Database Schema
- **users**: `{id, username, email, hashed_password, name, gender, companyInfo: { logo, defaultNotes, defaultTerms, ... }}`
- **invoices**: `{id, userId, invoiceData, documentType, status, total, createdAt, invoiceNumber}`
- **subscriptions**: `{userId, stripe_customer_id, status, trialInvoicesUsed}`
- **password_reset_tokens**: `{user_id, token, expires_at, used}`
- **pdf_files**: `{userId, filename, createdAt, expiresAt}` (for WhatsApp sharing)

## 3rd Party Integrations
- **Stripe**: Payment processing for subscriptions
- **Resend**: Transactional emails for password recovery
- **Emergent Google Auth**: Social login (in progress)

## Pending Issues
1. **Google OAuth Login (P1)**: Redirect loop after authentication - paused by user

## Pending Issues
1. **Google OAuth Login (IN PROGRESS)**: 
   - Configured own Google OAuth credentials in Google Cloud Console
   - Added all domains and redirect URIs
   - Error "OAuth client was not found" - need to create a NEW OAuth client from "APIs & Services" → "Credentials" (not the auto-generated Firebase one)
   - **Next step**: Create fresh OAuth 2.0 client and get new Client ID/Secret

## Completed in Latest Session (Feb 2026)
1. **Auto-Language Detection on Landing Page (DONE)**
   - Configured i18next-browser-languagedetector with detection order: localStorage → navigator → htmlTag
   - Added all landing page text to translation files (en.json, es.json)
   - Updated Home.jsx to use useTranslation() hook
   - All 32 i18n tests passed (English & Spanish translations verified)
   - Fallback language: Spanish (es)

2. **Professional Hero Image on Landing Page (DONE)**
   - Replaced skeleton placeholder with AI-generated professional invoice mockup image
   - Image matches FactuYa! brand colors (lime green)

3. **Google OAuth Login Fix (DONE)**
   - Added `loginWithGoogle()` function to AuthContext that properly updates both localStorage AND React state
   - Fixed import path in google_auth.py (utils.security → utils.auth)
   - Fixed JWT exception handling (jwt.JWTError → jwt.exceptions.DecodeError)
   - All 24 backend tests passed

4. **Mobile Optimization (Previous)**: Complete responsive redesign of InvoiceCreator
   - Responsive header with mobile menu dropdown
   - Collapsible sections for all form areas
   - Mobile-friendly field layouts (grid adjustments)
   - Floating "Ver Vista Previa" button for mobile
   - Fullscreen preview modal with PDF download option
   - Desktop layout unchanged (two-column with sticky preview)

## Upcoming Tasks
1. **P1**: Integrate Wompi payment gateway (replacement for Stripe in Colombia)
2. **P2**: Configure production emailing in Resend
3. **P2**: Add more custom invoice templates
4. **P2**: Client and Product management sections
5. **P2**: Advanced reporting with charts

## Deployment Information
- **Production Server**: Hostinger VPS (Ubuntu) at IP 187.77.19.47
- **Live URL**: https://factuya.site
- **GitHub Repo**: https://github.com/chatbotsmarketing21-design/factuya.git
- **Development Workflow**: Develop in Emergent → Push to GitHub → Pull/Rebuild on VPS

## Session Completed: February 14, 2026
### Changes Made This Session:
- Removed spinner from Price field in invoice creator
- Changed "Enviar Email" button to "Compartir" with WhatsApp and Email options
- Implemented WhatsApp sharing with PDF link (uploads PDF to server)
- Fixed PDF download from Dashboard (was not generating real PDF)
- Made InvoicePreview component more robust for API data
- Added filter functionality to dashboard stats cards (Pagadas/Pendientes)
- Implemented multi-page PDF generation for long invoices
- Quotations now show no status badge (only invoices show Pending/Paid/Overdue)
- PDF color now based on template selection, not document type
- Auto-save Notes and Terms to user profile
- Quantity field now starts at 0
- Quantity and Price fields now show thousand separators

## Session: December 2025
### Changes Made This Session:
- Fixed Dashboard multi-page PDF generation rendering horizontally instead of vertically
- Added fixed width (794px) to hidden PDF preview container for consistent A4 rendering
- Synchronized PDF generation logic between Dashboard and InvoiceCreator
- **Custom Templates**: Added "Olas Azules" template with WaveTemplate.jsx component
- **NIT Field Integration**: Added "NIT" (Tax ID) fields for company and client across entire stack
- **Collapsible Sections**: Made "Detalles de la Factura" and "Información Adicional" sections collapsible
- **Bug Fix (NIT Loading)**: Fixed issue where company NIT was not loading for existing invoices - modified loadInvoice() to merge NIT from profile
- **PAGADO Stamp**: Added red rectangular diagonal "PAGADO" stamp on paid invoices
- **PDF Filename**: Updated to cleaner format (DOC-NUM_Client-Name.pdf)
- **Due Date**: Auto-calculated to one month from issue date
- **Templates Page**: Fully translated to Spanish/English with correct navigation
- **NEW Template "Dexter"**: Added new colorful template with green/yellow/blue wave design on both sides. Template includes: FACTURAR A, ENVIAR A sections, items table, totals, signature area, and payment conditions section.

## Test Credentials
- **Trial User**: chatbotsmarketing21@gmail.com / Test123!
- **Premium User**: tecnogramasmedellin@gmail.com
