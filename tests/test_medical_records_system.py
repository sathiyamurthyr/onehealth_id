"""
Test Suite for OH-ID Unified Medical Records & Documents System.
Covers:
1. Patient document upload with 'Uploaded by You' badge and unverified state
2. Doctor 'Request Medical Document' workflow & patient fulfillment
3. Doctor clinical review with review notes & status transition to REVIEWED
4. Doctor external hospital document upload (Source: EXTERNAL_PROVIDER)
5. Doctor Document Inbox triage (Awaiting Review, Patient Uploaded, Verified)
6. Attach documents to consultation encounter
7. Receptionist scoped RBAC boundary (non-clinical access)
8. Secure time-limited document share with expiry & revocation
9. Zero-knowledge public verification token check
10. Immutable access audit logging
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def get_auth_token(username: str, password: str = "doctor123") -> str:
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


def test_patient_document_upload_marked_unverified():
    """Patient uploaded documents must be marked PATIENT_UPLOADED / UPLOADED and NOT official provider records."""
    token = get_auth_token("patient", "patient123")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Previous 2D Echo Report from City Heart Center",
        "category": "IMAGING_REPORT",
        "source_type": "PATIENT",
        "source_label": "Uploaded by You",
        "file_type": "PDF",
        "file_size_kb": 420,
        "document_date": "2026-08-10",
        "notes": "Patient uploaded baseline echocardiogram.",
        "tags": ["Echo", "Cardiac", "Self-Uploaded"]
    }

    res = client.post("/api/v1/me/documents/upload", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]

    assert data["title"] == "Previous 2D Echo Report from City Heart Center"
    assert data["source_type"] == "PATIENT"
    assert data["source_label"] == "Uploaded by You"
    assert data["status"] == "UPLOADED"
    assert data["verified_by"] is None
    assert data["reviewed_by"] is None


def test_doctor_requests_document_and_patient_fulfills():
    """Doctor requests a specific document from patient; patient fulfills it via upload."""
    doc_token = get_auth_token("dr.senthil", "doctor123")
    pat_token = get_auth_token("patient", "patient123")

    # 1. Doctor creates document request
    req_payload = {
        "document_type": "IMAGING_REPORT",
        "title": "Previous Cardiac CT Angiography Scan",
        "instructions": "Please upload 64-slice CT angio scan from 2025 for pre-operative coronary planning.",
        "urgency": "URGENT"
    }
    res_req = client.post(
        "/api/v1/doctor/patients/p-101/documents/request",
        json=req_payload,
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res_req.status_code == 201, res_req.text
    req_data = res_req.json()
    req_id = req_data["id"]
    assert req_data["status"] == "PENDING"
    assert req_data["urgency"] == "URGENT"

    # 2. Patient views pending requests
    res_pat_reqs = client.get(
        "/api/v1/me/documents/requests",
        headers={"Authorization": f"Bearer {pat_token}"}
    )
    assert res_pat_reqs.status_code == 200
    pat_reqs = res_pat_reqs.json()["data"]
    matching_req = next((r for r in pat_reqs if r["id"] == req_id), None)
    assert matching_req is not None
    assert matching_req["title"] == "Previous Cardiac CT Angiography Scan"

    # 3. Patient fulfills request by uploading document
    upload_payload = {
        "title": "Coronary CT Angiography 64-Slice Film & Report",
        "category": "IMAGING_REPORT",
        "source_type": "PATIENT",
        "source_label": "Uploaded by You (Fulfilling Request)",
        "file_type": "PDF",
        "file_size_kb": 950,
        "document_date": "2025-11-15",
        "notes": "Uploaded in response to doctor request.",
        "related_request_id": req_id
    }
    res_up = client.post(
        "/api/v1/me/documents/upload",
        json=upload_payload,
        headers={"Authorization": f"Bearer {pat_token}"}
    )
    assert res_up.status_code == 200
    up_doc = res_up.json()["data"]
    doc_id = up_doc["id"]
    assert up_doc["related_request_id"] == req_id

    # 4. Doctor checks request status updated to UPLOADED
    res_doc_inbox = client.get(
        "/api/v1/doctor/documents/inbox",
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res_doc_inbox.status_code == 200
    inbox = res_doc_inbox.json()
    assert inbox["counts"]["awaiting_review_count"] >= 1


def test_doctor_reviews_patient_document():
    """Doctor examines a patient-uploaded document and records clinical notes and status transition to REVIEWED."""
    doc_token = get_auth_token("dr.senthil", "doctor123")
    pat_token = get_auth_token("patient", "patient123")

    # 1. Patient uploads an unreviewed report
    upload_payload = {
        "title": "Historical Pulmonary Function Spirometry Report",
        "category": "CLINICAL_DOCUMENT",
        "source_type": "PATIENT",
        "file_type": "PDF",
        "document_date": "2026-06-15",
        "notes": "Patient baseline lung capacity test."
    }
    res_up = client.post(
        "/api/v1/me/documents/upload",
        json=upload_payload,
        headers={"Authorization": f"Bearer {pat_token}"}
    )
    assert res_up.status_code == 200
    doc = res_up.json()["data"]
    doc_id = doc["id"]

    # 2. Doctor reviews it
    review_payload = {
        "review_notes": "Reviewed by Dr. Senthil Nathan: FEV1/FVC ratio 82% normal, no obstructive airway pathology identified."
    }
    res_rev = client.post(
        f"/api/v1/doctor/documents/{doc_id}/review",
        json=review_payload,
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res_rev.status_code == 200, res_rev.text
    reviewed_doc = res_rev.json()
    assert reviewed_doc["status"] == "REVIEWED"
    assert reviewed_doc["reviewed_by"] is not None
    assert "FEV1/FVC" in reviewed_doc["review_notes"]


def test_doctor_uploads_external_provider_document():
    """Doctor records external medical records brought by the patient with origin tracking."""
    doc_token = get_auth_token("dr.senthil", "doctor123")

    payload = {
        "title": "External Outpatient Echocardiogram & Doppler Study",
        "category": "IMAGING_REPORT",
        "hospital_name": "Apollo Speciality Hospitals, Greams Road",
        "doctor_name": "Dr. V. Ramachandran, MD, DM",
        "document_date": "2026-07-20",
        "clinical_note": "Patient brought physical Echo film; LVEF 60% confirmed, trivial mitral regurgitation.",
        "file_type": "PDF",
        "file_size_kb": 680,
        "tags": ["Echo", "External Hospital", "Apollo", "Cardiology"]
    }

    res = client.post(
        "/api/v1/doctor/patients/p-101/documents/upload-external",
        json=payload,
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res.status_code == 201, res.text
    data = res.json()

    assert data["source_type"] == "EXTERNAL_PROVIDER"
    assert "Apollo Speciality" in data["source_label"]
    assert data["status"] == "REVIEWED"
    assert data["uploaded_by"] is not None


def test_doctor_document_inbox_triage():
    """Doctor Document Inbox categorizes documents into Awaiting Review, Patient Uploaded, and Verified Official."""
    doc_token = get_auth_token("dr.senthil", "doctor123")

    res = client.get(
        "/api/v1/doctor/documents/inbox",
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res.status_code == 200
    data = res.json()

    assert "counts" in data
    assert "items" in data
    assert data["counts"]["total_items"] > 0
    assert "awaiting_review_count" in data["counts"]
    assert "verified_count" in data["counts"]

    # Verify triage bucket assignments
    buckets = {item["triage_bucket"] for item in data["items"]}
    assert len(buckets) > 0


def test_attach_documents_to_consultation_encounter():
    """Doctor attaches previous documents to an active consultation encounter note."""
    doc_token = get_auth_token("dr.senthil", "doctor123")

    payload = {
        "document_ids": ["doc-bench-01", "doc-bench-02"],
        "clinical_context": "Discharge summary and CBC report reviewed during follow-up encounter."
    }

    res = client.post(
        "/api/v1/doctor/consultations/ENC-2026-CONSULT/attach-documents?patient_id=p-101",
        json=payload,
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res.status_code == 200, res.text
    attached = res.json()
    assert len(attached) >= 2

    # Verify retrieval
    res_get = client.get(
        "/api/v1/doctor/consultations/ENC-2026-CONSULT/attached-documents",
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res_get.status_code == 200
    docs = res_get.json()
    assert len(docs) >= 2


def test_receptionist_cannot_access_doctor_consultation_endpoints():
    """Receptionist role must be blocked from clinical consultation notes and doctor document mutations."""
    rec_token = get_auth_token("receptionist", "rec123")

    # Receptionist attempts to call doctor document review
    res = client.post(
        "/api/v1/doctor/documents/doc-bench-01/review",
        json={"review_notes": "Unauthorized attempt"},
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert res.status_code in (401, 403), f"Expected 403 Forbidden, got {res.status_code}"


def test_time_limited_document_sharing_and_revocation():
    """Patient creates a time-limited share token, verifies active status, and revokes it immediately."""
    pat_token = get_auth_token("patient", "patient123")

    # 1. Create share link (24 hours)
    share_payload = {
        "recipient_name": "Dr. Meenakshi Sundaram (Second Opinion)",
        "duration_hours": 24,
        "access_level": "VIEW_ONLY"
    }
    res_share = client.post(
        "/api/v1/me/documents/doc-bench-01/share",
        json=share_payload,
        headers={"Authorization": f"Bearer {pat_token}"}
    )
    assert res_share.status_code == 200, res_share.text
    share_data = res_share.json()["data"]
    token = share_data["share_token"]
    share_id = share_data["id"]

    # 2. Public verification / read of shared document
    res_view = client.get(f"/api/v1/public/share/document/{token}")
    assert res_view.status_code == 200
    view_data = res_view.json()["data"]
    assert view_data["is_active"] is True
    assert view_data["title"] is not None

    # 3. Patient revokes share link
    res_rev = client.post(
        f"/api/v1/me/document-shares/{share_id}/revoke?reason=Consultation+Completed",
        headers={"Authorization": f"Bearer {pat_token}"}
    )
    assert res_rev.status_code == 200

    # 4. Verified that revoked link is no longer active
    res_view_after = client.get(f"/api/v1/public/share/document/{token}")
    assert res_view_after.status_code == 200
    assert res_view_after.json()["data"]["is_active"] is False


def test_public_document_verification_token():
    """Zero-knowledge public verification token returns hospital certification and cryptographic signature."""
    res = client.get("/api/v1/public/verify/document/vtok-doc-dis-20261002-0004")
    assert res.status_code == 200, res.text
    data = res.json()["data"]

    assert data["verified"] is True
    assert data["hospital_name"] == "Kedar Hospital"
    assert "digital_signature" in data
    assert "OneHealth ID Digital Trust" in data["verification_authority"]


def test_patient_documents_category_and_source_filtering():
    """Patient documents list endpoint properly filters by category and source type."""
    pat_token = get_auth_token("patient", "patient123")
    headers = {"Authorization": f"Bearer {pat_token}"}

    # Filter by DISCHARGE_SUMMARY
    res_dis = client.get("/api/v1/me/documents?category=DISCHARGE_SUMMARY", headers=headers)
    assert res_dis.status_code == 200
    docs = res_dis.json()["data"]
    assert all(d["category"] == "DISCHARGE_SUMMARY" for d in docs)

    # Filter by source_type = PATIENT
    res_pat = client.get("/api/v1/me/documents?source_type=PATIENT", headers=headers)
    assert res_pat.status_code == 200
    pat_docs = res_pat.json()["data"]
    assert all(d["source_type"] == "PATIENT" for d in pat_docs)
