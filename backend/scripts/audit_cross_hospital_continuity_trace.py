"""
OH-ID Cross-Hospital Medical Record Continuity Audit Script
===========================================================
Executes the exact 8-step synthetic scenario via FastAPI TestClient:
1. Register a synthetic patient at Hospital A.
2. Create an appointment and clinical record (consultation & prescription) at Hospital A.
3. Authenticate an authorized doctor at Hospital B.
4. Locate the same patient using supported patient-identification processes (ID, phone, QR, search).
5. Determine whether the doctor can discover and access the Hospital A record (via /patients/{id}, /doctor/patients/{id}/context, /doctor/patients/{id}/history, /hospital/data-sharing/fetch).
6. Check whether consent or another applicable legal basis is required and enforced before access.
7. Verify access restrictions, audit logging, and denial behavior.
8. Revoke consent or access authorization and confirm that subsequent access is denied where applicable.
"""

import sys
from pathlib import Path
_root = str(Path(__file__).resolve().parent.parent.parent.parent.parent)
# Note: root dir is D:/oh-id
sys.path.insert(0, "D:/oh-id")

import uuid
import json
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

def run_audit():
    results = {}
    print("=" * 80)
    print("STARTING OH-ID CROSS-HOSPITAL RECORD CONTINUITY AUDIT TRACE")
    print("=" * 80)

    # Setup unique synthetic IDs
    uid_suffix = uuid.uuid4().hex[:6]
    hosp_a_id = f"hosp-a-{uid_suffix}"
    hosp_b_id = f"hosp-b-{uid_suffix}"
    branch_a_id = f"branch-a-{uid_suffix}"
    branch_b_id = f"branch-b-{uid_suffix}"
    doc_a_id = f"doc-a-{uid_suffix}"
    doc_b_id = f"doc-b-{uid_suffix}"
    user_doc_b_id = f"usr-docb-{uid_suffix}"
    doc_b_username = f"dr.audit.{uid_suffix}"
    patient_id = f"pat-audit-{uid_suffix}"
    ohid_val = f"OH-2026-AUD-{uid_suffix.upper()}"
    patient_phone = f"+9198765{uid_suffix[:5]}"
    patient_qr = f"qr-audit-{uid_suffix}"

    with get_db_cursor() as cur:
        # Create Hospital A and Hospital B
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, is_active)
            VALUES 
                (%s, 'Apex Heart Institute (Hospital A)', %s, TRUE),
                (%s, 'Bellevue Specialty Care (Hospital B)', %s, TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (hosp_a_id, f"APX-{uid_suffix[:4].upper()}", hosp_b_id, f"BEL-{uid_suffix[:4].upper()}"))

        cur.execute("""
            INSERT INTO oh_id.hospital_branches (id, hospital_id, name, code, is_main_branch)
            VALUES
                (%s, %s, 'Apex Main Campus', %s, TRUE),
                (%s, %s, 'Bellevue Central Wing', %s, TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (branch_a_id, hosp_a_id, f"BR-A-{uid_suffix[:3]}", branch_b_id, hosp_b_id, f"BR-B-{uid_suffix[:3]}"))

        # Create Doctor A at Hospital A and Doctor B at Hospital B
        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES 
                (%s, %s, 'Dr. Anand Kumar (Hospital A)', 'Cardiology', TRUE),
                (%s, %s, 'Dr. Bhavna Sharma (Hospital B)', 'General Medicine', TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (doc_a_id, hosp_a_id, doc_b_id, hosp_b_id))

        # Create user account for Doctor B
        from backend.app.core.security import get_password_hash
        pwd_hash = get_password_hash("DoctorB#2026")
        cur.execute("""
            INSERT INTO oh_id.users (id, username, email, full_name, password_hash, role, hospital_id, is_active)
            VALUES (%s, %s, %s, 'Dr. Bhavna Sharma', %s, 'DOCTOR', %s, TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (user_doc_b_id, doc_b_username, f"{doc_b_username}@example.com", pwd_hash, hosp_b_id))

    print(f"Provisioned Synthetic Environment:")
    print(f"  Hospital A: {hosp_a_id}")
    print(f"  Hospital B: {hosp_b_id}")
    print(f"  Doctor B Username: {doc_b_username}")

    # =========================================================================
    # STEP 1: Register synthetic patient at Hospital A
    # =========================================================================
    print("\n--- STEP 1: Register synthetic patient at Hospital A ---")
    reg_res = sp_repository.register_patient(
        name="Sunil Natarajan",
        age=45,
        gender="Male",
        phone=patient_phone,
        email=f"sunil.{uid_suffix}@example.com",
        address="14 West Mada Street, Mylapore, Chennai",
        emergency_contact="+919876543210",
        blood_group="O+",
        diagnosis="Hypertension & Chronic Angina",
        identity_type="NATIONAL_ID",
        identity_number=f"IND-{uid_suffix.upper()}",
        hospital_id=hosp_a_id,
        branch_id=branch_a_id,
        patient_id=patient_id,
        is_demo_data=True
    )
    print(f"Patient registered at Hospital A: ID={reg_res['id']}, Name={reg_res['name']}, OH-ID={reg_res.get('onehealth_id')}, Hospital={reg_res.get('hospital_id')}")
    results["step1_patient_registration"] = {
        "status": "SUCCESS" if reg_res else "FAIL",
        "patient_id": reg_res.get("id"),
        "hospital_id": reg_res.get("hospital_id")
    }

    # =========================================================================
    # STEP 2: Create appointment & clinical record at Hospital A
    # =========================================================================
    print("\n--- STEP 2: Create appointment and clinical records at Hospital A ---")
    with get_db_cursor() as cur:
        # Appointment at Hospital A
        appt_a_id = f"appt-a-{uid_suffix}"
        cur.execute("""
            INSERT INTO oh_id.appointments (id, patient_id, doctor_id, hospital_id, slot, status, notes)
            VALUES (%s, %s, %s, %s, '2026-10-15 10:30 AM', 'COMPLETED', 'Initial Cardiac Assessment')
            ON CONFLICT (id) DO NOTHING;
        """, (appt_a_id, patient_id, doc_a_id, hosp_a_id))

        # OPD Consultation at Hospital A
        con_a_id = f"con-a-{uid_suffix}"
        cur.execute("""
            INSERT INTO oh_id.opd_consultations (
                id, appointment_id, doctor_id, patient_id, diagnosis, symptoms, clinical_notes,
                vitals, chief_complaint, consultation_status
            ) VALUES (
                %s, %s, %s, %s, 'Ischemic Heart Disease (I25.9)', 'Exertional chest discomfort',
                'Patient reports recurrent angina on brisk walking. ECG confirms inferior ST depression.',
                '{\"systolic\": 148, \"diastolic\": 92, \"pulse\": 84, \"spo2\": 98}'::jsonb,
                '{\"complaint\": \"Chest pain on exertion\", \"duration\": \"3 weeks\"}'::jsonb,
                'COMPLETED'
            ) ON CONFLICT (id) DO NOTHING;
        """, (con_a_id, appt_a_id, doc_a_id, patient_id))

        # Prescription at Hospital A
        rx_a_id = f"rx-a-{uid_suffix}"
        cur.execute("""
            INSERT INTO oh_id.prescriptions (
                id, patient_id, doctor_id, diagnosis, status, instructions
            ) VALUES (
                %s, %s, %s, 'Ischemic Heart Disease (I25.9)', 'SIGNED',
                'Strict compliance with antianginal medications. Follow up in 14 days.'
            ) ON CONFLICT (id) DO NOTHING;
        """, (rx_a_id, patient_id, doc_a_id))

        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, dosage, frequency, duration_days
            ) VALUES 
                (%s, %s, 'Aspirin 75mg', '75mg', '1-0-0', 30),
                (%s, %s, 'Atorvastatin 40mg', '40mg', '0-0-1', 30)
            ON CONFLICT DO NOTHING;
        """, (f"item-1-{uid_suffix}", rx_a_id, f"item-2-{uid_suffix}", rx_a_id))

    print(f"Created Clinical Records at Hospital A:")
    print(f"  Appointment ID: {appt_a_id}")
    print(f"  Consultation ID: {con_a_id} (Diagnosis: Ischemic Heart Disease)")
    print(f"  Prescription ID: {rx_a_id} (Aspirin 75mg, Atorvastatin 40mg)")
    results["step2_hospital_a_records"] = {
        "appointment_id": appt_a_id,
        "consultation_id": con_a_id,
        "prescription_id": rx_a_id
    }

    # =========================================================================
    # STEP 3: Authenticate Doctor at Hospital B
    # =========================================================================
    print("\n--- STEP 3: Authenticate Doctor B at Hospital B ---")
    login_res = client.post("/api/v1/auth/login", json={"username": doc_b_username, "password": "DoctorB#2026"})
    assert login_res.status_code == 200, f"Doctor B login failed: {login_res.text}"
    token_b = login_res.json()["access_token"]
    hdr_b = {"Authorization": f"Bearer {token_b}"}

    # Verify Doctor B workspace
    ws_res = client.get("/api/v1/me/workspace", headers=hdr_b)
    assert ws_res.status_code == 200
    doc_b_ws = ws_res.json()["workspace"]
    print(f"Doctor B Authenticated successfully: User={doc_b_username}, Role={doc_b_ws.get('role')}, HospitalRefId={doc_b_ws.get('hospital_ref_id')}")
    results["step3_doctor_b_auth"] = {
        "username": doc_b_username,
        "hospital_id": doc_b_ws.get("hospital_ref_id"),
        "role": doc_b_ws.get("role")
    }

    # =========================================================================
    # STEP 4: Locate patient using supported identification processes
    # =========================================================================
    print("\n--- STEP 4: Locate Patient using supported processes from Hospital B ---")

    # 4a. Search via GET /api/v1/patients?search=Sunil
    search_res = client.get(f"/api/v1/patients?search={patient_phone}", headers=hdr_b)
    print(f"4a. GET /patients?search={patient_phone} -> HTTP {search_res.status_code}")
    search_patients = search_res.json() if search_res.status_code == 200 else []
    patient_found_in_list = any(p["id"] == patient_id for p in search_patients)
    print(f"    Patient found in Hospital B patient list: {patient_found_in_list} (Count: {len(search_patients)})")

    # 4b. Locate via Duplicate Check: POST /api/v1/patients/check-duplicate
    dup_res = client.post("/api/v1/patients/check-duplicate", json={"phone": patient_phone}, headers=hdr_b)
    print(f"4b. POST /patients/check-duplicate -> HTTP {dup_res.status_code}")
    dup_data = dup_res.json() if dup_res.status_code == 200 else {}
    dup_found = dup_data.get("duplicate_found", False)
    print(f"    Duplicate search across registry found matches: {dup_found} (Count: {len(dup_data.get('matches', []))})")

    # 4c. Locate via Zero-Knowledge QR Token: POST /api/v1/patients/qr/resolve
    actual_qr = reg_res.get("qr_token") or patient_qr
    qr_res = client.post("/api/v1/patients/qr/resolve", json={"qr_token": actual_qr}, headers=hdr_b)
    print(f"4c. POST /patients/qr/resolve -> HTTP {qr_res.status_code}")
    qr_resolved = qr_res.status_code == 200
    if qr_resolved:
        print(f"    QR Resolved successfully: Name={qr_res.json().get('name')}, Hospital={qr_res.json().get('hospital_id')}")

    results["step4_patient_discovery"] = {
        "hospital_list_isolated": not patient_found_in_list,
        "duplicate_registry_match": dup_found,
        "qr_resolution": qr_resolved
    }

    # =========================================================================
    # STEP 5 & 6: Access Hospital A records from Hospital B & Consent Enforcement
    # =========================================================================
    print("\n--- STEP 5 & 6: Attempt Access to Hospital A records from Hospital B ---")

    # 5a. Direct Demographic Read: GET /api/v1/patients/{patient_id}
    p_get_res = client.get(f"/api/v1/patients/{patient_id}", headers=hdr_b)
    print(f"5a. Direct GET /api/v1/patients/{patient_id} -> HTTP {p_get_res.status_code}")
    print(f"    Response: {p_get_res.json() if p_get_res.status_code != 200 else 'Returned demographic record'}")

    # 5b. Doctor Workspace Context: GET /api/v1/doctor/patients/{patient_id}/context
    ctx_res = client.get(f"/api/v1/doctor/patients/{patient_id}/context", headers=hdr_b)
    print(f"5b. Clinical Context: GET /api/v1/doctor/patients/{patient_id}/context -> HTTP {ctx_res.status_code}")
    if ctx_res.status_code == 200:
        ctx_data = ctx_res.json()
        print(f"    Recent encounters count: {len(ctx_data.get('recent_encounters', []))}")
        print(f"    Recent prescriptions count: {len(ctx_data.get('recent_prescriptions', []))}")
        for rx in ctx_data.get("recent_prescriptions", []):
            print(f"      Rx ID: {rx.get('id')}, Hospital: {rx.get('hospital_name')}, Items: {rx.get('items_count')}")

    # 5c. Doctor Workspace Longitudinal History: GET /api/v1/doctor/patients/{patient_id}/history
    hist_res = client.get(f"/api/v1/doctor/patients/{patient_id}/history", headers=hdr_b)
    print(f"5c. Longitudinal History: GET /api/v1/doctor/patients/{patient_id}/history -> HTTP {hist_res.status_code}")
    if hist_res.status_code == 200:
        hist_events = hist_res.json()
        print(f"    History events count: {len(hist_events)}")
        for ev in hist_events:
            print(f"      Event: [{ev.get('record_type')}] {ev.get('title')} @ {ev.get('hospital_name')} (Diagnosis: {ev.get('diagnosis')})")

    # 5d. Consent-Gated Cross-Hospital Fetch: POST /api/v1/hospital/data-sharing/fetch (WITHOUT CONSENT)
    fetch_unconsented = client.post("/api/v1/hospital/data-sharing/fetch", json={"patient_id": patient_id, "purpose": "TREATMENT"}, headers=hdr_b)
    print(f"5d. Gated Exchange: POST /api/v1/hospital/data-sharing/fetch (NO CONSENT) -> HTTP {fetch_unconsented.status_code}")
    print(f"    Detail: {fetch_unconsented.json()}")

    results["step5_access_channels"] = {
        "direct_patient_endpoint_status": p_get_res.status_code,
        "doctor_workspace_context_status": ctx_res.status_code,
        "doctor_workspace_history_status": hist_res.status_code,
        "data_sharing_fetch_unconsented_status": fetch_unconsented.status_code
    }

    # =========================================================================
    # STEP 7 & 8: Grant Consent, Fetch with Consent, Audit Log, and Revocation
    # =========================================================================
    print("\n--- STEP 7 & 8: Consent Lifecycle, Scoped Fetch, Audit & Revocation ---")

    # 7a. Hospital B requests consent
    req_consent_res = client.post("/api/v1/hospital/data-sharing/request", json={
        "patient_id": patient_id,
        "purpose_code": "CARETREAT",
        "purpose_text": "Care and treatment at Hospital B",
        "data_categories": ["OPConsultation", "Prescription"],
        "expires_hours": 48
    }, headers=hdr_b)
    print(f"7a. POST /hospital/data-sharing/request -> HTTP {req_consent_res.status_code}")
    consent_obj = req_consent_res.json() if req_consent_res.status_code == 200 else {}
    consent_id = consent_obj.get("consent_id")
    print(f"    Consent Request ID: {consent_id}, Status: {consent_obj.get('consent_status')}")

    # 7b. Patient logs in and approves consent
    # Create patient login user linked to patient
    pat_user_id = f"usr-pat-{uid_suffix}"
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO oh_id.users (id, username, email, full_name, password_hash, role, user_ref_id, is_active)
            VALUES (%s, %s, %s, 'Sunil Natarajan', %s, 'PATIENT', %s, TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (pat_user_id, f"pat.{uid_suffix}", f"pat.{uid_suffix}@example.com", pwd_hash, patient_id))

        cur.execute("""
            UPDATE oh_id.patients SET user_id = %s WHERE id = %s;
        """, (pat_user_id, patient_id))

    pat_login = client.post("/api/v1/auth/login", json={"username": f"pat.{uid_suffix}", "password": "DoctorB#2026"})
    assert pat_login.status_code == 200, f"Patient login failed: {pat_login.text}"
    token_pat = pat_login.json()["access_token"]
    hdr_pat = {"Authorization": f"Bearer {token_pat}"}

    # Patient approves consent ONLY for Prescription (deliberately withholding consultation!)
    approve_res = client.post(f"/api/v1/me/data-sharing/{consent_id}/approve", json={
        "allowed_categories": ["Prescription"],
        "expires_hours": 48
    }, headers=hdr_pat)
    print(f"7b. POST /me/data-sharing/{consent_id}/approve (Prescription only) -> HTTP {approve_res.status_code}")
    print(f"    Approved consent: {approve_res.json()}")

    # 7c. Gate Disabled Verification: Prove that even with active consent, access is denied if feature gate is False
    fetch_gate_disabled = client.post("/api/v1/hospital/data-sharing/fetch", json={"patient_id": patient_id, "purpose": "TREATMENT"}, headers=hdr_b)
    print(f"7c. POST /hospital/data-sharing/fetch (GATE DISABLED DEFAULT) -> HTTP {fetch_gate_disabled.status_code}")
    print(f"    Detail: {fetch_gate_disabled.json()}")
    gate_disabled_enforced = (fetch_gate_disabled.status_code == 403)

    # 7d. Temporarily enable cross-hospital sharing to verify authorized scoped fetch
    from backend.app.core.config import settings
    orig_flag = settings.ENABLE_CROSS_HOSPITAL_SHARING
    settings.ENABLE_CROSS_HOSPITAL_SHARING = True

    try:
        # Doctor B fetches records with active consent and enabled sharing
        fetch_consented = client.post("/api/v1/hospital/data-sharing/fetch", json={"patient_id": patient_id, "purpose": "TREATMENT"}, headers=hdr_b)
        print(f"7d. POST /hospital/data-sharing/fetch (GATE ENABLED + CONSENT) -> HTTP {fetch_consented.status_code}")
        consented_data = fetch_consented.json() if fetch_consented.status_code == 200 else {}
        print(f"    Authorized scope returned: {consented_data.get('authorized_scope')}")
        print(f"    Prescriptions returned count: {len(consented_data.get('prescriptions', []))}")
        print(f"    Consultations returned count: {len(consented_data.get('consultations', []))} (Should be 0 due to scope enforcement)")

        # Verify diagnoses are redacted on prescriptions when consultation was unconsented
        rxs = consented_data.get("prescriptions", [])
        no_diagnosis_disclosed = all(rx.get("diagnosis") is None for rx in rxs) if rxs else True
        print(f"    Prescription diagnoses redacted: {no_diagnosis_disclosed}")

        # Doctor workspace context verification under scoped consent
        ctx_consented = client.get(f"/api/v1/doctor/patients/{patient_id}/context", headers=hdr_b)
        print(f"7e. Doctor Workspace Context (CONSENTED): HTTP {ctx_consented.status_code}")
        ctx_cdata = ctx_consented.json() if ctx_consented.status_code == 200 else {}
        rx_count = len(ctx_cdata.get("recent_prescriptions", []))
        enc_count = len(ctx_cdata.get("recent_encounters", []))
        print(f"    Context scoped: {rx_count} prescriptions, {enc_count} encounters (encounters should be 0)")

        # 7f. Check Audit Logging for this consent-based fetch
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT id, actor_id, action, resource_type, resource_id, details, created_at
                FROM oh_id.audit_logs
                WHERE resource_id = %s OR details::text LIKE %s
                ORDER BY created_at DESC LIMIT 5;
            """, (patient_id, f"%{patient_id}%"))
            audit_rows = [dict(r) for r in cur.fetchall()]
        print(f"7f. Audit log entries found for patient {patient_id}: {len(audit_rows)}")
        for a in audit_rows:
            print(f"    Audit: Action={a.get('action')}, Actor={a.get('actor_id')}, Resource={a.get('resource_type')}:{a.get('resource_id')}")

        # 8. Revoke Consent and Confirm Subsequent Denial
        print("\n--- STEP 8: Revoke Consent and Verify Subsequent Access Denial ---")
        revoke_res = client.post(f"/api/v1/me/data-sharing/{consent_id}/revoke", json={"reason": "Audit test revocation"}, headers=hdr_pat)
        print(f"8a. POST /me/data-sharing/{consent_id}/revoke -> HTTP {revoke_res.status_code}")
        print(f"    Revocation result: {revoke_res.json()}")

        # Subsequent fetch attempt by Hospital B
        subsequent_fetch = client.post("/api/v1/hospital/data-sharing/fetch", json={"patient_id": patient_id, "purpose": "TREATMENT"}, headers=hdr_b)
        print(f"8b. POST /hospital/data-sharing/fetch (AFTER REVOCATION) -> HTTP {subsequent_fetch.status_code}")
        print(f"    Detail: {subsequent_fetch.json()}")

        # Subsequent context attempt by Hospital B
        subsequent_ctx = client.get(f"/api/v1/doctor/patients/{patient_id}/context", headers=hdr_b)
        print(f"8c. Doctor Workspace Context (AFTER REVOCATION): HTTP {subsequent_ctx.status_code}")

    finally:
        settings.ENABLE_CROSS_HOSPITAL_SHARING = orig_flag

    results["step7_8_consent_lifecycle"] = {
        "consent_request_created": req_consent_res.status_code == 200,
        "consent_approved": approve_res.status_code == 200,
        "gate_disabled_blocks_access": gate_disabled_enforced,
        "scoped_fetch_success": fetch_consented.status_code == 200,
        "scope_strictly_restricted": len(consented_data.get("consultations", [])) == 0 and len(consented_data.get("prescriptions", [])) > 0 and no_diagnosis_disclosed,
        "revocation_success": revoke_res.status_code == 200,
        "subsequent_fetch_denied": subsequent_fetch.status_code == 403,
        "subsequent_context_denied": subsequent_ctx.status_code == 404
    }

    print("\n" + "=" * 80)
    print("AUDIT TRACE SUMMARY")
    print("=" * 80)
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    run_audit()
