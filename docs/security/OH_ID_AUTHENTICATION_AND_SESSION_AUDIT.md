# OH-ID — Authentication, Identity & Session Security Audit

**Document ID:** OHID-SEC-AUTH-01  
**Assessment Standard:** OWASP ASVS 5.0 V2 (Authentication) & V3 (Session Management)  
**Target System:** OneHealth ID (OH-ID) Core Authentication Architecture  
**Date:** October 21, 2026  
**Auditor:** Independent Principal Application Security Architect  

---

## 1. Executive Summary & Assessment Scorecard

| Authentication Domain | ASVS 5.0 Section | Implementation Status | Finding & Risk Level |
|---|---|---|---|
| **Password Storage & Hashing** | V2.4 | Salted Bcrypt (12 rounds) | **PASS** (Solid cryptographic implementation) |
| **Login Identifier Validation** | V2.1 | Mobile-only (10 digits), Email blocked | **PASS** (Enforces architectural rule) |
| **Brute-Force & Rate Limiting** | V2.2 | Sliding window (60 req/min) | **PASS WITH CONCERN** (Needs X-Forwarded-For tuning) |
| **Token Signing & Algorithm** | V3.5 | HMAC-SHA256 (HS256) | **PASS WITH CONCERN** (Default SECRET_KEY fallback) |
| **Token Lifetime & Expiry** | V3.3 | 1440 minutes (24 hours) | **MEDIUM RISK** (Excessive lifetime without refresh rotation) |
| **Client-Side Token Storage** | V3.4 | Browser `localStorage` | **MEDIUM RISK** (Susceptible to XSS theft; recommend HttpOnly cookies) |
| **Multi-Factor Auth (MFA)** | V2.8 | Not implemented | **HIGH RISK** (Privileged accounts lack MFA) |
| **Session Invalidation on Logout**| V3.3 | Client clears token | **PASS WITH CONCERN** (Server-side blocklist recommended) |

---

## 2. Password Storage & Hashing Architecture

### Cryptographic Configuration
- **Algorithm:** Salted `bcrypt` (`bcrypt.hashpw` with `bcrypt.gensalt(rounds=12)`).
- **Work Factor:** 12 rounds ($\sim 4,096$ iterations).
- **Execution Latency:** $1,800\text{ms} - 2,000\text{ms}$ on production host VPS.
- **Maximum Length Truncation:** Plaintext is safely sliced at 72 bytes (`plain_password[:72].encode("utf-8")`) to prevent bcrypt NULL-byte truncation vulnerabilities.
- **Timing Attack Resistance:** `bcrypt.checkpw` runs in constant time. Zero plaintext passwords exist in `oh_id.users`.

---

## 3. Rate Limiting & Abuse Prevention

### Implementation: `backend/app/core/rate_limit.py`
- **Class:** `SlidingWindowRateLimiter`
- **Concurrency:** Uses Python `threading.Lock` to guarantee thread safety during timestamp updates.
- **Limits Configured:**
  - `POST /api/v1/auth/login`: 60 requests per 60-second window.
  - General API endpoints: 300 requests per 60-second window.
  - Exceeding limit raises `HTTP 429 Too Many Requests` with `Retry-After: {seconds}` header.
- **Audit Finding (SEC-AUTH-01):**  
  `request.client.host` is currently used as the rate-limiting key. When running behind Nginx on `127.0.0.1`, all client requests risk sharing the `127.0.0.1` bucket unless Nginx forwards `X-Forwarded-For` and the application explicitly parses the leftmost untrusted IP.

---

## 4. Session & Token Architecture Analysis

### JWT Payload Structure
```json
{
  "sub": "9176669426",
  "uid": "usr-356e6a6f-d6a8-4375-9257-2c9bb5fc57d0",
  "role": "HOSPITAL_ADMIN",
  "usertype_ref_id": "role-hospital-admin",
  "hospital_id": "hosp-kedar",
  "hospital_ref_id": "hosp-kedar",
  "exp": 1729612800
}
```

### Critical Security Findings & Remediation

1. **Finding SEC-AUTH-02: Hardcoded Default `SECRET_KEY` Fallback (High Severity)**
   - *Issue:* `Settings.SECRET_KEY` in `backend/app/core/config.py` defaults to `"oh-id-enterprise-production-default-secret-key-at-least-32-chars"`.
   - *Impact:* If an environment fails to supply `SECRET_KEY`, any attacker knowing the open-source default can forge valid tokens with administrative privileges.
   - *Remediation:* Enforce validation at application startup:
     ```python
     if settings.ENVIRONMENT == "production" and "default-secret" in settings.SECRET_KEY:
         raise RuntimeError("FATAL: Production SECRET_KEY must be configured in environment.")
     ```

2. **Finding SEC-AUTH-03: 24-Hour Access Token Lifetime Without Refresh Token Rotation (Medium Severity)**
   - *Issue:* Access tokens are valid for 24 hours (`1440 minutes`).
   - *Impact:* A compromised or stolen access token cannot be revoked before 24 hours have elapsed.
   - *Remediation:* Implement short-lived access tokens (15–30 minutes) paired with cryptographically rotated refresh tokens stored in `HttpOnly, Secure, SameSite=Strict` cookies.

3. **Finding SEC-AUTH-04: Lack of Multi-Factor Authentication for Privileged Roles (High Severity)**
   - *Issue:* `SUPER_ADMIN` and `HOSPITAL_ADMIN` log in using only a mobile number and static password.
   - *Impact:* Vulnerable to password compromise, shoulder surfing, or SIM swapping.
   - *Remediation:* Implement Time-based One-Time Password (TOTP, RFC 6238) or SMS OTP step-up authentication for administrative and clinical roles before clinical pilot launch.
