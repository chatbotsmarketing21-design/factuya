"""Tests for Product Catalog CRUD (/api/products)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://factuya-invoices.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "test@test.com"
PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def cleanup(headers):
    # cleanup TEST_ products before/after
    def _wipe():
        try:
            r = requests.get(f"{API}/products?search=TEST_", headers=headers, timeout=30)
            if r.status_code == 200:
                for p in r.json():
                    if p["description"].startswith("TEST_"):
                        requests.delete(f"{API}/products/{p['id']}", headers=headers, timeout=30)
        except Exception:
            pass
    _wipe()
    yield
    _wipe()


def test_unauth_returns_401_or_403():
    r = requests.get(f"{API}/products", timeout=30)
    assert r.status_code in (401, 403), r.status_code


def test_create_empty_description_400(headers):
    r = requests.post(f"{API}/products", headers=headers, json={"description": "  "})
    assert r.status_code == 400


def test_create_list_update_delete(headers):
    # CREATE
    payload = {"code": "TEST_C1", "description": "TEST_Producto uno", "price": 15000, "unit": "und"}
    r = requests.post(f"{API}/products", headers=headers, json=payload)
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["code"] == "TEST_C1"
    assert p["description"] == "TEST_Producto uno"
    assert p["price"] == 15000
    assert p["unit"] == "und"
    pid = p["id"]

    # LIST
    r = requests.get(f"{API}/products", headers=headers)
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert pid in ids

    # SEARCH by code
    r = requests.get(f"{API}/products?search=TEST_C1", headers=headers)
    assert r.status_code == 200
    assert any(x["id"] == pid for x in r.json())

    # SEARCH by description case-insensitive
    r = requests.get(f"{API}/products?search=producto uno", headers=headers)
    assert r.status_code == 200
    assert any(x["id"] == pid for x in r.json())

    # UPDATE
    r = requests.put(f"{API}/products/{pid}", headers=headers,
                     json={"code": "TEST_C1B", "description": "TEST_Producto uno mod", "price": 20000, "unit": "kg"})
    assert r.status_code == 200
    assert r.json()["price"] == 20000
    assert r.json()["description"] == "TEST_Producto uno mod"

    # Verify persisted
    r = requests.get(f"{API}/products?search=TEST_C1B", headers=headers)
    assert any(x["id"] == pid and x["price"] == 20000 for x in r.json())

    # DELETE
    r = requests.delete(f"{API}/products/{pid}", headers=headers)
    assert r.status_code == 200

    # 404 after delete
    r = requests.put(f"{API}/products/{pid}", headers=headers,
                     json={"description": "TEST_x"})
    assert r.status_code == 404
    r = requests.delete(f"{API}/products/{pid}", headers=headers)
    assert r.status_code == 404


def test_update_delete_nonexistent(headers):
    fake = "00000000-0000-0000-0000-000000000000"
    r = requests.put(f"{API}/products/{fake}", headers=headers, json={"description": "TEST_x"})
    assert r.status_code == 404
    r = requests.delete(f"{API}/products/{fake}", headers=headers)
    assert r.status_code == 404
