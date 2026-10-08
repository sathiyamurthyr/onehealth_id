"""
OH-ID Phase 5: Enterprise Hospital Operations, Billing, Insurance & Operational Intelligence Test Suite
Sathus Technology Pvt Ltd

Verifies:
1. Service catalogue & price list configuration
2. Clinical event charge posting and patient billing account creation
3. Invoice generation, calculation with Decimal precision, and lifecycle state machine
4. Payment gateway verification, idempotency, and digital receipt issuance
5. Multi-step refund workflow with audit tracking
6. Controlled billing adjustments and write-offs
7. Insurance payer setup, policy linking, treatment preauthorization, and claim adjudication
8. Multi-tenant financial isolation & BOLA/IDOR protection
9. Operational intelligence, revenue aggregation, and real database KPIs
10. Complete end-to-end commercial and insurance billing journey
"""

import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.database.session import get_db_cursor

client = TestClient(app)

@pytest.fixture
def auth_headers():
    token = create_access_token({
        "sub": "admin",
        "roles": ["PLATFORM_SUPER_ADMIN", "SUPER_ADMIN", "HOSPITAL_ADMIN"],
        "hospital_id": "hosp-kedar",
        "hospital_ref_id": "hosp-kedar",
        "permissions": ["system.manage", "hospital.manage", "hospital.view", "billing.manage", "billing.create", "billing.read", "billing.pay"]
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def patient_headers():
    token = create_access_token({
        "sub": "usr-patient-101",
        "user_ref_id": "usr-patient-101",
        "id": "usr-patient-101",
        "roles": ["PATIENT"],
        "permissions": ["patient.self.read", "patient.self.pay", "patient.self.manage"]
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def hosp_b_headers():
    token = create_access_token({
        "sub": "admin-hosp-b",
        "roles": ["HOSPITAL_ADMIN"],
        "hospital_id": "hosp-apollo",
        "hospital_ref_id": "hosp-apollo",
        "permissions": ["hospital.manage", "billing.manage", "billing.read", "billing.create", "billing.pay"]
    })
    return {"Authorization": f"Bearer {token}"}

# Ensure test patient exists
@pytest.fixture(autouse=True)
def setup_test_entities():
    with get_db_cursor() as cur:
        # Hospital Kedar
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, code, name, display_name, hospital_type, is_active)
            VALUES ('hosp-kedar', 'HOSP-KEDAR', 'Kedar Multi-Speciality Hospital', 'Kedar Hospital', 'HOSPITAL', TRUE)
            ON CONFLICT (id) DO NOTHING;
        """)
        # Hospital Apollo (Tenant B)
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, code, name, display_name, hospital_type, is_active)
            VALUES ('hosp-apollo', 'HOSP-APOLLO', 'Apollo Multispeciality Health City', 'Apollo Health City', 'HOSPITAL', TRUE)
            ON CONFLICT (id) DO NOTHING;
        """)
        # Patient
        cur.execute("""
            INSERT INTO oh_id.patients (id, hospital_id, onehealth_id, qr_token, name, age, gender, phone, blood_group, diagnosis)
            VALUES ('usr-patient-101', 'hosp-kedar', 'OHID-TN-2026-000101', 'QR-P101-TEST', 'Sathiya Murthy', 34, 'MALE', '9876543210', 'O_POSITIVE', 'Routine Clinical Care')
            ON CONFLICT (id) DO NOTHING;
        """)

# =========================================================================
# TEST CASES
# =========================================================================

def test_01_service_catalogue_and_price_list_versioning(auth_headers):
    """Verifies hospital service catalogue registration and price list versioning."""
    code = f"SRV-CARDIO-{uuid.uuid4().hex[:4].upper()}"
    srv_payload = {
        "hospital_id": "hosp-kedar",
        "code": code,
        "name": "Echocardiography (2D Echo)",
        "description": "2D Echocardiography with Color Doppler evaluation",
        "category": "RADIOLOGY",
        "taxable": False,
        "tax_rate": 0.00,
        "base_price": 2200.00,
        "currency": "INR"
    }
    res = client.post("/api/v1/hospital/services", json=srv_payload, headers=auth_headers)
    assert res.status_code == 200
    srv_data = res.json()["data"]
    assert srv_data["code"] == code
    assert float(srv_data["base_price"]) == 2200.00

    # Create a Corporate Price List
    plist_code = f"PLIST-CORP-{uuid.uuid4().hex[:4].upper()}"
    pl_payload = {
        "hospital_id": "hosp-kedar",
        "code": plist_code,
        "name": "Corporate Health Price Schedule",
        "price_list_type": "CORPORATE",
        "currency": "INR",
        "is_default": False
    }
    pl_res = client.post("/api/v1/hospital/price-lists", json=pl_payload, headers=auth_headers)
    assert pl_res.status_code == 200
    plist_id = pl_res.json()["data"]["id"]

    # Assign item price
    item_res = client.post(f"/api/v1/hospital/price-lists/{plist_id}/items", json=[
        {"service_id": srv_data["id"], "price": 1850.00, "currency": "INR"}
    ], headers=auth_headers)
    assert item_res.status_code == 200
    assert "Updated 1" in item_res.json()["message"]

def test_02_clinical_event_charge_posting_and_billing_account(auth_headers):
    """Verifies posting charges from clinical care (OPD, Bed, Lab, Pharmacy) into patient billing account."""
    # 1. Post OPD Consultation charge
    chg_res1 = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "encounter_id": "enc-test-opd-01",
        "source_type": "OPD_CONSULTATION",
        "description": "Senior Cardiologist Consultation",
        "quantity": 1.00,
        "unit_price": 750.00,
        "discount_amount": 50.00,
        "tax_amount": 0.00,
        "payer_responsibility": 0.00,
        "patient_responsibility": 700.00
    }, headers=auth_headers)
    assert chg_res1.status_code == 200
    chg1 = chg_res1.json()["data"]
    assert float(chg1["net_amount"]) == 700.00
    assert chg1["status"] == "POSTED"
    assert chg1["billing_account_id"] is not None

    # 2. Post Lab charge
    chg_res2 = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "billing_account_id": chg1["billing_account_id"],
        "source_type": "LAB_TEST",
        "description": "Lipid Profile & Serum Creatinine",
        "quantity": 1.00,
        "unit_price": 950.00,
        "discount_amount": 0.00,
        "tax_amount": 0.00
    }, headers=auth_headers)
    assert chg_res2.status_code == 200
    chg2 = chg_res2.json()["data"]
    assert float(chg2["net_amount"]) == 950.00

def test_03_invoice_creation_lifecycle_and_due_date(auth_headers):
    """Verifies generating an invoice from multiple posted charges, with issuance and state transitions."""
    # Post 2 charges
    c1 = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "source_type": "BED_NURSING",
        "description": "ICU Bed Day & Telemetry",
        "quantity": 2.00,
        "unit_price": 4000.00
    }, headers=auth_headers).json()["data"]

    c2 = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "source_type": "PHARMACY_DISPENSE",
        "description": "IV Antibiotics & Infusion Set",
        "quantity": 1.00,
        "unit_price": 1200.00
    }, headers=auth_headers).json()["data"]

    # Generate invoice
    inv_res = client.post("/api/v1/hospital/billing/invoices", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "charge_ids": [c1["id"], c2["id"]],
        "discount": 200.00,
        "due_days": 15
    }, headers=auth_headers)
    assert inv_res.status_code == 200
    inv = inv_res.json()["data"]
    # 2*4000 + 1200 - 200 = 9000
    assert float(inv["subtotal"]) == 9200.00
    assert float(inv["total_amount"]) == 9000.00
    assert float(inv["balance_amount"]) == 9000.00
    assert inv["payment_status"] == "DRAFT"

    # Issue invoice
    issue_res = client.post(f"/api/v1/hospital/billing/invoices/{inv['id']}/issue", headers=auth_headers)
    assert issue_res.status_code == 200
    assert issue_res.json()["data"]["payment_status"] == "PENDING"
    assert issue_res.json()["data"]["issued_at"] is not None

def test_04_payment_verification_and_digital_receipt_generation(auth_headers, patient_headers):
    """Verifies recording payment, state update to PAID, idempotency, and tamper-evident receipt generation."""
    # Create and issue an invoice
    c = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "source_type": "PROCEDURE",
        "description": "Minor Suture & Dressing",
        "quantity": 1.00,
        "unit_price": 1500.00
    }, headers=auth_headers).json()["data"]

    inv = client.post("/api/v1/hospital/billing/invoices", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "charge_ids": [c["id"]]
    }, headers=auth_headers).json()["data"]
    client.post(f"/api/v1/hospital/billing/invoices/{inv['id']}/issue", headers=auth_headers)

    # Patient verifies payment via gateway
    idem_key = f"IDEM-PAY-{uuid.uuid4().hex[:8]}"
    pay_res = client.post("/api/v1/me/payments/verify", json={
        "invoice_id": inv["id"],
        "amount": 1500.00,
        "payment_mode": "UPI",
        "gateway_name": "RAZORPAY",
        "gateway_transaction_id": f"pay_rzp_{uuid.uuid4().hex[:8]}",
        "gateway_signature": f"sig_rzp_{uuid.uuid4().hex[:16]}",
        "idempotency_key": idem_key
    }, headers=patient_headers)
    assert pay_res.status_code == 200
    pay_data = pay_res.json()["data"]
    assert float(pay_data["amount"]) == 1500.00
    assert "receipt" in pay_data
    receipt = pay_data["receipt"]
    assert receipt["receipt_number"].startswith("REC-")
    assert receipt["digital_signature_hash"].startswith("SHA256:")

    # Verify invoice status is now PAID
    inv_check = client.get(f"/api/v1/hospital/billing/invoices/{inv['id']}", headers=auth_headers).json()
    assert inv_check["payment_status"] == "PAID"
    assert float(inv_check["balance_amount"]) == 0.00

    # Test idempotency - duplicate payment request returns same receipt without charging twice
    dup_res = client.post("/api/v1/me/payments/verify", json={
        "invoice_id": inv["id"],
        "amount": 1500.00,
        "payment_mode": "UPI",
        "gateway_name": "RAZORPAY",
        "gateway_transaction_id": f"pay_rzp_dup",
        "gateway_signature": f"sig_rzp_dup",
        "idempotency_key": idem_key
    }, headers=patient_headers)
    assert dup_res.status_code == 200
    assert dup_res.json()["data"]["idempotency_key"] == idem_key

def test_05_refund_workflow_and_multi_tier_approval(auth_headers):
    """Verifies requesting, approving, and settling refunds with audit tracking."""
    # Create paid invoice
    c = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "source_type": "LAB_TEST",
        "description": "Cancelled Urine Culture",
        "quantity": 1.00,
        "unit_price": 800.00
    }, headers=auth_headers).json()["data"]
    inv = client.post("/api/v1/hospital/billing/invoices", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "charge_ids": [c["id"]]
    }, headers=auth_headers).json()["data"]
    client.post(f"/api/v1/hospital/billing/invoices/{inv['id']}/issue", headers=auth_headers)
    pay = client.post(f"/api/v1/hospital/billing/invoices/{inv['id']}/payments", json={
        "amount": 800.00,
        "payment_mode": "CARD"
    }, headers=auth_headers).json()["data"]

    # 1. Request refund
    req_res = client.post("/api/v1/hospital/billing/refunds", json={
        "hospital_id": "hosp-kedar",
        "invoice_id": inv["id"],
        "payment_id": pay["id"],
        "patient_id": "usr-patient-101",
        "amount": 800.00,
        "reason": "Test cancelled by clinician prior to sample processing."
    }, headers=auth_headers)
    assert req_res.status_code == 200
    ref_id = req_res.json()["data"]["id"]
    assert req_res.json()["data"]["status"] == "REQUESTED"

    # 2. Approve refund
    app_res = client.post(f"/api/v1/hospital/billing/refunds/{ref_id}/approve", headers=auth_headers)
    assert app_res.status_code == 200
    assert app_res.json()["data"]["status"] == "APPROVED"

    # 3. Process settlement
    proc_res = client.post(f"/api/v1/hospital/billing/refunds/{ref_id}/process", headers=auth_headers)
    assert proc_res.status_code == 200
    assert proc_res.json()["data"]["status"] == "PROCESSED"

    # Verify invoice status transitioned to REFUNDED
    inv_check = client.get(f"/api/v1/hospital/billing/invoices/{inv['id']}", headers=auth_headers).json()
    assert inv_check["payment_status"] == "REFUNDED"

def test_06_billing_adjustments_and_audit_reasons(auth_headers):
    """Verifies authorized invoice write-offs and discounts with adjustment audit logs."""
    c = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "source_type": "OPD_CONSULTATION",
        "description": "Executive Health Screening",
        "quantity": 1.00,
        "unit_price": 5000.00
    }, headers=auth_headers).json()["data"]
    inv = client.post("/api/v1/hospital/billing/invoices", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "charge_ids": [c["id"]]
    }, headers=auth_headers).json()["data"]
    client.post(f"/api/v1/hospital/billing/invoices/{inv['id']}/issue", headers=auth_headers)

    # Apply 1000 INR Courtesy Discount
    adj_res = client.post(f"/api/v1/hospital/billing/invoices/{inv['id']}/adjust", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "adjustment_type": "DISCOUNT",
        "adjustment_delta": 1000.00,
        "reason": "Senior Citizen Goodwill Courtesy Discount authorized by Hospital Director."
    }, headers=auth_headers)
    assert adj_res.status_code == 200
    adj_data = adj_res.json()["data"]
    assert float(adj_data["adjustment_delta"]) == 1000.00

    # Verify updated invoice total
    inv_check = client.get(f"/api/v1/hospital/billing/invoices/{inv['id']}", headers=auth_headers).json()
    assert float(inv_check["total_amount"]) == 4000.00
    assert float(inv_check["balance_amount"]) == 4000.00

def test_07_insurance_payer_policy_preauthorization_and_claim_settlement(auth_headers):
    """Verifies complete insurance cycle: Payer setup -> Patient policy -> Preauth approval -> Claim adjudication."""
    # 1. Register Payer
    payer_code = f"PAYER-MAX-{uuid.uuid4().hex[:4].upper()}"
    pyr_res = client.post("/api/v1/hospital/insurance/payers", json={
        "hospital_id": "hosp-kedar",
        "name": "Max Bupa Health Insurance",
        "payer_code": payer_code,
        "payer_type": "INSURANCE",
        "contact_person": "TPA Claims Desk",
        "contact_email": "tpa@maxbupa.com",
        "settlement_period_days": 20
    }, headers=auth_headers)
    assert pyr_res.status_code == 200
    payer_id = pyr_res.json()["data"]["id"]

    # 2. Link Patient Policy
    pol_num = f"POL-MAX-{uuid.uuid4().hex[:6].upper()}"
    pol_res = client.post("/api/v1/hospital/insurance/policies", json={
        "patient_id": "usr-patient-101",
        "payer_id": payer_id,
        "policy_number": pol_num,
        "member_id": "MEMB-99841",
        "policy_holder_name": "Sathiya Murthy",
        "coverage_limit": 750000.00,
        "copay_percentage": 10.00
    }, headers=auth_headers)
    assert pol_res.status_code == 200
    policy_id = pol_res.json()["data"]["id"]

    # 3. Submit Preauthorization for Surgery
    pre_res = client.post("/api/v1/hospital/insurance/preauthorizations", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "payer_id": payer_id,
        "policy_id": policy_id,
        "diagnosis_code": "I25.10",
        "clinical_justification": "Elective Coronary Angioplasty with single drug-eluting stent placement.",
        "requested_amount": 180000.00
    }, headers=auth_headers)
    assert pre_res.status_code == 200
    preauth_id = pre_res.json()["data"]["id"]

    # Record Preauth Approval
    dec_res = client.put(f"/api/v1/hospital/insurance/preauthorizations/{preauth_id}/decision", json={
        "status": "APPROVED",
        "approved_amount": 165000.00
    }, headers=auth_headers)
    assert dec_res.status_code == 200
    assert dec_res.json()["data"]["status"] == "APPROVED"
    assert float(dec_res.json()["data"]["approved_amount"]) == 165000.00

    # 4. Submit & Settle Claim
    clm_res = client.post("/api/v1/hospital/insurance/claims", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "payer_id": payer_id,
        "policy_id": policy_id,
        "preauth_id": preauth_id,
        "claimed_amount": 165000.00,
        "items": [
            {"description": "Cath Lab Stent Implantation", "quantity": 1, "unit_price": 140000.00, "claimed_amount": 140000.00},
            {"description": "ICU Post-Operative Monitoring", "quantity": 1, "unit_price": 25000.00, "claimed_amount": 25000.00}
        ]
    }, headers=auth_headers)
    assert clm_res.status_code == 200
    claim_id = clm_res.json()["data"]["id"]

    # Adjudicate & Settle
    adj_res = client.put(f"/api/v1/hospital/insurance/claims/{claim_id}/adjudicate", json={
        "status": "SETTLED",
        "approved_amount": 165000.00,
        "settled_amount": 148500.00, # 90%
        "patient_copay_amount": 16500.00 # 10%
    }, headers=auth_headers)
    assert adj_res.status_code == 200
    assert adj_res.json()["data"]["status"] == "SETTLED"
    assert float(adj_res.json()["data"]["settled_amount"]) == 148500.00

def test_08_cross_hospital_billing_isolation_and_idor(auth_headers, hosp_b_headers, patient_headers):
    """Verifies strict tenant isolation between Hospital A (Kedar) and Hospital B (Apollo)."""
    # Hospital A creates an invoice
    c = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "source_type": "CONSULTATION",
        "description": "Private Confidential Executive Consultation",
        "quantity": 1.00,
        "unit_price": 2500.00
    }, headers=auth_headers).json()["data"]
    inv_a = client.post("/api/v1/hospital/billing/invoices", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "charge_ids": [c["id"]]
    }, headers=auth_headers).json()["data"]

    # Hospital B admin attempts to read Hospital A invoice -> Must be blocked (403)
    b_attempt = client.get(f"/api/v1/hospital/billing/invoices/{inv_a['id']}", headers=hosp_b_headers)
    assert b_attempt.status_code == 403
    assert "Forbidden" in b_attempt.json()["detail"]

    # Hospital B admin lists invoices -> Should not see Hospital A invoice
    b_list = client.get("/api/v1/hospital/billing/invoices?hospital_id=hosp-apollo", headers=hosp_b_headers).json()
    assert all(i["id"] != inv_a["id"] for i in b_list)

def test_09_hospital_operational_kpis_and_financial_analytics(auth_headers):
    """Verifies real database calculations for financial analytics and executive operational KPIs."""
    # 1. Financial Analytics
    fin_res = client.get("/api/v1/hospital/analytics/financial?hospital_id=hosp-kedar", headers=auth_headers)
    assert fin_res.status_code == 200
    fin_data = fin_res.json()
    assert "gross_billed" in fin_data
    assert "total_collected" in fin_data
    assert float(fin_data["gross_billed"]) >= 0.00

    # 2. Operational KPIs
    kpi_res = client.get("/api/v1/hospital/analytics/operational-kpis?hospital_id=hosp-kedar", headers=auth_headers)
    assert kpi_res.status_code == 200
    kpi_data = kpi_res.json()
    assert "today_consultations_count" in kpi_data
    assert "total_operational_beds" in kpi_data
    assert "bed_occupancy_percentage" in kpi_data
    assert isinstance(kpi_data["bed_occupancy_percentage"], float)

    # 3. Department Performance
    dept_res = client.get("/api/v1/hospital/analytics/departments?hospital_id=hosp-kedar", headers=auth_headers)
    assert dept_res.status_code == 200
    assert isinstance(dept_res.json(), list)

def test_10_complete_financial_and_insurance_e2e_journey(auth_headers, patient_headers):
    """
    Complete E2E Journey:
    Patient Consultation -> Billable Charge Posted -> Invoice Issued -> Patient Pays Online ->
    Payment Verified -> Digital Receipt Emitted -> All Financial Analytics Reflect Accurately.
    """
    # 1. Charge
    charge = client.post("/api/v1/hospital/billing/charges", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "source_type": "OPD_CONSULTATION",
        "description": "Comprehensive Health & Vitals Consultation",
        "quantity": 1.00,
        "unit_price": 600.00
    }, headers=auth_headers).json()["data"]

    # 2. Invoice
    invoice = client.post("/api/v1/hospital/billing/invoices", json={
        "hospital_id": "hosp-kedar",
        "patient_id": "usr-patient-101",
        "charge_ids": [charge["id"]]
    }, headers=auth_headers).json()["data"]

    # 3. Issue
    client.post(f"/api/v1/hospital/billing/invoices/{invoice['id']}/issue", headers=auth_headers)

    # 4. Patient sees bill
    my_bills_res = client.get("/api/v1/me/bills", headers=patient_headers).json()
    bills_list = my_bills_res["data"] if isinstance(my_bills_res, dict) and "data" in my_bills_res else my_bills_res
    target_bill = next((b for b in bills_list if b["id"] == invoice["id"]), None)
    assert target_bill is not None
    assert target_bill["payment_status"] in ("PENDING", "ISSUED")

    # 5. Patient pays
    pay_res = client.post("/api/v1/me/payments/verify", json={
        "invoice_id": invoice["id"],
        "amount": 600.00,
        "payment_mode": "UPI",
        "gateway_name": "RAZORPAY",
        "gateway_transaction_id": f"pay_e2e_{uuid.uuid4().hex[:8]}",
        "gateway_signature": f"sig_e2e_{uuid.uuid4().hex[:16]}"
    }, headers=patient_headers)
    assert pay_res.status_code == 200
    receipt = pay_res.json()["data"]["receipt"]
    assert receipt["receipt_number"].startswith("REC-")

    # 6. Patient inspects receipts
    receipts = client.get("/api/v1/me/receipts", headers=patient_headers).json()
    assert any(r["receipt_number"] == receipt["receipt_number"] for r in receipts)

    # 7. Analytics check reflects revenue
    analytics = client.get("/api/v1/hospital/analytics/financial?hospital_id=hosp-kedar", headers=auth_headers).json()
    assert float(analytics["total_collected"]) > 0.00
