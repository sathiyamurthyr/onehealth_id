from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from backend.app.schemas.models import QueueEntryResponse, QueueActionRequest
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/queue", tags=["Queue Management"])

@router.get("", response_model=List[QueueEntryResponse])
@router.get("/", response_model=List[QueueEntryResponse], include_in_schema=False)
def get_live_queue(doctor_id: Optional[str] = Query(None)):
    try:
        entries = sp_repository.list_queue_entries(doctor_id=doctor_id)
        if entries:
            return entries
    except Exception:
        pass
    return []

@router.post("/{queue_id}/action")
def perform_queue_action(queue_id: str, payload: QueueActionRequest):
    valid_actions = ["CALL_NEXT", "START_CONSULT", "COMPLETE", "HOLD", "SKIP"]
    if payload.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid queue action. Supported: {', '.join(valid_actions)}"
        )

    try:
        result = sp_repository.execute_queue_action(queue_id, payload.action)
        return {
            "success": True,
            "message": f"Action {payload.action} executed on queue token {queue_id}",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
