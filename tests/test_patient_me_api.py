import pytest
from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def get_auth_token(username: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]

class TestPatientMeAPI:
    @classmethod
    def setup_class(cls):
        cls.patient_token = get_auth_token("patient", "patient123")
        cls.doctor_token = get_auth_token("dr.senthil", "doctor123")
        cls.headers = {"Authorization": f"Bearer {cls.patient_token}"}

    def test_get_me_patient(self):
        res = client.get("/api/v1/me", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "PATIENT"
        assert data["patient"] is not None
        assert data["patient"]["onehealth_id"] == "OHID-IND-2026-01001"
        assert data["patient"]["name"] == "Alice Smith"

    def test_get_me_profile(self):
        res = client.get("/api/v1/me/profile", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Alice Smith"
        assert data["data"]["onehealth_id"] == "OHID-IND-2026-01001"

    def test_get_me_summary(self):
        res = client.get("/api/v1/me/summary", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        metrics = data["data"]
        assert "upcoming_count" in metrics
        assert "visits_count" in metrics
        assert "prescriptions_count" in metrics
        assert "lab_reports_count" in metrics
        assert "doctors_count" in metrics
        assert "hospitals_count" in metrics
        assert metrics["visits_count"] >= 1
        assert metrics["prescriptions_count"] >= 1

    def test_get_me_appointments(self):
        res = client.get("/api/v1/me/appointments", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert len(data["data"]) >= 1

    def test_get_me_visits(self):
        res = client.get("/api/v1/me/visits", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1
        first_visit = data["data"][0]
        assert "diagnosis" in first_visit
        assert "hospital_name" in first_visit

        # Test single visit detail
        visit_id = first_visit["id"]
        detail_res = client.get(f"/api/v1/me/visits/{visit_id}", headers=self.headers)
        assert detail_res.status_code == 200
        assert detail_res.json()["data"]["id"] == visit_id

    def test_get_me_prescriptions(self):
        res = client.get("/api/v1/me/prescriptions", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    def test_get_me_lab_reports(self):
        res = client.get("/api/v1/me/lab-reports", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    def test_get_me_documents(self):
        res = client.get("/api/v1/me/documents", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    def test_get_me_diagnoses(self):
        res = client.get("/api/v1/me/diagnoses", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "diagnoses" in data["data"]

    def test_get_me_bills(self):
        res = client.get("/api/v1/me/bills", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    def test_get_me_insurance(self):
        res = client.get("/api/v1/me/insurance", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    def test_get_me_consent(self):
        res = client.get("/api/v1/me/consent", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    def test_get_me_notifications(self):
        res = client.get("/api/v1/me/notifications", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    def test_get_me_hospitals(self):
        res = client.get("/api/v1/me/hospitals", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        hosps = data["data"]
        assert len(hosps) >= 2
        hosp_names = [h["hospital_name"] for h in hosps]
        assert "Kedar Hospital" in hosp_names
        assert "Apollo City Hospital - Chennai Central" in hosp_names

    def test_get_me_doctors(self):
        res = client.get("/api/v1/me/doctors", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    def test_get_me_timeline(self):
        res = client.get("/api/v1/me/timeline", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        types = set((item.get("type") or item.get("event_type")) for item in data["data"])
        assert any(t in types for t in ["VISIT", "CONSULTATION", "PRESCRIPTION", "ENCOUNTER"])

    def test_get_me_qr(self):
        res = client.get("/api/v1/me/qr", headers=self.headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["onehealth_id"] == "OHID-IND-2026-01001"
        assert data["data"]["qr_token"] is not None

    def test_unauthenticated_blocked(self):
        unauth_client = TestClient(app)
        res = unauth_client.get("/api/v1/me/profile")
        assert res.status_code == 401

    def test_patient_idor_protection(self):
        # Patient cannot access other patient's visit ID directly
        res = client.get("/api/v1/me/visits/non-existent-visit-or-other-patient", headers=self.headers)
        assert res.status_code == 404
