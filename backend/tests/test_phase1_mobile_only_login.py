"""
ONE HEALTH ID (OH-ID) — Phase 1: Universal Mobile-Only Login Architecture Test Suite
Tests conformance to Mobile + Password login, email rejection, workspace resolution, and rate limiting.
"""

import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_01_mobile_login_doctor_succeeds():
    """Valid mobile number + password for Doctor returns 200 and access token."""
    res = client.post("/api/v1/auth/login", json={
        "username": "9840111222",
        "password": "doctor123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "DOCTOR"
    assert data["user"]["username"] in ["dr.senthil", "9840111222"]

def test_02_mobile_login_super_admin_succeeds():
    """Valid mobile number + password for Super Admin returns 200 and access token."""
    res = client.post("/api/v1/auth/login", json={
        "username": "9840000000",
        "password": "admin123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "SUPER_ADMIN"

def test_03_mobile_login_hospital_admin_succeeds():
    """Valid mobile number + password for Hospital Admin returns 200."""
    res = client.post("/api/v1/auth/login", json={
        "username": "9840012345",
        "password": "admin123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "HOSPITAL_ADMIN"

def test_04_mobile_login_nurse_succeeds():
    """Valid mobile number + password for Nurse returns 200."""
    res = client.post("/api/v1/auth/login", json={
        "username": "9840155666",
        "password": "nurse123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "NURSE"

def test_05_mobile_login_receptionist_succeeds():
    """Valid mobile number + password for Receptionist returns 200."""
    res = client.post("/api/v1/auth/login", json={
        "username": "9840177888",
        "password": "rec123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "RECEPTIONIST"

def test_06_mobile_login_patient_succeeds():
    """Valid mobile number + password for Patient returns 200."""
    res = client.post("/api/v1/auth/login", json={
        "username": "9840199999",
        "password": "patient123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "PATIENT"

def test_07_email_login_is_strictly_rejected():
    """Attempting to log in with an email address MUST be rejected with HTTP 400."""
    res = client.post("/api/v1/auth/login", json={
        "username": "doctor@hospital.org",
        "password": "doctor123"
    })
    assert res.status_code == 400
    assert "Email is not a login identifier" in res.json().get("detail", "")

def test_08_wrong_password_rejected():
    """Valid mobile with incorrect password returns 401 Unauthorized."""
    res = client.post("/api/v1/auth/login", json={
        "username": "9840111222",
        "password": "wrong_password_xyz"
    })
    assert res.status_code == 401
    assert "Invalid mobile number or password" in res.json().get("detail", "")

def test_09_nonexistent_mobile_rejected():
    """Unregistered mobile number returns 401 Unauthorized."""
    res = client.post("/api/v1/auth/login", json={
        "username": "9999999999",
        "password": "anypassword"
    })
    assert res.status_code == 401

def test_10_formatted_mobile_with_country_code_succeeds():
    """Mobile entered with +91 or spaces is normalized and succeeds."""
    res = client.post("/api/v1/auth/login", json={
        "username": "+91 98401 11222",
        "password": "doctor123"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()
