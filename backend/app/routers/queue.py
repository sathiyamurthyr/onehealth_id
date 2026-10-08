from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from backend.app.schemas.models import QueueEntryResponse, QueueActionRequest
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    get_current_user_context,
    require_any_permission,
    require_permission,
    validate_hospital_tenant_scope,
)

router = APIRouter(prefix="/queue", tags=["Queue Management"])

# Queue actions that require queue.call (doctor-only: calling/recalling a patient to consultation)
CALL_ACTIONS = {"CALL_NEXT", "RECALL", "START_CONSULT"}
# Queue actions that require queue.manage (nurse/staff: check-in, skip, hold, complete, transfer)
MANAGE_ACTIONS = {"HOLD", "SKIP", "COMPLETE", "TRANSFER"}


@router.get("", response_model=List[QueueEntryResponse])
@router.get("/", response_model=List[QueueEntryResponse], include_in_schema=False)
def get_live_queue(
    doctor_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("queue.read", "queue.manage", "queue.call")),
):
    """
    Returns the live OPD queue for the authenticated user's hospital.
    Non-platform users are automatically scoped to their own hospital (hospital_id param ignored).
    Requires queue.read or queue.manage or queue.call permission.
    """
    user_perms = user.get("permissions", [])
    user_hospital = user.get("hospital_ref_id") or user.get("hospital_id")

    # Enforce hospital scope: non-platform users only see their own hospital's queue
    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        effective_hospital_id = user_hospital  # Always use JWT-resolved hospital
    else:
        effective_hospital_id = hospital_id  # SUPER_ADMIN can query any hospital

    try:
        entries = sp_repository.list_queue_entries(
            doctor_id=doctor_id,
            hospital_id=effective_hospital_id
        )
        return entries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch queue: {str(e)}")


@router.post("/{queue_id}/action")
def perform_queue_action(
    queue_id: str,
    payload: QueueActionRequest,
    user: Dict[str, Any] = Depends(get_current_user_context),
):
    """
    Performs a queue state transition action.

    Permission enforcement:
      - CALL_NEXT / RECALL / START_CONSULT → requires queue.call (doctor-only)
      - HOLD / SKIP / COMPLETE / TRANSFER → requires queue.manage (nurse/staff)
      - SUPER_ADMIN with system.manage bypasses all checks
    """
    valid_actions = ["CALL_NEXT", "START_CONSULT", "COMPLETE", "HOLD", "SKIP", "RECALL", "TRANSFER"]
    action = payload.action.upper()

    if action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid queue action. Supported: {', '.join(valid_actions)}"
        )

    user_perms = user.get("permissions", [])

    # Gate action by permission (SUPER_ADMIN bypasses)
    if "system.manage" not in user_perms:
        if action in CALL_ACTIONS:
            if "queue.call" not in user_perms:
                raise HTTPException(
                    status_code=403,
                    detail=f"Forbidden: Action '{action}' requires queue.call permission (Doctor role only)"
                )
        elif action in MANAGE_ACTIONS:
            if "queue.manage" not in user_perms and "queue.call" not in user_perms:
                raise HTTPException(
                    status_code=403,
                    detail=f"Forbidden: Action '{action}' requires queue.manage permission"
                )

    entry = sp_repository.get_queue_entry_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Queue entry '{queue_id}' not found")

    # Enforce hospital tenant boundary
    validate_hospital_tenant_scope(user, entry.get("hospital_id"))

    try:
        actor = user.get("user_ref_id") or user.get("id") or user.get("username", "staff")
        result = sp_repository.execute_queue_transition(
            queue_id=queue_id,
            action=action,
            actor_id=actor,
            target_doctor_id=payload.target_doctor_id,
            reason=payload.reason
        )
        return {
            "success": True,
            "message": f"Action {action} executed successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute queue state transition: {str(e)}")


@router.post("/{queue_id}/call")
def call_patient(
    queue_id: str,
    user: Dict[str, Any] = Depends(require_permission("queue.call")),
):
    """Call a patient to the consultation room. Requires queue.call (Doctor role)."""
    entry = sp_repository.get_queue_entry_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Queue entry '{queue_id}' not found")
    validate_hospital_tenant_scope(user, entry.get("hospital_id"))

    try:
        result = sp_repository.execute_queue_action(queue_id, "CALL_NEXT")
        return {"success": True, "message": "Patient called to consultation room", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to call patient.")


@router.post("/{queue_id}/recall")
def recall_patient(
    queue_id: str,
    user: Dict[str, Any] = Depends(require_permission("queue.call")),
):
    """Recall a patient to the consultation room. Requires queue.call (Doctor role)."""
    entry = sp_repository.get_queue_entry_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Queue entry '{queue_id}' not found")
    validate_hospital_tenant_scope(user, entry.get("hospital_id"))

    try:
        result = sp_repository.execute_queue_action(queue_id, "CALL_NEXT")
        return {"success": True, "message": "Patient recalled to consultation room", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to recall patient.")


@router.post("/{queue_id}/skip")
def skip_patient(
    queue_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("queue.manage", "queue.call")),
):
    """Skip a patient token. Requires queue.manage or queue.call."""
    entry = sp_repository.get_queue_entry_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Queue entry '{queue_id}' not found")
    validate_hospital_tenant_scope(user, entry.get("hospital_id"))

    try:
        result = sp_repository.execute_queue_action(queue_id, "SKIP")
        return {"success": True, "message": "Patient token skipped", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to skip patient token.")


@router.post("/{queue_id}/hold")
def hold_patient(
    queue_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("queue.manage", "queue.call")),
):
    """Put a patient token on hold. Requires queue.manage or queue.call."""
    entry = sp_repository.get_queue_entry_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Queue entry '{queue_id}' not found")
    validate_hospital_tenant_scope(user, entry.get("hospital_id"))

    try:
        result = sp_repository.execute_queue_action(queue_id, "HOLD")
        return {"success": True, "message": "Patient token put on hold", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to hold patient token.")


@router.post("/{queue_id}/complete")
def complete_patient(
    queue_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("queue.manage", "queue.call")),
):
    """Mark a queue token as completed. Requires queue.manage or queue.call."""
    entry = sp_repository.get_queue_entry_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Queue entry '{queue_id}' not found")
    validate_hospital_tenant_scope(user, entry.get("hospital_id"))

    try:
        result = sp_repository.execute_queue_action(queue_id, "COMPLETE")
        return {"success": True, "message": "Queue token marked as completed", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to complete queue token.")
