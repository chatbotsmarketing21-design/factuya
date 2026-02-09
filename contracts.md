# Invoice Home Clone - Backend Integration Contracts

## Overview
This document outlines the API contracts, mock data replacement strategy, and integration plan for the Invoice Home clone application.

## Mock Data to Replace

### Location: `/app/frontend/src/mock/invoiceData.js`

**Mock Templates** - Keep as frontend constants (no backend needed)
- 6 invoice templates with different colors and styles

**Mock Invoices** - Replace with MongoDB data
- Invoice list with status, amounts, dates
- Full invoice details with items, calculations

**Mock User Data** - Replace with authentication system
- User profile information
- Company details

## API Endpoints

### 1. Authentication APIs (`/api/auth`)

#### POST `/api/auth/register`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "companyName": "Company Name"
}
```
**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### POST `/api/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "token": "jwt_token",
  "user": { "id": "user_id", "email": "...", "name": "..." }
}
```

#### GET `/api/auth/me`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "companyInfo": { "name": "...", "address": "...", ... }
}
```

### 2. Invoice APIs (`/api/invoices`)

#### GET `/api/invoices`
**Headers:** `Authorization: Bearer <token>`
**Query Params:** `?search=term&status=paid`
**Response:**
```json
[
  {
    "id": "invoice_id",
    "number": "001",
    "clientName": "Client Name",
    "date": "2025-02-09",
    "dueDate": "2025-03-11",
    "total": 2860.00,
    "status": "draft|pending|paid|overdue",
    "createdAt": "2025-02-09T10:00:00Z"
  }
]
```

#### GET `/api/invoices/:id`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "id": "invoice_id",
  "number": "001",
  "date": "2025-02-09",
  "dueDate": "2025-03-11",
  "status": "draft",
  "from": {
    "name": "Company Name",
    "email": "company@example.com",
    "phone": "+1 (555) 123-4567",
    "address": "123 Business St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "USA"
  },
  "to": {
    "name": "Client Name",
    "email": "client@example.com",
    "phone": "+1 (555) 987-6543",
    "address": "456 Client Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001",
    "country": "USA"
  },
  "items": [
    {
      "id": "item_id",
      "description": "Web Design Services",
      "quantity": 1,
      "rate": 1500.00,
      "amount": 1500.00
    }
  ],
  "subtotal": 2600.00,
  "taxRate": 10,
  "tax": 260.00,
  "total": 2860.00,
  "notes": "Thank you for your business!",
  "terms": "Payment due within 30 days",
  "template": 1,
  "userId": "user_id",
  "createdAt": "2025-02-09T10:00:00Z",
  "updatedAt": "2025-02-09T10:00:00Z"
}
```

#### POST `/api/invoices`
**Headers:** `Authorization: Bearer <token>`
**Request:** Same as GET response (without id, createdAt, updatedAt, userId)
**Response:** Created invoice object

#### PUT `/api/invoices/:id`
**Headers:** `Authorization: Bearer <token>`
**Request:** Updated invoice data
**Response:** Updated invoice object

#### DELETE `/api/invoices/:id`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "message": "Invoice deleted successfully"
}
```

#### GET `/api/invoices/stats`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "totalRevenue": 14540.00,
  "totalInvoices": 4,
  "paidInvoices": 1,
  "pendingInvoices": 1,
  "draftInvoices": 1,
  "overdueInvoices": 1
}
```

### 3. User Profile APIs (`/api/profile`)

#### GET `/api/profile/company`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "name": "Company Name",
  "email": "company@example.com",
  "phone": "+1 (555) 123-4567",
  "address": "123 Business St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "USA"
}
```

#### PUT `/api/profile/company`
**Headers:** `Authorization: Bearer <token>`
**Request:** Company info object
**Response:** Updated company info

### 4. Export APIs (`/api/export`)

#### POST `/api/export/pdf/:invoiceId`
**Headers:** `Authorization: Bearer <token>`
**Response:** PDF file download

#### POST `/api/export/email/:invoiceId`
**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{
  "to": "client@example.com",
  "subject": "Invoice #001 from Company Name",
  "message": "Please find attached your invoice."
}
```
**Response:**
```json
{
  "message": "Invoice sent successfully"
}
```

## MongoDB Collections

### 1. users
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  name: String (required),
  companyInfo: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 2. invoices
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users, required),
  number: String (required),
  date: String (required),
  dueDate: String (required),
  status: String (enum: draft, pending, paid, overdue),
  from: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  to: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  items: [{
    description: String,
    quantity: Number,
    rate: Number,
    amount: Number
  }],
  subtotal: Number,
  taxRate: Number,
  tax: Number,
  total: Number,
  notes: String,
  terms: String,
  template: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Integration Plan

### 1. Create API Service Layer
**File:** `/app/frontend/src/services/api.js`
- Axios instance with base URL and auth interceptor
- API functions for all endpoints

### 2. Create Auth Context
**File:** `/app/frontend/src/context/AuthContext.jsx`
- Store user state and token
- Login/logout functions
- Protected route wrapper

### 3. Update Pages

#### Home.jsx
- No changes needed (static page)

#### SignIn.jsx
- Replace mock login with real API call
- Store token in localStorage
- Redirect to dashboard on success

#### Dashboard.jsx
- Fetch invoices from API on mount
- Replace mock data with API data
- Implement delete/search functionality

#### InvoiceCreator.jsx
- Fetch user company info for "from" section
- POST/PUT invoice to API on save
- Generate invoice number automatically

#### Templates.jsx
- No backend changes (templates stay in frontend)

### 4. Protected Routes
- Wrap dashboard and invoice creator routes
- Redirect to signin if not authenticated

## Implementation Order

1. ✅ Frontend with mock data (COMPLETED)
2. ⏳ Backend Models (User, Invoice)
3. ⏳ Authentication endpoints
4. ⏳ Invoice CRUD endpoints
5. ⏳ Frontend API service layer
6. ⏳ Frontend Auth context
7. ⏳ Integrate pages with API
8. ⏳ PDF generation (optional enhancement)
9. ⏳ Email sending (optional enhancement)

## Notes

- Authentication uses JWT tokens
- Passwords hashed with bcrypt
- Invoice numbers auto-generated based on user's invoice count
- Status "overdue" can be calculated based on dueDate
- PDF generation and email sending are optional enhancements for MVP
