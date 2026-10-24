from fastapi import HTTPException, Header, Depends, Request
from typing import Optional, List, Callable, Dict, Any
from jose import jwt
from backend.app.core.config import settings
from backend.app.repositories.sp_views_repository import sp_repository

def get_optional_user_context(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_hospital_ref_id: Optional[str] = Header(None, alias="X-Hospital-Ref-Id"),
    x_usertype_ref_id: Optional[str] = Header(None, alias="X-Usertype-Ref-Id")
) -> Optional[Dict[str, Any]]:
    """Safe optional user context resolution that does not raise HTTP 401 when unauthenticated."""
    try:
        return get_current_user_context(request, authorization, x_hospital_ref_id, x_usertype_ref_id)
    except Exception:
        return None

def get_current_user_context(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_hospital_ref_id: Optional[str] = Header(None, alias="X-Hospital-Ref-Id"),
    x_usertype_ref_id: Optional[str] = Header(None, alias="X-Usertype-Ref-Id")
) -> Dict[str, Any]:
    """
    Authoritative Centralized Authentication & Workspace Resolution.
    Decodes JWT from Authorization header or secure HttpOnly cookie, extracts user, active hospital context, and role.
    Resolves complete user workspace & permissions from PostgreSQL views (vw_user_workspaces)
    based on user_ref_id, hospital_ref_id, and usertype_ref_id.
    """
    token = None
    using_cookie = False
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif request and hasattr(request, "cookies") and request.cookies.get("oh_access_token"):
        token = request.cookies.get("oh_access_token")
        using_cookie = True

    if not token:
        raise HTTPException(status_code=401, detail="Authentication credentials were not provided")

    # Enforce CSRF protection for state-changing requests when authenticated via cookie
    if using_cookie and request and hasattr(request, "method") and request.method in ("POST", "PUT", "PATCH", "DELETE"):
        x_requested_with = request.headers.get("x-requested-with")
        sec_fetch_site = request.headers.get("sec-fetch-site")
        if not x_requested_with and sec_fetch_site == "cross-site":
            raise HTTPException(status_code=403, detail="Cross-site request forgery protection triggered")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    username = payload.get("sub")
    user_ref_id = payload.get("uid") or payload.get("user_ref_id") or payload.get("id")
    hospital_ref_id = x_hospital_ref_id or payload.get("hospital_ref_id") or payload.get("hospital_id")
    usertype_ref_id = x_usertype_ref_id or payload.get("usertype_ref_id") or payload.get("role_id")
    role_code = payload.get("role")

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
        usertype_ref_id=usertype_ref_id,
        role_code=role_code
    )

    if not workspace:
        # Fallback to vw_user_auth if user is in transition
        auth_row = sp_repository.get_user_by_id(user_ref_id)
        if not auth_row:
            if payload.get("permissions") or payload.get("role"):
                user_context = {
                    "id": user_ref_id,
                    "user_ref_id": user_ref_id,
                    "username": username or "user",
                    "name": payload.get("name", username or "User"),
                    "role": payload.get("role", "STAFF"),
                    "usertype_ref_id": usertype_ref_id or f"role-{payload.get('role', 'staff').lower()}",
                    "workspace_type": payload.get("workspace_type", "EMPLOYEE"),
                    "default_route": payload.get("default_route", "/employee"),
                    "hospital_id": payload.get("hospital_ref_id") or payload.get("hospital_id") or hospital_ref_id,
                    "hospital_ref_id": payload.get("hospital_ref_id") or payload.get("hospital_id") or hospital_ref_id,
                    "hospital_name": payload.get("hospital_name", "Kedar Hospital"),
                    "tenant_id": payload.get("tenant_id", "ten-kedar"),
                    "tenant_name": payload.get("tenant_name", "Kedar Healthcare Group"),
                    "permissions": payload.get("permissions") or [],
                    "roles": payload.get("roles") or [payload.get("role", "STAFF")]
                }
            else:
                raise HTTPException(status_code=403, detail="User account is deactivated")
        else:
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

            user_context = {
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
    else:
        raw_ws_perms = workspace.get("permissions") or []
        if isinstance(raw_ws_perms, str):
            try:
                raw_ws_perms = json.loads(raw_ws_perms)
            except Exception:
                raw_ws_perms = []
        jwt_perms = payload.get("permissions") or []
        combined_ws_perms = list(dict.fromkeys(list(raw_ws_perms) + list(jwt_perms)))

        user_context = {
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

    # =========================================================================
    # ORGANIZATION APPROVAL & CLINICAL STAFF AUTHORIZATION GATE
    # =========================================================================
    user_roles = user_context.get("roles") or [user_context.get("role")]
    user_perms = user_context.get("permissions") or []

    # Super Admin and Platform Admin bypass organization approval gate
    if "SUPER_ADMIN" in user_roles or "PLATFORM_ADMIN" in user_roles or "system.manage" in user_perms:
        return user_context

    # Verify hospital facility lifecycle status dynamically
    hosp_id = user_context.get("hospital_ref_id") or user_context.get("hospital_id")
    if hosp_id:
        hosp_status = sp_repository.get_hospital_approval_status(hosp_id)
        if not hosp_status:
            raise HTTPException(status_code=403, detail="Forbidden: Organization facility not found or unauthorized.")

        lifecycle = (hosp_status.get("lifecycle_status") or "").upper()
        is_active = hosp_status.get("is_active")

        if lifecycle in ("SUBMITTED", "PENDING", "UNDER_REVIEW"):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Hospital/Clinic registration is pending Super Admin review and approval."
            )
        elif lifecycle == "NEEDS_INFORMATION":
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Hospital/Clinic application requires additional information before approval."
            )
        elif lifecycle == "REJECTED":
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Hospital/Clinic application was rejected by Super Admin."
            )
        elif lifecycle == "SUSPENDED" or not is_active:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Hospital/Clinic facility has been suspended by Super Admin."
            )
        elif lifecycle != "APPROVED" and hosp_status.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: Organization facility access not authorized (Status: {lifecycle})."
            )

        # Enforce distinct clinical staff authorization
        role_code = (user_context.get("role") or "").upper()
        if role_code in ("DOCTOR", "NURSE", "CLINICAL_STAFF", "LAB_TECHNICIAN", "PHARMACIST", "RADIOLOGIST"):
            membership = sp_repository.check_staff_membership_authorization(
                user_id=user_context.get("user_ref_id") or user_context.get("id"),
                hospital_id=hosp_id
            )
            if not membership or not membership.get("is_active"):
                raise HTTPException(
                    status_code=403,
                    detail="Forbidden: Clinical staff member is not authorized or active for this hospital."
                )
            verif = (membership.get("verification_status") or "").upper()
            if verif not in ("VERIFIED", "APPROVED"):
                raise HTTPException(
                    status_code=403,
                    detail="Forbidden: Clinical staff member credentials have not been verified and authorized by the hospital."
                )

    return user_context

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


def record_audit_log(
    actor_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    hospital_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    actor_name: Optional[str] = None,
    tenant_id: Optional[str] = None,
    ip_address: str = "127.0.0.1"
) -> None:
    """
    Mandatory compliance and security audit trail.
    Persists audit records into oh_id.audit_logs and emits structured security logs.
    Strictly scrubs secrets and credentials.
    """
    import uuid
    import json
    from backend.app.database.session import get_db_cursor
    from backend.app.core.logging import log_security_event, logger

    sanitized_details = {}
    if details:
        for k, v in details.items():
            if any(secret_term in k.lower() for secret_term in ["pass", "token", "secret", "auth", "key", "cred"]):
                sanitized_details[k] = "[REDACTED]"
            else:
                sanitized_details[k] = v

    audit_id = f"audit-{uuid.uuid4().hex[:12]}"
    try:
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.audit_logs (
                    id, actor_id, actor_name, tenant_id, hospital_id,
                    action, resource_type, resource_id, details, ip_address, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, CURRENT_TIMESTAMP);
            """, (
                audit_id,
                actor_id,
                actor_name,
                tenant_id,
                hospital_id,
                action,
                resource_type,
                resource_id,
                json.dumps(sanitized_details),
                ip_address
            ))
    except Exception as e:
        logger.error("Failed to insert into oh_id.audit_logs: %s", e, exc_info=True)
        raise

    log_security_event(
        event_type=action,
        actor_id=actor_id,
        resource=f"{resource_type}:{resource_id}",
        status=sanitized_details.get("outcome", "SUCCESS"),
        details=sanitized_details
    )


def verify_clinical_record_access(
    patient_id: str,
    user: Dict[str, Any],
    required_category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Unified authoritative clinical record access policy enforcement.
    1. Authenticates clinician role or patient self-read boundary.
    2. Validates same-hospital clinical access (preserving existing single-facility workflows).
    3. For cross-hospital access:
       - Checks global/tenant flag: settings.ENABLE_CROSS_HOSPITAL_SHARING.
       - Strictly checks for an active, unexpired, GRANTED consent artifact in oh_id.abdm_consent_artifacts.
       - Validates requested scope / category against consented categories.
       - Logs mandatory audit event (allowed or denied) in oh_id.audit_logs.
       - Returns safe 404 error on denial to avoid disclosing patient existence at other hospitals.
       - Ensures audit failures fail closed to prevent silent unauthorized disclosures.
    """
    import json
    from backend.app.database.session import get_readonly_cursor
    from backend.app.core.logging import logger

    user_perms = user.get("permissions") or []
    roles = user.get("roles") or [user.get("role")]

    # 1. Platform Admin / Super Admin platform-wide override
    if any(r in ["PLATFORM_ADMIN", "SUPER_ADMIN"] for r in roles) or "system.manage" in user_perms:
        patient = sp_repository.get_patient_by_id(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient record not found")
        return patient

    # 2. Patient self-read boundary
    if "patient.self.read" in user_perms and "consultation.read" not in user_perms and "clinical.read" not in user_perms:
        patient = sp_repository.get_patient_by_id(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient record not found")
        user_ref_id = user.get("user_ref_id") or user.get("id")
        if user_ref_id != patient.get("user_id") and user_ref_id != patient.get("id"):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Patient context violation. You may only access your own clinical records."
            )
        return patient

    # 3. Clinician verification
    is_clinician = any(r in ["DOCTOR", "CHIEF_MEDICAL_OFFICER", "RESIDENT"] for r in roles) or any(
        p in user_perms for p in ["clinical.read", "consultation.read", "consultation.create", "patient.read"]
    )
    if not is_clinician:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Clinical access restricted to licensed medical practitioners."
        )

    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    user_hospital = user.get("hospital_ref_id") or user.get("hospital_id")
    patient_hospital = patient.get("hospital_id")

    # 4. Same-hospital access: normal clinical workflow preserved
    if not patient_hospital or not user_hospital or user_hospital == patient_hospital:
        return patient

    # If clinician has verified active staff membership in patient's hospital, access is authorized
    user_id = user.get("user_ref_id") or user.get("id")
    if user_id and patient_hospital:
        doc_mem = sp_repository.check_staff_membership_authorization(user_id=user_id, hospital_id=patient_hospital)
        if doc_mem and doc_mem.get("is_active") and (doc_mem.get("verification_status") or "").upper() in ("VERIFIED", "APPROVED"):
            return patient

    # 5. Cross-hospital access: check consent & network sharing settings
    actor_id = user.get("user_ref_id") or user.get("id") or user.get("username") or "unknown"
    actor_name = user.get("name") or user.get("username")
    tenant_id = user.get("tenant_id")

    # Check pilot isolation setting
    if not settings.ENABLE_CROSS_HOSPITAL_SHARING:
        record_audit_log(
            actor_id=actor_id,
            actor_name=actor_name,
            hospital_id=user_hospital,
            tenant_id=tenant_id,
            action="CROSS_HOSPITAL_ACCESS_DENIED",
            resource_type="patients",
            resource_id=patient_id,
            details={
                "requesting_hospital_id": user_hospital,
                "provider_hospital_id": patient_hospital,
                "reason": "Cross-hospital data sharing is disabled for this deployment.",
                "outcome": "DENIED"
            }
        )
        # Safe error: Do not disclose whether patient exists at another hospital
        raise HTTPException(status_code=404, detail="Patient record not found")

    # Query active consent artifact
    active_consent = None
    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT * FROM oh_id.abdm_consent_artifacts
            WHERE patient_id = %s
              AND requester_hospital_id = %s
              AND consent_status = 'GRANTED'
              AND expires_at > CURRENT_TIMESTAMP;
        """, (patient["id"], user_hospital))
        row = cur.fetchone()
        if row:
            active_consent = dict(row)

    if not active_consent:
        record_audit_log(
            actor_id=actor_id,
            actor_name=actor_name,
            hospital_id=user_hospital,
            tenant_id=tenant_id,
            action="CROSS_HOSPITAL_ACCESS_DENIED",
            resource_type="patients",
            resource_id=patient_id,
            details={
                "requesting_hospital_id": user_hospital,
                "provider_hospital_id": patient_hospital,
                "reason": "No active, unexpired consent granted by patient for requesting hospital.",
                "outcome": "DENIED"
            }
        )
        raise HTTPException(status_code=404, detail="Patient record not found")

    cats = active_consent.get("data_categories")
    if isinstance(cats, str):
        try:
            cats = json.loads(cats)
        except Exception:
            cats = [cats]
    elif not isinstance(cats, list):
        cats = []

    if required_category and required_category not in cats:
        record_audit_log(
            actor_id=actor_id,
            actor_name=actor_name,
            hospital_id=user_hospital,
            tenant_id=tenant_id,
            action="CROSS_HOSPITAL_SCOPE_DENIED",
            resource_type="patients",
            resource_id=patient_id,
            details={
                "requesting_hospital_id": user_hospital,
                "provider_hospital_id": patient_hospital,
                "consent_id": active_consent.get("consent_id"),
                "required_category": required_category,
                "consented_categories": cats,
                "reason": f"Category '{required_category}' not granted in active patient consent.",
                "outcome": "DENIED"
            }
        )
        raise HTTPException(status_code=404, detail="Patient record not found")

    # Audit log for allowed access: Fail closed if audit insert fails
    try:
        record_audit_log(
            actor_id=actor_id,
            actor_name=actor_name,
            hospital_id=user_hospital,
            tenant_id=tenant_id,
            action="CROSS_HOSPITAL_RECORD_ACCESSED",
            resource_type="patients",
            resource_id=patient_id,
            details={
                "requesting_hospital_id": user_hospital,
                "provider_hospital_id": patient_hospital,
                "consent_id": active_consent.get("consent_id"),
                "purpose": active_consent.get("purpose_code", "CARETREAT"),
                "authorized_categories": cats,
                "outcome": "ALLOWED"
            }
        )
    except Exception as audit_err:
        logger.error("Audit logging failure prevented cross-hospital disclosure: %s", audit_err, exc_info=True)
        raise HTTPException(status_code=500, detail="Security audit logging failure: access denied.")

    patient["_active_consent"] = active_consent
    patient["active_consent"] = active_consent
    return patient
