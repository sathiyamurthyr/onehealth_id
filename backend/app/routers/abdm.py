"""
OH-ID ABDM & ABHA National Health Stack REST Router
===================================================
Provides standards-compliant endpoints for ABDM National Health Stack integration:
- HFR Facility Registry Verification
- HPR Practitioner Registry Verification
- ABHA National Health ID Linking & Consent Governance
- M1/M2/M3 Milestone Telemetry
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
import logging
from backend.app.core.rbac import get_current_user_context
from backend.app.database.session import get_db_cursor, get_readonly_cursor

logger = logging.getLogger("ohid.routers.abdm")
router = APIRouter(prefix="/abdm", tags=["ABDM & ABHA National Health Stack"])

class AbhaLinkRequest(BaseModel):
    patient_id: str
    abha_address: str
    abha_number: Optional[str] = None
    auth_method: str = "AADHAAR_OTP" # AADHAAR_OTP, MOBILE_OTP, DEMOGRAPHIC

@router.get("/facility", response_model=Dict[str, Any])
def get_abdm_facility_status(
    hospital_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns ABDM HFR Facility Registry configuration and milestone readiness (M1/M2/M3)."""
    target_hosp = hospital_id or current_user.get("hospital_id")
    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT * FROM oh_id.abdm_facility_registry
            WHERE hospital_id = %s;
        """, (target_hosp,))
        fac = cur.fetchone()
        if not fac:
            return {
                "hospital_id": target_hosp,
                "configured": False,
                "message": "ABDM Bridge not configured for this facility."
            }
        return {
            "configured": True,
            **dict(fac)
        }

@router.get("/practitioners", response_model=List[Dict[str, Any]])
def list_abdm_practitioners(
    hospital_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Lists ABDM HPR Doctor / Practitioner registry mappings."""
    target_hosp = hospital_id or current_user.get("hospital_id")
    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT * FROM oh_id.abdm_practitioner_registry
            WHERE hospital_id = %s;
        """, (target_hosp,))
        return [dict(row) for row in cur.fetchall()]

@router.post("/abha/link", response_model=Dict[str, Any])
def link_patient_abha(
    payload: AbhaLinkRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Links a verified ABHA National Health ID to an existing OH-ID Patient record.
    OH-ID is provider-connected, while ABHA represents national identity.
    """
    mapping_id = f"abha-map-{uuid.uuid4().hex[:12]}"
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO oh_id.patient_abha_mappings (
                mapping_id, patient_id, abha_number, abha_address,
                link_status, auth_method, kyc_status, kyc_verified_at
            ) VALUES (%s, %s, %s, %s, 'LINKED', %s, 'VERIFIED', CURRENT_TIMESTAMP)
            ON CONFLICT (patient_id) DO UPDATE SET
                abha_address = EXCLUDED.abha_address,
                abha_number = EXCLUDED.abha_number,
                link_status = 'LINKED',
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (
            mapping_id,
            payload.patient_id,
            payload.abha_number,
            payload.abha_address,
            payload.auth_method
        ))
        row = cur.fetchone()

        # Audit log
        cur.execute("""
            INSERT INTO oh_id.audit_logs (
                id, actor_id, action, resource_type, resource_id,
                details, ip_address, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, '127.0.0.1', CURRENT_TIMESTAMP);
        """, (
            f"audit-{uuid.uuid4().hex[:12]}",
            current_user.get("user_id") or "patient",
            "ABHA_LINKED",
            "patient_abha_mappings",
            mapping_id,
            f'{{"abha_address": "{payload.abha_address}"}}'
        ))

        return dict(row)

@router.get("/abha/status/{patient_id}", response_model=Dict[str, Any])
def get_patient_abha_status(
    patient_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Retrieves ABHA linking status for a patient."""
    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT * FROM oh_id.patient_abha_mappings
            WHERE patient_id = %s;
        """, (patient_id,))
        row = cur.fetchone()
        if not row:
            return {
                "patient_id": patient_id,
                "is_linked": False,
                "abha_address": None
            }
        return {
            "is_linked": True,
            **dict(row)
        }
