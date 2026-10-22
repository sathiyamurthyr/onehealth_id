# OH-ID Cross-Hospital Medical Record Continuity Audit

**System**: OneHealth ID (OH-ID) Enterprise Healthcare Platform  
**Auditor Role**: Principal Healthcare Architect, Senior FastAPI Engineer, Application Security Specialist  
**Target Release**: OH-ID v1.0 Pilot Baseline (Commit HEAD)  
**Execution Date**: 2026-10-21  
**Scope**: Verification of cross-hospital medical record continuity from Hospital A to Hospital B with patient consent, tenant isolation, and security controls.

---

## 1. Definitive Conclusion

> [!CAUTION]
> ### Can OH-ID currently support this complete Hospital A-to-Hospital B workflow?
> **NO.**
> 
> While foundational database schemas, ABDM consent artifacts, FHIR mapping utilities, and isolated repository methods exist (built during Phase 4 and Phase 7), the end-to-end clinical workflow **cannot currently operate in production**.
>
> 1. **Frontend Disconnection**: The Doctor Consultation Workspace (`frontend/app/doctor/consultation/[id]/page.tsx`) contains no user interface, buttons, or modal workflows to trigger cross-hospital consent requests or invoke the consent-gated record fetch. The API client method `hospitalFetchCrossProviderRecords` in `frontend/lib/api/phase4.ts` is an orphan with zero callers across the frontend.
> 2. **Broken Patient Consent Approval Endpoint**: The approval endpoint `POST /api/v1/me/data-sharing/{id}/approve` returns `400 Bad Request: Consent request not found or patient mismatch` due to a context dictionary key mismatch (`patient_id` vs `user_ref_id` / `id` in `get_current_user_context`).
> 3. **Critical Authorization Vulnerability / Dual-Path Inconsistency**: 
>    - The consent-gated route (`POST /api/v1/hospital/data-sharing/fetch`) strictly returns `403 Forbidden` when consent is absent.
>    - However, the actual route used by the doctor workspace (`GET /api/v1/doctor/patients/{id}/history` and `GET /api/v1/doctor/patients/{id}/context`) completely bypasses both hospital tenant boundaries and patient consent, leaking full longitudinal consultations, vitals, and prescriptions from Hospital A to any doctor at Hospital B who knows or resolves the patient's ID, without audit logging.

---

## 2. End-to-End Workflow Trace (Synthetic Execution Evidence)

An automated audit trace was executed against the live application using synthetic test facilities (`hosp-a-621101` - Apex Heart Institute, `hosp-b-621101` - Bellevue Specialty Care), Doctor B (`dr.audit.621101`), and Patient (`pat-audit-621101` - Sunil Natarajan).

```
================================================================================
SYNTHETIC AUDIT TRACE LOG SUMMARY
================================================================================
Step 1: Register Patient @ Hospital A       -> SUCCESS (ID: pat-audit-621101, OH-ID: OHID-KEDAR-2026-16D698)
Step 2: Create Records @ Hospital A          -> SUCCESS (Appt: appt-a-621101, Consult: con-a-621101, Rx: rx-a-621101)
Step 3: Authenticate Doctor @ Hospital B     -> SUCCESS (dr.audit.621101, Hospital: hosp-b-621101, HTTP 200)
Step 4a: Search /patients?search=+9198...     -> HTTP 200 (Count: 0 - Isolated to Hospital B)
Step 4b: Check /patients/check-duplicate     -> HTTP 200 (duplicate_found: True, Match Count: 1)
Step 4c: Resolve /patients/qr/resolve        -> HTTP 200 (Resolved: Sunil Natarajan, Hospital A)
Step 5a: Direct GET /patients/{id}           -> HTTP 403 Forbidden (Cross-hospital boundary enforced)
Step 5b: Context GET /doctor/.../context     -> HTTP 200 OK (UNAUTHORIZED BYPASS: Leaked Consult & Rx from Hosp A)
Step 5c: History GET /doctor/.../history     -> HTTP 200 OK (UNAUTHORIZED BYPASS: Leaked 2 records from Hosp A)
Step 5d: Exchange POST .../data-sharing/fetch-> HTTP 403 Forbidden (Blocked without consent)
Step 7a: POST /hospital/data-sharing/request -> HTTP 200 OK (Consent Request ID: consent-506c3fef925e)
Step 7b: POST /me/data-sharing/.../approve   -> HTTP 400 Bad Request (Defect: Context key mismatch)
Step 8a: POST /me/data-sharing/.../revoke    -> HTTP 200 OK (Consent revoked in DB)
Step 8b: POST .../data-sharing/fetch         -> HTTP 403 Forbidden (Subsequent access denied)
```

---

## 3. Step-by-Step Scenario Analysis

### Step 1: Register Synthetic Patient at Hospital A
- **API Endpoint**: `POST /api/v1/patients` / `sp_repository.register_patient`
- **Database Objects**: `oh_id.patients`, `oh_id.vw_patients`, `oh_id.sp_register_patient_v2`
- **Observed Behavior**: Patient registered with `hospital_id = 'hosp-a-621101'`. The database stored demographics, assigned an authoritative OneHealth ID (`OHID-KEDAR-2026-16D698`), and generated a cryptographic Zero-Knowledge QR token.
- **Classification**: **IMPLEMENTED AND VERIFIED**

### Step 2: Create Appointment and Clinical Records at Hospital A
- **API Endpoints**: `POST /api/v1/appointments`, direct clinical consultations and signed prescriptions.
- **Database Objects**: `oh_id.appointments`, `oh_id.opd_consultations`, `oh_id.prescriptions`, `oh_id.prescription_items`.
- **Observed Behavior**: Consultation created with ICD-10 diagnosis `Ischemic Heart Disease (I25.9)` and signed prescription with Aspirin 75mg and Atorvastatin 40mg.
- **Classification**: **IMPLEMENTED AND VERIFIED**

### Step 3: Authenticate Doctor B at Hospital B
- **API Endpoint**: `POST /api/v1/auth/login`, `GET /api/v1/me/workspace`
- **Database Objects**: `oh_id.users`, `oh_id.hospitals`, `oh_id.doctors`.
- **Observed Behavior**: Doctor B authenticated, receiving a JWT token bound to `hospital_ref_id = 'hosp-b-621101'` and role `DOCTOR`.
- **Classification**: **IMPLEMENTED AND VERIFIED**

### Step 4: Locate Patient from Hospital B
- **Observed Channels**:
  1. `GET /api/v1/patients?search=<phone>`: **Filtered out**. Enforces `effective_hospital_id = user_hospital`. Hospital B doctor cannot find Hospital A patient through standard patient directory.
  2. `POST /api/v1/patients/check-duplicate`: **Matches**. Registry returns duplicate match with patient ID and demographic preview. Designed for front-desk registration, not clinical search.
  3. `POST /api/v1/patients/qr/resolve`: **Resolves profile**. When patient presents QR token, Hospital B doctor/staff can resolve identity and obtain `patient_id`.
- **Gaps**: No clinician-facing cross-hospital discovery tool by OneHealth ID or National ID with patient authorization.
- **Classification**: **PARTIALLY IMPLEMENTED**

### Step 5: Doctor B Discovering and Accessing Hospital A Records
- **Dual-Architecture Analysis**:
  - **Path A (Clinical Workspace Route - Active in UI)**:
    - Route: `GET /api/v1/doctor/patients/{patient_id}/context` and `GET /api/v1/doctor/patients/{patient_id}/history`
    - Policy: `verify_doctor_patient_access()` in `backend/app/routers/doctor_workspace.py` (lines 105–149).
    - Failure Mode: Only checks `role == 'DOCTOR'`. Does **not** validate `hospital_id`. Does **not** verify appointment. Does **not** check consent.
    - Security Result: **Critical BOLA / Tenant Bypass**. Doctor B received all clinical notes and prescriptions from Hospital A (Apex Heart Institute) with HTTP 200.
  - **Path B (Consent-Gated Data Sharing Route - Orphaned from UI)**:
    - Route: `POST /api/v1/hospital/data-sharing/fetch`
    - Policy: `repo.cross_hospital_fetch_records()` in `backend/app/repositories/phase4_repository.py`.
    - Result: Returned `HTTP 403 Forbidden: Access Denied: No active or valid consent artifact found for this hospital`.
- **Classification**: **PARTIALLY IMPLEMENTED / DUAL-PATH CONFLICT**

### Step 6: Consent Requirement and Legal Basis Enforcement
- In `POST /hospital/data-sharing/fetch`, consent is strictly checked against `oh_id.abdm_consent_artifacts`.
- However, in `POST /me/data-sharing/{id}/approve`, a runtime defect prevents the patient from approving consent:
  ```python
  # backend/app/routers/data_sharing.py:61
  patient_id = current_user.get("patient_id") or current_user.get("user_id")
  ```
  `get_current_user_context` returns `{"id": ..., "user_ref_id": ...}` without keys `"patient_id"` or `"user_id"`. This causes `patient_id` to evaluate to `None`, resulting in `400 Bad Request: Consent request not found or patient mismatch`.
- **Classification**: **DEFECTIVE / PARTIALLY IMPLEMENTED**

### Step 7: Access Restrictions, Scoped Disclosure, and Audit Logging
- **Scope Restriction**: When executed at repository level with active consent for `["Prescription"]`, `cross_hospital_fetch_records()` returned 1 prescription and 0 consultations, verifying data scope filtering works in SQL queries.
- **Audit Logging**:
  - `oh_id.audit_logs` records patient registration and QR scans.
  - Emergency break-glass access logs to `oh_id.audit_logs`.
  - **Regular consent-based cross-hospital reads are NOT audited in `oh_id.audit_logs`**.
  - Doctor workspace history reads (`/doctor/patients/{id}/history`) have **zero audit logging**.
- **Classification**: **PARTIALLY IMPLEMENTED**

### Step 8: Revocation of Consent and Subsequent Access Denial
- **Repository Route**: `POST /me/data-sharing/{id}/revoke` sets status to `REVOKED`.
- **Enforcement**: Subsequent `POST /hospital/data-sharing/fetch` calls are denied with `403 Forbidden`.
- **Clinical Workspace Impact**: Because `/doctor/patients/{id}/history` does not check consent, revoking consent has **zero effect** on Doctor B's consultation screen; records remain visible.
- **Classification**: **PARTIALLY IMPLEMENTED**

---

## 4. Capability Implementation Classification Matrix

| Workflow Capability | Classification | Route / File / Object | Test Evidence & Execution Result |
|---|---|---|---|
| **Patient Registration at Hospital A** | **IMPLEMENTED AND VERIFIED** | `POST /api/v1/patients`<br>`oh_id.sp_register_patient_v2` | `audit_cross_hospital_continuity_trace.py` Step 1: Registered `pat-audit-621101` at `hosp-a-621101`. |
| **Clinical Record Creation at Hospital A** | **IMPLEMENTED AND VERIFIED** | `POST /api/v1/appointments`<br>`oh_id.opd_consultations`<br>`oh_id.prescriptions` | `audit_cross_hospital_continuity_trace.py` Step 2: Created consultation `con-a-621101` and prescription `rx-a-621101`. |
| **Doctor Auth & Tenancy at Hospital B** | **IMPLEMENTED AND VERIFIED** | `POST /api/v1/auth/login`<br>`GET /api/v1/me/workspace` | Step 3: Authenticated `dr.audit.621101` with `hospital_ref_id: hosp-b-621101` (HTTP 200). |
| **Cross-Hospital Patient Discovery** | **PARTIALLY IMPLEMENTED** | `POST /patients/qr/resolve`<br>`POST /patients/check-duplicate` | Directory search `/patients?search` scopes to Hospital B. QR and duplicate check match across hospitals. No clinician search tool. |
| **Cross-Hospital Record Fetch (Consent-Gated)** | **PARTIALLY IMPLEMENTED** | `POST /hospital/data-sharing/fetch`<br>`phase4_repository.py:687` | Step 5d: Correctly rejected unconsented request (HTTP 403). Disconnected from Doctor Workspace UI. |
| **Clinical Workspace Doctor Access** | **BLOCKED / SECURITY DEFECT** | `GET /doctor/patients/{id}/context`<br>`GET /doctor/patients/{id}/history` | Step 5b & 5c: Returned Hospital A records to Doctor B without consent check or tenant boundary validation (HTTP 200). |
| **Patient Consent Request Initiation** | **IMPLEMENTED AND VERIFIED** | `POST /hospital/data-sharing/request`<br>`oh_id.abdm_consent_artifacts` | Step 7a: Created consent request `consent-506c3fef925e` with status `REQUESTED` (HTTP 200). |
| **Patient Consent Approval** | **DEFECTIVE / BLOCKED** | `POST /me/data-sharing/{id}/approve`<br>`data_sharing.py:61` | Step 7b: Failed with `HTTP 400: Consent request not found or patient mismatch` due to missing `current_user["patient_id"]`. |
| **Consent Revocation & Access Cutoff** | **PARTIALLY IMPLEMENTED** | `POST /me/data-sharing/{id}/revoke`<br>`data_sharing.py:88` | Step 8a & 8b: Revocation succeeds on consent table and blocks `data-sharing/fetch`, but fails to block `/doctor/patients/{id}/history`. |
| **Audit Logging of Cross-Hospital Reads** | **NOT IMPLEMENTED** | `phase4_repository.py:751`<br>`doctor_workspace.py:176` | Consent-based record fetches do not insert into `oh_id.audit_logs`. Only emergency break-glass is audited. |

---

## 5. Security & Privacy Vulnerability Analysis

### Vulnerability 1: BOLA / IDOR in Doctor Clinical Workspace
- **Affected Endpoints**: `GET /api/v1/doctor/patients/{patient_id}/context`, `GET /api/v1/doctor/patients/{patient_id}/history`
- **Mechanism**: `verify_doctor_patient_access` verifies that the caller has role `DOCTOR`, but never validates whether `patient.hospital_id == user.hospital_id` or whether a valid appointment / episode exists at the doctor's hospital.
- **Risk**: Any authenticated doctor across the entire network can view full medical histories, ICD-10 diagnoses, and medications for any patient by supplying their `patient_id`.

### Vulnerability 2: Missing Read Audit Logging for Health Records
- **Affected Endpoints**: `GET /api/v1/doctor/patients/{patient_id}/history`, `POST /api/v1/hospital/data-sharing/fetch`
- **Mechanism**: In `cross_hospital_fetch_records`, an audit log entry is created only when `is_break_glass == True`. In standard consent-based access, the query returns records directly without writing to `oh_id.audit_logs`.
- **Compliance Impact**: Violates healthcare data governance standards (e.g. India DPDP Act 2023, ABDM M2/M3), which require immutable logging of who accessed what record, for which patient, at what timestamp, and under what consent artifact.

### Vulnerability 3: Patient Approval Context KeyError
- **Affected Endpoint**: `POST /api/v1/me/data-sharing/{id}/approve`
- **Mechanism**: `patient_id = current_user.get("patient_id") or current_user.get("user_id")`. Since `get_current_user_context` supplies `id` and `user_ref_id`, `patient_id` evaluates to `None`.
- **Impact**: Real patients cannot approve consent requests through the API.

---

## 6. Targeted Implementation Specification

To safely enable the Hospital A-to-Hospital B workflow without introducing regressions, the following focused changes are required:

### A. Patient Identity Matching Across Facilities
1. **Explicit Identity Linking Endpoint**:
   - `POST /api/v1/hospital/patients/link-by-ohid`: Allows Hospital B front desk / triage staff to link an existing OneHealth ID or QR token to Hospital B's local facility roster.
   - Inserts mapping in `oh_id.patient_hospital_mappings` (`patient_id`, `hospital_id`, `first_seen_at`, `status`).

### B. Harmonized Clinical Authorization Policy
Modify `verify_doctor_patient_access()` in `backend/app/core/rbac.py` / `doctor_workspace.py`:
1. If `patient.hospital_id == doctor.hospital_id`: Allow access (local hospital care episode).
2. If `patient.hospital_id != doctor.hospital_id`:
   - Check if an active appointment exists for this patient at the doctor's hospital today (`oh_id.appointments` where `hospital_id = doctor.hospital_id` and `status IN ('CHECKED_IN', 'IN_QUEUE', 'IN_CONSULTATION')`).
   - AND verify that active consent exists in `oh_id.abdm_consent_artifacts` (`requester_hospital_id = doctor.hospital_id`, `consent_status = 'GRANTED'`, `expires_at > CURRENT_TIMESTAMP`).
   - If no consent: Return `403 Forbidden: Cross-Hospital Consent Required`. Provide `consent_request_url` in response.
   - If emergency: Require explicit `break_glass_reason` via break-glass flow.

### C. Resolution of Auth Context Key in `data_sharing.py`
Update `patient_id` extraction:
```python
# Before (Defective):
patient_id = current_user.get("patient_id") or current_user.get("user_id")

# After (Authoritative):
patient_id = current_user.get("user_ref_id") or current_user.get("patient_id") or current_user.get("id")
```

### D. Mandatory Audit Logging for Cross-Hospital Reads
In `cross_hospital_fetch_records()` and `get_patient_longitudinal_history()`:
```python
cur.execute("""
    INSERT INTO oh_id.audit_logs (
        id, actor_id, actor_name, hospital_id, action, resource_type, resource_id, details
    ) VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        %s, %s, %s, 'CROSS_HOSPITAL_RECORD_READ', 'PATIENT_HISTORY', %s,
        json_build_object(
            'consent_id', %s,
            'source_hospitals', %s,
            'categories', %s,
            'purpose', %s
        )::jsonb
    );
""", (doctor_id, doctor_name, requesting_hospital_id, patient_id, consent_id, source_hospitals, categories, purpose))
```

### E. Frontend Clinical Workspace Integration
1. In `frontend/app/doctor/consultation/[id]/page.tsx`:
   - Add a "External Records" banner in the History tab when external records exist.
   - If external records exist without consent, display an interactive card:
     * *“External records detected from Apex Heart Institute. Patient consent required to decrypt and view.”*
     * Button: `[Request Patient Consent (SMS / In-App)]` or `[Emergency Break-Glass]`.
2. Connect `phase4Api.requestConsent()` and `phase4Api.hospitalFetchCrossProviderRecords()` directly to this consultation component.

---

## 7. Pilot Gate Recommendations

1. **Do NOT approve multi-hospital patient continuity for live clinical use** until:
   - The BOLA bypass on `GET /doctor/patients/{id}/history` is closed.
   - The `current_user` dictionary key mismatch on consent approval is corrected.
   - Full read audit logging is active for all cross-tenant health record exchanges.
   - The Doctor Consultation Workspace is wired to the consent-gated exchange API.
2. **Kedar Hospital Pilot Isolation**:
   - For the upcoming single-facility pilot at Kedar Hospital, keep cross-hospital exchange disabled.
   - Enforce single-hospital boundaries via existing `validate_hospital_tenant_scope()`.
