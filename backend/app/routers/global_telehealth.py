"""
OH-ID Phase 8 Router: Telehealth & Virtual Consultations
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/global/telehealth", tags=["Global - Telehealth & Virtual Consultations"])
repo = SPViewsRepository()

class ScheduleTelehealthPayload(BaseModel):
    id: Optional[str] = None
    patient_id: str
    doctor_id: Optional[str] = None
    facility_id: Optional[str] = None
    appointment_id: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    session_status: str = "SCHEDULED"
    recording_enabled: bool = False

class UpdateTelehealthPayload(BaseModel):
    session_status: Optional[str] = Field(None, description="SCHEDULED, WAITING_ROOM, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW")
    recording_url: Optional[str] = None
    consultation_notes: Optional[str] = None

@router.get("/sessions", response_model=List[Dict[str, Any]])
def list_telehealth_sessions(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    session_status: Optional[str] = Query(None)
):
    """Lists virtual telehealth sessions with doctor, patient, and facility details."""
    return repo.list_telehealth_sessions(
        patient_id=patient_id,
        doctor_id=doctor_id,
        session_status=session_status
    )

@router.get("/sessions/{session_id}", response_model=Dict[str, Any])
def get_telehealth_session(session_id: str):
    """Retrieves session status, WebRTC room links, and consultation notes."""
    session = repo.get_telehealth_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Telehealth session not found")
    return session

@router.post("/sessions/schedule", response_model=Dict[str, Any])
def schedule_telehealth_session(payload: ScheduleTelehealthPayload):
    """Schedules a new encrypted WebRTC virtual video consultation session."""
    return repo.schedule_telehealth_session(payload.model_dump())

@router.patch("/sessions/{session_id}", response_model=Dict[str, Any])
@router.post("/sessions/{session_id}/update", response_model=Dict[str, Any])
def update_telehealth_session(session_id: str, payload: UpdateTelehealthPayload):
    """Updates session status (e.g., IN_PROGRESS, COMPLETED), adds consultation notes and recording link."""
    session = repo.update_telehealth_session(
        session_id=session_id,
        session_status=payload.session_status,
        recording_url=payload.recording_url,
        consultation_notes=payload.consultation_notes
    )
    if not session:
        raise HTTPException(status_code=404, detail="Telehealth session not found")
    return session
