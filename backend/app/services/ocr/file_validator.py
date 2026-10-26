"""
File Validation and Quarantined Storage Manager for OH-ID Document Processing
Enforces strict file signature verification, size limits, and path sanitization.
Sathus Technology Pvt Ltd - OneHealth ID
"""

import os
import re
import hashlib
import zipfile
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from fastapi import HTTPException, status
from backend.app.core.logging import logger
from backend.app.services.crypto.envelope_encryption import envelope_crypto, DecryptionError
from backend.app.services.security.malware_scanner import (
    malware_scanner,
    MalwareDetectedError,
    ArchiveBombDetectedError,
    ScannerUnavailableError
)

# Maximum file sizes in bytes
SIZE_LIMITS: Dict[str, int] = {
    "IMAGE": 10 * 1024 * 1024,      # 10 MB
    "PDF": 20 * 1024 * 1024,        # 20 MB
    "DOCX": 10 * 1024 * 1024,       # 10 MB
    "VIDEO": 100 * 1024 * 1024,     # 100 MB
}

# Supported file extensions mapped to category and MIME types
SUPPORTED_EXTENSIONS: Dict[str, Dict[str, Any]] = {
    ".pdf": {"category": "PDF", "mime": "application/pdf"},
    ".jpg": {"category": "IMAGE", "mime": "image/jpeg"},
    ".jpeg": {"category": "IMAGE", "mime": "image/jpeg"},
    ".png": {"category": "IMAGE", "mime": "image/png"},
    ".webp": {"category": "IMAGE", "mime": "image/webp"},
    ".docx": {"category": "DOCX", "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    ".mp4": {"category": "VIDEO", "mime": "video/mp4"},
    ".mov": {"category": "VIDEO", "mime": "video/quicktime"},
}

# Base storage paths
BASE_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "storage" / "documents"
QUARANTINE_DIR = BASE_STORAGE_DIR / "quarantine"
APPROVED_DIR = BASE_STORAGE_DIR / "approved"


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and remove dangerous characters."""
    clean = os.path.basename(filename)
    clean = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', clean)
    clean = re.sub(r'[^a-zA-Z0-9._-]', '_', clean)
    clean = re.sub(r'\.{2,}', '.', clean)  # No ..
    if not clean or clean.startswith('.'):
        clean = f"document_{clean}"
    return clean[:120]


def verify_file_signature(content: bytes, ext: str) -> Tuple[bool, str]:
    """
    Verify magic bytes file signature to prevent extension/MIME spoofing.
    Returns (is_valid, detected_mime_or_error).
    """
    if len(content) < 4:
        return False, "File is too small or empty."

    # PDF signature: %PDF-
    if ext == ".pdf":
        if content.startswith(b'%PDF-'):
            # Check for encrypted PDF indicator
            if b'/Encrypt' in content[:4096] or b'/Encrypt' in content[-4096:]:
                # Check with pypdfium2 if readable
                try:
                    import pypdfium2 as pdfium
                    doc = pdfium.PdfDocument(content)
                    if doc.is_encrypted:
                        doc.close()
                        return False, "Encrypted/password-protected PDFs cannot be processed."
                    doc.close()
                except Exception as e:
                    return False, f"Corrupted or password-protected PDF: {str(e)}"
            return True, "application/pdf"
        return False, "Invalid PDF header signature."

    # PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if ext == ".png":
        if content.startswith(b'\x89PNG\r\n\x1a\n'):
            return True, "image/png"
        return False, "Invalid PNG signature."

    # JPEG signature: FF D8 FF
    if ext in (".jpg", ".jpeg"):
        if content.startswith(b'\xff\xd8\xff'):
            return True, "image/jpeg"
        return False, "Invalid JPEG signature."

    # WEBP signature: RIFF....WEBP
    if ext == ".webp":
        if content.startswith(b'RIFF') and len(content) > 12 and content[8:12] == b'WEBP':
            return True, "image/webp"
        return False, "Invalid WebP signature."

    # DOCX signature: PK 03 04 (ZIP container containing word/document.xml)
    if ext == ".docx":
        if content.startswith(b'PK\x03\x04'):
            try:
                import io
                with zipfile.ZipFile(io.BytesIO(content)) as zf:
                    if "word/document.xml" in zf.namelist():
                        return True, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            except Exception:
                return False, "Corrupted DOCX archive structure."
            return False, "Invalid DOCX format: missing word/document.xml."
        return False, "Invalid DOCX zip signature."

    # MP4 / MOV signatures: ftyp box
    if ext in (".mp4", ".mov"):
        if len(content) >= 12 and (content[4:8] == b'ftyp' or content[4:8] == b'moov'):
            return True, "video/mp4" if ext == ".mp4" else "video/quicktime"
        return False, f"Invalid video signature for {ext}."

    return False, f"Unsupported file extension: {ext}"


def validate_and_quarantine_file(
    content: bytes,
    original_filename: str,
    hospital_id: Optional[str],
    job_id: str
) -> Dict[str, Any]:
    """
    Validates uploaded document bytes against size limits, extension whitelist,
    magic byte signatures, and writes the file into the quarantined storage location.
    """
    safe_name = sanitize_filename(original_filename)
    ext = os.path.splitext(safe_name)[1].lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Supported formats: {', '.join(SUPPORTED_EXTENSIONS.keys())}"
        )

    config = SUPPORTED_EXTENSIONS[ext]
    category = config["category"]
    max_size = SIZE_LIMITS.get(category, 10 * 1024 * 1024)

    file_size = len(content)
    if file_size > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size for {category} ({max_mb} MB). Size provided: {file_size // (1024 * 1024)} MB."
        )

    # Magic byte signature check
    is_valid, mime_or_err = verify_file_signature(content, ext)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File integrity validation failed: {mime_or_err}"
        )

    # Isolated Anti-Malware, Threat Defense & Archive Bomb Inspection Gate
    try:
        malware_scanner.scan_bytes(content, safe_name, hospital_id)
    except MalwareDetectedError as m_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Security scan rejected file: Malicious payload detected ({m_err.threat_name})."
        )
    except ArchiveBombDetectedError as a_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Security scan rejected file: Archive decompression risk ({str(a_err)})."
        )

    # Calculate SHA-256 hash for integrity and duplicate prevention
    file_hash = hashlib.sha256(content).hexdigest()

    # Quarantine directory isolation by hospital / tenant
    tenant_scope = hospital_id or "global"
    target_dir = QUARANTINE_DIR / tenant_scope
    target_dir.mkdir(parents=True, exist_ok=True)

    quarantined_file_path = target_dir / f"{job_id}_{safe_name}"

    # Encrypt document at rest using authenticated AES-256-GCM envelope encryption
    # Cryptographically binds the tenant, job context, and document filename as AAD
    aad = f"{tenant_scope}:{job_id}:{safe_name}".encode("utf-8")
    encrypted_bytes = envelope_crypto.encrypt_document_bytes(content, associated_data=aad)

    # Write file securely without execute permissions
    with open(quarantined_file_path, "wb") as f:
        f.write(encrypted_bytes)

    return {
        "file_name": safe_name,
        "file_type": ext.lstrip(".").upper(),
        "file_size_bytes": file_size,
        "mime_type": mime_or_err,
        "file_hash": file_hash,
        "storage_path": str(quarantined_file_path.resolve()),
        "category": category,
        "is_encrypted": True,
    }


def read_decrypted_document_bytes(
    storage_path: str,
    job_id: Optional[str] = None,
    filename: Optional[str] = None,
    hospital_id: Optional[str] = None
) -> bytes:
    """
    Reads an encrypted document package from disk and decrypts it in-memory using
    authenticated AES-256-GCM envelope encryption. Returns raw decrypted document bytes.
    Validates AAD binding to tenant, job, and document.
    Raises DecryptionError if file authentication tag fails or data is corrupted.
    """
    src = Path(storage_path)
    if not src.exists():
        raise FileNotFoundError(f"Document file {storage_path} not found.")

    raw_bytes = src.read_bytes()
    if not envelope_crypto.is_encrypted_document(raw_bytes):
        # Legacy unencrypted file
        return raw_bytes

    tenant_scope = hospital_id or (src.parent.name if src.parent.name not in ("quarantine", "approved") else "global")

    # Priority 1: Full context AAD ({tenant}:{job_id}:{filename})
    # Priority 2: Pre-existing AAD ({job_id}:{filename})
    # Priority 3: Unbound AAD (None) for legacy encrypted files
    candidate_aads = []
    if job_id and filename:
        candidate_aads.append(f"{tenant_scope}:{job_id}:{filename}".encode("utf-8"))
        candidate_aads.append(f"{job_id}:{filename}".encode("utf-8"))
    candidate_aads.append(None)

    last_err = None
    for candidate in candidate_aads:
        try:
            return envelope_crypto.decrypt_document_bytes(raw_bytes, associated_data=candidate)
        except DecryptionError as err:
            last_err = err
            continue

    raise last_err or DecryptionError("Decryption failed: AAD authentication failed across all valid contexts.")


def promote_quarantined_file_to_approved(storage_path: str, hospital_id: Optional[str]) -> str:
    """Moves a file from quarantine to the approved storage location once confirmed."""
    src = Path(storage_path)
    if not src.exists():
        raise FileNotFoundError(f"Source file {storage_path} not found.")

    tenant_scope = hospital_id or "global"
    target_dir = APPROVED_DIR / tenant_scope
    target_dir.mkdir(parents=True, exist_ok=True)

    dest = target_dir / src.name
    # Rename/move file to approved location
    if src != dest:
        os.replace(src, dest)

    return str(dest.resolve())


def delete_quarantined_file(storage_path: str) -> bool:
    """Securely deletes a quarantined file when rejected or expired."""
    try:
        p = Path(storage_path)
        if p.exists() and p.is_file():
            p.unlink()
            return True
    except Exception as e:
        logger.error(f"Error deleting quarantined file {storage_path}: {e}")
    return False
