# OH-ID — Data Flow Architecture & Trust Boundaries

**Document ID:** OHID-SEC-DATAFLOW-01  
**Assessment Standard:** NIST SP 800-53 / OWASP Threat & Data Flow Modeling  
**Target System:** OneHealth ID (OH-ID) Clinical Platform  
**Date:** October 21, 2026  
**Auditor:** Independent Principal Application Security Architect  

---

## 1. High-Level Data Flow Diagram (DFD Level 1)

```
 [ CLINIC PATIENTS / USERS ]             [ CLINICAL STAFF / DOCTORS ]          [ PUBLIC QR SCANNERS ]
             │                                        │                                   │
             │ HTTPS / TLS 1.3                        │ HTTPS / TLS 1.3                   │ HTTPS / TLS 1.3
             ▼                                        ▼                                   ▼
+───────────────────────────────────────────────────────────────────────────────────────────────+
| TRUST BOUNDARY 0: PUBLIC INTERNET                                                             |
+───────────────────────────────────────────────────────────────────────────────────────────────+
                                             │
                                             ▼
+───────────────────────────────────────────────────────────────────────────────────────────────+
| TRUST BOUNDARY 1: PERIMETER SECURITY & REVERSE PROXY                                          |
|                                                                                               |
|  [ Nginx 1.18.0 Reverse Proxy ]                                                               |
|  - TLS Termination (Let's Encrypt RSA 2048 / ECDSA)                                           |
|  - Security Headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options                       |
|  - Path Routing: / -> Port 3040 | /api/v1/* -> Port 8050                                      |
+───────────────────────────────────────────────────────────────────────────────────────────────+
                                             │
                                             ▼
+───────────────────────────────────────────────────────────────────────────────────────────────+
| TRUST BOUNDARY 2: APPLICATION SERVICE LAYER (Docker Container `oh-id-backend`)                |
|                                                                                               |
|  [ FastAPI Core Pipeline ]                                                                    |
|  1. SecurityHeadersMiddleware (no-cache on /api/, MIME protection)                             |
|  2. Hardened CORSMiddleware (Explicit origin whitelist)                                       |
|  3. SlidingWindowRateLimiter (Login 60/min, API 300/min)                                      |
|  4. Pydantic Request Validation (Type constraints, string lengths, regex)                     |
|  5. Centralized RBAC Dependency (Token decode, dynamic permission resolution)                 |
|  6. validate_hospital_tenant_scope (Hospital A != Hospital B rejection)                       |
+───────────────────────────────────────────────────────────────────────────────────────────────+
                                             │
                                             ▼ Direct IPv6 PostgreSQL Connection
+───────────────────────────────────────────────────────────────────────────────────────────────+
| TRUST BOUNDARY 3: PERSISTENCE & DATA STORAGE LAYER (Supabase PostgreSQL 15.8)                 |
|                                                                                               |
|  [ Schema: `oh_id` ]                                                                          |
|  - Auth & Workspaces: `vw_user_auth`, `vw_user_workspaces`, `users`, `user_workspaces`        |
|  - Patient Demographics: `patients`, `patient_identifiers`                                    |
|  - Encounters & Clinical Notes: `encounters`, `clinical_notes`                                 |
|  - Prescriptions: `prescriptions`, `prescription_items` (SHA-256 digital signature)           |
|  - Diagnostics: `lab_orders`, `lab_results`                                                   |
|  - Financial: `billing_invoices`, `billing_charges`, `billing_payments`                       |
|  - Audit Trail: `audit_logs`, `support_impersonation_logs`                                    |
+───────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Trust Boundary Definitions & Enforcement Mechanisms

### Trust Boundary 0 $\rightarrow$ 1: Public Untrusted Internet to Perimeter
- **Threat Vector:** Man-in-the-Middle (MitM) eavesdropping, packet sniffing, SSL stripping.
- **Enforcement Control:** Nginx enforces HTTPS redirection (HTTP 301 $\rightarrow$ HTTPS 443).
- **HSTS Enforcement:** `Strict-Transport-Security: max-age=31536000; includeSubDomains` header prevents browser downgrade attacks.
- **TLS Configuration:** TLS 1.2 and TLS 1.3 only; weak ciphers disabled.

### Trust Boundary 1 $\rightarrow$ 2: Reverse Proxy to Application Container
- **Threat Vector:** Reverse proxy bypass, header spoofing, local network eavesdropping.
- **Enforcement Control:** Frontend and backend containers bind exclusively to `127.0.0.1` (`127.0.0.1:3040` and `127.0.0.1:8050`). No external port is directly exposed on public interfaces.
- **Audit Observation:** Backend operates in `network_mode: host` to facilitate Supabase IPv6 routing. Host network mode shares the host socket table; therefore, binding to `127.0.0.1` inside Uvicorn is strictly necessary to prevent external bypass of Nginx.

### Trust Boundary 2 $\rightarrow$ 3: Application Logic to Database
- **Threat Vector:** SQL Injection, database credential exposure, multi-tenant data bleed.
- **Enforcement Control:**
  - 100% Parameterized queries across all repository files; zero string concatenation in SQL statements.
  - Connection credentials read exclusively from environment variables (`DATABASE_URL`).
  - Read-only operations leverage dedicated view projections (`oh_id.vw_*`).

### Trust Boundary 4: Inter-Tenant Boundary (Hospital A vs. Hospital B)
- **Threat Vector:** Clinician or staff at Kedar Hospital accessing patient records belonging to Apollo Hospital.
- **Enforcement Control:** `validate_hospital_tenant_scope()` compares the authenticated token's `hospital_ref_id` against the resource's `hospital_id`. Mismatch triggers `HTTP 403 Forbidden` with audit logging.

### Trust Boundary 5: Role & Privilege Boundary
- **Threat Vector:** Horizontal and Vertical Privilege Escalation.
- **Enforcement Control:**
  - Receptionists cannot record clinical consultation notes (`clinical.write` required).
  - Doctors cannot delete or provision hospital staff accounts (`user.manage` required).
  - Patients can only read their own records (`effective_patient_id` forced to `current_user.id` when role is `PATIENT`).

---

## 3. Patient Data Lifecycle Matrix

| Lifecycle Stage | Healthcare Data Elements | Security & Privacy Control Applied |
|---|---|---|
| **Collection & Entry** | Patient name, mobile, DOB, gender, address | Validated via Pydantic schema (`min_length`, regex, phone normalization). |
| **Storage & Encryption** | Demographics, ICD-10 notes, prescriptions | Stored in PostgreSQL with TLS in transit (`sslmode=require`). Passwords hashed with bcrypt 12 rounds. |
| **Retrieval & Read** | Clinical consultations, doctor encounters | Scoped to authorized doctor relationship and tenant hospital. |
| **Public Sharing** | QR verification scans on printed prescription | Masked response excludes diagnoses, doctor notes, allergies, and vitals. |
| **Modification** | Finalized prescriptions | Immutable. Amendments require new version generation (`version = version + 1`). |
| **Logging & Audit** | Context switches, administrative updates | Recorded in `oh_id.audit_logs` without storing passwords, tokens, or raw medical text. |
| **Retention & Erasure** | Historic medical encounters | Medical records retained per Indian Clinical Establishments Act rules (minimum 3 years for OPD, 5+ years for IPD/medico-legal). |
