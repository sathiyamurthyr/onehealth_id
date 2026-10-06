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

class TestPatientMedicalDocuments:
    @classmethod
    def setup_class(cls):
        cls.headers = get_auth_headers("patient", "patient123")

    def test_list_all_medical_documents_default(self):
        """Test listing patient's central documents across all hospitals by default."""
        resp = client.get("/api/v1/me/documents", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        documents = data["data"]
        assert len(documents) >= 8, f"Expected at least 8 seeded benchmark documents, got {len(documents)}"
        
        # Verify hospitals represented
        hospital_names = {d.get("hospital_name") for d in documents if d.get("hospital_name")}
        assert any("Kedar" in h for h in hospital_names)
        assert any("Apollo" in h or "ABC" in h for h in hospital_names)

        # Verify default order is newest first
        dates = [str(d.get("document_date")) for d in documents if d.get("document_date")]
        assert dates == sorted(dates, reverse=True)

    def test_get_document_counts_and_categories(self):
        """Test retrieving category counters and active provider list."""
        resp = client.get("/api/v1/me/documents/counts", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        counts = data["data"]
        
        assert "total_documents" in counts
        assert counts["total_documents"] >= 8
        assert "connected_hospitals_count" in counts
        assert counts["connected_hospitals_count"] >= 1
        assert "categories" in counts
        assert "DISCHARGE_SUMMARY" in counts["categories"]
        assert "LAB_REPORT" in counts["categories"]
        assert "PRESCRIPTION" in counts["categories"]
        assert "IMAGING_REPORT" in counts["categories"]
        assert "hospitals" in counts
        assert len(counts["hospitals"]) >= 1

    def test_filter_documents_by_category(self):
        """Test filtering documents by category tab/chip."""
        # Discharge summary
        resp = client.get("/api/v1/me/documents?category=DISCHARGE_SUMMARY", headers=self.headers)
        assert resp.status_code == 200
        docs = resp.json()["data"]
        assert len(docs) >= 1
        for d in docs:
            assert d["category"] == "DISCHARGE_SUMMARY"

        # Imaging report
        resp_img = client.get("/api/v1/me/documents?category=IMAGING_REPORT", headers=self.headers)
        assert resp_img.status_code == 200
        docs_img = resp_img.json()["data"]
        assert len(docs_img) >= 1
        for d in docs_img:
            assert d["category"] == "IMAGING_REPORT"

    def test_filter_documents_by_hospital(self):
        """Test filtering documents by specific hospital provider."""
        resp_counts = client.get("/api/v1/me/documents/counts", headers=self.headers)
        hospitals = resp_counts.json()["data"]["hospitals"]
        assert len(hospitals) > 0
        target_hosp = hospitals[0]["hospital_id"]

        resp = client.get(f"/api/v1/me/documents?hospital_id={target_hosp}", headers=self.headers)
        assert resp.status_code == 200
        docs = resp.json()["data"]
        for d in docs:
            assert d["hospital_id"] == target_hosp

    def test_search_medical_documents(self):
        """Test searching documents by title, doctor, document_code, or department."""
        resp = client.get("/api/v1/me/documents?search=Lumbar", headers=self.headers)
        assert resp.status_code == 200
        docs = resp.json()["data"]
        assert len(docs) >= 1
        assert any("Lumbar" in (d.get("title") or "") for d in docs)

    def test_get_document_detail_and_imaging_series(self):
        """Test retrieving rich document detail including DICOM/imaging series slices."""
        resp = client.get("/api/v1/me/documents?category=IMAGING_REPORT", headers=self.headers)
        docs = resp.json()["data"]
        assert len(docs) >= 1
        img_doc_id = docs[0]["id"]

        detail_resp = client.get(f"/api/v1/me/documents/{img_doc_id}", headers=self.headers)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()["data"]
        assert detail["id"] == img_doc_id
        assert detail["category"] == "IMAGING_REPORT"
        assert "images" in detail
        assert isinstance(detail["images"], list)
        assert len(detail["images"]) >= 2
        assert "image_url" in detail["images"][0]
        assert "image_url" in detail["images"][0]

    def test_add_personal_document_upload(self):
        """Test patient uploading personal health document explicitly tagged as PATIENT_UPLOADED."""
        upload_payload = {
            "title": "Historical Vaccination Certificate 2025",
            "category": "MEDICAL_CERTIFICATE",
            "document_date": "2025-06-15",
            "file_url": "https://storage.googleapis.com/onehealth-records/patient-docs/p-101/vaccination_2025.pdf",
            "file_name": "vaccination_2025.pdf",
            "file_size": 245000,
            "notes": "Uploaded from previous travel records."
        }
        resp = client.post("/api/v1/me/documents/upload", json=upload_payload, headers=self.headers)
        assert resp.status_code == 200
        result = resp.json()["data"]
        assert result.get("source_type") == "PATIENT_UPLOADED"
        assert result.get("source_label") == "Uploaded by You"
        assert result.get("title") == upload_payload["title"]
        uploaded_id = result.get("id")

        # Verify it appears in documents list
        list_resp = client.get("/api/v1/me/documents", headers=self.headers)
        uploaded_doc = next((d for d in list_resp.json()["data"] if d["id"] == uploaded_id), None)
        assert uploaded_doc is not None
        assert uploaded_doc["source_label"] == "Uploaded by You"

    def test_share_document_and_public_retrieval_and_revocation(self):
        """Test creating secure time-limited share link, public retrieval, and revoking it."""
        list_resp = client.get("/api/v1/me/documents?category=DISCHARGE_SUMMARY", headers=self.headers)
        doc = list_resp.json()["data"][0]
        doc_id = doc["id"]

        # Create share
        share_payload = {
            "recipient_name": "Dr. Senthil Consulting Specialist",
            "access_level": "VIEW_ONLY",
            "duration_hours": 24
        }
        share_resp = client.post(f"/api/v1/me/documents/{doc_id}/share", json=share_payload, headers=self.headers)
        assert share_resp.status_code == 200
        share_data = share_resp.json()["data"]
        share_token = share_data["share_token"]
        share_id = share_data["id"]

        # Public retrieval
        pub_resp = client.get(f"/public/share/document/{share_token}")
        assert pub_resp.status_code == 200
        pub_data = pub_resp.json()["data"]
        assert pub_data["is_active"] is True
        assert pub_data["title"] == doc["title"]
        assert pub_data["recipient_name"] == share_payload["recipient_name"]

        # Revoke share
        revoke_resp = client.delete(f"/api/v1/me/document-shares/{share_id}/revoke", headers=self.headers)
        assert revoke_resp.status_code == 200
        assert revoke_resp.json()["data"]["revoked"] is True

        # Verify public retrieval returns revoked
        pub_revoked_resp = client.get(f"/public/share/document/{share_token}")
        assert pub_revoked_resp.status_code == 200
        assert pub_revoked_resp.json().get("success") is False
        assert pub_revoked_resp.json()["error"]["code"] == "SHARE_LINK_EXPIRED_OR_REVOKED"

    def test_public_digital_verification(self):
        """Test zero-knowledge public digital verification of document authenticity."""
        list_resp = client.get("/api/v1/me/documents?category=LAB_REPORT", headers=self.headers)
        doc = list_resp.json()["data"][0]
        doc_code = doc.get("document_code")
        verif_token = doc.get("verification_token") or doc_code

        verif_resp = client.get(f"/public/verify/document/{verif_token}")
        assert verif_resp.status_code == 200
        v_data = verif_resp.json()["data"]
        assert v_data["verified"] is True
        assert v_data["document_code"] == doc_code
        assert "hospital_name" in v_data
        assert "privacy_notice" in v_data
        assert "digital_signature" in v_data
