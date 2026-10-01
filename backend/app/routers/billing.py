from fastapi import APIRouter, HTTPException
from typing import List
from backend.app.schemas.models import InvoiceResponse, PaymentRequest
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/billing", tags=["Billing & Payments"])

@router.get("/invoices", response_model=List[InvoiceResponse])
def list_invoices():
    try:
        invoices = sp_repository.list_billing_invoices()
        return invoices
    except Exception:
        return []

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: str):
    inv = sp_repository.get_invoice_by_id(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv

@router.post("/invoices/{invoice_id}/pay")
def pay_invoice(invoice_id: str, payload: PaymentRequest):
    try:
        res = sp_repository.record_payment(
            invoice_id=invoice_id,
            amount=payload.amount,
            payment_mode=payload.payment_mode,
            transaction_ref=payload.transaction_ref
        )
        return {
            "success": True,
            "message": f"Payment of ₹{payload.amount:.2f} recorded successfully via {payload.payment_mode}",
            "data": res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
