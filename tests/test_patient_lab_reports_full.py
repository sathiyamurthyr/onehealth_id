import pytest
import datetime
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def get_auth_headers(username="patient", password="patient123"):
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}

class TestPatientLabReports:
    @classmethod
    def setup_class(cls):
        cls.headers = get_auth_headers("patient", "patient123")

    def test_list_my_lab_reports(self):
        """Test listing patient's own lab reports with default and filtered views."""
        resp = client.get("/api/v1/me/lab-reports", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        reports = data["data"]
        assert len(reports) >= 3
        
        # Verify CBC exists
        cbc = next((r for r in reports if ("CBC" in r["test_name"] or "Complete Blood Count" in r["test_name"]) and r.get("status") in ["FINAL", "COMPLETED", "APPROVED"]), None)
        assert cbc is not None
        assert "ABC Diagnostics" in cbc["laboratory_name"] or "Kedar Hospital" in cbc["laboratory_name"] or "Kedar" in cbc["laboratory_name"]
        assert cbc["results_count"] > 0
        assert cbc["status"] in ["FINAL", "COMPLETED", "APPROVED"]

    def test_filter_lab_reports_by_status(self):
        """Test filtering lab reports by status."""
        resp = client.get("/api/v1/me/lab-reports?status=FINAL", headers=self.headers)
        assert resp.status_code == 200
        reports = resp.json()["data"]
        for r in reports:
            assert r["status"] in ["FINAL", "COMPLETED", "APPROVED"]

    def test_get_lab_report_detail_cbc(self):
        """Test retrieving structured lab report detail for Complete Blood Count."""
        resp = client.get("/api/v1/me/lab-reports", headers=self.headers)
        reports = resp.json()["data"]
        cbc_summary = next(r for r in reports if ("CBC" in r["test_name"] or "Complete Blood Count" in r["test_name"]) and r.get("status") in ["FINAL", "COMPLETED", "APPROVED"])
        
        report_id = cbc_summary["id"]
        detail_resp = client.get(f"/api/v1/me/lab-reports/{report_id}", headers=self.headers)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()["data"]
        
        assert detail["test_name"] == cbc_summary["test_name"]
        assert "laboratory_name" in detail
        assert "sample_type" in detail
        assert "Blood" in detail["sample_type"]
        assert "results_data" in detail
        assert isinstance(detail["results_data"], list)
        assert len(detail["results_data"]) > 0
        
        # Verify parameter structure
        hb = next((p for p in detail["results_data"] if "Hemoglobin" in p["parameter_name"]), None)
        assert hb is not None
        assert "observed_value" in hb
        assert "unit" in hb
        assert "reference_range" in hb
        assert "is_abnormal" in hb

    def test_get_lab_parameter_trends(self):
        """Test multi-visit historical parameter trend tracking."""
        resp = client.get("/api/v1/me/lab-reports/trends?parameter_name=Hemoglobin", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        trends = data["data"]
        assert isinstance(trends, list)
        if len(trends) > 0:
            item = trends[0]
            assert "parameter_name" in item
            assert "observed_value" in item
            assert "reported_at" in item

    def test_corrected_report_version_history(self):
        """Test that corrected/amended reports display proper version banner and history."""
        resp = client.get("/api/v1/me/lab-reports", headers=self.headers)
        reports = resp.json()["data"]
        corrected = next((r for r in reports if r.get("is_corrected") or r.get("version", 1) > 1), None)
        if corrected:
            detail_resp = client.get(f"/api/v1/me/lab-reports/{corrected['id']}", headers=self.headers)
            assert detail_resp.status_code == 200
            detail = detail_resp.json()["data"]
            assert detail.get("is_corrected") is True
            assert detail.get("version", 1) >= 2
            assert "correction_reason" in detail

    def test_create_and_revoke_lab_report_share(self):
        """Test creating a time-limited secure share link and then revoking it."""
        resp = client.get("/api/v1/me/lab-reports", headers=self.headers)
        reports = resp.json()["data"]
        report_id = reports[0]["id"]
        
        # 1. Create Share
        share_payload = {
            "recipient_name": "Dr. Sarah Consulting",
            "recipient_contact": "sarah.consulting@example.com",
            "duration_hours": 24,
            "access_level": "VIEW_ONLY"
        }
        create_resp = client.post(
            f"/api/v1/me/lab-reports/{report_id}/share",
            json=share_payload,
            headers=self.headers
        )
        assert create_resp.status_code == 200
        share_data = create_resp.json()["data"]
        assert "share_token" in share_data
        assert "share_url" in share_data
        share_token = share_data["share_token"]
        share_id = share_data["id"]
        
        # 2. Access via Public Share Endpoint
        pub_resp = client.get(f"/api/v1/public/share/lab-report/{share_token}")
        assert pub_resp.status_code == 200
        pub_data = pub_resp.json()
        assert pub_data.get("success") is True
        assert pub_data["data"]["report"]["id"] == report_id
        
        # 3. List active shares
        list_shares_resp = client.get(f"/api/v1/me/lab-reports/{report_id}/shares", headers=self.headers)
        assert list_shares_resp.status_code == 200
        active_shares = list_shares_resp.json()["data"]
        assert any(s["id"] == share_id for s in active_shares)
        
        # 4. Revoke Share
        revoke_resp = client.post(
            f"/api/v1/me/lab-report-shares/{share_id}/revoke",
            json={"action": "SHARE_REVOKED", "details": {"reason": "Consultation completed"}},
            headers=self.headers
        )
        assert revoke_resp.status_code == 200
        
        # 5. Access revoked share should now return revoked status
        revoked_check = client.get(f"/api/v1/public/share/lab-report/{share_token}")
        assert revoked_check.status_code == 200
        revoked_json = revoked_check.json()
        assert revoked_json.get("success") is False
        assert revoked_json.get("error", {}).get("code") == "SHARE_LINK_EXPIRED_OR_REVOKED"

    def test_public_authenticity_verification(self):
        """Test zero-knowledge public authenticity verification."""
        resp = client.get("/api/v1/me/lab-reports", headers=self.headers)
        reports = resp.json()["data"]
        cbc = next(r for r in reports if ("CBC" in r["test_name"] or "Complete Blood Count" in r["test_name"]) and r.get("status") in ["FINAL", "COMPLETED", "APPROVED"])
        
        token = cbc.get("verification_token") or cbc.get("order_number") or cbc.get("id")
        verify_resp = client.get(f"/api/v1/public/verify/lab-report/{token}")
        assert verify_resp.status_code == 200
        v_data = verify_resp.json()
        assert v_data.get("success") is True
        assert v_data["data"]["is_valid"] is True
        assert "ABC Diagnostics" in v_data["data"]["laboratory_name"] or "Kedar Hospital" in v_data["data"]["laboratory_name"] or "Kedar" in v_data["data"]["laboratory_name"]
        assert v_data["data"]["status"] in ["FINAL", "COMPLETED", "APPROVED"]

    def test_audit_logging_endpoint(self):
        """Test that viewing/downloading/sharing events can be audit-logged."""
        resp = client.get("/api/v1/me/lab-reports", headers=self.headers)
        reports = resp.json()["data"]
        report_id = reports[0]["id"]
        
        audit_payload = {
            "action": "REPORT_VIEWED",
            "metadata": {"channel": "WEB_PATIENT_PORTAL", "device": "Desktop"}
        }
        audit_resp = client.post(
            f"/api/v1/me/lab-reports/{report_id}/audit",
            json=audit_payload,
            headers=self.headers
        )
        assert audit_resp.status_code == 200
        assert audit_resp.json().get("success") is True
