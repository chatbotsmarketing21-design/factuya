"""
Test suite for Abono (Partial Payment) feature in FactuYa! invoicing application.
Tests payment addition, status transitions, payment history, and deletion.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAbonoPayments:
    """Tests for Abono/Partial Payment functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "Test123!"},
            headers={"Content-Type": "application/json"}
        )
        assert login_response.status_code == 200, "Login failed"
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    @pytest.fixture
    def create_test_invoice(self):
        """Create a test invoice for payment testing"""
        invoice_data = {
            "number": f"TEST_ABONO_{uuid.uuid4().hex[:6].upper()}",
            "date": "2026-03-16",
            "dueDate": "2026-04-16",
            "status": "pending",
            "documentType": "invoice",
            "from": {
                "name": "Test Company",
                "nit": "123456789",
                "email": "test@company.com"
            },
            "to": {
                "name": "Test Client",
                "nit": "987654321",
                "email": "client@test.com"
            },
            "items": [
                {"description": "Test Item", "quantity": 1, "rate": 100000, "amount": 100000}
            ],
            "subtotal": 100000,
            "taxRate": 0,
            "tax": 0,
            "total": 100000,
            "hasTax": False
        }
        response = requests.post(
            f"{BASE_URL}/api/invoices",
            json=invoice_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to create test invoice: {response.text}"
        invoice = response.json()
        yield invoice
        # Cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{invoice['id']}", headers=self.headers)
    
    # Module: Payment Addition Tests
    def test_add_partial_payment_success(self, create_test_invoice):
        """Test adding a partial payment updates status to 'partial'"""
        invoice = create_test_invoice
        
        # Add partial payment (30% of total)
        payment_response = requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 30000, "note": "First partial payment"},
            headers=self.headers
        )
        
        assert payment_response.status_code == 200
        data = payment_response.json()
        
        # Data assertions
        assert data["message"] == "Abono registrado exitosamente"
        assert data["totalPaid"] == 30000
        assert data["balance"] == 70000
        assert data["status"] == "partial"
        assert "payment" in data
        assert data["payment"]["amount"] == 30000
        assert data["payment"]["note"] == "First partial payment"
    
    def test_add_full_payment_marks_as_paid(self, create_test_invoice):
        """Test adding payment equal to total marks invoice as 'paid'"""
        invoice = create_test_invoice
        
        # Add full payment
        payment_response = requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 100000, "note": "Full payment"},
            headers=self.headers
        )
        
        assert payment_response.status_code == 200
        data = payment_response.json()
        
        assert data["status"] == "paid"
        assert data["totalPaid"] == 100000
        assert data["balance"] == 0
    
    def test_multiple_payments_accumulate(self, create_test_invoice):
        """Test multiple payments accumulate correctly"""
        invoice = create_test_invoice
        
        # First payment
        requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 30000},
            headers=self.headers
        )
        
        # Second payment
        response = requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 40000},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["totalPaid"] == 70000
        assert data["balance"] == 30000
        assert data["status"] == "partial"
    
    # Module: Payment Retrieval Tests
    def test_get_payments_history(self, create_test_invoice):
        """Test retrieving payment history for an invoice"""
        invoice = create_test_invoice
        
        # Add two payments
        requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 25000, "note": "Payment 1"},
            headers=self.headers
        )
        requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 35000, "note": "Payment 2"},
            headers=self.headers
        )
        
        # Get payment history
        response = requests.get(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["payments"]) == 2
        assert data["totalPaid"] == 60000
        assert data["total"] == 100000
        assert data["balance"] == 40000
        
        # Verify payment details
        payment_notes = [p["note"] for p in data["payments"]]
        assert "Payment 1" in payment_notes
        assert "Payment 2" in payment_notes
    
    # Module: Invoice List with Payment Info Tests
    def test_invoice_list_includes_payment_info(self, create_test_invoice):
        """Test that invoice list includes totalPaid and balance"""
        invoice = create_test_invoice
        
        # Add a payment
        requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 45000},
            headers=self.headers
        )
        
        # Get invoice list
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        
        invoices = response.json()
        test_invoice = next((inv for inv in invoices if inv["id"] == invoice["id"]), None)
        
        assert test_invoice is not None
        assert test_invoice["totalPaid"] == 45000
        assert test_invoice["balance"] == 55000
        assert test_invoice["status"] == "partial"
    
    # Module: Payment Deletion Tests
    def test_delete_payment_updates_totals(self, create_test_invoice):
        """Test deleting a payment updates totals and status"""
        invoice = create_test_invoice
        
        # Add two payments
        payment1_resp = requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 30000},
            headers=self.headers
        )
        payment1_id = payment1_resp.json()["payment"]["id"]
        
        requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 40000},
            headers=self.headers
        )
        
        # Delete first payment
        delete_response = requests.delete(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments/{payment1_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["totalPaid"] == 40000
        assert data["balance"] == 60000
        assert data["status"] == "partial"
    
    def test_delete_all_payments_resets_to_pending(self, create_test_invoice):
        """Test deleting all payments resets status to pending"""
        invoice = create_test_invoice
        
        # Add one payment
        payment_resp = requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 50000},
            headers=self.headers
        )
        payment_id = payment_resp.json()["payment"]["id"]
        
        # Delete the payment
        delete_response = requests.delete(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments/{payment_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["totalPaid"] == 0
        assert data["status"] == "pending"
    
    # Module: Quotation Restriction Tests
    def test_quotation_cannot_have_payments(self):
        """Test that quotations cannot have payments added"""
        # First, get a quotation (COT-001)
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        invoices = response.json()
        quotation = next((inv for inv in invoices if inv["documentType"] == "quotation"), None)
        
        if quotation is None:
            pytest.skip("No quotation found for testing")
        
        # Try to add payment to quotation
        payment_response = requests.post(
            f"{BASE_URL}/api/invoices/{quotation['id']}/payments",
            json={"amount": 1000},
            headers=self.headers
        )
        
        assert payment_response.status_code == 400
        assert "cotizaciones no pueden tener abonos" in payment_response.json()["detail"].lower()
    
    # Module: Edge Cases Tests
    def test_payment_without_note(self, create_test_invoice):
        """Test payment can be added without a note"""
        invoice = create_test_invoice
        
        response = requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 25000},
            headers=self.headers
        )
        
        assert response.status_code == 200
        assert response.json()["payment"]["note"] is None
    
    def test_overpayment_sets_balance_to_zero(self, create_test_invoice):
        """Test overpayment is handled correctly (balance becomes 0, not negative)"""
        invoice = create_test_invoice
        
        # Add payment greater than total
        response = requests.post(
            f"{BASE_URL}/api/invoices/{invoice['id']}/payments",
            json={"amount": 150000},  # More than 100000 total
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paid"
        assert data["balance"] == 0
    
    def test_payment_on_nonexistent_invoice(self):
        """Test adding payment to non-existent invoice returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/invoices/nonexistent-id-123/payments",
            json={"amount": 1000},
            headers=self.headers
        )
        
        assert response.status_code == 404


class TestStatsAfterPayments:
    """Test that stats are correctly calculated after payments"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "Test123!"},
            headers={"Content-Type": "application/json"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_stats_endpoint_works(self):
        """Test stats endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/invoices/stats", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "totalRevenue" in data
        assert "totalInvoices" in data
        assert "paidInvoices" in data
        assert "pendingInvoices" in data
        assert isinstance(data["totalRevenue"], (int, float))
        assert isinstance(data["totalInvoices"], int)
