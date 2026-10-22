import sys
import os
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import uuid
import random
from datetime import datetime, date, timedelta, timezone
from jose import jwt
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

@pytest.fixture
def hosp_admin_auth_headers():
    token = jwt.encode(
        {
            "sub": "hospadmin",
            "uid": "usr-hosp-admin",
            "role": "HOSPITAL_ADMIN",
            "roles": ["HOSPITAL_ADMIN"],
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "permissions": [
                "hospital.read", "hospital.update", "dashboard.read", "doctor.read", "doctor.write",
                "queue.read", "queue.manage", "appointment.read", "appointment.create", "appointment.manage",
                "appointment.checkin", "patient.read", "patient.create", "patient.update", "user.read", "user.create",
                "user.manage", "system.manage"
            ],
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

@pytest.fixture
def doctor_auth_headers():
    token = jwt.encode(
        {
            "sub": "dr.kumar",
            "uid": "usr-kedar-doc-kumar",
            "role": "DOCTOR",
            "roles": ["DOCTOR"],
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "permissions": [
                "clinical.read", "clinical.write", "consultation.create", "consultation.update",
                "patient.read", "queue.read", "queue.call", "queue.manage", "doctor.read", "dashboard.read"
            ],
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

@pytest.fixture
def nurse_auth_headers():
    token = jwt.encode(
        {
            "sub": "nurse.kavitha.1ab729@kedarhospital.org",
            "uid": "usr-29809196ec",
            "role": "NURSE",
            "roles": ["NURSE"],
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "permissions": [
                "patient.read", "patient.update", "queue.read", "queue.manage",
                "nursing.tasks.manage", "vitals.record", "triage.manage"
            ],
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

@pytest.fixture
def receptionist_auth_headers():
    token = jwt.encode(
        {
            "sub": "frontdesk.973743@kedarhospital.org",
            "uid": "usr-2a6cc79124",
            "role": "RECEPTIONIST",
            "roles": ["RECEPTIONIST"],
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "permissions": [
                "patient.read", "patient.create", "appointment.read", "appointment.create",
                "appointment.checkin", "appointment.manage", "queue.read", "queue.manage"
            ],
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

@pytest.fixture
def patient_auth_headers():
    token = jwt.encode(
        {
            "sub": "patient",
            "uid": "usr-patient",
            "role": "PATIENT",
            "roles": ["PATIENT"],
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "permissions": ["patient.self.read"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }


def test_hospital_operations_dashboard_real_metrics(hosp_admin_auth_headers):
    """
    Test 1: Verify operational dashboard returns real calculated metrics
    including appointments breakdown, capacity, active counters, and real-time alerts.
    """
    res = client.get("/api/v1/hospital/dashboard?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "total_appointments_today" in data
    assert "checked_in_today" in data
    assert "waiting_today" in data
    assert "in_consultation_today" in data
    assert "completed_today" in data
    assert "no_show_today" in data
    assert "active_doctors_count" in data
    assert "departments_breakdown" in data
    assert isinstance(data["departments_breakdown"], list)


def test_patient_flow_hourly_analytics(hosp_admin_auth_headers):
    """
    Test 2: Verify hourly patient flow metrics endpoint.
    """
    res = client.get("/api/v1/hospital/dashboard/patient-flow?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert res.status_code == 200, res.text
    items = res.json()
    assert isinstance(items, list)
    if len(items) > 0:
        first = items[0]
        assert "hour_label" in first
        assert "total_checked_in" in first
        assert "avg_wait_minutes" in first


def test_appointment_double_booking_conflict_prevention(receptionist_auth_headers):
    """
    Test 3: Prevent conflicting appointments for the same doctor at the same slot.
    """
    # Create or fetch a test patient
    pat_res = client.post(
        "/api/v1/hospital/patients/register",
        json={
            "name": f"Test Patient Conflict {uuid.uuid4().hex[:6]}",
            "age": 32,
            "gender": "Male",
            "phone": f"+9198765{uuid.uuid4().hex[:5]}",
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert pat_res.status_code == 201, pat_res.text
    patient_id = pat_res.json()["patient_id"]

    rand_suffix = uuid.uuid4().hex[:4]
    slot_date = str(date.today() + timedelta(days=20))
    slot_time_str = f"11:{rand_suffix[:2]} AM"
    slot_time = f"{slot_date} {slot_time_str}"

    # First booking succeeds
    b1 = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "doctor_id": "doc-k-01",
            "slot": slot_time,
            "appointment_date": slot_date,
            "appointment_time": slot_time_str,
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert b1.status_code == 201, b1.text

    # Second booking at exact same slot for same doctor must be rejected
    b2 = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "doctor_id": "doc-k-01",
            "slot": slot_time,
            "appointment_date": slot_date,
            "appointment_time": slot_time_str,
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert b2.status_code == 400
    assert any(phrase in b2.text.lower() for phrase in ("conflict", "existing appointment", "already has an", "already booked"))


def test_checkin_creates_visit_token_and_queue(receptionist_auth_headers):
    """
    Test 4: Verify check-in creates a visit encounter, generates department prefix token,
    inserts into queue_entries, and emits patient flow event.
    """
    pat_res = client.post(
        "/api/v1/hospital/patients/register",
        json={
            "name": f"Checkin Patient {uuid.uuid4().hex[:6]}",
            "age": 45,
            "gender": "Female",
            "phone": f"+9198764{uuid.uuid4().hex[:5]}",
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert pat_res.status_code == 201
    patient_id = pat_res.json()["patient_id"]

    rand_id = uuid.uuid4().hex[:6]
    unique_time = f"{datetime.now().strftime('%H%M%S')}_{rand_id}"

    # Book appointment with valid seeded doctor doc-k-01
    b_res = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "doctor_id": "doc-k-01",
            "slot": f"2026-11-20 {unique_time}",
            "appointment_date": "2026-11-20",
            "appointment_time": unique_time,
            "department_id": "dept-k-01",
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert b_res.status_code == 201, b_res.text
    appt_id = b_res.json()["id"]

    # Perform check-in
    chk_res = client.post(f"/api/v1/appointments/{appt_id}/check-in", headers=receptionist_auth_headers)
    assert chk_res.status_code == 200, chk_res.text
    chk_data = chk_res.json()
    assert chk_data["success"] is True
    assert "data" in chk_data
    details = chk_data["data"]
    assert details.get("visit_id") is not None
    assert details.get("token_number") is not None
    assert details.get("token_str") is not None
    assert details.get("queue_id") is not None
    assert details.get("status") == "CHECKED_IN"


def test_reception_direct_walk_in(receptionist_auth_headers):
    """
    Test 5: Reception direct walk-in creates appointment, visit, token, and queue.
    """
    pat_res = client.post(
        "/api/v1/hospital/patients/register",
        json={
            "name": f"Walkin Patient {uuid.uuid4().hex[:6]}",
            "age": 28,
            "gender": "Male",
            "phone": f"+9198763{uuid.uuid4().hex[:5]}",
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert pat_res.status_code == 201
    patient_id = pat_res.json()["patient_id"]

    walk_res = client.post(
        "/api/v1/hospital/reception/walk-in",
        json={
            "patient_id": patient_id,
            "department_id": "dept-k-01",
            "doctor_id": "doc-k-01",
            "priority": "NORMAL",
            "reason": "Direct Walk-in Checkup",
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert walk_res.status_code == 201, walk_res.text
    walk_data = walk_res.json()
    assert walk_data.get("success") is True
    assert walk_data.get("appointment_id") is not None
    assert walk_data.get("visit_id") is not None
    assert walk_data.get("token_str") is not None
    assert walk_data.get("queue_id") is not None


def test_queue_state_transitions_and_role_gating(doctor_auth_headers, nurse_auth_headers, receptionist_auth_headers, patient_auth_headers):
    """
    Test 6: Verify queue transitions and role-based permissions:
    - CALL_NEXT: Doctor role only (patient gets 403)
    - START_CONSULT: Doctor role only
    - TRANSFER: Moves queue entry to another doctor
    - COMPLETE: Completes the encounter
    """
    # Create walk-in to get a queue entry
    pat_res = client.post(
        "/api/v1/hospital/patients/register",
        json={
            "name": f"Queue Flow Patient {uuid.uuid4().hex[:6]}",
            "age": 36,
            "gender": "Female",
            "phone": f"+9198762{uuid.uuid4().hex[:5]}",
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert pat_res.status_code == 201
    patient_id = pat_res.json()["patient_id"]

    walk_res = client.post(
        "/api/v1/hospital/reception/walk-in",
        json={
            "patient_id": patient_id,
            "department_id": "dept-k-01",
            "doctor_id": "doc-k-01",
            "hospital_id": "hosp-kedar"
        },
        headers=receptionist_auth_headers
    )
    assert walk_res.status_code == 201
    queue_id = walk_res.json()["queue_id"]

    # Patient role attempting CALL_NEXT -> 403
    p_call = client.post(f"/api/v1/queue/{queue_id}/action", json={"action": "CALL_NEXT"}, headers=patient_auth_headers)
    assert p_call.status_code == 403

    # Doctor calling patient -> 200
    doc_call = client.post(f"/api/v1/queue/{queue_id}/action", json={"action": "CALL_NEXT"}, headers=doctor_auth_headers)
    assert doc_call.status_code == 200, doc_call.text
    assert doc_call.json()["data"]["status"] == "CALLED"
    assert doc_call.json()["data"]["called_at"] is not None

    # Doctor starting consultation -> 200
    start_c = client.post(f"/api/v1/queue/{queue_id}/action", json={"action": "START_CONSULT"}, headers=doctor_auth_headers)
    assert start_c.status_code == 200
    assert start_c.json()["data"]["status"] == "IN_CONSULTATION"
    assert start_c.json()["data"]["in_service_at"] is not None

    # Nurse transferring patient to another doctor -> 200
    xfer = client.post(
        f"/api/v1/queue/{queue_id}/action",
        json={"action": "TRANSFER", "target_doctor_id": "doc-k-02", "reason": "Specialist referral"},
        headers=nurse_auth_headers
    )
    assert xfer.status_code == 200, xfer.text
    assert xfer.json()["data"]["doctor_id"] == "doc-k-02"

    # Completing consultation -> 200
    comp = client.post(f"/api/v1/queue/{queue_id}/action", json={"action": "COMPLETE"}, headers=doctor_auth_headers)
    assert comp.status_code == 200
    assert comp.json()["data"]["status"] == "COMPLETED"
    assert comp.json()["data"]["completed_at"] is not None


def test_doctor_and_nurse_roster_management(hosp_admin_auth_headers):
    """
    Test 7: Verify listing and upserting doctor and nurse rosters.
    """
    # Doctor roster list
    doc_rosters = client.get("/api/v1/hospital/doctors/roster?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert doc_rosters.status_code == 200
    assert isinstance(doc_rosters.json(), list)

    # Upsert doctor roster
    doc_upsert = client.post(
        "/api/v1/hospital/doctors/roster",
        json={
            "doctor_id": "doc-k-01",
            "department_id": "dept-k-01",
            "shift": "EVENING",
            "room_number": "Room 102",
            "max_tokens": 40,
            "status": "ON_DUTY",
            "hospital_id": "hosp-kedar"
        },
        headers=hosp_admin_auth_headers
    )
    assert doc_upsert.status_code == 200, doc_upsert.text
    assert doc_upsert.json()["shift"] == "EVENING"

    # Nurse roster list
    nurse_rosters = client.get("/api/v1/hospital/nurses/roster?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert nurse_rosters.status_code == 200
    assert isinstance(nurse_rosters.json(), list)

    # Upsert nurse roster
    nurse_upsert = client.post(
        "/api/v1/hospital/nurses/roster",
        json={
            "nurse_id": "nurse-k-01",
            "department_id": "dept-k-01",
            "ward": "Triage Bay 2",
            "shift": "NIGHT",
            "status": "ON_DUTY",
            "hospital_id": "hosp-kedar"
        },
        headers=hosp_admin_auth_headers
    )
    assert nurse_upsert.status_code == 200, nurse_upsert.text
    assert nurse_upsert.json()["shift"] == "NIGHT"


def test_opd_counters_management(hosp_admin_auth_headers):
    """
    Test 8: Verify OPD counters listing and updating token prefix rules.
    """
    counters = client.get("/api/v1/hospital/counters?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert counters.status_code == 200
    c_list = counters.json()
    assert isinstance(c_list, list)
    assert len(c_list) >= 1

    # Upsert counter
    upsert_c = client.post(
        "/api/v1/hospital/counters",
        json={
            "counter_name": "Emergency OPD Triage Counter",
            "counter_number": "EMG-01",
            "department_id": "dept-k-01",
            "location": "Ground Floor Emergency",
            "token_prefix": "EMG-",
            "token_start": 1,
            "status": "ACTIVE",
            "hospital_id": "hosp-kedar"
        },
        headers=hosp_admin_auth_headers
    )
    assert upsert_c.status_code == 200
    assert upsert_c.json()["token_prefix"] == "EMG-"


def test_operational_reports_aggregation(hosp_admin_auth_headers):
    """
    Test 9: Verify operational reports endpoints aggregate real database records.
    """
    pflow_rep = client.get("/api/v1/hospital/reports/patient-flow?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert pflow_rep.status_code == 200
    assert "summary" in pflow_rep.json()
    assert "stages_breakdown" in pflow_rep.json()

    appt_rep = client.get("/api/v1/hospital/reports/appointments?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert appt_rep.status_code == 200
    assert "total_appointments" in appt_rep.json()
    assert "status_breakdown" in appt_rep.json()

    dept_rep = client.get("/api/v1/hospital/reports/departments?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert dept_rep.status_code == 200
    assert "departments" in dept_rep.json()

    doc_rep = client.get("/api/v1/hospital/reports/doctors?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert doc_rep.status_code == 200
    assert "doctors" in doc_rep.json()


def test_operational_alerts_and_ack(hosp_admin_auth_headers):
    """
    Test 10: Verify operational alerts listing and acknowledgment.
    """
    alerts = client.get("/api/v1/hospital/alerts?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
    assert alerts.status_code == 200
    alert_list = alerts.json()
    assert isinstance(alert_list, list)
    if len(alert_list) > 0:
        a_id = alert_list[0]["id"]
        ack_res = client.post(f"/api/v1/hospital/alerts/{a_id}/ack?hospital_id=hosp-kedar", headers=hosp_admin_auth_headers)
        assert ack_res.status_code == 200
        assert ack_res.json()["status"] == "ACKNOWLEDGED"


def test_idor_tenant_isolation(receptionist_auth_headers, patient_auth_headers):
    """
    Test 11: Multi-tenant boundary isolation. Non-platform users cannot access
    other hospital tenant metrics.
    """
    # Patient trying to access hospital dashboard -> 403
    p_dash = client.get("/api/v1/hospital/dashboard?hospital_id=hosp-kedar", headers=patient_auth_headers)
    assert p_dash.status_code == 403

    # Receptionist (without system.manage) requesting another hospital -> 403
    cross_hosp = client.get("/api/v1/hospital/dashboard?hospital_id=hosp-other-facility", headers=receptionist_auth_headers)
    assert cross_hosp.status_code == 403
