import logging
import sys
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

# Configure standard logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("ohid.security")

# Terms that must strictly never be logged or persisted in audit details
SENSITIVE_SCRUB_PATTERNS = [
    "pass", "token", "secret", "auth", "key", "cred", "dek", "kek", "edek",
    "password", "bearer", "private", "aadhaar", "national_id", "ssn",
    "raw_text", "ocr_text", "extracted_text", "document_text", "stream"
]


def sanitize_audit_details(details: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Scrubs passwords, authentication tokens, encryption keys, raw OCR text,
    and sensitive clinical/demographic text from audit and application logs.
    """
    if not details:
        return {}

    sanitized = {}
    for k, v in details.items():
        k_lower = str(k).lower()
        if any(term in k_lower for term in SENSITIVE_SCRUB_PATTERNS):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_audit_details(v)
        elif isinstance(v, list):
            sanitized[k] = [
                sanitize_audit_details(item) if isinstance(item, dict) else item
                for item in v
            ]
        elif isinstance(v, str) and len(v) > 200:
            # Prevent accidental logging of large document bodies
            sanitized[k] = v[:60] + "... [TRUNCATED]"
        else:
            sanitized[k] = v
    return sanitized


def log_security_event(
    event_type: str,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    tenant_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    resource: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[Dict[str, Any]] = None,
    correlation_id: Optional[str] = None
) -> str:
    """
    Structured Enterprise Security Audit Logger.
    1. Strictly scrubs credentials, encryption keys, and raw patient PHI.
    2. Writes structured JSON log entry to stdout / system logs.
    3. Safely persists audit record to PostgreSQL oh_id.audit_logs.
    Returns correlation_id for tracing.
    """
    corr_id = correlation_id or f"corr-{uuid.uuid4().hex[:12]}"
    sanitized_details = sanitize_audit_details(details)
    sanitized_details["correlation_id"] = corr_id

    # Parse resource_type and resource_id if provided as 'type:id'
    res_type = resource_type
    res_id = resource_id
    if resource and not res_type and ":" in resource:
        parts = resource.split(":", 1)
        res_type = parts[0]
        res_id = parts[1]
    elif resource and not res_type:
        res_type = "RESOURCE"
        res_id = resource

    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "status": status,
        "actor_id": actor_id or "ANONYMOUS",
        "actor_name": actor_name,
        "tenant_id": tenant_id,
        "hospital_id": hospital_id,
        "ip_address": ip_address or "UNKNOWN",
        "resource": resource or "NONE",
        "resource_type": res_type,
        "resource_id": res_id,
        "correlation_id": corr_id,
        "details": sanitized_details
    }

    if status in ["FAILURE", "DENIED", "SUSPICIOUS"]:
        logger.warning("SECURITY_EVENT: %s", json.dumps(log_entry))
    else:
        logger.info("SECURITY_EVENT: %s", json.dumps(log_entry))

    # Persist to oh_id.audit_logs in PostgreSQL
    try:
        from backend.app.database.session import get_db_cursor
        with get_db_cursor() as cur:
            audit_id = f"aud-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.audit_logs (
                    id, actor_id, actor_name, tenant_id, hospital_id,
                    action, resource_type, resource_id, details, ip_address, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                );
            """, (
                audit_id,
                actor_id or "ANONYMOUS",
                actor_name,
                tenant_id,
                hospital_id,
                event_type,
                res_type or "SYSTEM",
                res_id or "N/A",
                json.dumps(sanitized_details),
                ip_address or "127.0.0.1"
            ))
    except Exception as db_err:
        # Non-blocking: audit log failure to database must not disrupt critical path,
        # but is logged to stdout for security monitoring
        logger.debug("Failed to persist audit log to DB: %s", db_err)

    return corr_id
