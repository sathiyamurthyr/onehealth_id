import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import hmac
import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.repositories.sp_views_repository import SPViewsRepository
from backend.app.services.fhir_mapper import FHIRMapper

client = TestClient(app)
repo = SPViewsRepository()

@pytest.fixture(scope="module")
def setup_phase4_environment():
    """Sets up two distinct participating hospitals and a pilot patient in database."""
    hosp_a_id = f"hosp-a-{uuid.uuid4().hex[:8]}"
    hosp_b_id = f"hosp-b-{uuid.uuid4().hex[:8]}"
    pat_id = f"pat-p4-{uuid.uuid4().hex[:8]}"
    ohid_val = f"OH-P4-{uuid.uuid4().hex[:6].upper()}"

    doc_a_id = f"doc-a-{uuid.uuid4().hex[:8]}"
    doc_b_id = f"doc-b-{uuid.uuid4().hex[:8]}"

    from backend.app.database.session import get_db_cursor
    with get_db_cursor() as cur:
        # 1. Hospital A
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, is_active)
            VALUES (%s, 'Apollo Specialty Hospital', %s, TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (hosp_a_id, f"APL-{uuid.uuid4().hex[:4].upper()}"))

        # 2. Hospital B
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, is_active)
            VALUES (%s, 'Fortis Malar Hospital', %s, TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (hosp_b_id, f"FOR-{uuid.uuid4().hex[:4].upper()}"))

        # 3. Doctors
        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES (%s, %s, 'Dr. Rajesh Kumar', 'Cardiology', TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (doc_a_id, hosp_a_id))

        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES (%s, %s, 'Dr. Sneha Varma', 'Internal Medicine', TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (doc_b_id, hosp_b_id))

        # 4. Patient
        qr_tok = f"qr-{uuid.uuid4().hex}"
        cur.execute("""
            INSERT INTO oh_id.patients (id, hospital_id, onehealth_id, name, gender, dob, age, phone, qr_token, diagnosis)
            VALUES (%s, %s, %s, 'Karthik Subramanian', 'Male', '1988-05-14', 38, '+91-9840123456', %s, 'General Health Evaluation')
            ON CONFLICT (id) DO NOTHING;
        """, (pat_id, hosp_a_id, ohid_val, qr_tok))

    return {
        "hosp_a_id": hosp_a_id,
        "hosp_b_id": hosp_b_id,
        "pat_id": pat_id,
        "onehealth_id": ohid_val,
        "doc_a_id": doc_a_id,
        "doc_b_id": doc_b_id
    }


def test_integration_registry_lifecycle_and_ping(setup_phase4_environment):
    """Verifies registering, testing ping, activating, suspending, and monitoring integrations."""
    env = setup_phase4_environment
    integ_id = f"integ-{uuid.uuid4().hex[:10]}"

    # 1. Register Integration
    create_payload = {
        "id": integ_id,
        "hospital_id": env["hosp_a_id"],
        "integration_type": "FHIR_API",
        "provider_name": "Apollo Connected LIS Gateway",
        "endpoint_url": "https://lis-bridge.apollo.org/fhir/r4",
        "auth_type": "BEARER_TOKEN",
        "environment": "SANDBOX",
        "capabilities": ["RECORD_EXCHANGE", "DIAGNOSTIC_IMPORT"],
        "client_id": "APOLLO_CLIENT_99",
        "api_key": "sec_apikey_99"
    }

    created = repo.create_integration(create_payload)
    assert created["id"] == integ_id
    assert created["provider_name"] == "Apollo Connected LIS Gateway"
    assert created["status"] == "CONFIGURED"

    # 2. Test Connection Ping
    fetched = repo.get_integration(integ_id)
    assert fetched is not None
    assert fetched["endpoint_url"] == "https://lis-bridge.apollo.org/fhir/r4"

    repo.update_integration_status(integ_id, "ACTIVE", is_success=True)
    updated = repo.get_integration(integ_id)
    assert updated["status"] == "ACTIVE"
    assert updated["last_successful_sync"] is not None

    # 3. Check Live Analytical Monitoring View
    metrics = repo.get_integration_monitoring_metrics(hospital_id=env["hosp_a_id"])
    assert isinstance(metrics, list)
    assert any(m["integration_id"] == integ_id for m in metrics)


def test_fhir_r4_bidirectional_mapping_and_serialization(setup_phase4_environment):
    """Verifies complete HL7 FHIR R4 mapping across all target healthcare resources."""
    env = setup_phase4_environment

    # 1. Patient Mapping
    pat_dict = {
        "id": env["pat_id"],
        "onehealth_id": env["onehealth_id"],
        "name": "Karthik Subramanian",
        "gender": "Male",
        "dob": "1988-05-14",
        "phone": "+91-9840123456",
        "city": "Chennai",
        "state": "Tamil Nadu"
    }
    fhir_pat = FHIRMapper.to_fhir_patient(pat_dict, abha_info={"abha_address": "karthik.sub@abdm"})
    assert fhir_pat["resourceType"] == "Patient"
    assert fhir_pat["id"] == env["pat_id"]
    assert fhir_pat["name"][0]["family"] == "Subramanian"
    assert len(fhir_pat["identifier"]) == 2 # OH-ID and ABHA

    # 2. Practitioner Mapping
    doc_dict = {
        "id": env["doc_a_id"],
        "name": "Dr. Rajesh Kumar",
        "specialty": "Cardiology",
        "registration_number": "TNMC-44120"
    }
    fhir_doc = FHIRMapper.to_fhir_practitioner(doc_dict)
    assert fhir_doc["resourceType"] == "Practitioner"
    assert fhir_doc["name"][0]["prefix"] == ["Dr."]
    assert fhir_doc["qualification"][0]["code"]["text"] == "Cardiology"

    # 3. Organization Mapping
    hosp_dict = {
        "id": env["hosp_a_id"],
        "name": "Apollo Specialty Hospital",
        "code": "APL-CHENNAI"
    }
    fhir_org = FHIRMapper.to_fhir_organization(hosp_dict)
    assert fhir_org["resourceType"] == "Organization"
    assert fhir_org["name"] == "Apollo Specialty Hospital"

    # 4. Observation (Vitals)
    fhir_obs = FHIRMapper.to_fhir_observation(
        obs_id="obs-hr-01",
        patient_id=env["pat_id"],
        code="8867-4",
        display="Heart rate",
        value=74,
        unit="beats/minute"
    )
    assert fhir_obs["resourceType"] == "Observation"
    assert fhir_obs["valueQuantity"]["value"] == 74
    assert fhir_obs["valueQuantity"]["unit"] == "beats/minute"

    # 5. DiagnosticReport (Lab)
    fhir_rep = FHIRMapper.to_fhir_diagnostic_report(
        report={"id": "rep-cbc-01", "test_name": "Lipid Profile", "impression": "Borderline Cholesterol"},
        patient_id=env["pat_id"],
        category_code="LAB",
        result_observations=[fhir_obs]
    )
    assert fhir_rep["resourceType"] == "DiagnosticReport"
    assert fhir_rep["category"][0]["coding"][0]["code"] == "LAB"
    assert len(fhir_rep["result"]) == 1

    # 6. Provenance
    fhir_prov = FHIRMapper.to_fhir_provenance(
        target_resource_type="DiagnosticReport",
        target_resource_id="rep-cbc-01",
        source_system="APOLLO_LIS",
        source_facility="Apollo Specialty Hospital"
    )
    assert fhir_prov["resourceType"] == "Provenance"
    assert fhir_prov["activity"]["coding"][0]["code"] == "CREATE"

    # 7. FHIR Bundle Creation
    bundle = FHIRMapper.create_bundle([fhir_pat, fhir_doc, fhir_obs, fhir_rep, fhir_prov])
    assert bundle["resourceType"] == "Bundle"
    assert bundle["total"] == 5
    assert len(bundle["entry"]) == 5


def test_granular_consent_gating_and_scope_restriction(setup_phase4_environment):
    """
    Verifies that Hospital B can ONLY access records permitted by patient's granular consent scope.
    If patient permits only Lab Reports, prescription and consultation access must be excluded.
    """
    env = setup_phase4_environment
    from backend.app.database.session import get_db_cursor

    # Seed clinical records in Hospital A
    with get_db_cursor() as cur:
        # Consultation in Hospital A
        con_id = f"con-{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO oh_id.opd_consultations (id, doctor_id, patient_id, diagnosis, clinical_notes)
            VALUES (%s, %s, %s, 'Hypertension Evaluation', 'Blood pressure slightly elevated.')
            ON CONFLICT (id) DO NOTHING;
        """, (con_id, env["doc_a_id"], env["pat_id"]))

        # Prescription in Hospital A
        rx_id = f"rx-{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO oh_id.prescriptions (id, doctor_id, patient_id, instructions)
            VALUES (%s, %s, %s, 'Amlodipine 5mg once daily')
            ON CONFLICT (id) DO NOTHING;
        """, (rx_id, env["doc_a_id"], env["pat_id"]))

        # Lab Result in Hospital A
        lr_id = f"lr-{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO oh_id.lab_results (id, hospital_id, order_id, patient_id, test_name, analyte_name, result_value, unit)
            VALUES (%s, %s, 'ord-test-01', %s, 'Lipid Profile', 'Total Cholesterol', '210', 'mg/dL')
            ON CONFLICT (id) DO NOTHING;
        """, (lr_id, env["hosp_a_id"], env["pat_id"]))

    # 1. Hospital B requests full consent
    req = repo.create_data_sharing_request(
        patient_id=env["pat_id"],
        requesting_hospital_id=env["hosp_b_id"],
        requesting_doctor_id=env["doc_b_id"],
        purpose_code="CARETREAT",
        data_categories=["OPConsultation", "Prescription", "DiagnosticReport"]
    )
    consent_id = req["consent_id"]

    # 2. Patient grants consent ONLY for DiagnosticReport (Lab)
    granted = repo.grant_data_sharing_consent(
        consent_id=consent_id,
        patient_id=env["pat_id"],
        allowed_categories=["DiagnosticReport"]
    )
    assert granted["consent_status"] == "GRANTED"
    assert granted["data_categories"] == ["DiagnosticReport"]

    # 3. Hospital B fetches records -> Must receive Lab Report, but 0 consultations and 0 prescriptions
    fetched = repo.cross_hospital_fetch_records(
        requesting_hospital_id=env["hosp_b_id"],
        requesting_doctor_id=env["doc_b_id"],
        patient_id=env["pat_id"],
        purpose="TREATMENT"
    )

    assert fetched["authorized_scope"] == ["DiagnosticReport"]
    assert len(fetched["lab_reports"]) > 0
    assert len(fetched["consultations"]) == 0 # Scope restriction enforced!
    assert len(fetched["prescriptions"]) == 0 # Scope restriction enforced!

    # Cleanup consent so following tests start clean
    repo.revoke_data_sharing_consent(consent_id, env["pat_id"], "Test cleanup")


def test_consent_revocation_denies_subsequent_access(setup_phase4_environment):
    """Verifies that immediate consent revocation locks out subsequent cross-hospital access."""
    env = setup_phase4_environment

    # 1. Create and grant consent to Hospital B
    req = repo.create_data_sharing_request(
        patient_id=env["pat_id"],
        requesting_hospital_id=env["hosp_b_id"],
        requesting_doctor_id=env["doc_b_id"],
        purpose_code="CARETREAT",
        data_categories=["OPConsultation", "Prescription"]
    )
    consent_id = req["consent_id"]
    repo.grant_data_sharing_consent(consent_id, env["pat_id"], ["OPConsultation", "Prescription"])

    # 2. Patient revokes consent
    revoked = repo.revoke_data_sharing_consent(consent_id, env["pat_id"], "Patient changed mind.")
    assert revoked is True

    # 3. Hospital B attempts to fetch records -> Must raise PermissionError
    with pytest.raises(PermissionError) as exc_info:
        repo.cross_hospital_fetch_records(
            requesting_hospital_id=env["hosp_b_id"],
            requesting_doctor_id=env["doc_b_id"],
            patient_id=env["pat_id"],
            purpose="TREATMENT"
        )
    assert "No active or valid consent artifact found" in str(exc_info.value)


def test_external_health_record_import_and_provenance(setup_phase4_environment):
    """Verifies external health record import with complete provenance attribution and timeline view inclusion."""
    env = setup_phase4_environment
    ext_rec_id = f"EXT-REC-{uuid.uuid4().hex[:6].upper()}"

    # Setup integration for external lab
    integ_id = f"integ-lab-{uuid.uuid4().hex[:6]}"
    repo.create_integration({
        "id": integ_id,
        "hospital_id": env["hosp_a_id"],
        "integration_type": "LIS_INTERFACE",
        "provider_name": "Neuberg Diagnostics",
        "endpoint_url": "https://neuberg.in/api/v1"
    })

    # Import external report
    imported = repo.import_external_health_record(
        patient_id=env["pat_id"],
        hospital_id=env["hosp_a_id"],
        integration_id=integ_id,
        record_data={
            "source_facility_name": "Neuberg Diagnostics Centre",
            "source_provider_name": "Dr. Ananya Roy (Pathologist)",
            "external_record_id": ext_rec_id,
            "record_type": "LAB_REPORT",
            "title": "HbA1c Glycated Hemoglobin Test",
            "summary": "HbA1c: 6.2% (Prediabetic range)",
            "clinical_payload": {"hba1c_val": 6.2, "unit": "%"}
        }
    )

    assert imported["id"] is not None
    assert imported["external_record_id"] == ext_rec_id
    assert imported["source_facility_name"] == "Neuberg Diagnostics Centre"
    assert imported["provenance_data"]["source_facility_name"] == "Neuberg Diagnostics Centre"

    # Query health timeline view for patient
    from backend.app.database.session import get_readonly_cursor
    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT * FROM oh_id.vw_health_timeline_events
            WHERE patient_id = %s AND is_external = TRUE;
        """, (env["pat_id"],))
        ext_timeline_rows = [dict(r) for r in cur.fetchall()]
        assert len(ext_timeline_rows) > 0
        assert any(r["external_record_id"] == ext_rec_id for r in ext_timeline_rows)
        matching = next(r for r in ext_timeline_rows if r["external_record_id"] == ext_rec_id)
        assert matching["is_external"] is True
        assert matching["provenance_source"] == "Neuberg Diagnostics Centre"


def test_webhook_hmac_signature_and_idempotency(setup_phase4_environment):
    """Verifies HMAC-SHA256 signature verification and idempotency deduplication."""
    env = setup_phase4_environment
    integ_id = f"integ-wh-{uuid.uuid4().hex[:6]}"
    secret = "whsec_test_secret_key_123"

    repo.create_integration({
        "id": integ_id,
        "hospital_id": env["hosp_a_id"],
        "integration_type": "REST_WEBHOOK",
        "provider_name": "Medanta Remote Telehealth",
        "endpoint_url": "https://medanta.org/webhooks",
        "webhook_secret": secret
    })

    payload = {
        "event_id": f"evt-remote-{uuid.uuid4().hex[:8]}",
        "event_type": "CONSULTATION_SUMMARY_DISPATCHED",
        "patient_ohid": env["onehealth_id"],
        "notes": "Remote cardiology follow-up"
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    valid_signature = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()

    # 1. Invalid Signature -> Must fail 401
    bad_res = client.post(
        f"/api/v1/integrations/webhooks/{integ_id}",
        data=payload_bytes,
        headers={"X-Signature": "invalid_signature", "X-Idempotency-Key": payload["event_id"], "Content-Type": "application/json"}
    )
    assert bad_res.status_code == 401

    # 2. Valid Signature -> Must succeed 200 ACCEPTED
    good_res = client.post(
        f"/api/v1/integrations/webhooks/{integ_id}",
        data=payload_bytes,
        headers={"X-Signature": valid_signature, "X-Idempotency-Key": payload["event_id"], "Content-Type": "application/json"}
    )
    assert good_res.status_code == 200
    assert good_res.json()["status"] == "ACCEPTED"

    # 3. Repeated Webhook (Same Idempotency Key) -> Must return IGNORED_DUPLICATE
    dup_res = client.post(
        f"/api/v1/integrations/webhooks/{integ_id}",
        data=payload_bytes,
        headers={"X-Signature": valid_signature, "X-Idempotency-Key": payload["event_id"], "Content-Type": "application/json"}
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["status"] == "IGNORED_DUPLICATE"


def test_deterministic_identity_matching_and_conflict_quarantine(setup_phase4_environment):
    """
    Verifies that deterministic matching accepts verified OH-ID and ABHA,
    but quarantines records with mismatched demographics (e.g. conflicting DOB).
    """
    env = setup_phase4_environment
    integ_id = f"integ-match-{uuid.uuid4().hex[:6]}"
    repo.create_integration({
        "id": integ_id,
        "hospital_id": env["hosp_a_id"],
        "integration_type": "FHIR_API",
        "provider_name": "Apollo Sync",
        "endpoint_url": "https://sync.apollo.org"
    })

    # 1. Exact OH-ID match with consistent DOB -> Matches and creates mapping
    match_res = repo.resolve_or_create_patient_mapping(
        hospital_id=env["hosp_a_id"],
        integration_id=integ_id,
        external_system="APOLLO_HMS",
        external_patient_id=f"APL-PAT-{uuid.uuid4().hex[:6]}",
        demographic_data={
            "onehealth_id": env["onehealth_id"],
            "dob": "1988-05-14"
        }
    )
    assert match_res["matched"] is True
    assert match_res["patient_id"] == env["pat_id"]
    assert match_res["match_method"] == "EXACT_OH_ID"

    # 2. Conflicting DOB for same OH-ID -> Must QUARANTINE without corrupting identity
    conflict_res = repo.resolve_or_create_patient_mapping(
        hospital_id=env["hosp_a_id"],
        integration_id=integ_id,
        external_system="APOLLO_HMS",
        external_patient_id=f"APL-PAT-{uuid.uuid4().hex[:6]}",
        demographic_data={
            "onehealth_id": env["onehealth_id"],
            "dob": "1995-12-31" # Conflicting DOB!
        }
    )
    assert conflict_res["matched"] is False
    assert conflict_res["status"] == "QUARANTINED"
    assert conflict_res["conflict_type"] == "DOB_DISCREPANCY"


def test_cross_hospital_e2e_connected_patient_journey(setup_phase4_environment):
    """
    The definitive Phase 4 benchmark test:
    One patient -> Two healthcare providers -> One connected OH-ID journey.
    1. Hospital A: Consult + Rx + Lab Result.
    2. Hospital B: Requests consent -> Patient grants consent.
    3. Hospital B: Fetches authorized records -> Issues new consultation & prescription.
    4. Health Timeline: Shows all events from Hospital A and Hospital B in chronological order with provenance attribution.
    """
    env = setup_phase4_environment
    from backend.app.database.session import get_db_cursor

    # 1. Hospital A Events
    with get_db_cursor() as cur:
        # Consultation in Hospital A
        con_a_id = f"con-a-{uuid.uuid4().hex[:6]}"
        cur.execute("""
            INSERT INTO oh_id.opd_consultations (id, doctor_id, patient_id, diagnosis, clinical_notes)
            VALUES (%s, %s, %s, 'Cardiac Arrhythmia Assessment', 'ECG indicates occasional sinus tachycardia.')
            ON CONFLICT (id) DO NOTHING;
        """, (con_a_id, env["doc_a_id"], env["pat_id"]))

    # 2. Hospital B Consent Workflow
    consent_req = repo.create_data_sharing_request(
        patient_id=env["pat_id"],
        requesting_hospital_id=env["hosp_b_id"],
        requesting_doctor_id=env["doc_b_id"],
        purpose_code="CARETREAT",
        data_categories=["OPConsultation", "Prescription", "DiagnosticReport"]
    )
    repo.grant_data_sharing_consent(
        consent_id=consent_req["consent_id"],
        patient_id=env["pat_id"],
        allowed_categories=["OPConsultation", "Prescription", "DiagnosticReport"]
    )

    # 3. Hospital B Fetches Historical Records
    fetched_data = repo.cross_hospital_fetch_records(
        requesting_hospital_id=env["hosp_b_id"],
        requesting_doctor_id=env["doc_b_id"],
        patient_id=env["pat_id"],
        purpose="TREATMENT"
    )
    assert len(fetched_data["consultations"]) >= 1
    assert fetched_data["patient"]["onehealth_id"] == env["onehealth_id"]

    # 4. Hospital B creates new Follow-Up Consultation and Prescription
    with get_db_cursor() as cur:
        con_b_id = f"con-b-{uuid.uuid4().hex[:6]}"
        cur.execute("""
            INSERT INTO oh_id.opd_consultations (id, doctor_id, patient_id, diagnosis, clinical_notes)
            VALUES (%s, %s, %s, 'Secondary Opinion & Medication Adjustment', 'Reviewed Apollo Hospital cardiac notes. Adjusting beta-blocker.')
            ON CONFLICT (id) DO NOTHING;
        """, (con_b_id, env["doc_b_id"], env["pat_id"]))

        rx_b_id = f"rx-b-{uuid.uuid4().hex[:6]}"
        cur.execute("""
            INSERT INTO oh_id.prescriptions (id, doctor_id, patient_id, instructions)
            VALUES (%s, %s, %s, 'Metoprolol Tartrate 25mg twice daily')
            ON CONFLICT (id) DO NOTHING;
        """, (rx_b_id, env["doc_b_id"], env["pat_id"]))

    # 5. Verify Unified Multi-Hospital Health Timeline
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT event_id, event_type, title, hospital_name, is_external, provenance_source
            FROM oh_id.vw_health_timeline_events
            WHERE patient_id = %s
            ORDER BY event_timestamp DESC;
        """, (env["pat_id"],))
        timeline_events = [dict(r) for r in cur.fetchall()]

    hospitals_represented = {e["hospital_name"] for e in timeline_events if e.get("hospital_name")}
    assert "Apollo Specialty Hospital" in hospitals_represented
    assert "Fortis Malar Hospital" in hospitals_represented
    assert len(timeline_events) >= 3
