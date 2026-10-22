import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.database.session import get_db_cursor

client = TestClient(app)

@pytest.fixture(autouse=True)
def cleanup_test_appointments():
    # Clean up test dates before and after
    with get_db_cursor() as cur:
        cur.execute("""
            DELETE FROM oh_id.queue_entries 
            WHERE appointment_id IN (
                SELECT id FROM oh_id.appointments 
                WHERE appointment_date IN ('2026-10-20', '2026-10-22', '2026-11-05', '2026-11-10', '2026-11-12')
            );
            DELETE FROM oh_id.appointments 
            WHERE appointment_date IN ('2026-10-20', '2026-10-22', '2026-11-05', '2026-11-10', '2026-11-12');
        """)
    yield
    with get_db_cursor() as cur:
        cur.execute("""
            DELETE FROM oh_id.queue_entries 
            WHERE appointment_id IN (
                SELECT id FROM oh_id.appointments 
                WHERE appointment_date IN ('2026-10-20', '2026-10-22', '2026-11-05', '2026-11-10', '2026-11-12')
            );
            DELETE FROM oh_id.appointments 
            WHERE appointment_date IN ('2026-10-20', '2026-10-22', '2026-11-05', '2026-11-10', '2026-11-12');
        """)

# Helper to create patient auth token for primary patient Alice / Sathiya (p-101 / user-patient-01)
def get_patient_token():
    return create_access_token({
        "sub": "patient",
        "uid": "usr-patient",
        "user_ref_id": "usr-patient",
        "email": "alice.smith@example.com",
        "role": "PATIENT",
        "usertype_ref_id": "role-patient",
        "hospital_id": "hosp-kedar",
        "permissions": ["dashboard.view", "patient.self.read", "appointment.create", "appointment.read", "view_appointments", "book_appointments"]
    })

def get_headers():
    token = get_patient_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

# 1. Discovery Specialties & Symptoms Tests
def test_discovery_specialties():
    response = client.get("/api/v1/discovery/specialties")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    specialties = data["data"]
    assert len(specialties) >= 10
    
    # Verify categories exist
    categories = {s["category"] for s in specialties}
    assert "General" in categories
    assert "Heart" in categories
    assert "Bone, Joint & Trauma" in categories
    assert "Children" in categories

    # Test category filter
    cardio_res = client.get("/api/v1/discovery/specialties?category=Heart")
    assert cardio_res.status_code == 200
    assert any("Cardiology" in s["name"] for s in cardio_res.json()["data"])

def test_discovery_symptoms():
    response = client.get("/api/v1/discovery/symptoms")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    problems = data["data"]
    assert len(problems) >= 5
    titles = [p["problem_title"] for p in problems]
    assert any("Bone or Joint Pain" in t for t in titles)
    assert any("Heart-related" in t for t in titles)

# 2. Registered Provider Location Search Tests
def test_discovery_providers_search_by_location():
    # Search by Mugalivakkam
    res = client.get("/api/v1/discovery/providers?location=Mugalivakkam")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) >= 1
    assert any("Kedar Hospital" in h["name"] for h in data)

    # Search by Porur
    res_porur = client.get("/api/v1/discovery/providers?location=Porur")
    assert res_porur.status_code == 200
    assert len(res_porur.json()["data"]) >= 1

    # Search by Specialty
    res_ortho = client.get("/api/v1/discovery/providers?specialty=Orthopedics")
    assert res_ortho.status_code == 200
    ortho_hosps = res_ortho.json()["data"]
    assert len(ortho_hosps) >= 1

def test_discovery_provider_detail():
    res = client.get("/api/v1/discovery/providers/hosp-kedar")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["id"] == "hosp-kedar"
    assert len(data["departments"]) >= 3
    assert len(data["doctors"]) >= 2
    assert len(data["appointment_types"]) >= 5

def test_discovery_slots_calculation():
    res = client.get("/api/v1/discovery/slots?doctor_id=doc-arun-kumar&date=2026-10-15")
    assert res.status_code == 200
    slots = res.json()["data"]
    assert len(slots) >= 10
    assert any(s["time"] == "10:30 AM" for s in slots)

# 3. Appointment Booking for Self
def test_appointment_booking_for_self():
    headers = get_headers()
    payload = {
        "hospital_id": "hosp-kedar",
        "doctor_id": "doc-arun-kumar",
        "department_id": "dept-k-cardio",
        "appointment_date": "2026-10-20",
        "appointment_time": "10:30 AM",
        "appointment_type": "New Consultation",
        "reason": "Chest heaviness checkup",
        "priority": "NORMAL"
    }
    res = client.post("/api/v1/me/appointments/book", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["patient_id"] == "p-101"
    assert data["relationship_context"] == "SELF"
    assert data["doctor_id"] == "doc-arun-kumar"
    assert data["checkin_token"] is not None

    appt_id = data["id"]

    # Test QR pass retrieval
    qr_res = client.get(f"/api/v1/me/appointments/{appt_id}/qr", headers=headers)
    assert qr_res.status_code == 200
    assert qr_res.json()["data"]["checkin_token"] == data["checkin_token"]

# 4. Appointment Booking for Authorized Family Member (Son - p-103)
def test_appointment_booking_for_family_member():
    headers = get_headers()
    payload = {
        "patient_id": "p-103", # Child / Son Charlie
        "hospital_id": "hosp-child-01",
        "doctor_id": "doc-ped-01",
        "department_id": "dept-c-pedia",
        "appointment_date": "2026-10-22",
        "appointment_time": "09:30 AM",
        "appointment_type": "Vaccination",
        "reason": "Annual pediatric checkup & MMR booster"
    }
    res = client.post("/api/v1/me/appointments/book", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["patient_id"] == "p-103"
    assert data["relationship_context"] == "FAMILY"
    assert data["booked_by_relationship"] in ("SON", "Parent", "Legal Guardian", "Family Guardian")

# 5. IDOR & Unauthorized Family Booking Prevention
def test_unauthorized_appointment_booking_forbidden():
    headers = get_headers()
    payload = {
        "patient_id": "p-999-unrelated-citizen",
        "hospital_id": "hosp-kedar",
        "doctor_id": "doc-arun-kumar",
        "appointment_date": "2026-10-25",
        "appointment_time": "11:00 AM"
    }
    res = client.post("/api/v1/me/appointments/book", json=payload, headers=headers)
    assert res.status_code == 403

# 6. Concurrency Double Booking Prevention
def test_double_booking_conflict_rejection():
    headers = get_headers()
    # First booking
    payload1 = {
        "hospital_id": "hosp-kedar",
        "doctor_id": "doc-k-kumar",
        "department_id": "dept-k-ortho",
        "appointment_date": "2026-11-05",
        "appointment_time": "04:30 PM",
        "reason": "Knee sprain examination"
    }
    res1 = client.post("/api/v1/me/appointments/book", json=payload1, headers=headers)
    assert res1.status_code == 201

    # Attempt to book EXACT same doctor and slot
    payload2 = {
        "hospital_id": "hosp-kedar",
        "doctor_id": "doc-k-kumar",
        "department_id": "dept-k-ortho",
        "appointment_date": "2026-11-05",
        "appointment_time": "04:30 PM",
        "reason": "Second patient trying to take same slot"
    }
    res2 = client.post("/api/v1/me/appointments/book", json=payload2, headers=headers)
    assert res2.status_code == 409 # Conflict

# 7. Reschedule and Cancellation with Audit Trail
def test_reschedule_and_cancel_lifecycle():
    headers = get_headers()
    # Create initial appointment
    payload = {
        "hospital_id": "hosp-kedar",
        "doctor_id": "doc-k-01",
        "department_id": "dept-k-gen",
        "appointment_date": "2026-11-10",
        "appointment_time": "10:00 AM",
        "reason": "General Health Checkup"
    }
    res = client.post("/api/v1/me/appointments/book", json=payload, headers=headers)
    assert res.status_code == 201
    appt_id = res.json()["data"]["id"]

    # Reschedule
    resched_payload = {
        "new_date": "2026-11-12",
        "new_time": "11:30 AM"
    }
    res_resched = client.post(f"/api/v1/me/appointments/{appt_id}/reschedule", json=resched_payload, headers=headers)
    assert res_resched.status_code == 200
    resched_data = res_resched.json()["data"]
    assert resched_data["status"] == "rescheduled"
    assert resched_data["appointment_time"] == "11:30 AM"
    assert len(resched_data["reschedule_history"]) >= 1

    # Cancel
    cancel_payload = {
        "reason": "Patient conflict with work schedule"
    }
    res_cancel = client.post(f"/api/v1/me/appointments/{appt_id}/cancel", json=cancel_payload, headers=headers)
    assert res_cancel.status_code == 200
    cancel_data = res_cancel.json()["data"]
    assert cancel_data["status"] == "cancelled"
    assert cancel_data["cancellation_reason"] == "Patient conflict with work schedule"
