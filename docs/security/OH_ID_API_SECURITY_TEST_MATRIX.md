# OH-ID — API Security Test Matrix (OWASP ASVS 5.0 Baseline)

**Document ID:** OHID-SEC-ASVS-01  
**Assessment Standard:** OWASP Application Security Verification Standard (ASVS) 5.0 (Level 2 Baseline)  
**Target System:** OneHealth ID (OH-ID) Enterprise API  
**Date:** October 21, 2026  
**Auditor:** Independent Principal Application Security Architect  

---

## 1. OWASP ASVS 5.0 Verification Summary

| ASVS Chapter | Domain | Requirements Evaluated | Compliant | Findings / Remediation |
|---|---|---|---|---|
| **V1** | Architecture, Design & Threat Modeling | 6 | 5 | 1 (Host network container mode) |
| **V2** | Authentication Verification | 8 | 6 | 2 (MFA missing on admin, static fallback PIN) |
| **V3** | Session Management Verification | 6 | 4 | 2 (Default secret fallback, 24h token lifetime) |
| **V4** | Access Control & Multi-Tenancy | 10 | 9 | 1 (Hospital Admin permitted to create Rx) |
| **V5** | Validation, Sanitization & Encoding | 8 | 8 | 0 (Strict Pydantic typing & regex validation) |
| **V6** | Stored Cryptography Verification | 5 | 5 | 0 (Bcrypt 12 rounds, SHA-256 signatures) |
| **V7** | Error Handling & Logging Verification | 6 | 5 | 1 (Reverse proxy client IP parsing in rate limiter) |
| **V8** | Data Protection & Healthcare Privacy | 8 | 7 | 1 (LocalStorage client token storage) |
| **V9** | Communications Verification | 4 | 4 | 0 (TLS 1.2/1.3, HSTS max-age=31536000) |
| **V10** | Malicious Code Search | 3 | 3 | 0 (No backdoors or debug routes enabled) |
| **V11** | Business Logic Verification | 6 | 5 | 1 (Slot collision 409 confirmed; Rx versioning intact) |
| **V12** | File Upload Verification | 3 | 3 | 0 (No uncontrolled direct upload endpoints active in pilot) |
| **V13** | API & Web Service Verification | 6 | 5 | 1 (CORS whitelist includes plain http localhost) |
| **V14** | Configuration & Container Verification | 5 | 4 | 1 (COPY .env in Dockerfile layer) |
| **Total** | **All 14 Chapters** | **84** | **73 (86.9%)** | **11 Documented Findings & Mitigations** |

---

## 2. Granular API Security Test Execution Matrix

| Test ID | ASVS Code | Verification Goal | Injected Test Payload / Negative Vector | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|---|---|
| **API-01** | V2.1.1 | Login Identifier Normalization | `POST /auth/login` with email `"admin@sathus.com"` | `400 Bad Request` | `400 Bad Request` (`Email is not a login identifier`) | **PASS** |
| **API-02** | V2.4.1 | Password Storage Non-Plaintext | Direct inspection of `oh_id.users.password_hash` | Zero plaintext; all `$2b$12$` | 100% bcrypt hashes confirmed | **PASS** |
| **API-03** | V2.2.1 | Brute-Force Rate Limiting | 65 rapid login attempts from single client IP | `429 Too Many Requests` | `429 Too Many Requests` on request 61 | **PASS** |
| **API-04** | V3.2.1 | Unauthenticated Access Denial | `GET /api/v1/hospital/dashboard` without token | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **API-05** | V3.2.2 | Malformed Token Rejection | `Authorization: Bearer invalid.jwt.token` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **API-06** | V4.1.1 | Vertical Privilege Escalation | Patient token accessing `GET /api/v1/super-admin/metrics` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **API-07** | V4.1.2 | Role Boundary Enforcement | Receptionist recording doctor notes | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **API-08** | V4.1.3 | Doctor Staff Creation Blocking | Doctor attempting staff user provisioning | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **API-09** | V4.2.1 | Cross-Patient BOLA / IDOR | Patient A requesting Patient B's invoice | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **API-10** | V4.2.2 | Cross-Hospital Multi-Tenancy | Hospital A user requesting Hospital B patients | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **API-11** | V5.1.1 | SQL Injection Prevention | Mobile `' OR 1=1--` in login payload | `422 Unprocessable` | `422 Unprocessable Entity` (Pydantic validation) | **PASS** |
| **API-12** | V5.1.2 | NoSQL / Stored Query Injection | `{"phone": {"$gt": ""}}` in search endpoint | `422 Unprocessable` | `422 Unprocessable Entity` | **PASS** |
| **API-13** | V7.1.1 | Information Disclosure in Errors | Forced 500 error on malformed payload | Generic safe message | No stack trace or SQL syntax leaked | **PASS** |
| **API-14** | V8.1.1 | QR Verification Demographics Masking | Anonymous query to `/verify/prescription/{token}` | Minimal verification metadata | Diagnosis & clinical notes masked | **PASS** |
| **API-15** | V9.1.1 | HTTP Strict Transport Security | Header inspection on live HTTPS response | HSTS header present | `Strict-Transport-Security: max-age=31536000` | **PASS** |
| **API-16** | V9.2.1 | CORS Origin Allowlist | Request from untrusted `Origin: https://evil.com` | `Access-Control-Allow-Origin` absent | Header absent; untrusted origin blocked | **PASS** |
| **API-17** | V11.1.1| Appointment Double-Booking Conflict | Simultaneous booking of same doctor slot | `409 Conflict` | `409 Conflict` (`Doctor slot is already booked`) | **PASS** |
| **API-18** | V11.1.2| Duplicate Patient Registration | Same phone and DOB submitted twice | `409 Conflict` | `409 Conflict` | **PASS** |
