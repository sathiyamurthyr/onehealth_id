# OHID — Enterprise Security Audit Report

**Application**: OneHealth ID (OH-ID) Enterprise Hospital Operating System  
**Version**: 1.0.0-enterprise  
**Audit Date**: October 1, 2026  
**Auditor**: Antigravity Enterprise Security Team  
**Scope**: Full Repository Audit (Backend, Frontend, Database, Configuration, Git History, CI/CD, Dependencies)  
**Status**: AUDIT COMPLETE — REMEDIATION IN PROGRESS  

---

## 1. Executive Summary

A comprehensive enterprise security audit was performed on the OneHealth ID (OH-ID) application across 20 distinct security domains. The system is architected as a Next.js 16.3.7 frontend connected to a FastAPI backend powered by PostgreSQL with stored procedures and database views.

The audit identified **12 security findings**, including **3 CRITICAL**, **3 HIGH**, **3 MEDIUM**, and **3 LOW/INFORMATIONAL** vulnerabilities. Immediate remediation is required to secure sensitive patient health information (PHI), financial billing systems, authentication mechanisms, and multi-tenant isolation.

### Summary of Findings by Severity

| Severity | Count | Status |
| :--- | :---: | :--- |
| **CRITICAL** | 3 | FAIL (Remediation Required) |
| **HIGH** | 3 | FAIL (Remediation Required) |
| **MEDIUM** | 3 | FAIL (Remediation Required) |
| **LOW** | 2 | FAIL (Remediation Required) |
| **INFORMATIONAL** | 1 | DOCUMENTED |
| **TOTAL** | **12** | **ACTION REQUIRED** |

---

## 2. Technical Stack & Architecture Discovery

| Component | Technology | Version | Notes / Security Posture |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (React 19) | 16.3.7 / 19.2.8 | App Router, Tailwind CSS 4, Lucide icons |
| **Backend Framework** | FastAPI | 0.142.2 | Uvicorn ASGI runner, Python 3.13.14 |
| **Database & Engine** | PostgreSQL (Supabase) | 16.3 | Managed instance, schema `oh_id` |
| **Database Access** | psycopg2-binary | 2.9.13 | RealDictCursor, Parameterized queries, SP/Views |
| **Authentication** | JWT (python-jose) | 3.5.0 | HS256 HMAC tokens, 24-hr expiry |
| **Password Hashing** | passlib[bcrypt] | 1.7.4 | Bcrypt context; database currently contains plaintext |
| **Authorization** | Custom RBAC (FastAPI Depends) | v1.0 | Role Workspaces, granular permissions catalog |
| **Reverse Proxy / CORS** | Starlette CORSMiddleware | 1.7.0 | Contains wildcard `*` with credentials enabled |
| **Static File Exposure** | Public directory SVGs only | - | No sensitive static files or source maps exposed |
| **File Uploads** | None currently implemented | - | Not applicable in current surface |
| **WebSockets** | None currently implemented | - | HTTP REST only |

---

## 3. Comprehensive Vulnerability Register

### SEC-001: Hardcoded Database Credentials & Secret Key in Source Code and Git History
- **Severity**: **CRITICAL**
- **Affected Component**: Backend Configuration & Database Connectors
- **Files Affected**:
  - `backend/app/core/config.py`
  - `backend/app/db/init_db.py`
  - `test_db_conn.py`
  - `test_sp_views.py`
  - Git Commit `b6066914c225580bd96283b2f96cf1ce3401bf85`
- **Evidence**:
  - `backend/app/core/config.py`: Hardcoded fallback `DATABASE_URL = "postgresql://postgres:[REDACTED_PASSWORD]@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"`
  - `backend/app/core/config.py`: Hardcoded fallback `SECRET_KEY = "oh-id-enterprise-super-secure-key-2026"`
  - `test_db_conn.py` and `test_sp_views.py`: Direct connection string literals in source.
- **Attack Scenario**: An attacker accessing the repository or decompiled container image extracts the database password and Supabase host, gaining direct administrative access to all tables, stored procedures, and audit logs. Furthermore, knowledge of `SECRET_KEY` allows forging valid JWTs for any role (including `SUPER_ADMIN`).
- **Risk**: Total compromise of patient confidentiality, data integrity, and compliance breach (HIPAA / DPDPA).
- **Recommended Remediation**:
  1. Strip all credential literals from source code and replace with `os.getenv(...)` with no sensitive defaults.
  2. Create `.env.example` with sanitized placeholders.
  3. Load credentials exclusively via environment injection.
  4. Immediately rotate database credentials on Supabase and generate a cryptographically strong 256-bit `SECRET_KEY`.
  5. Tighten `.gitignore` to match `**/.env*`.
- **Test Required**: Automated test verifying application fails cleanly when required environment variables are absent without falling back to hardcoded secrets.
- **Status**: **FAIL**

---

### SEC-002: Plaintext Password Storage and Insecure Equality Verification Fallback
- **Severity**: **CRITICAL**
- **Affected Component**: Authentication Engine & User Database
- **Files Affected**:
  - `backend/app/core/security.py`
  - `backend/app/db/seed_data.sql`
  - PostgreSQL Database Table `oh_id.users`
- **Evidence**:
  - Direct database inspection revealed all system users (`admin`, `doctor`, `receptionist`, `nurse`, `patient`, `dr.senthil`, etc.) have unhashed plaintext passwords in the `password_hash` column.
  - `backend/app/core/security.py` lines 11-12:
    ```python
    if plain_password == hashed_password:
        return True
    ```
- **Attack Scenario**: If any database backup, read replica, or SQL query result is intercepted, all user credentials are immediately compromised without requiring password cracking. The plaintext comparison is also vulnerable to timing attacks.
- **Risk**: Universal account compromise; violation of ISO 27001, HIPAA § 164.312, and OWASP ASVS 2.1.
- **Recommended Remediation**:
  1. Execute a database migration script converting all plaintext user passwords in `oh_id.users` into salted bcrypt hashes.
  2. Update `backend/app/db/seed_data.sql` to store bcrypt hashes.
  3. Remove the plaintext comparison fallback from `backend/app/core/security.py` so only valid cryptographic verification is accepted.
- **Test Required**: Test database verification rejecting plaintext credentials directly matching the hash column and validating bcrypt hash verification.
- **Status**: **FAIL**

---

### SEC-003: Unauthenticated Access and Broken Function Level Authorization (BFLA) on Financial, Administrative, and Clinical APIs
- **Severity**: **CRITICAL**
- **Affected Component**: API Routing & Access Control
- **Files Affected**:
  - `backend/app/routers/billing.py`
  - `backend/app/routers/admin.py`
  - `backend/app/routers/clinical.py`
  - `backend/app/routers/doctors.py`
- **Evidence**:
  - `backend/app/routers/billing.py`:
    - `GET /api/v1/billing/invoices` — No authentication dependency.
    - `GET /api/v1/billing/invoices/{invoice_id}` — No authentication dependency.
    - `POST /api/v1/billing/invoices/{invoice_id}/pay` — No authentication dependency.
  - `backend/app/routers/admin.py`:
    - `GET /api/v1/admin/audit-logs` — No authentication dependency.
    - `GET /api/v1/admin/departments` — No authentication dependency.
  - `backend/app/routers/clinical.py`:
    - `POST /api/v1/clinical/consultations` — Authentication bypass logic (`if not user: actor_id = payload.doctor_id`).
    - `GET /api/v1/clinical/opd/encounters`, `GET /api/v1/clinical/ipd/admissions`, `GET /api/v1/clinical/laboratory/orders`, `GET /api/v1/clinical/pharmacy/dispensary` — Zero authentication dependencies.
  - `backend/app/routers/doctors.py`:
    - `POST /api/v1/doctors` — Unauthenticated creation of doctor accounts.
- **Attack Scenario**: An anonymous external attacker issues HTTP requests to `/api/v1/billing/invoices` to exfiltrate all patient invoices, calls `/api/v1/billing/invoices/{id}/pay` to fraudulently mark unpaid bills as settled, inspects `/api/v1/admin/audit-logs` to monitor forensic actions, and dumps clinical lab orders and OPD encounters.
- **Risk**: Severe financial fraud, unauthorized alteration of medical treatment records, HIPAA violations.
- **Recommended Remediation**:
  1. Add `Depends(require_permission("billing.read"))` and `require_permission("billing.pay")` on billing endpoints.
  2. Add `Depends(require_permission("audit.read"))` on administrative audit log endpoints.
  3. Require authenticated clinician context (`doctor.consult` or `consultation.create`) for recording consultations and clinical views.
  4. Require `Depends(require_permission("doctor.create"))` for registering doctors.
- **Test Required**: Automated tests sending unauthenticated and unauthorized requests to these endpoints, asserting HTTP 401 and 403 responses.
- **Status**: **FAIL**

---

### SEC-004: Broken Object Level Authorization (BOLA / IDOR) in Patient & Appointment Endpoints
- **Severity**: **HIGH**
- **Affected Component**: Object Access Control & Multi-Tenant Boundaries
- **Files Affected**:
  - `backend/app/routers/patients.py`
  - `backend/app/routers/appointments.py`
  - `backend/app/routers/queue.py`
- **Evidence**:
  - `backend/app/routers/patients.py`: `get_patient(patient_id)` verifies hospital scope, but for users with role `PATIENT` (who have `patient.self.read`), it does NOT verify that `patient_id` corresponds to the caller's own linked patient record. Any patient can view any other patient's record within the same hospital.
  - `backend/app/routers/appointments.py`: `list_appointments()` allows a patient user to supply arbitrary `?patient_id=` query parameters or omit it entirely to view appointments of other citizens.
  - `backend/app/routers/queue.py`: `perform_queue_action()` fetches a queue item by ID without checking if the queue item belongs to the user's assigned hospital.
- **Attack Scenario**: Patient A logs in, changes the URL from `/api/v1/patients/p-101` to `/api/v1/patients/p-102`, and receives Patient B's complete medical history, diagnosis, phone, address, and emergency contact.
- **Risk**: Massive privacy violation, unauthorized disclosure of sensitive medical diagnoses.
- **Recommended Remediation**:
  1. Enforce object ownership checks: if user role is `PATIENT` or lacks platform `patient.read`, verify `patient_id` matches the user's authenticated citizen profile.
  2. Force `patient_id` filter in `list_appointments` to the caller's own ID when caller is a citizen.
  3. Enforce `validate_hospital_tenant_scope` on `queue` actions.
- **Test Required**: Automated IDOR test where Patient A attempts to read Patient B's record and receives HTTP 403 Forbidden.
- **Status**: **FAIL**

---

### SEC-005: Insecure CORS Policy (Wildcard Origin Combined with Credentials)
- **Severity**: **HIGH**
- **Affected Component**: Cross-Origin Resource Sharing Middleware
- **Files Affected**:
  - `backend/app/core/config.py`
  - `backend/app/main.py`
  - `main.py`
- **Evidence**:
  - `settings.CORS_ORIGINS` includes `"*"` alongside `allow_credentials=True`:
    ```python
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    ```
- **Attack Scenario**: An attacker hosts a malicious website that issues cross-origin fetch calls with cookies or authorization headers to the hospital backend. Browsers or misconfigured proxies may allow reflection, enabling Cross-Site data exfiltration.
- **Risk**: Cross-Site Data Exfiltration, session hijacking.
- **Recommended Remediation**:
  1. Remove `"*"` from `CORS_ORIGINS`.
  2. Explicitly specify allowed development and production origins (e.g., `http://localhost:3000`, `http://127.0.0.1:3000`, and authorized production domains).
  3. Restrict allowed HTTP methods and headers to required verbs.
- **Test Required**: Test preflight OPTIONS and cross-origin requests from unauthorized origin (e.g. `https://evil-attacker.com`), asserting rejection.
- **Status**: **FAIL**

---

### SEC-006: Absence of Authentication Rate Limiting (Brute-Force Risk)
- **Severity**: **HIGH**
- **Affected Component**: Authentication Gateway
- **Files Affected**:
  - `backend/app/routers/auth.py`
- **Evidence**:
  - `POST /api/v1/auth/login` contains no throttling, sliding-window rate limit, or lockout logic.
- **Attack Scenario**: An attacker runs an automated wordlist brute-force tool against `/api/v1/auth/login` to compromise weak staff passwords.
- **Risk**: Account takeover of doctor or administrative credentials; DoS against database through repeated CPU-intensive bcrypt calculations.
- **Recommended Remediation**:
  1. Implement a thread-safe sliding-window rate limiter on `/api/v1/auth/login` limiting attempts per client IP (e.g., 5 attempts/minute).
  2. Return HTTP 429 Too Many Requests with a `Retry-After` header when threshold is breached.
- **Test Required**: Automated test firing 10 consecutive failed login requests and verifying HTTP 429 is returned.
- **Status**: **FAIL**

---

### SEC-007: Information Disclosure via Unsanitized Exception Messages
- **Severity**: **MEDIUM**
- **Affected Component**: Global & Router Error Handling
- **Files Affected**:
  - `backend/app/routers/billing.py`
  - `backend/app/routers/queue.py`
  - `backend/app/routers/doctors.py`
  - `backend/app/routers/appointments.py`
  - `backend/app/routers/patients.py`
  - `backend/app/routers/hospital.py`
  - `backend/app/routers/clinical.py`
- **Evidence**:
  - Catch blocks throughout routers return `HTTPException(status_code=500, detail=str(e))` or `detail=f"Operation failed: {str(e)}"`.
- **Attack Scenario**: A malformed request or database constraint failure returns raw PostgreSQL error strings containing schema names (`oh_id`), table names, foreign key constraints, and SQL syntax errors to clients.
- **Risk**: Internal infrastructure enumeration assisting attack payload refinement.
- **Recommended Remediation**:
  1. Implement server-side logging (`logger.error(...)`) for internal exceptions.
  2. Return generic client-facing messages e.g. `"An unexpected error occurred while processing your request. Please contact hospital support."`
- **Test Required**: Force a database error and verify response body contains no SQL, schema, or system trace details.
- **Status**: **FAIL**

---

### SEC-008: Missing Security HTTP Headers on Backend and Frontend
- **Severity**: **MEDIUM**
- **Affected Component**: HTTP Response Layer
- **Files Affected**:
  - `backend/app/main.py`
  - `frontend/next.config.ts`
- **Evidence**:
  - Responses from FastAPI and Next.js lack `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Attack Scenario**:
  - An attacker embeds the administrative portal in an iframe on an external site for clickjacking.
  - A browser MIME-sniffs an uploaded or returned text response as HTML/JavaScript, triggering XSS.
- **Risk**: Clickjacking, MIME confusion attacks, cross-site leaks.
- **Recommended Remediation**:
  1. Add a Security Headers middleware to FastAPI applying standard defense-in-depth headers.
  2. Add `headers()` configuration in `frontend/next.config.ts` applying CSP and framing protections.
- **Test Required**: Verify presence of security headers on all HTTP GET responses.
- **Status**: **FAIL**

---

### SEC-009: Unauthenticated Public QR Token Resolution Endpoint
- **Severity**: **MEDIUM**
- **Affected Component**: QR Token Resolution API
- **Files Affected**:
  - `backend/app/routers/patients.py`
- **Evidence**:
  - `GET /api/v1/patients/verify-qr/{qr_token}` resolves the full patient demographic and diagnosis payload without requiring any authentication token or kiosk credentials.
- **Attack Scenario**: An attacker guessing or intercepting a QR token string queries `/verify-qr/{token}` and retrieves full PII including patient name, phone, address, and diagnosis.
- **Risk**: Patient PII exposure.
- **Recommended Remediation**:
  1. Restrict `/verify-qr/{qr_token}` or sanitize its response so unauthenticated callers only receive verification confirmation (`valid: true/false`, masked identifier) without full medical and personal records.
  2. Require `patient.qr.scan` permission for full resolution.
- **Test Required**: Request `/verify-qr/{qr_token}` unauthenticated and assert that full PII is not leaked.
- **Status**: **FAIL**

---

### SEC-010: Unbounded Input Fields in Pydantic Request Models
- **Severity**: **MEDIUM**
- **Affected Component**: Input Validation Layer
- **Files Affected**:
  - `backend/app/schemas/models.py`
- **Evidence**:
  - `LoginRequest` fields `username` and `password` have no length bounds (`min_length`, `max_length`).
  - Several string fields across `PatientBase` and `DoctorCreate` lack `max_length` constraints.
- **Attack Scenario**: Submitting a 10MB password string in `/auth/login` causes CPU exhaustion during hashing or JSON parsing, resulting in application unresponsiveness.
- **Risk**: Denial of Service (DoS) via resource exhaustion.
- **Recommended Remediation**:
  1. Add `Field(..., min_length=1, max_length=100)` on usernames, `Field(..., min_length=1, max_length=128)` on passwords.
  2. Add bounds to all patient and doctor string attributes.
- **Test Required**: Test sending oversized payload to login endpoint and verify validation rejection with HTTP 422 Unprocessable Entity.
- **Status**: **FAIL**

---

### SEC-011: Legacy Insecure Root `main.py` Attack Surface
- **Severity**: **LOW**
- **Affected Component**: Legacy Prototype Server
- **Files Affected**:
  - `d:/oh-id/main.py`
- **Evidence**:
  - Root `main.py` contains in-memory data structures, hardcoded demo user dictionaries (`DEMO_USERS` with plaintext passwords), and `allow_origins=["*"]`.
- **Attack Scenario**: If a developer or container deployment runs `uvicorn main:app` instead of `uvicorn backend.app.main:app`, the system exposes a completely insecure mock application.
- **Risk**: Inadvertent deployment of development mockup.
- **Recommended Remediation**:
  1. Harden root `main.py` or redirect it to `backend.app.main:app`.
  2. Ensure all deployment scripts (`run_app.bat`, `run_app.ps1`, Dockerfiles) invoke exclusively `backend.app.main:app`.
- **Test Required**: Verify system startup scripts invoke `backend.app.main:app`.
- **Status**: **FAIL**

---

### SEC-012: Incomplete Security Event Logging & Monitoring
- **Severity**: **LOW**
- **Affected Component**: Audit & Observability Infrastructure
- **Files Affected**:
  - `backend/app/core/logging.py` (Missing)
  - `backend/app/routers/auth.py`
- **Evidence**:
  - Failed authentication attempts, token validation failures, and permission denials are not recorded in a structured server-side security log.
- **Attack Scenario**: Brute force attacks or unauthorized access attempts occur without generating detection telemetry for security monitoring.
- **Risk**: Inability to detect active attacks or perform post-incident forensics.
- **Recommended Remediation**:
  1. Create a structured security event logger in `backend/app/core/logging.py`.
  2. Emit structured log events on authentication failure, token expiration, access denial, and context switches.
  3. Ensure sensitive credentials, passwords, and tokens are never logged.
- **Test Required**: Trigger failed login and verify structured security log entry is created without sensitive credentials.
- **Status**: **FAIL**

---

## 4. Remediation Action Plan & Verification Roadmap

| Phase | Finding ID | Remediation Strategy | Target File(s) | Verification Test |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 2 & 3** | SEC-001 | Remove credentials from code, create `.env.example`, inject via env | `config.py`, `.env.example`, `.gitignore` | `test_security_env_config` |
| **Phase 4 & 14**| SEC-002 | Migrate DB passwords to bcrypt, update seed SQL, remove plain fallback | `migrate_passwords.py`, `security.py` | `test_password_hashing_security` |
| **Phase 5 & 6** | SEC-003 | Enforce RBAC dependencies on billing, admin, clinical, and doctors | `billing.py`, `admin.py`, `clinical.py`, `doctors.py` | `test_unauthenticated_endpoint_rejection` |
| **Phase 5** | SEC-004 | Add object ownership validation on patients, appointments, queue | `patients.py`, `appointments.py`, `queue.py` | `test_idor_patient_isolation` |
| **Phase 10** | SEC-005 | Restrict CORS origins to trusted domains, eliminate wildcard | `config.py`, `main.py` | `test_cors_restriction` |
| **Phase 13** | SEC-006 | Implement sliding-window rate limiter on `/auth/login` | `rate_limit.py`, `auth.py` | `test_login_rate_limiting` |
| **Phase 12** | SEC-007 | Sanitize error responses, prevent raw SQL/exception leakage | All routers in `backend/app/routers/` | `test_error_sanitization` |
| **Phase 11** | SEC-008 | Add security headers middleware (FastAPI & Next.js) | `backend/app/main.py`, `next.config.ts` | `test_security_headers_present` |
| **Phase 7 & 8** | SEC-009, 010 | Sanitize public QR verify; add bounds to Pydantic models | `patients.py`, `models.py` | `test_input_validation_bounds` |
| **Phase 16 & 17**| SEC-011, 012 | Standardize production app runner; add structured security logging | `main.py`, `backend/app/core/logging.py` | `test_security_logging` |

---
**Report Approved by**: Antigravity Enterprise Security Assurance Team  
