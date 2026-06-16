"""One-time bootstrap script to create the PayPal Product and Plan for FactuYa! Premium.

Run this ONCE after configuring PAYPAL_CLIENT_ID and PAYPAL_SECRET in backend/.env.
Outputs the PAYPAL_PLAN_ID that must be added back to backend/.env.

Usage:
    cd /app/backend
    python -m scripts.paypal_bootstrap            # uses sandbox by default
    PAYPAL_MODE=live python -m scripts.paypal_bootstrap
"""
import os
import sys
import httpx
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox').lower()
if PAYPAL_MODE == 'sandbox':
    CLIENT_ID = os.environ.get('PAYPAL_SANDBOX_CLIENT_ID', '')
    SECRET = os.environ.get('PAYPAL_SANDBOX_SECRET', '')
    API_BASE = "https://api-m.sandbox.paypal.com"
else:
    CLIENT_ID = os.environ.get('PAYPAL_LIVE_CLIENT_ID', '')
    SECRET = os.environ.get('PAYPAL_LIVE_SECRET', '')
    API_BASE = "https://api-m.paypal.com"


def get_token() -> str:
    if not CLIENT_ID or not SECRET:
        sys.exit(f"ERROR: PayPal {PAYPAL_MODE} credentials are not set in backend/.env")
    r = httpx.post(
        f"{API_BASE}/v1/oauth2/token",
        auth=(CLIENT_ID, SECRET),
        headers={"Accept": "application/json", "Accept-Language": "en_US"},
        data={"grant_type": "client_credentials"},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def create_product(token: str) -> str:
    r = httpx.post(
        f"{API_BASE}/v1/catalogs/products",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json={
            "name": "FactuYa! Premium",
            "description": "Suscripción mensual a FactuYa! Premium con facturas ilimitadas.",
            "type": "SERVICE",
            "category": "SOFTWARE",
            "image_url": "https://factuya.site/logo.png",
            "home_url": "https://factuya.site",
        },
        timeout=20,
    )
    r.raise_for_status()
    return r.json()["id"]


def create_plan(token: str, product_id: str) -> str:
    r = httpx.post(
        f"{API_BASE}/v1/billing/plans",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json={
            "product_id": product_id,
            "name": "FactuYa! Premium Monthly",
            "description": "Plan mensual de $3.99 USD con renovación automática.",
            "status": "ACTIVE",
            "billing_cycles": [{
                "frequency": {"interval_unit": "MONTH", "interval_count": 1},
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0,  # 0 = infinite
                "pricing_scheme": {
                    "fixed_price": {"value": "3.99", "currency_code": "USD"},
                },
            }],
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "setup_fee": {"value": "0", "currency_code": "USD"},
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3,
            },
        },
        timeout=20,
    )
    r.raise_for_status()
    return r.json()["id"]


def main():
    print(f"PayPal mode: {PAYPAL_MODE}")
    print("Getting access token...")
    token = get_token()
    print("Creating product...")
    product_id = create_product(token)
    print(f"  product_id = {product_id}")
    print("Creating plan...")
    plan_id = create_plan(token, product_id)
    print(f"  plan_id    = {plan_id}")
    print()
    print("DONE. Add this to backend/.env:")
    if PAYPAL_MODE == 'sandbox':
        print(f"  PAYPAL_SANDBOX_PLAN_ID={plan_id}")
    else:
        print(f"  PAYPAL_LIVE_PLAN_ID={plan_id}")


if __name__ == "__main__":
    main()
