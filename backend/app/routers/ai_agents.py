"""
OH-ID Phase 6: Controlled AI Workflow Agents & Human-in-the-Loop Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.app.services.ai.workflow_agents import AIWorkflowAgentsService
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/ai/agents", tags=["Controlled AI Workflow Agents"])

class RejectTaskRequest(BaseModel):
    reason: Optional[str] = "Clinician rejected"

class AgentTriggerRequest(BaseModel):
    hospital_id: Optional[str] = None

@router.get("/tasks")
def list_agent_tasks(
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "doctor.workspace", "system.manage"))
):
    """Lists AI workflow agent tasks and pending human approvals."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return AIWorkflowAgentsService.list_tasks(target_hosp, status)
    except Exception as e:
        logger.error("Failed to list agent tasks: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load agent tasks")

@router.post("/tasks/{task_id}/approve")
def approve_agent_task(
    task_id: str = Path(...),
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.manage", "doctor.workspace", "system.manage"))
):
    """Approves and executes a proposed AI agent task."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return AIWorkflowAgentsService.approve_task(task_id, target_hosp, user)
    except Exception as e:
        logger.error("Failed to approve agent task %s: %s", task_id, e)
        raise HTTPException(status_code=500, detail="Failed to approve task")

@router.post("/tasks/{task_id}/reject")
def reject_agent_task(
    task_id: str = Path(...),
    payload: RejectTaskRequest = Body(...),
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.manage", "doctor.workspace", "system.manage"))
):
    """Rejects a proposed AI agent task."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return AIWorkflowAgentsService.reject_task(task_id, target_hosp, user, payload.reason or "Rejected")
    except Exception as e:
        logger.error("Failed to reject agent task %s: %s", task_id, e)
        raise HTTPException(status_code=500, detail="Failed to reject task")

@router.post("/trigger/followup")
def trigger_followup_agent(
    payload: AgentTriggerRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.manage", "doctor.workspace", "system.manage"))
):
    """Triggers the Chronic Care & Follow-Up Tracking Agent to detect due patients and draft reminders."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return AIWorkflowAgentsService.run_followup_agent(target_hosp, user)
    except Exception as e:
        logger.error("Failed to trigger follow-up agent: %s", e)
        raise HTTPException(status_code=500, detail="Failed to run agent")

@router.post("/trigger/operations")
def trigger_operations_agent(
    payload: AgentTriggerRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.manage", "system.manage"))
):
    """Triggers the Queue SLA & Operational Alert Agent."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return AIWorkflowAgentsService.run_operations_agent(target_hosp, user)
    except Exception as e:
        logger.error("Failed to trigger operations agent: %s", e)
        raise HTTPException(status_code=500, detail="Failed to run operations agent")
