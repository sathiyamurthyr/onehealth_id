"""
OH-ID Phase 4: Interoperability, ABDM, FHIR & Connected Health Network Repository Mixin
=====================================================================================
Encapsulates all database view queries and transactional operations for:
1. Integration Registry & Credential Management
2. External Identity Resolution, Deterministic Matching & Conflict Quarantine
3. External Health Record Ingestion with Full Provenance Lineage
4. Granular Consent-Driven Cross-Hospital Record Sharing & Break-Glass Emergency Access
5. Inbound/Outbound Integration Event Bus, Webhooks & Dead-Letter Handling
6. Live Analytical Integration Monitoring & Telemetry
"""

from typing import List, Optional, Dict, Any
import json
import uuid
import logging
from datetime import datetime, timezone, timedelta
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.core.config import settings

logger = logging.getLogger("ohid.phase4_repository")

class Phase4RepositoryMixin:
    """Repository Mixin for Phase 4 Interoperability & Connected Health Network."""

    # --------------------------------------------------------------------------
    # 1. INTEGRATION REGISTRY & CONFIGURATION
    # --------------------------------------------------------------------------

    def list_integrations(
        self,
        hospital_id: Optional[str] = None,
        status: Optional[str] = None,
        integration_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists configured external healthcare system integrations."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []

            if hospital_id:
                clauses.append("i.hospital_id = %s")
                params.append(hospital_id)
            if status:
                clauses.append("i.status = %s")
                params.append(status)
            if integration_type:
                clauses.append("i.integration_type = %s")
                params.append(integration_type)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    i.id,
                    i.hospital_id,
                    h.name AS hospital_name,
                    i.integration_type,
                    i.provider_name,
                    i.endpoint_url,
                    i.auth_type,
                    i.status,
                    i.environment,
                    i.capabilities,
                    i.config,
                    i.last_successful_sync,
                    i.last_failure_at,
                    i.last_error_message,
                    i.created_at,
                    i.updated_at
                FROM oh_id.integrations i
                JOIN oh_id.hospitals h ON i.hospital_id = h.id
                {where_str}
                ORDER BY i.created_at DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_integration(self, integration_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single integration by ID."""
        with get_readonly_cursor() as cur:
            sql = """
                SELECT 
                    i.id,
                    i.hospital_id,
                    h.name AS hospital_name,
                    i.integration_type,
                    i.provider_name,
                    i.endpoint_url,
                    i.auth_type,
                    i.status,
                    i.environment,
                    i.webhook_secret,
                    i.capabilities,
                    i.config,
                    i.last_successful_sync,
                    i.last_failure_at,
                    i.last_error_message,
                    i.created_at,
                    i.updated_at
                FROM oh_id.integrations i
                JOIN oh_id.hospitals h ON i.hospital_id = h.id
                WHERE i.id = %s;
            """
            cur.execute(sql, (integration_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def create_integration(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Registers a new external integration into the registry."""
        integ_id = data.get("id") or f"integ-{uuid.uuid4().hex[:12]}"
        webhook_secret = data.get("webhook_secret") or f"whsec_{uuid.uuid4().hex}"
        capabilities = json.dumps(data.get("capabilities") or ["PATIENT_DISCOVERY", "RECORD_EXCHANGE", "DIAGNOSTIC_IMPORT"])
        config = json.dumps(data.get("config") or {})

        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.integrations (
                    id, hospital_id, integration_type, provider_name, endpoint_url,
                    auth_type, status, environment, webhook_secret, capabilities, config
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                RETURNING *;
            """, (
                integ_id,
                data["hospital_id"],
                data["integration_type"],
                data["provider_name"],
                data["endpoint_url"],
                data.get("auth_type", "BEARER_TOKEN"),
                data.get("status", "CONFIGURED"),
                data.get("environment", "SANDBOX"),
                webhook_secret,
                capabilities,
                config
            ))
            row = cur.fetchone()

            # Store credentials reference if provided
            if data.get("client_id") or data.get("client_secret") or data.get("api_key"):
                cred_id = f"cred-{uuid.uuid4().hex[:12]}"
                cur.execute("""
                    INSERT INTO oh_id.integration_credentials (
                        id, integration_id, client_id, encrypted_client_secret, encrypted_api_key, token_endpoint
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (integration_id) DO UPDATE SET
                        client_id = EXCLUDED.client_id,
                        encrypted_client_secret = EXCLUDED.encrypted_client_secret,
                        encrypted_api_key = EXCLUDED.encrypted_api_key,
                        updated_at = CURRENT_TIMESTAMP;
                """, (
                    cred_id,
                    integ_id,
                    data.get("client_id"),
                    data.get("client_secret"),
                    data.get("api_key"),
                    data.get("token_endpoint")
                ))

            return dict(row)

    def update_integration_status(
        self,
        integration_id: str,
        status: str,
        last_error_message: Optional[str] = None,
        is_success: bool = False
    ) -> bool:
        """Updates integration operational status and sync timestamps."""
        with get_db_cursor() as cur:
            if is_success:
                cur.execute("""
                    UPDATE oh_id.integrations
                    SET status = %s,
                        last_successful_sync = CURRENT_TIMESTAMP,
                        last_error_message = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (status, integration_id))
            elif last_error_message:
                cur.execute("""
                    UPDATE oh_id.integrations
                    SET status = %s,
                        last_failure_at = CURRENT_TIMESTAMP,
                        last_error_message = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (status, last_error_message, integration_id))
            else:
                cur.execute("""
                    UPDATE oh_id.integrations
                    SET status = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (status, integration_id))
            return cur.rowcount > 0

    # --------------------------------------------------------------------------
    # 2. EXTERNAL IDENTITY RESOLUTION & CONFLICT MANAGEMENT
    # --------------------------------------------------------------------------

    def resolve_or_create_patient_mapping(
        self,
        hospital_id: str,
        integration_id: str,
        external_system: str,
        external_patient_id: str,
        demographic_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Performs deterministic patient identity matching.
        Matches by exact OH-ID or ABHA address.
        If demographic discrepancies exist, raises and quarantines an identity conflict
        instead of corrupting patient identity.
        """
        with get_db_cursor() as cur:
            # 1. Check existing external mapping
            cur.execute("""
                SELECT * FROM oh_id.external_patient_mappings
                WHERE integration_id = %s AND external_system = %s AND external_patient_id = %s AND status = 'ACTIVE';
            """, (integration_id, external_system, external_patient_id))
            existing_mapping = cur.fetchone()
            if existing_mapping:
                return {
                    "matched": True,
                    "patient_id": existing_mapping["patient_id"],
                    "mapping_id": existing_mapping["id"],
                    "match_method": existing_mapping["match_method"],
                    "status": "EXISTING_MAPPING"
                }

            # 2. Match by exact OH-ID
            target_ohid = demographic_data.get("onehealth_id") or demographic_data.get("oh_id")
            if target_ohid:
                cur.execute("SELECT * FROM oh_id.patients WHERE onehealth_id = %s;", (target_ohid,))
                pat_by_ohid = cur.fetchone()
                if pat_by_ohid:
                    # Validate DOB/Phone if provided to protect against spoofing
                    dob_match = True
                    if demographic_data.get("dob") and pat_by_ohid.get("dob"):
                        dob_match = str(demographic_data["dob"]) == str(pat_by_ohid["dob"])

                    if not dob_match:
                        # Conflict Quarantine
                        conflict_id = f"conf-{uuid.uuid4().hex[:12]}"
                        cur.execute("""
                            INSERT INTO oh_id.identity_conflicts (
                                id, hospital_id, integration_id, external_patient_id,
                                existing_patient_id, conflict_type, conflict_details, status
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, 'QUARANTINED')
                            RETURNING *;
                        """, (
                            conflict_id,
                            hospital_id,
                            integration_id,
                            external_patient_id,
                            pat_by_ohid["id"],
                            "DOB_DISCREPANCY",
                            json.dumps({
                                "provided_dob": str(demographic_data.get("dob")),
                                "recorded_dob": str(pat_by_ohid.get("dob")),
                                "onehealth_id": target_ohid
                            })
                        ))
                        return {
                            "matched": False,
                            "conflict_id": conflict_id,
                            "conflict_type": "DOB_DISCREPANCY",
                            "status": "QUARANTINED"
                        }

                    # Create Verified Mapping
                    mapping_id = f"map-{uuid.uuid4().hex[:12]}"
                    cur.execute("""
                        INSERT INTO oh_id.external_patient_mappings (
                            id, hospital_id, integration_id, external_system,
                            external_patient_id, patient_id, match_method, confidence_score, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, 'EXACT_OH_ID', 1.00, 'ACTIVE')
                        RETURNING *;
                    """, (
                        mapping_id,
                        hospital_id,
                        integration_id,
                        external_system,
                        external_patient_id,
                        pat_by_ohid["id"]
                    ))
                    return {
                        "matched": True,
                        "patient_id": pat_by_ohid["id"],
                        "mapping_id": mapping_id,
                        "match_method": "EXACT_OH_ID",
                        "status": "NEW_MAPPING_CREATED"
                    }

            # 3. Match by ABHA Address
            target_abha = demographic_data.get("abha_address")
            if target_abha:
                cur.execute("""
                    SELECT p.* FROM oh_id.patients p
                    JOIN oh_id.patient_abha_mappings am ON p.id = am.patient_id
                    WHERE am.abha_address = %s;
                """, (target_abha,))
                pat_by_abha = cur.fetchone()
                if pat_by_abha:
                    mapping_id = f"map-{uuid.uuid4().hex[:12]}"
                    cur.execute("""
                        INSERT INTO oh_id.external_patient_mappings (
                            id, hospital_id, integration_id, external_system,
                            external_patient_id, patient_id, match_method, confidence_score, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, 'ABHA_VERIFIED', 1.00, 'ACTIVE')
                        RETURNING *;
                    """, (
                        mapping_id,
                        hospital_id,
                        integration_id,
                        external_system,
                        external_patient_id,
                        pat_by_abha["id"]
                    ))
                    return {
                        "matched": True,
                        "patient_id": pat_by_abha["id"],
                        "mapping_id": mapping_id,
                        "match_method": "ABHA_VERIFIED",
                        "status": "NEW_MAPPING_CREATED"
                    }

            # No deterministic match -> Quarantined
            conflict_id = f"conf-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.identity_conflicts (
                    id, hospital_id, integration_id, external_patient_id,
                    conflict_type, conflict_details, status
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, 'UNRESOLVED_AMBIGUITY')
                RETURNING *;
            """, (
                conflict_id,
                hospital_id,
                integration_id,
                external_patient_id,
                "UNRESOLVED_AMBIGUITY",
                json.dumps(demographic_data)
            ))
            return {
                "matched": False,
                "conflict_id": conflict_id,
                "conflict_type": "UNRESOLVED_AMBIGUITY",
                "status": "QUARANTINED"
            }

    def list_identity_conflicts(
        self,
        hospital_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists quarantined identity conflicts awaiting administrative resolution."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if hospital_id:
                clauses.append("c.hospital_id = %s")
                params.append(hospital_id)
            if status:
                clauses.append("c.status = %s")
                params.append(status)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    c.id,
                    c.hospital_id,
                    h.name AS hospital_name,
                    c.integration_id,
                    i.provider_name AS integration_provider,
                    c.external_patient_id,
                    c.existing_patient_id,
                    p.name AS existing_patient_name,
                    p.onehealth_id AS existing_onehealth_id,
                    c.conflict_type,
                    c.conflict_details,
                    c.status,
                    c.resolution_notes,
                    c.resolved_by,
                    c.resolved_at,
                    c.created_at
                FROM oh_id.identity_conflicts c
                JOIN oh_id.hospitals h ON c.hospital_id = h.id
                JOIN oh_id.integrations i ON c.integration_id = i.id
                LEFT JOIN oh_id.patients p ON c.existing_patient_id = p.id
                {where_str}
                ORDER BY c.created_at DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # 3. EXTERNAL HEALTH RECORD INGESTION & PROVENANCE
    # --------------------------------------------------------------------------

    def import_external_health_record(
        self,
        patient_id: str,
        hospital_id: str,
        integration_id: str,
        record_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Imports an authorized external clinical record with complete provenance metadata.
        Guarantees that external records are clearly attributed to source providers.
        """
        rec_id = record_data.get("id") or f"ehr-{uuid.uuid4().hex[:12]}"
        provenance = {
            "source_facility_name": record_data.get("source_facility_name") or "External Hospital",
            "source_provider_name": record_data.get("source_provider_name") or "External Clinician",
            "source_record_id": record_data.get("external_record_id"),
            "import_timestamp": datetime.now(timezone.utc).isoformat(),
            "fhir_version": record_data.get("fhir_version", "R4"),
            "mapping_version": record_data.get("mapping_version", "v1.0.0"),
            "exchange_gateway": "OH-ID Interoperability Bus"
        }

        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.external_health_records (
                    id, patient_id, hospital_id, integration_id,
                    source_facility_name, source_provider_name, source_organization_id,
                    external_record_id, record_type, title, summary, record_date,
                    clinical_payload, fhir_resource, fhir_version, mapping_version,
                    status, validation_status, provenance_data
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s::jsonb, %s::jsonb, %s, %s,
                    'ACTIVE', 'VALID', %s::jsonb
                )
                ON CONFLICT (integration_id, external_record_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    summary = EXCLUDED.summary,
                    clinical_payload = EXCLUDED.clinical_payload,
                    fhir_resource = EXCLUDED.fhir_resource,
                    validation_status = EXCLUDED.validation_status,
                    provenance_data = EXCLUDED.provenance_data
                RETURNING *;
            """, (
                rec_id,
                patient_id,
                hospital_id,
                integration_id,
                record_data.get("source_facility_name", "External Hospital"),
                record_data.get("source_provider_name"),
                record_data.get("source_organization_id"),
                record_data["external_record_id"],
                record_data.get("record_type", "CONSULTATION"),
                record_data["title"],
                record_data.get("summary", ""),
                record_data.get("record_date") or datetime.now(timezone.utc).isoformat(),
                json.dumps(record_data.get("clinical_payload") or {}),
                json.dumps(record_data.get("fhir_resource")) if record_data.get("fhir_resource") else None,
                record_data.get("fhir_version", "R4"),
                record_data.get("mapping_version", "v1.0.0"),
                json.dumps(provenance)
            ))
            row = cur.fetchone()
            return dict(row)

    def list_external_health_records(
        self,
        patient_id: str,
        record_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists all external imported health records for a patient."""
        with get_readonly_cursor() as cur:
            clauses = ["patient_id = %s", "status = 'ACTIVE'", "validation_status = 'VALID'"]
            params = [patient_id]

            if record_type:
                clauses.append("record_type = %s")
                params.append(record_type)

            where_str = f"WHERE {' AND '.join(clauses)}"
            sql = f"""
                SELECT * FROM oh_id.external_health_records
                {where_str}
                ORDER BY record_date DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # 4. GRANULAR CONSENT & CROSS-HOSPITAL RECORD SHARING
    # --------------------------------------------------------------------------

    def create_data_sharing_request(
        self,
        patient_id: str,
        requesting_hospital_id: str,
        requesting_doctor_id: Optional[str],
        purpose_code: str = "CARETREAT",
        purpose_text: str = "Care and Treatment",
        data_categories: Optional[List[str]] = None,
        expires_hours: int = 72
    ) -> Dict[str, Any]:
        """Creates a pending patient consent request for cross-hospital clinical records."""
        consent_id = f"consent-{uuid.uuid4().hex[:12]}"
        cats = data_categories or ["OPConsultation", "Prescription", "DiagnosticReport"]
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)

        with get_db_cursor() as cur:
            # Fetch requesting hospital and doctor names
            cur.execute("SELECT name FROM oh_id.hospitals WHERE id = %s;", (requesting_hospital_id,))
            hosp = cur.fetchone()
            req_hosp_name = hosp["name"] if hosp else "Requesting Hospital"

            doc_name = "Attending Physician"
            if requesting_doctor_id:
                cur.execute("SELECT name FROM oh_id.doctors WHERE id = %s;", (requesting_doctor_id,))
                doc = cur.fetchone()
                if doc:
                    doc_name = f"Dr. {doc['name']}"

            cur.execute("""
                INSERT INTO oh_id.abdm_consent_artifacts (
                    consent_id, patient_id, requester_hospital_id, requester_doctor_id,
                    requester_name, provider_hospital_id, provider_hospital_name,
                    purpose_code, purpose_text, data_categories,
                    date_range_from, date_range_to, consent_status,
                    expires_at, created_at
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s::jsonb,
                    CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE, 'REQUESTED',
                    %s, CURRENT_TIMESTAMP
                )
                RETURNING *;
            """, (
                consent_id,
                patient_id,
                requesting_hospital_id,
                requesting_doctor_id,
                f"{doc_name} ({req_hosp_name})",
                requesting_hospital_id,
                req_hosp_name,
                purpose_code,
                purpose_text,
                json.dumps(cats),
                expires_at
            ))
            row = cur.fetchone()
            return dict(row)

    def grant_data_sharing_consent(
        self,
        consent_id: str,
        patient_id: str,
        allowed_categories: Optional[List[str]] = None,
        expires_hours: int = 72
    ) -> Dict[str, Any]:
        """Patient approves data sharing consent with specific granular categories."""
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)

        with get_db_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.abdm_consent_artifacts
                WHERE consent_id = %s;
            """, (consent_id,))
            consent = cur.fetchone()
            if not consent:
                raise ValueError("Consent request not found.")
            if consent["patient_id"] != patient_id:
                raise ValueError("Consent request not found or patient mismatch.")
            if consent.get("consent_status") == "REVOKED":
                raise ValueError("Cannot approve a revoked consent request.")
            if consent.get("consent_status") == "EXPIRED" or (consent.get("expires_at") and consent["expires_at"] < datetime.now(timezone.utc)):
                raise ValueError("Consent request has expired.")

            cats = allowed_categories or consent["data_categories"]
            if isinstance(cats, list):
                cats_json = json.dumps(cats)
            else:
                cats_json = json.dumps([cats])

            cur.execute("""
                UPDATE oh_id.abdm_consent_artifacts
                SET consent_status = 'GRANTED',
                    data_categories = %s::jsonb,
                    granted_at = CURRENT_TIMESTAMP,
                    expires_at = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE consent_id = %s
                RETURNING *;
            """, (cats_json, expires_at, consent_id))
            updated_consent = cur.fetchone()

            # Record active data exchange share
            share_id = f"share-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.data_exchange_shares (
                    id, consent_id, patient_id, requesting_hospital_id,
                    requesting_doctor_id, purpose, data_scope, access_basis,
                    status, expires_at
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s::jsonb, 'PATIENT_CONSENT',
                    'ACTIVE', %s
                )
                RETURNING *;
            """, (
                share_id,
                consent_id,
                patient_id,
                consent["requester_hospital_id"],
                consent["requester_doctor_id"],
                consent["purpose_code"],
                cats_json,
                expires_at
            ))

            # Audit log
            cur.execute("""
                INSERT INTO oh_id.audit_logs (
                    id, actor_id, action, resource_type, resource_id,
                    details, ip_address, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, '127.0.0.1', CURRENT_TIMESTAMP);
            """, (
                f"audit-{uuid.uuid4().hex[:12]}",
                patient_id,
                "CONSENT_GRANTED",
                "abdm_consent_artifacts",
                consent_id,
                json.dumps({
                    "requester_hospital_id": consent["requester_hospital_id"],
                    "data_categories": cats,
                    "expires_at": expires_at.isoformat()
                })
            ))

            return dict(updated_consent)

    def revoke_data_sharing_consent(
        self,
        consent_id: str,
        patient_id: str,
        revocation_reason: str = "Revoked by patient"
    ) -> bool:
        """Revokes an active data sharing consent immediately."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.abdm_consent_artifacts
                SET consent_status = 'REVOKED',
                    revoked_at = CURRENT_TIMESTAMP,
                    revocation_reason = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE consent_id = %s AND patient_id = %s;
            """, (revocation_reason, consent_id, patient_id))
            updated_count = cur.rowcount

            if updated_count == 0:
                return False

            # Deactivate linked share
            cur.execute("""
                UPDATE oh_id.data_exchange_shares
                SET status = 'REVOKED',
                    revoked_at = CURRENT_TIMESTAMP
                WHERE consent_id = %s;
            """, (consent_id,))

            # Audit log
            cur.execute("""
                INSERT INTO oh_id.audit_logs (
                    id, actor_id, action, resource_type, resource_id,
                    details, ip_address, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, '127.0.0.1', CURRENT_TIMESTAMP);
            """, (
                f"audit-{uuid.uuid4().hex[:12]}",
                patient_id,
                "CONSENT_REVOKED",
                "abdm_consent_artifacts",
                consent_id,
                json.dumps({"reason": revocation_reason, "outcome": "REVOKED"})
            ))

            return True

    def cross_hospital_fetch_records(
        self,
        requesting_hospital_id: str,
        requesting_doctor_id: Optional[str],
        patient_id: str,
        purpose: str = "TREATMENT",
        is_break_glass: bool = False,
        break_glass_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves clinical records for an external hospital.
        Strictly enforces:
        1. Valid unexpired GRANTED consent artifact OR
        2. Break-glass emergency policy with mandatory audit reasoning.
        Filters data strictly to authorized data scope.
        """
        with get_db_cursor() as cur:
            allowed_categories: List[str] = []

            if is_break_glass:
                if not break_glass_reason:
                    raise ValueError("Break-glass emergency access requires explicit clinical justification.")
                allowed_categories = ["OPConsultation", "Prescription", "DiagnosticReport", "DischargeSummary"]

                # Log break-glass access
                share_id = f"share-bg-{uuid.uuid4().hex[:12]}"
                cur.execute("""
                    INSERT INTO oh_id.data_exchange_shares (
                        id, patient_id, requesting_hospital_id, requesting_doctor_id,
                        purpose, data_scope, access_basis, break_glass_reason,
                        status, expires_at
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s, %s::jsonb, 'EMERGENCY_BREAK_GLASS', %s,
                        'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '24 hours'
                    );
                """, (
                    share_id,
                    patient_id,
                    requesting_hospital_id,
                    requesting_doctor_id,
                    "EMERGENCY",
                    json.dumps(allowed_categories),
                    break_glass_reason
                ))

                cur.execute("""
                    INSERT INTO oh_id.audit_logs (
                        id, actor_id, action, resource_type, resource_id,
                        details, ip_address, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, '127.0.0.1', CURRENT_TIMESTAMP);
                """, (
                    f"audit-{uuid.uuid4().hex[:12]}",
                    requesting_doctor_id or "system",
                    "BREAK_GLASS_EMERGENCY_ACCESS",
                    "patients",
                    patient_id,
                    json.dumps({
                        "requesting_hospital_id": requesting_hospital_id,
                        "reason": break_glass_reason,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                ))
            else:
                # Validate Consent
                if not settings.ENABLE_CROSS_HOSPITAL_SHARING:
                    raise PermissionError("Access Denied: Cross-hospital sharing is disabled for this deployment.")

                cur.execute("""
                    SELECT * FROM oh_id.abdm_consent_artifacts
                    WHERE patient_id = %s
                      AND requester_hospital_id = %s
                      AND consent_status = 'GRANTED'
                      AND expires_at > CURRENT_TIMESTAMP;
                """, (patient_id, requesting_hospital_id))
                active_consent = cur.fetchone()
                if not active_consent:
                    raise PermissionError("Access Denied: No active or valid consent artifact found for this hospital.")

                raw_cats = active_consent["data_categories"]
                if isinstance(raw_cats, list):
                    allowed_categories = raw_cats
                elif isinstance(raw_cats, str):
                    allowed_categories = json.loads(raw_cats)
                else:
                    allowed_categories = ["OPConsultation"]

                # Audit log for authorized cross-hospital record fetch
                try:
                    cur.execute("""
                        INSERT INTO oh_id.audit_logs (
                            id, actor_id, action, resource_type, resource_id,
                            details, ip_address, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, '127.0.0.1', CURRENT_TIMESTAMP);
                    """, (
                        f"audit-{uuid.uuid4().hex[:12]}",
                        requesting_doctor_id or requesting_hospital_id,
                        "CROSS_HOSPITAL_RECORD_ACCESSED",
                        "patients",
                        patient_id,
                        json.dumps({
                            "requesting_hospital_id": requesting_hospital_id,
                            "requesting_doctor_id": requesting_doctor_id,
                            "consent_id": active_consent["consent_id"],
                            "authorized_scope": allowed_categories,
                            "purpose": purpose,
                            "outcome": "ALLOWED",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                    ))
                except Exception as audit_err:
                    raise RuntimeError(f"Audit failure prevented cross-hospital disclosure: {audit_err}")

            # Retrieve Scoped Records
            consultations = []
            prescriptions = []
            lab_reports = []
            discharges = []

            if "OPConsultation" in allowed_categories or "Consultation" in allowed_categories:
                cur.execute("""
                    SELECT c.*, h.name AS hospital_name, d.name AS doctor_name, d.specialty AS doctor_specialty
                    FROM oh_id.opd_consultations c
                    LEFT JOIN oh_id.doctors d ON c.doctor_id = d.id
                    LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id
                    WHERE c.patient_id = %s
                    ORDER BY c.created_at DESC;
                """, (patient_id,))
                consultations = [dict(r) for r in cur.fetchall()]

            if "Prescription" in allowed_categories:
                has_consult_scope = "OPConsultation" in allowed_categories or "Consultation" in allowed_categories
                cur.execute("""
                    SELECT pr.*, h.name AS hospital_name, d.name AS doctor_name
                    FROM oh_id.prescriptions pr
                    LEFT JOIN oh_id.doctors d ON pr.doctor_id = d.id
                    LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id
                    WHERE pr.patient_id = %s
                    ORDER BY pr.created_at DESC;
                """, (patient_id,))
                raw_rxs = [dict(r) for r in cur.fetchall()]
                for rx in raw_rxs:
                    if not has_consult_scope:
                        rx["diagnosis"] = None
                        rx["doctor_notes"] = None
                        rx["chief_complaint"] = None
                        rx["clinical_advice"] = None
                prescriptions = raw_rxs

            if "DiagnosticReport" in allowed_categories or "LabReport" in allowed_categories:
                cur.execute("""
                    SELECT lr.*, h.name AS hospital_name
                    FROM oh_id.lab_results lr
                    LEFT JOIN oh_id.hospitals h ON lr.hospital_id = h.id
                    WHERE lr.patient_id = %s
                    ORDER BY lr.created_at DESC;
                """, (patient_id,))
                lab_reports = [dict(r) for r in cur.fetchall()]

            if "DischargeSummary" in allowed_categories:
                cur.execute("""
                    SELECT ds.*, h.name AS hospital_name, d.name AS doctor_name
                    FROM oh_id.discharges ds
                    LEFT JOIN oh_id.hospitals h ON ds.hospital_id = h.id
                    LEFT JOIN oh_id.doctors d ON ds.attending_doctor_id = d.id
                    WHERE ds.patient_id = %s
                    ORDER BY ds.created_at DESC;
                """, (patient_id,))
                discharges = [dict(r) for r in cur.fetchall()]

            # Fetch patient demographics
            cur.execute("SELECT id, name, onehealth_id, gender, dob, phone FROM oh_id.patients WHERE id = %s;", (patient_id,))
            patient_demo = dict(cur.fetchone() or {})

            return {
                "patient": patient_demo,
                "authorized_scope": allowed_categories,
                "access_basis": "EMERGENCY_BREAK_GLASS" if is_break_glass else "PATIENT_CONSENT",
                "consultations": consultations,
                "prescriptions": prescriptions,
                "lab_reports": lab_reports,
                "discharge_summaries": discharges,
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }

    def list_patient_data_shares(self, patient_id: str) -> List[Dict[str, Any]]:
        """Lists active and past consent artifacts for a patient."""
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT 
                    consent_id,
                    patient_id,
                    requester_hospital_id,
                    requester_doctor_id,
                    requester_name,
                    provider_hospital_id,
                    provider_hospital_name,
                    purpose_code,
                    purpose_text,
                    data_categories,
                    date_range_from,
                    date_range_to,
                    consent_status,
                    granted_at,
                    expires_at,
                    revoked_at,
                    revocation_reason,
                    created_at
                FROM oh_id.abdm_consent_artifacts
                WHERE patient_id = %s
                ORDER BY created_at DESC;
            """, (patient_id,))
            return [dict(row) for row in cur.fetchall()]

    def list_patient_access_history(self, patient_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Lists detailed access history of which providers accessed the patient's records."""
        with get_readonly_cursor() as cur:
            sql = """
                SELECT 
                    s.id AS share_id,
                    s.patient_id,
                    s.requesting_hospital_id,
                    h.name AS hospital_name,
                    s.requesting_doctor_id,
                    s.requesting_doctor_name,
                    s.purpose,
                    s.data_scope,
                    s.access_basis,
                    s.break_glass_reason,
                    s.status,
                    s.created_at AS accessed_at,
                    s.expires_at
                FROM oh_id.data_exchange_shares s
                JOIN oh_id.hospitals h ON s.requesting_hospital_id = h.id
                WHERE s.patient_id = %s
                ORDER BY s.created_at DESC
                LIMIT %s OFFSET %s;
            """
            cur.execute(sql, (patient_id, limit, offset))
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # 5. INTEGRATION EVENT BUS, WEBHOOKS & IDEMPOTENCY
    # --------------------------------------------------------------------------

    def record_integration_event(
        self,
        integration_id: str,
        hospital_id: str,
        direction: str,
        event_type: str,
        idempotency_key: str,
        external_event_id: Optional[str] = None,
        payload_summary: Optional[Dict[str, Any]] = None,
        status: str = "RECEIVED"
    ) -> Dict[str, Any]:
        """
        Records an inbound or outbound integration event with idempotency guarantees.
        If idempotency_key is already present, returns the existing event record to avoid duplicate processing.
        """
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.integration_events WHERE idempotency_key = %s;
            """, (idempotency_key,))
            existing = cur.fetchone()
            if existing:
                return {
                    "is_duplicate": True,
                    "event": dict(existing)
                }

            event_id = f"evt-{uuid.uuid4().hex[:12]}"
            summary_json = json.dumps(payload_summary or {})
            cur.execute("""
                INSERT INTO oh_id.integration_events (
                    id, integration_id, hospital_id, direction, event_type,
                    idempotency_key, external_event_id, payload_summary, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                RETURNING *;
            """, (
                event_id,
                integration_id,
                hospital_id,
                direction,
                event_type,
                idempotency_key,
                external_event_id,
                summary_json,
                status
            ))
            row = cur.fetchone()
            return {
                "is_duplicate": False,
                "event": dict(row)
            }

    def record_event_attempt(
        self,
        event_id: str,
        attempt_number: int,
        status: str,
        http_status: Optional[int] = None,
        latency_ms: Optional[int] = None,
        error_details: Optional[str] = None
    ) -> bool:
        """Records a transmission attempt for an integration event."""
        attempt_id = f"att-{uuid.uuid4().hex[:12]}"
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.integration_event_attempts (
                    id, event_id, attempt_number, status, http_status, latency_ms, error_details
                ) VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (
                attempt_id,
                event_id,
                attempt_number,
                status,
                http_status,
                latency_ms,
                error_details
            ))

            if status == "SUCCESS":
                cur.execute("""
                    UPDATE oh_id.integration_events
                    SET status = 'COMPLETED',
                        processed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (event_id,))
            else:
                cur.execute("""
                    UPDATE oh_id.integration_events
                    SET attempt_count = attempt_count + 1,
                        status = CASE WHEN attempt_count >= max_attempts THEN 'DEAD_LETTER' ELSE 'RETRY' END,
                        next_retry_at = CASE WHEN attempt_count < max_attempts THEN CURRENT_TIMESTAMP + INTERVAL '5 minutes' ELSE NULL END,
                        error_message = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (error_details, event_id))

            return True

    def list_integration_events(
        self,
        hospital_id: Optional[str] = None,
        integration_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists integration bus events with filters."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if hospital_id:
                clauses.append("e.hospital_id = %s")
                params.append(hospital_id)
            if integration_id:
                clauses.append("e.integration_id = %s")
                params.append(integration_id)
            if status:
                clauses.append("e.status = %s")
                params.append(status)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    e.id,
                    e.integration_id,
                    i.provider_name AS integration_provider,
                    e.hospital_id,
                    h.name AS hospital_name,
                    e.direction,
                    e.event_type,
                    e.idempotency_key,
                    e.external_event_id,
                    e.payload_summary,
                    e.status,
                    e.attempt_count,
                    e.max_attempts,
                    e.next_retry_at,
                    e.error_code,
                    e.error_message,
                    e.processed_at,
                    e.created_at
                FROM oh_id.integration_events e
                JOIN oh_id.integrations i ON e.integration_id = i.id
                JOIN oh_id.hospitals h ON e.hospital_id = h.id
                {where_str}
                ORDER BY e.created_at DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_integration_monitoring_metrics(self, hospital_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Queries the live analytical view for integration health metrics."""
        with get_readonly_cursor() as cur:
            if hospital_id:
                cur.execute("SELECT * FROM oh_id.vw_integration_health_summary WHERE hospital_id = %s;", (hospital_id,))
            else:
                cur.execute("SELECT * FROM oh_id.vw_integration_health_summary;")
            return [dict(row) for row in cur.fetchall()]
