from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from backend.app.schemas.models import InvoiceResponse, PaymentRequest
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    require_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/billing", tags=["Billing & Payments"])

@router.get("/invoices", response_model=List[InvoiceResponse])
def list_invoices(
    user: Dict[str, Any] = Depends(require_any_permission(
        "billing.read", "billing.manage", "system.manage", "patient.self.read"
    ))
):
    """
    Returns billing invoices for the authorized facility context.
    Patients are restricted strictly to their own billing records.
    """
    user_perms = user.get("permissions", [])
    try:
        invoices = sp_repository.list_billing_invoices()
        
        # Patient role: only return invoices belonging to self
        if "patient.self.read" in user_perms and "billing.read" not in user_perms and "system.manage" not in user_perms:
            user_ref_id = user.get("user_ref_id") or user.get("id")
            return [inv for inv in invoices if inv.get("patient_id") == user_ref_id]

        # Staff: enforce hospital tenant isolation
        if "system.manage" not in user_perms and "organization.read" not in user_perms:
            user_hosp = user.get("hospital_ref_id") or user.get("hospital_id")
            if user_hosp:
                return [inv for inv in invoices if not inv.get("hospital_id") or inv.get("hospital_id") == user_hosp]

        return invoices
    except Exception as e:
        logger.error("Failed to list billing invoices: %s", e, exc_info=True)
        return []

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    user: Dict[str, Any] = Depends(require_any_permission(
        "billing.read", "billing.manage", "system.manage", "patient.self.read"
    ))
):
    """
    Retrieves a specific invoice with BOLA / IDOR protection.
    """
    inv = sp_repository.get_invoice_by_id(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    user_perms = user.get("permissions", [])
    # IDOR check: Patients cannot access other patients' invoices
    if "patient.self.read" in user_perms and "billing.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        if inv.get("patient_id") != user_ref_id:
            log_security_event("IDOR_ATTEMPT", actor_id=user.get("username"), resource=f"invoice:{invoice_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this invoice")

    # Hospital tenant isolation
    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        validate_hospital_tenant_scope(user, inv.get("hospital_id"))

    return inv

@router.post("/invoices/{invoice_id}/pay")
def pay_invoice(
    invoice_id: str,
    payload: PaymentRequest,
    user: Dict[str, Any] = Depends(require_any_permission(
        "billing.pay", "billing.manage", "system.manage", "patient.self.pay"
    ))
):
    """
    Records an authorized invoice payment with audit logging.
    """
    inv = sp_repository.get_invoice_by_id(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    user_perms = user.get("permissions", [])
    # IDOR check for patient self-pay
    if "patient.self.pay" in user_perms and "billing.pay" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        if inv.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot pay another patient's invoice")

    try:
        res = sp_repository.record_payment(
            invoice_id=invoice_id,
            amount=payload.amount,
            payment_mode=payload.payment_mode,
            transaction_ref=payload.transaction_ref
        )
        log_security_event(
            "PAYMENT_RECORDED",
            actor_id=user.get("username"),
            resource=f"invoice:{invoice_id}",
            status="SUCCESS",
            details={"amount": float(payload.amount), "mode": payload.payment_mode}
        )
        return {
            "success": True,
            "message": f"Payment of ₹{payload.amount:.2f} recorded successfully via {payload.payment_mode}",
            "data": res
        }
    except Exception as e:
        logger.error("Payment recording failed for invoice %s: %s", invoice_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to record payment. Please contact the billing department.")
