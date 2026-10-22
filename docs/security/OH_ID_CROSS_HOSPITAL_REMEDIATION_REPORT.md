# OH-ID — Critical Cross-Hospital Data Exposure Remediation Report

**Document Reference:** `OHID-SEC-2026-REM-001`  
**Classification:** Restricted — Engineering & Security Governance  
**Priority:** P0 — Patient-Data Confidentiality  
**Author:** Principal Healthcare Security Engineer & Senior FastAPI Engineer  
**Date:** October 21, 2026  
**Status:** REMEDIATION & SCOPED-FETCH VERIFIED (RELEASE GATE: CONDITIONAL FOR SINGLE-FACILITY PILOT / BLOCKED FOR MULTI-HOSPITAL FEDERATION)

---

## 1. Executive Summary

During an independent architecture audit of the OneHealth ID (OH-ID) multi-hospital continuity framework (`OH_ID_CROSS_HOSPITAL_CONTINUITY_AUDIT.md`), a **Critical P0 Authorization Bypass & Patient-Data Exposure Vulnerability** was identified in the clinical access layer.

Specifically:
1. **Direct Access via Doctor Workspace**: The doctor consultation endpoints (`/api/v1/doctor/patients/{id}/context` and `/api/v1/doctor/patients/{id}/history`) failed to enforce hospital tenant isolation or verify patient consent when accessing clinical records across hospitals.
2. **Tenancy Header Spoofing**: The user context extraction in `backend/app/core/rbac.py` allowed an untrusted request header (`X-Hospital-Ref-Id`) to override the cryptographically signed JWT hospital tenancy claim (`token_hospital`).
3. **Consent Identity Misalignment**: The consent approval and revocation endpoints in `backend/app/routers/data_sharing.py` relied on direct user ID dictionary lookups (`patient_id = current_user.get("patient_id") or current_user.get("user_id")`) which diverged from the authoritative patient table identity schema (`pat-...`), allowing authorization failures and silent mismatches.
4. **Audit Trail Gaps**: Unauthorized cross-hospital access attempts were not systematically logged to the persistent compliance audit log (`oh_id.audit_logs`).
5. **Cross-Hospital Scoped-Fetch Gate & Redaction Gap**: In the synthetic trace, when patient approved consent only for prescriptions, cross-hospital fetch attempts failed because the test script did not evaluate the feature gate flag (`ENABLE_CROSS_HOSPITAL_SHARING`), and raw prescription objects lacked server-side redaction of consultation diagnoses and doctor notes.

### Remediation Outcome
All reported bypass vectors and scoped-fetch defects have been **completely reproduced, resolved, and verified** in the backend service and authorization layer. Tenancy boundaries and consent requirements are now enforced server-side regardless of frontend state, direct API access, or QR resolution. 

Automated regression suites demonstrate **100% pass rates (35/35 tests passed)** across cross-hospital remediation, interoperability, clinical workflows, and enterprise RBAC.

---

## 2. Phase 1: Containment and Reproduction

Reproduction was executed strictly using synthetic multi-tenant fixtures (`hosp-a-*` and `hosp-b-*`) with synthetic patient and doctor accounts. Real patient records were never accessed or exposed.

### 2.1 Confirmed Vulnerability Manifestations

| Vulnerability ID | Endpoint / Component | Root Cause in Code | Reproduced Behavior |
| :--- | :--- | :--- | :--- |
| **VULN-001** | `GET /api/v1/doctor/patients/{id}/context` | `doctor_workspace.py` only checked whether caller was a doctor and had an appointment or active status; failed to verify `patient.hospital_id == doctor.hospital_id`. | Hospital B doctor requested context of Hospital A patient using direct patient ID; backend returned complete clinical summary (encounters, vitals, active prescriptions). |
| **VULN-002** | `GET /api/v1/doctor/patients/{id}/history` | `doctor_workspace.py` queried chronological encounters without verifying care relationship or consent. | Hospital B doctor obtained full longitudinal history of Hospital A consultations. |
| **VULN-003** | `backend/app/core/rbac.py` | `get_current_user_context` evaluated `x_hospital_ref_id or payload.get("hospital_id")`. | An attacker at Hospital B could send `X-Hospital-Ref-Id: hosp-a-xxx` and bypass tenancy checks if the token lacked a strict hospital binding. |
| **VULN-004** | `POST /api/v1/me/data-sharing/{id}/approve` | Did not resolve `user_id` to authoritative `patient_id` in `oh_id.patients`. | Patient consent approval failed with mismatch or allowed wrong account to grant access if IDs collided. |
| **VULN-005** | `POST /api/v1/patients/qr/resolve` | QR code scanning endpoint returned patient metadata without warning callers that clinical access is ungranted. | Frontend assumed QR scan resolution granted consultation permissions. |
| **VULN-006** | `POST /api/v1/hospital/data-sharing/fetch` | Prescription records disclosed consultation diagnoses, doctor notes, and clinical advice even when `OPConsultation` was not in consented categories. | When patient consented to `Prescription` only, the doctor received consultation clinical notes and diagnoses embedded within the prescription records. |

---

## 3. Phase 2: Root-Cause Remediation

### 3.1 Architecture of Unified Access Policy (`verify_clinical_record_access`)

In `backend/app/core/rbac.py`, an authoritative clinical authorization function was engineered:

```python
def verify_clinical_record_access(
    patient_id: str,
    user: Dict[str, Any],
    required_category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative Clinical Access Boundary:
    1. Super Admin / Platform Admin platform override.
    2. Patient self-read boundary (patient can only read self).
    3. Clinician role & permission verification.
    4. Same-hospital preservation (preserves single-hospital OPD/IPD workflows).
    5. Cross-hospital evaluation:
       a. Check ENABLE_CROSS_HOSPITAL_SHARING deployment flag.
       b. Require active, unexpired, GRANTED consent artifact in abdm_consent_artifacts.
       c. Check category scope (OPConsultation, Prescription, DiagnosticReport, etc.).
       d. Fail closed and record structured audit log into oh_id.audit_logs.
       e. Return safe non-enumerable HTTP 404 if denied.
    """
```

### 3.2 Key Backend Fixes

1. **`backend/app/core/config.py`**:
   - Added configuration setting:
     ```python
     ENABLE_CROSS_HOSPITAL_SHARING: bool = False
     ```
   - Defaults to `False` to maintain airtight isolation for the Kedar Hospital pilot.

2. **`backend/app/core/rbac.py`**:
   - Fixed header spoofing in `get_current_user_context`: Tenancy is now anchored to the verified JWT claim `token_hospital`. Untrusted request headers cannot switch the caller's tenancy.
   - Enforced safe, non-enumerable errors: When cross-hospital access is denied, the API raises:
     ```python
     raise HTTPException(status_code=404, detail="Patient record not found")
     ```
     This prevents malicious actors from determining whether a specific patient ID exists at another hospital facility.
   - Added `record_audit_log`: Persists events into `oh_id.audit_logs` while scrubbing secrets, tokens, and passwords. Fails closed on database logging exceptions.

3. **`backend/app/repositories/phase4_repository.py`**:
   - In `cross_hospital_fetch_records`: Enforced server-side redaction of consultation details (`diagnosis`, `doctor_notes`, `chief_complaint`, `clinical_advice`) from prescription records when `OPConsultation` (or `Consultation`) is not in `allowed_categories`.
   - Fixed `revoke_data_sharing_consent`: Corrected `cur.rowcount` tracking to prevent false-positive revocation responses.

4. **`backend/app/routers/doctor_workspace.py`**:
   - `verify_doctor_patient_access` now delegates directly to `verify_clinical_record_access`.
   - `get_patient_consultation_context` and `get_patient_history` verify access and apply **granular category scope filtering**:
     - If patient only consented to `OPConsultation`, prescriptions and lab investigations are scrubbed from the response.
     - If patient only consented to `Prescription`, consultation encounters and chronic conditions are scrubbed, and diagnoses on prescription items are redacted to `None`.
     - In longitudinal history, events are filtered strictly by category and unconsented diagnoses are cleared.

5. **`backend/app/routers/clinical.py`**:
   - Alternative endpoints (`/patients/{id}/timeline` and `/patients/{id}/reports-summary`) were retrofitted with `verify_clinical_record_access`.

---

## 4. Phase 3: Consent Lifecycle Repair & Scoped-Fetch Resolution

### 4.1 Authoritative Patient Identity Resolution
Implemented `resolve_patient_identity(current_user)` in `backend/app/routers/data_sharing.py` which maps authenticated user tokens to canonical `pat-...` IDs:
- Queries `sp_repository.get_patient_by_user_ref(user_ref_id, email)`.
- Fallbacks to `sp_repository.get_patient_by_id(user_ref_id)`.
- Rejects unmapped or ambiguous sessions with `HTTP 401`.

### 4.2 Scoped Fetch Root Cause & Resolution
In the initial synthetic trace, `scoped_fetch_success` was reported as `false` because:
1. **Feature Gate Evaluation**: The deployment flag `ENABLE_CROSS_HOSPITAL_SHARING` defaults to `False`. The trace script attempted a cross-hospital record fetch without evaluating the gate setting, correctly resulting in `HTTP 403 Forbidden` (`Access Denied: Cross-hospital sharing is disabled for this deployment`).
2. **Redaction of Non-Consented Fields**: When the feature gate is enabled, querying prescriptions without consultation consent disclosed embedded diagnoses and clinical notes.

**Remediation Applied:**
- The trace script was updated to test both behaviors explicitly:
  1. Gate Disabled: Proves that even with active patient consent, access is blocked (`HTTP 403`) if the deployment flag is `False`.
  2. Gate Enabled: Proves that with active consent for `Prescription`, scoped fetch returns `HTTP 200`, returns prescriptions (>0), returns zero consultations, and redacts diagnoses/notes.
- In `phase4_repository.py` and `doctor_workspace.py`, prescription records redact `diagnosis`, `doctor_notes`, `chief_complaint`, and `clinical_advice` when consultation consent is not granted.
- Immediate revocation was verified to block subsequent access across `/context` (404), `/history` (404), and `/fetch` (403).

---

## 5. Phase 4: Mandatory Audit Trail

Every clinical access event and authorization check now records an immutable audit trail in `oh_id.audit_logs`:

### 5.1 Audit Schema Verification
```sql
SELECT id, actor_id, action, resource_type, resource_id, hospital_id, details, created_at 
FROM oh_id.audit_logs;
```

### 5.2 Emitted Events
- `CROSS_HOSPITAL_ACCESS_DENIED`: Logged whenever an unauthorized doctor, missing consent, expired consent, or disabled feature gate denies access.
- `CROSS_HOSPITAL_RECORD_ACCESSED`: Logged whenever a valid, consented read operation completes.
- `CROSS_HOSPITAL_SCOPE_DENIED`: Logged if an actor requests data categories outside the consented scope.
- `CONSENT_GRANTED` / `CONSENT_REVOKED`: Logged upon patient lifecycle operations.

### 5.3 Redaction and Fail-Closed Security
- Details payloads are scrubbed of any key containing `token`, `secret`, `key`, `pass`, `auth`, or `cred`.
- If the audit insert fails due to a database constraint or connection fault, `record_audit_log` raises an exception, ensuring clinical records cannot be disclosed silently when audit logging is compromised.

---

## 6. Phase 5: Regression Test Evidence

### 6.1 Dedicated Remediation Suite (`backend/tests/test_cross_hospital_remediation.py`)
Execution Command:
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_cross_hospital_remediation.py -v
```
Result: **11 passed in 57.15s** (Exit Code: 0)

| Test Identifier | Scenario Tested | Outcome |
| :--- | :--- | :--- |
| `test_same_hospital_clinical_workflows_succeed` | Hospital A doctor accesses Hospital A patient context & history without impediment. | **PASSED** |
| `test_cross_hospital_unauthorized_access_denied_with_safe_404` | Hospital B doctor accesses Hospital A patient; denied with safe 404 (non-enumerable). | **PASSED** |
| `test_qr_resolution_does_not_grant_clinical_access` | QR resolution succeeds for identification, but does not grant clinical context reads. | **PASSED** |
| `test_alternative_endpoints_enforce_same_policy` | Alternative routes (`/timeline`, `/reports-summary`) enforce same unified policy. | **PASSED** |
| `test_invalid_consent_permutations_are_denied` | Missing, expired, revoked, wrong-patient, and wrong-hospital consents return 404. | **PASSED** |
| `test_granular_category_scope_restriction` | Consent for `OPConsultation` returns encounters but strictly scrubs prescriptions and labs. | **PASSED** |
| `test_revocation_lifecycle_and_immediate_denial` | Consent request -> Wrong patient approval blocked -> Correct approval -> Access granted -> Revocation -> Immediate denial across all routes (/context, /history, /fetch, /timeline). | **PASSED** |
| `test_audit_logging_for_allowed_and_denied_access` | Audit log rows created in `oh_id.audit_logs` with actor ID, hospital ID, and scrubbed details. | **PASSED** |
| `test_direct_api_calls_protected_without_frontend` | Direct HTTP requests without frontend route guards cannot bypass security controls. | **PASSED** |
| `test_prescription_only_consent_redacts_consultation_and_diagnoses` | Prescription-only consent returns prescriptions but redacts diagnoses, doctor notes, and consultation encounters. | **PASSED** |
| `test_disabled_feature_gate_never_falls_back_even_with_valid_consent` | When `ENABLE_CROSS_HOSPITAL_SHARING = False`, even active, valid consent artifacts are denied across all routes. | **PASSED** |

### 6.2 Connected Network & IAM Regression Suite
Execution Command:
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_phase4_interoperability_connected_network.py backend/tests/test_enterprise_iam_rbac.py -v
```
Result: **16 passed in 22.75s** (Exit Code: 0)
- `test_integration_registry_lifecycle_and_ping`: PASSED
- `test_fhir_r4_bidirectional_mapping_and_serialization`: PASSED
- `test_granular_consent_gating_and_scope_restriction`: PASSED
- `test_consent_revocation_denies_subsequent_access`: PASSED
- `test_cross_hospital_e2e_connected_patient_journey`: PASSED
- `test_cross_hospital_tenant_isolation_idor`: PASSED
- All 10 IAM RBAC workforce and wizard tests: PASSED

### 6.3 Clinical Workflow Regression Suite
Execution Command:
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_phase3_clinical_care_ecosystem.py -v
```
Result: **8 passed in 27.65s** (Exit Code: 0)
- Pharmacy dispensing, laboratory analytes, radiology imaging, nursing vitals, IPD bed allocation, emergency triage, and referrals: ALL PASSED.

### 6.4 Synthetic End-to-End Continuity Trace Output
Execution Command:
```powershell
.\.venv\Scripts\python.exe backend/scripts/audit_cross_hospital_continuity_trace.py
```
Output Summary:
```json
{
  "step1_patient_registration": {
    "status": "SUCCESS",
    "patient_id": "pat-audit-2ede16",
    "hospital_id": "hosp-a-2ede16"
  },
  "step2_hospital_a_records": {
    "appointment_id": "appt-a-2ede16",
    "consultation_id": "con-a-2ede16",
    "prescription_id": "rx-a-2ede16"
  },
  "step3_doctor_b_auth": {
    "username": "dr.audit.2ede16",
    "hospital_id": "hosp-b-2ede16",
    "role": null
  },
  "step4_patient_discovery": {
    "hospital_list_isolated": true,
    "duplicate_registry_match": true,
    "qr_resolution": true
  },
  "step5_access_channels": {
    "direct_patient_endpoint_status": 403,
    "doctor_workspace_context_status": 404,
    "doctor_workspace_history_status": 404,
    "data_sharing_fetch_unconsented_status": 403
  },
  "step7_8_consent_lifecycle": {
    "consent_request_created": true,
    "consent_approved": true,
    "gate_disabled_blocks_access": true,
    "scoped_fetch_success": true,
    "scope_strictly_restricted": true,
    "revocation_success": true,
    "subsequent_fetch_denied": true,
    "subsequent_context_denied": true
  }
}
```

---

## 7. Residual Risks and Technical Debt

1. **Break-Glass Audit Alerting**: The emergency break-glass protocol correctly records mandatory justification into `oh_id.audit_logs`. However, automated out-of-band notifications (SMS/Email to Medical Director and Patient) depend on external provider webhooks that must be configured per hospital deployment.
2. **Read-Replica Sync Lag**: If database read-replicas are introduced in future multi-hospital rollouts, consent revocation written to the primary must immediately invalidate or bypass replica caches to prevent replication-lag race windows.
3. **ABDM Production Key Infrastructure**: In live multi-hospital federation across India, consent artifacts must be digitally signed using ABDM National Health Authority (NHA) HSM keys rather than internal HMAC tokens.

---

## 8. Release Decision

### Verdict: RELEASE CONDITIONAL FOR SINGLE-FACILITY PILOT / BLOCKED FOR MULTI-HOSPITAL NETWORK FEDERATION

```mermaid
graph TD
    A["OH-ID Security Gate"] --> B{"Deployment Mode?"}
    B -->|"Single-Facility Kedar Hospital Pilot"| C["APPROVED FOR PILOT"]
    B -->|"Multi-Hospital Data Exchange Network"| D["BLOCKED"]
    
    C --> C1["ENABLE_CROSS_HOSPITAL_SHARING = False"]
    C --> C2["Same-Hospital Workflows Verified"]
    C --> C3["Air-tight Cross-Tenant Isolation"]

    D --> D1["Requires ABDM NHA Production HSM Integration"]
    D --> D2["Requires Independent Red-Team Penetration Test"]
    D --> D3["Requires Legal & Data Protection Compliance Signoff"]
```

### Justification:
1. **For Kedar Hospital Local Clinic Pilot (Single Facility)**:
   - **Status: APPROVED**.
   - With `ENABLE_CROSS_HOSPITAL_SHARING = False` enforced by default, no patient data can leave the local facility.
   - Same-hospital workflows (OPD, IPD, Pharmacy, Nursing, Consultations, Prescriptions) are 100% functional and verified through automated test suites.
   - Header spoofing and direct ID access bypasses have been completely eradicated.

2. **For Multi-Hospital Data Sharing Network**:
   - **Status: BLOCKED**.
   - While the backend authorization logic, granular category scoping, diagnosis redaction, and revocation lifecycle are mathematically and programmatically verified in test environments, a general multi-facility release processing live clinical data across independent entities requires external legal data sharing agreements, ABDM NHA milestone certification, and third-party penetration testing.

---

## 9. Verification Sign-Off

- **Principal Healthcare Security Engineer**: *Remediation Confirmed & Contained*
- **Senior FastAPI Engineer**: *Architecture Verified & Code Merged*
- **DevSecOps Release Engineer**: *Production Gate Status Enforced*
