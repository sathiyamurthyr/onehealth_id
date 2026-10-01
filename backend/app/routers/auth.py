from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from backend.app.schemas.models import LoginRequest, LoginResponse, UserProfile
from backend.app.core.security import verify_password, create_access_token
from backend.app.core.response import success_response, error_response
from backend.app.repositories.sp_views_repository import sp_repository
from jose import jwt
from backend.app.core.config import settings

from backend.app.core.rate_limit import rate_limit_login

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if username:
            return sp_repository.get_user_by_username(username)
    except Exception:
        return None
    return None

@router.post("/login", response_model=LoginResponse, dependencies=[Depends(rate_limit_login)])
def login(creds: LoginRequest):
    # 1. Fetch user from PostgreSQL oh_id.vw_user_auth
    user_row = sp_repository.get_user_by_username(creds.username)
    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user_row.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is deactivated")

    # 2. Verify password (bcrypt or legacy test password match)
    if not verify_password(creds.password, user_row.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_ref_id = user_row.get("user_ref_id") or user_row.get("id")

    # 3. Resolve active workspace context
    ws = sp_repository.get_user_workspace(user_ref_id=user_ref_id)
    active_role = ws.get("role_code") if ws else user_row.get("role", "STAFF")
    active_usertype = ws.get("usertype_ref_id") if ws else user_row.get("usertype_ref_id")
    active_hospital = ws.get("hospital_ref_id") if ws else user_row.get("hospital_ref_id") or user_row.get("hospital_id")
    active_perms = ws.get("permissions") if ws else user_row.get("permissions") or []

    profile = UserProfile(
        id=user_row.get("id"),
        user_ref_id=user_ref_id,
        username=user_row["username"],
        name=user_row.get("full_name", creds.username),
        role=active_role,
        usertype_ref_id=active_usertype,
        email=user_row.get("email", ""),
        hospital_id=active_hospital,
        hospital_ref_id=active_hospital,
        hospital_name=ws.get("hospital_name") if ws else user_row.get("hospital_name") or "Kedar Hospital",
        tenant_name=user_row.get("tenant_name") or "Kedar Healthcare Group",
        roles=[active_role],
        permissions=active_perms
    )

    token = create_access_token({
        "sub": profile.username,
        "uid": profile.user_ref_id,
        "role": profile.role,
        "usertype_ref_id": profile.usertype_ref_id,
        "hospital_id": profile.hospital_ref_id,
        "hospital_ref_id": profile.hospital_ref_id
    })

    return LoginResponse(access_token=token, user=profile)

@router.get("/me")
def get_me(authorization: Optional[str] = Header(None)):
    user_row = get_current_user(authorization)
    if not user_row:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_ref_id = user_row.get("user_ref_id") or user_row.get("id")
    ws = sp_repository.get_user_workspace(user_ref_id=user_ref_id)
    active_role = ws.get("role_code") if ws else user_row.get("role", "STAFF")
    active_usertype = ws.get("usertype_ref_id") if ws else user_row.get("usertype_ref_id")
    active_hospital = ws.get("hospital_ref_id") if ws else user_row.get("hospital_ref_id") or user_row.get("hospital_id")
    active_perms = ws.get("permissions") if ws else user_row.get("permissions") or []

    profile = UserProfile(
        id=user_row.get("id"),
        user_ref_id=user_ref_id,
        username=user_row["username"],
        name=user_row.get("full_name", user_row["username"]),
        role=active_role,
        usertype_ref_id=active_usertype,
        email=user_row.get("email", ""),
        hospital_id=active_hospital,
        hospital_ref_id=active_hospital,
        hospital_name=ws.get("hospital_name") if ws else user_row.get("hospital_name") or "Kedar Hospital",
        tenant_name=user_row.get("tenant_name") or "Kedar Healthcare Group",
        roles=[active_role],
        permissions=active_perms
    )
    return success_response(data=profile.model_dump())
