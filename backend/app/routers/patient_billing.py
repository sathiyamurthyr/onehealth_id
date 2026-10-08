"""
OH-ID Phase 5: Patient Bills, Payments & Digital Receipts Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context
)
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/me", tags=["Patient Bills & Payments"])

class PatientPaymentInitiateRequest(BaseModel):
    invoice_id: str
    amount: float
    payment_mode: str = "UPI"

class PatientPaymentVerifyRequest(BaseModel):
    invoice_id: str
    amount: float
    payment_mode: str = "UPI"
    gateway_name: str = "RAZORPAY"
    gateway_transaction_id: str
    gateway_signature: str
    idempotency_key: Optional[str] = None

@router.get("/bills")
def get_my_bills(
    user: Dict[str, Any] = Depends(require_any_permission("patient.self.read", "billing.read", "system.manage"))
):
    """Returns the patient's personal billing invoices."""
    patient_id = user.get("user_ref_id") or user.get("id") or "usr-patient-101"
    try:
        invoices = sp_repository.list_hospital_invoices(patient_id=patient_id)
        return invoices
    except Exception as e:
        logger.error("Failed to load patient bills for %s: %s", patient_id, e, exc_info=True)
        return []

@router.get("/bills/{invoice_id}")
def get_my_bill_details(
    invoice_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("patient.self.read", "billing.read", "system.manage"))
):
    """Retrieves patient invoice details with IDOR protection."""
    patient_id = user.get("user_ref_id") or user.get("id") or "usr-patient-101"
    inv = sp_repository.get_invoice_details(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    user_perms = user.get("permissions", [])
    if "patient.self.read" in user_perms and "billing.read" not in user_perms and "system.manage" not in user_perms:
        if inv.get("patient_id") != patient_id:
            log_security_event("IDOR_ATTEMPT", actor_id=user.get("username"), resource=f"invoice:{invoice_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's bill")

    return inv

@router.get("/receipts")
def get_my_receipts(
    user: Dict[str, Any] = Depends(require_any_permission("patient.self.read", "billing.read", "system.manage"))
):
    """Returns digital payment settlement receipts issued to the patient."""
    patient_id = user.get("user_ref_id") or user.get("id") or "usr-patient-101"
    try:
        return sp_repository.list_payment_receipts(patient_id=patient_id)
    except Exception as e:
        logger.error("Failed to load patient receipts for %s: %s", patient_id, e, exc_info=True)
        return []

@router.post("/payments/verify")
def verify_patient_payment(
    payload: PatientPaymentVerifyRequest,
    user: Dict[str, Any] = Depends(require_any_permission("patient.self.pay", "billing.pay", "system.manage"))
):
    """Verifies online payment gateway transaction and marks invoice paid/partially paid with receipt generation."""
    patient_id = user.get("user_ref_id") or user.get("id") or "usr-patient-101"
    inv = sp_repository.get_invoice_details(payload.invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    user_perms = user.get("permissions", [])
    if "patient.self.pay" in user_perms and "billing.pay" not in user_perms and "system.manage" not in user_perms:
        if inv.get("patient_id") != patient_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot pay another patient's invoice")

    # In production, verify HMAC-SHA256 signature from gateway secret
    if not payload.gateway_signature:
        raise HTTPException(status_code=400, detail="Invalid gateway signature")

    try:
        res = sp_repository.record_and_verify_payment(
            invoice_id=payload.invoice_id,
            amount=Decimal(str(payload.amount)),
            payment_mode=payload.payment_mode,
            transaction_ref=payload.gateway_transaction_id,
            gateway_name=payload.gateway_name,
            gateway_transaction_id=payload.gateway_transaction_id,
            gateway_signature=payload.gateway_signature,
            idempotency_key=payload.idempotency_key,
            actor_id=user.get("username") or patient_id
        )
        return {
            "success": True,
            "message": "Payment verified and recorded successfully",
            "data": res
        }
    except Exception as e:
        logger.error("Online payment verification failed: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
