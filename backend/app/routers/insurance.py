"""
OH-ID Phase 5: Hospital Insurance, Payers, Preauthorizations & Claims Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    require_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/hospital/insurance", tags=["Hospital Insurance & Claims"])

# =========================================================================
# SCHEMAS
# =========================================================================

class PayerCreateRequest(BaseModel):
    hospital_id: str
    name: str
    payer_code: str
    payer_type: str = "INSURANCE"  # SELF_PAY, INSURANCE, CORPORATE, GOVERNMENT_SCHEME, TPA
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    settlement_period_days: int = 30

class PolicyCreateRequest(BaseModel):
    patient_id: str
    payer_id: str
    policy_number: str
    member_id: str
    group_number: Optional[str] = None
    policy_holder_name: Optional[str] = None
    relationship: str = "SELF"
    coverage_limit: float = 500000.00
    copay_percentage: float = 0.00
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None

class PreauthCreateRequest(BaseModel):
    hospital_id: str
    patient_id: str
    payer_id: Optional[str] = None
    policy_id: Optional[str] = None
    service_id: Optional[str] = None
    diagnosis_code: Optional[str] = None
    clinical_justification: str
    requested_amount: float
    external_preauth_ref: Optional[str] = None

class PreauthDecisionRequest(BaseModel):
    status: str = "APPROVED"  # APPROVED, PARTIALLY_APPROVED, REJECTED, EXPIRED
    approved_amount: float = 0.00
    denial_reason: Optional[str] = None

class ClaimCreateRequest(BaseModel):
    hospital_id: str
    patient_id: str
    payer_id: Optional[str] = None
    policy_id: Optional[str] = None
    preauth_id: Optional[str] = None
    invoice_id: Optional[str] = None
    encounter_id: Optional[str] = None
    admission_id: Optional[str] = None
    claimed_amount: float
    external_claim_ref: Optional[str] = None
    items: List[Dict[str, Any]] = []

class ClaimAdjudicationRequest(BaseModel):
    status: str = "SETTLED"  # APPROVED, PARTIALLY_APPROVED, REJECTED, SETTLED, APPEALED
    approved_amount: float = 0.00
    settled_amount: float = 0.00
    patient_copay_amount: float = 0.00
    rejection_reason: Optional[str] = None

# =========================================================================
# 1. PAYERS
# =========================================================================

@router.get("/payers")
def list_payers(
    hospital_id: Optional[str] = Query(None),
    payer_type: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage", "doctor.workspace"))
):
    """Lists registered insurance companies, TPAs, and corporate payers."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_payers(hospital_id=target_hosp, payer_type=payer_type)

@router.post("/payers")
def create_payer(
    payload: PayerCreateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Registers a new payer or insurance provider."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    try:
        res = sp_repository.create_payer(payload.model_dump())
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to create payer: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 2. PATIENT POLICIES
# =========================================================================

@router.get("/policies")
def list_patient_policies(
    patient_id: str = Query(...),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage", "patient.self.read", "doctor.workspace"))
):
    """Lists active insurance policies for a patient."""
    user_perms = user.get("permissions", [])
    if "patient.self.read" in user_perms and "billing.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        if patient_id != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot view other patients' policies")

    return sp_repository.list_patient_insurance_policies(patient_id)

@router.post("/policies")
def create_patient_policy(
    payload: PolicyCreateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.create", "billing.manage", "system.manage", "patient.self.manage"))
):
    """Links an insurance policy to a patient."""
    try:
        res = sp_repository.create_patient_insurance_policy(payload.model_dump())
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to link insurance policy: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 3. PREAUTHORIZATIONS
# =========================================================================

@router.get("/preauthorizations")
def list_preauthorizations(
    hospital_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage", "doctor.workspace"))
):
    """Lists insurance treatment preauthorization requests."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_preauthorizations(hospital_id=target_hosp, patient_id=patient_id, status=status)

@router.post("/preauthorizations")
def create_preauthorization(
    payload: PreauthCreateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.create", "billing.manage", "system.manage", "doctor.workspace"))
):
    """Submits a treatment preauthorization request to an insurance payer."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    try:
        res = sp_repository.create_preauthorization(payload.model_dump())
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to create preauthorization: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/preauthorizations/{preauth_id}/decision")
def update_preauthorization_decision(
    preauth_id: str,
    payload: PreauthDecisionRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Records payer preauthorization decision (Approved / Rejected / Partial)."""
    try:
        res = sp_repository.update_preauthorization_decision(
            preauth_id=preauth_id,
            status=payload.status,
            approved_amount=Decimal(str(payload.approved_amount)),
            denial_reason=payload.denial_reason
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to update preauthorization: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 4. CLAIMS
# =========================================================================

@router.get("/claims")
def list_claims(
    hospital_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage"))
):
    """Lists insurance claims and adjudication statuses."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_insurance_claims(hospital_id=target_hosp, patient_id=patient_id, status=status)

@router.post("/claims")
def create_claim(
    payload: ClaimCreateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.create", "billing.manage", "system.manage"))
):
    """Creates and submits an insurance claim."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    try:
        res = sp_repository.create_insurance_claim(payload.model_dump())
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to create claim: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/claims/{claim_id}/adjudicate")
def adjudicate_claim(
    claim_id: str,
    payload: ClaimAdjudicationRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Adjudicates and settles an insurance claim."""
    try:
        res = sp_repository.adjudicate_insurance_claim(
            claim_id=claim_id,
            status=payload.status,
            approved_amount=Decimal(str(payload.approved_amount)),
            settled_amount=Decimal(str(payload.settled_amount)),
            patient_copay_amount=Decimal(str(payload.patient_copay_amount)),
            rejection_reason=payload.rejection_reason
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to adjudicate claim: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
