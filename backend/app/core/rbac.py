from fastapi import HTTPException, Header, Depends
from typing import Optional, List, Callable, Dict, Any
from jose import jwt
from backend.app.core.config import settings
from backend.app.repositories.sp_views_repository import sp_repository

def get_optional_user_context(
    authorization: Optional[str] = Header(None),
    x_hospital_ref_id: Optional[str] = Header(None, alias="X-Hospital-Ref-Id"),
    x_usertype_ref_id: Optional[str] = Header(None, alias="X-Usertype-Ref-Id")
) -> Optional[Dict[str, Any]]:
    """Safe optional user context resolution that does not raise HTTP 401 when unauthenticated."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return get_current_user_context(authorization, x_hospital_ref_id, x_usertype_ref_id)
    except Exception:
        return None

def get_current_user_context(
    authorization: Optional[str] = Header(None),
    x_hospital_ref_id: Optional[str] = Header(None, alias="X-Hospital-Ref-Id"),
    x_usertype_ref_id: Optional[str] = Header(None, alias="X-Usertype-Ref-Id")
) -> Dict[str, Any]:
    """
    Authoritative Centralized Authentication & Workspace Resolution.
    Decodes JWT, extracts user, active hospital context, and role.
    Resolves complete user workspace & permissions from PostgreSQL views (vw_user_workspaces)
    based on user_ref_id, hospital_ref_id, and usertype_ref_id.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication credentials were not provided")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    username = payload.get("sub")
    user_ref_id = payload.get("uid") or payload.get("user_ref_id") or payload.get("id")
    hospital_ref_id = x_hospital_ref_id or payload.get("hospital_ref_id") or payload.get("hospital_id")
    usertype_ref_id = x_usertype_ref_id or payload.get("usertype_ref_id") or payload.get("role_id")

    if not username and not user_ref_id:
        raise HTTPException(status_code=401, detail="Invalid authentication payload")

    # If user_ref_id not in token, resolve by username or fallback
    if not user_ref_id:
        user_row = sp_repository.get_user_by_username(username)
        if user_row:
            user_ref_id = user_row.get("user_ref_id") or user_row.get("id")
        elif payload.get("permissions") or payload.get("roles") or payload.get("role"):
            user_ref_id = username
        else:
            raise HTTPException(status_code=401, detail="User account does not exist")

    # Fetch active workspace context from vw_user_workspaces
    workspace = sp_repository.get_user_workspace(
        user_ref_id=user_ref_id,
        hospital_ref_id=hospital_ref_id,
        usertype_ref_id=usertype_ref_id
    )

    if not workspace:
        # Fallback to vw_user_auth if user is in transition
        auth_row = sp_repository.get_user_by_id(user_ref_id)
        if not auth_row:
            if payload.get("permissions") or payload.get("role"):
                return {
                    "id": user_ref_id,
                    "user_ref_id": user_ref_id,
                    "username": username or "user",
                    "name": payload.get("name", username or "User"),
                    "role": payload.get("role", "STAFF"),
                    "usertype_ref_id": usertype_ref_id or f"role-{payload.get('role', 'staff').lower()}",
                    "workspace_type": payload.get("workspace_type", "EMPLOYEE"),
                    "default_route": payload.get("default_route", "/employee"),
                    "hospital_id": hospital_ref_id,
                    "hospital_ref_id": hospital_ref_id,
                    "hospital_name": payload.get("hospital_name", "Kedar Hospital"),
                    "tenant_id": payload.get("tenant_id", "ten-kedar"),
                    "tenant_name": payload.get("tenant_name", "Kedar Healthcare Group"),
                    "permissions": payload.get("permissions") or [],
                    "roles": payload.get("roles") or [payload.get("role", "STAFF")]
                }
            raise HTTPException(status_code=403, detail="User account is deactivated")
        if not auth_row.get("is_active", True):
            raise HTTPException(status_code=403, detail="User account is deactivated")
        raw_db_perms = auth_row.get("permissions") or []
        if isinstance(raw_db_perms, str):
            try:
                raw_db_perms = json.loads(raw_db_perms)
            except Exception:
                raw_db_perms = []
        jwt_perms = payload.get("permissions") or []
        combined_perms = list(dict.fromkeys(list(raw_db_perms) + list(jwt_perms)))

        return {
            "id": auth_row["id"],
            "user_ref_id": auth_row.get("user_ref_id") or auth_row["id"],
            "username": auth_row["username"],
            "name": auth_row.get("full_name", username),
            "role": auth_row.get("role", "STAFF"),
            "usertype_ref_id": auth_row.get("usertype_ref_id") or f"role-{auth_row.get('role', 'staff').lower()}",
            "workspace_type": auth_row.get("workspace_type", "EMPLOYEE"),
            "default_route": auth_row.get("default_route", "/employee"),
            "hospital_id": auth_row.get("hospital_id"),
            "hospital_ref_id": auth_row.get("hospital_ref_id") or auth_row.get("hospital_id"),
            "hospital_name": auth_row.get("hospital_name", "Kedar Hospital"),
            "tenant_id": auth_row.get("tenant_id", "ten-kedar"),
            "tenant_name": auth_row.get("tenant_name", "Kedar Healthcare Group"),
            "permissions": combined_perms,
            "roles": auth_row.get("roles") or [auth_row.get("role", "STAFF")]
        }

    raw_ws_perms = workspace.get("permissions") or []
    if isinstance(raw_ws_perms, str):
        try:
            raw_ws_perms = json.loads(raw_ws_perms)
        except Exception:
            raw_ws_perms = []
    jwt_perms = payload.get("permissions") or []
    combined_ws_perms = list(dict.fromkeys(list(raw_ws_perms) + list(jwt_perms)))

    return {
        "id": workspace["user_ref_id"],
        "user_ref_id": workspace["user_ref_id"],
        "username": workspace["username"],
        "name": workspace.get("full_name", username),
        "role": workspace.get("role_code", "STAFF"),
        "role_name": workspace.get("role_name", "Staff"),
        "usertype_ref_id": workspace.get("usertype_ref_id"),
        "workspace_type": workspace.get("workspace_type", "EMPLOYEE"),
        "default_route": workspace.get("default_route", "/employee"),
        "hospital_id": workspace.get("hospital_ref_id"),
        "hospital_ref_id": workspace.get("hospital_ref_id"),
        "hospital_name": workspace.get("hospital_name", "Kedar Hospital"),
        "hospital_code": workspace.get("hospital_code", "KEDAR-CHE"),
        "branch_ref_id": workspace.get("branch_ref_id"),
        "branch_name": workspace.get("branch_name"),
        "tenant_id": workspace.get("tenant_id", "ten-kedar"),
        "tenant_name": workspace.get("tenant_name", "Kedar Healthcare Group"),
        "permissions": combined_ws_perms,
        "roles": [workspace.get("role_code", "STAFF")]
    }

def require_permission(permission_code: str) -> Callable:
    """
    Centralized Permission Enforcement Dependency.
    Checks that the current authenticated user context possesses the mandatory permission.
    Strictly independent of frontend route guards.
    """
    def _dependency(user: Dict[str, Any] = Depends(get_current_user_context)) -> Dict[str, Any]:
        user_perms = user.get("permissions") or []
        user_roles = user.get("roles") or [user.get("role")]
        # Platform administrators with system.manage or SUPER_ADMIN / PLATFORM_ADMIN roles
        if "system.manage" in user_perms or "SUPER_ADMIN" in user_roles or "PLATFORM_ADMIN" in user_roles:
            return user

        if permission_code not in user_perms:
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: User lacks required permission '{permission_code}'"
            )
        return user
    return _dependency

def require_any_permission(*permission_codes: str) -> Callable:
    """
    Checks that the current authenticated user possesses at least one of the specified permissions.
    """
    def _dependency(user: Dict[str, Any] = Depends(get_current_user_context)) -> Dict[str, Any]:
        user_perms = user.get("permissions") or []
        user_roles = user.get("roles") or [user.get("role")]
        if "system.manage" in user_perms or "SUPER_ADMIN" in user_roles or "PLATFORM_ADMIN" in user_roles:
            return user

        for p in permission_codes:
            if p in user_perms:
                return user

        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: User lacks one of the required permissions: {', '.join(permission_codes)}"
        )
    return _dependency

def validate_hospital_tenant_scope(user: Dict[str, Any], target_hospital_id: Optional[str]):
    """
    Enforces strict hospital tenant isolation.
    Hospital A user cannot query or mutate records belonging to Hospital B.
    SUPER_ADMIN with platform scope is exempted.
    """
    if not target_hospital_id:
        return

    user_perms = user.get("permissions") or []
    if "system.manage" in user_perms or "organization.read" in user_perms:
        return  # Platform-wide scope permitted

    user_hosp = user.get("hospital_ref_id") or user.get("hospital_id")
    if user_hosp and user_hosp != target_hospital_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Cross-hospital tenant boundary violation. You do not have access to this hospital facility."
        )
