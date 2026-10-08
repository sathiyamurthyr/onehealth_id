from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import get_current_user_context, get_optional_user_context

router = APIRouter(prefix="/lab", tags=["Laboratory Workflow, Accessions & Structured Analytes"])

class CollectSampleRequest(BaseModel):
    order_id: str
    patient_id: str
    sample_type: str
    accession_number: Optional[str] = None
    notes: Optional[str] = None

class UpdateSampleStatusRequest(BaseModel):
    status: str
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None

class AnalyteResultPayload(BaseModel):
    analyte_name: str
    value: str
    unit: str
    reference_range: Optional[str] = None
    abnormal_flag: bool = False
    critical_flag: bool = False
    comments: Optional[str] = None

class RecordLabResultsRequest(BaseModel):
    investigation_id: str
    patient_id: str
    sample_id: Optional[str] = None
    analytes: List[AnalyteResultPayload] = Field(..., min_length=1)
    method: Optional[str] = "Automated Photometry / Spectrometry"
    is_verified: bool = False

class VerifyLabResultRequest(BaseModel):
    notes: Optional[str] = None

@router.get("/samples")
def list_lab_samples(
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists laboratory specimen accessions and sample queue."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else None)
    return sp_repository.list_lab_samples(
        hospital_id=h_id,
        status=status,
        order_id=order_id,
        patient_id=patient_id,
        limit=limit,
        offset=offset
    )

@router.post("/samples/collect")
def collect_lab_sample(
    payload: CollectSampleRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Registers specimen collection for an investigation order."""
    collector_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-phlebotomist"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        sample = sp_repository.collect_lab_sample(
            order_id=payload.order_id,
            patient_id=payload.patient_id,
            hospital_id=hospital_id,
            sample_type=payload.sample_type,
            collected_by=collector_id,
            accession_number=payload.accession_number,
            notes=payload.notes
        )
        return {"status": "SUCCESS", "message": "Specimen collected successfully", "data": sample}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/samples/{sample_id}/status")
def update_lab_sample_status(
    sample_id: str,
    payload: UpdateSampleStatusRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Updates sample accession processing state."""
    try:
        updated = sp_repository.update_lab_sample_status(
            sample_id=sample_id,
            status=payload.status,
            rejection_reason=payload.rejection_reason,
            notes=payload.notes
        )
        return {"status": "SUCCESS", "message": "Sample status updated", "data": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/results")
def record_lab_results(
    payload: RecordLabResultsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Enters structured lab test analytes."""
    technician_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-labtech"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        result = sp_repository.record_lab_results(
            investigation_id=payload.investigation_id,
            patient_id=payload.patient_id,
            hospital_id=hospital_id,
            technician_id=technician_id,
            analytes=[a.model_dump() for a in payload.analytes],
            sample_id=payload.sample_id,
            method=payload.method,
            is_verified=payload.is_verified,
            pathologist_id=technician_id if payload.is_verified else None
        )
        return {"status": "SUCCESS", "message": "Lab analytes recorded successfully", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/results/{result_id}/verify")
def verify_lab_result(
    result_id: str,
    payload: VerifyLabResultRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Pathologist verification and sign-off on lab report."""
    pathologist_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-pathologist"
    try:
        verified = sp_repository.verify_lab_result(
            result_id=result_id,
            pathologist_id=pathologist_id,
            notes=payload.notes
        )
        return {"status": "SUCCESS", "message": "Lab report verified and finalized", "data": verified}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/results/{investigation_id}")
def get_lab_order_results(
    investigation_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Retrieves structured result history for an investigation order."""
    return sp_repository.get_lab_order_results(investigation_id)
