"""
OH-ID Phase 5: Hospital Enterprise Billing, Invoices, Payments, Receipts & Refunds Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    require_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/hospital/billing", tags=["Hospital Enterprise Billing"])

# =========================================================================
# SCHEMAS
# =========================================================================

class ChargeCreateRequest(BaseModel):
    hospital_id: str
    patient_id: str
    billing_account_id: Optional[str] = None
    encounter_id: Optional[str] = None
    admission_id: Optional[str] = None
    source_type: str = "OPD_CONSULTATION"
    source_ref_id: Optional[str] = None
    service_id: Optional[str] = None
    description: str
    quantity: float = 1.00
    unit_price: float
    discount_amount: float = 0.00
    tax_amount: float = 0.00
    payer_responsibility: float = 0.00
    patient_responsibility: Optional[float] = None

class InvoiceCreateFromChargesRequest(BaseModel):
    hospital_id: str
    patient_id: str
    charge_ids: List[str]
    billing_account_id: Optional[str] = None
    payer_id: Optional[str] = None
    discount: float = 0.00
    due_days: int = 15

class InvoiceCancelRequest(BaseModel):
    reason: str = Field(..., min_length=5)

class InvoiceAdjustmentRequest(BaseModel):
    hospital_id: str
    patient_id: str
    charge_id: Optional[str] = None
    adjustment_type: str = "DISCOUNT"  # DISCOUNT, WRITE_OFF, CREDIT_NOTE, CORRECTION
    adjustment_delta: float
    reason: str = Field(..., min_length=5)

class PaymentRecordRequest(BaseModel):
    amount: float
    payment_mode: str = "UPI"
    transaction_ref: Optional[str] = None
    gateway_name: Optional[str] = None
    gateway_transaction_id: Optional[str] = None
    gateway_signature: Optional[str] = None
    idempotency_key: Optional[str] = None

class RefundRequestPayload(BaseModel):
    hospital_id: str
    invoice_id: str
    payment_id: Optional[str] = None
    patient_id: str
    amount: float
    reason: str = Field(..., min_length=5)

# =========================================================================
# 1. CHARGES
# =========================================================================

@router.get("/charges")
def list_charges(
    hospital_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    billing_account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage"))
):
    """Lists posted clinical and operational charge items."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_charges(
        hospital_id=target_hosp,
        patient_id=patient_id,
        billing_account_id=billing_account_id,
        status=status
    )

@router.post("/charges")
def post_charge(
    payload: ChargeCreateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.create", "billing.manage", "system.manage", "doctor.workspace"))
):
    """Posts a new billable charge from an encounter or clinical order."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    try:
        data = payload.model_dump()
        data["posted_by"] = user.get("username") or user.get("id") or "usr-billing"
        res = sp_repository.post_charge(data)
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to post charge: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 2. INVOICES & LIFECYCLE
# =========================================================================

@router.get("/invoices")
def list_invoices(
    hospital_id: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage"))
):
    """Lists hospital invoices with search and payment status filtering."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_invoices(
        hospital_id=target_hosp,
        payment_status=payment_status,
        patient_id=patient_id,
        search=search,
        limit=limit,
        offset=offset
    )

@router.post("/invoices")
def create_invoice_from_charges(
    payload: InvoiceCreateFromChargesRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.create", "billing.manage", "system.manage"))
):
    """Generates an invoice from posted clinical charge items."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    try:
        inv = sp_repository.create_invoice_from_charges(
            hospital_id=payload.hospital_id,
            patient_id=payload.patient_id,
            charge_ids=payload.charge_ids,
            billing_account_id=payload.billing_account_id,
            payer_id=payload.payer_id,
            discount=Decimal(str(payload.discount)),
            due_days=payload.due_days
        )
        return {"success": True, "data": inv}
    except Exception as e:
        logger.error("Failed to create invoice: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage", "patient.self.read"))
):
    """Retrieves full invoice details including line items and payment transactions."""
    inv = sp_repository.get_invoice_details(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # IDOR checks
    user_perms = user.get("permissions", [])
    if "patient.self.read" in user_perms and "billing.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        if inv.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's invoice")
    else:
        validate_hospital_tenant_scope(user, inv.get("hospital_id"))

    return inv

@router.post("/invoices/{invoice_id}/issue")
def issue_invoice(
    invoice_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Transitions draft invoice to ISSUED / PENDING state."""
    inv = sp_repository.get_invoice_details(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    validate_hospital_tenant_scope(user, inv.get("hospital_id"))

    res = sp_repository.issue_invoice(invoice_id, issued_by=user.get("username") or "usr-billing")
    return {"success": True, "message": "Invoice issued successfully", "data": res}

@router.post("/invoices/{invoice_id}/cancel")
def cancel_invoice(
    invoice_id: str,
    payload: InvoiceCancelRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Cancels an invoice with audit justification."""
    inv = sp_repository.get_invoice_details(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    validate_hospital_tenant_scope(user, inv.get("hospital_id"))

    res = sp_repository.cancel_invoice(invoice_id, reason=payload.reason, cancelled_by=user.get("username") or "usr-billing")
    return {"success": True, "message": "Invoice cancelled successfully", "data": res}

@router.post("/invoices/{invoice_id}/adjust")
def adjust_invoice(
    invoice_id: str,
    payload: InvoiceAdjustmentRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Creates a controlled billing adjustment (discount / write-off / credit note)."""
    inv = sp_repository.get_invoice_details(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    validate_hospital_tenant_scope(user, inv.get("hospital_id"))

    data = payload.model_dump()
    data["invoice_id"] = invoice_id
    data["authorized_by"] = user.get("username") or "usr-admin"
    res = sp_repository.create_billing_adjustment(data)
    return {"success": True, "data": res}

# =========================================================================
# 3. PAYMENTS & DIGITAL RECEIPTS
# =========================================================================

@router.post("/invoices/{invoice_id}/payments")
def record_payment(
    invoice_id: str,
    payload: PaymentRecordRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.pay", "billing.manage", "system.manage", "patient.self.pay"))
):
    """Records and verifies an invoice payment, auto-generating a digital receipt."""
    inv = sp_repository.get_invoice_details(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    user_perms = user.get("permissions", [])
    if "patient.self.pay" in user_perms and "billing.pay" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        if inv.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot pay another patient's invoice")
    else:
        validate_hospital_tenant_scope(user, inv.get("hospital_id"))

    try:
        pay_res = sp_repository.record_and_verify_payment(
            invoice_id=invoice_id,
            amount=Decimal(str(payload.amount)),
            payment_mode=payload.payment_mode,
            transaction_ref=payload.transaction_ref,
            gateway_name=payload.gateway_name,
            gateway_transaction_id=payload.gateway_transaction_id,
            gateway_signature=payload.gateway_signature,
            idempotency_key=payload.idempotency_key,
            actor_id=user.get("username") or user.get("id") or "usr-billing"
        )
        return {"success": True, "data": pay_res}
    except Exception as e:
        logger.error("Payment recording failed for %s: %s", invoice_id, e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/receipts")
def list_receipts(
    hospital_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage", "patient.self.read"))
):
    """Lists digital payment settlement receipts."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    user_perms = user.get("permissions", [])
    if "patient.self.read" in user_perms and "billing.read" not in user_perms and "system.manage" not in user_perms:
        patient_id = user.get("user_ref_id") or user.get("id")
        target_hosp = None
    else:
        validate_hospital_tenant_scope(user, target_hosp)

    return sp_repository.list_payment_receipts(hospital_id=target_hosp, patient_id=patient_id)

# =========================================================================
# 4. REFUNDS
# =========================================================================

@router.get("/refunds")
def list_refunds(
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage"))
):
    """Lists refund requests and audit statuses."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_refunds(hospital_id=target_hosp, status=status)

@router.post("/refunds")
def request_refund(
    payload: RefundRequestPayload,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Initiates a formal refund request."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    data = payload.model_dump()
    data["requested_by"] = user.get("username") or "usr-billing"
    res = sp_repository.request_refund(data)
    return {"success": True, "data": res}

@router.post("/refunds/{refund_id}/approve")
def approve_refund(
    refund_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Approves an initiated refund request."""
    res = sp_repository.approve_refund(refund_id, approved_by=user.get("username") or "usr-admin")
    return {"success": True, "data": res}

@router.post("/refunds/{refund_id}/process")
def process_refund(
    refund_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Finalizes and executes a refund settlement."""
    res = sp_repository.process_refund(refund_id, processed_by=user.get("username") or "usr-finance")
    return {"success": True, "data": res}
