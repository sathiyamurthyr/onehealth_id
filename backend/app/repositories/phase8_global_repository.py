"""
OH-ID PHASE 8: GLOBAL HEALTHCARE PLATFORM & ECOSYSTEM REPOSITORY MIXIN
Sathus Technology Pvt Ltd
"""

import uuid
import hashlib
import json
import logging
import secrets
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.app.database.session import get_readonly_cursor, get_db_cursor

logger = logging.getLogger("ohid.phase8_global_repository")

class Phase8GlobalRepositoryMixin:
    """
    Repository mixin providing database operations for Multi-Country Localization,
    Global Cross-Border Identifiers, Developer Ecosystem, Telehealth, Wearables,
    Global Payer Claims, and Research Cohort Governance.
    """

    # -------------------------------------------------------------------------
    # 1. Country Configurations & Regional Data Residency
    # -------------------------------------------------------------------------
    def list_country_configs(self, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = "SELECT * FROM oh_id.country_configs WHERE 1=1"
            params: List[Any] = []
            if is_active is not None:
                query += " AND is_active = %s"
                params.append(is_active)
            query += " ORDER BY country_name ASC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def get_country_config(self, country_code: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.country_configs WHERE country_code = %s;", (country_code.upper(),))
            row = cur.fetchone()
            return dict(row) if row else None

    def upsert_country_config(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.country_configs (
                    country_code, country_name, currency_code, currency_symbol,
                    default_timezone, supported_languages, date_format, phone_prefix,
                    national_health_id_name, interop_standard, data_residency_region,
                    tax_rate, is_active, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                )
                ON CONFLICT (country_code) DO UPDATE SET
                    country_name = EXCLUDED.country_name,
                    currency_code = EXCLUDED.currency_code,
                    currency_symbol = EXCLUDED.currency_symbol,
                    default_timezone = EXCLUDED.default_timezone,
                    supported_languages = EXCLUDED.supported_languages,
                    date_format = EXCLUDED.date_format,
                    phone_prefix = EXCLUDED.phone_prefix,
                    national_health_id_name = EXCLUDED.national_health_id_name,
                    interop_standard = EXCLUDED.interop_standard,
                    data_residency_region = EXCLUDED.data_residency_region,
                    tax_rate = EXCLUDED.tax_rate,
                    is_active = EXCLUDED.is_active,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *;
            """, (
                payload["country_code"].upper(),
                payload["country_name"],
                payload.get("currency_code", "INR"),
                payload.get("currency_symbol", "₹"),
                payload.get("default_timezone", "Asia/Kolkata"),
                json.dumps(payload.get("supported_languages", ["en"])),
                payload.get("date_format", "DD/MM/YYYY"),
                payload.get("phone_prefix", "+91"),
                payload.get("national_health_id_name", "National Health ID"),
                payload.get("interop_standard", "FHIR_R4"),
                payload.get("data_residency_region", "LOCAL"),
                payload.get("tax_rate", 18.0),
                payload.get("is_active", True)
            ))
            return dict(cur.fetchone())

    # -------------------------------------------------------------------------
    # 2. Global Sovereign Identity & Cross-Border Identifier Mappings
    # -------------------------------------------------------------------------
    def list_global_identities(
        self,
        patient_id: Optional[str] = None,
        country_code: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT g.*, p.name as patient_name, p.onehealth_id
                FROM oh_id.global_identities g
                JOIN oh_id.patients p ON g.master_patient_id = p.id
                WHERE 1=1
            """
            params: List[Any] = []
            if patient_id:
                query += " AND g.master_patient_id = %s"
                params.append(patient_id)
            if country_code:
                query += " AND g.country_code = %s"
                params.append(country_code.upper())
            query += " ORDER BY g.linked_at DESC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def link_global_identity(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            gid_id = payload.get("id") or f"gid-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.global_identities (
                    id, master_patient_id, country_code, identifier_type,
                    identifier_value, issuing_authority, is_verified
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (country_code, identifier_type, identifier_value)
                DO UPDATE SET
                    master_patient_id = EXCLUDED.master_patient_id,
                    issuing_authority = EXCLUDED.issuing_authority,
                    is_verified = EXCLUDED.is_verified,
                    verified_at = CURRENT_TIMESTAMP
                RETURNING *;
            """, (
                gid_id,
                payload["master_patient_id"],
                payload["country_code"].upper(),
                payload["identifier_type"].upper(),
                payload["identifier_value"],
                payload.get("issuing_authority"),
                payload.get("is_verified", True)
            ))
            return dict(cur.fetchone())

    def lookup_patient_by_global_identity(
        self,
        country_code: str,
        identifier_type: str,
        identifier_value: str
    ) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT g.*, p.name as patient_name, p.onehealth_id, p.gender, p.blood_group, p.phone
                FROM oh_id.global_identities g
                JOIN oh_id.patients p ON g.master_patient_id = p.id
                WHERE g.country_code = %s AND g.identifier_type = %s AND g.identifier_value = %s;
            """, (country_code.upper(), identifier_type.upper(), identifier_value))
            row = cur.fetchone()
            return dict(row) if row else None

    # -------------------------------------------------------------------------
    # 3. Developer Ecosystem & Third-Party Apps
    # -------------------------------------------------------------------------
    def list_developer_apps(
        self,
        organization_name: Optional[str] = None,
        app_category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = "SELECT * FROM oh_id.developer_apps WHERE 1=1"
            params: List[Any] = []
            if organization_name:
                query += " AND organization_name ILIKE %s"
                params.append(f"%{organization_name}%")
            if app_category:
                query += " AND app_category = %s"
                params.append(app_category)
            query += " ORDER BY created_at DESC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def get_developer_app(self, app_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.developer_apps WHERE id = %s;", (app_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def register_developer_app(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            app_id = payload.get("id") or f"app-{uuid.uuid4().hex[:10]}"
            client_id = payload.get("client_id") or f"client_{uuid.uuid4().hex[:16]}"
            raw_secret = secrets.token_hex(24)
            secret_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()

            cur.execute("""
                INSERT INTO oh_id.developer_apps (
                    id, app_name, organization_name, developer_email, client_id, client_secret_hash,
                    app_category, permission_scopes, environment, status, rate_limit_per_minute
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                app_id,
                payload["app_name"],
                payload.get("organization_name") or payload.get("developer_organization", "Independent Developer"),
                payload.get("developer_email") or payload.get("contact_email", "developer@example.com"),
                client_id,
                secret_hash,
                payload.get("app_category") or payload.get("app_type", "HOSPITAL_INTEGRATION"),
                json.dumps(payload.get("permission_scopes") or payload.get("allowed_scopes", ["patient.read", "records.read"])),
                payload.get("environment", "SANDBOX"),
                payload.get("status", "APPROVED"),
                payload.get("rate_limit_per_minute", 120)
            ))
            row = dict(cur.fetchone())
            row["client_secret_plaintext"] = raw_secret
            return row

    def create_api_key(
        self,
        app_id: str,
        name: str = "Default API Key",
        key_name: Optional[str] = None,
        is_active: bool = True
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            key_title = key_name or name
            raw_secret = secrets.token_urlsafe(32)
            key_id = f"key-{uuid.uuid4().hex[:8]}"
            key_prefix = f"oh_live_{secrets.token_hex(3)}"
            full_raw_token = f"{key_prefix}_{raw_secret}"
            key_hash = hashlib.sha256(full_raw_token.encode("utf-8")).hexdigest()

            cur.execute("""
                INSERT INTO oh_id.developer_api_keys (
                    id, app_id, key_prefix, api_key_hash, name, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                key_id, app_id, key_prefix, key_hash, key_title, is_active
            ))
            row = dict(cur.fetchone())
            row["raw_api_key"] = full_raw_token
            return row

    def list_api_keys(self, app_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT id, app_id, key_prefix, name, is_active, created_at, last_used_at, expires_at
                FROM oh_id.developer_api_keys
                WHERE app_id = %s
                ORDER BY created_at DESC;
            """, (app_id,))
            return [dict(r) for r in cur.fetchall()]

    def revoke_api_key(self, key_id: str) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.developer_api_keys
                SET is_active = FALSE
                WHERE id = %s
                RETURNING *;
            """, (key_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    # -------------------------------------------------------------------------
    # 4. Webhook Subscriptions & Events
    # -------------------------------------------------------------------------
    def list_webhooks(self, app_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = "SELECT * FROM oh_id.webhook_subscriptions WHERE 1=1"
            params: List[Any] = []
            if app_id:
                query += " AND app_id = %s"
                params.append(app_id)
            query += " ORDER BY created_at DESC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def create_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            wh_id = payload.get("id") or f"wh-{uuid.uuid4().hex[:10]}"
            cur.execute("""
                INSERT INTO oh_id.webhook_subscriptions (
                    id, app_id, target_url, subscribed_events, secret_signature_key, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                wh_id,
                payload["app_id"],
                payload["target_url"],
                json.dumps(payload.get("subscribed_events", ["encounter.created", "prescription.finalized"])),
                payload.get("secret_signature_key") or payload.get("secret_token") or secrets.token_hex(16),
                payload.get("is_active", True)
            ))
            return dict(cur.fetchone())

    # -------------------------------------------------------------------------
    # 5. Telehealth Virtual Consultations
    # -------------------------------------------------------------------------
    def list_telehealth_sessions(
        self,
        patient_id: Optional[str] = None,
        doctor_id: Optional[str] = None,
        session_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT t.*, p.name as patient_name, p.onehealth_id, d.name as doctor_name, d.specialty, h.name as hospital_name
                FROM oh_id.telehealth_sessions t
                JOIN oh_id.patients p ON t.patient_id = p.id
                JOIN oh_id.doctors d ON t.doctor_id = d.id
                JOIN oh_id.hospitals h ON t.hospital_id = h.id
                WHERE 1=1
            """
            params: List[Any] = []
            if patient_id:
                query += " AND t.patient_id = %s"
                params.append(patient_id)
            if doctor_id:
                query += " AND t.doctor_id = %s"
                params.append(doctor_id)
            if session_status:
                query += " AND t.session_status = %s"
                params.append(session_status)
            query += " ORDER BY t.scheduled_start DESC;"
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def get_telehealth_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT t.*, p.name as patient_name, p.onehealth_id, d.name as doctor_name, d.specialty, h.name as hospital_name
                FROM oh_id.telehealth_sessions t
                JOIN oh_id.patients p ON t.patient_id = p.id
                JOIN oh_id.doctors d ON t.doctor_id = d.id
                JOIN oh_id.hospitals h ON t.hospital_id = h.id
                WHERE t.id = %s;
            """, (session_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def schedule_telehealth_session(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            # Resolve doctor_id if not provided
            doctor_id = payload.get("doctor_id")
            if not doctor_id:
                cur.execute("SELECT id FROM oh_id.doctors LIMIT 1;")
                doc_row = cur.fetchone()
                doctor_id = doc_row["id"] if doc_row else "doc-01"

            # Resolve hospital_id if not provided
            hospital_id = payload.get("hospital_id")
            if not hospital_id:
                cur.execute("SELECT id FROM oh_id.hospitals LIMIT 1;")
                hosp_row = cur.fetchone()
                hospital_id = hosp_row["id"] if hosp_row else "hosp-kedar"

            session_id = payload.get("id") or f"tele-{uuid.uuid4().hex[:10]}"
            session_token = f"tok_tele_{uuid.uuid4().hex[:16]}"
            room_id = payload.get("room_id") or f"room_{uuid.uuid4().hex[:8]}"
            room_url = payload.get("room_url") or f"https://telehealth.onehealth.io/room/{room_id}?token={session_token}"
            patient_join_url = f"{room_url}&role=patient"
            doctor_join_url = f"{room_url}&role=doctor"

            cur.execute("""
                INSERT INTO oh_id.telehealth_sessions (
                    id, session_token, patient_id, doctor_id, hospital_id,
                    scheduled_start, duration_minutes, session_status, room_url,
                    recording_consent_granted, clinical_notes_draft
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                session_id,
                session_token,
                payload["patient_id"],
                doctor_id,
                hospital_id,
                payload["scheduled_start"],
                payload.get("duration_minutes", 30),
                payload.get("session_status", "SCHEDULED"),
                room_url,
                payload.get("recording_enabled", False) or payload.get("recording_consent_granted", False),
                payload.get("consultation_notes") or payload.get("clinical_notes_draft")
            ))
            row = dict(cur.fetchone())
            row["room_id"] = room_id
            row["patient_join_url"] = patient_join_url
            row["doctor_join_url"] = doctor_join_url
            return row

    def update_telehealth_session(
        self,
        session_id: str,
        session_status: Optional[str] = None,
        recording_url: Optional[str] = None,
        consultation_notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            updates = []
            params: List[Any] = []
            if session_status:
                updates.append("session_status = %s")
                params.append(session_status)
                if session_status == "IN_PROGRESS":
                    updates.append("actual_start = CURRENT_TIMESTAMP")
                elif session_status in ("COMPLETED", "CANCELLED", "NO_SHOW"):
                    updates.append("actual_end = CURRENT_TIMESTAMP")
            if consultation_notes:
                updates.append("clinical_notes_draft = %s")
                params.append(consultation_notes)

            if not updates:
                return self.get_telehealth_session(session_id)

            params.append(session_id)
            query = f"UPDATE oh_id.telehealth_sessions SET {', '.join(updates)} WHERE id = %s RETURNING *;"
            cur.execute(query, tuple(params))
            row = cur.fetchone()
            if not row:
                return None
            res = dict(row)
            res["consultation_notes"] = res.get("clinical_notes_draft")
            return res

    # -------------------------------------------------------------------------
    # 6. Remote Patient Monitoring (RPM) & Wearable Streams
    # -------------------------------------------------------------------------
    def ingest_wearable_observation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            obs_id = payload.get("id") or f"rpm-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.wearable_observations (
                    id, patient_id, device_type, device_model, metric_type,
                    value_numeric, unit, is_abnormal, recorded_at, source_provenance
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                obs_id,
                payload["patient_id"],
                payload.get("device_type") or payload.get("device_vendor", "APPLE_WATCH"),
                payload.get("device_model", "SmartWatch Series 9"),
                payload["metric_type"],
                payload.get("value_numeric") if "value_numeric" in payload else payload["metric_value"],
                payload.get("unit", "bpm"),
                payload.get("is_abnormal", False),
                payload.get("recorded_at") or datetime.now(timezone.utc),
                payload.get("source_provenance", "DEVICE_STREAM")
            ))
            row = dict(cur.fetchone())
            row["metric_value"] = float(row["value_numeric"]) if row.get("value_numeric") is not None else 0.0
            return row

    def list_wearable_observations(
        self,
        patient_id: str,
        metric_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = "SELECT * FROM oh_id.wearable_observations WHERE patient_id = %s"
            params: List[Any] = [patient_id]
            if metric_type:
                query += " AND metric_type = %s"
                params.append(metric_type)
            query += " ORDER BY recorded_at DESC LIMIT %s;"
            params.append(limit)
            cur.execute(query, tuple(params))
            rows = [dict(r) for r in cur.fetchall()]
            for r in rows:
                r["metric_value"] = float(r["value_numeric"]) if r.get("value_numeric") is not None else 0.0
            return rows

    def get_wearable_patient_stream(self, patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            if patient_id:
                cur.execute("SELECT * FROM oh_id.vw_wearable_patient_stream WHERE patient_id = %s;", (patient_id,))
            else:
                cur.execute("SELECT * FROM oh_id.vw_wearable_patient_stream;")
            rows = [dict(r) for r in cur.fetchall()]
            for r in rows:
                r["metric_value"] = float(r["value_numeric"]) if r.get("value_numeric") is not None else 0.0
            return rows

    # -------------------------------------------------------------------------
    # 7. Global Payer Network & Multi-Country Claims
    # -------------------------------------------------------------------------
    def list_global_payer_claims(
        self,
        patient_id: Optional[str] = None,
        country_code: Optional[str] = None,
        adjudication_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = """
                SELECT c.*, p.name as patient_name, h.name as hospital_name
                FROM oh_id.global_payer_claims c
                JOIN oh_id.patients p ON c.patient_id = p.id
                JOIN oh_id.hospitals h ON c.hospital_id = h.id
                WHERE 1=1
            """
            params: List[Any] = []
            if patient_id:
                query += " AND c.patient_id = %s"
                params.append(patient_id)
            if adjudication_status:
                query += " AND c.claim_status = %s"
                params.append(adjudication_status)
            query += " ORDER BY c.submitted_at DESC;"
            cur.execute(query, tuple(params))
            rows = [dict(r) for r in cur.fetchall()]
            for r in rows:
                r["adjudication_status"] = r.get("claim_status")
                r["claim_amount"] = float(r.get("billed_amount", 0.0))
            return rows

    def submit_global_payer_claim(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            # Resolve hospital_id
            hospital_id = payload.get("hospital_id")
            if not hospital_id:
                cur.execute("SELECT id FROM oh_id.hospitals LIMIT 1;")
                hosp_row = cur.fetchone()
                hospital_id = hosp_row["id"] if hosp_row else "hosp-kedar"

            claim_id = payload.get("id") or f"clm-{uuid.uuid4().hex[:10]}"
            claim_number = payload.get("claim_number") or f"CLM-{datetime.now().strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
            billed_amount = payload.get("billed_amount") if "billed_amount" in payload else payload.get("claim_amount", 0.0)
            payer_code = payload.get("payer_code") or payload.get("payer_identifier", "GLOBAL_PAYER")
            payer_name = payload.get("payer_name") or payer_code.replace("_", " ").title()

            cur.execute("""
                INSERT INTO oh_id.global_payer_claims (
                    id, claim_number, patient_id, hospital_id, payer_code,
                    payer_name, currency_code, billed_amount, copay_amount, claim_status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                claim_id,
                claim_number,
                payload["patient_id"],
                hospital_id,
                payer_code,
                payer_name,
                payload.get("currency_code", "INR"),
                billed_amount,
                payload.get("copay_amount", 0.0),
                payload.get("adjudication_status") or payload.get("claim_status", "SUBMITTED")
            ))
            row = dict(cur.fetchone())
            row["adjudication_status"] = row.get("claim_status")
            row["claim_amount"] = float(row.get("billed_amount", 0.0))
            return row

    def adjudicate_global_payer_claim(
        self,
        claim_id: str,
        status: str,
        approved_amount: float,
        adjudication_notes: str
    ) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.global_payer_claims
                SET claim_status = %s,
                    approved_amount = %s,
                    adjudication_notes = %s,
                    settled_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *;
            """, (status, approved_amount, adjudication_notes, claim_id))
            row = cur.fetchone()
            if not row:
                return None
            res = dict(row)
            res["adjudication_status"] = res.get("claim_status")
            res["approved_amount"] = float(res.get("approved_amount", 0.0)) if res.get("approved_amount") is not None else 0.0
            return res

    # -------------------------------------------------------------------------
    # 8. Research Cohorts & Anonymized Data Governance
    # -------------------------------------------------------------------------
    def list_research_cohorts(
        self,
        lead_institution: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            query = "SELECT * FROM oh_id.research_cohorts WHERE 1=1"
            params: List[Any] = []
            if lead_institution:
                query += " AND institution_name ILIKE %s"
                params.append(f"%{lead_institution}%")
            if status:
                query += " AND export_status = %s"
                params.append(status)
            query += " ORDER BY created_at DESC;"
            cur.execute(query, tuple(params))
            rows = [dict(r) for r in cur.fetchall()]
            for r in rows:
                r["study_title"] = r.get("cohort_name")
                r["lead_institution"] = r.get("institution_name")
            return rows

    def get_research_cohort(self, cohort_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.research_cohorts WHERE id = %s;", (cohort_id,))
            row = cur.fetchone()
            if not row:
                return None
            res = dict(row)
            res["study_title"] = res.get("cohort_name")
            res["lead_institution"] = res.get("institution_name")
            return res

    def create_research_cohort(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cohort_id = payload.get("id") or f"cohort-{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO oh_id.research_cohorts (
                    id, cohort_name, principal_investigator, institution_name,
                    irb_approval_number, inclusion_criteria, anonymization_method,
                    patient_count, export_status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                cohort_id,
                payload.get("cohort_name") or payload.get("study_title", "Clinical Cohort Study"),
                payload.get("principal_investigator", "Chief Investigator"),
                payload.get("institution_name") or payload.get("lead_institution", "Global Research Institute"),
                payload["irb_approval_number"],
                json.dumps(payload.get("inclusion_criteria", {})),
                payload.get("anonymization_method") or payload.get("de_identification_method", "K_ANONYMITY_AND_DIFFERENTIAL_PRIVACY"),
                payload.get("patient_count") or payload.get("cohort_patient_count", 0),
                payload.get("export_status") or payload.get("status", "APPROVED")
            ))
            row = dict(cur.fetchone())
            row["study_title"] = row.get("cohort_name")
            row["lead_institution"] = row.get("institution_name")
            return row

    # -------------------------------------------------------------------------
    # 9. Multi-Language Localization
    # -------------------------------------------------------------------------
    def get_localization_dictionary(
        self,
        language_code: str,
        category: Optional[str] = None
    ) -> Dict[str, str]:
        with get_readonly_cursor() as cur:
            query = "SELECT resource_key, resource_value FROM oh_id.localization_dictionaries WHERE language_code = %s"
            params: List[Any] = [language_code]
            if category:
                query += " AND category = %s"
                params.append(category)
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            return {r["resource_key"]: r["resource_value"] for r in rows}

    def upsert_localization_entry(
        self,
        language_code: str,
        resource_key: str,
        resource_value: str,
        category: str = "COMMON"
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.localization_dictionaries (
                    language_code, resource_key, resource_value, category, updated_at
                ) VALUES (
                    %s, %s, %s, %s, CURRENT_TIMESTAMP
                )
                ON CONFLICT (language_code, resource_key)
                DO UPDATE SET
                    resource_value = EXCLUDED.resource_value,
                    category = EXCLUDED.category,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *;
            """, (language_code, resource_key, resource_value, category))
            return dict(cur.fetchone())

    # -------------------------------------------------------------------------
    # 10. Global Platform Master Telemetry
    # -------------------------------------------------------------------------
    def get_global_platform_telemetry(self) -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_global_platform_telemetry;")
            row = cur.fetchone()
            if not row:
                return {}
            data = dict(row)
            # Add convenient alias mappings
            data["active_countries"] = data.get("active_countries_count", 0)
            data["connected_apps"] = data.get("active_developer_apps_count", 0)
            data["total_wearable_records"] = data.get("total_wearable_records_count", 0)
            data["total_claims_submitted"] = data.get("total_claims_count", 0)
            return data
