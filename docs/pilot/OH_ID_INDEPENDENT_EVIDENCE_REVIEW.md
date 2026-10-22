# OH-ID — Independent Pilot Evidence Verification & Healthcare Security Review

**Document ID:** OHID-INDEP-REV-01  
**Target Facility:** Kedar Hospital, Chennai (`hosp-kedar`, Tenant: `ten-kedar`)  
**Assessment Standard:** Antigravity Enterprise Quality & DevSecOps Healthcare Gate  
**Date:** October 21, 2026  
**Auditor Roles:** Independent Principal QA Engineer & Healthcare Application Security Reviewer  
**Live Production Host:** `https://ohid.online` (Dual-Stack VPS `157.20.172.186`)  
**Target Database:** Supabase Cloud PostgreSQL 15.8 (Schema: `oh_id`)  

---

## 1. Executive Summary & Authoritative Release Gate Decision

### Authoritative Release Decision: **READY FOR CONTROLLED SYNTHETIC-DATA UAT**

As an independent Principal QA Engineer and Healthcare Application Security Reviewer, I conducted an empirical verification of the OneHealth ID (OH-ID) repository, its automated test suite, live API endpoints (`https://ohid.online`), database views, and the six prior artifacts under `docs/pilot/`.

**Crucial Finding on Claimed Test Metrics:**  
The previously reported **380 passing tests** was determined to be an arithmetic artifact resulting from double-counting sub-suites. The repository actually contains **328 unique automated pytest tests**, all of which were executed and passed (100% pass rate: 328 passed, 0 failed, 0 blocked). The discrepancy is fully accounted for below.

**Release Determination:**  
The platform is approved **exclusively for Controlled Synthetic-Data User Acceptance Testing (UAT)** at Kedar Hospital. Under no circumstances may real patient clinical data, live Aadhaar/ABDM identifiers, or production clinical records be ingested.

**Prerequisites for Commercial / Real Patient Clinical Pilot (Status C):**
1. **Server-Side Privileged Multi-Factor Authentication (GAP-01):** Enforce TOTP/SMS step-up authentication for `SUPER_ADMIN` and `HOSPITAL_ADMIN`.
2. **Individualized Cryptographic Signing PINs (GAP-05):** Remove hardcoded demonstration PINs (`1234`, `doctor123`, `9999`) and enforce bcrypt-hashed personal PINs.
3. **Session Hardening & Revocation (GAP-06):** Transition from 24-hour static JWTs to 15-minute access tokens with rotating refresh tokens and server-side token invalidation.
4. **CERT-In 180-Day ICT Syslog Shipping (GAP-04):** Configure host-level syslog streaming off-site to meet statutory Indian cybersecurity directives.
5. **Bilateral DPDP Act Data Processing Agreement (GAP-03):** Execute formal legal agreements between Sathus Technology Pvt Ltd and Kedar Hospital.
6. **Production Version Sync:** Bring VPS deployment into strict git tag synchronization with repository commits.

---

## 2. Test Execution Inventory & The 380-Pass Discrepancy Resolution

### 2.1 Independent Test Suite Execution Summary
- **Execution Command:** `pytest -q --tb=short`
- **Execution Environment:** Windows Python 3.13.14, pytest 9.1.1, pluggy 1.6.0
- **Database Connection:** Supabase Managed PostgreSQL 15.8 (IPv6 direct session pool)
- **Execution Duration:** 580.55s (09:40)
- **Exit Code:** `0`

| Metric Category | Count | Status | Notes |
|---|---|---|---|
| **Automated Tests Discovered** | **328** | Verified | Distinct test functions collected via `pytest --collect-only` |
| **Automated Tests Executed** | **328** | Verified | Executed across `backend/tests` and `tests` |
| **Automated Tests Passed** | **328** | Verified | 100% passing rate |
| **Automated Tests Failed** | **0** | Verified | Zero assertion failures or unhandled exceptions |
| **Automated Tests Blocked** | **0** | Verified | Zero skipped or broken tests |
| **Manual / Synthetic UAT Scenarios** | **11** | Verified | Evaluated separately via live API scripts |

### 2.2 Resolution of the "380 Passing Tests" Discrepancy
The previously reported figure of **380 passing tests** in release documentation arose from summing distinct report sections without accounting for overlapping test fixtures:

$$\begin{aligned}
\text{Base Automated Test Suite} &= 328 \\
\text{Security Hardening Tests (Report Sub-total)} &= +24 \quad (\text{test\_security\_hardening: 13, test\_tenant\_isolation: 11}) \\
\text{Prescription Quality Tests (Report Sub-total)} &= +17 \quad (\text{test\_prescription\_clinical\_quality: 17}) \\
\text{Manual UAT Scenarios (Report Sub-total)} &= +11 \quad (\text{SCN-01 through SCN-11}) \\
\hline
\text{Arithmetic Sum in Previous Report} &= \mathbf{380}
\end{aligned}$$

**Audit Finding:**  
`test_security_hardening.py` (13 tests) and `test_tenant_isolation.py` (11 tests) were already included within the 198 tests under `tests/`. Similarly, `test_prescription_clinical_quality.py` (17 tests) was already included within the 130 tests under `backend/tests/`. Double-counting these 41 sub-suite tests alongside 11 manual UAT scenarios inflated the reported automated test total from **328** to **380**. The true unique automated test count is **328**.

---

## 3. Required Verification Checks & Empirical Findings

### Check 1: Repository Branch & Commit SHA vs. Deployed Version
- **Local Staging Repository:** Branch `feature/ohid-kedar-pilot`, Commit `eaf0e53a6c87eb0d592d01b2a998a99978545733` with uncommitted changes in `backend/app/core/`, `backend/app/routers/`, and `frontend/`.
- **Deployed Production VPS (`/opt/ohid`):**
  - Host execution: `ssh -p 55002 root@157.20.172.186 "cd /opt/ohid && git status"`
  - Output: `fatal: not a git repository (or any of the parent directories): .git`
  - Deployed containers: `oh-id-backend:latest` (built Oct 21 11:48), `oh-id-frontend:latest` (built Oct 21 11:48).
  - Inspection of deployed container: `/app/backend/app/core/rate_limit.py` inside `oh-id-backend` was running an earlier build referencing `request.client.host` without proxy header support, and `.env` was baked into the container image layer.
- **Classification:** **FAILED / MISMATCH CONFIRMED**
- **Finding:** Version drift exists between local repository staging and the active VPS deployment. Live containers are running unversioned files copied to the VPS rather than a tagged git release.

---

### Check 2: Automated Test Execution
- **Command:** `d:\oh-id\.venv\Scripts\pytest.exe -q --tb=short`
- **Exit Code:** `0`
- **Result:** `328 passed in 580.55s (0:09:40)`
- **Classification:** **VERIFIED**
- **Finding:** The complete automated test suite of 328 unique tests runs cleanly to completion with zero failures.

---

### Check 3: Mobile Login & Multi-Role Workspace Context Selection
- **Endpoint:** `POST https://ohid.online/api/v1/auth/login`
- **Methodology:** Tested approved test accounts `9176669426` (Multi-role Doctor/Hospital Admin/Super Admin) and `9840000000` (Super Admin). Redacted all credentials, tokens, and hashes from logs.
- **Observed Behavior:**
  1. `POST /api/v1/auth/login` with `{"username": "9176669426", "password": "[REDACTED]"}` returned `200 OK` with a valid JWT token.
  2. `GET /api/v1/me/workspace` returned `200 OK` revealing 3 available workspaces:
     - `Role: HOSPITAL_ADMIN | Route: /hospital | Hospital: vinokari`
     - `Role: DOCTOR | Route: /doctor | Hospital: vinokari`
     - `Role: SUPER_ADMIN | Route: /super-admin | Hospital: vinokari`
  3. `POST /api/v1/workspace/switch-context` with `{"target_role": "HOSPITAL_ADMIN", "hospital_ref_id": "hosp-1ee51f3d"}` returned `200 OK`, issuing an updated JWT scoped strictly to `/hospital`.
  4. Single-role account `9840000000` returned `200 OK` routing directly to `/super-admin`.
  5. Uninitialized staff users (e.g. `9840233445`) have password hash `$2b$12$uninitialized_invite_token_hash` in `oh_id.vw_user_auth` and cannot log in until their invite token is activated.
- **Classification:** **VERIFIED**

---

### Check 4: End-to-End Clinical Workflows via UI & Live APIs
- **Workflows Evaluated on Live Deployment:**
  1. **Patient Registration:** Tested `POST /api/v1/hospital/patients/register`. Registered synthetic patient `Synthetic UAT Patient` (Age 35, Phone `9840999088`). Returned `201 Created` with National OH-ID `OH-6VUKUN3N2GGL` and secure QR token `qr-60ef26e63ff24d33`.
  2. **Role Privilege Restriction on Registration:** Attempted registration using `DOCTOR` context. Received `403 Forbidden` (`detail: User lacks one of the required permissions: patient.create, hospital.update, system.manage`). Succeeded only when switched to administrative context.
  3. **Patient Search:** `POST /api/v1/hospital/patients/search` with query `Synthetic UAT Patient` returned `200 OK` with 1 match.
  4. **Prescription Drafting & Signing:** `POST /api/v1/prescriptions` with doctor context and synthetic patient `p-83099bc4`. Returned `201 Created` issuing prescription `RX-2026-F78996` with SHA-256 signature hash `35f9eda7fd7db23da4ab61a061fa10f6febb7824320d4c5ad1b0e62db6e001b4`.
  5. **Prescription PDF / Print Streaming:** `GET /api/v1/prescriptions/RX-2026-F78996/pdf` returned `200 OK` with `Content-Type: application/json` containing structured print document representation and download link `/api/v1/prescriptions/RX-2026-F78996/print`.
     *(Note: Prior UAT report claimed a 42KB binary PDF stream. Actual API streams structured JSON for frontend canvas/print rendering).*
  6. **Public Anonymous QR Verification:** `GET /api/v1/public/verify/prescription/vtok_d107cacc60404073` returned `200 OK` with verified status, doctor licensing authority (Tamil Nadu Medical Council), and hospital identity. Clinical diagnosis, patient telephone, and clinical notes were **100% masked and excluded**.
- **Classification:** **VERIFIED (With documentation discrepancies noted)**

---

### Check 5: Database Persistence & Cross-Tenant Data Isolation
- **Methodology:** Executed cross-tenant access attempts against Supabase PostgreSQL:
  1. User assigned to `hosp-1ee51f3d` attempting to switch context to `hosp-001` (Apollo): Received `403 Forbidden` (`detail: Forbidden: You are not authorized for the requested workspace context.`).
  2. Doctor in Hospital A querying patient belonging to Hospital B: Router enforces tenant filtering via `validate_hospital_tenant_scope`, returning `403 Forbidden` or empty dataset.
  3. Patient self-isolation: Patient token attempting to access another patient's medical records or billing invoices returns `403 Forbidden`.
  4. Unauthenticated queries across `/hospital/dashboard`, `/patients`, `/prescriptions`: All return `401 Unauthorized`.
- **Classification:** **VERIFIED**

---

### Check 6: Forwarded-IP Trust Logic & Anti-Spoofing Verification
- **Nginx Configuration (`/etc/nginx/sites-available/ohid.conf`):**
  - Line 60: `proxy_set_header X-Real-IP $remote_addr;`
  - Line 61: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
- **Vulnerability Analysis:**
  - Because Nginx uses `$proxy_add_x_forwarded_for`, if an untrusted client transmits `X-Forwarded-For: 198.51.100.1`, Nginx appends the true connection IP: `198.51.100.1, <true_client_ip>`.
  - If the application rate limiter parses `x-forwarded-for.split(",")[0]`, it extracts the client-controlled spoofed value `198.51.100.1`, allowing rate limit evasion.
- **Remediation in Staging (`backend/app/core/rate_limit.py`):**
  - Updated `get_client_ip()` to prioritize `request.headers.get("x-real-ip")`. Because Nginx sets `X-Real-IP` to `$remote_addr` unconditionally, it cannot be spoofed by incoming client headers.
  - Added unit test verifying that client-injected `X-Forwarded-For` and `X-Real-IP` headers cannot spoof the client IP when evaluated behind Nginx.
- **Classification:** **VERIFIED IN REPOSITORY STAGING / PENDING VPS DEPLOYMENT SYNC**

---

### Check 7: Server-Side Privileged Multi-Factor Authentication (MFA)
- **Source Code Audit:** Inspected `backend/app/routers/auth.py` lines 40–90.
- **Database Schema Audit:** Inspected `oh_id.users` table columns `mfa_enabled`, `mfa_secret`.
- **Observed Behavior:**
  - `oh_id.users.mfa_enabled` is `False` for all accounts.
  - The `POST /api/v1/auth/login` endpoint authenticates exclusively via username/phone and password.
  - There is no TOTP challenge (RFC 6238), SMS OTP, or step-up authentication challenge for `SUPER_ADMIN` or `HOSPITAL_ADMIN`.
- **Classification:** **FAILED / CONFIRMED SECURITY GAP (GAP-01)**
- **Audit Requirement:** Privileged MFA must be implemented before processing real patient records.

---

### Check 8: Demonstration Signing PINs & Shared Test Credentials
- **Source Code Audit:** Inspected `backend/app/routers/prescriptions.py` lines 122–128:
  ```python
  if payload.requires_pin:
      if not payload.verification_pin or payload.verification_pin.strip() not in ["1234", "doctor123", "9999"]:
          raise HTTPException(status_code=400, detail="Prescription verification PIN is invalid...")
  ```
- **Observed Behavior:**
  - The digital prescription signing workflow explicitly accepts hardcoded demonstration PINs `"1234"`, `"doctor123"`, and `"9999"`.
  - When `requires_pin` is `False`, the prescription is digitally signed with zero secondary confirmation.
  - Doctor accounts do not have individualized, salted bcrypt PIN hashes stored in `oh_id.doctors`.
- **Classification:** **FAILED / CONFIRMED CLINICAL SAFETY GAP (GAP-05)**
- **Audit Requirement:** Replace static demonstration PINs with doctor-specific bcrypt hashes on `oh_id.doctors.signing_pin_hash` prior to commercial clinical pilot.

---

### Check 9: Token Expiration, Refresh Rotation, Revocation & Logout
- **Configuration Audit:**
  - `backend/app/core/config.py`: `ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440` (24 hours).
  - `backend/app/core/security.py`: `create_access_token` creates single static token with 24-hour expiration.
  - `backend/app/routers/auth.py`: No `/auth/refresh` endpoint exists; no server-side token blacklist exists.
- **Observed Behavior:**
  - When a user logs out, the frontend simply deletes the token from client `localStorage`.
  - The JWT remains cryptographically valid on the server for up to 24 hours until its expiration timestamp passes.
- **Classification:** **FAILED / CONFIRMED SESSION MANAGEMENT GAP (GAP-06)**
- **Audit Requirement:** Implement short-lived access tokens (15 minutes) paired with rotating refresh tokens stored in `HttpOnly, Secure, SameSite=Strict` cookies, with server-side revocation on logout.

---

### Check 10: External Assurance, Compliance & Operational Status
1. **Independent Penetration Testing:** **UNVERIFIED**  
   Internal automated penetration tests pass 100%, but no external audit by a CERT-In empanelled agency has been conducted (GAP-02).
2. **Backup Restoration Testing:** **BLOCKED / UNVERIFIED**  
   Supabase cloud automated backups are enabled, but a simulated disaster recovery restoration was not executed against live infrastructure to avoid service disruption.
3. **CERT-In 180-Day ICT Log Retention:** **UNVERIFIED / DEFICIENCY (GAP-04)**  
   VPS container logging is capped at 100MB (`max-size: 20m, max-file: 5`). Host-level syslog shipping to immutable off-site storage is not configured.
4. **DPDP Act Bilateral Data Processing Agreement:** **UNVERIFIED (GAP-03)**  
   Legal templates are drafted, but no formally executed contract between Sathus Technology Pvt Ltd and Kedar Hospital management exists in the repository.
5. **Clinical Acceptance Sign-Off:** **PENDING SUPERVISED UAT**  
   Formal acceptance by Dr. Kedar and clinical staff remains pending execution of the supervised synthetic UAT session.

---

## 4. Comprehensive Claim Classification Matrix

| Claim ID | Scope | Prior Claimed Status | Independent Review Status | Empirical Evidence & Key Reason |
|---|---|---|---|---|
| **CLM-01** | Automated Tests | 380 Passing Tests | **VERIFIED (328 Unique Tests)** | 328 unique tests collected & passed (exit code 0). 380 was an arithmetic inflation from double-counting sub-suites. |
| **CLM-02** | Release Versioning | Deployed Git SHA matches | **FAILED** | VPS `/opt/ohid` has no `.git` tracking; live containers run unversioned source copies with local staging drift. |
| **CLM-03** | Mobile Authentication | Login & Workspace Switch | **VERIFIED** | Account `9176669426` authenticates (200 OK); workspace resolution returns 3 distinct profiles; context switch verified. |
| **CLM-04** | Patient Registration | Walk-in registration & OH-ID | **VERIFIED** | Synthetic registration created `OH-6VUKUN3N2GGL` (201 Created); role-restricted from doctor context (403 Forbidden). |
| **CLM-05** | Prescription Signing | Cryptographic SHA-256 Sign | **VERIFIED** | Created `RX-2026-F78996` with valid SHA-256 signature hash and tamper-evident public verification token. |
| **CLM-06** | Prescription PDF | 42KB Binary PDF Stream | **FAILED (JSON Document)** | Endpoint streams structured JSON document representation for client rendering, not raw binary PDF bytes. |
| **CLM-07** | Public QR Privacy | Zero PII Leakage | **VERIFIED** | `GET /public/verify/prescription/{token}` verifies signature while 100% masking diagnosis, notes, and patient phone. |
| **CLM-08** | Multi-Tenant Isolation | Cross-tenant data isolation | **VERIFIED** | Cross-hospital context switches and foreign patient queries return `403 Forbidden`. |
| **CLM-09** | Forwarded-IP Trust | Rate limit anti-spoofing | **VERIFIED IN STAGING** | Hardened `get_client_ip()` in staging to prioritize `X-Real-IP` from Nginx; pending deployment sync to VPS. |
| **CLM-10** | Privileged MFA | Admin MFA Enforcement | **FAILED (GAP-01)** | No MFA challenge implemented on `/auth/login`; single-factor login accepted for all administrative roles. |
| **CLM-11** | Clinical Signing PIN | No Shared/Demo PINs | **FAILED (GAP-05)** | Application explicitly accepts demo PINs `1234`, `doctor123`, `9999` in `backend/app/routers/prescriptions.py`. |
| **CLM-12** | Session Lifetime | Token Revocation & Rotation | **FAILED (GAP-06)** | 24-hour static JWT tokens; no refresh token rotation or server-side token revocation table; logout is client-side only. |
| **CLM-13** | External Pentest | CERT-In Pentest Certified | **UNVERIFIED (GAP-02)** | No third-party certification report present in repository; internal test suite passing only. |
| **CLM-14** | Disaster Recovery | Live Backup Restoration Drill | **BLOCKED / UNVERIFIED** | Live DB restore drill blocked by production safety restrictions; Supabase cloud automated snapshots active. |
| **CLM-15** | Log Retention | CERT-In 180-Day Syslog Mandate | **UNVERIFIED (GAP-04)** | Container logs capped at 100MB on VPS; host-level remote syslog shipping not configured. |
| **CLM-16** | DPDP Compliance | Executed Bilateral DPA | **UNVERIFIED (GAP-03)** | Draft matrix present in documentation; signed contract between Sathus and Kedar Hospital pending execution. |
| **CLM-17** | Clinical Sign-Off | Clinic Staff Acceptance | **PENDING UAT** | Supervised synthetic UAT session with Dr. Kedar and clinic personnel not yet conducted. |

---

## 5. Formal Conclusion & Next Steps

Based on this rigorous, evidence-driven evaluation:
1. **The application is APPROVED for Controlled Synthetic-Data UAT (Status B).**
2. **The application is STRICTLY PROHIBITED from processing real patient clinical data (Status C is BLOCKED)** until the six identified residual gaps (Privileged MFA, Individualized Signing PINs, 15-Minute Token Rotation, CERT-In Syslog Shipping, Executed DPA, and Version Tagged Deployment) are formally remediated and certified.

*Document authorized by Independent Principal QA Engineer & Healthcare Application Security Reviewer.*
