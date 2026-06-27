"""Tests for /api/notifications/* endpoints + welcome trigger on register.

Covers:
- Admin email-based gating for /broadcast (fix from role==admin → email match)
- CRUD: list, unread-count, mark read, read-all, delete
- Welcome notification auto-creation on POST /api/auth/register
"""

import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://factuya-invoices.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "soportefactuya@gmail.com"
ADMIN_PASSWORD = "71361451"
USER_EMAIL = "test@test.com"
USER_PASSWORD = "Test123!"


# ----------------------- helpers / fixtures -----------------------

def _login(email: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def user_token():
    return _login(USER_EMAIL, USER_PASSWORD)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ------------------------- Broadcast (admin-only) -------------------------

class TestBroadcast:
    def test_broadcast_with_admin_returns_200(self, admin_token, user_token):
        # Capture user's notif count before
        before = requests.get(f"{API}/notifications/unread-count", headers=_auth(user_token), timeout=15)
        assert before.status_code == 200
        before_n = before.json()["count"]

        title = f"TEST_BROADCAST_{uuid.uuid4().hex[:8]}"
        payload = {
            "title": title,
            "body": "Pytest broadcast verification",
            "link": "/dashboard",
            "type": "promo",
            "icon": "megaphone",
            "accent": "amber",
        }
        r = requests.post(
            f"{API}/notifications/broadcast",
            json=payload,
            headers=_auth(admin_token),
            timeout=30,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert isinstance(data.get("sent"), int)
        assert data["sent"] >= 1, f"Expected at least 1 notification sent, got {data['sent']}"

        # Verify the regular user received it
        listing = requests.get(f"{API}/notifications/", headers=_auth(user_token), timeout=15)
        assert listing.status_code == 200
        items = listing.json()
        assert any(n["title"] == title for n in items), \
            f"Broadcast title '{title}' not found in user notifications"

        # unread count increased
        after = requests.get(f"{API}/notifications/unread-count", headers=_auth(user_token), timeout=15)
        assert after.status_code == 200
        assert after.json()["count"] >= before_n + 1

    def test_broadcast_with_non_admin_returns_403(self, user_token):
        r = requests.post(
            f"{API}/notifications/broadcast",
            json={"title": "TEST_NONADMIN", "body": "should fail"},
            headers=_auth(user_token),
            timeout=15,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        assert "Admin only" in r.text

    def test_broadcast_without_auth_returns_401_or_403(self):
        r = requests.post(
            f"{API}/notifications/broadcast",
            json={"title": "x", "body": "x"},
            timeout=15,
        )
        assert r.status_code in (401, 403)


# ------------------------- List / unread / read / delete -------------------------

class TestNotificationCRUD:
    def test_unread_count_returns_int(self, user_token):
        r = requests.get(f"{API}/notifications/unread-count", headers=_auth(user_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0

    def test_list_returns_only_own_notifications_sorted_desc(self, user_token, admin_token):
        # user list
        r_user = requests.get(f"{API}/notifications/", headers=_auth(user_token), timeout=15)
        assert r_user.status_code == 200
        user_items = r_user.json()
        assert isinstance(user_items, list)

        # admin list
        r_admin = requests.get(f"{API}/notifications/", headers=_auth(admin_token), timeout=15)
        assert r_admin.status_code == 200
        admin_items = r_admin.json()

        # Sort check (desc by createdAt)
        if len(user_items) >= 2:
            dates = [n["createdAt"] for n in user_items]
            assert dates == sorted(dates, reverse=True), "Notifications not sorted descending"

        # Cross-user isolation: ids returned to user should not appear in admin's list
        user_ids = {n["id"] for n in user_items}
        admin_ids = {n["id"] for n in admin_items}
        overlap = user_ids & admin_ids
        assert not overlap, f"User and admin share notification ids (data leak): {overlap}"

    def test_mark_one_as_read(self, user_token, admin_token):
        # Create a fresh broadcast so the user has a guaranteed unread
        title = f"TEST_READ_{uuid.uuid4().hex[:8]}"
        bc = requests.post(
            f"{API}/notifications/broadcast",
            json={"title": title, "body": "x"},
            headers=_auth(admin_token),
            timeout=20,
        )
        assert bc.status_code == 200

        listing = requests.get(f"{API}/notifications/", headers=_auth(user_token), timeout=15)
        target = next((n for n in listing.json() if n["title"] == title), None)
        assert target is not None, "Target notification not found"
        assert target["readAt"] is None

        r = requests.post(
            f"{API}/notifications/{target['id']}/read",
            headers=_auth(user_token),
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # Re-list and verify readAt is set
        re = requests.get(f"{API}/notifications/", headers=_auth(user_token), timeout=15)
        updated = next((n for n in re.json() if n["id"] == target["id"]), None)
        assert updated is not None
        assert updated["readAt"] is not None, "readAt should be set after mark-as-read"

    def test_read_all(self, user_token, admin_token):
        # Push a couple new broadcasts so there are unread items
        for i in range(2):
            requests.post(
                f"{API}/notifications/broadcast",
                json={"title": f"TEST_RA_{uuid.uuid4().hex[:6]}_{i}", "body": "x"},
                headers=_auth(admin_token),
                timeout=20,
            )

        r = requests.post(f"{API}/notifications/read-all", headers=_auth(user_token), timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        assert isinstance(body.get("updated"), int)
        assert body["updated"] >= 0

        # Now unread-count should be 0
        c = requests.get(f"{API}/notifications/unread-count", headers=_auth(user_token), timeout=15)
        assert c.status_code == 200
        assert c.json()["count"] == 0

    def test_delete_notification_own(self, user_token, admin_token):
        title = f"TEST_DEL_{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{API}/notifications/broadcast",
            json={"title": title, "body": "x"},
            headers=_auth(admin_token),
            timeout=20,
        )
        listing = requests.get(f"{API}/notifications/", headers=_auth(user_token), timeout=15)
        target = next((n for n in listing.json() if n["title"] == title), None)
        assert target is not None

        d = requests.delete(f"{API}/notifications/{target['id']}", headers=_auth(user_token), timeout=15)
        assert d.status_code == 200
        assert d.json().get("ok") is True

        # 2nd delete should now 404
        d2 = requests.delete(f"{API}/notifications/{target['id']}", headers=_auth(user_token), timeout=15)
        assert d2.status_code == 404

    def test_delete_other_users_notification_returns_404(self, user_token, admin_token):
        # Create a notification specifically for admin (broadcast → all). Pick admin's own.
        title = f"TEST_FOREIGN_{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{API}/notifications/broadcast",
            json={"title": title, "body": "x"},
            headers=_auth(admin_token),
            timeout=20,
        )
        admin_list = requests.get(f"{API}/notifications/", headers=_auth(admin_token), timeout=15).json()
        admin_notif = next((n for n in admin_list if n["title"] == title), None)
        assert admin_notif is not None

        # User tries to delete admin's notification -> 404 (not 200, not 403)
        r = requests.delete(f"{API}/notifications/{admin_notif['id']}", headers=_auth(user_token), timeout=15)
        assert r.status_code == 404


# ------------------------- Welcome trigger on register -------------------------

class TestWelcomeNotification:
    def test_register_creates_welcome_notification(self):
        email = f"TEST_welcome_{uuid.uuid4().hex[:10]}@example.com"
        password = "Test123!"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": password, "name": "TEST Welcome"},
            timeout=30,
        )
        assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
        token = r.json()["token"]

        # Fetch notifications
        lst = requests.get(f"{API}/notifications/", headers=_auth(token), timeout=15)
        assert lst.status_code == 200
        items = lst.json()
        assert len(items) >= 1, "Expected at least one notification after register"

        welcome = next((n for n in items if n.get("type") == "welcome"), None)
        assert welcome is not None, f"No 'welcome' notification found. Got: {[n.get('type') for n in items]}"
        assert welcome["link"] == "/subscription?coupon=LANZAMIENTO50"
        assert welcome["readAt"] is None

        # Cleanup: delete the test user account
        try:
            requests.delete(
                f"{API}/auth/account",
                headers=_auth(token),
                json={"password": password, "confirmation": "ELIMINAR"},
                timeout=20,
            )
        except Exception:
            pass
