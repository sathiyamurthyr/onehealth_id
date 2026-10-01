import importlib.util
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

ROOT_MAIN_PATH = Path(__file__).resolve().parent.parent / "main.py"
spec = importlib.util.spec_from_file_location("root_main", ROOT_MAIN_PATH)
main = importlib.util.module_from_spec(spec)
spec.loader.exec_module(main)


@pytest.fixture(autouse=True)
def clean_state():
    """Reset in-memory storage before each test."""
    main.patients.clear()
    main.doctors.clear()
    main.appointments.clear()
    yield
    main.patients.clear()
    main.doctors.clear()
    main.appointments.clear()


@pytest.fixture
def client():
    return TestClient(main.app)


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hospital Management System API is running"}


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_get_patient(client):
    payload = {
        "name": "Jane Doe",
        "age": 30,
        "diagnosis": "Seasonal Allergies",
    }
    create_res = client.post("/patients", json=payload)
    assert create_res.status_code == 201
    created_patient = create_res.json()
    assert created_patient["id"] is not None
    assert created_patient["name"] == "Jane Doe"
    assert created_patient["age"] == 30
    assert created_patient["diagnosis"] == "Seasonal Allergies"

    # Fetch by ID
    get_res = client.get(f"/patients/{created_patient['id']}")
    assert get_res.status_code == 200
    assert get_res.json() == created_patient

    # List patients
    list_res = client.get("/patients")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


def test_get_patient_not_found(client):
    response = client.get("/patients/nonexistent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


def test_patient_validation_error(client):
    # Invalid: missing name and negative age
    response = client.post("/patients", json={"name": "", "age": -5, "diagnosis": "None"})
    assert response.status_code == 422


def test_create_and_get_doctor(client):
    payload = {
        "name": "Dr. Gregory House",
        "specialty": "Diagnostic Medicine",
    }
    create_res = client.post("/doctors", json=payload)
    assert create_res.status_code == 201
    doctor = create_res.json()
    assert doctor["id"] is not None
    assert doctor["name"] == "Dr. Gregory House"
    assert doctor["specialty"] == "Diagnostic Medicine"

    # Fetch by ID
    get_res = client.get(f"/doctors/{doctor['id']}")
    assert get_res.status_code == 200
    assert get_res.json() == doctor

    # List doctors
    list_res = client.get("/doctors")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


def test_get_doctor_not_found(client):
    response = client.get("/doctors/nonexistent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Doctor not found"


def test_appointment_lifecycle(client):
    # Setup patient & doctor
    patient_res = client.post("/patients", json={"name": "Alice Smith", "age": 28, "diagnosis": "Flu"})
    doctor_res = client.post("/doctors", json={"name": "Dr. John Watson", "specialty": "General Practice"})
    patient_id = patient_res.json()["id"]
    doctor_id = doctor_res.json()["id"]

    # Create appointment
    appt_payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "slot": "2026-10-01 10:00",
        "status": "scheduled",
    }
    create_res = client.post("/appointments", json=appt_payload)
    assert create_res.status_code == 201
    appt = create_res.json()
    assert appt["id"] is not None
    assert appt["patient_id"] == patient_id
    assert appt["doctor_id"] == doctor_id
    assert appt["status"] == "scheduled"

    # List appointments
    list_res = client.get("/appointments")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


def test_appointment_patient_not_found(client):
    doctor_res = client.post("/doctors", json={"name": "Dr. Watson", "specialty": "General"})
    doctor_id = doctor_res.json()["id"]

    res = client.post(
        "/appointments",
        json={
            "patient_id": "nonexistent-patient",
            "doctor_id": doctor_id,
            "slot": "2026-10-01 10:00",
        },
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Patient not found"


def test_appointment_doctor_not_found(client):
    patient_res = client.post("/patients", json={"name": "Alice", "age": 25, "diagnosis": "Flu"})
    patient_id = patient_res.json()["id"]

    res = client.post(
        "/appointments",
        json={
            "patient_id": patient_id,
            "doctor_id": "nonexistent-doctor",
            "slot": "2026-10-01 10:00",
        },
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Doctor not found"


def test_auth_login_success(client):
    res = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "Admin"
    assert data["user"]["name"] == "Dr. Administrator"


def test_auth_login_invalid_password(client):
    res = client.post("/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid username or password"


def test_auth_login_unknown_user(client):
    res = client.post("/auth/login", json={"username": "unknown", "password": "nopassword"})
    assert res.status_code == 401


def test_update_appointment_status(client):
    p_res = client.post("/patients", json={"name": "Alice", "age": 30, "diagnosis": "Checkup"})
    d_res = client.post("/doctors", json={"name": "Dr. House", "specialty": "Diagnostics"})
    appt_res = client.post(
        "/appointments",
        json={
            "patient_id": p_res.json()["id"],
            "doctor_id": d_res.json()["id"],
            "slot": "2026-10-05 15:00",
            "status": "scheduled",
        },
    )
    appt_id = appt_res.json()["id"]

    patch_res = client.patch(f"/appointments/{appt_id}/status", json={"status": "completed"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "completed"


def test_update_appointment_status_not_found(client):
    patch_res = client.patch("/appointments/nonexistent-id/status", json={"status": "cancelled"})
    assert patch_res.status_code == 404

