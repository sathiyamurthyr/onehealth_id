from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.app.core.rbac import get_current_user_context
from backend.app.core.response import success_response
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.logging import log_security_event, logger

router = APIRouter(prefix="", tags=["OH-ID Family Healthcare Workspace"])

# --------------------------------------------------------------------------
# SCHEMAS
# --------------------------------------------------------------------------

class CheckExistingPersonRequest(BaseModel):
    identifier: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    dob: Optional[str] = None

class NewMemberProfile(BaseModel):
    name: str
    age: int
    dob: Optional[str] = None
    gender: Optional[str] = "Unspecified"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Chennai"
    state: Optional[str] = "Tamil Nadu"
    blood_group: Optional[str] = "O+ Positive"
    emergency_contact: Optional[str] = None
    diagnosis: Optional[str] = "General Health Assessment"
    hospital_id: Optional[str] = "hosp-001"

class AddFamilyMemberRequest(BaseModel):
    relationship: str  # SPOUSE, SON, DAUGHTER, FATHER, MOTHER, BROTHER, SISTER, GRANDFATHER, GRANDMOTHER, GRANDCHILD, LEGAL_GUARDIAN, DEPENDENT, OTHER
    is_guardian: bool = False
    is_minor: bool = False
    member_patient_id: Optional[str] = None
    new_member: Optional[NewMemberProfile] = None
    permissions: Optional[Dict[str, bool]] = None
    notes: Optional[str] = None

class UpdatePermissionsRequest(BaseModel):
    permissions: Dict[str, bool]
    consent_status: Optional[str] = None

# Helper to resolve authenticated patient record
def _resolve_authenticated_patient(current_user: Dict[str, Any]) -> Dict[str, Any]:
    user_ref_id = current_user["user_ref_id"]
    email = current_user.get("email")
    patient = sp_repository.get_patient_by_user_ref(user_ref_id, email)
    if not patient:
        if current_user.get("username") == "patient":
            patient = sp_repository.get_patient_by_id("p-101")
        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not linked to authenticated user."
            )
    return patient

# --------------------------------------------------------------------------
# 1. FAMILY MEMBERS LIST & OVERVIEW
# --------------------------------------------------------------------------

@router.get("/me/family")
def list_my_family_members(current_user: Dict[str, Any] = Depends(get_current_user_context)):
    """
    Returns list of linked family members with relationships, distinct OneHealth IDs,
    permissions matrix, and summary metrics.
    """
    patient = _resolve_authenticated_patient(current_user)
    members = sp_repository.list_family_members(patient["id"])
    return success_response(data=members)

@router.get("/me/family/overview")
def get_my_family_overview(current_user: Dict[str, Any] = Depends(get_current_user_context)):
    """
    Returns family aggregate overview:
    - Primary patient profile
    - Linked family members
    - Upcoming appointments across family members with distinct patient badges (WITHOUT mixing clinical histories).
    """
    patient = _resolve_authenticated_patient(current_user)
    overview = sp_repository.get_family_overview(patient["id"])
    return success_response(data=overview)

# --------------------------------------------------------------------------
# 2. DUPLICATE CHECK & IDENTITY VERIFICATION
# --------------------------------------------------------------------------

@router.post("/me/family/check-existing")
def check_existing_patient_identity(
    req: CheckExistingPersonRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Duplicate Patient Prevention:
    Checks if a person already possesses an OH-ID by phone, email, OH-ID, or name+DOB.
    Returns masked preview so the primary account holder can link the existing identity.
    """
    matches = sp_repository.check_existing_person(
        identifier=req.identifier,
        phone=req.phone,
        email=req.email,
        name=req.name,
        dob=req.dob
    )
    return success_response(
        data={
            "found": len(matches) > 0,
            "matches_count": len(matches),
            "candidates": matches
        },
        message=f"Found {len(matches)} matching person record(s)." if matches else "No existing OH-ID record found."
    )

# --------------------------------------------------------------------------
# 3. ADD FAMILY MEMBER (LINK EXISTING OR REGISTER NEW OH-ID)
# --------------------------------------------------------------------------

@router.post("/me/family/add")
def add_family_member_profile(
    req: AddFamilyMemberRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Adds a family relationship:
    1. If `member_patient_id` provided: Links existing person with confirmed consent.
    2. If `new_member` provided: Registers a new human person with a unique OneHealth ID and Zero-Knowledge QR.
    """
    patient = _resolve_authenticated_patient(current_user)

    # Validate inputs
    if not req.member_patient_id and not req.new_member:
        raise HTTPException(
            status_code=400,
            detail="Either an existing member_patient_id or new_member profile details must be provided."
        )

    # Cannot link self to self as family member
    if req.member_patient_id == patient["id"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot add your own primary profile as a family member."
        )

    new_member_dict = req.new_member.model_dump() if req.new_member else None

    # Minor check if age < 18
    is_minor = req.is_minor
    if new_member_dict and new_member_dict.get("age", 25) < 18:
        is_minor = True

    try:
        relationship = sp_repository.add_family_member(
            primary_patient_id=patient["id"],
            relationship=req.relationship,
            is_guardian=req.is_guardian or is_minor,
            is_minor=is_minor,
            permissions=req.permissions,
            member_patient_id=req.member_patient_id,
            new_member_data=new_member_dict,
            notes=req.notes
        )
    except Exception as e:
        logger.error(f"Failed to add family member: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    log_security_event(
        "FAMILY_MEMBER_LINKED",
        actor_id=current_user["username"],
        resource=f"patient:{relationship.get('member_patient_id')}",
        status="SUCCESS",
        details={
            "relationship": req.relationship,
            "is_guardian": req.is_guardian or is_minor,
            "member_ohid": relationship.get("member_onehealth_id")
        }
    )

    return success_response(
        data=relationship,
        message=f"Successfully added {relationship.get('member_name')} ({relationship.get('relationship')}) with OH-ID {relationship.get('member_onehealth_id')}."
    )

# --------------------------------------------------------------------------
# 4. UPDATE PERMISSIONS & CONSENT
# --------------------------------------------------------------------------

@router.put("/me/family/{relationship_id}/permissions")
def update_family_relationship_permissions(
    relationship_id: str,
    req: UpdatePermissionsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Updates granular access permissions and consent status for a family relationship.
    """
    patient = _resolve_authenticated_patient(current_user)
    updated = sp_repository.update_family_permissions(
        primary_patient_id=patient["id"],
        relationship_id=relationship_id,
        permissions=req.permissions,
        consent_status=req.consent_status
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Family relationship record not found.")

    log_security_event(
        "FAMILY_PERMISSIONS_UPDATED",
        actor_id=current_user["username"],
        resource=f"relationship:{relationship_id}",
        status="SUCCESS",
        details={"permissions": req.permissions, "consent_status": req.consent_status}
    )

    return success_response(data=updated, message="Family permissions and consent updated.")

# --------------------------------------------------------------------------
# 5. UNLINK / REMOVE FAMILY MEMBER
# --------------------------------------------------------------------------

@router.delete("/me/family/{relationship_id}")
def remove_family_relationship(
    relationship_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Unlinks a family relationship.
    CRITICAL: Does NOT delete the family member's person profile or healthcare records.
    """
    patient = _resolve_authenticated_patient(current_user)
    rel = sp_repository.get_family_relationship_by_id(patient["id"], relationship_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Family relationship record not found.")

    deleted = sp_repository.remove_family_member(patient["id"], relationship_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Failed to unlink family member.")

    log_security_event(
        "FAMILY_MEMBER_UNLINKED",
        actor_id=current_user["username"],
        resource=f"relationship:{relationship_id}",
        status="SUCCESS",
        details={"member_patient_id": rel.get("member_patient_id")}
    )

    return success_response(
        message=f"Family relationship for {rel.get('member_name')} successfully unlinked. Their independent OneHealth ID ({rel.get('member_onehealth_id')}) and medical history remain securely preserved."
    )

# --------------------------------------------------------------------------
# 6. AUDIT LOG TRAIL
# --------------------------------------------------------------------------

@router.get("/me/family/audit-logs")
def get_family_access_audit_trail(
    limit: int = Query(50),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns complete chronological audit trail of who accessed whose health records,
    timestamp, relationship basis, and action.
    """
    patient = _resolve_authenticated_patient(current_user)
    logs = sp_repository.list_family_audit_logs(patient["id"], limit=limit)
    return success_response(data=logs)
