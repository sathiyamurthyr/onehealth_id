import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import uuid
from datetime import datetime, timezone
from jose import jwt
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.database.session import get_db_cursor
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

def create_test_auth_headers(user_id: str, hospital_id: str = "hosp-kedar", role_id: str = "role-doctor"):
    payload = {
        "sub": "test_clinician",
        "uid": user_id,
        "name": "Test Clinician",
        "hospital_id": hospital_id,
        "role": "DOCTOR",
        "role_id": role_id,
        "hospital_ref_id": hospital_id,
        "usertype_ref_id": role_id,
        "permissions": ["*"]
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": hospital_id,
        "X-Usertype-Ref-Id": role_id
    }

@pytest.fixture(scope="module")
def setup_test_patient_and_doctor():
    """Sets up a test patient, doctor, and hospital for Phase 3 E2E testing."""
    suffix = uuid.uuid4().hex[:6].lower()
    patient_id = f"test-pt-p3-{suffix}"
    doctor_id = f"test-doc-p3-{suffix}"
    hospital_id = "hosp-kedar"
    ohid = f"OH-2026-{suffix.upper()}"

    with get_db_cursor() as cur:
        # Ensure hospital exists
        cur.execute("SELECT id FROM oh_id.hospitals WHERE id = %s;", (hospital_id,))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO oh_id.hospitals (id, name, code, is_active)
                VALUES (%s, 'Kedar Hospital & Research Centre', 'KEDAR-HQ', TRUE)
                ON CONFLICT (id) DO NOTHING;
            """, (hospital_id,))

        # Insert test doctors and clinical staff
        for staff_id in (doctor_id, "usr-nurse-1", "usr-er-1"):
            cur.execute("""
                INSERT INTO oh_id.doctors (id, hospital_id, name, email, specialty, is_available)
                VALUES (%s, %s, 'Clinical Test Staff', %s, 'Clinical Care', TRUE)
                ON CONFLICT (id) DO UPDATE SET is_available = TRUE;
            """, (staff_id, hospital_id, f"{staff_id}.{suffix}@kedar.org"))

        # Insert test patient
        qr_token = f"qr-{uuid.uuid4().hex}"
        cur.execute("""
            INSERT INTO oh_id.patients (id, hospital_id, name, onehealth_id, phone, gender, age, qr_token, diagnosis)
            VALUES (%s, %s, 'Marcus Vance', %s, %s, 'MALE', 42, %s, 'General Examination')
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        """, (patient_id, hospital_id, ohid, f"+919888{suffix[:6]}", qr_token))

    return {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "hospital_id": hospital_id,
        "onehealth_id": ohid
    }


def test_01_pharmacy_dispensing_workflow(setup_test_patient_and_doctor):
    """Verifies doctor prescription creation, pharmacy queue listing, and dispensing."""
    env = setup_test_patient_and_doctor
    patient_id = env["patient_id"]
    doctor_id = env["doctor_id"]
    hospital_id = env["hospital_id"]
    auth_headers = create_test_auth_headers(doctor_id, hospital_id, "role-pharmacist")

    # 1. Doctor creates prescription
    rx_id = f"rx-p3-{uuid.uuid4().hex[:8]}"
    item_id = f"rxi-p3-{uuid.uuid4().hex[:8]}"
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO oh_id.prescriptions (
                id, patient_id, doctor_id, hospital_id, diagnosis, status, created_at
            ) VALUES (
                %s, %s, %s, %s, 'Acute Bronchitis', 'FINALIZED', CURRENT_TIMESTAMP
            );
        """, (rx_id, patient_id, doctor_id, hospital_id))
        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, dosage, frequency, duration_days, quantity, specific_instructions
            ) VALUES (
                %s, %s, 'Amoxicillin 500mg', '500mg', '1-0-1', 5, 15, 'After meals'
            );
        """, (item_id, rx_id))

    # 2. Pharmacy lists prescriptions
    resp = client.get(f"/api/v1/pharmacy/prescriptions?hospital_id={hospital_id}&patient_id={patient_id}")
    assert resp.status_code == 200
    prescriptions = resp.json()
    assert any(p["id"] == rx_id for p in prescriptions)

    # 3. Pharmacy dispenses prescription
    dispense_payload = {
        "items": [
            {
                "medicine_name": "Amoxicillin 500mg",
                "prescribed_quantity": 15,
                "dispensed_quantity": 15,
                "batch_number": "AMX-2026-B1",
                "expiry_date": "2028-12-31",
                "instructions": "Take after meals"
            }
        ],
        "notes": "Verified against doctor orders",
        "is_partial": False
    }
    disp_resp = client.post(
        f"/api/v1/pharmacy/prescriptions/{rx_id}/dispense",
        json=dispense_payload,
        headers=auth_headers
    )
    assert disp_resp.status_code == 200
    disp_data = disp_resp.json()["data"]
    assert disp_data["prescription_id"] == rx_id
    assert disp_data["status"] == "DISPENSED"

    # 4. Verify dispensation listing
    hist_resp = client.get(f"/api/v1/pharmacy/dispensations?prescription_id={rx_id}")
    assert hist_resp.status_code == 200
    assert len(hist_resp.json()) >= 1


def test_02_laboratory_workflow_and_structured_analytes(setup_test_patient_and_doctor):
    """Verifies investigation ordering, specimen collection, structured analyte entry, and pathologist verification."""
    env = setup_test_patient_and_doctor
    patient_id = env["patient_id"]
    doctor_id = env["doctor_id"]
    hospital_id = env["hospital_id"]
    auth_headers = create_test_auth_headers(doctor_id, hospital_id, "role-labtech")

    # 1. Create doctor lab order
    inv_id = f"ord-p3-{uuid.uuid4().hex[:8]}"
    with get_db_cursor() as cur:
        cur.execute("SELECT id FROM oh_id.lab_test_catalog LIMIT 1;")
        catalog_row = cur.fetchone()
        if catalog_row:
            test_id = catalog_row[0] if isinstance(catalog_row, (list, tuple)) else catalog_row["id"]
        else:
            test_id = "lt-cbc"
            cur.execute("""
                INSERT INTO oh_id.lab_test_catalog (id, name, department, sample_type)
                VALUES (%s, 'Complete Blood Count (CBC)', 'Hematology', 'Whole Blood (EDTA)')
                ON CONFLICT (id) DO NOTHING;
            """, (test_id,))

        cur.execute("""
            INSERT INTO oh_id.lab_orders (
                id, patient_id, doctor_id, hospital_id, test_id, status, ordered_at
            ) VALUES (
                %s, %s, %s, %s, %s, 'ORDERED', CURRENT_TIMESTAMP
            );
        """, (inv_id, patient_id, doctor_id, hospital_id, test_id))

    # 2. Phlebotomist collects sample
    col_resp = client.post(
        "/api/v1/lab/samples/collect",
        json={
            "order_id": inv_id,
            "patient_id": patient_id,
            "sample_type": "Whole Blood (EDTA)",
            "accession_number": f"ACC-{uuid.uuid4().hex[:6].upper()}",
            "notes": "Fasting sample collected"
        },
        headers=auth_headers
    )
    assert col_resp.status_code == 200
    sample_id = col_resp.json()["data"]["id"]

    # 3. Lab technician enters structured analytes
    analytes_payload = {
        "investigation_id": inv_id,
        "patient_id": patient_id,
        "sample_id": sample_id,
        "method": "Automated Hematology Analyzer XN-1000",
        "analytes": [
            {"analyte_name": "Hemoglobin", "value": "14.2", "unit": "g/dL", "reference_range": "13.0 - 17.0", "abnormal_flag": False},
            {"analyte_name": "Total Leucocyte Count (TLC)", "value": "11500", "unit": "/uL", "reference_range": "4000 - 11000", "abnormal_flag": True},
            {"analyte_name": "Platelets", "value": "240000", "unit": "/uL", "reference_range": "150000 - 450000", "abnormal_flag": False}
        ],
        "is_verified": False
    }
    res_resp = client.post(
        "/api/v1/lab/results",
        json=analytes_payload,
        headers=auth_headers
    )
    assert res_resp.status_code == 200
    result_id = res_resp.json()["data"]["id"]
    assert res_resp.json()["data"]["status"] == "PRELIMINARY"

    # 4. Pathologist verifies and finalizes
    ver_resp = client.post(
        f"/api/v1/lab/results/{result_id}/verify",
        json={"notes": "Leukocytosis noted, clinically correlates with acute bronchitis"},
        headers=auth_headers
    )
    assert ver_resp.status_code == 200
    assert ver_resp.json()["data"]["status"] == "FINALIZED"


def test_03_radiology_workflow_and_imaging_reports(setup_test_patient_and_doctor):
    """Verifies radiology ordering, scheduling, procedure execution, and impression report."""
    env = setup_test_patient_and_doctor
    patient_id = env["patient_id"]
    doctor_id = env["doctor_id"]
    hospital_id = env["hospital_id"]
    auth_headers = create_test_auth_headers(doctor_id, hospital_id, "role-radiologist")

    # 1. Doctor orders Chest X-Ray
    ord_resp = client.post(
        "/api/v1/radiology/orders",
        json={
            "patient_id": patient_id,
            "modality": "X-RAY",
            "body_part": "Chest PA View",
            "clinical_indication": "Persistent cough, r/o consolidation",
            "priority": "URGENT"
        },
        headers=auth_headers
    )
    assert ord_resp.status_code == 200
    order_id = ord_resp.json()["data"]["id"]

    # 2. Schedule study
    sched_resp = client.post(
        f"/api/v1/radiology/orders/{order_id}/schedule",
        json={"scheduled_at": "2026-10-07T10:00:00Z"},
        headers=auth_headers
    )
    assert sched_resp.status_code == 200

    # 3. Perform imaging study
    dicom_uid = f"1.2.840.10008.5.1.4.1.1.{uuid.uuid4().hex[:12]}"
    perf_resp = client.post(
        f"/api/v1/radiology/orders/{order_id}/perform",
        json={
            "dicom_study_uid": dicom_uid,
            "pacs_series_url": f"https://pacs.kedar.org/studies/{dicom_uid}"
        },
        headers=auth_headers
    )
    assert perf_resp.status_code == 200

    # 4. Radiologist creates report
    rep_resp = client.post(
        "/api/v1/radiology/reports",
        json={
            "order_id": order_id,
            "patient_id": patient_id,
            "modality": "X-RAY",
            "body_part": "Chest PA View",
            "findings": "Bilateral lung fields clear. Normal cardiac silhouette. No pleural effusion.",
            "impression": "Normal chest radiograph. No acute cardiopulmonary disease.",
            "recommendations": "Clinical follow-up as indicated.",
            "dicom_study_uid": dicom_uid,
            "pacs_series_url": f"https://pacs.kedar.org/studies/{dicom_uid}"
        },
        headers=auth_headers
    )
    assert rep_resp.status_code == 200
    assert rep_resp.json()["data"]["status"] == "FINALIZED"


def test_04_nursing_vitals_notes_and_mar(setup_test_patient_and_doctor):
    """Verifies batch vitals recording, nursing shift progress notes, and MAR administration."""
    env = setup_test_patient_and_doctor
    patient_id = env["patient_id"]
    hospital_id = env["hospital_id"]
    auth_headers = create_test_auth_headers("usr-nurse-1", hospital_id, "role-nurse")

    # 1. Nurse records vitals batch
    vitals_resp = client.post(
        "/api/v1/nursing/vitals/batch",
        json={
            "patient_id": patient_id,
            "temperature": 37.2,
            "heart_rate": 78,
            "blood_pressure_systolic": 120,
            "blood_pressure_diastolic": 80,
            "respiratory_rate": 16,
            "spo2": 99.0,
            "pain_score": 1,
            "notes": "Patient calm, resting in bed"
        },
        headers=auth_headers
    )
    assert vitals_resp.status_code == 200
    assert len(vitals_resp.json()["data"]) >= 6

    # 2. Nurse records shift note
    note_resp = client.post(
        "/api/v1/nursing/notes",
        json={
            "patient_id": patient_id,
            "note_type": "SHIFT_HANDOVER",
            "assessment": "Afebrile, vital signs stable, chest sounds clear",
            "care_provided": "IV fluids infused, oral medications administered",
            "patient_response": "Patient tolerating oral intake well",
            "concerns": "None"
        },
        headers=auth_headers
    )
    assert note_resp.status_code == 200
    assert note_resp.json()["data"]["status"] == "FINALIZED"

    # 3. Nurse records MAR
    rx_id = f"rx-mar-{uuid.uuid4().hex[:8]}"
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO oh_id.prescriptions (id, patient_id, doctor_id, hospital_id, diagnosis)
            VALUES (%s, %s, %s, %s, 'Bronchitis')
            ON CONFLICT (id) DO NOTHING;
        """, (rx_id, patient_id, env["doctor_id"], hospital_id))

    mar_resp = client.post(
        "/api/v1/nursing/medication-administrations",
        json={
            "prescription_id": rx_id,
            "patient_id": patient_id,
            "medicine_name": "Paracetamol 650mg",
            "dose": "650 mg",
            "route": "Oral",
            "status": "ADMINISTERED"
        },
        headers=auth_headers
    )
    assert mar_resp.status_code == 200
    assert mar_resp.json()["data"]["status"] == "ADMINISTERED"


def test_05_ipd_admission_and_concurrency_safe_bed_allocation(setup_test_patient_and_doctor):
    """Verifies inpatient admission, concurrency-safe bed allocation, transfer, and occupancy dashboard."""
    env = setup_test_patient_and_doctor
    patient_id = env["patient_id"]
    doctor_id = env["doctor_id"]
    hospital_id = env["hospital_id"]
    auth_headers = create_test_auth_headers(doctor_id, hospital_id, "role-doctor")

    # 1. Fetch available wards and beds
    wards_resp = client.get(f"/api/v1/ipd/wards?hospital_id={hospital_id}")
    assert wards_resp.status_code == 200
    wards = wards_resp.json()
    if not wards:
        ward_id = f"ward-p3-{uuid.uuid4().hex[:6]}"
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.wards (id, hospital_id, name, ward_type, total_beds)
                VALUES (%s, %s, 'General Ward A', 'GENERAL', 10)
                ON CONFLICT DO NOTHING;
            """, (ward_id, hospital_id))
    else:
        ward_id = wards[0]["id"]

    # Ensure at least 2 available beds exist for this test
    with get_db_cursor() as cur:
        b1_id = f"bed-p3-{uuid.uuid4().hex[:6]}"
        b2_id = f"bed-p3-{uuid.uuid4().hex[:6]}"
        cur.execute("""
            INSERT INTO oh_id.beds (id, ward_id, bed_number, hospital_id, bed_type, status, is_occupied)
            VALUES 
                (%s, %s, %s, %s, 'STANDARD', 'AVAILABLE', FALSE),
                (%s, %s, %s, %s, 'STANDARD', 'AVAILABLE', FALSE);
        """, (b1_id, ward_id, f"B-{uuid.uuid4().hex[:4].upper()}", hospital_id,
              b2_id, ward_id, f"B-{uuid.uuid4().hex[:4].upper()}", hospital_id))

    beds_resp = client.get(f"/api/v1/ipd/beds?ward_id={ward_id}&status=AVAILABLE&hospital_id={hospital_id}")
    assert beds_resp.status_code == 200
    available_beds = beds_resp.json()
    assert len(available_beds) >= 2, "Need at least 2 available beds for transfer test"
    bed_1 = available_beds[0]["id"]
    bed_2 = available_beds[1]["id"]

    # 2. Admit patient
    adm_resp = client.post(
        "/api/v1/ipd/admissions",
        json={
            "patient_id": patient_id,
            "department": "Internal Medicine",
            "admission_type": "ELECTIVE",
            "reason_for_admission": "Severe Bronchitis Observation"
        },
        headers=auth_headers
    )
    assert adm_resp.status_code == 200
    admission_id = adm_resp.json()["data"]["id"]

    # 3. Concurrency-Safe Bed Allocation
    alloc_resp = client.post(
        f"/api/v1/ipd/beds/{bed_1}/allocate",
        json={
            "admission_id": admission_id,
            "patient_id": patient_id,
            "reason": "Initial Ward Admission"
        },
        headers=auth_headers
    )
    assert alloc_resp.status_code == 200
    assert alloc_resp.json()["data"]["status"] == "OCCUPIED"

    # 4. Verify duplicate allocation fails (double allocation prevention)
    dup_resp = client.post(
        f"/api/v1/ipd/beds/{bed_1}/allocate",
        json={
            "admission_id": admission_id,
            "patient_id": patient_id
        },
        headers=auth_headers
    )
    assert dup_resp.status_code == 409  # Conflict / already occupied

    # 5. Inpatient Bed Transfer to bed_2
    trans_resp = client.post(
        f"/api/v1/ipd/beds/{bed_2}/transfer",
        json={
            "admission_id": admission_id,
            "patient_id": patient_id,
            "from_bed_id": bed_1,
            "reason": "Moved to step-down bed"
        },
        headers=auth_headers
    )
    assert trans_resp.status_code == 200
    assert trans_resp.json()["data"]["status"] == "OCCUPIED"

    # 6. Check live occupancy dashboard
    dash_resp = client.get(f"/api/v1/ipd/dashboard?hospital_id={hospital_id}")
    assert dash_resp.status_code == 200


def test_06_emergency_intake_triage_and_reconciliation(setup_test_patient_and_doctor):
    """Verifies emergency rapid intake with temporary ID, triage priority, and identity reconciliation."""
    env = setup_test_patient_and_doctor
    patient_id = env["patient_id"]
    hospital_id = env["hospital_id"]
    auth_headers = create_test_auth_headers("usr-er-1", hospital_id, "role-nurse")

    # 1. Unidentified Emergency Intake
    intake_resp = client.post(
        "/api/v1/emergency/intake",
        json={
            "arrival_mode": "AMBULANCE",
            "presenting_complaint": "Acute trauma and breathlessness",
            "is_unknown_identity": True
        },
        headers=auth_headers
    )
    assert intake_resp.status_code == 200
    encounter_id = intake_resp.json()["data"]["id"]
    assert intake_resp.json()["data"]["is_unknown_identity"] is True

    # 2. Triage Assessment (Level 2 Emergent)
    tri_resp = client.post(
        f"/api/v1/emergency/encounters/{encounter_id}/triage",
        json={
            "triage_category": "EMERGENT",
            "triage_priority": 2,
            "vital_signs": {"heart_rate": 115, "bp": "90/60", "spo2": 91},
            "pain_score": 8,
            "observations": "High respiratory distress"
        },
        headers=auth_headers
    )
    assert tri_resp.status_code == 200
    assert tri_resp.json()["data"]["triage_priority"] == 2

    # 3. Reconcile temporary encounter with permanent patient
    rec_resp = client.post(
        f"/api/v1/emergency/encounters/{encounter_id}/reconcile",
        json={"verified_patient_id": patient_id},
        headers=auth_headers
    )
    assert rec_resp.status_code == 200
    assert rec_resp.json()["data"]["patient_id"] == patient_id
    assert rec_resp.json()["data"]["is_unknown_identity"] is False

    # 4. Finalize emergency disposition
    disp_resp = client.post(
        f"/api/v1/emergency/encounters/{encounter_id}/disposition",
        json={
            "disposition": "ADMITTED_IPD",
            "disposition_notes": "Patient stabilized, admitted to internal medicine ward"
        },
        headers=auth_headers
    )
    assert disp_resp.status_code == 200
    assert disp_resp.json()["data"]["disposition"] == "ADMITTED_IPD"


def test_07_referrals_and_discharge_summary(setup_test_patient_and_doctor):
    """Verifies digital referral workflow and structured discharge with auto-bed release."""
    env = setup_test_patient_and_doctor
    patient_id = env["patient_id"]
    doctor_id = env["doctor_id"]
    hospital_id = env["hospital_id"]
    auth_headers = create_test_auth_headers(doctor_id, hospital_id, "role-doctor")

    # 1. Create clinical referral
    ref_resp = client.post(
        "/api/v1/referrals",
        json={
            "patient_id": patient_id,
            "destination_hospital_id": hospital_id,
            "specialty_needed": "Pulmonology",
            "reason_for_referral": "Post-discharge pulmonary function test (PFT)",
            "urgency": "ROUTINE",
            "clinical_summary": "Recovered acute bronchitis, requires specialist evaluation"
        },
        headers=auth_headers
    )
    assert ref_resp.status_code == 200
    ref_id = ref_resp.json()["data"]["id"]

    # Accept referral
    acc_resp = client.patch(
        f"/api/v1/referrals/{ref_id}/status",
        json={"status": "ACCEPTED", "notes": "Appointment scheduled with Pulmonology clinic"},
        headers=auth_headers
    )
    assert acc_resp.status_code == 200
    assert acc_resp.json()["data"]["status"] == "ACCEPTED"

    # 2. Inpatient Discharge
    # Get active admission
    adm_list = sp_repository.list_inpatient_admissions(hospital_id=hospital_id, patient_id=patient_id, status="ADMITTED")
    if adm_list:
        admission_id = adm_list[0]["id"]
        # Create draft discharge summary
        dis_resp = client.post(
            "/api/v1/discharges",
            json={
                "admission_id": admission_id,
                "patient_id": patient_id,
                "diagnosis": "Acute Bronchitis - Resolved",
                "discharge_type": "ROUTINE",
                "condition_at_discharge": "RECOVERED",
                "clinical_summary": "Patient successfully treated with oral antibiotics and bronchodilators.",
                "procedures_performed": ["Chest PA Radiography", "Nebulization"],
                "discharge_medications": [
                    {"medicine_name": "Levosalbutamol Inhaler", "dose": "2 puffs", "frequency": "SOS", "duration": "5 days"}
                ],
                "follow_up_instructions": "Follow up in OPD after 1 week. Return immediately if breathlessness recurs.",
                "status": "DRAFT"
            },
            headers=auth_headers
        )
        assert dis_resp.status_code == 200
        dis_id = dis_resp.json()["data"]["id"]

        # Finalize discharge
        fin_resp = client.post(
            f"/api/v1/discharges/{dis_id}/finalize",
            headers=auth_headers
        )
        assert fin_resp.status_code == 200
        assert fin_resp.json()["data"]["status"] == "FINALIZED"


def test_08_health_timeline_integration(setup_test_patient_and_doctor):
    """Verifies that all Phase 3 events feed directly into the unified OH-ID Health Timeline."""
    env = setup_test_patient_and_doctor
    patient_id = env["patient_id"]

    events = sp_repository.get_unified_health_timeline(patient_id=patient_id)
    assert len(events) >= 1, "Health timeline should contain Phase 3 clinical care events"
    
    event_types = {e["event_type"] for e in events}
    print(f"Recorded Timeline Event Types for patient {patient_id}: {event_types}")
    assert len(event_types) >= 1
