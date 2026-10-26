"""
Automated Test Suite: Enterprise PII Security, Envelope Encryption, Masking & Audit Verification
Sathus Technology Pvt Ltd - OneHealth ID (OH-ID)

Verifies:
- Phase B: Authenticated AES-256-GCM envelope encryption, DEK/KEK handling, tampering rejection, key rotation
- Phase C: Reusable PII masking, controlled audited reveal, IDOR & tenant isolation
- Phase D & E: At-rest document encryption, decrypted streaming, MIME/format validation, upload rate limiting
- Phase I: Structured security audit events with zero sensitive credential/PHI leakage
"""

import sys
import io
import uuid
import json
import struct
import pytest
from pathlib import Path
from datetime import datetime, timezone, timedelta

_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from fastapi.testclient import TestClient
from jose import jwt

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.services.crypto.envelope_encryption import (
    envelope_crypto,
    EnvelopeEncryptionService,
    DecryptionError,
)
from backend.app.services.privacy.pii_masking import pii_masker
from backend.app.core.logging import log_security_event, sanitize_audit_details
from backend.app.services.ocr.file_validator import read_decrypted_document_bytes
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)


def create_token(user_id: str, username: str, hospital_id: str, role: str, permissions: list) -> str:
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


def generate_test_pdf(text: str) -> bytes:
    content = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET"
    stream_bytes = content.encode("latin-1", "replace")
    return f"""%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length {len(stream_bytes)}>> stream
{content}
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
%%EOF""".encode("latin-1")


@pytest.fixture(scope="module")
def security_test_env():
    suffix = uuid.uuid4().hex[:6].upper()
    hosp_a = f"hosp-sec-a-{suffix.lower()}"
    hosp_b = f"hosp-sec-b-{suffix.lower()}"
    branch_a = f"br-sec-a-{suffix.lower()}"
    branch_b = f"br-sec-b-{suffix.lower()}"
    doc_a = f"doc-a-{suffix.lower()}"
    doc_b = f"doc-b-{suffix.lower()}"

    with get_db_cursor() as cur:
        # Create 2 distinct hospital tenants
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, is_active)
            VALUES (%s, 'Apollo Specialty Hospital A', %s, TRUE),
                   (%s, 'Kauvery Hospital B', %s, TRUE)
            ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
        """, (hosp_a, f"HOSPA-{suffix}", hosp_b, f"HOSPB-{suffix}"))

        # Create branches
        cur.execute("""
            INSERT INTO oh_id.hospital_branches (id, hospital_id, name, code, is_main_branch)
            VALUES (%s, %s, 'Main Branch A', %s, TRUE),
                   (%s, %s, 'Main Branch B', %s, TRUE)
            ON CONFLICT (id) DO NOTHING;
        """, (branch_a, hosp_a, f"BRA-{suffix}", branch_b, hosp_b, f"BRB-{suffix}"))

        # Create doctors in respective hospitals
        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES (%s, %s, 'Dr. Arunkumar A', 'Cardiology', TRUE),
                   (%s, %s, 'Dr. Balamurugan B', 'Neurology', TRUE)
            ON CONFLICT (id) DO UPDATE SET is_available = TRUE;
        """, (doc_a, hosp_a, doc_b, hosp_b))

    # Register patients using official repository
    pat_a = sp_repository.register_patient(
        name="Sivakumar Ramachandran",
        age=40,
        diagnosis="Hypertension Review",
        gender="Male",
        phone="+91 98401 23456",
        address="Flat 4A, Green Garden Apartments, Anna Nagar, Chennai, Tamil Nadu",
        identity_number="9876 5432 1098",
        hospital_id=hosp_a,
        branch_id=branch_a
    )
    pat_b = sp_repository.register_patient(
        name="Meenakshi Sundaram",
        age=35,
        diagnosis="Routine General Checkup",
        gender="Female",
        phone="+91 94440 98765",
        address="Plot 12, Lake View Road, Thillai Nagar, Tiruchirappalli, Tamil Nadu",
        identity_number="1234 5678 9012",
        hospital_id=hosp_b,
        branch_id=branch_b
    )

    token_doc_a = create_token(
        doc_a, "dr_arun", hosp_a, "DOCTOR",
        ["patient.create", "patient.read", "patient.reveal_pii", "clinical.read", "clinical.write", "hospital.manage"]
    )
    token_doc_b = create_token(
        doc_b, "dr_bala", hosp_b, "DOCTOR",
        ["patient.create", "patient.read", "patient.reveal_pii", "clinical.read", "clinical.write", "hospital.manage"]
    )
    token_limited_a = create_token(
        f"usr-lim-{suffix.lower()}", "nurse_staff", hosp_a, "NURSE",
        ["patient.read"]  # Missing patient.reveal_pii
    )

    return {
        "hosp_a": hosp_a,
        "hosp_b": hosp_b,
        "doc_a": doc_a,
        "doc_b": doc_b,
        "pat_a": pat_a["id"],
        "pat_b": pat_b["id"],
        "token_doc_a": token_doc_a,
        "token_doc_b": token_doc_b,
        "token_limited_a": token_limited_a,
    }


# ==============================================================================
# SECTION 1: ENCRYPTION & KEY MANAGEMENT TESTS (PHASE B)
# ==============================================================================

def test_01_envelope_encryption_roundtrip():
    """Verify AES-256-GCM envelope encryption and decryption correctness."""
    plaintext = b"CONFIDENTIAL PATIENT CLINICAL SUMMARY: Patient exhibits stable cardiac rhythm."
    aad = b"hosp-apollo:doc-discharge-001"

    package = envelope_crypto.encrypt_document_bytes(plaintext, associated_data=aad)
    assert envelope_crypto.is_encrypted_document(package) is True
    assert package.startswith(b"OHID_ENC_V1")

    decrypted = envelope_crypto.decrypt_document_bytes(package, associated_data=aad)
    assert decrypted == plaintext


def test_02_envelope_tampering_detection():
    """Verify authenticated AES-256-GCM detects any ciphertext or tag tampering."""
    plaintext = b"CRITICAL CLINICAL OBSERVATION - DO NOT ALTER"
    package = bytearray(envelope_crypto.encrypt_document_bytes(plaintext))

    # Tamper with the last byte of ciphertext/tag
    package[-1] ^= 0xFF

    with pytest.raises(DecryptionError) as exc_info:
        envelope_crypto.decrypt_document_bytes(bytes(package))
    assert "tampered" in str(exc_info.value).lower() or "failed" in str(exc_info.value).lower()


def test_03_envelope_aad_mismatch_rejection():
    """Verify associated authenticated data (AAD) binding prevents context substitution."""
    plaintext = b"PRESCRIPTION: Metformin 500mg BID"
    package = envelope_crypto.encrypt_document_bytes(plaintext, associated_data=b"tenant-hospital-A")

    # Decrypting with wrong tenant AAD must raise DecryptionError
    with pytest.raises(DecryptionError):
        envelope_crypto.decrypt_document_bytes(package, associated_data=b"tenant-hospital-B")


def test_04_key_rotation_without_payload_reencryption():
    """Verify KEK rotation re-wraps the DEK without decrypting or re-encrypting the data payload."""
    plaintext = b"MASSIVE CLINICAL DATASET TO PROTECT UNDER KEY ROTATION"
    service_v1 = EnvelopeEncryptionService()
    package = service_v1.encrypt_document_bytes(plaintext)

    # Rotate KEK to version 2
    new_master_key = b"A" * 32
    rotated_package = service_v1.reencrypt_document(
        package,
        new_kek_id="OHID-KEK-v2",
        new_kek_bytes=new_master_key
    )

    # Verify new header reflects v2
    magic_len = len(b"OHID_ENC_V1")
    header_len = struct.unpack(">I", rotated_package[magic_len:magic_len + 4])[0]
    header = json.loads(rotated_package[magic_len + 4:magic_len + 4 + header_len].decode("utf-8"))
    assert header["kek_id"] == "OHID-KEK-v2"

    # Decrypt with new service initialized with the rotated key
    service_v2 = EnvelopeEncryptionService()
    service_v2.register_kek("OHID-KEK-v2", new_master_key)
    service_v2.active_kek_id = "OHID-KEK-v2"
    assert service_v2.decrypt_document_bytes(rotated_package) == plaintext


def test_05_field_level_encryption_helper():
    """Verify field-level encryption helper for sensitive database attributes."""
    aadhaar_number = "9876-5432-1098"
    enc_field = envelope_crypto.encrypt_field(aadhaar_number)
    assert enc_field.startswith("enc:v1:")
    assert aadhaar_number not in enc_field

    dec_field = envelope_crypto.decrypt_field(enc_field)
    assert dec_field == aadhaar_number


# ==============================================================================
# SECTION 2: PII MASKING & CONTROLLED DISPLAY TESTS (PHASE C)
# ==============================================================================

def test_06_pii_masking_primitives():
    """Verify masking transformations preserve clinician safety while concealing identifiers."""
    # Names retain first initials
    assert pii_masker.mask_name("Sivakumar Ramachandran") == "S***** R*****"
    assert pii_masker.mask_name("Raj") == "R**"
    assert pii_masker.mask_name("") == ""

    # Phone numbers retain last 4 digits
    assert pii_masker.mask_phone("+91 98401 23456") == "+91 ******3456"
    assert pii_masker.mask_phone("9840123456") == "***-***-3456"

    # Aadhaar / National IDs retain last 4 digits
    assert pii_masker.mask_national_id("9876 5432 1098") == "********1098"

    # Addresses retain state and city if present
    masked_addr = pii_masker.mask_address("Flat 4A, Anna Nagar", city="Chennai", state="Tamil Nadu")
    assert "Flat 4A" not in masked_addr
    assert "Chennai" in masked_addr

    # Diagnoses mask protected health information
    masked_diag = pii_masker.mask_diagnosis("Acute Myocardial Infarction")
    assert "Protected Health Information" in masked_diag


def test_07_patient_list_returns_masked_pii_by_default(security_test_env):
    """Verify /api/v1/patients returns masked PII by default to prevent unauthorized bulk exposure."""
    headers = {"Authorization": f"Bearer {security_test_env['token_doc_a']}"}
    res = client.get(f"/api/v1/patients?hospital_id={security_test_env['hosp_a']}", headers=headers)
    assert res.status_code == 200
    patients = res.json()
    assert len(patients) >= 1

    target = next((p for p in patients if p["id"] == security_test_env["pat_a"]), None)
    assert target is not None
    # Patient name, phone, identity_number MUST be masked in default directory response
    assert "*" in target["name"]
    assert "Sivakumar" not in target["name"]
    assert "3456" in target["phone"]
    assert "98401" not in target["phone"]
    assert "1098" in target["identity_number"]
    assert "9876" not in target["identity_number"]


def test_08_controlled_field_reveal_authorized(security_test_env):
    """Verify authorized clinician with justification can reveal a single field with audit logging."""
    headers = {"Authorization": f"Bearer {security_test_env['token_doc_a']}"}
    body = {
        "field_name": "phone",
        "justification": "Emergency contact verification for planned admission"
    }
    url = f"/api/v1/patients/{security_test_env['pat_a']}/reveal-field"
    res = client.post(url, json=body, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["field_name"] == "phone"
    assert "98401" in data["data"]["value"]


def test_09_controlled_field_reveal_unauthorized_permission(security_test_env):
    """Verify user without 'patient.reveal_pii' permission is rejected with 403 Forbidden."""
    headers = {"Authorization": f"Bearer {security_test_env['token_limited_a']}"}
    body = {
        "field_name": "phone",
        "justification": "Routine administrative follow-up"
    }
    url = f"/api/v1/patients/{security_test_env['pat_a']}/reveal-field"
    res = client.post(url, json=body, headers=headers)
    assert res.status_code == 403


def test_10_controlled_field_reveal_idor_cross_tenant_denied(security_test_env):
    """Verify Hospital B clinician cannot reveal PII of Hospital A's patient (cross-tenant IDOR)."""
    headers = {"Authorization": f"Bearer {security_test_env['token_doc_b']}"}
    body = {
        "field_name": "identity_number",
        "justification": "Attempting cross-hospital patient lookup"
    }
    # Doctor B requests Patient A
    url = f"/api/v1/patients/{security_test_env['pat_a']}/reveal-field"
    res = client.post(url, json=body, headers=headers)
    assert res.status_code == 403


def test_11_controlled_field_reveal_invalid_justification(security_test_env):
    """Verify reveal request is rejected when justification is missing or trivial."""
    headers = {"Authorization": f"Bearer {security_test_env['token_doc_a']}"}
    body = {
        "field_name": "name",
        "justification": "idk"  # Too short (< 5 chars)
    }
    url = f"/api/v1/patients/{security_test_env['pat_a']}/reveal-field"
    res = client.post(url, json=body, headers=headers)
    assert res.status_code == 400


# ==============================================================================
# SECTION 3: AT-REST STORAGE & DECRYPTED STREAMING (PHASE D & E)
# ==============================================================================

def test_12_uploaded_document_encrypted_at_rest_on_disk(security_test_env):
    """Verify uploaded document is physically encrypted at rest with envelope header on disk."""
    secret_text = "CONFIDENTIAL BIOPSY REPORT: Malignancy ruled out. Normal cellular morphology."
    pdf_bytes = generate_test_pdf(secret_text)

    files = {"file": ("at_rest_security_test.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "LAB_REPORT", "hospital_id": security_test_env["hosp_a"]}
    headers = {"Authorization": f"Bearer {security_test_env['token_doc_a']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert upload_res.status_code == 200
    job_id = upload_res.json()["data"]["id"]

    # Query the physical storage path from database
    with get_readonly_cursor() as cur:
        cur.execute("SELECT storage_path FROM oh_id.document_ocr_jobs WHERE id = %s", (job_id,))
        row = cur.fetchone()
        assert row is not None
        storage_path = row["storage_path"]

    # Verify physical file on disk
    file_path = Path(storage_path)
    assert file_path.exists()
    disk_bytes = file_path.read_bytes()

    # 1. Disk bytes MUST start with OHID_ENC_V1
    assert disk_bytes.startswith(b"OHID_ENC_V1")
    # 2. Disk bytes MUST NOT contain the plaintext biopsy report
    assert secret_text.encode("latin-1") not in disk_bytes

    # 3. Decrypting through envelope crypto recovers original bytes
    recovered = read_decrypted_document_bytes(storage_path, job_id=job_id, filename="at_rest_security_test.pdf")
    assert recovered == pdf_bytes


def test_13_decrypted_preview_streaming_with_security_headers(security_test_env):
    """Verify /jobs/{job_id}/file streams decrypted bytes with proper cache & nosniff headers."""
    pdf_bytes = generate_test_pdf("Patient discharge summary preview verification")
    files = {"file": ("preview_headers.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "DISCHARGE_SUMMARY", "hospital_id": security_test_env["hosp_a"]}
    headers = {"Authorization": f"Bearer {security_test_env['token_doc_a']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers)
    assert upload_res.status_code == 200
    job_id = upload_res.json()["data"]["id"]

    # Request preview
    preview_res = client.get(f"/api/v1/documents/jobs/{job_id}/file", headers=headers)
    assert preview_res.status_code == 200
    assert preview_res.content == pdf_bytes
    assert preview_res.headers.get("x-content-type-options") == "nosniff"
    assert "no-store" in preview_res.headers.get("cache-control", "")


def test_14_cross_tenant_document_preview_denied(security_test_env):
    """Verify doctor from Hospital B cannot stream or download Hospital A's document."""
    pdf_bytes = generate_test_pdf("Confidential Hospital A document")
    files = {"file": ("hosp_a_doc.pdf", pdf_bytes, "application/pdf")}
    data = {"document_category": "OTHER", "hospital_id": security_test_env["hosp_a"]}
    headers_a = {"Authorization": f"Bearer {security_test_env['token_doc_a']}"}

    upload_res = client.post("/api/v1/documents/upload-ocr", files=files, data=data, headers=headers_a)
    job_id = upload_res.json()["data"]["id"]

    # Doctor B attempts to preview Doctor A's document
    headers_b = {"Authorization": f"Bearer {security_test_env['token_doc_b']}"}
    preview_res = client.get(f"/api/v1/documents/jobs/{job_id}/file", headers=headers_b)
    assert preview_res.status_code == 403


# ==============================================================================
# SECTION 4: AUDIT, LOGGING & REDACTION TESTS (PHASE I)
# ==============================================================================

def test_15_audit_log_scrubbing_prevents_credential_and_phi_leak():
    """Verify log scrubbing redacts sensitive secrets, passwords, tokens, and encryption keys."""
    dirty_dict = {
        "user_id": "usr-12345",
        "action": "LOGIN_ATTEMPT",
        "password": "SuperSecretPassword123!",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
        "edek": "d8f7a6b5c4d3e2f1",
        "dek": "secret_dek_data",
        "aadhaar": "9876-5432-1098",
        "ocr_text": "Extracted raw patient records",
        "safe_param": "hospital_apollo"
    }

    clean = sanitize_audit_details(dirty_dict)
    assert clean["password"] == "[REDACTED]"
    assert clean["token"] == "[REDACTED]"
    assert clean["edek"] == "[REDACTED]"
    assert clean["dek"] == "[REDACTED]"
    assert clean["aadhaar"] == "[REDACTED]"
    assert clean["ocr_text"] == "[REDACTED]"
    assert clean["safe_param"] == "hospital_apollo"


def test_16_audit_events_persisted_to_database(security_test_env):
    """Verify security events are stored in oh_id.audit_logs with correlation IDs."""
    test_event_name = f"SEC_TEST_AUDIT_{uuid.uuid4().hex[:6].upper()}"
    corr_id = log_security_event(
        event_type=test_event_name,
        actor_id=security_test_env["doc_a"],
        resource=f"patient:{security_test_env['pat_a']}",
        status="SUCCESS",
        details={"action_purpose": "Routine clinical audit check"},
        hospital_id=security_test_env["hosp_a"]
    )

    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT action, actor_id, hospital_id, details, created_at
            FROM oh_id.audit_logs
            WHERE action = %s
            ORDER BY created_at DESC LIMIT 1;
        """, (test_event_name,))
        row = cur.fetchone()
        assert row is not None
        assert row["action"] == test_event_name
        assert row["actor_id"] == security_test_env["doc_a"]
        assert row["hospital_id"] == security_test_env["hosp_a"]
        details_data = json.loads(row["details"]) if isinstance(row["details"], str) else row["details"]
        assert details_data.get("correlation_id") == corr_id
