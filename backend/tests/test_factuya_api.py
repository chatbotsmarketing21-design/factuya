"""
FactuYa! API Tests
Tests for authentication, invoices, and subscription endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "TestPassword123!"
TEST_USER_NAME = "Test User"

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API health check passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    @pytest.fixture(scope="class")
    def registered_user(self):
        """Register a test user and return credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME,
            "companyName": "Test Company"
        })
        if response.status_code == 200:
            data = response.json()
            return {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "token": data["token"],
                "user": data["user"]
            }
        elif response.status_code == 400 and "already registered" in response.text:
            # User already exists, try to login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            if login_response.status_code == 200:
                data = login_response.json()
                return {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD,
                    "token": data["token"],
                    "user": data["user"]
                }
        pytest.skip(f"Could not register/login test user: {response.text}")
    
    def test_register_new_user(self):
        """Test user registration"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "New Test User",
            "companyName": "New Test Company"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        print(f"✓ User registration passed: {data['user']['email']}")
    
    def test_register_duplicate_email(self, registered_user):
        """Test registration with duplicate email fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": registered_user["email"],
            "password": "AnotherPassword123!",
            "name": "Duplicate User"
        })
        assert response.status_code == 400
        print(f"✓ Duplicate email registration correctly rejected")
    
    def test_login_success(self, registered_user):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful for: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials correctly rejected")
    
    def test_get_current_user(self, registered_user):
        """Test getting current user info"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == registered_user["email"]
        print(f"✓ Get current user passed: {data['email']}")


class TestSubscription:
    """Subscription endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for a test user"""
        unique_email = f"sub_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Subscription Test User"
        })
        if response.status_code == 200:
            token = response.json()["token"]
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Could not create test user for subscription tests")
    
    def test_get_subscription_status(self, auth_headers):
        """Test getting subscription status - should return trial info"""
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify trial subscription fields
        assert "hasActiveSubscription" in data
        assert "status" in data
        assert "invoicesUsed" in data
        assert "canCreateInvoice" in data
        assert "message" in data
        
        # New user should be in trial with 0 invoices used
        assert data["status"] == "trialing"
        assert data["invoicesUsed"] == 0
        assert data["maxInvoices"] == 10
        assert data["canCreateInvoice"] == True
        print(f"✓ Subscription status: {data['status']}, invoices used: {data['invoicesUsed']}/{data['maxInvoices']}")
    
    def test_create_checkout_session(self, auth_headers):
        """Test creating Stripe checkout session"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/create-checkout-session",
            headers=auth_headers,
            json={"originUrl": "https://factuya-preview-3.preview.emergentagent.com"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify checkout session response
        assert "sessionId" in data
        assert "url" in data
        assert data["url"].startswith("https://checkout.stripe.com") or "stripe" in data["url"].lower()
        print(f"✓ Checkout session created: {data['sessionId'][:20]}...")
        print(f"✓ Stripe URL: {data['url'][:50]}...")


class TestInvoices:
    """Invoice CRUD endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for a test user"""
        unique_email = f"inv_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Invoice Test User"
        })
        if response.status_code == 200:
            token = response.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            # IMPORTANT: Must call subscription status to initialize subscription
            # This is a known issue - subscription should be created on registration
            requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
            return headers
        pytest.skip("Could not create test user for invoice tests")
    
    @pytest.fixture
    def sample_invoice(self):
        """Sample invoice data"""
        return {
            "number": f"TEST-{uuid.uuid4().hex[:6]}",
            "date": "2025-01-15",
            "dueDate": "2025-02-15",
            "status": "draft",
            "documentType": "invoice",
            "from": {
                "name": "Test Company",
                "email": "company@test.com",
                "phone": "123-456-7890",
                "address": "123 Test St",
                "city": "Test City",
                "state": "TS",
                "zip": "12345",
                "country": "USA"
            },
            "to": {
                "name": "Test Client",
                "email": "client@test.com",
                "phone": "098-765-4321",
                "address": "456 Client Ave",
                "city": "Client City",
                "state": "CL",
                "zip": "54321",
                "country": "USA"
            },
            "items": [
                {
                    "description": "Test Service",
                    "quantity": 2,
                    "rate": 100.00,
                    "amount": 200.00
                }
            ],
            "subtotal": 200.00,
            "taxRate": 10,
            "tax": 20.00,
            "total": 220.00,
            "notes": "Test invoice notes",
            "terms": "Payment due in 30 days",
            "template": 1
        }
    
    def test_get_invoices_empty(self, auth_headers):
        """Test getting invoices for new user (should be empty)"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get invoices returned {len(data)} invoices")
    
    def test_create_invoice(self, auth_headers, sample_invoice):
        """Test creating a new invoice"""
        response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=sample_invoice
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify invoice was created
        assert "id" in data
        assert data["number"] == sample_invoice["number"]
        assert data["total"] == sample_invoice["total"]
        print(f"✓ Invoice created: {data['id']}")
        return data["id"]
    
    def test_get_invoice_by_id(self, auth_headers, sample_invoice):
        """Test getting a specific invoice"""
        # First create an invoice
        create_response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=sample_invoice
        )
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Then get it by ID
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == invoice_id
        print(f"✓ Get invoice by ID passed: {invoice_id}")
    
    def test_update_invoice(self, auth_headers, sample_invoice):
        """Test updating an invoice"""
        # First create an invoice
        create_response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=sample_invoice
        )
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Update the invoice
        updated_data = sample_invoice.copy()
        updated_data["status"] = "pending"
        updated_data["notes"] = "Updated notes"
        
        response = requests.put(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            headers=auth_headers,
            json=updated_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert data["notes"] == "Updated notes"
        print(f"✓ Invoice updated: {invoice_id}")
    
    def test_delete_invoice(self, auth_headers, sample_invoice):
        """Test deleting an invoice"""
        # First create an invoice
        create_response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=sample_invoice
        )
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Delete the invoice
        response = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Invoice deleted: {invoice_id}")
    
    def test_get_invoice_stats(self, auth_headers):
        """Test getting invoice statistics"""
        response = requests.get(f"{BASE_URL}/api/invoices/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats fields
        assert "totalRevenue" in data
        assert "totalInvoices" in data
        assert "paidInvoices" in data
        assert "pendingInvoices" in data
        print(f"✓ Invoice stats: {data['totalInvoices']} total, ${data['totalRevenue']} revenue")


class TestSubscriptionLimit:
    """Test subscription limit enforcement (10 free invoices)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for a test user"""
        unique_email = f"limit_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Limit Test User"
        })
        if response.status_code == 200:
            token = response.json()["token"]
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Could not create test user for limit tests")
    
    def test_trial_invoice_count_increments(self, auth_headers):
        """Test that creating invoices increments trial count"""
        # Get initial status
        status_response = requests.get(f"{BASE_URL}/api/subscription/status", headers=auth_headers)
        initial_count = status_response.json()["invoicesUsed"]
        
        # Create an invoice
        invoice_data = {
            "number": f"LIMIT-{uuid.uuid4().hex[:6]}",
            "date": "2025-01-15",
            "dueDate": "2025-02-15",
            "status": "draft",
            "documentType": "invoice",
            "from": {"name": "Test Company", "email": "test@test.com"},
            "to": {"name": "Test Client", "email": "client@test.com"},
            "items": [{"description": "Test", "quantity": 1, "rate": 100, "amount": 100}],
            "subtotal": 100,
            "taxRate": 0,
            "tax": 0,
            "total": 100,
            "notes": "",
            "terms": "",
            "template": 1
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=invoice_data
        )
        assert create_response.status_code == 200
        
        # Check status again
        status_response = requests.get(f"{BASE_URL}/api/subscription/status", headers=auth_headers)
        new_count = status_response.json()["invoicesUsed"]
        
        assert new_count == initial_count + 1
        print(f"✓ Trial count incremented: {initial_count} -> {new_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
