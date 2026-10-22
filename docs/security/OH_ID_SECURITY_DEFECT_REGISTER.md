# OH-ID — Security Defect Register & Vulnerability Tracking

**Document ID:** OHID-SEC-DEFECT-01  
**Assessment Standard:** CVSS v3.1 Scoring & Common Weakness Enumeration (CWE)  
**Target System:** OneHealth ID (OH-ID) Clinical Platform  
**Date:** October 21, 2026  
**Auditor:** Independent Principal Application Security Architect & Penetration Tester  

---

## 1. Vulnerability Severity Distribution

```
+-----------------------------------------------------------------------------+
|                     SECURITY DEFECT DISTRIBUTION                            |
+-----------------------------------------------------------------------------+
| [CRITICAL] 0 Vulnerabilities                                                |
| [HIGH]     3 Vulnerabilities (Docker secret bake, default SECRET_KEY, MFA)  |
| [MEDIUM]   4 Vulnerabilities (Rate limit proxy IP, token life, Admin Rx, Dep)|
| [LOW]      2 Vulnerabilities (Static sign PIN, 180-day log rotation)        |
+-----------------------------------------------------------------------------+
```

---

## 2. Comprehensive Security Defect Register

### SEC-INFRA-01: Environment Secrets Baked into Docker Image Layer
- **Severity / CVSS:** **HIGH (CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N - Score 7.1)**
- **CWE:** CWE-538 (Insertion of Sensitive Information into Externally-Accessible File or Directory)
- **Component Affected:** `backend/Dockerfile` line 19
- **Reproducible Evidence:**
  ```dockerfile
  19: COPY .env ./.env
  ```
- **Impact:** Production database connection strings and secret keys are embedded into the image filesystem. Any party with image access can extract secrets via `docker history` or `docker export`.
- **Root Cause:** Developer convenience during initial containerization to ensure `.env` is accessible to the app.
- **Remediation:** Remove `COPY .env ./.env` from Dockerfile; add `.env` to `.dockerignore`. Inject `.env` exclusively at container launch via `env_file:` in `docker-compose.yml`.
- **Status:** **REMEDIATED IN STAGING CODEBASE**

---

### SEC-AUTH-02: Hardcoded Default Fallback for Cryptographic `SECRET_KEY`
- **Severity / CVSS:** **HIGH (CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N - Score 7.4)**
- **CWE:** CWE-798 (Use of Hard-coded Credentials) / CWE-1188
- **Component Affected:** `backend/app/core/config.py` line 15
- **Reproducible Evidence:**
  ```python
  SECRET_KEY: str = os.getenv("SECRET_KEY", "oh-id-enterprise-production-default-secret-key-at-least-32-chars")
  ```
- **Impact:** If `SECRET_KEY` is omitted or unset in production, an attacker can use the known default string to sign arbitrary JWTs with `role: "SUPER_ADMIN"` or `permissions: ["*"]`.
- **Root Cause:** Missing startup guard requiring non-default secret in production environments.
- **Remediation:** Add startup validation:
  ```python
  if settings.ENVIRONMENT == "production" and "default-secret" in settings.SECRET_KEY:
      raise RuntimeError("FATAL: Production SECRET_KEY must be supplied via environment.")
  ```
- **Status:** **REMEDIATED IN STAGING CODEBASE**

---

### SEC-AUTH-04: Missing Multi-Factor Authentication (MFA) for Administrative Roles
- **Severity / CVSS:** **HIGH (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H - Score 8.8)**
- **CWE:** CWE-308 (Use of Single-factor Authentication)
- **Component Affected:** `backend/app/routers/auth.py`
- **Reproducible Evidence:** `POST /api/v1/auth/login` issues full platform administrator and hospital administrator tokens solely on mobile number and static password.
- **Impact:** Compromise of administrator password allows total tenant or platform takeover without a secondary verification challenge.
- **Root Cause:** Single-factor authentication design implemented for pilot convenience.
- **Remediation:** Implement TOTP (RFC 6238) or SMS OTP step-up authentication for `SUPER_ADMIN` and `HOSPITAL_ADMIN` roles prior to commercial launch.
- **Status:** **OPEN (Action item prior to commercial expansion)**

---

### SEC-AUTH-01: Reverse Proxy Client IP Resolution Flaw in Rate Limiter
- **Severity / CVSS:** **MEDIUM (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L - Score 5.3)**
- **CWE:** CWE-350 (Reliance on Reverse DNS / Host IP)
- **Component Affected:** `backend/app/core/rate_limit.py` line 54
- **Reproducible Evidence:**
  ```python
  client_ip = request.client.host if request.client else "unknown"
  ```
- **Impact:** Behind Nginx, `request.client.host` resolves to `127.0.0.1` for all connections. All users share the same 60 req/min bucket, allowing an attacker to trigger denial of service for all users or rendering per-IP tracking ineffective.
- **Remediation:** Inspect `X-Forwarded-For` header when request originates from trusted proxy IP `127.0.0.1`.
- **Status:** **REMEDIATED IN STAGING CODEBASE**

---

### SEC-PRIV-01: Hospital Admin Permitted to Create Clinical Prescriptions
- **Severity / CVSS:** **MEDIUM (CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:H/A:N - Score 4.9)**
- **CWE:** CWE-269 (Improper Privilege Management)
- **Component Affected:** `backend/app/routers/prescriptions.py` line 103
- **Reproducible Evidence:**
  ```python
  is_clinician = any(r in ["DOCTOR", "HOSPITAL_ADMIN", "SUPER_ADMIN"] for r in roles)
  ```
- **Impact:** An administrative hospital manager can issue medical prescriptions without medical qualifications.
- **Remediation:** Remove `HOSPITAL_ADMIN` and `SUPER_ADMIN` from prescription issuance permissions unless the individual also holds an active `DOCTOR` assignment.
- **Status:** **REMEDIATED IN STAGING CODEBASE**

---

### SEC-PRIV-02: Hardcoded Demonstration PINs in Digital Signing Workflow
- **Severity / CVSS:** **LOW (CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:L/A:N - Score 3.1)**
- **CWE:** CWE-798 (Use of Hard-coded Credentials)
- **Component Affected:** `backend/app/routers/prescriptions.py` line 124
- **Reproducible Evidence:**
  ```python
  if not payload.verification_pin or payload.verification_pin.strip() not in ["1234", "doctor123", "9999"]:
  ```
- **Remediation:** Validate signing PIN against bcrypt hash stored on doctor profile table `oh_id.doctors.signing_pin_hash`.
- **Status:** **REMEDIATED IN STAGING CODEBASE**

---

### SEC-DEP-01: Unmaintained Dependency `python-jose` with Algorithmic CVEs
- **Severity / CVSS:** **MEDIUM (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:M - Score 5.3)**
- **CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)
- **Component Affected:** `backend/requirements.txt` line 10
- **Remediation:** Schedule migration to `PyJWT` in upcoming maintenance release.
- **Status:** **OPEN (Scheduled for next release sprint)**

---

### SEC-LEGAL-01: Docker JSON File Log Retention Limited to 100MB
- **Severity / CVSS:** **LOW / COMPLIANCE (CERT-In 180-Day Rule)**
- **Component Affected:** `docker-compose.yml` lines 34-35 (`max-size: 20m`, `max-file: 5`)
- **Remediation:** Configure host syslog / logrotate forwarding to comply with rolling 180-day storage requirement.
- **Status:** **OPEN (Infrastructure operational configuration)**
