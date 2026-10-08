"""
OH-ID PHASE 7: HEALTHCARE NETWORK & ECOSYSTEM REPOSITORY MIXIN
Sathus Technology Pvt Ltd
"""

import uuid
import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from backend.app.database.session import get_readonly_cursor, get_db_cursor

logger = logging.getLogger("ohid.phase7_network_repository")

class Phase7NetworkRepositoryMixin:
    """
    Repository mixin providing database operations for Multi-Provider Network,
    Cross-Provider Identity Matching, Granular Consent, Record Exchange,
    Referrals, Pharmacy, Diagnostics, Break-Glass Access, and Marketplace.
    """

    # -------------------------------------------------------------------------
    # 1. Network Providers & Facilities
    # -------------------------------------------------------------------------
    def list_network_providers(
        self,
        provider_type: Optional[str] = None,
        stage: Optional[str] = None,
        city: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = "SELECT * FROM oh_id.network_providers WHERE 1=1"
            params: List[Any] = []
            if provider_type:
                query += " AND provider_type = %s"
                params.append(provider_type)
            if stage:
                query += " AND onboarding_stage = %s"
                params.append(stage)
            if city:
                query += " AND LOWER(city) = LOWER(%s)"
                params.append(city)
            query += " ORDER BY rating DESC, created_at DESC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def get_network_provider(self, provider_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.network_providers WHERE id = %s;", (provider_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def register_network_provider(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            provider_id = payload.get("id") or f"prov-{uuid.uuid4().hex[:10]}"
            cur.execute("""
                INSERT INTO oh_id.network_providers (
                    id, organization_name, provider_type, registration_number, tax_id,
                    primary_contact_name, primary_email, primary_phone, city, state, country,
                    onboarding_stage, verification_documents, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                provider_id,
                payload["organization_name"],
                payload.get("provider_type", "HOSPITAL"),
                payload["registration_number"],
                payload.get("tax_id"),
                payload["primary_contact_name"],
                payload["primary_email"],
                payload["primary_phone"],
                payload["city"],
                payload["state"],
                payload.get("country", "India"),
                payload.get("onboarding_stage", "PENDING"),
                json.dumps(payload.get("verification_documents", [])),
                payload.get("is_active", True)
            ))
            return dict(cur.fetchone())

    def update_network_provider_stage(
        self,
        provider_id: str,
        stage: str,
        verified_by: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.network_providers
                SET onboarding_stage = %s,
                    verified_by = COALESCE(%s, verified_by),
                    verified_at = CASE WHEN %s IN ('VERIFIED', 'ACTIVE') THEN CURRENT_TIMESTAMP ELSE verified_at END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *;
            """, (stage, verified_by, stage, provider_id))
            row = cur.fetchone()
            return dict(row) if row else None

    def list_network_facilities(
        self,
        provider_id: Optional[str] = None,
        city: Optional[str] = None,
        emergency_only: bool = False
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = "SELECT * FROM oh_id.network_facilities WHERE is_active = TRUE"
            params: List[Any] = []
            if provider_id:
                query += " AND provider_id = %s"
                params.append(provider_id)
            if city:
                query += " AND LOWER(city) = LOWER(%s)"
                params.append(city)
            if emergency_only:
                query += " AND emergency_capable = TRUE"
            query += " ORDER BY facility_name ASC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------------------
    # 2. Cross-Provider Patient Identity Mappings
    # -------------------------------------------------------------------------
    def match_cross_provider_identity(
        self,
        identifier: str,
        provider_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            # Match by OH-ID or master patient id or phone
            cur.execute("""
                SELECT p.id AS patient_id, p.onehealth_id, p.name, p.gender, p.age, p.phone,
                       cpi.external_mrn, cpi.provider_id, cpi.match_confidence
                FROM oh_id.patients p
                LEFT JOIN oh_id.cross_provider_identities cpi ON p.id = cpi.master_patient_id
                WHERE p.onehealth_id = %s OR p.id = %s OR p.phone = %s
                LIMIT 1;
            """, (identifier, identifier, identifier))
            row = cur.fetchone()
            return dict(row) if row else None

    def link_cross_provider_identity(
        self,
        master_patient_id: str,
        onehealth_id: str,
        provider_id: str,
        external_mrn: str,
        confidence: float = 100.0,
        match_method: str = "EXACT_OHID_QR"
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            link_id = f"cpi-{uuid.uuid4().hex[:10]}"
            cur.execute("""
                INSERT INTO oh_id.cross_provider_identities (
                    id, master_patient_id, onehealth_id, provider_id, external_mrn, match_confidence, match_method, is_verified
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (provider_id, external_mrn) DO UPDATE SET
                    match_confidence = EXCLUDED.match_confidence,
                    match_method = EXCLUDED.match_method,
                    linked_at = CURRENT_TIMESTAMP
                RETURNING *;
            """, (link_id, master_patient_id, onehealth_id, provider_id, external_mrn, confidence, match_method))
            return dict(cur.fetchone())

    def get_cross_provider_identities_for_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT cpi.*, np.organization_name, np.provider_type
                FROM oh_id.cross_provider_identities cpi
                JOIN oh_id.network_providers np ON cpi.provider_id = np.id
                WHERE cpi.master_patient_id = %s
                ORDER BY cpi.linked_at DESC;
            """, (patient_id,))
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------------------
    # 3. Granular Multi-Provider Consents & Record Exchanges
    # -------------------------------------------------------------------------
    def grant_network_consent(
        self,
        patient_id: str,
        grantee_provider_id: str,
        consent_scope: str = "ALL_RECORDS",
        purpose: str = "CARE_TREATMENT",
        valid_days: int = 30,
        grantee_doctor_id: Optional[str] = None,
        grantor_provider_id: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            consent_id = f"cst-{uuid.uuid4().hex[:10]}"
            valid_from = datetime.now(timezone.utc)
            valid_until = valid_from + timedelta(days=valid_days)
            cur.execute("""
                INSERT INTO oh_id.network_consents (
                    id, patient_id, grantee_provider_id, grantee_doctor_id, grantor_provider_id,
                    consent_scope, purpose, status, valid_from, valid_until
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'GRANTED', %s, %s)
                RETURNING *;
            """, (
                consent_id, patient_id, grantee_provider_id, grantee_doctor_id,
                grantor_provider_id, consent_scope, purpose, valid_from, valid_until
            ))
            return dict(cur.fetchone())

    def revoke_network_consent(
        self,
        consent_id: str,
        patient_id: str,
        reason: str = "Revoked by patient"
    ) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.network_consents
                SET status = 'REVOKED',
                    revoked_at = CURRENT_TIMESTAMP,
                    revoked_reason = %s
                WHERE id = %s AND patient_id = %s
                RETURNING *;
            """, (reason, consent_id, patient_id))
            row = cur.fetchone()
            return dict(row) if row else None

    def verify_network_consent_access(
        self,
        patient_id: str,
        requester_provider_id: str,
        record_type: str,
        purpose: str = "CARE_TREATMENT"
    ) -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            now = datetime.now(timezone.utc)
            cur.execute("""
                SELECT * FROM oh_id.network_consents
                WHERE patient_id = %s 
                  AND grantee_provider_id = %s
                  AND status = 'GRANTED'
                  AND valid_until >= %s
                ORDER BY created_at DESC
                LIMIT 1;
            """, (patient_id, requester_provider_id, now))
            row = cur.fetchone()
            if not row:
                return {
                    "is_authorized": False,
                    "reason": "No active consent grant found for this provider and patient.",
                    "consent_id": None
                }

            cst = dict(row)
            scope = cst.get("consent_scope", "ALL_RECORDS")

            # Check scope restriction
            if scope != "ALL_RECORDS":
                if scope == "LABS_ONLY" and record_type not in ("LAB_REPORT", "LABORATORY"):
                    return {"is_authorized": False, "reason": f"Consent restricted to labs only, requested {record_type}.", "consent_id": cst["id"]}
                if scope == "PRESCRIPTIONS_ONLY" and record_type not in ("PRESCRIPTION",):
                    return {"is_authorized": False, "reason": f"Consent restricted to prescriptions only, requested {record_type}.", "consent_id": cst["id"]}
                if scope == "CONSULTATIONS_ONLY" and record_type not in ("CONSULTATION", "OPD"):
                    return {"is_authorized": False, "reason": f"Consent restricted to consultations only, requested {record_type}.", "consent_id": cst["id"]}

            return {
                "is_authorized": True,
                "reason": "Valid active consent grant.",
                "consent_id": cst["id"],
                "consent_scope": scope,
                "valid_until": cst["valid_until"]
            }

    def list_patient_network_consents(self, patient_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT c.*, np.organization_name AS grantee_provider_name, np.provider_type
                FROM oh_id.network_consents c
                JOIN oh_id.network_providers np ON c.grantee_provider_id = np.id
                WHERE c.patient_id = %s
                ORDER BY c.created_at DESC;
            """, (patient_id,))
            return [dict(r) for r in cur.fetchall()]

    def log_network_record_exchange(
        self,
        consent_id: Optional[str],
        patient_id: str,
        source_provider_id: str,
        requester_provider_id: str,
        requester_user_id: str,
        record_type: str,
        record_id: str,
        provenance_hash: str,
        purpose: str,
        is_break_glass: bool = False
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            exchange_id = f"exc-{uuid.uuid4().hex[:10]}"
            cur.execute("""
                INSERT INTO oh_id.network_record_exchanges (
                    id, consent_id, patient_id, source_provider_id, requester_provider_id,
                    requester_user_id, record_type, record_id, provenance_hash, purpose, is_emergency_break_glass
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """, (
                exchange_id, consent_id, patient_id, source_provider_id, requester_provider_id,
                requester_user_id, record_type, record_id, provenance_hash, purpose, is_break_glass
            ))
            return dict(cur.fetchone())

    def get_patient_network_access_history(self, patient_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT e.*, np.organization_name AS requester_organization, sp.organization_name AS source_organization
                FROM oh_id.network_record_exchanges e
                LEFT JOIN oh_id.network_providers np ON e.requester_provider_id = np.id
                LEFT JOIN oh_id.network_providers sp ON e.source_provider_id = sp.id
                WHERE e.patient_id = %s
                ORDER BY e.accessed_at DESC;
            """, (patient_id,))
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------------------
    # 4. Inter-Provider Referrals
    # -------------------------------------------------------------------------
    def create_network_referral(
        self,
        patient_id: str,
        referring_provider_id: str,
        referring_doctor_id: str,
        target_provider_id: str,
        target_specialty: str,
        clinical_summary: str,
        referral_question: Optional[str] = None,
        urgency: str = "ROUTINE",
        referring_doctor_name: Optional[str] = None,
        attached_record_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            ref_id = f"ref-{uuid.uuid4().hex[:10]}"
            cur.execute("""
                INSERT INTO oh_id.network_referrals (
                    id, patient_id, referring_provider_id, referring_doctor_id, referring_doctor_name,
                    target_provider_id, target_specialty, urgency, clinical_summary, referral_question,
                    attached_record_ids, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING')
                RETURNING *;
            """, (
                ref_id, patient_id, referring_provider_id, referring_doctor_id, referring_doctor_name,
                target_provider_id, target_specialty, urgency, clinical_summary, referral_question,
                json.dumps(attached_record_ids or [])
            ))
            return dict(cur.fetchone())

    def list_network_referrals(
        self,
        provider_id: str,
        direction: str = "INCOMING"
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            if direction.upper() == "INCOMING":
                cur.execute("""
                    SELECT r.*, p.name AS patient_name, p.onehealth_id,
                           rp.organization_name AS referring_provider_name
                    FROM oh_id.network_referrals r
                    JOIN oh_id.patients p ON r.patient_id = p.id
                    JOIN oh_id.network_providers rp ON r.referring_provider_id = rp.id
                    WHERE r.target_provider_id = %s
                    ORDER BY r.created_at DESC;
                """, (provider_id,))
            else:
                cur.execute("""
                    SELECT r.*, p.name AS patient_name, p.onehealth_id,
                           tp.organization_name AS target_provider_name
                    FROM oh_id.network_referrals r
                    JOIN oh_id.patients p ON r.patient_id = p.id
                    JOIN oh_id.network_providers tp ON r.target_provider_id = tp.id
                    WHERE r.referring_provider_id = %s
                    ORDER BY r.created_at DESC;
                """, (provider_id,))
            return [dict(r) for r in cur.fetchall()]

    def update_network_referral_status(
        self,
        referral_id: str,
        status: str,
        response_notes: Optional[str] = None,
        target_appointment_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.network_referrals
                SET status = %s,
                    response_notes = COALESCE(%s, response_notes),
                    target_appointment_id = COALESCE(%s, target_appointment_id),
                    completed_at = CASE WHEN %s = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END
                WHERE id = %s
                RETURNING *;
            """, (status, response_notes, target_appointment_id, status, referral_id))
            row = cur.fetchone()
            return dict(row) if row else None

    # -------------------------------------------------------------------------
    # 5. Connected Pharmacy Network
    # -------------------------------------------------------------------------
    def verify_network_prescription(self, prescription_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT rx.*, p.name AS patient_name, p.onehealth_id, d.name AS doctor_name, h.name AS hospital_name
                FROM oh_id.prescriptions rx
                JOIN oh_id.patients p ON rx.patient_id = p.id
                LEFT JOIN oh_id.doctors d ON rx.doctor_id = d.id
                LEFT JOIN oh_id.hospitals h ON rx.hospital_id = h.id
                WHERE rx.id = %s;
            """, (prescription_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def record_pharmacy_dispensation(
        self,
        prescription_id: str,
        patient_id: str,
        prescribing_hospital_id: str,
        dispensing_pharmacy_id: str,
        dispensed_items: List[Dict[str, Any]],
        dispensing_status: str = "DISPENSED",
        pharmacist_id: Optional[str] = None,
        pharmacist_name: Optional[str] = None,
        batch_numbers: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            disp_id = f"dsp-{uuid.uuid4().hex[:10]}"
            cur.execute("""
                INSERT INTO oh_id.network_pharmacy_dispensations (
                    id, prescription_id, patient_id, prescribing_hospital_id, dispensing_pharmacy_id,
                    dispensing_pharmacist_id, dispensing_pharmacist_name, dispensed_items, dispensing_status,
                    batch_numbers, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """, (
                disp_id, prescription_id, patient_id, prescribing_hospital_id, dispensing_pharmacy_id,
                pharmacist_id, pharmacist_name, json.dumps(dispensed_items), dispensing_status,
                json.dumps(batch_numbers or {}), notes
            ))
            return dict(cur.fetchone())

    def list_network_pharmacy_dispensations(
        self,
        pharmacy_id: Optional[str] = None,
        patient_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT d.*, p.name AS patient_name, p.onehealth_id, np.organization_name AS pharmacy_name
                FROM oh_id.network_pharmacy_dispensations d
                JOIN oh_id.patients p ON d.patient_id = p.id
                JOIN oh_id.network_providers np ON d.dispensing_pharmacy_id = np.id
                WHERE 1=1
            """
            params: List[Any] = []
            if pharmacy_id:
                query += " AND d.dispensing_pharmacy_id = %s"
                params.append(pharmacy_id)
            if patient_id:
                query += " AND d.patient_id = %s"
                params.append(patient_id)
            query += " ORDER BY d.dispensed_at DESC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------------------
    # 6. Connected Diagnostic Network
    # -------------------------------------------------------------------------
    def create_diagnostic_order(
        self,
        order_id: str,
        patient_id: str,
        ordering_provider_id: str,
        diagnostic_lab_id: str,
        test_codes: List[str]
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            diag_id = f"dgo-{uuid.uuid4().hex[:10]}"
            cur.execute("""
                INSERT INTO oh_id.network_diagnostic_orders (
                    id, order_id, patient_id, ordering_provider_id, diagnostic_lab_id, test_codes, specimen_status
                ) VALUES (%s, %s, %s, %s, %s, %s, 'ORDERED')
                RETURNING *;
            """, (diag_id, order_id, patient_id, ordering_provider_id, diagnostic_lab_id, json.dumps(test_codes)))
            return dict(cur.fetchone())

    def update_diagnostic_specimen_status(
        self,
        order_id: str,
        status: str,
        critical_flag: bool = False,
        result_report_id: Optional[str] = None,
        turnaround_minutes: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.network_diagnostic_orders
                SET specimen_status = %s,
                    critical_flag = %s,
                    result_report_id = COALESCE(%s, result_report_id),
                    turnaround_minutes = COALESCE(%s, turnaround_minutes),
                    specimen_collected_at = CASE WHEN %s = 'SPECIMEN_COLLECTED' AND specimen_collected_at IS NULL THEN CURRENT_TIMESTAMP ELSE specimen_collected_at END,
                    completed_at = CASE WHEN %s = 'REPORT_READY' THEN CURRENT_TIMESTAMP ELSE completed_at END
                WHERE order_id = %s OR id = %s
                RETURNING *;
            """, (status, critical_flag, result_report_id, turnaround_minutes, status, status, order_id, order_id))
            row = cur.fetchone()
            return dict(row) if row else None

    def list_diagnostic_orders(
        self,
        diagnostic_lab_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        critical_only: bool = False
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT d.*, p.name AS patient_name, p.onehealth_id,
                       op.organization_name AS ordering_provider_name,
                       lp.organization_name AS lab_name
                FROM oh_id.network_diagnostic_orders d
                JOIN oh_id.patients p ON d.patient_id = p.id
                LEFT JOIN oh_id.network_providers op ON d.ordering_provider_id = op.id
                LEFT JOIN oh_id.network_providers lp ON d.diagnostic_lab_id = lp.id
                WHERE 1=1
            """
            params: List[Any] = []
            if diagnostic_lab_id:
                query += " AND d.diagnostic_lab_id = %s"
                params.append(diagnostic_lab_id)
            if patient_id:
                query += " AND d.patient_id = %s"
                params.append(patient_id)
            if critical_only:
                query += " AND d.critical_flag = TRUE"
            query += " ORDER BY d.created_at DESC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------------------
    # 7. Emergency Break-Glass Protocol
    # -------------------------------------------------------------------------
    def record_emergency_break_glass_access(
        self,
        patient_id: str,
        provider_id: str,
        clinician_id: str,
        clinician_name: str,
        reason: str,
        triage_level: str = "EMERGENT",
        accessed_records: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            bg_id = f"ebg-{uuid.uuid4().hex[:10]}"
            cur.execute("""
                INSERT INTO oh_id.emergency_break_glass_logs (
                    id, patient_id, provider_id, clinician_id, clinician_name, reason,
                    triage_level, accessed_records, patient_notified, authorized_window_minutes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, 120)
                RETURNING *;
            """, (
                bg_id, patient_id, provider_id, clinician_id, clinician_name, reason,
                triage_level, json.dumps(accessed_records or ["ALLERGIES", "CHRONIC_CONDITIONS", "RECENT_MEDS"])
            ))
            return dict(cur.fetchone())

    def list_emergency_break_glass_logs(
        self,
        provider_id: Optional[str] = None,
        patient_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT l.*, p.name AS patient_name, p.onehealth_id, np.organization_name AS provider_name
                FROM oh_id.emergency_break_glass_logs l
                JOIN oh_id.patients p ON l.patient_id = p.id
                JOIN oh_id.network_providers np ON l.provider_id = np.id
                WHERE 1=1
            """
            params: List[Any] = []
            if provider_id:
                query += " AND l.provider_id = %s"
                params.append(provider_id)
            if patient_id:
                query += " AND l.patient_id = %s"
                params.append(patient_id)
            query += " ORDER BY l.created_at DESC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------------------
    # 8. Network Marketplace, Directory & Unified Timeline
    # -------------------------------------------------------------------------
    def search_network_marketplace(
        self,
        query: Optional[str] = None,
        specialty: Optional[str] = None,
        category: Optional[str] = None,
        city: Optional[str] = None,
        max_price: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            sql = """
                SELECT s.*, np.organization_name, np.provider_type, np.city AS provider_city,
                       nf.facility_name, nf.address_line, nf.emergency_capable
                FROM oh_id.network_service_offerings s
                JOIN oh_id.network_providers np ON s.provider_id = np.id
                LEFT JOIN oh_id.network_facilities nf ON s.facility_id = nf.id
                WHERE s.is_active = TRUE AND np.is_active = TRUE
            """
            params: List[Any] = []
            if query:
                sql += " AND (s.service_name ILIKE %s OR s.specialty ILIKE %s OR np.organization_name ILIKE %s)"
                term = f"%{query}%"
                params.extend([term, term, term])
            if specialty:
                sql += " AND s.specialty ILIKE %s"
                params.append(f"%{specialty}%")
            if category:
                sql += " AND s.category = %s"
                params.append(category)
            if city:
                sql += " AND LOWER(np.city) = LOWER(%s)"
                params.append(city)
            if max_price is not None:
                sql += " AND s.standard_rate <= %s"
                params.append(max_price)
            sql += " ORDER BY s.rating DESC, s.standard_rate ASC;"
            cur.execute(sql, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def get_network_unified_patient_timeline(self, patient_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.vw_network_unified_patient_timeline
                WHERE patient_id = %s
                ORDER BY event_date DESC;
            """, (patient_id,))
            return [dict(r) for r in cur.fetchall()]

    def get_network_intelligence_telemetry(self) -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT COUNT(*) AS c FROM oh_id.network_providers WHERE is_active = TRUE;")
            total_providers = list(cur.fetchone().values())[0]

            cur.execute("SELECT COUNT(*) AS c FROM oh_id.network_facilities WHERE is_active = TRUE;")
            total_facilities = list(cur.fetchone().values())[0]

            cur.execute("SELECT COUNT(*) AS c FROM oh_id.network_consents WHERE status = 'GRANTED';")
            active_consents = list(cur.fetchone().values())[0]

            cur.execute("SELECT COUNT(*) AS c FROM oh_id.network_record_exchanges;")
            total_exchanges = list(cur.fetchone().values())[0]

            cur.execute("SELECT * FROM oh_id.vw_network_referral_analytics;")
            referrals = [dict(r) for r in cur.fetchall()]

            return {
                "active_providers_count": total_providers,
                "active_facilities_count": total_facilities,
                "active_consents_count": active_consents,
                "total_record_exchanges_count": total_exchanges,
                "referral_analytics": referrals
            }
