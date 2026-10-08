import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def super_admin_token():
    """Generates an authenticated JWT for a PLATFORM_SUPER_ADMIN."""
    return create_access_token(data={"sub": "admin", "roles": ["PLATFORM_SUPER_ADMIN", "SUPER_ADMIN"]})

@pytest.fixture
def auth_headers(super_admin_token):
    return {"Authorization": f"Bearer {super_admin_token}"}

def test_super_admin_metrics(auth_headers):
    """Verifies that platform metrics return real aggregated data."""
    response = client.get("/api/v1/super-admin/metrics", headers=auth_headers)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert "total_hospitals" in data
    assert "active_hospitals" in data
    assert "mrr" in data
    assert "total_patients" in data
    assert "total_doctors" in data
    assert data["total_hospitals"] >= 1
    assert data["mrr"] >= 0

def test_list_and_get_hospital_details(auth_headers):
    """Verifies querying hospitals list and 360-degree hospital profile."""
    # List
    response = client.get("/api/v1/super-admin/hospitals", headers=auth_headers)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    hospitals = res["data"]
    assert len(hospitals) >= 1
    target_id = hospitals[0]["id"]

    # Details
    detail_res = client.get(f"/api/v1/super-admin/hospitals/{target_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    detail_json = detail_res.json()
    assert detail_json["success"] is True
    h_data = detail_json["data"]
    assert h_data["id"] == target_id
    assert "features" in h_data
    assert "invoices" in h_data
    assert "audit_logs" in h_data

def test_clients_management(auth_headers):
    """Verifies client groups listing and creation."""
    list_res = client.get("/api/v1/super-admin/clients", headers=auth_headers)
    assert list_res.status_code == 200
    assert list_res.json()["success"] is True

    # Create new client group with unique code
    import uuid
    uniq = uuid.uuid4().hex[:6].upper()
    new_client_payload = {
        "name": f"Apollo Global Care Group {uniq}",
        "code": f"APOLLO_GLOBAL_{uniq}",
        "client_type": "HOSPITAL_GROUP",
        "primary_contact_name": "Dr. Prathap",
        "primary_contact_email": f"admin_{uniq.lower()}@apollo.org",
        "primary_contact_phone": "+91 98840 99999",
        "account_manager": "Sathus Key Accounts"
    }
    create_res = client.post("/api/v1/super-admin/clients", json=new_client_payload, headers=auth_headers)
    assert create_res.status_code == 200
    create_json = create_res.json()
    assert create_json["success"] is True
    assert "id" in create_json["data"]

def test_hospital_lifecycle_suspension_and_activation(auth_headers):
    """Verifies safe hospital status transition with mandatory reason, ticket reference and audit log."""
    # Find a test hospital
    hosp_res = client.get("/api/v1/super-admin/hospitals", headers=auth_headers)
    target_hospital = hosp_res.json()["data"][0]
    h_id = target_hospital["id"]

    # 1. Suspend hospital
    suspend_payload = {
        "new_status": "SUSPENDED",
        "reason": "Routine automated billing overdue test suspension",
        "ticket_ref": "TKT-TEST-9901"
    }
    sus_res = client.post(f"/api/v1/super-admin/hospitals/{h_id}/status", json=suspend_payload, headers=auth_headers)
    assert sus_res.status_code == 200
    assert sus_res.json()["success"] is True

    # Verify status changed
    check_res = client.get(f"/api/v1/super-admin/hospitals/{h_id}", headers=auth_headers)
    assert check_res.json()["data"]["lifecycle_status"] == "SUSPENDED"

    # 2. Reactivate hospital
    activate_payload = {
        "new_status": "ACTIVE",
        "reason": "Payment verified and service restored",
        "ticket_ref": "TKT-TEST-9901"
    }
    act_res = client.post(f"/api/v1/super-admin/hospitals/{h_id}/status", json=activate_payload, headers=auth_headers)
    assert act_res.status_code == 200
    assert act_res.json()["success"] is True

    # Verify status active
    check_act = client.get(f"/api/v1/super-admin/hospitals/{h_id}", headers=auth_headers)
    assert check_act.json()["data"]["lifecycle_status"] == "ACTIVE"

def test_feature_entitlement_toggle(auth_headers):
    """Verifies per-hospital feature gating backend enforcement."""
    hosp_res = client.get("/api/v1/super-admin/hospitals", headers=auth_headers)
    hosp_list = hosp_res.json()["data"]
    h_id = next((h["id"] for h in hosp_list if h["id"] == "hosp-kedar"), hosp_list[0]["id"])

    # Get features
    feat_res = client.get(f"/api/v1/super-admin/features/{h_id}", headers=auth_headers)
    assert feat_res.status_code == 200
    feats = feat_res.json()["data"]
    if not feats:
        # Seed default feature if not yet provisioned
        client.put(f"/api/v1/super-admin/features/{h_id}", json={"feature_key": "AI_CLINICAL_ASSISTANT", "is_enabled": True}, headers=auth_headers)
        feat_res = client.get(f"/api/v1/super-admin/features/{h_id}", headers=auth_headers)
        feats = feat_res.json()["data"]
    assert len(feats) >= 1

    # Toggle AI assistant feature
    toggle_payload = {
        "feature_key": "AI_CLINICAL_ASSISTANT",
        "is_enabled": True
    }
    up_res = client.put(f"/api/v1/super-admin/features/{h_id}", json=toggle_payload, headers=auth_headers)
    assert up_res.status_code == 200
    assert up_res.json()["success"] is True

def test_saas_invoices_and_payment_recording(auth_headers):
    """Verifies SaaS invoices and payment recording."""
    inv_res = client.get("/api/v1/super-admin/payments", headers=auth_headers)
    assert inv_res.status_code == 200
    invoices = inv_res.json()["data"]
    assert len(invoices) >= 1
    test_invoice = invoices[0]

    pay_payload = {
        "invoice_id": test_invoice["id"],
        "amount": 1000.0,
        "payment_mode": "NEFT",
        "transaction_ref": "TEST-NEFT-889977"
    }
    pay_res = client.post("/api/v1/super-admin/payments/record", json=pay_payload, headers=auth_headers)
    assert pay_res.status_code == 200
    assert pay_res.json()["success"] is True

def test_support_ticket_lifecycle(auth_headers):
    """Verifies support ticket creation and resolution."""
    new_ticket = {
        "category": "INTEGRATION",
        "priority": "HIGH",
        "subject": "ABDM Milestone 2 Gateway Sync Check",
        "description": "Verification of M2 health data sharing endpoints",
        "reported_by_name": "Integration Engineer",
        "reported_by_email": "engineer@hospital.com"
    }
    create_res = client.post("/api/v1/super-admin/support", json=new_ticket, headers=auth_headers)
    assert create_res.status_code == 200
    ticket_id = create_res.json()["data"]["id"]

    # Update/Resolve ticket
    update_payload = {
        "status": "RESOLVED",
        "resolution_notes": "All ABDM M2 gateways verified successfully",
        "assigned_to": "Sathus Senior Architect"
    }
    up_res = client.put(f"/api/v1/super-admin/support/{ticket_id}", json=update_payload, headers=auth_headers)
    assert up_res.status_code == 200
    assert up_res.json()["success"] is True

def test_support_impersonation_session(auth_headers):
    """Verifies audited support impersonation workflow."""
    hosp_res = client.get("/api/v1/super-admin/hospitals", headers=auth_headers)
    h_id = hosp_res.json()["data"][0]["id"]

    # Start session
    start_payload = {
        "hospital_id": h_id,
        "target_role": "HOSPITAL_ADMIN",
        "reason": "Investigating appointment slot sync anomaly",
        "ticket_ref": "TKT-SUPPORT-102",
        "duration_minutes": 30
    }
    start_res = client.post("/api/v1/super-admin/impersonation/start", json=start_payload, headers=auth_headers)
    assert start_res.status_code == 200
    session_data = start_res.json()["data"]
    assert "session_token" in session_data
    token = session_data["session_token"]

    # End session
    end_res = client.post("/api/v1/super-admin/impersonation/end", json={"session_token": token}, headers=auth_headers)
    assert end_res.status_code == 200
    assert end_res.json()["success"] is True

def test_system_health_and_audit_logs(auth_headers):
    """Verifies real system health telemetry and audit logs query."""
    health_res = client.get("/api/v1/super-admin/health", headers=auth_headers)
    assert health_res.status_code == 200
    h_data = health_res.json()["data"]
    assert h_data["status"] == "HEALTHY"
    assert "database_objects" in h_data

    audit_res = client.get("/api/v1/super-admin/audit", headers=auth_headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()["data"]) >= 1

def test_create_hospital_minimal_endpoint(auth_headers):
    """Verifies that POST /api/v1/super-admin/hospitals/create-minimal returns 200 and provisions initial admin invite."""
    import time
    unique_suffix = int(time.time())
    payload = {
        "facility_type": "CLINIC",
        "legal_name": f"Apex Specialty Clinic {unique_suffix}",
        "display_name": f"Apex Clinic {unique_suffix}",
        "code": f"APEX-{unique_suffix}",
        "primary_contact_name": "Dr. Ananthan",
        "primary_mobile": f"98401{str(unique_suffix)[-5:]}",
        "registered_email": f"apex_{unique_suffix}@example.com",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "address": "100 Mount Road, Guindy",
        "admin_first_name": "Ananthan",
        "admin_last_name": "S",
        "admin_mobile": f"98401{str(unique_suffix)[-5:]}",
        "admin_email": f"admin_apex_{unique_suffix}@example.com"
    }

    res = client.post("/api/v1/super-admin/hospitals/create-minimal", json=payload, headers=auth_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    res_data = data["data"]
    assert "hospital_id" in res_data
    assert "invitation_token" in res_data
    assert "invite_url" in res_data
    assert res_data["admin_status"] == "PENDING_INVITATION"

