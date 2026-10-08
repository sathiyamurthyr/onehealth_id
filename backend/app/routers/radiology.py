from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import get_current_user_context, get_optional_user_context

router = APIRouter(prefix="/radiology", tags=["Radiology Workflow, Modalities & Imaging Reports"])

class CreateRadiologyOrderRequest(BaseModel):
    patient_id: str
    modality: str  # X-RAY, CT, MRI, ULTRASOUND, PET, MAMMOGRAPHY, etc.
    body_part: str
    clinical_indication: str
    priority: Optional[str] = "ROUTINE"
    visit_id: Optional[str] = None
    admission_id: Optional[str] = None

class ScheduleRadiologyOrderRequest(BaseModel):
    scheduled_at: str
    technician_id: Optional[str] = None

class PerformRadiologyStudyRequest(BaseModel):
    dicom_study_uid: Optional[str] = None
    pacs_series_url: Optional[str] = None

class CreateRadiologyReportRequest(BaseModel):
    order_id: str
    patient_id: str
    modality: str
    body_part: str
    findings: str
    impression: str
    recommendations: Optional[str] = None
    dicom_study_uid: Optional[str] = None
    pacs_series_url: Optional[str] = None
    status: Optional[str] = "FINALIZED"

@router.get("/orders")
def list_radiology_orders(
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists diagnostic imaging orders across modalities."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else None)
    return sp_repository.list_radiology_orders(
        hospital_id=h_id,
        status=status,
        patient_id=patient_id,
        limit=limit,
        offset=offset
    )

@router.post("/orders")
def create_radiology_order(
    payload: CreateRadiologyOrderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Creates a structured imaging order."""
    doctor_id = current_user.get("user_ref_id") or current_user.get("id") or "doc-general"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        order = sp_repository.create_radiology_order(
            patient_id=payload.patient_id,
            hospital_id=hospital_id,
            ordering_doctor_id=doctor_id,
            modality=payload.modality,
            body_part=payload.body_part,
            clinical_indication=payload.clinical_indication,
            priority=payload.priority or "ROUTINE",
            visit_id=payload.visit_id,
            admission_id=payload.admission_id
        )
        return {"status": "SUCCESS", "message": "Radiology order created successfully", "data": order}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/orders/{order_id}/schedule")
def schedule_radiology_order(
    order_id: str,
    payload: ScheduleRadiologyOrderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Schedules an imaging procedure."""
    technician_id = payload.technician_id or current_user.get("user_ref_id") or current_user.get("id")
    try:
        updated = sp_repository.schedule_radiology_order(
            order_id=order_id,
            scheduled_at=payload.scheduled_at,
            technician_id=technician_id
        )
        return {"status": "SUCCESS", "message": "Imaging order scheduled", "data": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/orders/{order_id}/perform")
def perform_radiology_study(
    order_id: str,
    payload: PerformRadiologyStudyRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Marks imaging study as completed by radiology technician with DICOM study metadata."""
    performed_by = current_user.get("user_ref_id") or current_user.get("id") or "usr-radtech"
    try:
        updated = sp_repository.perform_radiology_study(
            order_id=order_id,
            performed_by=performed_by,
            dicom_study_uid=payload.dicom_study_uid,
            pacs_series_url=payload.pacs_series_url
        )
        return {"status": "SUCCESS", "message": "Radiology procedure completed", "data": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/reports")
def create_radiology_report(
    payload: CreateRadiologyReportRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Radiologist signs off on definitive diagnostic imaging impression."""
    radiologist_id = current_user.get("user_ref_id") or current_user.get("id") or "doc-radiologist"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        report = sp_repository.create_radiology_report(
            order_id=payload.order_id,
            patient_id=payload.patient_id,
            hospital_id=hospital_id,
            radiologist_id=radiologist_id,
            modality=payload.modality,
            body_part=payload.body_part,
            findings=payload.findings,
            impression=payload.impression,
            status=payload.status or "FINALIZED",
            dicom_study_uid=payload.dicom_study_uid,
            pacs_series_url=payload.pacs_series_url,
            recommendations=payload.recommendations
        )
        return {"status": "SUCCESS", "message": "Radiology report finalized successfully", "data": report}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports")
def list_radiology_reports(
    hospital_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists diagnostic imaging reports."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else None)
    return sp_repository.list_radiology_reports(
        hospital_id=h_id,
        patient_id=patient_id,
        order_id=order_id,
        limit=limit,
        offset=offset
    )
