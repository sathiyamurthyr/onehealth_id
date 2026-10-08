"""
OH-ID Phase 7 Router: Emergency Break-Glass Access Protocol
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network/emergency", tags=["Network - Emergency Break-Glass"])
repo = SPViewsRepository()

class EmergencyBreakGlassRequest(BaseModel):
    patient_id: str
    provider_id: str
    clinician_id: str
    clinician_name: str
    reason: str = Field(..., description="Explicit clinical justification for overriding consent in life-threatening emergency")
    triage_level: str = Field("EMERGENT", description="RESUSCITATION, EMERGENT, URGENT")
    accessed_records: Optional[List[str]] = None

@router.post("/break-glass", response_model=Dict[str, Any])
def execute_emergency_break_glass(payload: EmergencyBreakGlassRequest):
    """
    Executes a reason-based emergency break-glass protocol.
    Grants temporary minimum-necessary access to life-saving clinical summaries
    and records an immutable security audit event.
    """
    log_entry = repo.record_emergency_break_glass_access(
        patient_id=payload.patient_id,
        provider_id=payload.provider_id,
        clinician_id=payload.clinician_id,
        clinician_name=payload.clinician_name,
        reason=payload.reason,
        triage_level=payload.triage_level,
        accessed_records=payload.accessed_records
    )

    # Fetch critical health timeline
    timeline = repo.get_network_unified_patient_timeline(payload.patient_id)
    critical_events = [e for e in timeline if e.get("event_type") in ("CONSULTATION", "PRESCRIPTION", "LAB_REPORT", "EMERGENCY")]

    return {
        "status": "BREAK_GLASS_GRANTED",
        "emergency_log_id": log_entry["id"],
        "authorized_window_minutes": log_entry.get("authorized_window_minutes", 120),
        "patient_id": payload.patient_id,
        "records_count": len(critical_events),
        "critical_records": critical_events,
        "patient_notified": True,
        "audit_warning": "This session has been logged and audited under Emergency Medical Compliance."
    }

@router.get("/break-glass-logs", response_model=List[Dict[str, Any]])
@router.get("/logs", response_model=List[Dict[str, Any]])
def list_emergency_logs(
    provider_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None)
):
    """Audits emergency break-glass override events for compliance review."""
    return repo.list_emergency_break_glass_logs(provider_id=provider_id, patient_id=patient_id)
