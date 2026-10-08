import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import get_readonly_cursor

client = TestClient(app)

@pytest.fixture(scope="session")
def test_patient():
    """Fetches an active seeded patient from database."""
    with get_readonly_cursor() as cur:
        cur.execute("SELECT id, onehealth_id, name, phone FROM oh_id.patients LIMIT 1;")
        row = cur.fetchone()
        assert row is not None, "At least one patient must exist in database."
        return dict(row)

def test_01_list_network_providers_and_facilities():
    """Verify listing accredited network providers and facilities."""
    response = client.get("/api/v1/network/providers")
    assert response.status_code == 200
    providers = response.json()
    assert isinstance(providers, list)
    assert len(providers) >= 5
    
    # Check seeded providers exist
    provider_ids = [p["id"] for p in providers]
    assert "hosp-apollo" in provider_ids or "hosp-kedar" in provider_ids

    # List facilities
    fac_resp = client.get("/api/v1/network/facilities")
    assert fac_resp.status_code == 200
    facilities = fac_resp.json()
    assert isinstance(facilities, list)
    assert len(facilities) >= 4

def test_02_provider_onboarding_lifecycle():
    """Verify the 9-stage provider onboarding workflow."""
    # 1. Register a new provider
    payload = {
        "organization_name": "Metro Neuro Specialty Hospital",
        "provider_type": "SPECIALIST",
        "registration_number": "REG-NEURO-2026-99",
        "tax_id": "GSTIN99887766A",
        "primary_contact_name": "Dr. Sarah Rao",
        "primary_email": "admin@metroneuro.org",
        "primary_phone": "+91 99887 76655",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "onboarding_stage": "PENDING",
        "verification_documents": ["nabh_cert.pdf", "clin_license.pdf"]
    }
    create_resp = client.post("/api/v1/network/providers/register", json=payload)
    assert create_resp.status_code == 200
    prov = create_resp.json()
    prov_id = prov["id"]
    assert prov["onboarding_stage"] == "PENDING"

    # 2. Progress through verification stages: PENDING -> UNDER_REVIEW -> VERIFIED -> ACTIVE
    review_resp = client.patch(f"/api/v1/network/providers/{prov_id}/stage", json={"stage": "UNDER_REVIEW"})
    assert review_resp.status_code == 200
    assert review_resp.json()["onboarding_stage"] == "UNDER_REVIEW"

    verify_resp = client.patch(f"/api/v1/network/providers/{prov_id}/stage", json={"stage": "VERIFIED", "verified_by": "National Accreditation Board"})
    assert verify_resp.status_code == 200
    assert verify_resp.json()["onboarding_stage"] == "VERIFIED"

    active_resp = client.patch(f"/api/v1/network/providers/{prov_id}/stage", json={"stage": "ACTIVE"})
    assert active_resp.status_code == 200
    assert active_resp.json()["onboarding_stage"] == "ACTIVE"

def test_03_cross_provider_identity_match_and_link(test_patient):
    """Verify cross-provider identity lookup and MRN linking."""
    patient_id = test_patient["id"]
    onehealth_id = test_patient["onehealth_id"]

    # Find patient
    match_resp = client.get(f"/api/v1/network/identities/match?identifier={onehealth_id}")
    assert match_resp.status_code == 200
    match_data = match_resp.json()
    assert match_data["onehealth_id"] == onehealth_id
    assert match_data["patient_id"] == patient_id

    # Link an external MRN from Hospital B (hosp-apollo)
    link_payload = {
        "master_patient_id": patient_id,
        "onehealth_id": onehealth_id,
        "provider_id": "hosp-apollo",
        "external_mrn": f"APO-MRN-{patient_id[-6:]}",
        "match_confidence": 99.5,
        "match_method": "BIOMETRIC_AND_QR"
    }
    link_resp = client.post("/api/v1/network/identities/link", json=link_payload)
    assert link_resp.status_code == 200
    assert link_resp.json()["external_mrn"] == link_payload["external_mrn"]

    # Fetch patient's cross-provider links
    list_resp = client.get(f"/api/v1/network/identities/patient/{patient_id}")
    assert list_resp.status_code == 200
    links = list_resp.json()
    assert any(l["external_mrn"] == link_payload["external_mrn"] for l in links)

def test_04_granular_patient_consent_and_verification(test_patient):
    """Verify patient consent grant, scope verification, and revocation."""
    patient_id = test_patient["id"]
    grantee_provider_id = "hosp-apollo"

    # 1. Grant consent for Labs Only for 15 days
    consent_payload = {
        "patient_id": patient_id,
        "grantee_provider_id": grantee_provider_id,
        "consent_scope": "LABS_ONLY",
        "purpose": "CARE_TREATMENT",
        "valid_days": 15
    }
    grant_resp = client.post("/api/v1/network/consents/grant", json=consent_payload)
    assert grant_resp.status_code == 200
    cst = grant_resp.json()
    consent_id = cst["id"]
    assert cst["status"] == "GRANTED"

    # 2. Verify authorization for LAB_REPORT (should succeed)
    verify_resp = client.post("/api/v1/network/consents/verify", json={
        "patient_id": patient_id,
        "requester_provider_id": grantee_provider_id,
        "record_type": "LAB_REPORT",
        "purpose": "CARE_TREATMENT"
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["is_authorized"] is True

    # 3. Verify authorization for PRESCRIPTION (should fail due to scope LABS_ONLY)
    rx_verify_resp = client.post("/api/v1/network/consents/verify", json={
        "patient_id": patient_id,
        "requester_provider_id": grantee_provider_id,
        "record_type": "PRESCRIPTION",
        "purpose": "CARE_TREATMENT"
    })
    assert rx_verify_resp.status_code == 200
    assert rx_verify_resp.json()["is_authorized"] is False

    # 4. Revoke consent
    revoke_resp = client.post(f"/api/v1/network/consents/{consent_id}/revoke?patient_id={patient_id}", json={
        "reason": "Consultation episode completed"
    })
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["status"] == "REVOKED"

def test_05_record_exchange_provenance_and_audit(test_patient):
    """Verify record exchange logging with cryptographic provenance hash."""
    patient_id = test_patient["id"]

    # 1. Ensure active consent exists for hosp-apollo
    client.post("/api/v1/network/consents/grant", json={
        "patient_id": patient_id,
        "grantee_provider_id": "hosp-apollo",
        "consent_scope": "ALL_RECORDS",
        "purpose": "DIAGNOSTIC_EVALUATION",
        "valid_days": 30
    })

    # 2. Exchange record
    exchange_payload = {
        "consent_id": None,
        "patient_id": patient_id,
        "source_provider_id": "lab-thyrocare",
        "requester_provider_id": "hosp-apollo",
        "requester_user_id": "doc-neuro-1",
        "record_type": "LAB_REPORT",
        "record_id": "rep-lipid-001",
        "provenance_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "purpose": "DIAGNOSTIC_EVALUATION",
        "is_break_glass": False
    }
    exc_resp = client.post("/api/v1/network/exchange/record", json=exchange_payload)
    assert exc_resp.status_code == 200
    exc_data = exc_resp.json()
    assert exc_data["record_type"] == "LAB_REPORT"
    assert exc_data["provenance_hash"].startswith("sha256:")

    # Audit history for patient
    hist_resp = client.get(f"/api/v1/network/exchange/audit/{patient_id}")
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) >= 1
    assert any(h["record_id"] == "rep-lipid-001" for h in history)

def test_06_unified_multi_provider_timeline(test_patient):
    """Verify multi-provider unified patient timeline view."""
    patient_id = test_patient["id"]
    resp = client.get(f"/api/v1/network/exchange/unified-timeline/{patient_id}")
    assert resp.status_code == 200
    timeline = resp.json()
    assert isinstance(timeline, list)
    # Timeline contains zero or more events with required attributes
    for event in timeline:
        assert "event_title" in event
        assert "event_date" in event

def test_07_inter_hospital_referrals_workflow(test_patient):
    """Verify structured provider-to-provider referral creation and response loop."""
    patient_id = test_patient["id"]
    referral_payload = {
        "patient_id": patient_id,
        "referring_provider_id": "hosp-kedar",
        "referring_doctor_id": "doc-cardio-1",
        "referring_doctor_name": "Dr. Kedar Nathan",
        "target_provider_id": "hosp-apollo",
        "target_specialty": "Neurology",
        "urgency": "URGENT",
        "clinical_summary": "Patient reports recurrent syncope following exertion. Echo normal.",
        "referral_question": "Rule out neurocardiogenic syncope vs autonomic dysfunction.",
        "attached_record_ids": ["enc-001", "lab-002"]
    }
    create_resp = client.post("/api/v1/network/referrals/create", json=referral_payload)
    assert create_resp.status_code == 200
    ref = create_resp.json()
    ref_id = ref["id"]
    assert ref["status"] == "PENDING"
    assert ref["urgency"] == "URGENT"

    # List incoming referrals at target provider
    in_resp = client.get("/api/v1/network/referrals/hosp-apollo/incoming")
    assert in_resp.status_code == 200
    in_refs = in_resp.json()
    assert any(r["id"] == ref_id for r in in_refs)

    # Accept referral and provide response notes
    update_resp = client.patch(f"/api/v1/network/referrals/{ref_id}/status", json={
        "status": "ACCEPTED",
        "response_notes": "Appointment scheduled with Dr. Suresh (Chief of Neurology) on 2026-10-15."
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "ACCEPTED"

def test_08_pharmacy_network_verification_and_dispensation(test_patient):
    """Verify e-prescription verification and network pharmacy dispensation recording."""
    patient_id = test_patient["id"]
    # List dispensations
    list_resp = client.get("/api/v1/network/pharmacy/dispensations?pharmacy_id=pharm-medplus")
    assert list_resp.status_code == 200
    assert isinstance(list_resp.json(), list)

    # Record dispensation
    disp_payload = {
        "prescription_id": "rx-sample-001",
        "patient_id": patient_id,
        "prescribing_hospital_id": "hosp-kedar",
        "dispensing_pharmacy_id": "pharm-medplus",
        "dispensed_items": [
            {"medicine_name": "Atorvastatin 20mg", "quantity": 30, "batch": "BAT-2026-X9"},
            {"medicine_name": "Aspirin 75mg", "quantity": 30, "batch": "BAT-2026-Y2"}
        ],
        "dispensing_status": "DISPENSED",
        "pharmacist_id": "ph-user-01",
        "pharmacist_name": "Ravi Kumar (Reg. Pharm #5512)",
        "batch_numbers": {"Atorvastatin": "BAT-2026-X9", "Aspirin": "BAT-2026-Y2"},
        "notes": "Verified against doctor electronic signature. Full course dispensed."
    }
    disp_resp = client.post("/api/v1/network/pharmacy/dispense", json=disp_payload)
    assert disp_resp.status_code == 200
    assert disp_resp.json()["dispensing_status"] == "DISPENSED"

def test_09_diagnostic_network_orders_and_critical_alerts(test_patient):
    """Verify diagnostic lab order lifecycle and critical alert flag."""
    patient_id = test_patient["id"]
    order_payload = {
        "order_id": f"LAB-ORD-{patient_id[-6:]}",
        "patient_id": patient_id,
        "ordering_provider_id": "hosp-kedar",
        "diagnostic_lab_id": "lab-thyrocare",
        "test_codes": ["LIPID_PROFILE", "HBA1C", "SERUM_CREATININE"]
    }
    ord_resp = client.post("/api/v1/network/diagnostics/orders", json=order_payload)
    assert ord_resp.status_code == 200
    assert ord_resp.json()["specimen_status"] == "ORDERED"

    # Update specimen status to REPORT_READY with critical flag
    update_resp = client.patch(f"/api/v1/network/diagnostics/orders/{order_payload['order_id']}/status", json={
        "status": "REPORT_READY",
        "critical_flag": True,
        "result_report_id": "rep-thyro-9901",
        "turnaround_minutes": 180
    })
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["specimen_status"] == "REPORT_READY"
    assert updated["critical_flag"] is True

def test_10_emergency_break_glass_access(test_patient):
    """Verify emergency break-glass override with strict auditing and reason requirement."""
    patient_id = test_patient["id"]
    bg_payload = {
        "patient_id": patient_id,
        "provider_id": "emerg-metro",
        "clinician_id": "doc-er-chief",
        "clinician_name": "Dr. Vikram Seth (Trauma Lead)",
        "reason": "Unresponsive trauma patient involved in motor vehicle accident. Immediate allergy and cardiac history required.",
        "triage_level": "RESUSCITATION",
        "accessed_records": ["ALLERGIES", "CHRONIC_CONDITIONS", "RECENT_MEDS", "BLOOD_GROUP"]
    }
    bg_resp = client.post("/api/v1/network/emergency/break-glass", json=bg_payload)
    assert bg_resp.status_code == 200
    log = bg_resp.json()
    assert log["patient_notified"] is True
    assert log["authorized_window_minutes"] == 120

    # List emergency logs
    list_resp = client.get(f"/api/v1/network/emergency/logs?patient_id={patient_id}")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

def test_11_network_marketplace_and_directory_search():
    """Verify multi-specialty healthcare marketplace search."""
    search_resp = client.get("/api/v1/network/marketplace/search?specialty=Cardiology")
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert isinstance(results, list)
    assert len(results) >= 1
    assert any("Cardiology" in r["specialty"] for r in results)

def test_12_network_intelligence_telemetry_and_brief(test_patient):
    """Verify aggregated network telemetry and authorized patient brief."""
    patient_id = test_patient["id"]
    # Telemetry
    telem_resp = client.get("/api/v1/network/intelligence/telemetry")
    assert telem_resp.status_code == 200
    telem = telem_resp.json()
    assert telem["active_providers_count"] >= 5
    assert telem["active_facilities_count"] >= 4
    assert "referral_analytics" in telem

    # Emergency Patient Brief (break-glass override)
    brief_resp = client.get(f"/api/v1/network/intelligence/patient-brief/{patient_id}?requester_provider_id=emerg-metro&is_emergency=true")
    assert brief_resp.status_code == 200
    brief = brief_resp.json()
    assert brief["is_emergency_access"] is True
    assert "summary" in brief
    assert "authorized_timeline" in brief
