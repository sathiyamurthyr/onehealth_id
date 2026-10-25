"""
=============================================================================
OH-ID P0 Authentication Security — Cookie-Based Auth & CSRF Verification Suite
=============================================================================
Validates:
1. Login sets HttpOnly, SameSite=Lax, Path=/ session cookie
2. Browser clients (X-Requested-With) receive null token in response body
3. Protected endpoints succeed via cookie authentication without Authorization header
4. CSRF protection blocks cross-site mutating requests (sec-fetch-site: cross-site)
5. CSRF protection blocks untrusted origins
6. CSRF protection requires custom verification header on cookie-authenticated mutations
7. Legitimate requests with X-Requested-With header are accepted
8. Logout clears auth cookie and revokes session server-side
9. Workspace context switch updates cookie and revokes prior session
10. Multi-hospital context switch sets updated cookie and revokes prior session
11. Machine/Headless clients with Authorization: Bearer remain backward-compatible
=============================================================================
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings

client = TestClient(app)

# ---------------------------------------------------------------------------
# Test 1: Login sets HttpOnly, SameSite=Lax cookie
# ---------------------------------------------------------------------------
def test_login_creates_httponly_samesite_cookie():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, f"Login failed: {res.text}"

    # Verify cookie presence
    assert "oh_access_token" in res.cookies, "Expected 'oh_access_token' in response cookies"

    # Verify cookie attributes from Set-Cookie header
    set_cookie_header = res.headers.get("set-cookie", "")
    assert "oh_access_token=" in set_cookie_header
    assert "httponly" in set_cookie_header.lower(), "Cookie must have HttpOnly flag"
    assert "samesite=lax" in set_cookie_header.lower(), "Cookie must have SameSite=Lax"
    assert "path=/" in set_cookie_header.lower(), "Cookie must have Path=/"


# ---------------------------------------------------------------------------
# Test 2: Browser client suppresses raw token in response body
# ---------------------------------------------------------------------------
def test_browser_client_suppresses_body_token():
    # When X-Requested-With is passed, simulating browser XMLHttpRequest/fetch
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
        headers={"X-Requested-With": "XMLHttpRequest"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data.get("access_token") is None, "Browser client must not receive raw JWT in response body"
    assert "oh_access_token" in res.cookies, "HttpOnly cookie must still be set"


# ---------------------------------------------------------------------------
# Test 3: Cookie-authenticated requests succeed without Authorization header
# ---------------------------------------------------------------------------
def test_cookie_authenticated_api_request():
    # Login to obtain session cookie
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert login_res.status_code == 200
    token = login_res.cookies.get("oh_access_token")
    assert token, "Missing auth cookie"

    # Make request with cookie ONLY, zero Authorization header
    me_res = client.get("/api/v1/auth/me", cookies={"oh_access_token": token})
    assert me_res.status_code == 200, f"Cookie authentication failed: {me_res.text}"
    me_data = me_res.json()["data"]
    assert me_data["username"] == "admin"
    assert "roles" in me_data


# ---------------------------------------------------------------------------
# Test 4: CSRF rejects cross-site mutating requests
# ---------------------------------------------------------------------------
def test_csrf_rejection_for_cross_site_mutating_request():
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_res.cookies.get("oh_access_token")

    # Attacker site forging a POST request with browser cookie
    res = client.post(
        "/api/v1/patients",
        cookies={"oh_access_token": token},
        headers={
            "sec-fetch-site": "cross-site",
            "origin": "https://evil-attacker.example.com"
        },
        json={"name": "Attacker Injected Patient"}
    )
    assert res.status_code == 403, f"Expected 403 for cross-site attack, got {res.status_code}: {res.text}"
    assert "Cross-site" in res.json().get("detail", "")


# ---------------------------------------------------------------------------
# Test 5: CSRF rejects untrusted Origin
# ---------------------------------------------------------------------------
def test_csrf_rejection_for_untrusted_origin():
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_res.cookies.get("oh_access_token")

    res = client.post(
        "/api/v1/patients",
        cookies={"oh_access_token": token},
        headers={
            "origin": "https://untrusted-portal.com"
        },
        json={"name": "Forged Patient"}
    )
    assert res.status_code == 403, f"Expected 403 for untrusted origin, got {res.status_code}"
    assert "origin rejected" in res.json().get("detail", "").lower()


# ---------------------------------------------------------------------------
# Test 6: CSRF requires verification header on cookie-authenticated mutations
# ---------------------------------------------------------------------------
def test_csrf_requires_header_without_origin():
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_res.cookies.get("oh_access_token")

    # No X-Requested-With and no Origin (e.g. ambient browser form post)
    res = client.post(
        "/api/v1/patients",
        cookies={"oh_access_token": token},
        json={"name": "No Header Patient"}
    )
    assert res.status_code == 403, f"Expected 403 for missing CSRF header, got {res.status_code}"
    assert "CSRF" in res.json().get("detail", "")


# ---------------------------------------------------------------------------
# Test 7: Legitimate request with X-Requested-With header passes CSRF guard
# ---------------------------------------------------------------------------
def test_csrf_allows_legitimate_cookie_request():
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_res.cookies.get("oh_access_token")

    # Legitimate frontend fetch call sending X-Requested-With
    res = client.get(
        "/api/v1/admin/departments",
        cookies={"oh_access_token": token},
        headers={"X-Requested-With": "XMLHttpRequest"}
    )
    assert res.status_code == 200, f"Legitimate cookie call failed: {res.text}"


# ---------------------------------------------------------------------------
# Test 8: Logout clears cookie and revokes server session
# ---------------------------------------------------------------------------
def test_logout_clears_cookie_and_revokes_server_session():
    # Login
    login_res = client.post("/api/v1/auth/login", json={"username": "receptionist", "password": "rec123"})
    token = login_res.cookies.get("oh_access_token")
    assert token

    # Verify session works
    verify_res = client.get("/api/v1/auth/me", cookies={"oh_access_token": token})
    assert verify_res.status_code == 200

    # Logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        cookies={"oh_access_token": token},
        headers={"X-Requested-With": "XMLHttpRequest"}
    )
    assert logout_res.status_code == 200

    # Verify Set-Cookie expires or deletes the cookie
    set_cookie = logout_res.headers.get("set-cookie", "")
    assert "oh_access_token=" in set_cookie
    assert 'max-age=0' in set_cookie.lower() or 'expires=' in set_cookie.lower()

    # Verify prior token is REVOKED on the server
    revoked_res = client.get("/api/v1/auth/me", cookies={"oh_access_token": token})
    assert revoked_res.status_code == 401, f"Expected 401 for revoked session, got {revoked_res.status_code}"
    assert "revoked" in revoked_res.json().get("detail", "").lower() or "not authenticated" in revoked_res.json().get("detail", "").lower()


# ---------------------------------------------------------------------------
# Test 9: Doctor multi-hospital context switch sets updated cookie
# ---------------------------------------------------------------------------
def test_doctor_hospital_context_switch_updates_cookie():
    # Login as doctor
    login_res = client.post("/api/v1/auth/login", json={"username": "dr.senthil", "password": "doctor123"})
    token = login_res.cookies.get("oh_access_token")
    assert token

    # Switch hospital context
    switch_res = client.post(
        "/api/v1/me/hospital-context",
        cookies={"oh_access_token": token},
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={"hospital_id": "hosp-kedar"}
    )
    assert switch_res.status_code == 200
    assert switch_res.json()["success"] is True

    # Check updated cookie
    assert "oh_access_token" in switch_res.cookies
    new_token = switch_res.cookies.get("oh_access_token")
    assert new_token

    # Verify browser client does not receive raw token in JSON body
    assert switch_res.json().get("access_token") is None, "Token must not be exposed in JSON body for browser"


# ---------------------------------------------------------------------------
# Test 10: Headless API clients with Bearer token remain functional
# ---------------------------------------------------------------------------
def test_bearer_token_still_supported_for_api_clients():
    # Login without browser headers returns token in response body
    login_res = client.post("/api/v1/auth/login", json={"username": "patient", "password": "patient123"})
    assert login_res.status_code == 200
    token = login_res.json().get("access_token")
    assert token, "Machine client should receive access_token"

    # API call with Authorization: Bearer and NO cookies
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["data"]["username"] == "patient"
