"""
OH-ID Phase 5: Enterprise Hospital Operations, Billing, Insurance & Operational Intelligence Repository Mixin
Sathus Technology Pvt Ltd
"""

import uuid
import json
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.core.logging import logger

def _to_decimal(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))

class Phase5BillingRepositoryMixin:
    """Repository methods for Phase 5 Service Catalogue, Pricing, Billing, Insurance, and Analytics."""

    # =========================================================================
    # 1. SERVICE CATALOGUE & PRICING
    # =========================================================================

    def list_hospital_services(
        self,
        hospital_id: str,
        category: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT id, hospital_id, code, name, description, category, department_id,
                       taxable, tax_rate, base_price, currency, effective_from, effective_until, is_active,
                       created_at, updated_at
                FROM oh_id.services
                WHERE hospital_id = %s
            """
            params: List[Any] = [hospital_id]
            if category:
                query += " AND category = %s"
                params.append(category)
            if is_active is not None:
                query += " AND is_active = %s"
                params.append(is_active)
            query += " ORDER BY category, name"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def create_hospital_service(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            service_id = data.get("id") or f"srv-{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO oh_id.services (
                    id, hospital_id, code, name, description, category, department_id,
                    taxable, tax_rate, base_price, currency, effective_from, effective_until, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                service_id,
                data["hospital_id"],
                data["code"].upper(),
                data["name"],
                data.get("description", ""),
                data.get("category", "CONSULTATION").upper(),
                data.get("department_id"),
                data.get("taxable", False),
                _to_decimal(data.get("tax_rate", 0.00)),
                _to_decimal(data.get("base_price", 0.00)),
                data.get("currency", "INR"),
                data.get("effective_from") or date.today(),
                data.get("effective_until") or date(2099, 12, 31),
                data.get("is_active", True)
            ))
            return dict(cur.fetchone())

    def update_hospital_service(self, service_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            fields = []
            values = []
            for k in ["name", "description", "category", "department_id", "taxable", "tax_rate", "base_price", "is_active", "effective_from", "effective_until"]:
                if k in data:
                    fields.append(f"{k} = %s")
                    if k in ["tax_rate", "base_price"]:
                        values.append(_to_decimal(data[k]))
                    else:
                        values.append(data[k])
            if not fields:
                return None
            fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(service_id)
            query = f"UPDATE oh_id.services SET {', '.join(fields)} WHERE id = %s RETURNING *;"
            cur.execute(query, tuple(values))
            row = cur.fetchone()
            return dict(row) if row else None

    def list_hospital_price_lists(self, hospital_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT p.id, p.hospital_id, p.code, p.name, p.price_list_type, p.currency, p.is_default, p.is_active, p.created_at,
                       COUNT(pli.id) AS total_items_count
                FROM oh_id.price_lists p
                LEFT JOIN oh_id.price_list_items pli ON p.id = pli.price_list_id
                WHERE p.hospital_id = %s
                GROUP BY p.id, p.hospital_id, p.code, p.name, p.price_list_type, p.currency, p.is_default, p.is_active, p.created_at
                ORDER BY p.is_default DESC, p.name ASC;
            """, (hospital_id,))
            return [dict(r) for r in cur.fetchall()]

    def create_hospital_price_list(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            plist_id = data.get("id") or f"plist-{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO oh_id.price_lists (
                    id, hospital_id, code, name, price_list_type, currency, is_default, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                plist_id,
                data["hospital_id"],
                data["code"].upper(),
                data["name"],
                data.get("price_list_type", "GENERAL").upper(),
                data.get("currency", "INR"),
                data.get("is_default", False),
                data.get("is_active", True)
            ))
            return dict(cur.fetchone())

    def set_price_list_items(self, price_list_id: str, items: List[Dict[str, Any]]) -> int:
        with get_db_cursor() as cur:
            count = 0
            for item in items:
                item_id = item.get("id") or f"pli-{uuid.uuid4().hex[:8]}"
                cur.execute("""
                    INSERT INTO oh_id.price_list_items (
                        id, price_list_id, service_id, price, currency, effective_from, effective_until
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (price_list_id, service_id, effective_from)
                    DO UPDATE SET price = EXCLUDED.price, effective_until = EXCLUDED.effective_until;
                """, (
                    item_id,
                    price_list_id,
                    item["service_id"],
                    _to_decimal(item["price"]),
                    item.get("currency", "INR"),
                    item.get("effective_from") or date.today(),
                    item.get("effective_until") or date(2099, 12, 31)
                ))
                count += 1
            return count

    def list_hospital_packages(self, hospital_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT id, hospital_id, code, name, description, category, total_package_price, validity_days,
                       inclusions_json, exclusions_json, is_active, created_at
                FROM oh_id.medical_packages
                WHERE hospital_id = %s
                ORDER BY name;
            """, (hospital_id,))
            return [dict(r) for r in cur.fetchall()]

    def create_hospital_package(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            pkg_id = data.get("id") or f"pkg-{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO oh_id.medical_packages (
                    id, hospital_id, code, name, description, category, total_package_price,
                    validity_days, inclusions_json, exclusions_json, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s
                ) RETURNING *;
            """, (
                pkg_id,
                data["hospital_id"],
                data["code"].upper(),
                data["name"],
                data.get("description", ""),
                data.get("category", "SURGERY").upper(),
                _to_decimal(data["total_package_price"]),
                data.get("validity_days", 30),
                json.dumps(data.get("inclusions", [])),
                json.dumps(data.get("exclusions", [])),
                data.get("is_active", True)
            ))
            return dict(cur.fetchone())

    # =========================================================================
    # 2. BILLING ACCOUNTS & CHARGE POSTING
    # =========================================================================

    def get_or_create_billing_account(
        self,
        patient_id: str,
        hospital_id: str,
        encounter_id: Optional[str] = None,
        admission_id: Optional[str] = None,
        payer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            # Check for existing open account
            cur.execute("""
                SELECT id, patient_id, hospital_id, payer_id, encounter_id, admission_id, currency, status, created_at
                FROM oh_id.billing_accounts
                WHERE patient_id = %s AND hospital_id = %s AND status = 'OPEN'
                ORDER BY created_at DESC LIMIT 1;
            """, (patient_id, hospital_id))
            row = cur.fetchone()
            if row:
                return dict(row)

            account_id = f"bac-{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO oh_id.billing_accounts (
                    id, patient_id, hospital_id, payer_id, encounter_id, admission_id, currency, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'INR', 'OPEN'
                ) RETURNING *;
            """, (account_id, patient_id, hospital_id, payer_id, encounter_id, admission_id))
            return dict(cur.fetchone())

    def post_charge(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            charge_id = data.get("id") or f"chg-{uuid.uuid4().hex[:8]}"
            
            # Ensure billing account exists
            billing_account_id = data.get("billing_account_id")
            if not billing_account_id:
                bac = self.get_or_create_billing_account(
                    patient_id=data["patient_id"],
                    hospital_id=data["hospital_id"],
                    encounter_id=data.get("encounter_id"),
                    admission_id=data.get("admission_id")
                )
                billing_account_id = bac["id"]

            qty = _to_decimal(data.get("quantity", 1.00))
            unit_price = _to_decimal(data["unit_price"])
            discount = _to_decimal(data.get("discount_amount", 0.00))
            tax = _to_decimal(data.get("tax_amount", 0.00))
            gross = qty * unit_price
            net = gross - discount + tax
            payer_resp = _to_decimal(data.get("payer_responsibility", 0.00))
            patient_resp = _to_decimal(data.get("patient_responsibility", net - payer_resp))

            cur.execute("""
                INSERT INTO oh_id.charges (
                    id, billing_account_id, patient_id, hospital_id, encounter_id, admission_id,
                    source_type, source_ref_id, service_id, description, quantity, unit_price,
                    discount_amount, tax_amount, net_amount, payer_responsibility, patient_responsibility,
                    status, posted_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    'POSTED', %s
                ) RETURNING *;
            """, (
                charge_id, billing_account_id, data["patient_id"], data["hospital_id"],
                data.get("encounter_id"), data.get("admission_id"),
                data.get("source_type", "OPD_CONSULTATION").upper(),
                data.get("source_ref_id"),
                data.get("service_id"),
                data["description"],
                qty, unit_price, discount, tax, net, payer_resp, patient_resp,
                data.get("posted_by", "usr-billing")
            ))
            return dict(cur.fetchone())

    def list_charges(
        self,
        hospital_id: str,
        patient_id: Optional[str] = None,
        billing_account_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT c.id, c.billing_account_id, c.patient_id, c.hospital_id, c.encounter_id, c.admission_id,
                       c.source_type, c.source_ref_id, c.service_id, c.description, c.quantity, c.unit_price,
                       c.discount_amount, c.tax_amount, c.net_amount, c.payer_responsibility, c.patient_responsibility,
                       c.status, c.posted_by, c.created_at,
                       p.name AS patient_name, p.onehealth_id
                FROM oh_id.charges c
                LEFT JOIN oh_id.patients p ON c.patient_id = p.id
                WHERE c.hospital_id = %s
            """
            params: List[Any] = [hospital_id]
            if patient_id:
                query += " AND c.patient_id = %s"
                params.append(patient_id)
            if billing_account_id:
                query += " AND c.billing_account_id = %s"
                params.append(billing_account_id)
            if status:
                query += " AND c.status = %s"
                params.append(status)
            query += " ORDER BY c.created_at DESC"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    # =========================================================================
    # 3. INVOICES & LIFECYCLE
    # =========================================================================

    def create_invoice_from_charges(
        self,
        hospital_id: str,
        patient_id: str,
        charge_ids: List[str],
        billing_account_id: Optional[str] = None,
        payer_id: Optional[str] = None,
        discount: Decimal = Decimal("0.00"),
        due_days: int = 15
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT id, service_id, description, quantity, unit_price, discount_amount, tax_amount, net_amount, patient_responsibility
                FROM oh_id.charges
                WHERE id = ANY(%s) AND hospital_id = %s AND status = 'POSTED';
            """, (charge_ids, hospital_id))
            charges = cur.fetchall()
            if not charges:
                raise ValueError("No eligible posted charges found to invoice.")

            subtotal = sum([_to_decimal(c["quantity"]) * _to_decimal(c["unit_price"]) for c in charges])
            total_tax = sum([_to_decimal(c["tax_amount"]) for c in charges])
            total_charge_discount = sum([_to_decimal(c["discount_amount"]) for c in charges]) + _to_decimal(discount)
            total_amount = subtotal + total_tax - total_charge_discount

            invoice_id = f"inv-{uuid.uuid4().hex[:8]}"
            invoice_num = f"INV-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"

            cur.execute("""
                INSERT INTO oh_id.invoices (
                    id, invoice_number, patient_id, hospital_id, billing_account_id, payer_id,
                    subtotal, tax_gst, discount, total_amount, paid_amount, balance_amount,
                    payment_status, due_date, currency, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, 0.00, %s,
                    'DRAFT', CURRENT_DATE + %s * INTERVAL '1 day', 'INR', CURRENT_TIMESTAMP
                ) RETURNING *;
            """, (
                invoice_id, invoice_num, patient_id, hospital_id, billing_account_id, payer_id,
                subtotal, total_tax, total_charge_discount, total_amount, total_amount, due_days
            ))
            inv_row = dict(cur.fetchone())

            # Insert line items & update charges to INVOICED
            for chg in charges:
                cur.execute("""
                    INSERT INTO oh_id.invoice_items (
                        id, invoice_id, charge_id, service_id, item_type, description,
                        quantity, unit_price, discount_amount, tax_amount, net_amount, total_price
                    ) VALUES (
                        %s, %s, %s, %s, 'SERVICE', %s,
                        %s, %s, %s, %s, %s, %s
                    );
                """, (
                    f"item-{uuid.uuid4().hex[:8]}", invoice_id, chg["id"], chg["service_id"], chg["description"],
                    chg["quantity"], chg["unit_price"], chg["discount_amount"], chg["tax_amount"], chg["net_amount"],
                    _to_decimal(chg["quantity"]) * _to_decimal(chg["unit_price"])
                ))
                cur.execute("UPDATE oh_id.charges SET status = 'INVOICED' WHERE id = %s;", (chg["id"],))

            return inv_row

    def list_hospital_invoices(
        self,
        hospital_id: Optional[str] = None,
        payment_status: Optional[str] = None,
        patient_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT i.id, i.invoice_number, i.patient_id, i.hospital_id, i.billing_account_id, i.payer_id,
                       i.appointment_id, i.encounter_id, i.admission_id, i.subtotal, i.tax_gst, i.discount,
                       i.total_amount, i.paid_amount, i.balance_amount, i.payment_status, i.due_date, i.currency,
                       i.issued_at, i.paid_at, i.created_at,
                       p.name AS patient_name, p.onehealth_id, p.phone AS patient_phone,
                       h.name AS hospital_name
                FROM oh_id.invoices i
                LEFT JOIN oh_id.patients p ON i.patient_id = p.id
                LEFT JOIN oh_id.hospitals h ON i.hospital_id = h.id
                WHERE 1=1
            """
            params: List[Any] = []
            if hospital_id:
                query += " AND i.hospital_id = %s"
                params.append(hospital_id)
            if payment_status and payment_status != "ALL":
                query += " AND i.payment_status = %s"
                params.append(payment_status)
            if patient_id:
                query += " AND i.patient_id = %s"
                params.append(patient_id)
            if search:
                query += " AND (i.invoice_number ILIKE %s OR p.name ILIKE %s OR p.onehealth_id ILIKE %s)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            query += " ORDER BY i.created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def get_invoice_details(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT i.id, i.invoice_number, i.patient_id, i.hospital_id, i.billing_account_id, i.payer_id,
                       i.appointment_id, i.encounter_id, i.admission_id, i.subtotal, i.tax_gst, i.discount,
                       i.total_amount, i.paid_amount, i.balance_amount, i.payment_status, i.due_date, i.currency,
                       i.issued_at, i.paid_at, i.created_at,
                       p.name AS patient_name, p.onehealth_id, p.phone AS patient_phone, p.email AS patient_email,
                       h.name AS hospital_name, h.address AS hospital_address, h.phone AS hospital_phone,
                       pay.name AS payer_name
                FROM oh_id.invoices i
                LEFT JOIN oh_id.patients p ON i.patient_id = p.id
                LEFT JOIN oh_id.hospitals h ON i.hospital_id = h.id
                LEFT JOIN oh_id.payers pay ON i.payer_id = pay.id
                WHERE i.id = %s OR i.invoice_number = %s;
            """, (invoice_id, invoice_id))
            inv = cur.fetchone()
            if not inv:
                return None
            inv_dict = dict(inv)

            # Fetch line items
            cur.execute("""
                SELECT id, invoice_id, charge_id, service_id, item_type, description, quantity, unit_price,
                       discount_amount, tax_amount, net_amount, total_price
                FROM oh_id.invoice_items
                WHERE invoice_id = %s;
            """, (inv_dict["id"],))
            inv_dict["items"] = [dict(r) for r in cur.fetchall()]

            # Fetch payments
            cur.execute("""
                SELECT id, invoice_id, amount, payment_mode, transaction_ref, status, gateway_name,
                       gateway_transaction_id, verified_at, payment_date
                FROM oh_id.payments
                WHERE invoice_id = %s
                ORDER BY payment_date DESC;
            """, (inv_dict["id"],))
            inv_dict["payments"] = [dict(r) for r in cur.fetchall()]

            return inv_dict

    def issue_invoice(self, invoice_id: str, issued_by: str = "usr-billing") -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.invoices
                SET payment_status = CASE WHEN payment_status = 'DRAFT' THEN 'PENDING' ELSE payment_status END,
                    issued_at = COALESCE(issued_at, CURRENT_TIMESTAMP)
                WHERE id = %s
                RETURNING *;
            """, (invoice_id,))
            row = cur.fetchone()
            if not row:
                raise ValueError("Invoice not found")
            return dict(row)

    def cancel_invoice(self, invoice_id: str, reason: str, cancelled_by: str = "usr-billing") -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.invoices
                SET payment_status = 'CANCELLED',
                    cancellation_reason = %s
                WHERE id = %s
                RETURNING *;
            """, (reason, invoice_id))
            row = cur.fetchone()
            if not row:
                raise ValueError("Invoice not found")
            return dict(row)

    def create_billing_adjustment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            adj_id = f"adj-{uuid.uuid4().hex[:8]}"
            invoice_id = data["invoice_id"]
            delta = _to_decimal(data["adjustment_delta"])
            
            # Fetch invoice
            cur.execute("SELECT id, total_amount, balance_amount, paid_amount FROM oh_id.invoices WHERE id = %s FOR UPDATE;", (invoice_id,))
            inv = cur.fetchone()
            if not inv:
                raise ValueError("Invoice not found")
            
            new_total = _to_decimal(inv["total_amount"]) - delta
            new_bal = _to_decimal(inv["balance_amount"]) - delta
            
            cur.execute("""
                INSERT INTO oh_id.billing_adjustments (
                    id, hospital_id, invoice_id, charge_id, patient_id,
                    adjustment_type, original_amount, adjusted_amount, adjustment_delta, reason, authorized_by
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                adj_id, data["hospital_id"], invoice_id, data.get("charge_id"), data["patient_id"],
                data.get("adjustment_type", "DISCOUNT").upper(), inv["total_amount"], new_total, delta,
                data["reason"], data.get("authorized_by", "usr-admin")
            ))
            adj_row = dict(cur.fetchone())

            # Update invoice totals
            cur.execute("""
                UPDATE oh_id.invoices
                SET total_amount = %s,
                    balance_amount = %s,
                    discount = discount + %s,
                    payment_status = CASE WHEN %s <= 0.00 THEN 'PAID' ELSE payment_status END
                WHERE id = %s;
            """, (new_total, new_bal, delta, new_bal, invoice_id))

            return adj_row

    # =========================================================================
    # 4. PAYMENTS, DIGITAL RECEIPTS & REFUNDS
    # =========================================================================

    def record_and_verify_payment(
        self,
        invoice_id: str,
        amount: Decimal,
        payment_mode: str = "UPI",
        transaction_ref: Optional[str] = None,
        gateway_name: Optional[str] = None,
        gateway_transaction_id: Optional[str] = None,
        gateway_signature: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        actor_id: str = "usr-billing"
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            # Idempotency check
            if idempotency_key:
                cur.execute("""
                    SELECT p.*, r.receipt_number 
                    FROM oh_id.payments p
                    LEFT JOIN oh_id.payment_receipts r ON p.id = r.payment_id
                    WHERE p.idempotency_key = %s;
                """, (idempotency_key,))
                existing = cur.fetchone()
                if existing:
                    return dict(existing)

            # Lock invoice row
            cur.execute("""
                SELECT id, patient_id, hospital_id, total_amount, paid_amount, balance_amount, payment_status
                FROM oh_id.invoices
                WHERE id = %s FOR UPDATE;
            """, (invoice_id,))
            inv = cur.fetchone()
            if not inv:
                raise ValueError("Invoice not found")

            amt = _to_decimal(amount)
            new_paid = _to_decimal(inv["paid_amount"]) + amt
            new_bal = _to_decimal(inv["total_amount"]) - new_paid
            if new_bal < Decimal("0.00"):
                new_bal = Decimal("0.00")

            new_status = "PAID" if new_bal <= Decimal("0.00") else "PARTIALLY_PAID"

            payment_id = f"pay-{uuid.uuid4().hex[:8]}"
            txn_ref = transaction_ref or f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

            cur.execute("""
                INSERT INTO oh_id.payments (
                    id, invoice_id, hospital_id, patient_id, amount, payment_mode,
                    transaction_ref, status, recorded_by, gateway_name, gateway_transaction_id,
                    gateway_signature, idempotency_key, verified_at, payment_date
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, 'SUCCESS', %s, %s, %s,
                    %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                ) RETURNING *;
            """, (
                payment_id, invoice_id, inv["hospital_id"], inv["patient_id"], amt, payment_mode.upper(),
                txn_ref, actor_id, gateway_name, gateway_transaction_id,
                gateway_signature, idempotency_key
            ))
            pay_row = dict(cur.fetchone())

            # Update invoice
            cur.execute("""
                UPDATE oh_id.invoices
                SET paid_amount = %s,
                    balance_amount = %s,
                    payment_status = %s,
                    paid_at = CASE WHEN %s = 'PAID' THEN CURRENT_TIMESTAMP ELSE paid_at END
                WHERE id = %s;
            """, (new_paid, new_bal, new_status, new_status, invoice_id))

            # Auto-generate digital payment receipt
            receipt_num = f"REC-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
            receipt_id = f"rec-{uuid.uuid4().hex[:8]}"
            sig_hash = f"SHA256:{uuid.uuid4().hex}"

            cur.execute("""
                INSERT INTO oh_id.payment_receipts (
                    id, receipt_number, payment_id, invoice_id, hospital_id, patient_id,
                    amount, currency, payment_mode, transaction_ref, digital_signature_hash
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, 'INR', %s, %s, %s
                ) RETURNING *;
            """, (
                receipt_id, receipt_num, payment_id, invoice_id, inv["hospital_id"], inv["patient_id"],
                amt, payment_mode.upper(), txn_ref, sig_hash
            ))
            rec_row = dict(cur.fetchone())
            pay_row["receipt"] = rec_row
            return pay_row

    def list_payment_receipts(
        self,
        hospital_id: Optional[str] = None,
        patient_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT r.id, r.receipt_number, r.payment_id, r.invoice_id, r.hospital_id, r.patient_id,
                       r.amount, r.currency, r.payment_mode, r.transaction_ref, r.digital_signature_hash, r.issued_at,
                       p.name AS patient_name, p.onehealth_id,
                       h.name AS hospital_name,
                       i.invoice_number
                FROM oh_id.payment_receipts r
                LEFT JOIN oh_id.patients p ON r.patient_id = p.id
                LEFT JOIN oh_id.hospitals h ON r.hospital_id = h.id
                LEFT JOIN oh_id.invoices i ON r.invoice_id = i.id
                WHERE 1=1
            """
            params: List[Any] = []
            if hospital_id:
                query += " AND r.hospital_id = %s"
                params.append(hospital_id)
            if patient_id:
                query += " AND r.patient_id = %s"
                params.append(patient_id)
            query += " ORDER BY r.issued_at DESC"
            cur.execute(query, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def request_refund(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            refund_id = f"ref-{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO oh_id.refunds (
                    id, hospital_id, payment_id, invoice_id, patient_id, amount, reason, status, requested_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, 'REQUESTED', %s
                ) RETURNING *;
            """, (
                refund_id, data["hospital_id"], data.get("payment_id"), data["invoice_id"],
                data["patient_id"], _to_decimal(data["amount"]), data["reason"], data.get("requested_by", "usr-billing")
            ))
            return dict(cur.fetchone())

    def approve_refund(self, refund_id: str, approved_by: str) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.refunds
                SET status = 'APPROVED', approved_by = %s, approved_at = CURRENT_TIMESTAMP
                WHERE id = %s RETURNING *;
            """, (approved_by, refund_id))
            row = cur.fetchone()
            if not row:
                raise ValueError("Refund request not found")
            return dict(row)

    def process_refund(self, refund_id: str, processed_by: str) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.refunds
                SET status = 'PROCESSED', processed_by = %s, processed_at = CURRENT_TIMESTAMP
                WHERE id = %s RETURNING *;
            """, (processed_by, refund_id))
            ref_row = cur.fetchone()
            if not ref_row:
                raise ValueError("Refund request not found")
            
            # Update invoice balance and status
            inv_id = ref_row["invoice_id"]
            amt = _to_decimal(ref_row["amount"])
            cur.execute("""
                UPDATE oh_id.invoices
                SET paid_amount = GREATEST(0.00, paid_amount - %s),
                    balance_amount = balance_amount + %s,
                    payment_status = 'REFUNDED'
                WHERE id = %s;
            """, (amt, amt, inv_id))
            return dict(ref_row)

    def list_refunds(self, hospital_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT r.id, r.hospital_id, r.payment_id, r.invoice_id, r.patient_id, r.amount, r.reason,
                       r.status, r.requested_by, r.approved_by, r.processed_by, r.requested_at, r.approved_at, r.processed_at,
                       p.name AS patient_name, p.onehealth_id,
                       i.invoice_number
                FROM oh_id.refunds r
                LEFT JOIN oh_id.patients p ON r.patient_id = p.id
                LEFT JOIN oh_id.invoices i ON r.invoice_id = i.id
                WHERE r.hospital_id = %s
            """
            params: List[Any] = [hospital_id]
            if status:
                query += " AND r.status = %s"
                params.append(status)
            query += " ORDER BY r.requested_at DESC"
            cur.execute(query, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    # =========================================================================
    # 5. INSURANCE PAYERS, PREAUTHORIZATIONS & CLAIMS
    # =========================================================================

    def list_payers(self, hospital_id: str, payer_type: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = "SELECT id, hospital_id, name, payer_code, payer_type, contact_person, contact_email, contact_phone, settlement_period_days, is_active FROM oh_id.payers WHERE hospital_id = %s"
            params: List[Any] = [hospital_id]
            if payer_type:
                query += " AND payer_type = %s"
                params.append(payer_type)
            query += " ORDER BY name"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def create_payer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            payer_id = data.get("id") or f"payer-{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO oh_id.payers (
                    id, hospital_id, name, payer_code, payer_type, contact_person, contact_email, contact_phone, settlement_period_days, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                payer_id, data["hospital_id"], data["name"], data["payer_code"].upper(),
                data.get("payer_type", "INSURANCE").upper(), data.get("contact_person"),
                data.get("contact_email"), data.get("contact_phone"), data.get("settlement_period_days", 30),
                data.get("is_active", True)
            ))
            return dict(cur.fetchone())

    def list_patient_insurance_policies(self, patient_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT pol.id, pol.patient_id, pol.payer_id, pol.policy_number, pol.member_id, pol.group_number,
                       pol.policy_holder_name, pol.relationship, pol.coverage_limit, pol.copay_percentage,
                       pol.valid_from, pol.valid_to, pol.status, pol.created_at,
                       pay.name AS payer_name, pay.payer_type
                FROM oh_id.patient_insurance_policies pol
                LEFT JOIN oh_id.payers pay ON pol.payer_id = pay.id
                WHERE pol.patient_id = %s
                ORDER BY pol.status, pol.valid_to DESC;
            """, (patient_id,))
            return [dict(r) for r in cur.fetchall()]

    def create_patient_insurance_policy(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            policy_id = data.get("id") or f"pol-{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO oh_id.patient_insurance_policies (
                    id, patient_id, payer_id, policy_number, member_id, group_number,
                    policy_holder_name, relationship, coverage_limit, copay_percentage,
                    valid_from, valid_to, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s
                ) RETURNING *;
            """, (
                policy_id, data["patient_id"], data["payer_id"], data["policy_number"],
                data["member_id"], data.get("group_number"), data.get("policy_holder_name"),
                data.get("relationship", "SELF"), _to_decimal(data.get("coverage_limit", 500000.00)),
                _to_decimal(data.get("copay_percentage", 0.00)), data.get("valid_from") or date.today(),
                data.get("valid_to") or date(2028, 12, 31), data.get("status", "ACTIVE")
            ))
            return dict(cur.fetchone())

    def create_preauthorization(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            preauth_id = data.get("id") or f"pre-{uuid.uuid4().hex[:8]}"
            preauth_num = f"PA-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("""
                INSERT INTO oh_id.preauthorizations (
                    id, preauth_number, hospital_id, patient_id, payer_id, policy_id, service_id,
                    diagnosis_code, clinical_justification, requested_amount, approved_amount,
                    status, external_preauth_ref, valid_until
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, 0.00,
                    'SUBMITTED', %s, CURRENT_DATE + INTERVAL '30 days'
                ) RETURNING *;
            """, (
                preauth_id, preauth_num, data["hospital_id"], data["patient_id"], data.get("payer_id"),
                data.get("policy_id"), data.get("service_id"), data.get("diagnosis_code"),
                data["clinical_justification"], _to_decimal(data["requested_amount"]),
                data.get("external_preauth_ref")
            ))
            return dict(cur.fetchone())

    def update_preauthorization_decision(
        self,
        preauth_id: str,
        status: str,
        approved_amount: Decimal = Decimal("0.00"),
        denial_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.preauthorizations
                SET status = %s,
                    approved_amount = %s,
                    denial_reason = %s,
                    decision_at = CURRENT_TIMESTAMP
                WHERE id = %s RETURNING *;
            """, (status.upper(), _to_decimal(approved_amount), denial_reason, preauth_id))
            row = cur.fetchone()
            if not row:
                raise ValueError("Preauthorization request not found")
            return dict(row)

    def list_preauthorizations(
        self,
        hospital_id: str,
        patient_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT pa.id, pa.preauth_number, pa.hospital_id, pa.patient_id, pa.payer_id, pa.policy_id, pa.service_id,
                       pa.diagnosis_code, pa.clinical_justification, pa.requested_amount, pa.approved_amount,
                       pa.status, pa.external_preauth_ref, pa.denial_reason, pa.valid_until, pa.submitted_at, pa.decision_at,
                       p.name AS patient_name, p.onehealth_id,
                       pay.name AS payer_name,
                       s.name AS service_name
                FROM oh_id.preauthorizations pa
                LEFT JOIN oh_id.patients p ON pa.patient_id = p.id
                LEFT JOIN oh_id.payers pay ON pa.payer_id = pay.id
                LEFT JOIN oh_id.services s ON pa.service_id = s.id
                WHERE pa.hospital_id = %s
            """
            params: List[Any] = [hospital_id]
            if patient_id:
                query += " AND pa.patient_id = %s"
                params.append(patient_id)
            if status:
                query += " AND pa.status = %s"
                params.append(status)
            query += " ORDER BY pa.submitted_at DESC"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def create_insurance_claim(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            claim_id = data.get("id") or f"clm-{uuid.uuid4().hex[:8]}"
            claim_num = f"CLM-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("""
                INSERT INTO oh_id.insurance_claims (
                    id, claim_number, hospital_id, patient_id, payer_id, policy_id, preauth_id,
                    invoice_id, encounter_id, admission_id, claimed_amount, approved_amount,
                    settled_amount, patient_copay_amount, status, external_claim_ref, submitted_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, 0.00,
                    0.00, 0.00, 'SUBMITTED', %s, CURRENT_TIMESTAMP
                ) RETURNING *;
            """, (
                claim_id, claim_num, data["hospital_id"], data["patient_id"], data.get("payer_id"),
                data.get("policy_id"), data.get("preauth_id"), data.get("invoice_id"),
                data.get("encounter_id"), data.get("admission_id"), _to_decimal(data["claimed_amount"]),
                data.get("external_claim_ref")
            ))
            claim_row = dict(cur.fetchone())

            # Add claim line items if provided
            items = data.get("items", [])
            for item in items:
                cur.execute("""
                    INSERT INTO oh_id.claim_items (
                        id, claim_id, charge_id, service_id, description, quantity, unit_price,
                        claimed_amount, approved_amount, patient_responsibility, status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, 0.00, 0.00, 'SUBMITTED'
                    );
                """, (
                    f"clmi-{uuid.uuid4().hex[:8]}", claim_id, item.get("charge_id"), item.get("service_id"),
                    item.get("description", "Claim Item"), _to_decimal(item.get("quantity", 1.00)),
                    _to_decimal(item.get("unit_price", 0.00)), _to_decimal(item.get("claimed_amount", 0.00))
                ))

            return claim_row

    def adjudicate_insurance_claim(
        self,
        claim_id: str,
        status: str,
        approved_amount: Decimal = Decimal("0.00"),
        settled_amount: Decimal = Decimal("0.00"),
        patient_copay_amount: Decimal = Decimal("0.00"),
        rejection_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.insurance_claims
                SET status = %s,
                    approved_amount = %s,
                    settled_amount = %s,
                    patient_copay_amount = %s,
                    rejection_reason = %s,
                    settled_at = CASE WHEN %s = 'SETTLED' THEN CURRENT_TIMESTAMP ELSE settled_at END
                WHERE id = %s RETURNING *;
            """, (
                status.upper(), _to_decimal(approved_amount), _to_decimal(settled_amount),
                _to_decimal(patient_copay_amount), rejection_reason, status.upper(), claim_id
            ))
            row = cur.fetchone()
            if not row:
                raise ValueError("Insurance claim not found")
            return dict(row)

    def list_insurance_claims(
        self,
        hospital_id: str,
        patient_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT c.id, c.claim_number, c.hospital_id, c.patient_id, c.payer_id, c.policy_id, c.preauth_id,
                       c.invoice_id, c.encounter_id, c.admission_id, c.claimed_amount, c.approved_amount,
                       c.settled_amount, c.patient_copay_amount, c.status, c.external_claim_ref, c.rejection_reason,
                       c.submitted_at, c.settled_at, c.created_at,
                       p.name AS patient_name, p.onehealth_id,
                       pay.name AS payer_name,
                       i.invoice_number
                FROM oh_id.insurance_claims c
                LEFT JOIN oh_id.patients p ON c.patient_id = p.id
                LEFT JOIN oh_id.payers pay ON c.payer_id = pay.id
                LEFT JOIN oh_id.invoices i ON c.invoice_id = i.id
                WHERE c.hospital_id = %s
            """
            params: List[Any] = [hospital_id]
            if patient_id:
                query += " AND c.patient_id = %s"
                params.append(patient_id)
            if status:
                query += " AND c.status = %s"
                params.append(status)
            query += " ORDER BY c.created_at DESC"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    # =========================================================================
    # 6. OPERATIONAL INTELLIGENCE & ANALYTICS
    # =========================================================================

    def get_hospital_financial_analytics(self, hospital_id: str) -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT hospital_id, hospital_name, gross_billed, total_discounts, total_taxes,
                       total_collected, total_outstanding, total_refunded, total_payer_pending,
                       total_invoices_count, paid_invoices_count, pending_invoices_count
                FROM oh_id.vw_hospital_financial_analytics
                WHERE hospital_id = %s;
            """, (hospital_id,))
            row = cur.fetchone()
            if not row:
                return {
                    "hospital_id": hospital_id,
                    "gross_billed": 0.00,
                    "total_collected": 0.00,
                    "total_outstanding": 0.00,
                    "total_refunded": 0.00,
                    "total_payer_pending": 0.00,
                    "total_invoices_count": 0,
                    "paid_invoices_count": 0,
                    "pending_invoices_count": 0
                }
            return dict(row)

    def get_hospital_operational_kpis(self, hospital_id: str) -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT hospital_id, hospital_name, today_appointments_count, today_consultations_count,
                       active_inpatient_count, total_operational_beds, occupied_beds_count,
                       today_emergency_count, verified_lab_results_count, finalized_radiology_reports_count
                FROM oh_id.vw_hospital_operational_kpis
                WHERE hospital_id = %s;
            """, (hospital_id,))
            row = cur.fetchone()
            if not row:
                return {
                    "hospital_id": hospital_id,
                    "today_appointments_count": 0,
                    "today_consultations_count": 0,
                    "active_inpatient_count": 0,
                    "total_operational_beds": 0,
                    "occupied_beds_count": 0,
                    "today_emergency_count": 0
                }
            res = dict(row)
            tot_beds = res.get("total_operational_beds") or 0
            occ_beds = res.get("occupied_beds_count") or 0
            res["bed_occupancy_percentage"] = round((occ_beds / tot_beds * 100), 1) if tot_beds > 0 else 0.0
            return res

    def get_department_performance_summary(self, hospital_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT department_id, hospital_id, department_name, active_doctors_count,
                       total_consultations_count, total_department_revenue
                FROM oh_id.vw_department_performance_summary
                WHERE hospital_id = %s
                ORDER BY total_department_revenue DESC;
            """, (hospital_id,))
            return [dict(r) for r in cur.fetchall()]
