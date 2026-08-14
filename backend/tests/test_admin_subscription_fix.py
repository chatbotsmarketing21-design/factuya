"""Tests for admin auto-repair of subscription in GET /api/subscription/status
and regression for /api/admin/grant-premium.
"""
import os
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("/app/backend/.env"))

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # Fallback: read frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

ADMIN_EMAIL = "soportefactuya@gmail.com"
ADMIN_PASSWORD = "71361451"
NORMAL_EMAIL = "test@test.com"
NORMAL_PASSWORD = "Test123!"
GIFT_EMAIL = "free-test@test.com"

mongo = MongoClient(os.environ["MONGO_URL"])
db = mongo[os.environ["DB_NAME"]]


def login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    return r


@pytest.fixture(scope="module")
def admin_token():
    r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_user_id():
    u = db.users.find_one({"email": ADMIN_EMAIL})
    assert u, "Admin user missing in DB"
    return u["id"]


@pytest.fixture(scope="module")
def normal_token():
    r = login(NORMAL_EMAIL, NORMAL_PASSWORD)
    if r.status_code != 200:
        pytest.skip(f"Normal user login failed: {r.status_code} {r.text}")
    return r.json()["token"]


# ---------- BUG FIX: admin auto-repair ----------
class TestAdminAutoRepair:
    def test_delete_admin_sub_then_status_recreates_active(self, admin_token, admin_user_id):
        # Delete admin subscription
        db.subscriptions.delete_many({"userId": admin_user_id})
        assert db.subscriptions.find_one({"userId": admin_user_id}) is None

        # Call status endpoint
        r = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "active"
        assert data["hasActiveSubscription"] is True
        assert data["canCreateInvoice"] is True
        assert data["daysRemaining"] is not None
        assert data["daysRemaining"] > 30000, f"daysRemaining should be huge, got {data['daysRemaining']}"

        # Verify DB upsert
        sub = db.subscriptions.find_one({"userId": admin_user_id})
        assert sub is not None
        assert sub["status"] == "active"
        assert sub["planId"] == "premium_gift"

    def test_admin_status_when_already_active_untouched_plan(self, admin_token, admin_user_id):
        # Should keep active, still returns active
        r = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=20,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "active"


# ---------- REGRESSION: normal user unaffected ----------
class TestNormalUserRegression:
    def test_normal_user_status_not_gifted(self, normal_token):
        r = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {normal_token}"},
            timeout=20,
        )
        assert r.status_code == 200
        data = r.json()
        # Get user id
        u = db.users.find_one({"email": NORMAL_EMAIL})
        assert u
        sub = db.subscriptions.find_one({"userId": u["id"]})
        # Fix should NOT have set premium_gift on this user unless previously gifted by admin
        if sub:
            # It might legitimately be premium_annual/premium_monthly/gift set by admin previously
            # but must not have giftedBy == "system:admin_auto"
            assert sub.get("giftedBy") != "system:admin_auto", "Normal user got admin-auto gift!"
        print(f"Normal user sub: status={data['status']}, planId={sub.get('planId') if sub else None}")


# ---------- REGRESSION: grant-premium ----------
class TestGrantPremium:
    def test_grant_premium_admin_success(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/grant-premium",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"email": GIFT_EMAIL, "duration": "1m"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["email"] == GIFT_EMAIL
        assert data["duration"] == "1m"
        assert data["premiumUntil"] is not None

    def test_grant_premium_forbidden_for_non_admin(self, normal_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/grant-premium",
            headers={"Authorization": f"Bearer {normal_token}"},
            json={"email": GIFT_EMAIL, "duration": "1m"},
            timeout=20,
        )
        assert r.status_code == 403, r.text

    def test_grant_premium_unauthenticated(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/grant-premium",
            json={"email": GIFT_EMAIL, "duration": "1m"},
            timeout=20,
        )
        assert r.status_code in (401, 403), r.text
