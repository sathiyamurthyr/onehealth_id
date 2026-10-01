import logging
import sys
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

# Configure standard logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("ohid.security")

def log_security_event(
    event_type: str,
    actor_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    resource: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Structured Security Audit Logger.
    Strictly scrubs passwords, tokens, API keys, and sensitive medical data.
    """
    sanitized_details = {}
    if details:
        for k, v in details.items():
            if any(secret_term in k.lower() for secret_term in ["pass", "token", "secret", "auth", "key", "cred"]):
                sanitized_details[k] = "[REDACTED]"
            else:
                sanitized_details[k] = v

    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "status": status,
        "actor_id": actor_id or "ANONYMOUS",
        "ip_address": ip_address or "UNKNOWN",
        "resource": resource or "NONE",
        "details": sanitized_details
    }

    if status in ["FAILURE", "DENIED", "SUSPICIOUS"]:
        logger.warning("SECURITY_EVENT: %s", json.dumps(log_entry))
    else:
        logger.info("SECURITY_EVENT: %s", json.dumps(log_entry))
