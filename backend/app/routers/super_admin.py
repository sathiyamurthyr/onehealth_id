from fastapi import APIRouter, HTTPException, Header, Query, Body, Depends
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.response import success_response, error_response
from backend.app.core.rbac import require_permission, get_current_user_context
import logging

logger = logging.getLogger("ohid.router.super_admin")

router = APIRouter(
    prefix="/super-admin",
    tags=["Sathus Technology Platform Super Admin"],
    dependencies=[Depends(require_permission("system.manage"))]
)

# --------------------------------------------------------------------------
# Request & Response Models
# --------------------------------------------------------------------------

class HospitalStatusUpdateRequest(BaseModel):
    new_status: str = Field(..., description="ACTIVE, SUSPENDED, INACTIVE, UNDER_REVIEW, TERMINATED")
    reason: str = Field(..., min_length=5, description="Mandatory operational or payment audit reason")
    ticket_ref: Optional[str] = None

class ApplicationDecisionRequest(BaseModel):
    decision_notes: Optional[str] = "Approved by Super Admin after regulatory verification."

class ApplicationRejectRequest(BaseModel):
    reason: str = Field(..., min_length=5, description="Mandatory regulatory or statutory rejection reason")

class ApplicationRequestInfoRequest(BaseModel):
    notes: str = Field(..., min_length=5, description="Mandatory details of what information/documents are required")

class ApplicationReviewRequest(BaseModel):
    notes: Optional[str] = "Review started by Super Admin"

class HospitalOnboardRequest(BaseModel):
    name: str = Field(..., min_length=2)
    code: Optional[str] = None
    client_id: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    plan_id: Optional[str] = None
    consultation_fee: Optional[int] = 400

class EnterpriseHospitalWizardRequest(BaseModel):
    display_name: str = Field(..., min_length=2)
    legal_name: Optional[str] = None
    hospital_type: str = "GENERAL"
    ownership_type: str = "PRIVATE"
    registration_number: Optional[str] = None
    registration_authority: Optional[str] = None
    registration_date: Optional[str] = None
    registration_expiry: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Chennai"
    state: Optional[str] = "Tamil Nadu"
    country: Optional[str] = "India"
    pin_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    emergency_contact: Optional[str] = None
    logo_url: Optional[str] = None
    organization_id: Optional[str] = None
    plan_id: Optional[str] = "plan-pro"
    branches: Optional[List[Dict[str, Any]]] = None
    facilities: Optional[List[str]] = None
    departments: Optional[List[str]] = None
    admin_first_name: Optional[str] = "Medical"
    admin_last_name: Optional[str] = "Director"
    admin_email: Optional[str] = None
    admin_mobile: Optional[str] = None
    admin_employee_id: Optional[str] = None
    admin_designation: Optional[str] = "Medical Director / Hospital Administrator"

class MinimalHospitalCreateRequest(BaseModel):
    facility_type: str = "HOSPITAL"
    legal_name: str = Field(..., min_length=2)
    display_name: Optional[str] = None
    code: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_mobile: str = Field(..., min_length=5)
    registered_email: str = Field(..., min_length=3)
    country: str = "India"
    state: str = "Tamil Nadu"
    city: str = "Chennai"
    address: Optional[str] = None
    pin: Optional[str] = None
    registration_number: Optional[str] = None
    registration_authority: Optional[str] = None
    registration_expiry: Optional[str] = None
    admin_first_name: str = "Hospital"
    admin_last_name: str = "Admin"
    admin_mobile: Optional[str] = None
    admin_email: Optional[str] = None
    plan_tier: Optional[str] = "ENTERPRISE"

class ClientCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    code: Optional[str] = None
    client_type: str = "HOSPITAL_GROUP"
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    technical_contact_email: Optional[str] = None
    billing_contact_email: Optional[str] = None
    compliance_contact_email: Optional[str] = None
    account_manager: Optional[str] = "Sathus Key Accounts"

class SubscriptionUpdateRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "MONTHLY"
    discount_percent: float = 0.0

class RecordPaymentRequest(BaseModel):
    invoice_id: str
    amount: float
    payment_mode: str = "RAZORPAY_GATEWAY"
    transaction_ref: Optional[str] = None

class FeatureEntitlementUpdateRequest(BaseModel):
    feature_key: str
    is_enabled: bool

class SupportTicketCreateRequest(BaseModel):
    hospital_id: Optional[str] = None
    client_id: Optional[str] = None
    category: str = "GENERAL"
    priority: str = "MEDIUM"
    subject: str = Field(..., min_length=3)
    description: str = Field(..., min_length=5)
    reported_by_name: Optional[str] = None
    reported_by_email: Optional[str] = None
    reported_by_phone: Optional[str] = None

class SupportTicketUpdateRequest(BaseModel):
    status: str
    resolution_notes: Optional[str] = None
    assigned_to: Optional[str] = None

class ImpersonationStartRequest(BaseModel):
    hospital_id: str
    target_role: str = "HOSPITAL_ADMIN"
    reason: str = Field(..., min_length=5)
    ticket_ref: Optional[str] = None
    duration_minutes: int = 30

class ImpersonationEndRequest(BaseModel):
    session_token: str

# --------------------------------------------------------------------------
# API Endpoints
# --------------------------------------------------------------------------

@router.get("/metrics")
def get_metrics():
    """Returns live aggregated platform metrics: Total/Active/Suspended Hospitals, MRR, Revenue, Doctors, Patients."""
    try:
        data = sp_repository.get_platform_metrics()
        return success_response(data=data, message="Platform metrics loaded")
    except Exception as e:
        logger.error(f"Error loading platform metrics: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/hospitals")
def list_hospitals(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Lists all hospitals across the platform with SaaS plan, client group, doctor/staff counts, and payment status."""
    try:
        data = sp_repository.list_platform_hospitals(
            search=search, status=status, plan=plan, client_id=client_id, limit=limit, offset=offset
        )
        return success_response(data=data, message=f"Loaded {len(data)} hospitals")
    except Exception as e:
        logger.error(f"Error listing platform hospitals: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/hospitals/create-minimal")
def create_hospital_minimal(payload: MinimalHospitalCreateRequest):
    """
    Minimal Super Admin Hospital Creation:
    Creates the healthcare facility account & provisions initial Hospital Admin invitation.
    """
    try:
        res = sp_repository.create_hospital_minimal_super_admin(payload.model_dump())
        return success_response(data=res, message=f"Healthcare facility '{res.get('hospital_name')}' and initial administrator account created successfully")
    except Exception as e:
        logger.error(f"Error in minimal hospital creation: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/hospitals/onboard")
def onboard_hospital(payload: HospitalOnboardRequest):
    """Onboards a new hospital facility, assigns subscription plan, and initializes feature entitlements."""
    try:
        res = sp_repository.onboard_platform_hospital(payload.model_dump())
        return success_response(data=res, message=f"Hospital '{payload.name}' successfully onboarded")
    except Exception as e:
        logger.error(f"Error onboarding hospital: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/hospitals/wizard")
def onboard_hospital_wizard(payload: EnterpriseHospitalWizardRequest):
    """
    Executes production 5-step enterprise hospital onboarding wizard:
    Step 1: Hospital Profile & Legal Registration
    Step 2: Multiple Branches
    Step 3: Clinical Facilities (OPD, IPD, ICU, OT, Pharmacy, Lab, Radiology)
    Step 4: Departments & Specialties
    Step 5: Initial Clinical/Hospital Administrator Account & Cryptographic Single-Use Invitation
    """
    try:
        res = sp_repository.onboard_enterprise_hospital_wizard(payload.model_dump())
        return success_response(data=res, message=f"Hospital '{payload.display_name}' and initial administrator provisioned successfully")
    except Exception as e:
        logger.error(f"Error in hospital onboarding wizard: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/hospitals/{hospital_id}")
def get_hospital_details(hospital_id: str):
    """Returns 360-degree hospital profile with organization details, subscriptions, invoices, and feature entitlements."""
    try:
        data = sp_repository.get_platform_hospital_details(hospital_id)
        if not data:
            raise HTTPException(status_code=404, detail="Hospital not found")
        return success_response(data=data, message="Hospital details loaded")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching hospital details for {hospital_id}: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/hospitals/{hospital_id}/status")
def update_hospital_status(
    hospital_id: str,
    payload: HospitalStatusUpdateRequest,
    authorization: Optional[str] = Header(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Updates hospital status (ACTIVE, SUSPENDED, INACTIVE, etc.) with mandatory audit reason."""
    try:
        admin_user_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-admin"
        res = sp_repository.update_platform_hospital_status(
            hospital_id=hospital_id,
            new_status=payload.new_status,
            reason=payload.reason,
            ticket_ref=payload.ticket_ref,
            admin_user_id=admin_user_id
        )
        return success_response(data=res, message=res.get("message", "Status updated"))
    except Exception as e:
        logger.error(f"Error updating hospital status: {e}")
        return error_response(message=str(e), status_code=500)

# --------------------------------------------------------------------------
# Hospital & Clinic Registration Application Review & Approval Workflow
# --------------------------------------------------------------------------

@router.get("/applications")
def list_facility_applications(
    status: Optional[str] = Query(None, description="SUBMITTED, UNDER_REVIEW, NEEDS_INFORMATION, APPROVED, REJECTED, SUSPENDED, ALL"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Lists hospital & clinic registration applications awaiting or undergoing Super Admin review.
    """
    try:
        apps = sp_repository.list_facility_applications_super_admin(
            status=status, search=search, limit=limit, offset=offset
        )
        return success_response(data=apps, message=f"Loaded {len(apps)} facility applications")
    except Exception as e:
        logger.error(f"Error listing facility applications: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/applications/{hospital_id}")
def get_facility_application_details(hospital_id: str):
    """
    360-degree review view of a hospital/clinic application including uploaded documents and audit trail.
    """
    try:
        app_details = sp_repository.get_facility_application_details_super_admin(hospital_id)
        if not app_details:
            raise HTTPException(status_code=404, detail="Facility application not found")
        return success_response(data=app_details, message="Facility application details loaded")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading facility application details: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/applications/{hospital_id}/review")
def review_facility_application(
    hospital_id: str,
    payload: Optional[ApplicationReviewRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Transitions application from SUBMITTED to UNDER_REVIEW.
    """
    try:
        notes = payload.notes if payload else "Super Admin review started"
        admin_user_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-admin"
        admin_username = current_user.get("username") or "admin"
        res = sp_repository.review_facility_application_super_admin(
            hospital_id=hospital_id,
            admin_user_id=admin_user_id,
            admin_username=admin_username,
            notes=notes
        )
        return success_response(data=res, message=res.get("message", "Application moved to UNDER_REVIEW"))
    except Exception as e:
        logger.error(f"Error starting review for {hospital_id}: {e}")
        return error_response(message=str(e), status_code=400)

@router.post("/applications/{hospital_id}/approve")
def approve_facility_application(
    hospital_id: str,
    payload: ApplicationDecisionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Explicit Super Admin approval. Atomically transitions lifecycle_status to APPROVED,
    sets is_active=True, provisions default main branch, activates verification record.
    """
    try:
        admin_user_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-admin"
        admin_username = current_user.get("username") or "admin"
        res = sp_repository.approve_facility_application_super_admin(
            hospital_id=hospital_id,
            admin_user_id=admin_user_id,
            admin_username=admin_username,
            decision_notes=payload.decision_notes or "Approved by Super Admin"
        )
        return success_response(data=res, message=res.get("message", "Facility approved successfully"))
    except Exception as e:
        logger.error(f"Error approving facility {hospital_id}: {e}")
        return error_response(message=str(e), status_code=400)

@router.post("/applications/{hospital_id}/reject")
def reject_facility_application(
    hospital_id: str,
    payload: ApplicationRejectRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Explicit Super Admin rejection with mandatory audit reason.
    """
    try:
        admin_user_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-admin"
        admin_username = current_user.get("username") or "admin"
        res = sp_repository.reject_facility_application_super_admin(
            hospital_id=hospital_id,
            admin_user_id=admin_user_id,
            admin_username=admin_username,
            reason=payload.reason
        )
        return success_response(data=res, message=res.get("message", "Facility application rejected"))
    except Exception as e:
        logger.error(f"Error rejecting facility {hospital_id}: {e}")
        return error_response(message=str(e), status_code=400)

@router.post("/applications/{hospital_id}/request-info")
def request_info_facility_application(
    hospital_id: str,
    payload: ApplicationRequestInfoRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Requests additional documentation or clarification from the applicant (NEEDS_INFORMATION state).
    """
    try:
        admin_user_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-admin"
        admin_username = current_user.get("username") or "admin"
        res = sp_repository.request_info_facility_application_super_admin(
            hospital_id=hospital_id,
            admin_user_id=admin_user_id,
            admin_username=admin_username,
            notes=payload.notes
        )
        return success_response(data=res, message=res.get("message", "Information requested from applicant"))
    except Exception as e:
        logger.error(f"Error requesting info for facility {hospital_id}: {e}")
        return error_response(message=str(e), status_code=400)

@router.get("/hospitals/{hospital_id}/features")
@router.get("/features/{hospital_id}")
def get_hospital_features(hospital_id: str):
    """Returns granular module feature entitlements for a hospital."""
    try:
        feats = sp_repository.get_hospital_feature_entitlements(hospital_id)
        return success_response(data=feats, message="Feature entitlements loaded")
    except Exception as e:
        logger.error(f"Error loading features for {hospital_id}: {e}")
        return error_response(message=str(e), status_code=500)

@router.put("/hospitals/{hospital_id}/features")
@router.put("/features/{hospital_id}")
def update_hospital_features(hospital_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates module feature gating per hospital."""
    try:
        res = sp_repository.update_hospital_feature_entitlements(hospital_id, payload)
        return success_response(data=res, message="Feature entitlements updated")
    except Exception as e:
        logger.error(f"Error updating features for {hospital_id}: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/clients")
def list_clients(
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Lists client organizations, hospital groups, clinic chains, and government healthcare missions."""
    try:
        data = sp_repository.list_platform_clients(search=search, limit=limit, offset=offset)
        return success_response(data=data, message=f"Loaded {len(data)} clients")
    except Exception as e:
        logger.error(f"Error listing clients: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/clients/{client_id}")
def get_client_details(client_id: str):
    """Returns client group profile, contact roles, linked hospitals, and contract details."""
    try:
        data = sp_repository.get_platform_client_details(client_id)
        if not data:
            raise HTTPException(status_code=404, detail="Client not found")
        return success_response(data=data, message="Client details loaded")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client {client_id}: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/clients")
def create_client(payload: ClientCreateRequest):
    """Creates a new client organization / hospital group."""
    try:
        res = sp_repository.create_platform_client(payload.model_dump())
        return success_response(data=res, message=f"Client '{payload.name}' created")
    except Exception as e:
        logger.error(f"Error creating client: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/subscriptions")
def list_subscriptions():
    """Lists SaaS subscription plan definitions and all active hospital contracts."""
    try:
        data = sp_repository.list_platform_subscriptions()
        return success_response(data=data, message="Subscriptions loaded")
    except Exception as e:
        logger.error(f"Error loading subscriptions: {e}")
        return error_response(message=str(e), status_code=500)

@router.put("/subscriptions/{hospital_id}")
def update_subscription(hospital_id: str, payload: SubscriptionUpdateRequest):
    """Modifies subscription plan or billing cycle for a hospital."""
    try:
        res = sp_repository.update_platform_subscription(
            hospital_id=hospital_id,
            plan_id=payload.plan_id,
            billing_cycle=payload.billing_cycle,
            discount_percent=payload.discount_percent
        )
        return success_response(data=res, message=res.get("message", "Subscription updated"))
    except Exception as e:
        logger.error(f"Error updating subscription: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/payments")
def list_payments(
    status: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Lists SaaS invoices and revenue collections across all hospitals."""
    try:
        data = sp_repository.list_platform_saas_invoices(
            status=status, hospital_id=hospital_id, client_id=client_id, limit=limit, offset=offset
        )
        return success_response(data=data, message=f"Loaded {len(data)} SaaS invoices")
    except Exception as e:
        logger.error(f"Error listing SaaS invoices: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/payments/record")
def record_payment(payload: RecordPaymentRequest):
    """Manually or programmatically records a SaaS payment collection against an invoice."""
    try:
        res = sp_repository.record_platform_saas_payment(
            invoice_id=payload.invoice_id,
            amount=payload.amount,
            payment_mode=payload.payment_mode,
            transaction_ref=payload.transaction_ref
        )
        return success_response(data=res, message=res.get("message", "Payment recorded"))
    except Exception as e:
        logger.error(f"Error recording payment: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/features/{hospital_id}")
def get_features(hospital_id: str):
    """Returns the complete feature entitlement matrix for a hospital."""
    try:
        data = sp_repository.get_platform_feature_entitlements(hospital_id)
        return success_response(data=data, message=f"Loaded {len(data)} features")
    except Exception as e:
        logger.error(f"Error fetching features for {hospital_id}: {e}")
        return error_response(message=str(e), status_code=500)

@router.put("/features/{hospital_id}")
def update_feature(hospital_id: str, payload: FeatureEntitlementUpdateRequest):
    """Enables or disables a specific feature for a hospital."""
    try:
        res = sp_repository.update_platform_feature_entitlement(
            hospital_id=hospital_id,
            feature_key=payload.feature_key,
            is_enabled=payload.is_enabled
        )
        return success_response(data=res, message=res.get("message", "Feature updated"))
    except Exception as e:
        logger.error(f"Error updating feature for {hospital_id}: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/support")
def list_support_tickets(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Lists customer support tickets from hospitals and clients."""
    try:
        data = sp_repository.list_platform_support_tickets(
            status=status, category=category, priority=priority, limit=limit, offset=offset
        )
        return success_response(data=data, message=f"Loaded {len(data)} support tickets")
    except Exception as e:
        logger.error(f"Error listing support tickets: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/support")
def create_support_ticket(payload: SupportTicketCreateRequest):
    """Creates a new customer support ticket."""
    try:
        res = sp_repository.create_platform_support_ticket(payload.model_dump())
        return success_response(data=res, message=f"Ticket {res.get('ticket_number')} created")
    except Exception as e:
        logger.error(f"Error creating support ticket: {e}")
        return error_response(message=str(e), status_code=500)

@router.put("/support/{ticket_id}")
def update_support_ticket(ticket_id: str, payload: SupportTicketUpdateRequest):
    """Updates status, resolution notes, and agent assignment for a support ticket."""
    try:
        res = sp_repository.update_platform_support_ticket(
            ticket_id=ticket_id,
            status=payload.status,
            resolution_notes=payload.resolution_notes,
            assigned_to=payload.assigned_to
        )
        return success_response(data=res, message="Support ticket updated")
    except Exception as e:
        logger.error(f"Error updating support ticket: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/impersonation/start")
def start_impersonation(payload: ImpersonationStartRequest):
    """Starts an audited temporary support impersonation session."""
    try:
        res = sp_repository.start_platform_impersonation_session(
            hospital_id=payload.hospital_id,
            target_role=payload.target_role,
            reason=payload.reason,
            ticket_ref=payload.ticket_ref,
            duration_minutes=payload.duration_minutes
        )
        return success_response(data=res, message="Audited support session started")
    except Exception as e:
        logger.error(f"Error starting impersonation session: {e}")
        return error_response(message=str(e), status_code=500)

@router.post("/impersonation/end")
def end_impersonation(payload: ImpersonationEndRequest):
    """Ends an active impersonation session."""
    try:
        res = sp_repository.end_platform_impersonation_session(payload.session_token)
        return success_response(data=res, message="Impersonation session concluded")
    except Exception as e:
        logger.error(f"Error ending impersonation session: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/audit")
def list_audit_logs(
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Returns platform-wide administrative audit trail logs."""
    try:
        data = sp_repository.list_platform_audit_logs(entity_type=entity_type, limit=limit, offset=offset)
        return success_response(data=data, message=f"Loaded {len(data)} audit records")
    except Exception as e:
        logger.error(f"Error loading audit logs: {e}")
        return error_response(message=str(e), status_code=500)

@router.get("/health")
def get_health():
    """Returns real-time platform health, DB latency, schema metrics, and gateway statuses."""
    try:
        data = sp_repository.get_platform_system_health()
        return success_response(data=data, message="System health online")
    except Exception as e:
        logger.error(f"Error fetching system health: {e}")
        return error_response(message=str(e), status_code=500)
