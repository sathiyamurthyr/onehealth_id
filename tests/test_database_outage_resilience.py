"""
Automated Test Suite: Database Outage Resilience & Container Configuration Verification
Verifies:
1. Application behavior when database connection fails (graceful failure without secret leakage)
2. Backend Dockerfile enforces non-root UID 10001:10001 and writable directory ownership
3. Docker Compose specifies isolated bridge network, capability drops, and no-new-privileges
4. Zero Docker socket mounts or privileged container modes
"""

import re
import pytest
from pathlib import Path
from unittest.mock import patch
import psycopg2
from fastapi.testclient import TestClient
from backend.app.main import app

def test_database_outage_fails_safely_without_leaking_credentials(monkeypatch):
    """Verify that database connection failures fail cleanly with masked errors and no connection string leaks."""
    safe_client = TestClient(app, raise_server_exceptions=False)
    
    def broken_connect(*args, **kwargs):
        raise psycopg2.OperationalError("connection to server at 'db.supabase.co' failed: Connection refused")

    # Patch psycopg2.connect to simulate database network outage
    monkeypatch.setattr(psycopg2, "connect", broken_connect)

    # Attempt to query verify-qr public endpoint during database outage
    res = safe_client.get("/api/v1/patients/verify-qr/qr-fake-token-123456")
    
    # Must fail safely (HTTP 500)
    assert res.status_code == 500
    
    # Error message must NOT disclose passwords, connection strings, or raw internal IPs
    response_text = res.text.lower()
    assert "password" not in response_text
    assert "postgresql://" not in response_text
    assert "traceback" not in response_text
    assert "supabase.co" not in response_text


def test_dockerfile_enforces_non_root_uid_and_permissions():
    """Verify backend/Dockerfile strictly creates and runs as unprivileged UID 10001:10001."""
    dockerfile_path = Path(__file__).resolve().parent.parent / "backend" / "Dockerfile"
    assert dockerfile_path.exists(), f"Dockerfile not found at {dockerfile_path}"
    
    content = dockerfile_path.read_text(encoding="utf-8")
    
    # 1. Verify user/group 10001 created
    assert "groupadd -g 10001 appgroup" in content
    assert "useradd -u 10001 -g appgroup" in content
    
    # 2. Verify USER directive is 10001:10001
    assert "USER 10001:10001" in content
    
    # 3. Verify directory ownership
    assert "chown -R 10001:10001 /app" in content
    assert "mkdir -p /app/storage/documents/quarantine" in content


def test_docker_compose_isolation_and_security_opts():
    """Verify docker-compose.yml strictly removes host networking and drops capabilities."""
    compose_path = Path(__file__).resolve().parent.parent / "docker-compose.yml"
    assert compose_path.exists(), f"docker-compose.yml not found at {compose_path}"
    
    content = compose_path.read_text(encoding="utf-8")
    
    # 1. Verify network_mode: host is completely absent from backend
    backend_section = content.split("frontend:")[0]
    assert "network_mode: host" not in backend_section, "network_mode: host must be removed from backend"
    assert "network_mode" not in backend_section
    
    # 2. Verify bridge network is configured
    assert "networks:" in backend_section
    assert "oh_id_net" in backend_section
    
    # 3. Verify security opts and capability drops
    assert 'user: "10001:10001"' in backend_section
    assert "no-new-privileges:true" in backend_section
    assert "cap_drop:" in backend_section
    assert "- ALL" in backend_section
    
    # 4. Verify no privileged mode or docker socket mounts
    assert "privileged: true" not in content
    assert "docker.sock" not in content
    
    # 5. Verify ports are bound strictly to localhost (127.0.0.1)
    port_matches = re.findall(r'-\s*"([^"]+)"', content)
    for p in port_matches:
        if ":" in p:
            assert p.startswith("127.0.0.1:"), f"Published port must be bound strictly to 127.0.0.1: {p}"
