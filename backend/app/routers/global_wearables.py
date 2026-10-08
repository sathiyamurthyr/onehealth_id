"""
OH-ID Phase 8 Router: Remote Patient Monitoring (RPM) & Wearables
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/global/wearables", tags=["Global - Wearables & Remote Patient Monitoring"])
repo = SPViewsRepository()

class WearableObservationPayload(BaseModel):
    id: Optional[str] = None
    patient_id: str
    device_vendor: str = Field("APPLE_HEALTHKIT", description="APPLE_HEALTHKIT, GOOGLE_FIT, FITBIT, GARMIN, WHOOP, WITHINGS, CONTINUOUS_GLUCOSE_MONITOR")
    device_model: str = "SmartHealth Sensor"
    metric_type: str = Field(..., description="HEART_RATE, SPO2, BLOOD_GLUCOSE, SYSTOLIC_BP, DIASTOLIC_BP, BODY_TEMPERATURE, SLEEP_HOURS, STEPS")
    metric_value: float
    unit: str = "bpm"
    is_abnormal: bool = False
    critical_alert: bool = False
    raw_payload: Optional[Dict[str, Any]] = None
    recorded_at: Optional[datetime] = None

@router.post("/observations/ingest", response_model=Dict[str, Any])
def ingest_wearable_observation(payload: WearableObservationPayload):
    """Ingests real-time biometric readings from connected IoT wearable devices and health apps."""
    return repo.ingest_wearable_observation(payload.model_dump())

@router.get("/observations/{patient_id}", response_model=List[Dict[str, Any]])
def list_wearable_observations(
    patient_id: str,
    metric_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
):
    """Lists granular biometric time-series observations for a specific patient."""
    return repo.list_wearable_observations(patient_id=patient_id, metric_type=metric_type, limit=limit)

@router.get("/streams", response_model=List[Dict[str, Any]])
def get_wearable_patient_stream(patient_id: Optional[str] = Query(None)):
    """Retrieves live RPM telemetry aggregates, abnormal detection alerts, and active device feeds."""
    return repo.get_wearable_patient_stream(patient_id=patient_id)
