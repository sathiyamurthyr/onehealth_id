# OH-ID — Kedar Hospital Pilot Release Gate & Certification

**Document ID:** OHID-PILOT-GATE-01 (Revision 2 — Post-Independent Review)  
**Target Facility:** Kedar Hospital, Chennai (`hosp-kedar`, Tenant: `ten-kedar`)  
**Assessment Standard:** Antigravity Enterprise Quality & DevSecOps Healthcare Gate  
**Date:** October 21, 2026  
**Auditor Roles:** Independent Principal QA Engineer, Clinical Workflow Analyst & Healthcare Application Security Reviewer  
**Reference Document:** [OH_ID_INDEPENDENT_EVIDENCE_REVIEW.md](file:///d:/oh-id/docs/pilot/OH_ID_INDEPENDENT_EVIDENCE_REVIEW.md)  

---

## 1. Formal Release Decision

### Final Release Status: **B. READY FOR CONTROLLED SYNTHETIC-DATA UAT**

> **Authoritative Determination:**  
> The OneHealth ID (OH-ID) clinical platform is **APPROVED for Controlled Synthetic-Data User Acceptance Testing (UAT)** at Kedar Hospital.
> 
> Core clinical workflows (patient registration, appointment booking, OPD reception check-in, doctor consultation, digital prescription signing with SHA-256, and anonymous QR verification) have been verified end-to-end on the live production environment (`https://ohid.online`) using synthetic data.
> 
> **Status B is designated (rather than Status C)** because while the technical foundation is robust, the following prerequisites must be finalized before processing real patient records:
> 1. Formally executed bilateral Data Processing Agreement (DPA) under the DPDP Act 2023.
> 2. Hospital acceptance sign-off by Dr. Kedar and clinic administrative staff following supervised UAT.
> 3. Host-level 180-day syslog shipping for statutory CERT-In compliance (GAP-04).
> 4. Server-side administrative Multi-Factor Authentication (MFA) enforcement (GAP-01).
> 5. Elimination of demonstration signing PINs (`1234`) in favor of doctor-specific bcrypt hashes (GAP-05).
> 6. Migration from 24-hour static JWTs to 15-minute access tokens with rotating refresh tokens (GAP-06).
> 7. Synchronization of unversioned VPS container deployments with git tagged releases.

---

## 2. Test Execution Inventory & Resolution of Test Discrepancies

| Metric Category | Count | Status | Independent Audit Note |
|---|---|---|---|
| **Automated Tests Discovered** | **328** | Verified | Distinct test functions collected via `pytest --collect-only` |
| **Automated Tests Executed** | **328** | Verified | Executed across `backend/tests` and `tests` |
| **Automated Tests Passed** | **328** | Verified | 100% passing rate (`580.55s`, exit code `0`) |
| **Automated Tests Failed** | **0** | Verified | Zero assertion failures or unhandled exceptions |
| **Automated Tests Blocked** | **0** | Verified | Zero skipped or broken tests |
| **Manual / Synthetic UAT Scenarios** | **11** | Verified | Evaluated separately via live API scripts |

### Accounting for the Previously Reported "380 Passes"
The prior figure of **380 passing tests** was an arithmetic sum that double-counted overlapping sub-suites:
$$\text{Base Suite (328)} + \text{Security Tests (24)} + \text{Rx Clinical Tests (17)} + \text{Manual UAT Scenarios (11)} = \mathbf{380}$$
Because the 24 security hardening tests and 17 prescription clinical quality tests are already part of the 328 automated tests, the true unique automated test count is **328**.

---

## 3. Requirements Traceability Matrix

| Requirement | Test Description | Evidence Artifact | Defect / Gap ID | Status |
|---|---|---|---|---|
| **REQ-AUTH-01** | Mobile/password authentication & bcrypt 12 | `backend/tests/test_phase1_mobile_only_login.py` | DF-PILOT-02 (Resolved) | **PASSED** |
| **REQ-AUTH-02** | Multi-role workspace selection & context switch | `backend/tests/test_multi_role_workspace_selection.py` | DF-PILOT-01 (Mitigated) | **PASSED** |
| **REQ-AUTH-03** | Rate limiting & client IP anti-spoofing | `tests/test_security_hardening.py` | DF-PILOT-05 (Hardened) | **PASSED** |
| **REQ-PAT-01** | Patient registration & National OH-ID generation | `tests/test_pilot_comprehensive_api.py` | None | **PASSED** |
| **REQ-PAT-02** | Duplicate patient prevention on phone + DOB | `tests/test_pilot_comprehensive_api.py` | None | **PASSED (409)** |
| **REQ-APT-01** | Appointment slot booking & status transition | `tests/test_appointment_discovery_booking.py` | None | **PASSED** |
| **REQ-APT-02** | Doctor slot double-booking collision prevention | `backend/tests/test_phase2_hospital_operations.py` | None | **PASSED (409)** |
| **REQ-QUE-01** | OPD reception check-in & token generation | `tests/test_hospital_api.py` | None | **PASSED** |
| **REQ-CLN-01** | Doctor consultation & mandatory ICD-10 diagnosis | `tests/test_doctor_consultation_workspace.py` | None | **PASSED** |
| **REQ-RX-01** | Digital prescription drafting & schedule matrix | `backend/tests/test_prescription_clinical_quality.py` | None | **PASSED** |
| **REQ-RX-02** | Cryptographic digital signing (SHA-256 hash) | `backend/tests/test_prescription_clinical_quality.py` | DF-PILOT-06 (Resolved) | **PASSED** |
| **REQ-RX-03** | Prescription PDF / print document generation | `backend/tests/test_prescription_clinical_quality.py` | Note: Streams JSON | **PASSED (200)** |
| **REQ-QR-01** | Public QR scan with zero clinical PII leakage | `tests/test_security_hardening.py` | None | **PASSED** |
| **REQ-SEC-01** | Cross-hospital tenant boundary enforcement | `tests/test_tenant_isolation.py` | None | **PASSED (403)** |
| **REQ-SEC-02** | Cross-patient BOLA / IDOR protection | `tests/test_tenant_isolation.py` | None | **PASSED (403)** |
| **REQ-SEC-03** | SQL injection prevention via 100% parameterization | `tests/test_security_hardening.py` | None | **PASSED** |
| **REQ-SEC-04** | Secret isolation in Docker build & config startup | Dockerfile & `config.py` audit | DF-PILOT-03 / 04 (Resolved) | **PASSED** |
| **REQ-MFA-01** | Privileged-user server-side MFA enforcement | `backend/app/routers/auth.py` | GAP-01 | **BLOCKED / GAP** |
| **REQ-PIN-01** | Individualized digital clinical signing PINs | `backend/app/routers/prescriptions.py` | GAP-05 | **BLOCKED / GAP** |
| **REQ-SES-01** | Token expiration & refresh token rotation | `backend/app/core/security.py` | GAP-06 | **BLOCKED / GAP** |
| **REQ-LEG-01** | DPDP Act 2023 DPA Contractual Agreement | `OH_ID_PRIVACY_AND_LEGAL_OBLIGATIONS_MATRIX.md` | GAP-03 | **PENDING SIGN-OFF** |
| **REQ-LEG-02** | CERT-In 180-Day ICT Security Log Retention | `OH_ID_INCIDENT_RESPONSE_AND_RECOVERY.md` | GAP-04 | **PENDING OPS CONFIG** |
| **REQ-EXT-01** | External CERT-In Empanelled Pentest Audit | `OH_ID_PILOT_SECURITY_GAPS.md` | GAP-02 | **PENDING VENDOR** |

---

## 4. Supervised Synthetic-Data UAT Protocol & Rules of Engagement

During the initial synthetic-data UAT session at Kedar Hospital:
1. **Clinician Persona Walkthrough:**  
   Walk Dr. Kedar and senior clinicians through the multi-role workspace selection modal on account `9176669426`. Confirm understanding of Doctor vs. Hospital Admin context separation.
2. **Thermal Prescription Printing & QR Scan:**  
   Print a synthetic prescription from the doctor workspace on the clinic's physical desk printer. Scan the printed QR code using standard smartphone cameras to verify public verification loading and PII masking.
3. **Reception Speed Test:**  
   Simulate 5 walk-in synthetic patient registrations and queue token issuances with reception staff to verify form responsiveness.
4. **Offline Fallback Policy:**  
   Ensure the clinic maintains standard paper prescription pads as a fail-safe contingency during any network outage.

---

## 5. Formal Sign-Off Checklist for Transition to Status C

| Milestone | Responsible Party | Acceptance Evidence | Status |
|---|---|---|---|
| Synthetic-Data UAT Scenarios Passed | Principal QA Lead | [OH_ID_KEDAR_HOSPITAL_UAT_RESULTS.md](file:///d:/oh-id/docs/pilot/OH_ID_KEDAR_HOSPITAL_UAT_RESULTS.md) | **COMPLETE** |
| Automated Regression Suite (328/328) | QA Architect | `pytest -q` execution log (Exit code 0) | **COMPLETE** |
| Independent Evidence Verification | Independent QA Reviewer | [OH_ID_INDEPENDENT_EVIDENCE_REVIEW.md](file:///d:/oh-id/docs/pilot/OH_ID_INDEPENDENT_EVIDENCE_REVIEW.md) | **COMPLETE** |
| Privileged-User Server-side MFA | Backend Security Lead | MFA challenge implementation in `auth.py` | **PENDING GAP-01** |
| Individualized Clinical Signing PINs | Healthcare Engineer | Doctor bcrypt PIN implementation in `prescriptions.py` | **PENDING GAP-05** |
| Session Token Rotation & Revocation | DevSecOps Lead | 15-min JWT + refresh cookie implementation | **PENDING GAP-06** |
| Production VPS Git Sync | DevOps Release Lead | Tagged git release build deployed to `/opt/ohid` | **PENDING SYNC** |
| Clinic Workflow Acceptance | Dr. Kedar / Clinical Director | Supervised UAT Acceptance Sign-Off Sheet | **PENDING UAT SESSION** |
| Bilateral DPDP DPA Execution | Sathus Legal & Hospital Management | Signed Data Processing Agreement | **PENDING LEGAL (GAP-03)** |
| CERT-In 180-Day Syslog Shipping | DevSecOps Lead | Host syslog forwarding confirmation | **PENDING OPS (GAP-04)** |
