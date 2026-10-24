from fastapi import APIRouter, HTTPException, Depends, Header, Response
from typing import Optional, List, Dict, Any
from backend.app.schemas.models import (
    WorkspaceResponse, WorkspaceDefinition, NavigationItem, 
    DashboardConfig, UserProfile, SwitchContextRequest, SwitchContextResponse
)
from backend.app.core.rbac import get_current_user_context, require_permission
from backend.app.core.security import create_access_token
from backend.app.core.response import success_response, error_response
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="", tags=["Enterprise Workspaces & RBAC"])

def _build_workspace_response(user_ctx: Dict[str, Any]) -> WorkspaceResponse:
    user_ref_id = user_ctx["user_ref_id"]
    hospital_ref_id = user_ctx.get("hospital_ref_id")
    usertype_ref_id = user_ctx.get("usertype_ref_id")
    role_code = user_ctx.get("role")

    # Fetch active workspace row
    ws_row = sp_repository.get_user_workspace(user_ref_id, hospital_ref_id, usertype_ref_id, role_code)
    if not ws_row:
        raise HTTPException(status_code=404, detail="Workspace configuration not found for user")

    # Parse navigation
    nav_raw = ws_row.get("navigation_config") or []
    nav_items = []

    # Dynamically resolve database-backed family members count for patient workspaces
    patient_family_count = None
    if ws_row.get("workspace_type") == "PATIENT" or role_code == "PATIENT" or usertype_ref_id == "role-patient":
        try:
            pat = sp_repository.get_patient_by_user_ref(user_ref_id, user_ctx.get("email"))
            if not pat and user_ctx.get("username") == "patient":
                pat = sp_repository.get_patient_by_id("p-101")
            if pat:
                members = sp_repository.list_family_members(pat["id"])
                patient_family_count = str(len(members))
            else:
                patient_family_count = "0"
        except Exception:
            patient_family_count = None

    if isinstance(nav_raw, list):
        for item in nav_raw:
            badge_val = item.get("badge")
            if item.get("href") == "/patient/family":
                badge_val = patient_family_count if patient_family_count is not None else "0"

            nav_items.append(NavigationItem(
                title=item.get("title", ""),
                href=item.get("href", ""),
                icon=item.get("icon", "LayoutDashboard"),
                section=item.get("section", "General"),
                badge=badge_val,
                permission=item.get("permission")
            ))

    # Parse dashboard layout
    dash_layout = ws_row.get("dashboard_layout") or []

    # Fetch available contexts for switching and filter by approval status
    raw_workspaces = sp_repository.list_user_workspaces(user_ref_id)
    raw_hospitals = sp_repository.list_user_hospitals(user_ref_id)

    is_super = "SUPER_ADMIN" in (user_ctx.get("roles") or []) or "PLATFORM_ADMIN" in (user_ctx.get("roles") or [])
    if is_super:
        available_workspaces = raw_workspaces
        available_hospitals = raw_hospitals
    else:
        # Only surface approved and active hospitals
        approved_hosp_ids = set()
        for h in raw_hospitals:
            h_id = h.get("id") or h.get("hospital_ref_id")
            if h_id:
                stat = sp_repository.get_hospital_approval_status(h_id)
                if stat and (stat.get("lifecycle_status") == "APPROVED" or stat.get("status") == "ACTIVE") and stat.get("is_active"):
                    approved_hosp_ids.add(h_id)

        available_hospitals = [h for h in raw_hospitals if (h.get("id") or h.get("hospital_ref_id")) in approved_hosp_ids]
        available_workspaces = [w for w in raw_workspaces if not w.get("hospital_ref_id") or w.get("hospital_ref_id") in approved_hosp_ids]

    profile = UserProfile(
        id=user_ctx["id"],
        user_ref_id=user_ref_id,
        username=user_ctx["username"],
        name=user_ctx["name"],
        role=user_ctx["role"],
        usertype_ref_id=user_ctx.get("usertype_ref_id"),
        email=ws_row.get("email", ""),
        hospital_id=ws_row.get("hospital_ref_id"),
        hospital_ref_id=ws_row.get("hospital_ref_id"),
        hospital_name=ws_row.get("hospital_name"),
        tenant_name=ws_row.get("tenant_name"),
        roles=[ws_row.get("role_code", "STAFF")],
        permissions=ws_row.get("permissions") or []
    )

    workspace_def = WorkspaceDefinition(
        id=f"ws-{user_ref_id}-{ws_row.get('usertype_ref_id')}",
        workspace_type=ws_row.get("workspace_type", "EMPLOYEE"),
        category_title=ws_row.get("category_title"),
        role_code=ws_row.get("role_code", "STAFF"),
        role_name=ws_row.get("role_name", "Staff"),
        default_route=ws_row.get("default_route", "/employee"),
        hospital_ref_id=ws_row.get("hospital_ref_id"),
        hospital_name=ws_row.get("hospital_name"),
        hospital_code=ws_row.get("hospital_code"),
        branch_ref_id=ws_row.get("branch_ref_id"),
        branch_name=ws_row.get("branch_name"),
        department_id=ws_row.get("department_id"),
        department_name=ws_row.get("department_name"),
        tenant_id=ws_row.get("tenant_id"),
        tenant_name=ws_row.get("tenant_name"),
        is_primary=ws_row.get("is_primary", True)
    )

    dashboard_config = DashboardConfig(
        layout=dash_layout if isinstance(dash_layout, list) else [],
        widgets=[]
    )

    return WorkspaceResponse(
        user=profile,
        workspace=workspace_def,
        navigation=nav_items,
        permissions=ws_row.get("permissions") or [],
        dashboard=dashboard_config,
        available_workspaces=available_workspaces,
        available_hospitals=available_hospitals
    )

@router.get("/me/workspace", response_model=WorkspaceResponse)
@router.get("/workspace/me", response_model=WorkspaceResponse)
def get_my_workspace(current_user: Dict[str, Any] = Depends(get_current_user_context)):
    """
    Authoritative resolution of current user's workspace, permitted navigation,
    layout configuration, and accessible hospital/role contexts.
    """
    return _build_workspace_response(current_user)

@router.post("/workspace/switch-context", response_model=SwitchContextResponse)
def switch_workspace_context(
    req: SwitchContextRequest,
    response: Response,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Controlled context switching between permitted hospitals and/or roles.
    Re-validates that the user has an active assignment for the target context.
    Returns a freshly signed JWT token with updated scope and resolved workspace.
    """
    user_ref_id = current_user["user_ref_id"]

    # Verify that the user has access to requested hospital and role
    available_workspaces = sp_repository.list_user_workspaces(user_ref_id)
    target_ws = None

    target_role = req.role_code or req.usertype_ref_id

    for ws in available_workspaces:
        hosp_match = (req.hospital_ref_id is None) or (ws.get("hospital_ref_id") == req.hospital_ref_id)
        role_match = (target_role is None) or (
            ws.get("usertype_ref_id") == target_role or 
            ws.get("role_code") == target_role or 
            ws.get("workspace_type") == target_role
        )
        dept_match = (req.department_id is None) or (ws.get("department_id") == req.department_id)
        
        if hosp_match and role_match and dept_match:
            target_ws = ws
            break

    if not target_ws:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You are not authorized for the requested workspace context."
        )

    # Verify target hospital approval status if hospital context is being switched
    target_hosp_id = target_ws.get("hospital_ref_id")
    is_super = "SUPER_ADMIN" in (current_user.get("roles") or []) or "PLATFORM_ADMIN" in (current_user.get("roles") or [])
    if target_hosp_id and not is_super:
        hosp_stat = sp_repository.get_hospital_approval_status(target_hosp_id)
        if not hosp_stat:
            raise HTTPException(status_code=403, detail="Forbidden: Target hospital facility not found.")
        lc = (hosp_stat.get("lifecycle_status") or "").upper()
        if lc in ("SUBMITTED", "PENDING", "UNDER_REVIEW"):
            raise HTTPException(status_code=403, detail="Forbidden: Target hospital registration is pending Super Admin review and approval.")
        elif lc == "NEEDS_INFORMATION":
            raise HTTPException(status_code=403, detail="Forbidden: Target hospital application requires additional information before approval.")
        elif lc == "REJECTED":
            raise HTTPException(status_code=403, detail="Forbidden: Target hospital application was rejected by Super Admin.")
        elif lc == "SUSPENDED" or not hosp_stat.get("is_active"):
            raise HTTPException(status_code=403, detail="Forbidden: Target hospital facility is suspended by Super Admin.")
        elif lc != "APPROVED" and hosp_stat.get("status") != "ACTIVE":
            raise HTTPException(status_code=403, detail=f"Forbidden: Target hospital access not authorized (Status: {lc}).")

        # Distinct clinical staff verification check
        role_code = (target_ws.get("role_code") or "").upper()
        if role_code in ("DOCTOR", "NURSE", "CLINICAL_STAFF", "LAB_TECHNICIAN", "PHARMACIST", "RADIOLOGIST"):
            membership = sp_repository.check_staff_membership_authorization(
                user_id=user_ref_id,
                hospital_id=target_hosp_id
            )
            if not membership or not membership.get("is_active"):
                raise HTTPException(status_code=403, detail="Forbidden: Clinical staff member is not active or authorized for this hospital.")
            verif = (membership.get("verification_status") or "").upper()
            if verif not in ("VERIFIED", "APPROVED"):
                raise HTTPException(status_code=403, detail="Forbidden: Clinical staff credentials have not been authorized by the target hospital.")

    # Issue updated access token with new active hospital and role context
    token = create_access_token({
        "sub": current_user["username"],
        "uid": user_ref_id,
        "role": target_ws["role_code"],
        "usertype_ref_id": target_ws["usertype_ref_id"],
        "hospital_id": target_ws["hospital_ref_id"],
        "hospital_ref_id": target_ws["hospital_ref_id"]
    })

    # Prepare updated user context
    updated_ctx = dict(current_user)
    updated_ctx["hospital_ref_id"] = target_ws["hospital_ref_id"]
    updated_ctx["usertype_ref_id"] = target_ws["usertype_ref_id"]
    updated_ctx["role"] = target_ws["role_code"]

    workspace_resp = _build_workspace_response(updated_ctx)
    response.set_cookie(
        key="oh_access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/"
    )
    return SwitchContextResponse(access_token=token, workspace=workspace_resp)

@router.get("/workspace/roles")
def list_system_roles(current_user: Dict[str, Any] = Depends(require_permission("role.read"))):
    """
    List all configured roles with their workspace types and routes.
    """
    roles = sp_repository.list_roles()
    return success_response(data=roles)

@router.get("/workspace/permissions")
def list_system_permissions(current_user: Dict[str, Any] = Depends(require_permission("permission.read"))):
    """
    List all system permissions in the catalog.
    """
    perms = sp_repository.list_permissions()
    return success_response(data=perms)

@router.get("/workspace/users")
def list_workspace_users(current_user: Dict[str, Any] = Depends(require_permission("user.read"))):
    """
    List user profiles with roles for administrative management.
    """
    users = sp_repository.list_users()
    return success_response(data=users)

@router.post("/workspace/assign-role")
def assign_user_role_assignment(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_permission("permission.assign"))
):
    """
    Assign a role and hospital scope to a user.
    """
    user_ref_id = payload.get("user_ref_id")
    usertype_ref_id = payload.get("usertype_ref_id")
    hospital_ref_id = payload.get("hospital_ref_id")
    branch_ref_id = payload.get("branch_ref_id")
    department_id = payload.get("department_id")
    is_primary = payload.get("is_primary", False)

    if not user_ref_id or not usertype_ref_id or not hospital_ref_id:
        raise HTTPException(status_code=422, detail="user_ref_id, usertype_ref_id, and hospital_ref_id are required")

    res = sp_repository.assign_user_role(
        user_ref_id=user_ref_id,
        usertype_ref_id=usertype_ref_id,
        hospital_ref_id=hospital_ref_id,
        branch_ref_id=branch_ref_id,
        department_id=department_id,
        is_primary=is_primary
    )
    return success_response(data=res, message="User role assignment updated successfully")

@router.post("/workspace/manage-permission")
def manage_role_permission_assignment(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_permission("permission.assign"))
):
    """
    Assign or revoke a granular permission on a role.
    """
    usertype_ref_id = payload.get("usertype_ref_id")
    permission_code = payload.get("permission_code")
    action = payload.get("action", "ASSIGN")  # ASSIGN or REVOKE

    if not usertype_ref_id or not permission_code:
        raise HTTPException(status_code=422, detail="usertype_ref_id and permission_code are required")

    res = sp_repository.manage_role_permission(
        usertype_ref_id=usertype_ref_id,
        permission_code=permission_code,
        action=action
    )
    return success_response(data=res, message=f"Permission {action.lower()}ed successfully")
