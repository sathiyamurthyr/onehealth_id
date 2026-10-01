import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_enterprise_auth_login(client):
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"].upper() in ["SUPER_ADMIN", "ADMIN"]

def test_enterprise_patients_view_and_sp(client):
    # 1. Fetch patients from view
    res = client.get("/api/v1/patients")
    assert res.status_code == 200
    patients = res.json()
    assert isinstance(patients, list)
    assert len(patients) >= 1

    # 2. Register new patient via Stored Procedure
    payload = {
        "name": "Kavitha Raman",
        "age": 34,
        "gender": "Female",
        "phone": "+91 98409 11223",
        "email": "kavitha.r@example.com",
        "address": "77 Gandhi Road, Velachery, Chennai",
        "emergency_contact": "+91 94444 55667 (Husband)",
        "blood_group": "O+ Positive",
        "diagnosis": "Gestational Diabetes Assessment",
        "hospital_id": "hosp-kedar"
    }
    create_res = client.post("/api/v1/patients", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["name"] == "Kavitha Raman"
    assert "onehealth_id" in created
    assert created["onehealth_id"].startswith("OHID-")
    assert "qr_token" in created
    assert created["qr_token"].startswith("QR-OHID-")

    # 3. Verify Patient QR token
    qr_res = client.get(f"/api/v1/patients/verify-qr/{created['qr_token']}")
    assert qr_res.status_code == 200
    assert qr_res.json()["name"] == "Kavitha Raman"

def test_enterprise_doctors_view(client):
    res = client.get("/api/v1/doctors")
    assert res.status_code == 200
    doctors = res.json()
    assert len(doctors) >= 1
    assert any("House" in d["name"] for d in doctors)

def test_enterprise_appointments_and_queue(client):
    # Fetch patients and doctors
    p_res = client.get("/api/v1/patients")
    d_res = client.get("/api/v1/doctors")
    patient = p_res.json()[0]
    doctor = d_res.json()[0]

    # Book appointment via SP
    appt_payload = {
        "patient_id": patient["id"],
        "doctor_id": doctor["id"],
        "slot": "2026-10-10 10:30",
        "status": "scheduled",
        "notes": "Cardiology screening consultation",
        "priority": "NORMAL"
    }
    create_appt = client.post("/api/v1/appointments", json=appt_payload)
    assert create_appt.status_code == 201
    appt = create_appt.json()
    assert appt["patient_id"] == patient["id"]
    assert appt["doctor_id"] == doctor["id"]

    # Check live queue board
    q_res = client.get("/api/v1/queue")
    assert q_res.status_code == 200
    queue_entries = q_res.json()
    assert isinstance(queue_entries, list)
    if queue_entries:
        # Perform queue action
        first_q = queue_entries[0]
        action_res = client.post(f"/api/v1/queue/{first_q['id']}/action", json={"action": "CALL_NEXT"})
        assert action_res.status_code == 200
        assert action_res.json()["success"] is True

def test_enterprise_clinical_views(client):
    # OPD encounters
    opd = client.get("/api/v1/clinical/opd/encounters")
    assert opd.status_code == 200
    assert isinstance(opd.json(), list)

    # IPD admissions
    ipd = client.get("/api/v1/clinical/ipd/admissions")
    assert ipd.status_code == 200
    assert isinstance(ipd.json(), list)

    # Wards and beds
    beds = client.get("/api/v1/clinical/ipd/wards-beds")
    assert beds.status_code == 200
    assert isinstance(beds.json(), list)

    # Laboratory orders
    labs = client.get("/api/v1/clinical/laboratory/orders")
    assert labs.status_code == 200
    assert isinstance(labs.json(), list)

    # Pharmacy dispensary
    pharma = client.get("/api/v1/clinical/pharmacy/dispensary")
    assert pharma.status_code == 200
    assert isinstance(pharma.json(), list)

def test_enterprise_billing_and_payment(client):
    # Invoices
    inv_res = client.get("/api/v1/billing/invoices")
    assert inv_res.status_code == 200
    invoices = inv_res.json()
    assert isinstance(invoices, list)
    assert len(invoices) >= 1

    # Record Payment on invoice
    target_inv = invoices[0]
    pay_payload = {
        "amount": 100.0,
        "payment_mode": "UPI",
        "transaction_ref": "UPI-E2E-TEST-9988"
    }
    pay_res = client.post(f"/api/v1/billing/invoices/{target_inv['id']}/pay", json=pay_payload)
    assert pay_res.status_code == 200
    assert pay_res.json()["success"] is True

def test_enterprise_dashboard_metrics(client):
    res = client.get("/api/v1/dashboard/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert "total_patients" in metrics
    assert "active_appointments" in metrics
    assert "available_doctors" in metrics
    assert "total_revenue" in metrics
    assert metrics["total_patients"] >= 1

def test_enterprise_admin_views(client):
    dept_res = client.get("/api/v1/admin/departments")
    assert dept_res.status_code == 200
    assert isinstance(dept_res.json(), list)

    audit_res = client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    assert isinstance(audit_res.json(), list)
