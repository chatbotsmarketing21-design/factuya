"""Geolocation endpoint to detect a user's country from their IP.

Used to choose the optimal payment gateway:
- Colombia (CO) -> Wompi (PSE, Nequi, local cards, lower fees)
- Everywhere else -> Stripe (handles automatic currency conversion)
"""
from fastapi import APIRouter, Request
import httpx

router = APIRouter(prefix="/geo", tags=["Geolocation"])


def _client_ip(request: Request) -> str:
    """Extract the real client IP, accounting for reverse-proxy headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First IP in the chain is the original client
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else ""


@router.get("/detect")
async def detect_country(request: Request):
    """Detect the user's country from their IP address.

    Returns:
        country_code: ISO 3166-1 alpha-2 (e.g., "CO", "US", "MX")
        country_name: Full English country name
        gateway: "wompi" if user is in Colombia, otherwise "stripe"
        ip: The detected IP (for transparency)
    """
    ip = _client_ip(request)

    # Local/private IPs (development) -> assume Colombia for testing convenience
    if not ip or ip.startswith(("127.", "10.", "192.168.", "172.")) or ip == "::1":
        return {
            "country_code": "CO",
            "country_name": "Colombia",
            "gateway": "wompi",
            "ip": ip or "local",
            "source": "local-fallback",
        }

    # Try ipapi.co (free tier: 1k requests/day, no key required)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"https://ipapi.co/{ip}/json/")
            if resp.status_code == 200:
                data = resp.json()
                country_code = (data.get("country_code") or "").upper()
                if country_code:
                    return {
                        "country_code": country_code,
                        "country_name": data.get("country_name") or country_code,
                        "gateway": "wompi" if country_code == "CO" else "stripe",
                        "ip": ip,
                        "source": "ipapi.co",
                    }
    except Exception as e:
        print(f"[Geo] ipapi.co error: {e}")

    # Fallback: ip-api.com (free, no key, 45 requests/min/IP)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"http://ip-api.com/json/{ip}?fields=status,countryCode,country")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    country_code = (data.get("countryCode") or "").upper()
                    if country_code:
                        return {
                            "country_code": country_code,
                            "country_name": data.get("country") or country_code,
                            "gateway": "wompi" if country_code == "CO" else "stripe",
                            "ip": ip,
                            "source": "ip-api.com",
                        }
    except Exception as e:
        print(f"[Geo] ip-api.com error: {e}")

    # Last resort: default to Stripe (international) so users can still pay
    return {
        "country_code": "XX",
        "country_name": "Unknown",
        "gateway": "stripe",
        "ip": ip,
        "source": "fallback",
    }
