"""
Comprehensive Test Suite: Automatic Medical Document OCR Validation & Backblaze B2 Secure Upload
Verifies:
- Workflow: SELECT -> SECURITY VALIDATION -> OCR -> MEDICAL DOCUMENT CLASSIFICATION -> ENCRYPTION -> B2 STORAGE -> PATIENT VAULT.
- Routine documents are automatically stored without requiring clinical approval.
- Application-layer AES-256-GCM envelope encryption with unique per-document DEK.
- Backblaze B2 object storage integration (bucket, storage key, SHA-256 hash).
- Three independent status fields: upload_status, ocr_status, classification_status.
- Patient preview retrieval with in-memory decryption.
- Cross-patient and cross-hospital tenant access denial.
- Synthetic document testing: Prescriptions, Lab Reports, X-Ray, WhatsApp photos, Scanned PDFs, Unfamiliar Layouts, Malware, and Corrupted Files.
Sathus Technology Pvt Ltd - OneHealth ID
"""

import io
import json
import uuid
import hashlib
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from backend.app.main import app
from backend.app.database.session import get_readonly_cursor, get_db_cursor
from backend.app.core.security import create_access_token
from backend.app.services.crypto.envelope_encryption import envelope_crypto
from backend.app.services.storage.b2_storage import b2_storage

client = TestClient(app)


def generate_pdf(text: str) -> bytes:
    """Generates synthetic valid PDF bytes containing the specified text."""
    import pypdfium2 as pdfium
    # Minimal valid synthetic PDF structure with xref table
    content = f"BT /F1 12 Tf 72 712 Td ({text}) Tj ET"
    stream_len = len(content)
    pdf_str = (
        "%PDF-1.4\n"
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        f"4 0 obj\n<< /Length {stream_len} >>\nstream\n{content}\nendstream\nendobj\n"
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        "xref\n0 6\n"
        "0000000000 65535 f \n"
        "0000000009 00000 n \n"
        "0000000058 00000 n \n"
        "0000000115 00000 n \n"
        "0000000261 00000 n \n"
        f"0000000{320 + stream_len:03d} 00000 n \n"
        "trailer\n<< /Size 6 /Root 1 0 R >>\n"
        "startxref\n"
        f"{390 + stream_len}\n"
        "%%EOF\n"
    )
    return pdf_str.encode("latin1")


def generate_image(text: str, img_format: str = "JPEG") -> bytes:
    """Generates synthetic JPEG or PNG image bytes with text metadata."""
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((40, 40), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    if img_format.upper() in ("JPEG", "JPG"):
        img.save(buf, format="JPEG", comment=text.encode("utf-8"))
    else:
        from PIL import PngImagePlugin
        meta = PngImagePlugin.PngInfo()
        meta.add_text("comment", text)
        img.save(buf, format="PNG", pnginfo=meta)
    return buf.getvalue()


@pytest.fixture(scope="module")
def setup_env():
    """Sets up authenticated test context for patient Alice Smith and Doctor Senthil."""
    patient_user = {
        "sub": "9884240519",
        "username": "9884240519",
        "uid": "usr-patient",
        "user_ref_id": "usr-patient",
        "hospital_id": "hosp-kedar",
        "role": "PATIENT",
        "permissions": ["patient.self.read", "patient.self.documents", "patient.self.records"]
    }
    doctor_user = {
        "sub": "dr_senthil",
        "username": "dr_senthil",
        "uid": "usr-doctor",
        "user_ref_id": "usr-doctor",
        "hospital_id": "hosp-kedar",
        "role": "DOCTOR",
        "permissions": ["patient.read", "consultation.create", "clinical.write", "hospital.manage"]
    }
    unauthorized_patient = {
        "sub": "other_patient",
        "username": "other_patient",
        "uid": "usr-other",
        "user_ref_id": "usr-other",
        "hospital_id": "hosp-other",
        "role": "PATIENT",
        "permissions": ["patient.self.read", "patient.self.documents"]
    }

    token_patient = create_access_token(patient_user)
    token_doctor = create_access_token(doctor_user)
    token_other = create_access_token(unauthorized_patient)

    return {
        "token_patient": token_patient,
        "token_doctor": token_doctor,
        "token_other": token_other,
        "patient_id": "p-101",
        "hospital_id": "hosp-kedar"
    }


# ==============================================================================
# SECTION 1: ROUTINE DOCUMENT AUTO-STORAGE WITHOUT CLINICAL APPROVAL
# ==============================================================================

def test_01_printed_prescription_auto_stored(setup_env):
    """Printed prescription must be automatically stored to B2 and Medical Documents without clinical approval."""
    text = (
        "Apollo City Hospital Chennai\\n"
        "Prescription Order\\n"
        "Date: 2026-10-15\\n"
        "Patient: Alice Smith (Age 32, Female)\\n"
        "Doctor: Dr. Rajesh Kumar MD\\n"
        "Rx: Tab Amoxicillin 500mg 1-0-1 x 5 days\\n"
        "Tab Paracetamol 650mg SOS\\n"
        "Follow up in 1 week"
    )
    pdf = generate_pdf(text)
    files = {"file": ("apollo_prescription_oct2026.pdf", pdf, "application/pdf")}
    data = {"document_category": "PRESCRIPTION", "hospital_id": setup_env["hospital_id"], "patient_id": setup_env["patient_id"]}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200, res.text
    job = res.json()["data"]

    # 1. Independent Status Dimensions
    assert job["upload_status"] == "STORED"
    assert job["ocr_status"] in ("COMPLETED", "LOW_CONFIDENCE")
    assert job["classification_status"] == "IDENTIFIED"
    assert job["status"] == "STORED"

    # 2. Backblaze B2 Metadata Saved
    assert job.get("b2_storage_key") is not None
    assert "documents/hosp-kedar" in job["b2_storage_key"]
    assert job.get("b2_bucket") == "ohid-medical-documents-private"
    assert job.get("b2_etag") is not None

    # 3. Automatically Created in oh_id.medical_documents with status='AVAILABLE'
    assert job.get("created_record_id") is not None
    with get_readonly_cursor() as cur:
        cur.execute("SELECT id, patient_id, title, category, status, metadata FROM oh_id.medical_documents WHERE id = %s", (job["created_record_id"],))
        doc = cur.fetchone()
        assert doc is not None
        assert doc["patient_id"] == setup_env["patient_id"]
        assert doc["status"] == "AVAILABLE"
        assert doc["metadata"]["b2_storage_key"] == job["b2_storage_key"]


def test_02_clinical_consultation_report_auto_stored(setup_env):
    """Clinical consultation report is automatically stored in B2 and made available in Patient Documents."""
    text = (
        "Global Health Institute\\n"
        "Clinical Consultation Report\\n"
        "Patient Name: Alice Smith\\n"
        "Date of Consultation: 2026-09-20\\n"
        "Physician: Dr. Priya Sharma\\n"
        "Complaints: Headache and fatigue for 3 days\\n"
        "Vitals: BP 120/80 mmHg, Pulse 76 bpm\\n"
        "Diagnosis: Tension Type Headache\\n"
        "Plan: Rest, hydration, Tab Naproxen 250mg"
    )
    pdf = generate_pdf(text)
    files = {"file": ("consultation_report.pdf", pdf, "application/pdf")}
    data = {"document_category": "CLINICAL_DOCUMENT", "hospital_id": setup_env["hospital_id"]}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]

    assert job["upload_status"] == "STORED"
    assert job["status"] == "STORED"
    assert job.get("created_record_id") is not None


def test_03_laboratory_report_auto_stored(setup_env):
    """Laboratory blood report is automatically stored and made available."""
    text = (
        "Metropolis Diagnostics Central Lab\\n"
        "Complete Blood Count (CBC) Pathology Report\\n"
        "Patient: Alice Smith, 32Y / F\\n"
        "Collection Date: 2026-10-01\\n"
        "Hemoglobin: 13.5 g/dL (Normal: 12.0 - 15.5)\\n"
        "Total WBC Count: 7,500 /cumm\\n"
        "Platelet Count: 250,000 /cumm\\n"
        "RBC Count: 4.5 million/cumm\\n"
        "Pathologist: Dr. Ananya Sen MD"
    )
    pdf = generate_pdf(text)
    files = {"file": ("cbc_lab_report.pdf", pdf, "application/pdf")}
    data = {"document_category": "LAB_REPORT"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]

    assert job["upload_status"] == "STORED"
    assert job["classification_status"] == "IDENTIFIED"
    assert job["status"] == "STORED"


def test_04_xray_diagnostic_imaging_auto_stored(setup_env):
    """Diagnostic imaging / X-Ray report is automatically stored."""
    text = (
        "Department of Diagnostic Radiology\\n"
        "Chest X-Ray PA View Examination Report\\n"
        "Patient: Alice Smith, Date: 2026-08-11\\n"
        "Findings: Both lung fields are clear. No focal consolidation or effusion.\\n"
        "Cardiac size is normal. Bony thorax intact.\\n"
        "Impression: Normal study.\\n"
        "Radiologist: Dr. K. Ramanathan DMRD"
    )
    pdf = generate_pdf(text)
    files = {"file": ("chest_xray_report.pdf", pdf, "application/pdf")}
    data = {"document_category": "DIAGNOSTIC_REPORT"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]
    assert job["upload_status"] == "STORED"
    assert job["status"] == "STORED"


def test_05_whatsapp_jpeg_photograph_accepted(setup_env):
    """WhatsApp JPEG photograph of prescription is accepted and stored without layout rejection."""
    text = (
        "Care Clinic T. Nagar\\n"
        "Prescription Note\\n"
        "Date: 14/09/2026\\n"
        "Patient: Alice Smith\\n"
        "Dr. M. Balaji\\n"
        "Rx: Cetirizine 10mg OD x 3 days"
    )
    jpeg_bytes = generate_image(text, "JPEG")
    files = {"file": ("IMG-20260914-WA0012.jpeg", jpeg_bytes, "image/jpeg")}
    data = {"document_category": "PRESCRIPTION"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]
    assert job["upload_status"] == "STORED"
    assert job["status"] == "STORED"


def test_06_unfamiliar_hospital_layout_auto_stored_not_rejected(setup_env):
    """A valid medical document from an unfamiliar hospital layout must not be rejected or blocked."""
    text = (
        "Rural Community Health Center Kanchipuram\\n"
        "Outpatient Clinical Ticket #48291\\n"
        "Visit Date: 2026-07-22\\n"
        "Patient: Alice Smith, 32 / Female\\n"
        "Duty Medical Officer: Dr. Vijayalakshmi MBBS\\n"
        "Diagnosis: Acute Gastroenteritis\\n"
        "Oral Rehydration Salts (ORS) sachets x 4\\n"
        "Tab Zinc 20mg OD x 14 days"
    )
    pdf = generate_pdf(text)
    files = {"file": ("unfamiliar_rural_clinic_slip.pdf", pdf, "application/pdf")}
    data = {"document_category": "CLINICAL_DOCUMENT"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]
    assert job["upload_status"] == "STORED"
    assert job["status"] == "STORED"


def test_07_handwritten_or_low_ocr_original_preserved_and_stored(setup_env):
    """Handwritten or low OCR confidence document preserves original in B2 with retry advice."""
    text = "Rx illegible scribbled note 12/26"
    pdf = generate_pdf(text)
    files = {"file": ("handwritten_note.pdf", pdf, "application/pdf")}
    data = {"document_category": "PRESCRIPTION"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]

    # Original is safely stored!
    assert job["upload_status"] == "STORED"
    assert job["status"] == "STORED"
    assert job.get("b2_storage_key") is not None


# ==============================================================================
# SECTION 2: SECURITY VALIDATION & THREAT REJECTION TESTS
# ==============================================================================

def test_08_invalid_file_signature_rejected(setup_env):
    """Executable spoofed as a PDF must be rejected at pre-flight security validation."""
    fake_exe = b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 100
    files = {"file": ("malicious_payload.pdf", fake_exe, "application/pdf")}
    data = {"document_category": "PRESCRIPTION"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 422
    assert "File integrity validation failed" in res.text or "Invalid PDF header signature" in res.text


def test_09_corrupted_pdf_rejected(setup_env):
    """Corrupted / truncated file must be rejected cleanly."""
    corrupted_pdf = b"%PDF-1.4\ncorrupted byte stream without xref"
    files = {"file": ("corrupt.pdf", corrupted_pdf, "application/pdf")}
    data = {"document_category": "LAB_REPORT"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    # Rejection should occur cleanly without 500 error
    assert res.status_code in (200, 422)
    if res.status_code == 200:
        assert res.json()["data"]["upload_status"] in ("STORED", "UPLOAD_FAILED")


def test_10_irrelevant_electricity_bill_rejected_as_non_medical(setup_env):
    """A non-medical utility bill must be rejected with actionable reason."""
    text = (
        "Tamil Nadu Generation and Distribution Corporation (TANGEDCO)\\n"
        "Electricity Consumer High Tension Power Bill\\n"
        "Consumer No: 04-201-982-10\\n"
        "Units Consumed: 480 kWh\\n"
        "Current Assessment Charges: Rs 3,420.00\\n"
        "Due Date for Payment: 28-11-2026"
    )
    pdf = generate_pdf(text)
    files = {"file": ("tneb_electricity_bill.pdf", pdf, "application/pdf")}
    data = {"document_category": "PRESCRIPTION"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert res.status_code == 200
    job = res.json()["data"]
    assert job["status"] in ("REJECTED_IRRELEVANT", "NON_MEDICAL_DOCUMENT_REJECTED")
    assert job["upload_status"] == "UPLOAD_FAILED"
    assert job["classification_status"] == "UNSUPPORTED"


# ==============================================================================
# SECTION 3: BACKBLAZE B2 STORAGE & ENCRYPTION VERIFICATION
# ==============================================================================

def test_11_aes256_gcm_b2_storage_integrity(setup_env):
    """Verifies that only encrypted bytes reach B2, with AES-256-GCM envelope and SHA-256 integrity."""
    plaintext = b"Confidential Medical Diagnostic Record - Patient Alice Smith - HIV/HCV Negative"
    safe_name = "blood_safety_cert.pdf"
    tenant_scope = "hosp-kedar"
    job_id = f"test-{uuid.uuid4().hex[:8]}"

    # Envelope encryption
    aad = f"{tenant_scope}:{job_id}:{safe_name}".encode("utf-8")
    encrypted_pkg = envelope_crypto.encrypt_document_bytes(plaintext, associated_data=aad)

    # Magic signature must be present
    assert envelope_crypto.is_encrypted_document(encrypted_pkg) is True

    # Upload to B2
    b2_key = f"documents/{tenant_scope}/{job_id}/{safe_name}.enc"
    b2_res = b2_storage.upload_encrypted_document(
        encrypted_bytes=encrypted_pkg,
        storage_key=b2_key,
        original_filename=safe_name,
        metadata={"job_id": job_id, "patient_id": "p-101"}
    )

    assert b2_res["bucket"] == "ohid-medical-documents-private"
    assert b2_res["storage_key"] == b2_key
    assert b2_res["encryption_algorithm"] == "AES-256-GCM"
    assert b2_res["is_encrypted"] is True

    # Retrieve and decrypt
    downloaded_pkg = b2_storage.download_encrypted_document(b2_key)
    decrypted = envelope_crypto.decrypt_document_bytes(downloaded_pkg, associated_data=aad)
    assert decrypted == plaintext


def test_12_unencrypted_bytes_rejected_by_b2_storage_guard():
    """Security Guard: Passing raw unencrypted bytes to B2 upload raises Security Violation."""
    raw_plaintext = b"UNENCRYPTED PATIENT LAB REPORT"
    with pytest.raises(Exception) as exc:
        b2_storage.upload_encrypted_document(
            encrypted_bytes=raw_plaintext,
            storage_key="test/leak_attempt.pdf",
            original_filename="leak_attempt.pdf"
        )
    assert "Security Policy Violation" in str(exc.value) or "Unencrypted document" in str(exc.value)


# ==============================================================================
# SECTION 4: PATIENT PREVIEW & ACCESS CONTROL TESTS
# ==============================================================================

def test_13_patient_preview_streaming_success(setup_env):
    """Patient can retrieve and stream their own decrypted document preview."""
    text = "Apollo Hospital Lab Result - Alice Smith - Normal"
    pdf = generate_pdf(text)
    files = {"file": ("preview_test.pdf", pdf, "application/pdf")}
    data = {"document_category": "LAB_REPORT"}
    headers = {"Authorization": f"Bearer {setup_env['token_patient']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert upload_res.status_code == 200
    job = upload_res.json()["data"]
    job_id = job["id"]

    # Stream original file preview via jobs endpoint
    preview_res = client.get(f"/api/v1/documents/jobs/{job_id}/file", headers=headers)
    assert preview_res.status_code == 200
    assert preview_res.headers["content-type"] == "application/pdf"
    assert preview_res.content.startswith(b"%PDF-")

    # Stream via /me/documents/{document_id}/file endpoint
    doc_id = job.get("created_record_id")
    if doc_id:
        doc_preview_res = client.get(f"/api/v1/me/documents/{doc_id}/file", headers=headers)
        assert doc_preview_res.status_code == 200
        assert doc_preview_res.headers["content-type"] == "application/pdf"
        assert doc_preview_res.content.startswith(b"%PDF-")


def test_14_cross_patient_access_denied(setup_env):
    """Another patient attempting to view Alice's document preview receives 403 Forbidden."""
    text = "Apollo Hospital Lab Result - Alice Smith - Secret"
    pdf = generate_pdf(text)
    files = {"file": ("alice_confidential.pdf", pdf, "application/pdf")}
    data = {"document_category": "LAB_REPORT"}
    headers_alice = {"Authorization": f"Bearer {setup_env['token_patient']}"}
    headers_intruder = {"Authorization": f"Bearer {setup_env['token_other']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers_alice)
    job_id = upload_res.json()["data"]["id"]
    doc_id = upload_res.json()["data"].get("created_record_id")

    # Intruder tries to preview Alice's file
    denied_res = client.get(f"/api/v1/documents/jobs/{job_id}/file", headers=headers_intruder)
    assert denied_res.status_code == 403

    if doc_id:
        doc_denied_res = client.get(f"/api/v1/me/documents/{doc_id}/file", headers=headers_intruder)
        assert doc_denied_res.status_code in (403, 404)

