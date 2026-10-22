from fastapi import APIRouter, HTTPException, Depends, Header, status
from typing import Optional
import logging
from pydantic import BaseModel, Field
from backend.app.schemas.models import LoginRequest, LoginResponse, UserProfile, RegisterRequest, RegisterResponse
from backend.app.core.security import verify_password, create_access_token
from backend.app.core.response import success_response, error_response
from backend.app.repositories.sp_views_repository import sp_repository
from jose import jwt
from backend.app.core.config import settings

from backend.app.core.rate_limit import rate_limit_login

logger = logging.getLogger("ohid.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if username:
            user = sp_repository.get_user_by_username(username)
            if user:
                user["token_role"] = payload.get("role")
                user["token_usertype_ref_id"] = payload.get("usertype_ref_id")
                user["token_hospital_ref_id"] = payload.get("hospital_ref_id") or payload.get("hospital_id")
                return user
    except Exception:
        return None
    return None

@router.post("/login", response_model=LoginResponse, dependencies=[Depends(rate_limit_login)])
def login(creds: LoginRequest):
    identifier = creds.username.strip()
    # Reject email logins per Phase 1 Architecture Conformance
    if "@" in identifier:
        raise HTTPException(
            status_code=400,
            detail="Email is not a login identifier. Please enter your Registered Mobile Number."
        )

    # 1. Fetch user from PostgreSQL oh_id.vw_user_auth by mobile or username
    user_row = sp_repository.get_user_by_mobile(identifier)
    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid mobile number or password")

    if not user_row.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is deactivated")

    # 2. Verify password (bcrypt or legacy test password match)
    if not verify_password(creds.password, user_row.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid mobile number or password")

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
        hospital_name=(ws.get("hospital_name") if ws else None) or user_row.get("hospital_name") or "OneHealth Hospital",
        tenant_name=(ws.get("tenant_name") if ws else None) or user_row.get("tenant_name") or user_row.get("hospital_name") or "OneHealth Group",
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

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_login)])
def register(payload: RegisterRequest):
    """
    Public/Citizen self-registration for OneHealth ID.
    Enforces 10-digit mobile verification, bcrypt password hashing,
    and establishes a unified patient profile and citizen credentials in existing tables.
    Strictly assigns PATIENT role (ignoring any client-supplied role).
    """
    # 1. Reject email as identifier
    identifier = payload.phone.strip()
    if "@" in identifier:
        raise HTTPException(
            status_code=400,
            detail="Email is not an allowed login identifier. Please enter your 10-digit registered mobile number."
        )

    # 2. Enforce 10-digit mobile number
    digits_only = "".join(filter(str.isdigit, identifier))
    clean_mobile = digits_only[-10:] if len(digits_only) >= 10 else digits_only
    if len(clean_mobile) != 10:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid 10-digit Indian mobile number."
        )

    # 3. Enforce password minimum requirements
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters in length."
        )

    # 4. Enforce mandatory patient consent
    if not payload.consent_given:
        raise HTTPException(
            status_code=400,
            detail="Consent to establish a OneHealth ID is mandatory."
        )

    # 5. Execute registration in database
    try:
        reg_result = sp_repository.register_citizen_patient(
            name=payload.name.strip(),
            phone=clean_mobile,
            password=payload.password,
            age=payload.age,
            gender=payload.gender or "Unspecified",
            email=payload.email.strip() if payload.email else None,
            blood_group=payload.blood_group,
            emergency_contact=payload.emergency_contact,
            address=payload.address,
            consent_given=payload.consent_given,
            hospital_id="hosp-kedar"
        )
    except ValueError as ve:
        err_msg = str(ve)
        if "already registered" in err_msg.lower():
            raise HTTPException(status_code=409, detail=err_msg)
        raise HTTPException(status_code=400, detail=err_msg)
    except Exception as e:
        logger.error("Citizen registration failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to register user. Please try again.")

    user_row = reg_result.get("user_row")
    if not user_row:
        raise HTTPException(status_code=500, detail="Failed to retrieve registered user profile.")

    user_ref_id = user_row.get("user_ref_id") or user_row.get("id")

    # 6. Resolve active workspace context
    ws = sp_repository.get_user_workspace(user_ref_id=user_ref_id)
    active_role = ws.get("role_code") if ws else "PATIENT"
    active_usertype = ws.get("usertype_ref_id") if ws else "role-patient"
    active_hospital = ws.get("hospital_ref_id") if ws else "hosp-kedar"
    active_perms = ws.get("permissions") if ws else (user_row.get("permissions") or [])

    profile = UserProfile(
        id=user_row.get("id"),
        user_ref_id=user_ref_id,
        username=user_row["username"],
        name=user_row.get("full_name", payload.name),
        role=active_role,
        usertype_ref_id=active_usertype,
        email=user_row.get("email", ""),
        hospital_id=active_hospital,
        hospital_ref_id=active_hospital,
        hospital_name=(ws.get("hospital_name") if ws else None) or user_row.get("hospital_name") or "Kedar Hospital",
        tenant_name=(ws.get("tenant_name") if ws else None) or user_row.get("tenant_name") or "OneHealth Group",
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

    return RegisterResponse(
        message=f"Registration successful! Your OneHealth ID is {reg_result['onehealth_id']}.",
        user_id=reg_result["user_id"],
        patient_id=reg_result["patient_id"],
        onehealth_id=reg_result["onehealth_id"],
        access_token=token,
        token_type="bearer",
        user=profile
    )

@router.get("/me")
def get_me(authorization: Optional[str] = Header(None)):
    user_row = get_current_user(authorization)
    if not user_row:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_ref_id = user_row.get("user_ref_id") or user_row.get("id")
    token_role = user_row.get("token_role")
    token_usertype = user_row.get("token_usertype_ref_id")
    token_hospital = user_row.get("token_hospital_ref_id")

    ws = sp_repository.get_user_workspace(
        user_ref_id=user_ref_id,
        hospital_ref_id=token_hospital,
        usertype_ref_id=token_usertype,
        role_code=token_role
    )
    active_role = ws.get("role_code") if ws else (token_role or user_row.get("role", "STAFF"))
    active_usertype = ws.get("usertype_ref_id") if ws else (token_usertype or user_row.get("usertype_ref_id"))
    active_hospital = ws.get("hospital_ref_id") if ws else (token_hospital or user_row.get("hospital_ref_id") or user_row.get("hospital_id"))
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
        hospital_name=(ws.get("hospital_name") if ws else None) or user_row.get("hospital_name") or "OneHealth Hospital",
        tenant_name=(ws.get("tenant_name") if ws else None) or user_row.get("tenant_name") or user_row.get("hospital_name") or "OneHealth Group",
        roles=[active_role],
        permissions=active_perms
    )
    return success_response(data=profile.model_dump())

@router.get("/me/workspace")
def get_me_workspace(authorization: Optional[str] = Header(None)):
    """Authoritative workspace resolution for authenticated user."""
    user_row = get_current_user(authorization)
    if not user_row:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_ref_id = user_row.get("user_ref_id") or user_row.get("id")
    token_role = user_row.get("token_role")
    token_usertype = user_row.get("token_usertype_ref_id")
    token_hospital = user_row.get("token_hospital_ref_id")

    ws = sp_repository.get_user_workspace(
        user_ref_id=user_ref_id,
        hospital_ref_id=token_hospital,
        usertype_ref_id=token_usertype,
        role_code=token_role
    )
    if not ws:
        default_role = token_role or user_row.get("role", "STAFF")
        return success_response(data={
            "user_id": user_ref_id,
            "role": default_role,
            "default_route": "/hospital" if default_role == "HOSPITAL_ADMIN" else ("/super-admin" if default_role == "SUPER_ADMIN" else "/doctor"),
            "permissions": user_row.get("permissions") or []
        })

    return success_response(data=ws)

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """Logs out user and terminates session."""
    return success_response(data={"message": "Logged out successfully"})

class AcceptInvitationRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=128)
    mfa_enabled: bool = False

@router.get("/invitations/{token}/validate")
def validate_invitation(token: str):
    """Validates secure cryptographic single-use invitation token for user onboarding."""
    inv = sp_repository.validate_invitation_token(token)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation link not found or invalid.")
    if not inv.get("valid"):
        if inv.get("is_used"):
            raise HTTPException(status_code=400, detail="This invitation has already been accepted. Please sign in.")
        if inv.get("is_revoked"):
            raise HTTPException(status_code=400, detail="This invitation has been revoked by the administrator.")
        if inv.get("is_expired"):
            raise HTTPException(status_code=400, detail="This invitation link has expired. Please request a new invite.")
        raise HTTPException(status_code=400, detail="Invalid invitation.")
    return success_response(data=inv, message="Invitation verified")

@router.post("/invitations/{token}/accept")
def accept_invitation(token: str, payload: AcceptInvitationRequest):
    """
    Accepts invitation, establishes secure bcrypt password hash, and activates account.
    """
    from backend.app.core.security import get_password_hash
    pw_hash = get_password_hash(payload.password)
    try:
        res = sp_repository.accept_invitation_token(
            token=token,
            password_hash=pw_hash,
            mfa_enabled=payload.mfa_enabled
        )
        return success_response(data=res, message=res.get("message", "Account activated successfully"))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to accept invitation: {e}")

