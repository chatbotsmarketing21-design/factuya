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

### Invoice Management
- [x] Create invoices with customer details
- [x] Edit existing invoices
- [x] Delete invoices with confirmation dialog
- [x] View invoice list on dashboard
- [x] Invoice statistics (total revenue, paid, pending)
- [x] Multiple document types (Invoice, Proforma, Quote, Bill, Receipt)
- [x] Company logo upload
- [x] Invoice status management (Draft, Pending, Paid, Overdue)

### PDF & Export
- [x] Download invoice as PDF (using html2canvas + jspdf)
- [x] Send invoice via email (mailto: link)

### Internationalization
- [x] Spanish language support
- [x] English language support
- [x] Language switcher component

### Subscription Model
- [x] 10 free invoices for trial users
- [x] $5/month Premium plan via Stripe
- [x] Subscription dialog when limit reached
- [x] Stripe Checkout integration using emergentintegrations
- [x] Payment return handling with status polling
- [x] Subscription status endpoint

## Tech Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (async MongoDB driver)
- **Database**: MongoDB
- **Authentication**: JWT
- **Payments**: Stripe (via emergentintegrations library)
- **PDF**: html2canvas + jspdf
- **i18n**: react-i18next

## API Endpoints
### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Invoices
- `GET /api/invoices` - List all invoices
- `POST /api/invoices` - Create invoice (checks subscription)
- `GET /api/invoices/{id}` - Get invoice by ID
- `PUT /api/invoices/{id}` - Update invoice
- `DELETE /api/invoices/{id}` - Delete invoice
- `GET /api/invoices/stats` - Get invoice statistics

### Subscription
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/create-checkout-session` - Create Stripe checkout
- `GET /api/subscription/checkout-status/{session_id}` - Get payment status
- `POST /api/subscription/webhook` - Stripe webhook handler
- `POST /api/subscription/cancel` - Cancel subscription

## Database Schema
### users
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "password": "hashed_string",
  "companyInfo": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "city": "string",
    "state": "string",
    "zip": "string",
    "country": "string"
  }
}
```

### invoices
```json
{
  "id": "uuid",
  "userId": "uuid",
  "number": "string",
  "date": "string",
  "dueDate": "string",
  "status": "draft|pending|paid|overdue",
  "documentType": "invoice|proforma|quotation|bill|receipt",
  "from": { ... },
  "to": { ... },
  "items": [ ... ],
  "subtotal": "number",
  "taxRate": "number",
  "tax": "number",
  "total": "number"
}
```

### subscriptions
```json
{
  "userId": "uuid",
  "planId": "trial|premium_monthly",
  "status": "trialing|active|canceled",
  "trialInvoicesUsed": "number",
  "maxTrialInvoices": 10,
  "currentPeriodEnd": "datetime"
}
```

### payment_transactions
```json
{
  "userId": "uuid",
  "sessionId": "stripe_session_id",
  "amount": "number",
  "currency": "usd",
  "status": "pending|complete",
  "paymentStatus": "initiated|paid"
}
```

## Completed Features (as of Feb 2026)
1. ✅ Full authentication flow (register/login)
2. ✅ Invoice CRUD operations
3. ✅ 6 invoice templates
4. ✅ PDF download functionality
5. ✅ Company logo upload
6. ✅ Invoice status management
7. ✅ Multi-language support (ES/EN) with full i18n
8. ✅ Delete confirmation dialog (using AlertDialog)
9. ✅ Stripe subscription integration
10. ✅ Subscription dialog with payment redirect
11. ✅ Payment status polling on return from Stripe
12. ✅ Auto-create trial subscription for new users
13. ✅ Settings panel (Profile, Subscription, Change Password)
14. ✅ Dark/Light mode toggle
15. ✅ Password recovery flow via Resend
16. ✅ Automatic sequential invoice numbering per document type
17. ✅ Modal-based tax system (IVA, etc.)
18. ✅ Clickable dashboard invoice rows
19. ✅ **Document type translation in InvoicePreview** (FACTURA/INVOICE, COTIZACIÓN/QUOTATION, etc.)

## Backlog / Future Tasks
### P0 (Critical - User Requested)
- [ ] Integrate Wompi payment gateway (replace Stripe for Colombia)
- [ ] Configure production emailing (verify domain in Resend)

### P1 (High Priority)
- [ ] Real email integration for invoice sending

### P2 (Medium Priority)
- [ ] Client management module
- [ ] Product/service catalog
- [ ] Advanced reporting with charts
- [ ] Invoice reminders

### P3 (Low Priority)
- [ ] Mobile app (React Native)
- [ ] Multiple currencies
- [ ] Tax presets by country
- [ ] Invoice templates customization

## Known Issues
- None at this time

## Test Credentials
- Use any email/password combination to create a test account

## Environment Variables
### Backend (.env)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret
- `STRIPE_API_KEY` - Stripe test key (sk_test_emergent)

### Frontend (.env)
- `REACT_APP_BACKEND_URL` - Backend API URL
