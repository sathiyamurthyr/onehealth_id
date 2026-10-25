from fastapi import APIRouter, HTTPException, Depends, Header, status, Response, Request
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

def get_current_user(request: Optional[Request] = None, authorization: Optional[str] = Header(None)) -> Optional[dict]:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif request and hasattr(request, "cookies") and request.cookies.get("oh_access_token"):
        token = request.cookies.get("oh_access_token")
    if not token:
        return None
    try:
        import hashlib
        from backend.app.core.session_manager import session_manager
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti") or hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]
        user_ref = payload.get("uid") or payload.get("user_ref_id")
        iat = payload.get("iat")

        if session_manager.is_token_revoked(jti, user_id=user_ref, issued_at=iat):
            return None

        username = payload.get("sub")
        if username:
            user = sp_repository.get_user_by_username(username)
            if user:
                if not user.get("is_active", True):
                    return None
                user["token_role"] = payload.get("role")
                user["token_usertype_ref_id"] = payload.get("usertype_ref_id")
                user["token_hospital_ref_id"] = payload.get("hospital_ref_id") or payload.get("hospital_id")
                user["token_jti"] = jti
                return user
    except Exception:
        return None
    return None

@router.post("/login", response_model=LoginResponse, dependencies=[Depends(rate_limit_login)])
def login(creds: LoginRequest, response: Response, request: Request):
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

    # Enforce organization approval status during login
    is_super = active_role in ("SUPER_ADMIN", "PLATFORM_ADMIN") or "system.manage" in active_perms
    if active_hospital and not is_super:
        hosp_stat = sp_repository.get_hospital_approval_status(active_hospital)
        if not hosp_stat:
            raise HTTPException(status_code=403, detail="Forbidden: Organization facility not found.")
        lc = (hosp_stat.get("lifecycle_status") or "").upper()
        if lc in ("SUBMITTED", "PENDING", "UNDER_REVIEW"):
            raise HTTPException(status_code=403, detail="Forbidden: Hospital/Clinic registration is pending Super Admin review and approval.")
        elif lc == "NEEDS_INFORMATION":
            raise HTTPException(status_code=403, detail="Forbidden: Hospital/Clinic application requires additional information before approval.")
        elif lc == "REJECTED":
            raise HTTPException(status_code=403, detail="Forbidden: Hospital/Clinic application was rejected by Super Admin.")
        elif lc == "SUSPENDED" or not hosp_stat.get("is_active"):
            raise HTTPException(status_code=403, detail="Forbidden: Hospital/Clinic facility has been suspended by Super Admin.")
        elif lc != "APPROVED" and hosp_stat.get("status") != "ACTIVE":
            raise HTTPException(status_code=403, detail=f"Forbidden: Organization access not authorized (Status: {lc}).")

        # Clinical staff verification check
        if active_role in ("DOCTOR", "NURSE", "CLINICAL_STAFF", "LAB_TECHNICIAN", "PHARMACIST", "RADIOLOGIST"):
            membership = sp_repository.check_staff_membership_authorization(
                user_id=user_ref_id,
                hospital_id=active_hospital
            )
            if not membership or not membership.get("is_active"):
                raise HTTPException(status_code=403, detail="Forbidden: Clinical staff member is not active or authorized for this hospital.")
            verif = (membership.get("verification_status") or "").upper()
            if verif not in ("VERIFIED", "APPROVED"):
                raise HTTPException(status_code=403, detail="Forbidden: Clinical staff credentials have not been verified and authorized by the hospital.")

    token = create_access_token({
        "sub": profile.username,
        "uid": profile.user_ref_id,
        "role": profile.role,
        "usertype_ref_id": profile.usertype_ref_id,
        "hospital_id": profile.hospital_ref_id,
        "hospital_ref_id": profile.hospital_ref_id
    })

    is_production = settings.ENVIRONMENT in ("production", "staging")
    response.set_cookie(
        key="oh_access_token",
        value=token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    # For browser clients (identified by X-Requested-With or X-Session-Mode: cookie),
    # suppress the raw JWT in the response body to prevent browser script exposure.
    is_browser_cookie_client = (
        request.headers.get("x-requested-with") == "XMLHttpRequest"
        or request.headers.get("x-session-mode") == "cookie"
    )
    returned_token = None if is_browser_cookie_client else token

    return LoginResponse(access_token=returned_token, user=profile)

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_login)])
def register(payload: RegisterRequest, response: Response, request: Request):
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

    is_production = settings.ENVIRONMENT in ("production", "staging")
    response.set_cookie(
        key="oh_access_token",
        value=token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    is_browser_cookie_client = (
        request.headers.get("x-requested-with") == "XMLHttpRequest"
        or request.headers.get("x-session-mode") == "cookie"
    )
    returned_token = None if is_browser_cookie_client else token

    return RegisterResponse(
        message=f"Registration successful! Your OneHealth ID is {reg_result['onehealth_id']}.",
        user_id=reg_result["user_id"],
        patient_id=reg_result["patient_id"],
        onehealth_id=reg_result["onehealth_id"],
        access_token=returned_token,
        token_type="bearer",
        user=profile
    )

@router.get("/me")
def get_me(request: Request, authorization: Optional[str] = Header(None)):
    user_row = get_current_user(request, authorization)
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
def get_me_workspace(request: Request, authorization: Optional[str] = Header(None)):
    """Authoritative workspace resolution for authenticated user."""
    user_row = get_current_user(request, authorization)
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
def logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    """
    Logs out user, revokes active server-side session, and clears auth cookie.
    Ensures copied bearer tokens cannot continue accessing protected endpoints.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif request and hasattr(request, "cookies") and request.cookies.get("oh_access_token"):
        token = request.cookies.get("oh_access_token")

    if token:
        try:
            import hashlib
            from backend.app.core.session_manager import session_manager
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
            jti = payload.get("jti") or hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]
            user_id = payload.get("uid") or payload.get("user_ref_id") or payload.get("sub")
            session_manager.revoke_token(jti, user_id=user_id, reason="logout")
        except Exception as e:
            logger.debug(f"Logout token revocation notice: {e}")

    res = success_response(data={"message": "Logged out successfully"})
    res.delete_cookie(
        key="oh_access_token",
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT in ("production", "staging")
    )
    return res

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

# --------------------------------------------------------------------------
# SECURE FORGOT PASSWORD, EMAIL OTP & SUPER ADMIN ASSISTANCE WORKFLOW
# --------------------------------------------------------------------------

import uuid
import secrets
import hashlib
import hmac
import re
from datetime import datetime, timedelta, timezone
from backend.app.core.security import get_password_hash
from backend.app.core.rate_limit import SlidingWindowRateLimiter, get_client_ip
from backend.app.services.email_service import email_service

forgot_password_ip_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=600)
forgot_password_email_limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=600)
privileged_reset_limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=900)
otp_verify_ip_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=600)
assistance_request_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=3600)

GENERIC_RESET_INIT_RESPONSE = {
    "message": "If an active account is associated with this email address, a password reset verification code has been dispatched. Please check your inbox and spam folder.",
    "status": "REQUEST_ACCEPTED"
}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def _hash_otp(otp: str) -> str:
    return hashlib.sha256(f"{otp}:{settings.SECRET_KEY}".encode()).hexdigest()

def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(f"{token}:{settings.SECRET_KEY}".encode()).hexdigest()

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

class VerifyResetOtpRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    otp: str = Field(..., min_length=6, max_length=6)

class ResetPasswordConfirmRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    reset_token: str = Field(..., min_length=16, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

class ResendResetOtpRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

class PasswordAssistanceRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    category: str = Field("OTP_DELIVERY", max_length=64)
    description: Optional[str] = Field(None, max_length=1000)
    contact_phone: Optional[str] = Field(None, max_length=20)

@router.post("/forgot-password")
def request_password_reset(payload: ForgotPasswordRequest, request: Request):
    """
    Initiates password recovery by sending a 6-digit OTP to the user's verified registered email.
    Strictly anti-enumeration: displays a generic response regardless of whether an account exists.
    """
    clean_email = payload.email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    client_ip = get_client_ip(request)
    forgot_password_ip_limiter.check(f"fp_ip_{client_ip}")
    forgot_password_email_limiter.check(f"fp_email_{clean_email}")

    user = sp_repository.get_user_by_email(clean_email)
    if not user:
        # Anti-enumeration: Return generic accepted response
        return success_response(data=GENERIC_RESET_INIT_RESPONSE)

    user_role = (user.get("role") or "").upper()
    if user_role in ("HOSPITAL_ADMIN", "SUPER_ADMIN"):
        privileged_reset_limiter.check(f"priv_{user['id']}")

    # Generate 6-digit cryptographically secure numeric OTP
    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    otp_hash = _hash_otp(otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    correlation_id = f"corr-pwd-{uuid.uuid4().hex[:10]}"

    sp_repository.create_password_reset_otp(
        user_id=user["id"],
        email=clean_email,
        otp_hash=otp_hash,
        expires_at=expires_at,
        correlation_id=correlation_id,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent")
    )

    # Dispatch email
    email_service.send_password_reset_otp(
        recipient_email=user["email"],
        otp_code=otp,
        expires_in_minutes=5,
        correlation_id=correlation_id
    )

    return success_response(data=GENERIC_RESET_INIT_RESPONSE)

@router.post("/verify-reset-otp")
def verify_reset_otp(payload: VerifyResetOtpRequest, request: Request):
    """
    Verifies the short-lived 6-digit OTP and generates an ephemeral password reset session token.
    Enforces maximum 5 attempts and short expiry.
    """
    clean_email = payload.email.strip().lower()
    clean_otp = payload.otp.strip()

    if not clean_otp.isdigit() or len(clean_otp) != 6:
        raise HTTPException(status_code=400, detail="Verification code must be a 6-digit number.")

    client_ip = get_client_ip(request)
    otp_verify_ip_limiter.check(f"v_otp_ip_{client_ip}")

    otp_record = sp_repository.get_active_password_reset_otp(clean_email)
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    if otp_record["attempts_count"] >= otp_record["max_attempts"]:
        sp_repository.invalidate_otp(otp_record["id"])
        raise HTTPException(
            status_code=400,
            detail="Maximum verification attempts exceeded. Please request a new verification code."
        )

    attempts = sp_repository.increment_otp_attempts(otp_record["id"])
    candidate_hash = _hash_otp(clean_otp)

    if not hmac.compare_digest(otp_record["otp_hash"], candidate_hash):
        if attempts >= otp_record["max_attempts"]:
            sp_repository.invalidate_otp(otp_record["id"])
            raise HTTPException(
                status_code=400,
                detail="Maximum verification attempts exceeded. Please request a new verification code."
            )
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    # Generate ephemeral reset token for password update
    reset_token = secrets.token_urlsafe(32)
    reset_token_hash = _hash_reset_token(reset_token)

    sp_repository.verify_password_reset_otp(otp_record["id"], reset_token_hash)

    return success_response(data={
        "message": "Verification code confirmed successfully.",
        "reset_token": reset_token,
        "expires_in_seconds": 600
    })

@router.post("/reset-password")
def confirm_password_reset(payload: ResetPasswordConfirmRequest, request: Request):
    """
    Updates the account password using the verified ephemeral reset token.
    Enforces bcrypt hashing, revokes active sessions, and invalidates the reset session.
    """
    clean_email = payload.email.strip().lower()

    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    has_letter = any(c.isalpha() for c in payload.new_password)
    has_digit = any(c.isdigit() or not c.isalnum() for c in payload.new_password)
    if not (has_letter and has_digit):
        raise HTTPException(status_code=400, detail="Password must contain both letters and numbers or symbols.")

    new_hash = get_password_hash(payload.new_password)
    candidate_token_hash = _hash_reset_token(payload.reset_token.strip())

    try:
        user_res = sp_repository.validate_and_consume_reset_token(
            email=clean_email,
            reset_token_hash=candidate_token_hash,
            new_password_hash=new_hash
        )
        return success_response(data={
            "message": "Your password has been reset successfully. Please sign in with your new credentials.",
            "email": user_res.get("email")
        })
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("Failed to complete password reset: %s", e)
        raise HTTPException(status_code=500, detail="Failed to reset password. Please try again.")

@router.post("/resend-reset-otp")
def resend_reset_otp(payload: ResendResetOtpRequest, request: Request):
    """
    Resends password reset OTP subject to cooldown and anti-abuse limits.
    """
    clean_email = payload.email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    client_ip = get_client_ip(request)
    forgot_password_ip_limiter.check(f"fp_ip_{client_ip}")

    # Check cooldown on existing active OTP
    active_otp = sp_repository.get_active_password_reset_otp(clean_email)
    if active_otp:
        created_at = active_otp["created_at"]
        if created_at:
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            delta = (datetime.now(timezone.utc) - created_at).total_seconds()
            if delta < 60:
                cooldown_remaining = int(60 - delta)
                raise HTTPException(
                    status_code=429,
                    detail=f"Please wait {cooldown_remaining} seconds before requesting another verification code."
                )

    user = sp_repository.get_user_by_email(clean_email)
    if not user:
        return success_response(data=GENERIC_RESET_INIT_RESPONSE)

    user_role = (user.get("role") or "").upper()
    if user_role in ("HOSPITAL_ADMIN", "SUPER_ADMIN"):
        privileged_reset_limiter.check(f"priv_{user['id']}")

    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    otp_hash = _hash_otp(otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    correlation_id = f"corr-pwd-resend-{uuid.uuid4().hex[:8]}"

    sp_repository.create_password_reset_otp(
        user_id=user["id"],
        email=clean_email,
        otp_hash=otp_hash,
        expires_at=expires_at,
        correlation_id=correlation_id,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent")
    )

    email_service.send_password_reset_otp(
        recipient_email=user["email"],
        otp_code=otp,
        expires_in_minutes=5,
        correlation_id=correlation_id
    )

    return success_response(data=GENERIC_RESET_INIT_RESPONSE)

@router.post("/request-assistance")
def request_password_assistance(payload: PasswordAssistanceRequest, request: Request):
    """
    Submits a password recovery assistance request to the Super Admin support channel.
    Generates a unique reference number (REQ-2026-XXXXXX) and dispatches an alert email.
    """
    clean_email = payload.email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    client_ip = get_client_ip(request)
    assistance_request_limiter.check(f"asst_ip_{client_ip}")

    category = payload.category.strip().upper()
    if category not in ("OTP_DELIVERY", "OTP_VERIFICATION", "ACCOUNT_RECOVERY"):
        category = "ACCOUNT_RECOVERY"

    ticket = sp_repository.create_password_assistance_ticket(
        email=clean_email,
        category=category,
        description=payload.description,
        contact_phone=payload.contact_phone,
        client_ip=client_ip
    )

    # Notify Super Admin channel via email
    masked = email_service._mask_email(clean_email)
    email_service.send_super_admin_assistance_alert(
        ticket_number=ticket["reference_number"],
        category=category,
        masked_email=masked,
        user_role=ticket.get("user_role"),
        client_ip=client_ip,
        notes=payload.description
    )

    return success_response(data={
        "reference_number": ticket["reference_number"],
        "status": ticket["status"],
        "message": "Your assistance request has been submitted to the Super Admin support team. Please save your reference number for communication."
    })

@router.get("/assistance-status/{reference_number}")
def get_assistance_status(reference_number: str):
    """
    Public lookup for assistance request status by tracking reference number.
    Returns sanitized status without sensitive account data.
    """
    ticket = sp_repository.get_assistance_ticket_by_number(reference_number)
    if not ticket:
        raise HTTPException(status_code=404, detail="Assistance request not found.")

    return success_response(data=ticket, message="Assistance request status loaded")


