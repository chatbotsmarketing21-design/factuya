"""
FactuYa! Google OAuth Tests
Tests for Google OAuth authentication flow - session_id processing
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGoogleAuthEndpoint:
    """Google OAuth session endpoint tests"""
    
    def test_api_health(self):
        """Test API is running before Google auth tests"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API health check passed: {data}")
    
    def test_google_session_endpoint_exists(self):
        """Test that the /api/auth/google/session endpoint exists and accepts POST"""
        # Send empty body - should get 422 (validation error) not 404
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={})
        assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}: {response.text}"
        print(f"✓ Google session endpoint exists - returns 422 for invalid data")
    
    def test_google_session_missing_session_id(self):
        """Test that missing session_id returns validation error"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "invalid_field": "test"
        })
        assert response.status_code == 422
        print(f"✓ Missing session_id correctly returns 422 validation error")
    
    def test_google_session_invalid_session_id(self):
        """Test that invalid session_id returns error"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "session_id": "invalid_session_id_12345"
        })
        # Should return 401 (invalid session from Emergent auth) or 500 (auth service error) or 520 (cloudflare error)
        assert response.status_code in [401, 500, 520], f"Expected 401/500/520, got {response.status_code}: {response.text}"
        print(f"✓ Invalid session_id correctly returns error: {response.status_code}")
    
    def test_google_logout_endpoint_exists(self):
        """Test that the /api/auth/google/logout endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/google/logout")
        # Should return 200 even without session - just clears cookie
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Google logout endpoint exists and works: {data}")


class TestRegularAuthStillWorks:
    """Verify regular email/password auth still works after Google auth changes"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for auth tests"""
        unique_email = f"googleauth_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Google Auth Test User"
        })
        if response.status_code == 200:
            data = response.json()
            return {
                "email": unique_email,
                "password": "TestPassword123!",
                "token": data["token"],
                "user": data["user"]
            }
        pytest.skip(f"Could not create test user: {response.text}")
    
    def test_register_still_works(self):
        """Test that email/password registration still works"""
        unique_email = f"reg_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Registration Test User"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Email/password registration works: {data['user']['email']}")
    
    def test_login_still_works(self, test_user):
        """Test that email/password login still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user["email"],
            "password": test_user["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Email/password login works: {data['user']['email']}")
    
    def test_get_me_still_works(self, test_user):
        """Test that /api/auth/me still works with token"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user["email"]
        print(f"✓ Get current user works: {data['email']}")


class TestSubscriptionForNewUsers:
    """Test that subscription is created for new users (both email and Google auth)"""
    
    def test_new_user_has_trial_subscription(self):
        """Test that a new email user gets trial subscription"""
        unique_email = f"sub_check_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register new user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Subscription Check User"
        })
        assert reg_response.status_code == 200
        token = reg_response.json()["token"]
        
        # Check subscription status
        headers = {"Authorization": f"Bearer {token}"}
        sub_response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        assert sub_response.status_code == 200
        
        data = sub_response.json()
        assert data["status"] == "trialing"
        assert data["invoicesUsed"] == 0
        assert data["maxInvoices"] == 10
        assert data["canCreateInvoice"] == True
        print(f"✓ New user has trial subscription: {data['status']}, invoices: {data['invoicesUsed']}/{data['maxInvoices']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
