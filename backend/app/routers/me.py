from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.models import UserProfile, WorkspaceResponse
from backend.app.core.rbac import get_current_user_context
from backend.app.core.security import create_access_token
from backend.app.core.response import success_response
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.logging import log_security_event, logger

router = APIRouter(prefix="", tags=["User Context & Multi-Hospital Access"])

class HospitalContextSwitchRequest(BaseModel):
    hospital_id: str
    branch_id: Optional[str] = None

class HospitalMembershipItem(BaseModel):
    hospital_id: str
    hospital_ref_id: Optional[str] = None
    hospital_name: str
    hospital_code: Optional[str] = None
    hospital_city: Optional[str] = None
    branch_id: Optional[str] = None
    branch_ref_id: Optional[str] = None
    branch_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    is_current: bool = False
    is_primary: bool = False

@router.get("/me")
def get_current_me_profile(current_user: Dict[str, Any] = Depends(get_current_user_context)):
    """
    Returns authenticated user profile, resolved doctor credentials (if clinician),
    and active facility context.
    """
    user_ref_id = current_user["user_ref_id"]
    ws = sp_repository.get_user_workspace(user_ref_id=user_ref_id, hospital_ref_id=current_user.get("hospital_ref_id"))
    
    # Check if user is a doctor
    doctor_profile = None
    if current_user.get("role") == "DOCTOR":
        doctor_profile = sp_repository.get_doctor_by_user_id(user_ref_id)

    # Get authorized hospitals
    hospitals = sp_repository.list_user_hospitals(user_ref_id)
    current_hosp_id = current_user.get("hospital_ref_id") or (ws.get("hospital_ref_id") if ws else None)

    doctor_dict = None
    if doctor_profile:
        doctor_dict = {
            "id": doctor_profile.get("id"),
            "name": doctor_profile.get("name"),
            "specialty": doctor_profile.get("specialty"),
            "registration_number": doctor_profile.get("registration_number", "TN-MCI-2026-REG"),
            "qualification": doctor_profile.get("qualification")
        }

    return {
        "id": current_user["id"],
        "user_ref_id": user_ref_id,
        "username": current_user["username"],
        "name": current_user.get("name") or current_user.get("full_name"),
        "role": current_user["role"],
        "doctor": doctor_dict,
        "doctor_id": doctor_profile.get("id") if doctor_profile else None,
        "specialty": doctor_profile.get("specialty") if doctor_profile else None,
        "qualification": doctor_profile.get("qualification") if doctor_profile else None,
        "registration_number": doctor_profile.get("registration_number", "TN-MCI-2026-REG") if doctor_profile else None,
        "hospital_id": current_hosp_id,
        "hospital_ref_id": current_hosp_id,
        "hospital_name": ws.get("hospital_name") if ws else "Kedar Hospital",
        "branch_name": ws.get("branch_name") if ws else "Mugalivakkam Main",
        "authorized_hospitals": [
            {
                "hospital_id": h["hospital_ref_id"],
                "hospital_ref_id": h["hospital_ref_id"],
                "hospital_name": h["hospital_name"],
                "hospital_code": h.get("hospital_code"),
                "branch_id": h.get("branch_ref_id"),
                "branch_ref_id": h.get("branch_ref_id"),
                "branch_name": h.get("branch_name"),
                "is_current": h["hospital_ref_id"] == current_hosp_id,
                "is_primary": h.get("is_primary", False)
            }
            for h in hospitals
        ],
        "permissions": current_user.get("permissions") or []
    }

@router.get("/me/hospitals", response_model=List[HospitalMembershipItem])
def get_my_authorized_hospitals(current_user: Dict[str, Any] = Depends(get_current_user_context)):
    """
    Returns ONLY hospitals and branches the authenticated doctor/user is authorized to access.
    Multi-hospital access model: One doctor login identity -> multiple authorized facilities.
    """
    user_ref_id = current_user["user_ref_id"]
    current_hosp_id = current_user.get("hospital_ref_id")
    raw_hospitals = sp_repository.list_user_hospitals(user_ref_id)

    items = []
    for h in raw_hospitals:
        hosp_id = h.get("hospital_ref_id")
        branch_id = h.get("branch_ref_id")
        items.append(HospitalMembershipItem(
            hospital_id=hosp_id,
            hospital_ref_id=hosp_id,
            hospital_name=h.get("hospital_name", "Hospital"),
            hospital_code=h.get("hospital_code"),
            hospital_city=h.get("hospital_city"),
            branch_id=branch_id,
            branch_ref_id=branch_id,
            branch_name=h.get("branch_name"),
            department_id=h.get("department_id"),
            department_name=h.get("department_name"),
            is_current=(hosp_id == current_hosp_id),
            is_primary=bool(h.get("is_primary", False))
        ))
    return items

@router.post("/me/hospital-context")
def switch_hospital_context(
    req: HospitalContextSwitchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Switches active hospital facility context for the authenticated doctor/user.
    SECURITY REQUIREMENT:
    Backend MUST verify that the doctor is actually authorized for the target hospital.
    Do not trust client localStorage alone.
    """
    user_ref_id = current_user["user_ref_id"]
    authorized_hospitals = sp_repository.list_user_hospitals(user_ref_id)

    # Validate that user has membership for target hospital
    target_match = None
    for h in authorized_hospitals:
        if h.get("hospital_ref_id") == req.hospital_id:
            target_match = h
            break

    if not target_match:
        log_security_event(
            "UNAUTHORIZED_HOSPITAL_CONTEXT_SWITCH",
            actor_id=current_user["username"],
            resource=f"hospital:{req.hospital_id}",
            status="DENIED",
            details={"requested_hospital": req.hospital_id}
        )
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You are not authorized to access this hospital facility."
        )

    # Issue new token scoped to the verified hospital context
    role = current_user.get("role", "DOCTOR")
    usertype_ref_id = current_user.get("usertype_ref_id", "role-doctor")
    token = create_access_token({
        "sub": current_user["username"],
        "uid": user_ref_id,
        "role": role,
        "usertype_ref_id": usertype_ref_id,
        "hospital_id": req.hospital_id,
        "hospital_ref_id": req.hospital_id,
        "branch_id": req.branch_id or target_match.get("branch_ref_id")
    })

    log_security_event(
        "HOSPITAL_CONTEXT_SWITCHED",
        actor_id=current_user["username"],
        resource=f"hospital:{req.hospital_id}",
        status="SUCCESS",
        details={"hospital_name": target_match.get("hospital_name")}
    )

    # Resolve updated workspace definition
    updated_ctx = dict(current_user)
    updated_ctx["hospital_ref_id"] = req.hospital_id
    ws_row = sp_repository.get_user_workspace(user_ref_id, req.hospital_id, usertype_ref_id)

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "hospital_id": req.hospital_id,
        "hospital_ref_id": req.hospital_id,
        "active_hospital_id": req.hospital_id,
        "active_hospital_name": target_match.get("hospital_name"),
        "hospital_name": target_match.get("hospital_name"),
        "branch_name": target_match.get("branch_name"),
        "message": f"Switched to {target_match.get('hospital_name')}"
    }

