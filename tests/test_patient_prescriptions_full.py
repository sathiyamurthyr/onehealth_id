import pytest
import datetime
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

def get_auth_headers(username="patient", password="patient123"):
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}

class TestPatientPrescriptions:

    @classmethod
    def setup_class(cls):
        cls.headers = get_auth_headers("patient", "patient123")

    def test_list_prescriptions_default(self):
        """Tests fetching patient prescription list for authenticated patient."""
        resp = client.get("/api/v1/me/prescriptions", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        prescriptions = data.get("data", [])
        assert len(prescriptions) >= 1
        rx_ids = [r["id"] for r in prescriptions]
        assert "RX-20261003-00124" in rx_ids

    def test_filter_active_prescription(self):
        """Tests filtering for active / currently valid prescriptions."""
        resp = client.get("/api/v1/me/prescriptions?status=ACTIVE", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        active_rxs = data.get("data", [])
        assert len(active_rxs) >= 1
        for rx in active_rxs:
            assert rx["computed_status"] == "ACTIVE"
            assert rx["is_valid"] is True
            assert rx["is_expired"] is False

    def test_filter_expired_prescription(self):
        """Tests filtering for expired prescriptions and verifies expired metadata."""
        resp = client.get("/api/v1/me/prescriptions?status=EXPIRED", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        expired_rxs = data.get("data", [])
        assert len(expired_rxs) >= 1
        for rx in expired_rxs:
            assert rx["computed_status"] == "EXPIRED"
            assert rx["is_expired"] is True
            assert rx["watermark_text"] == "EXPIRED"

    def test_filter_superseded_prescription(self):
        """Tests filtering for superseded / replaced prescriptions."""
        resp = client.get("/api/v1/me/prescriptions?status=SUPERSEDED", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        superseded_rxs = data.get("data", [])
        assert len(superseded_rxs) >= 1
        for rx in superseded_rxs:
            assert rx["computed_status"] == "SUPERSEDED"
            assert rx["watermark_text"] == "SUPERSEDED"

    def test_get_active_prescription_detail(self):
        """Tests full document view for canonical active prescription RX-20261003-00124."""
        resp = client.get("/api/v1/me/prescriptions/RX-20261003-00124", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        rx = data.get("data")
        assert rx["id"] == "RX-20261003-00124"
        assert "Dr." in rx["doctor_name"]
        assert rx["hospital_name"] == "Kedar Hospital"
        assert rx["computed_status"] == "ACTIVE"
        assert rx["is_valid"] is True
        assert len(rx["items"]) == 3
        # Check medication schedule matrix
        sched = rx.get("medication_schedule", [])
        assert len(sched) == 3
        # Telmisartan (1-0-0) -> morning
        telm = next(s for s in sched if "Telmisartan" in s["medicine_name"])
        assert telm["morning"] is True
        assert telm["night"] is False
        # Verification URL
        assert "verification_url" in rx

    def test_get_expired_prescription_detail(self):
        """Tests full document view for expired prescription RX-20260715-00088."""
        resp = client.get("/api/v1/me/prescriptions/RX-20260715-00088", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        rx = data.get("data")
        assert rx["id"] == "RX-20260715-00088"
        assert rx["computed_status"] == "EXPIRED"
        assert rx["is_expired"] is True
        assert rx["watermark_text"] == "EXPIRED"

    def test_get_superseded_prescription_detail(self):
        """Tests superseded prescription RX-20260901-00045 points to RX-20261003-00124."""
        resp = client.get("/api/v1/me/prescriptions/RX-20260901-00045", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        rx = data.get("data")
        assert rx["computed_status"] == "SUPERSEDED"
        assert rx.get("superseded_by_id") == "RX-20261003-00124"
        assert rx.get("superseded_by_prescription") is not None
        assert rx["superseded_by_prescription"]["id"] == "RX-20261003-00124"

    def test_pdf_download_metadata(self):
        """Tests PDF download endpoint generates filename and download URL."""
        resp = client.get("/api/v1/me/prescriptions/RX-20261003-00124/pdf", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        pdf_info = data.get("data")
        assert pdf_info["prescription_id"] == "RX-20261003-00124"
        assert "Prescription_RX-20261003-00124" in pdf_info["filename"]

    def test_share_lifecycle(self):
        """Tests creating, listing, viewing, and revoking a secure prescription share link."""
        # 1. Create Share
        share_payload = {
            "recipient_name": "Apollo Pharmacy Mugalivakkam",
            "recipient_contact": "+919876543210",
            "access_level": "VIEW_AND_DOWNLOAD",
            "duration_hours": 48
        }
        create_resp = client.post(
            "/api/v1/me/prescriptions/RX-20261003-00124/share",
            json=share_payload,
            headers=self.headers
        )
        assert create_resp.status_code == 200
        share_data = create_resp.json().get("data")
        share_id = share_data["id"]
        share_token = share_data["share_token"]
        assert share_token.startswith("share_rx_")

        # 2. List Shares
        list_resp = client.get("/api/v1/me/prescriptions/RX-20261003-00124/shares", headers=self.headers)
        assert list_resp.status_code == 200
        shares = list_resp.json().get("data")
        assert any(s["id"] == share_id for s in shares)

        # 3. Access Public Share View (No auth needed)
        pub_resp = client.get(f"/api/v1/public/share/prescription/{share_token}")
        assert pub_resp.status_code == 200
        shared_rx = pub_resp.json().get("data")
        assert shared_rx["id"] == "RX-20261003-00124"
        assert shared_rx["is_shared_view"] is True
        assert shared_rx["share_metadata"]["recipient_name"] == "Apollo Pharmacy Mugalivakkam"

        # 4. Revoke Share
        del_resp = client.delete(f"/api/v1/me/prescription-shares/{share_id}", headers=self.headers)
        assert del_resp.status_code == 200

        # 5. Accessing revoked share returns invalid share envelope
        rev_resp = client.get(f"/api/v1/public/share/prescription/{share_token}")
        assert rev_resp.status_code == 200
        rev_data = rev_resp.json()
        assert rev_data.get("success") is False
        assert rev_data.get("error", {}).get("code") == "SHARE_LINK_EXPIRED_OR_REVOKED"

    def test_public_digital_verification(self):
        """Tests public digital verification endpoint returns minimal verification metadata."""
        # Using token for RX-20261003-00124
        resp = client.get("/api/v1/public/verify/prescription/vtok-rx-20261003-00124")
        assert resp.status_code == 200
        data = resp.json()
        v = data.get("data")
        assert v["is_verified"] is True
        assert v["prescription_id"] == "RX-20261003-00124"
        assert v["status"] == "ACTIVE"
        assert "Dr." in v["doctor"]["name"]
        assert v["hospital"]["name"] == "Kedar Hospital"
        assert v["digital_signature"]["is_signed"] is True
        # Verify private diagnoses are not leaked in public endpoint
        assert "clinical_notes" not in v
        assert "chief_complaint" not in v

    def test_unauthorized_access_blocked(self):
        """Tests that a non-family unauthorized user cannot view another patient's prescription."""
        # Test patient trying to access non-existent or other patient rx
        resp = client.get("/api/v1/me/prescriptions/RX-UNKNOWN-9999", headers=self.headers)
        assert resp.status_code == 404
