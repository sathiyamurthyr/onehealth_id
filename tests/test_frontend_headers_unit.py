"""
Unit & Configuration Test: Frontend Security Headers & Camera Policy
Verifies that:
1. Permissions-Policy allows camera=(self) only for OH-ID origin, while
   disabling microphone, geolocation, and browsing-topics.
2. X-Powered-By header is explicitly disabled (poweredByHeader: false).
3. HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy are preserved.
4. FastAPI API response security headers remain intact.
"""

import os
import re
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_nextjs_config_camera_policy_and_security_headers():
    """Verify that frontend/next.config.ts correctly defines security headers."""
    next_config_path = Path(__file__).resolve().parent.parent / "frontend" / "next.config.ts"
    assert next_config_path.exists(), f"next.config.ts not found at {next_config_path}"
    
    content = next_config_path.read_text(encoding="utf-8")

    # 1. Verify poweredByHeader is false
    assert "poweredByHeader: false" in content, "poweredByHeader: false must be explicitly set in NextConfig"

    # 2. Verify Permissions-Policy camera=(self) and dangerous sensors disabled
    perm_policy_match = re.search(r'key:\s*["\']Permissions-Policy["\'],\s*value:\s*["\']([^"\']+)["\']', content)
    assert perm_policy_match is not None, "Permissions-Policy header definition missing in next.config.ts"
    
    policy_value = perm_policy_match.group(1)
    assert "camera=(self)" in policy_value, f"Permissions-Policy must allow camera=(self) for QR scanning, got: {policy_value}"
    assert "microphone=()" in policy_value, f"Permissions-Policy must disable microphone=(), got: {policy_value}"
    assert "geolocation=()" in policy_value, f"Permissions-Policy must disable geolocation=(), got: {policy_value}"
    assert "browsing-topics=()" in policy_value, f"Permissions-Policy must disable browsing-topics=(), got: {policy_value}"

    # 3. Verify Strict-Transport-Security
    assert "Strict-Transport-Security" in content, "HSTS header missing in next.config.ts"
    assert "max-age=63072000" in content, "HSTS max-age must be at least 1 year (63072000)"

    # 4. Verify X-Frame-Options & X-Content-Type-Options
    assert "X-Frame-Options" in content, "X-Frame-Options header missing in next.config.ts"
    assert "SAMEORIGIN" in content, "X-Frame-Options must be SAMEORIGIN"
    assert "X-Content-Type-Options" in content, "X-Content-Type-Options header missing in next.config.ts"
    assert "nosniff" in content, "X-Content-Type-Options must be nosniff"
    assert "Referrer-Policy" in content, "Referrer-Policy header missing in next.config.ts"


def test_fastapi_backend_security_headers_and_csp():
    """Verify FastAPI backend maintains strict defensive security headers."""
    res = client.get("/health")
    assert res.status_code == 200
    
    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") in ("DENY", "SAMEORIGIN")
    assert "Strict-Transport-Security" in headers
    assert "Content-Security-Policy" in headers
    assert "default-src 'self'" in headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in headers["Content-Security-Policy"]
    
    # Verify no X-Powered-By is emitted
    assert "x-powered-by" not in headers, "API responses must not emit X-Powered-By header"
