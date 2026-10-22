# OH-ID — Kedar Hospital Pilot Residual Security & Operational Gaps

**Document ID:** OHID-PILOT-GAPS-01  
**Target Facility:** Kedar Hospital (`hosp-kedar`)  
**Auditor Roles:** Principal Healthcare Application Security Architect & DevSecOps Engineer  
**Date:** October 21, 2026  

---

## 1. Executive Summary: Why We Do Not Claim 100% Security

In compliance with professional DevSecOps ethics and healthcare auditing standards, this report provides a transparent account of the **remaining security, privacy, and operational gaps** identified during the Kedar Hospital pilot evaluation.

While core technical boundaries (tenant isolation, SQL parameterization, HSTS, password bcrypt hashing) are confirmed operational, **the platform cannot be certified for unrestricted commercial operation until these six specific gaps are resolved**.

---

## 2. Granular Security & Compliance Gaps Matrix

### GAP-01: Absence of Multi-Factor Authentication (MFA) for Privileged Roles
- **Category:** Authentication Security (OWASP ASVS V2.8)
- **Description:** `SUPER_ADMIN` and `HOSPITAL_ADMIN` log in using only a 10-digit mobile number and static password.
- **Threat Vector:** Credential guessing, shoulder surfing, or password re-use from third-party breaches.
- **Likelihood:** Medium | **Impact:** High
- **Compensating Control for Pilot:**
  - Login rate limiter strictly caps attempts at 60/min.
  - Access is restricted to clinic premises or known clinician IP addresses.
  - Pilot admin accounts use high-entropy passwords (`Asdfg!23`).
- **Required Resolution Prior to Commercial Rollout:** Implement SMS OTP or Time-based One-Time Password (TOTP, RFC 6238) step-up challenge for all administrative roles.

---

### GAP-02: Pending External Third-Party Penetration Testing Certification
- **Category:** Security Assurance (CERT-In / ISO 27001)
- **Description:** While internal penetration tests passed 100% (tenant isolation, BOLA, SQLi), an external assessment by a CERT-In empanelled auditing agency has not yet been executed.
- **Threat Vector:** Undiscovered zero-day vulnerabilities or subtle protocol-level bypasses.
- **Likelihood:** Low | **Impact:** High
- **Compensating Control for Pilot:** Internal penetration testing suite (`tests/test_security_hardening.py` and `tests/test_tenant_isolation.py`) re-executed with zero failures.
- **Required Resolution:** Engage an accredited third-party security firm for formal black-box and grey-box penetration testing.

---

### GAP-03: Pending Execution of Bilateral Data Processing Agreement (DPA)
- **Category:** Legal & Regulatory Compliance (DPDP Act 2023 §8)
- **Description:** Sathus Technology Pvt Ltd and Kedar Hospital have not yet formally executed the bilateral Data Fiduciary / Data Processor agreement.
- **Threat Vector:** Regulatory fines under Section 33 of the DPDP Act 2023 for non-compliance with data processor oversight.
- **Likelihood:** Medium | **Impact:** High (Regulatory)
- **Compensating Control for Pilot:** Operations conducted strictly with synthetic patient data during the initial UAT phase.
- **Required Resolution:** Clinic management and Sathus legal counsel must execute the bilingual DPA prior to entering real patient clinical records.

---

### GAP-04: Host-Level 180-Day ICT Security Log Retention Configuration
- **Category:** Statutory Compliance (CERT-In Directions 2022 §(v))
- **Description:** Docker container json-file logging is capped at 100MB (`max-size: 20m`, `max-file: 5`), which will overwrite logs under sustained traffic, failing the rolling 180-day mandate.
- **Threat Vector:** Inability to perform retrospective forensic analysis for incidents older than the container log retention window.
- **Likelihood:** Low | **Impact:** Medium
- **Compensating Control for Pilot:** PostgreSQL audit table `oh_id.audit_logs` records critical context switches and administrative mutations with persistent cloud backups.
- **Required Resolution:** Configure host-level `rsyslog` or `promtail` forwarding to encrypted local or object storage with 180-day lifecycle policies.

---

### GAP-05: Static Clinical Demonstration Signing PIN
- **Category:** Digital Signing Integrity (OWASP ASVS V3.5)
- **Description:** The digital prescription signing workflow in `backend/app/routers/prescriptions.py` accepts demonstration PIN `1234` or doctor credentials.
- **Threat Vector:** A user with temporary access to a doctor's logged-in workstation could guess the default PIN and issue prescriptions.
- **Likelihood:** Medium | **Impact:** Medium
- **Compensating Control for Pilot:** Prescriptions require active doctor session token; doctor identity is logged in `oh_id.prescriptions.doctor_id`.
- **Required Resolution:** Migrate to individualized bcrypt-hashed PINs stored on `oh_id.doctors.signing_pin_hash` with account lockout on 3 failed PIN attempts.

---

### GAP-06: 24-Hour Access Token Lifetime Without Refresh Rotation
- **Category:** Session Management (OWASP ASVS V3.3)
- **Description:** JWT access tokens are minted with an expiration of 24 hours (`1440 minutes`).
- **Threat Vector:** Stolen access tokens remain valid until expiration unless the global `SECRET_KEY` is rotated.
- **Likelihood:** Low | **Impact:** Medium
- **Compensating Control for Pilot:** Tokens are sent over HTTPS/TLS 1.3 only; reverse proxy sets `no-store` headers to prevent proxy caching.
- **Required Resolution:** Implement 15-minute access tokens paired with rotating refresh tokens stored in `HttpOnly, Secure, SameSite=Strict` cookies.
