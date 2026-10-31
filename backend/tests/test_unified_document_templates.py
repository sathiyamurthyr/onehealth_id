"""
Automated Test Suite: Unified Clinical Document Template Management
===================================================================
Tests:
1. All 20 templates exist across both libraries (10 Prescription + 10 Clinical Report).
2. Super Admin catalogue queries, status toggles, default setters, version publishing.
3. Hospital Admin settings selection, preview data, and hospital tenant isolation.
4. Doctor workspace prescription and consultation creation with template binding.
5. Patient access controls and historical document immutability.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def super_admin_headers():
    token = create_access_token(
        data={
            "sub": "usr-superadmin",
            "username": "superadmin",
            "roles": ["SUPER_ADMIN"],
            "permissions": ["system.manage", "hospital.manage", "clinical.read"]
        }
    )
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def hospital_admin_headers():
    token = create_access_token(
        data={
            "sub": "usr-admin-kedar",
            "username": "admin_kedar",
            "hospital_id": "hosp-kedar",
            "hospital_ref_id": "hosp-kedar",
            "roles": ["HOSPITAL_ADMIN"],
            "permissions": ["hospital.read", "hospital.update", "hospital.manage"]
        }
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

@pytest.fixture
def other_hospital_admin_headers():
    token = create_access_token(
        data={
            "sub": "usr-admin-apollo",
            "username": "admin_apollo",
            "hospital_id": "hosp-apollo",
            "hospital_ref_id": "hosp-apollo",
            "roles": ["HOSPITAL_ADMIN"],
            "permissions": ["hospital.read", "hospital.update"]
        }
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-apollo"
    }

@pytest.fixture
def doctor_headers():
    token = create_access_token(
        data={
            "sub": "usr-kedar-doc1",
            "username": "doc_senthil",
            "user_ref_id": "usr-kedar-doc1",
            "hospital_id": "hosp-kedar",
            "hospital_ref_id": "hosp-kedar",
            "roles": ["DOCTOR"],
            "permissions": ["clinical.read", "clinical.write", "consultation.create", "prescription.create"]
        }
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

@pytest.fixture
def patient_headers():
    token = create_access_token(
        data={
            "sub": "usr-p-101",
            "username": "9884240519",
            "user_ref_id": "p-101",
            "roles": ["PATIENT"],
            "permissions": ["patient.self.read", "patient.self.prescriptions"]
        }
    )
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# 1. TEMPLATE CATALOGUE VALIDATION (20 TEMPLATES)
# =============================================================================

def test_all_20_templates_exist():
    """Verify that all 10 Prescription and 10 Clinical Report templates exist in DB."""
    all_templates = sp_repository.list_clinical_document_templates()
    assert len(all_templates) >= 20

    rx_templates = [t for t in all_templates if t["document_type"] == "PRESCRIPTION"]
    rep_templates = [t for t in all_templates if t["document_type"] == "CLINICAL_REPORT"]

    assert len(rx_templates) == 10
    assert len(rep_templates) == 10

    # Verify key prescription templates
    rx_ids = {t["id"] for t in rx_templates}
    expected_rx = {
        "tmpl_rx_classic_hospital", "tmpl_rx_modern_clinical", "tmpl_rx_minimal_opd",
        "tmpl_rx_paediatric_care", "tmpl_rx_general_physician", "tmpl_rx_specialist_consultation",
        "tmpl_rx_chronic_care", "tmpl_rx_emergency_prescription", "tmpl_rx_digital_eprescription",
        "tmpl_rx_detailed_clinical"
    }
    assert expected_rx.issubset(rx_ids)

    # Verify key clinical report templates
    rep_ids = {t["id"] for t in rep_templates}
    expected_rep = {
        "tmpl_rep_classic_hospital", "tmpl_rep_modern_clinical", "tmpl_rep_minimal_opd",
        "tmpl_rep_paediatric_clinical", "tmpl_rep_general_physician", "tmpl_rep_specialist_consultation",
        "tmpl_rep_chronic_disease", "tmpl_rep_emergency_assessment", "tmpl_rep_digital_clinical",
        "tmpl_rep_detailed_evaluation"
    }
    assert expected_rep.issubset(rep_ids)


# =============================================================================
# 2. SUPER ADMIN MANAGEMENT SUITE
# =============================================================================

def test_super_admin_list_templates(super_admin_headers):
    """Super Admin can list templates and receive adoption stats."""
    res = client.get("/api/v1/super-admin/clinical-templates", headers=super_admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_templates"] >= 20
    assert data["prescription_templates_count"] == 10
    assert data["clinical_report_templates_count"] == 10
    assert "usage_stats" in data

def test_super_admin_toggle_status_and_restore(super_admin_headers):
    """Super Admin can deactivate and reactivate a template."""
    target_id = "tmpl_rx_emergency_prescription"
    # Deactivate
    res = client.post(
        f"/api/v1/super-admin/clinical-templates/{target_id}/status",
        headers=super_admin_headers,
        json={"is_active": False}
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # Reactivate
    res = client.post(
        f"/api/v1/super-admin/clinical-templates/{target_id}/status",
        headers=super_admin_headers,
        json={"is_active": True}
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is True

def test_super_admin_set_default(super_admin_headers):
    """Super Admin can set a platform default template."""
    target_id = "tmpl_rx_classic_hospital"
    res = client.post(
        f"/api/v1/super-admin/clinical-templates/{target_id}/set-default",
        headers=super_admin_headers
    )
    assert res.status_code == 200
    assert res.json()["is_default"] is True


# =============================================================================
# 3. HOSPITAL ADMIN CONFIGURATION & TENANT ISOLATION
# =============================================================================

def test_hospital_get_template_settings(hospital_admin_headers):
    """Hospital Admin can view current settings and available templates."""
    res = client.get("/api/v1/hospital/document-template-settings", headers=hospital_admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "settings" in data
    assert "available_prescription_templates" in data
    assert "available_clinical_report_templates" in data
    assert len(data["available_prescription_templates"]) == 10
    assert len(data["available_clinical_report_templates"]) == 10

def test_hospital_update_template_selection(hospital_admin_headers):
    """Hospital Admin can update facility's selected Rx and Report templates."""
    payload = {
        "rx_template_id": "tmpl_rx_modern_clinical",
        "clinical_report_template_id": "tmpl_rep_modern_clinical",
        "custom_header_text": "Kedar Multispecialty Hospital & Research Center",
        "custom_footer_notes": "Emergency 24x7 Helpline: +91 44 2252 1100",
        "show_hospital_logo": True
    }
    res = client.put(
        "/api/v1/hospital/document-template-settings",
        headers=hospital_admin_headers,
        json=payload
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["rx_template_id"] == "tmpl_rx_modern_clinical"
    assert updated["clinical_report_template_id"] == "tmpl_rep_modern_clinical"
    assert updated["custom_header_text"] == "Kedar Multispecialty Hospital & Research Center"

def test_hospital_tenant_isolation_violation(other_hospital_admin_headers):
    """Hospital Admin cannot update another hospital's settings."""
    res = client.put(
        "/api/v1/hospital/document-template-settings?hospital_id=hosp-kedar",
        headers=other_hospital_admin_headers,
        json={"rx_template_id": "tmpl_rx_minimal_opd"}
    )
    # Must be forbidden by tenant scope
    assert res.status_code in (403, 400)


# =============================================================================
# 4. DOCTOR WORKSPACE: CREATING RX & CONSULTATION REPORT WITH TEMPLATES
# =============================================================================

def test_doctor_create_prescription_with_template(doctor_headers):
    """Doctor creates a prescription with explicit template ID."""
    rx_payload = {
        "patient_id": "p-101",
        "hospital_id": "hosp-kedar",
        "diagnosis": "Seasonal Allergic Rhinitis",
        "template_id": "tmpl_rx_paediatric_care",
        "items": [
            {
                "medicine_name": "Cetirizine Syrup",
                "strength": "5 mg/5ml",
                "dosage_form": "Syrup",
                "dose": "2.5 ml",
                "frequency": "Once daily (Night)",
                "duration_days": 5,
                "route": "Oral",
                "food_instruction": "After food"
            }
        ]
    }
    res = client.post("/api/v1/prescriptions", headers=doctor_headers, json=rx_payload)
    assert res.status_code == 201
    created_rx = res.json()
    assert created_rx["template_id"] == "tmpl_rx_paediatric_care"
    assert created_rx["template_version"] >= 1
    assert "template_name" in created_rx
    assert created_rx["template_name"] == "Paediatric Care"

def test_doctor_record_consultation_with_template(doctor_headers):
    """Doctor records consultation report with template ID and signature."""
    consult_payload = {
        "appointment_id": None,
        "diagnosis": "Type 2 Diabetes Mellitus - Review",
        "symptoms": "Occasional morning fatigue, polyuria",
        "clinical_notes": "Blood pressure controlled on dual therapy. Diet compliant.",
        "vitals": {
            "bp_systolic": "128",
            "bp_diastolic": "82",
            "heart_rate": "72",
            "temperature": "98.2",
            "weight_kg": "74"
        },
        "report_template_id": "tmpl_rep_chronic_disease",
        "rx_template_id": "tmpl_rx_chronic_care"
    }
    res = client.post(
        "/api/v1/doctor/patients/p-c7000130/consultation",
        headers=doctor_headers,
        json=consult_payload
    )
    assert res.status_code == 201
    enc = res.json()
    assert enc["consultation_id"] is not None

    # Fetch consultation report detail
    cid = enc["consultation_id"]
    rep_res = client.get(f"/api/v1/consultations/{cid}/report", headers=doctor_headers)
    assert rep_res.status_code == 200
    rep = rep_res.json()
    assert rep["template_id"] == "tmpl_rep_chronic_disease"
    assert "template_name" in rep
    assert rep["template_name"] == "Chronic Disease Review Report"


# =============================================================================
# 5. HISTORICAL DOCUMENT IMMUTABILITY & PATIENT ACCESS
# =============================================================================

def test_historical_prescription_preserves_template_after_hospital_change(
    hospital_admin_headers, doctor_headers, patient_headers
):
    """
    Changing the hospital's default template MUST NOT alter the template of
    an already-issued, signed prescription.
    """
    # 1. Doctor issues prescription with hospital's current template (tmpl_rx_modern_clinical)
    res = client.post(
        "/api/v1/prescriptions",
        headers=doctor_headers,
        json={
            "patient_id": "p-101",
            "hospital_id": "hosp-kedar",
            "diagnosis": "Acute Bronchitis",
            "items": [{"medicine_name": "Azithromycin", "strength": "500 mg"}]
        }
    )
    assert res.status_code == 201
    rx_id = res.json()["id"]
    original_tmpl = res.json()["template_id"]

    # 2. Hospital Admin switches default template to Minimal OPD
    client.put(
        "/api/v1/hospital/document-template-settings",
        headers=hospital_admin_headers,
        json={"rx_template_id": "tmpl_rx_minimal_opd"}
    )

    # 3. Patient retrieves the earlier prescription
    rx_check = client.get(f"/api/v1/prescriptions/{rx_id}", headers=patient_headers)
    assert rx_check.status_code == 200
    persisted_rx = rx_check.json()
    # Must STILL be the original template!
    assert persisted_rx["template_id"] == original_tmpl
    assert persisted_rx["template_id"] != "tmpl_rx_minimal_opd"
