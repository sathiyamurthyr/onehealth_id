from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from backend.app.schemas.models import QueueEntryResponse, QueueActionRequest
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/queue", tags=["Queue Management"])

@router.get("", response_model=List[QueueEntryResponse])
@router.get("/", response_model=List[QueueEntryResponse], include_in_schema=False)
def get_live_queue(
    doctor_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None)
):
    try:
        entries = sp_repository.list_queue_entries(doctor_id=doctor_id, hospital_id=hospital_id)
        return entries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch queue: {str(e)}")

@router.post("/{queue_id}/action")
def perform_queue_action(queue_id: str, payload: QueueActionRequest):
    valid_actions = ["CALL_NEXT", "START_CONSULT", "COMPLETE", "HOLD", "SKIP", "RECALL"]
    action = payload.action.upper()
    if action == "RECALL":
        action = "CALL_NEXT"

    if action not in valid_actions and payload.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid queue action. Supported: {', '.join(valid_actions)}"
        )

    entry = sp_repository.get_queue_entry_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Queue entry '{queue_id}' not found")

    try:
        result = sp_repository.execute_queue_action(queue_id, action)
        return {
            "success": True,
            "message": f"Action {action} executed successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{queue_id}/call")
def call_patient(queue_id: str):
    try:
        result = sp_repository.execute_queue_action(queue_id, "CALL_NEXT")
        return {"success": True, "message": "Patient called to consultation room", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{queue_id}/recall")
def recall_patient(queue_id: str):
    try:
        result = sp_repository.execute_queue_action(queue_id, "CALL_NEXT")
        return {"success": True, "message": "Patient recalled to consultation room", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{queue_id}/skip")
def skip_patient(queue_id: str):
    try:
        result = sp_repository.execute_queue_action(queue_id, "SKIP")
        return {"success": True, "message": "Patient token skipped", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{queue_id}/hold")
def hold_patient(queue_id: str):
    try:
        result = sp_repository.execute_queue_action(queue_id, "HOLD")
        return {"success": True, "message": "Patient token put on hold", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{queue_id}/complete")
def complete_patient(queue_id: str):
    try:
        result = sp_repository.execute_queue_action(queue_id, "COMPLETE")
        return {"success": True, "message": "Queue token marked as completed", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
