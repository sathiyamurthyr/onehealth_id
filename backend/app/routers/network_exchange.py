"""
OH-ID Phase 7 Router: Cross-Provider Health Record Exchange & Provenance
Sathus Technology Pvt Ltd
"""

import hashlib
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network/exchange", tags=["Network - Health Record Exchange"])
repo = SPViewsRepository()

class RecordExchangeRequest(BaseModel):
    patient_id: str
    requester_provider_id: str
    requester_user_id: str
    record_type: str = Field("ALL_RECORDS", description="ALL_RECORDS, CONSULTATION, PRESCRIPTION, LAB_REPORT, RADIOLOGY, DISCHARGE")
    record_id: Optional[str] = None
    source_provider_id: Optional[str] = None
    provenance_hash: Optional[str] = None
    purpose: str = "CARE_TREATMENT"
    is_emergency_break_glass: bool = False
    is_break_glass: Optional[bool] = None

@router.post("/patient-records", response_model=Dict[str, Any])
@router.post("/record", response_model=Dict[str, Any])
def exchange_patient_records(payload: RecordExchangeRequest):
    """
    Exchanges authorized patient health records across network providers.
    Enforces consent validation, provenance logging, and returns verified records.
    """
    is_break_glass = payload.is_emergency_break_glass or (payload.is_break_glass or False)
    consent_id = None
    if not is_break_glass:
        auth_check = repo.verify_network_consent_access(
            patient_id=payload.patient_id,
            requester_provider_id=payload.requester_provider_id,
            record_type=payload.record_type,
            purpose=payload.purpose
        )
        if not auth_check.get("is_authorized"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: {auth_check.get('reason')}"
            )
        consent_id = auth_check.get("consent_id")

    # Fetch authorized timeline events
    timeline = repo.get_network_unified_patient_timeline(payload.patient_id)
    filtered_events = [e for e in timeline if payload.record_type == "ALL_RECORDS" or e.get("event_type") == payload.record_type or payload.record_type == "CONSULTATION"]

    # Compute Provenance Hash if not provided
    prov_hash = payload.provenance_hash
    if not prov_hash:
        provenance_content = f"{payload.patient_id}:{payload.requester_provider_id}:{len(filtered_events)}"
        prov_hash = f"sha256:{hashlib.sha256(provenance_content.encode('utf-8')).hexdigest()}"

    # Log exchange audit
    src_prov = payload.source_provider_id or (filtered_events[0].get("provider_id", "hosp-kedar") if filtered_events else "hosp-kedar")
    rec_id = payload.record_id or (filtered_events[0].get("event_id", "REC-001") if filtered_events else "REC-NONE")
    
    logged = repo.log_network_record_exchange(
        consent_id=consent_id,
        patient_id=payload.patient_id,
        source_provider_id=src_prov,
        requester_provider_id=payload.requester_provider_id,
        requester_user_id=payload.requester_user_id,
        record_type=payload.record_type,
        record_id=rec_id,
        provenance_hash=prov_hash,
        purpose=payload.purpose,
        is_break_glass=is_break_glass
    )

    return {
        "status": "EXCHANGED",
        "id": logged.get("id"),
        "patient_id": payload.patient_id,
        "record_type": payload.record_type,
        "record_id": rec_id,
        "records_count": len(filtered_events),
        "records": filtered_events,
        "provenance_hash": prov_hash,
        "consent_id": consent_id,
        "is_break_glass": is_break_glass
    }

@router.get("/patient/{patient_id}/timeline", response_model=List[Dict[str, Any]])
@router.get("/unified-timeline/{patient_id}", response_model=List[Dict[str, Any]])
def get_unified_patient_timeline(patient_id: str):
    """Retrieves the full multi-provider longitudinal health timeline for a patient."""
    return repo.get_network_unified_patient_timeline(patient_id)

@router.get("/patient/{patient_id}/audit", response_model=List[Dict[str, Any]])
@router.get("/audit/{patient_id}", response_model=List[Dict[str, Any]])
def get_exchange_audit_history(patient_id: str):
    """Audits every cross-provider record exchange transaction."""
    return repo.get_patient_network_access_history(patient_id)
