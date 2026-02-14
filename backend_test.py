#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Invoice Home Clone
Tests all authentication, invoice, and profile endpoints
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://factuya-preview.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class InvoiceAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_invoice_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'response_data': response_data
        })
        
    def test_health_check(self):
        """Test API health check"""
        try:
            response = self.session.get(f"{API_BASE}/")
            if response.status_code == 200:
                data = response.json()
                self.log_result("Health Check", True, f"API is healthy: {data.get('message')}")
                return True
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration"""
        test_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
        test_data = {
            "email": test_email,
            "password": "SecurePass123!",
            "name": "John Doe",
            "companyName": "Acme Corporation"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/auth/register", json=test_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('token')
                self.user_id = data.get('user', {}).get('id')
                
                # Set authorization header for future requests
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                
                self.log_result("User Registration", True, 
                              f"User created successfully. ID: {self.user_id}")
                return True
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("User Registration", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("User Registration", False, f"Exception: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login with existing credentials"""
        # First create a user to login with
        test_email = f"logintest_{uuid.uuid4().hex[:8]}@example.com"
        register_data = {
            "email": test_email,
            "password": "LoginTest123!",
            "name": "Login Test User",
            "companyName": "Test Company"
        }
        
        try:
            # Register user first
            reg_response = self.session.post(f"{API_BASE}/auth/register", json=register_data)
            if reg_response.status_code != 200:
                self.log_result("User Login", False, "Failed to create test user for login")
                return False
            
            # Now test login
            login_data = {
                "email": test_email,
                "password": "LoginTest123!"
            }
            
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('token')
                user = data.get('user', {})
                
                if token and user.get('email') == test_email:
                    self.log_result("User Login", True, 
                                  f"Login successful for user: {user.get('name')}")
                    return True
                else:
                    self.log_result("User Login", False, "Invalid response structure")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("User Login", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("User Login", False, f"Exception: {str(e)}")
            return False
    
    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.auth_token:
            self.log_result("Get Current User", False, "No auth token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('id') and data.get('email'):
                    self.log_result("Get Current User", True, 
                                  f"Retrieved user: {data.get('name')} ({data.get('email')})")
                    return True
                else:
                    self.log_result("Get Current User", False, "Invalid user data structure")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Get Current User", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Get Current User", False, f"Exception: {str(e)}")
            return False
    
    def test_create_invoice(self):
        """Test creating a new invoice"""
        if not self.auth_token:
            self.log_result("Create Invoice", False, "No auth token available")
            return False
        
        # Create realistic invoice data
        invoice_data = {
            "number": f"INV-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "dueDate": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            "status": "pending",
            "from": {
                "name": "Acme Corporation",
                "email": "billing@acme.com",
                "phone": "+1-555-0123",
                "address": "123 Business St",
                "city": "New York",
                "state": "NY",
                "zip": "10001",
                "country": "USA"
            },
            "to": {
                "name": "Client Company Ltd",
                "email": "accounts@client.com",
                "phone": "+1-555-0456",
                "address": "456 Client Ave",
                "city": "Los Angeles",
                "state": "CA",
                "zip": "90210",
                "country": "USA"
            },
            "items": [
                {
                    "description": "Web Development Services",
                    "quantity": 40.0,
                    "rate": 125.0,
                    "amount": 5000.0
                },
                {
                    "description": "UI/UX Design",
                    "quantity": 20.0,
                    "rate": 100.0,
                    "amount": 2000.0
                }
            ],
            "subtotal": 7000.0,
            "taxRate": 8.5,
            "tax": 595.0,
            "total": 7595.0,
            "notes": "Thank you for your business!",
            "terms": "Payment due within 30 days",
            "template": 1
        }
        
        try:
            response = self.session.post(f"{API_BASE}/invoices", json=invoice_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_invoice_id = data.get('id')
                
                if self.test_invoice_id and data.get('number') == invoice_data['number']:
                    self.log_result("Create Invoice", True, 
                                  f"Invoice created successfully. ID: {self.test_invoice_id}")
                    return True
                else:
                    self.log_result("Create Invoice", False, "Invalid invoice response structure")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Create Invoice", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Create Invoice", False, f"Exception: {str(e)}")
            return False
    
    def test_get_all_invoices(self):
        """Test getting all invoices for user"""
        if not self.auth_token:
            self.log_result("Get All Invoices", False, "No auth token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/invoices")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get All Invoices", True, 
                                  f"Retrieved {len(data)} invoices")
                    return True
                else:
                    self.log_result("Get All Invoices", False, "Response is not a list")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Get All Invoices", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Get All Invoices", False, f"Exception: {str(e)}")
            return False
    
    def test_get_invoice_stats(self):
        """Test getting invoice statistics"""
        if not self.auth_token:
            self.log_result("Get Invoice Stats", False, "No auth token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/invoices/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['totalRevenue', 'totalInvoices', 'paidInvoices', 
                                 'pendingInvoices', 'draftInvoices', 'overdueInvoices']
                
                if all(field in data for field in required_fields):
                    self.log_result("Get Invoice Stats", True, 
                                  f"Stats: {data['totalInvoices']} invoices, ${data['totalRevenue']} revenue")
                    return True
                else:
                    self.log_result("Get Invoice Stats", False, "Missing required stats fields")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Get Invoice Stats", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Get Invoice Stats", False, f"Exception: {str(e)}")
            return False
    
    def test_get_single_invoice(self):
        """Test getting a specific invoice by ID"""
        if not self.auth_token:
            self.log_result("Get Single Invoice", False, "No auth token available")
            return False
            
        if not self.test_invoice_id:
            self.log_result("Get Single Invoice", False, "No test invoice ID available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/invoices/{self.test_invoice_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('id') == self.test_invoice_id:
                    self.log_result("Get Single Invoice", True, 
                                  f"Retrieved invoice: {data.get('number')}")
                    return True
                else:
                    self.log_result("Get Single Invoice", False, "Invoice ID mismatch")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Get Single Invoice", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Get Single Invoice", False, f"Exception: {str(e)}")
            return False
    
    def test_update_invoice(self):
        """Test updating an existing invoice"""
        if not self.auth_token:
            self.log_result("Update Invoice", False, "No auth token available")
            return False
            
        if not self.test_invoice_id:
            self.log_result("Update Invoice", False, "No test invoice ID available")
            return False
        
        # Updated invoice data
        update_data = {
            "number": f"INV-UPDATED-{uuid.uuid4().hex[:6].upper()}",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "dueDate": (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d'),
            "status": "paid",
            "from": {
                "name": "Acme Corporation Updated",
                "email": "billing@acme.com",
                "phone": "+1-555-0123",
                "address": "123 Business St",
                "city": "New York",
                "state": "NY",
                "zip": "10001",
                "country": "USA"
            },
            "to": {
                "name": "Client Company Ltd",
                "email": "accounts@client.com",
                "phone": "+1-555-0456",
                "address": "456 Client Ave",
                "city": "Los Angeles",
                "state": "CA",
                "zip": "90210",
                "country": "USA"
            },
            "items": [
                {
                    "description": "Updated Web Development Services",
                    "quantity": 50.0,
                    "rate": 130.0,
                    "amount": 6500.0
                }
            ],
            "subtotal": 6500.0,
            "taxRate": 8.5,
            "tax": 552.5,
            "total": 7052.5,
            "notes": "Updated invoice - Thank you for your business!",
            "terms": "Payment due within 45 days",
            "template": 1
        }
        
        try:
            response = self.session.put(f"{API_BASE}/invoices/{self.test_invoice_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('number') == update_data['number'] and data.get('status') == 'paid':
                    self.log_result("Update Invoice", True, 
                                  f"Invoice updated successfully. New number: {data.get('number')}")
                    return True
                else:
                    self.log_result("Update Invoice", False, "Update data not reflected in response")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Update Invoice", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Update Invoice", False, f"Exception: {str(e)}")
            return False
    
    def test_get_company_profile(self):
        """Test getting company profile information"""
        if not self.auth_token:
            self.log_result("Get Company Profile", False, "No auth token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/profile/company")
            
            if response.status_code == 200:
                data = response.json()
                # Company info might be empty initially, so just check if it's a valid response
                self.log_result("Get Company Profile", True, 
                              f"Company profile retrieved. Name: {data.get('name', 'Not set')}")
                return True
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Get Company Profile", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Get Company Profile", False, f"Exception: {str(e)}")
            return False
    
    def test_update_company_profile(self):
        """Test updating company profile information"""
        if not self.auth_token:
            self.log_result("Update Company Profile", False, "No auth token available")
            return False
        
        company_data = {
            "name": "Updated Acme Corporation",
            "email": "updated@acme.com",
            "phone": "+1-555-9999",
            "address": "789 Updated Business Blvd",
            "city": "San Francisco",
            "state": "CA",
            "zip": "94105",
            "country": "USA"
        }
        
        try:
            response = self.session.put(f"{API_BASE}/profile/company", json=company_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('name') == company_data['name'] and data.get('email') == company_data['email']:
                    self.log_result("Update Company Profile", True, 
                                  f"Company profile updated. Name: {data.get('name')}")
                    return True
                else:
                    self.log_result("Update Company Profile", False, "Update data not reflected in response")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Update Company Profile", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Update Company Profile", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_invoice(self):
        """Test deleting an invoice"""
        if not self.auth_token:
            self.log_result("Delete Invoice", False, "No auth token available")
            return False
            
        if not self.test_invoice_id:
            self.log_result("Delete Invoice", False, "No test invoice ID available")
            return False
            
        try:
            response = self.session.delete(f"{API_BASE}/invoices/{self.test_invoice_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('message'):
                    self.log_result("Delete Invoice", True, 
                                  f"Invoice deleted successfully: {data.get('message')}")
                    return True
                else:
                    self.log_result("Delete Invoice", False, "No success message in response")
                    return False
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                self.log_result("Delete Invoice", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Delete Invoice", False, f"Exception: {str(e)}")
            return False
    
    def test_authentication_required(self):
        """Test that protected endpoints require authentication"""
        # Create a session without auth token
        unauth_session = requests.Session()
        
        protected_endpoints = [
            ("/auth/me", "GET"),
            ("/invoices", "GET"),
            ("/invoices/stats", "GET"),
            ("/profile/company", "GET")
        ]
        
        all_protected = True
        for endpoint, method in protected_endpoints:
            try:
                if method == "GET":
                    response = unauth_session.get(f"{API_BASE}{endpoint}")
                
                if response.status_code == 401 or response.status_code == 403:
                    continue  # Good, endpoint is protected
                else:
                    all_protected = False
                    break
                    
            except Exception:
                all_protected = False
                break
        
        self.log_result("Authentication Required", all_protected, 
                      "All protected endpoints require authentication" if all_protected 
                      else "Some endpoints are not properly protected")
        return all_protected
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"\n🚀 Starting Invoice Home API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_current_user,
            self.test_create_invoice,
            self.test_get_all_invoices,
            self.test_get_invoice_stats,
            self.test_get_single_invoice,
            self.test_update_invoice,
            self.test_get_company_profile,
            self.test_update_company_profile,
            self.test_delete_invoice,
            self.test_authentication_required
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            if test():
                passed += 1
            else:
                failed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['message']}")
        
        return passed, failed

def main():
    """Main test execution"""
    tester = InvoiceAPITester()
    passed, failed = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()