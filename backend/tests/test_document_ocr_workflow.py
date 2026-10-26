"""
Automated Test Suite: Document Upload & OCR-Based Identity Extraction Workflow
Sathus Technology Pvt Ltd - OneHealth ID
"""

import sys
import io
import uuid
import zipfile
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from jose import jwt
from PIL import Image

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.database.session import get_db_cursor, get_readonly_cursor

client = TestClient(app)

def create_test_token(user_id: str, username: str, hospital_id: str, role: str, permissions: list) -> str:
    payload = {
        "sub": username,
        "uid": user_id,
        "user_ref_id": user_id,
        "id": user_id,
        "hospital_id": hospital_id,
        "hospital_ref_id": hospital_id,
        "role": role,
        "roles": [role],
        "permissions": permissions,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def generate_synthetic_pdf(text: str) -> bytes:
    """Generates a valid, minimal single-page PDF with specified text stream."""
    stream_content = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET"
    stream_bytes = stream_content.encode("latin-1", "replace")
    stream_len = len(stream_bytes)
    pdf = f"""%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length {stream_len}>> stream
{stream_content}
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000295 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
370
%%EOF"""
    return pdf.encode("latin-1")


def generate_synthetic_png() -> bytes:
    img = Image.new("RGB", (300, 150), color=(240, 248, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_synthetic_docx(text: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        zf.writestr("word/document.xml", f'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body></w:document>')
    return buf.getvalue()


@pytest.fixture(scope="module")
def ocr_test_env():
    suffix = uuid.uuid4().hex[:6].upper()
    hosp_id = "hosp-kedar"
    doc_user = f"doc-ocr-{suffix.lower()}"
    other_hosp = f"hosp-apollo-{suffix.lower()}"
    other_doc = f"doc-other-{suffix.lower()}"

    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, is_active)
            VALUES (%s, 'Kedar Hospital', %s, TRUE)
            ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
        """, (hosp_id, f"KEDAR-{suffix}"))
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, is_active)
            VALUES (%s, 'Apollo Hospital', %s, TRUE)
            ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
        """, (other_hosp, f"APOLLO-{suffix}"))

        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES (%s, %s, 'Dr. Senthil Nathan', 'General Medicine', TRUE)
            ON CONFLICT (id) DO UPDATE SET is_available = TRUE;
        """, (doc_user, hosp_id))
        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES (%s, %s, 'Dr. Other Clinician', 'General Medicine', TRUE)
            ON CONFLICT (id) DO UPDATE SET is_available = TRUE;
        """, (other_doc, other_hosp))

    token_doc = create_test_token(
        doc_user, "dr_senthil", hosp_id, "DOCTOR",
        ["patient.create", "patient.read", "consultation.create", "clinical.write", "hospital.manage"]
    )
    token_other = create_test_token(
        other_doc, "dr_other", other_hosp, "DOCTOR",
        ["patient.create", "patient.read", "consultation.create", "clinical.write", "hospital.manage"]
    )

    return {
        "hosp_id": hosp_id,
        "token_doc": token_doc,
        "token_other": token_other,
    }


def test_01_upload_valid_synthetic_pdf_success(ocr_test_env):
    """Test successful document upload, validation, quarantine, and entity extraction."""
    pdf_text = "Kedar Super Specialty Hospital\\nDischarge Summary\\nDate: 12/10/2026\\nPatient Name: Sundar Ramakrishnan\\nAge: 45 Yrs / Gender: Male\\nDoctor: Dr. Senthil Nathan"
    pdf_bytes = generate_synthetic_pdf(pdf_text)

    files = {"file": ("synthetic_discharge_summary.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "DISCHARGE_SUMMARY", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200, res.text
    res_json = res.json()
    assert res_json["success"] is True

    job = res_json["data"]
    assert job["status"] == "REVIEW_REQUIRED"
    assert job["file_type"] == "PDF"
    assert "extracted_fields" in job

    extracted = job["extracted_fields"]
    confidence = job["confidence_scores"]

    # Verify extracted entities
    assert "Kedar" in extracted.get("hospital_name", "")
    assert confidence.get("hospital_name", 0) >= 0.90
    assert "Sundar" in extracted.get("patient_name", "")
    assert extracted.get("patient_age") == 45
    assert extracted.get("patient_gender") == "Male"
    assert extracted.get("document_date") == "12/10/2026"


def test_02_tamil_and_english_field_extraction():
    """Test extraction of Tamil medical document patterns and language detection."""
    from backend.app.services.ocr.extractor import DocumentFieldExtractor
    extractor = DocumentFieldExtractor()

    tamil_text = """
    கேதார் மருத்துவமனை
    மருத்துவமனை பதிவு எண்: TN-MED-884
    சென்னை
    தேதி: 15/10/2026
    நோயாளி பெயர்: மு. முருகேசன்
    வயது: 42
    ஆண்
    மருத்துவர்: Dr. K. Kumar
    """

    res = extractor.extract_fields(tamil_text, "DISCHARGE_SUMMARY", detected_language="tam+eng")
    fields = res["extracted_fields"]
    assert "கேதார் மருத்துவமனை" in fields.get("hospital_name", "")
    assert fields.get("hospital_reg_no") == "TN-MED-884"
    assert fields.get("hospital_city") == "சென்னை"
    assert "முருகேசன்" in fields.get("patient_name", "")
    assert fields.get("patient_age") == 42
    assert fields.get("patient_gender") == "Male"
    assert fields.get("document_date") == "15/10/2026"


def test_03_unsupported_format_rejected(ocr_test_env):
    """Unsupported formats like .exe or .sh must be rejected with 400."""
    files = {"file": ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/x-msdownload")}
    data = {"document_category": "OTHER", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 400
    assert "Unsupported format" in res.json()["detail"]


def test_04_file_signature_mismatch_rejected(ocr_test_env):
    """File pretending to be PDF but containing corrupted/non-PDF bytes must be rejected with 422."""
    files = {"file": ("fake.pdf", b"NOT_A_REAL_PDF_HEADER", "application/pdf")}
    data = {"document_category": "PATIENT_ID", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 422
    assert "File integrity validation failed" in res.json()["detail"]


def test_05_oversized_file_rejected(ocr_test_env):
    """File exceeding maximum allowed size must be rejected with 413."""
    # 11 MB image exceeds 10 MB limit
    oversized_bytes = b"\xff\xd8\xff\xe0" + (b"0" * (11 * 1024 * 1024))
    files = {"file": ("huge_scan.jpg", oversized_bytes, "image/jpeg")}
    data = {"document_category": "PRESCRIPTION", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 413
    assert "exceeds maximum allowed size" in res.json()["detail"]


def test_06_docx_and_png_support(ocr_test_env):
    """Test valid DOCX and valid PNG support."""
    docx_text = "City Clinic Prescription Dr. Ramesh Kumar Patient: Alice Smith"
    docx_bytes = generate_synthetic_docx(docx_text)

    files = {"file": ("prescription.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    data = {"document_category": "PRESCRIPTION", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]
    assert job["file_type"] == "DOCX"
    assert job["status"] == "REVIEW_REQUIRED"

    # Test PNG image
    png_bytes = generate_synthetic_png()
    png_files = {"file": ("scan.png", png_bytes, "image/png")}
    png_data = {"document_category": "LAB_REPORT", "hospital_id": ocr_test_env["hosp_id"]}

    png_res = client.post("/api/v1/documents/upload-ocr", files=png_files, data=png_data, headers=headers)
    assert png_res.status_code == 200
    png_job = png_res.json()["data"]
    assert png_job["file_type"] == "PNG"


def test_07_duplicate_detection(ocr_test_env):
    """Test duplicate detection matches existing patient (Alice Smith) and registered hospital."""
    pdf_text = "Kedar Hospital\\nPatient Name: Alice Smith\\nAge: 45\\nGender: Female\\nPhone: 9840123456"
    pdf_bytes = generate_synthetic_pdf(pdf_text)

    files = {"file": ("patient_record.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "MEDICAL_RECORD", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]
    
    dup_matches = job.get("duplicate_matches") or {}
    assert "hospital_match" in dup_matches
    assert "Kedar Hospital" in dup_matches["hospital_match"]["hospital_name"]


def test_08_field_correction_by_reviewer(ocr_test_env):
    """Test reviewer modifying/correcting extracted fields before approval."""
    pdf_text = "General Hospital Referral Letter Patient Name: John Doe Age: 30"
    pdf_bytes = generate_synthetic_pdf(pdf_text)

    files = {"file": ("referral.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "REFERRAL_LETTER", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    job_id = res.json()["data"]["id"]

    # Submit correction
    corrections = {
        "corrected_fields": {
            "patient_name": "Johnathon Doe",
            "hospital_name": "General Multi-Specialty Hospital"
        }
    }
    patch_res = client.patch(f"/api/v1/documents/jobs/{job_id}/correct", json=corrections, headers=headers)
    assert patch_res.status_code == 200
    updated_job = patch_res.json()["data"]
    assert updated_job["corrected_fields"]["patient_name"] == "Johnathon Doe"


def test_09_tenant_isolation_cross_hospital_denied(ocr_test_env):
    """User from another hospital cannot access or review document jobs from hospital A."""
    pdf_text = "Confidential Patient Record Hospital A"
    pdf_bytes = generate_synthetic_pdf(pdf_text)

    files = {"file": ("hosp_a_doc.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "MEDICAL_RECORD", "hospital_id": ocr_test_env["hosp_id"]}
    headers_a = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers_a)
    job_id = upload_res.json()["data"]["id"]

    # Hospital B doctor tries to access this job
    headers_b = {"Authorization": f"Bearer {ocr_test_env['token_other']}"}
    access_res = client.get(f"/api/v1/documents/jobs/{job_id}", headers=headers_b)
    assert access_res.status_code == 403
    assert "Unauthorized access" in access_res.json()["detail"]


def test_10_unauthorized_upload_denied():
    """Unauthenticated request is rejected with 401."""
    pdf_bytes = generate_synthetic_pdf("Sample text")
    files = {"file": ("doc.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "OTHER"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data)
    assert res.status_code == 401


def test_11_file_preview_streaming(ocr_test_env):
    """Test authorized streaming of original document preview."""
    pdf_text = "Document Preview Stream Test"
    pdf_bytes = generate_synthetic_pdf(pdf_text)

    files = {"file": ("preview_test.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "LAB_REPORT", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    job_id = upload_res.json()["data"]["id"]

    file_res = client.get(f"/api/v1/documents/jobs/{job_id}/file", headers=headers)
    assert file_res.status_code == 200
    assert file_res.headers["content-type"] == "application/pdf"
    assert "inline" in file_res.headers.get("content-disposition", "")


def test_12_approve_and_persist_to_medical_documents(ocr_test_env):
    """Approval persists the record to oh_id.medical_documents and updates status to APPROVED."""
    pdf_text = "Apollo Hospital Lab Report Patient: Alice Smith Date: 20/10/2026"
    pdf_bytes = generate_synthetic_pdf(pdf_text)

    files = {"file": ("approval_test.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "LAB_REPORT", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    job_id = upload_res.json()["data"]["id"]

    # Approve with synthetic patient p-101
    approve_payload = {
        "final_fields": {
            "hospital_name": "Apollo Clinic",
            "document_type": "Blood Test Report",
            "document_date": "2026-10-20"
        },
        "patient_id": "p-101"
    }

    approve_res = client.post(f"/api/v1/documents/jobs/{job_id}/approve", json=approve_payload, headers=headers)
    assert approve_res.status_code == 200
    app_data = approve_res.json()["data"]
    assert app_data["status"] == "APPROVED"
    assert "document_id" in app_data

    # Verify persistence in oh_id.medical_documents table
    with get_readonly_cursor() as cur:
        cur.execute("SELECT id, title, category, status FROM oh_id.medical_documents WHERE id = %s;", (app_data["document_id"],))
        doc = cur.fetchone()
        assert doc is not None
        assert doc["category"] == "LAB_REPORT"


def test_13_reject_and_delete_quarantined_file(ocr_test_env):
    """Rejection marks job REJECTED and deletes quarantined file."""
    pdf_bytes = generate_synthetic_pdf("Bad document for rejection")

    files = {"file": ("reject_me.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "OTHER", "hospital_id": ocr_test_env["hosp_id"]}
    headers = {"Authorization": f"Bearer {ocr_test_env['token_doc']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    job_id = upload_res.json()["data"]["id"]
    storage_path = Path(upload_res.json()["data"]["storage_path"])
    assert storage_path.exists()

    # Reject
    reject_payload = {"reason": "Document is illegible and belongs to an unsupported institution"}
    reject_res = client.post(f"/api/v1/documents/jobs/{job_id}/reject", json=reject_payload, headers=headers)
    assert reject_res.status_code == 200
    assert reject_res.json()["data"]["status"] == "REJECTED"

    # Quarantined file must be deleted
    assert not storage_path.exists()
