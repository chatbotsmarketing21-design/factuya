"""
FactuYa! Cuenta de Cobro Signature & Bank Details Test
Tests for verifying that signature, signatureRotation, and bank account data
are properly saved and retrieved when creating/editing a Cuenta de Cobro (bill).
"""
import pytest
import requests
import os
import uuid
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Create a simple test image (1x1 red pixel PNG) for signature testing
# This is a valid PNG file
TEST_SIGNATURE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FABJADq0kLXBsAAAAAElFTkSuQmCC"
# A different signature for update testing
UPDATED_SIGNATURE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABpIDq0klV4FAAAAAElFTkSuQmCC"


class TestCuentaCobroSignatureAndBank:
    """Tests for Cuenta de Cobro signature and bank details persistence"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for a test user"""
        unique_email = f"cuenta_cobro_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Cuenta Cobro Test User"
        })
        if response.status_code == 200:
            token = response.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            # Initialize subscription
            requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
            return headers
        pytest.skip("Could not create test user for cuenta cobro tests")
    
    @pytest.fixture
    def cuenta_cobro_with_signature_and_bank(self):
        """Sample Cuenta de Cobro data with signature and bank details"""
        return {
            "number": f"COB-{uuid.uuid4().hex[:6]}",
            "date": "2025-01-15",
            "dueDate": "2025-02-15",
            "status": "pending",
            "documentType": "bill",  # Cuenta de Cobro type
            "from": {
                "name": "EMPRESA DE PRUEBAS S.A.S",
                "nit": "900.123.456-7",
                "email": "empresa@pruebas.com",
                "phone": "300-123-4567",
                "address": "Calle 123 #45-67",
                "city": "Bogotá",
                "state": "Cundinamarca",
                "zip": "110111",
                "country": "Colombia",
                "bank": "Bancolombia",
                "bankAccount": "123-456789-01"
            },
            "to": {
                "name": "CLIENTE DE PRUEBA LTDA",
                "nit": "800.987.654-3",
                "email": "cliente@prueba.com",
                "phone": "310-987-6543",
                "address": "Carrera 78 #90-12",
                "city": "Medellín",
                "state": "Antioquia",
                "zip": "050010",
                "country": "Colombia"
            },
            "items": [
                {
                    "description": "Servicio de Consultoría",
                    "quantity": 10,
                    "rate": 150000,
                    "amount": 1500000
                }
            ],
            "subtotal": 1500000,
            "taxRate": 0,
            "tax": 0,
            "total": 1500000,
            "hasTax": False,
            "notes": "Favor consignar a la cuenta indicada",
            "terms": "Pago a 30 días",
            "template": 4,  # Cuenta de Cobro template
            "signature": TEST_SIGNATURE_BASE64,
            "signatureRotation": 90
        }
    
    def test_create_cuenta_cobro_with_signature_and_bank(self, auth_headers, cuenta_cobro_with_signature_and_bank):
        """Test creating a Cuenta de Cobro with signature and bank details - should save all fields"""
        response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=cuenta_cobro_with_signature_and_bank
        )
        
        # Assert creation success
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        data = response.json()
        
        # Verify ID was created
        assert "id" in data, "Invoice should have an ID"
        invoice_id = data["id"]
        print(f"✓ Cuenta de Cobro created with ID: {invoice_id}")
        
        # Verify signature is present in response
        assert "signature" in data, "Response should include signature field"
        assert data.get("signature") == TEST_SIGNATURE_BASE64, f"Signature should be saved. Got: {data.get('signature', 'NONE')[:50]}..."
        print(f"✓ Signature saved correctly in create response")
        
        # Verify signatureRotation is present in response
        assert "signatureRotation" in data, "Response should include signatureRotation field"
        assert data.get("signatureRotation") == 90, f"SignatureRotation should be 90. Got: {data.get('signatureRotation')}"
        print(f"✓ SignatureRotation saved correctly: {data.get('signatureRotation')}")
        
        # Verify bank details in from address
        from_data = data.get("from") or data.get("fromAddress", {})
        assert from_data.get("bank") == "Bancolombia", f"Bank should be saved. Got: {from_data.get('bank')}"
        assert from_data.get("bankAccount") == "123-456789-01", f"BankAccount should be saved. Got: {from_data.get('bankAccount')}"
        print(f"✓ Bank details saved correctly: {from_data.get('bank')} - {from_data.get('bankAccount')}")
        
        return invoice_id
    
    def test_get_cuenta_cobro_preserves_signature_and_bank(self, auth_headers, cuenta_cobro_with_signature_and_bank):
        """Test that GET request returns signature and bank details - Bug Verification"""
        # First create the Cuenta de Cobro
        create_response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=cuenta_cobro_with_signature_and_bank
        )
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        print(f"✓ Created Cuenta de Cobro: {invoice_id}")
        
        # NOW: GET the invoice and verify all fields are preserved (THIS IS THE BUG TEST)
        get_response = requests.get(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200, f"Failed to get invoice: {get_response.text}"
        data = get_response.json()
        
        # CRITICAL: Verify signature is returned in GET response
        assert "signature" in data, "GET response should include signature field"
        signature_returned = data.get("signature")
        assert signature_returned == TEST_SIGNATURE_BASE64, f"Signature should be preserved after GET. Got: {str(signature_returned)[:50]}..."
        print(f"✓ Signature PRESERVED after reload/GET: Yes")
        
        # CRITICAL: Verify signatureRotation is returned in GET response
        assert "signatureRotation" in data, "GET response should include signatureRotation field"
        rotation_returned = data.get("signatureRotation")
        assert rotation_returned == 90, f"SignatureRotation should be 90 after GET. Got: {rotation_returned}"
        print(f"✓ SignatureRotation PRESERVED after reload/GET: {rotation_returned}")
        
        # CRITICAL: Verify bank details are returned in GET response
        from_data = data.get("from") or data.get("fromAddress", {})
        bank_returned = from_data.get("bank")
        bank_account_returned = from_data.get("bankAccount")
        
        assert bank_returned == "Bancolombia", f"Bank should be preserved after GET. Got: {bank_returned}"
        assert bank_account_returned == "123-456789-01", f"BankAccount should be preserved after GET. Got: {bank_account_returned}"
        print(f"✓ Bank details PRESERVED after reload/GET: {bank_returned} - {bank_account_returned}")
        
        return invoice_id
    
    def test_update_cuenta_cobro_signature_and_bank(self, auth_headers, cuenta_cobro_with_signature_and_bank):
        """Test updating signature and bank details"""
        # Create initial Cuenta de Cobro
        create_response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=cuenta_cobro_with_signature_and_bank
        )
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        print(f"✓ Created Cuenta de Cobro for update test: {invoice_id}")
        
        # Update with new signature and bank details
        updated_data = cuenta_cobro_with_signature_and_bank.copy()
        updated_data["signature"] = UPDATED_SIGNATURE_BASE64
        updated_data["signatureRotation"] = 180
        updated_data["from"]["bank"] = "Davivienda"
        updated_data["from"]["bankAccount"] = "999-888777-66"
        
        update_response = requests.put(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            headers=auth_headers,
            json=updated_data
        )
        assert update_response.status_code == 200, f"Failed to update invoice: {update_response.text}"
        
        # Verify update response
        updated = update_response.json()
        assert updated.get("signature") == UPDATED_SIGNATURE_BASE64, "Updated signature not in response"
        assert updated.get("signatureRotation") == 180, "Updated signatureRotation not in response"
        print(f"✓ Update response contains updated signature and rotation")
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        final_data = get_response.json()
        
        # Verify updated fields
        assert final_data.get("signature") == UPDATED_SIGNATURE_BASE64, "Updated signature not persisted"
        assert final_data.get("signatureRotation") == 180, "Updated signatureRotation not persisted"
        
        from_data = final_data.get("from") or final_data.get("fromAddress", {})
        assert from_data.get("bank") == "Davivienda", "Updated bank not persisted"
        assert from_data.get("bankAccount") == "999-888777-66", "Updated bankAccount not persisted"
        
        print(f"✓ All updated fields persisted correctly after GET")
    
    def test_cuenta_cobro_without_signature(self, auth_headers):
        """Test creating a Cuenta de Cobro without signature works"""
        data = {
            "number": f"COB-{uuid.uuid4().hex[:6]}",
            "date": "2025-01-15",
            "dueDate": "2025-02-15",
            "status": "pending",
            "documentType": "bill",
            "from": {
                "name": "EMPRESA SIN FIRMA",
                "nit": "123.456.789-0",
                "email": "nosig@test.com"
            },
            "to": {
                "name": "CLIENTE TEST",
                "email": "client@test.com"
            },
            "items": [{"description": "Servicio", "quantity": 1, "rate": 100000, "amount": 100000}],
            "subtotal": 100000,
            "taxRate": 0,
            "tax": 0,
            "total": 100000,
            "hasTax": False,
            "template": 4
            # No signature field
        }
        
        response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=data
        )
        assert response.status_code == 200
        result = response.json()
        
        # Should work without signature
        assert "id" in result
        # Signature should be null/empty
        assert result.get("signature") in [None, "", "null"]
        print(f"✓ Cuenta de Cobro without signature created successfully")
    
    def test_cuenta_cobro_with_empty_signature_rotation(self, auth_headers):
        """Test that signatureRotation defaults to 0 when not provided"""
        data = {
            "number": f"COB-{uuid.uuid4().hex[:6]}",
            "date": "2025-01-15",
            "dueDate": "2025-02-15",
            "status": "pending",
            "documentType": "bill",
            "from": {
                "name": "EMPRESA TEST",
                "nit": "111.222.333-4"
            },
            "to": {
                "name": "CLIENTE",
                "email": "test@test.com"
            },
            "items": [{"description": "Test", "quantity": 1, "rate": 50000, "amount": 50000}],
            "subtotal": 50000,
            "taxRate": 0,
            "tax": 0,
            "total": 50000,
            "hasTax": False,
            "template": 4,
            "signature": TEST_SIGNATURE_BASE64
            # No signatureRotation provided
        }
        
        response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers,
            json=data
        )
        assert response.status_code == 200
        result = response.json()
        
        # signatureRotation should default to 0
        assert result.get("signatureRotation") in [0, None], f"signatureRotation should default to 0. Got: {result.get('signatureRotation')}"
        print(f"✓ signatureRotation defaults correctly: {result.get('signatureRotation', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
