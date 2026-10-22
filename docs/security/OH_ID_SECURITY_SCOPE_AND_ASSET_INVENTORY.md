# OH-ID — Security Scope & Healthcare Asset Inventory

**Document ID:** OHID-SEC-ASSET-01  
**Assessment Type:** Independent Healthcare Application Security, Privacy & DevSecOps Audit  
**Date:** October 21, 2026  
**Auditor:** Independent Principal Application Security Architect & Privacy Engineer  
**Security Standard Baseline:** OWASP ASVS 5.0 (Level 2 Baseline for Healthcare Applications)  

---

## 1. System Under Review & Build Identity

| Attribute | Verified Runtime Specification | Verifiable Evidence |
|---|---|---|
| **Repository Revision** | `eaf0e53` (`feature/ohid-kedar-pilot`) | `git log -1 --oneline` |
| **Backend Runtime** | Python 3.13 / FastAPI 0.115+ / Uvicorn | Container `oh-id-backend` |
| **Frontend Runtime** | Next.js 14.2 / React 19 / TypeScript 5 | Container `oh-id-frontend` |
| **Target Deployment Host** | `https://ohid.online` (Dual-Stack VPS `157.20.172.186`) | Nginx SSL Reverse Proxy |
| **Database Engine** | PostgreSQL 15.8 (Supabase Cloud, schema `oh_id`) | Direct IPv6 Host Connection |
| **Network Architecture** | Backend: Docker Host Mode (`127.0.0.1:8050`)<br>Frontend: Bridge (`127.0.0.1:3040`)<br>Nginx: Reverse Proxy with Let's Encrypt TLS | `docker-compose.yml` & Nginx VHost |
| **AI / Gateway Scope** | Disconnected (Shared Ollama gateway strictly excluded) | Architecture Constraint |

---

## 2. Healthcare Data Asset Classification

In accordance with ISO/IEC 27701 and India's Digital Personal Data Protection Act, 2023 (DPDP Act), all data handled by OH-ID is classified by confidentiality, integrity, and availability impact:

```
+-----------------------------------------------------------------------------------+
|                            HEALTHCARE ASSET TAXONOMY                              |
+-----------------------------------------------------------------------------------+
|  TIER 1: HIGHLY SENSITIVE CLINICAL DATA (Confidentiality Impact: CRITICAL)       |
|  - Diagnostic Records & ICD-10 Coding (`oh_id.clinical_notes.diagnosis_icd10`)    |
|  - Patient Vitals, Allergies & History (`oh_id.clinical_notes.vitals_json`)       |
|  - Digital Prescriptions & Medications (`oh_id.prescriptions`, `prescription_items`)|
|  - Laboratory Investigation Reports (`oh_id.lab_orders`, `lab_results`)           |
|  - Doctor Encounter Observations & Triage Notes (`oh_id.encounters`)              |
+-----------------------------------------------------------------------------------+
|  TIER 2: PERSONALLY IDENTIFIABLE INFORMATION (PII) (Confidentiality: HIGH)        |
|  - National Health Identifier (`oh_id.patients.ohid`)                             |
|  - Patient Full Name, Phone, Date of Birth, Gender (`oh_id.patients`)             |
|  - Patient Residential Address, City, Postal Code                                 |
|  - Family Relationship & Dependent Links (`oh_id.family_relationships`)           |
+-----------------------------------------------------------------------------------+
|  TIER 3: CRYPTOGRAPHIC & AUTHENTICATION SECRETS (Integrity Impact: CRITICAL)      |
|  - Bcrypt 12-round User Password Hashes (`oh_id.users.password_hash`)             |
|  - HMAC-SHA256 JWT Token Signing Secret (`SECRET_KEY`)                           |
|  - Digital Signature Hashes for Prescriptions (`digital_signature_hash`)         |
|  - Capability Verification Tokens (`verification_token`)                          |
+-----------------------------------------------------------------------------------+
|  TIER 4: FINANCIAL & ADMINISTRATIVE DATA (Integrity Impact: HIGH)                 |
|  - Billing Invoices & Line Items (`oh_id.billing_invoices`, `billing_charges`)    |
|  - Payment Receipts & Transaction Modes (`oh_id.billing_payments`)                |
|  - OPD Counters & Queue Tokens (`oh_id.opd_queues`)                              |
|  - Staff Employment & Doctor Registrations (`oh_id.doctors`, `oh_id.nurses`)      |
+-----------------------------------------------------------------------------------+
```

---

## 3. Surface & Attack Boundary Inventory

### Public Attack Surface (Unauthenticated)
1. `GET /` — Marketing & Landing Hero Interface.
2. `GET /login` — Authentication Interface.
3. `POST /api/v1/auth/login` — Mobile & Password Authentication Endpoint (Rate limited to 60 req/min).
4. `GET /verify/prescription/{token}` — Public Digital Prescription Verification (Masked demographics, zero clinical notes).
5. `GET /verify/lab-report/{token}` — Public Lab Report Verification (Accreditation metadata only).
6. `GET /health` — Application Healthcheck probe (`127.0.0.1` only).

### Protected Staff & Clinician Surface (Authenticated Bearer JWT)
1. `/hospital/*` & `/api/v1/hospital/*` — Facility Administration, Doctor/Nurse Management, Counters, OPD Queues.
2. `/doctor/*` & `/api/v1/clinical/*` — Clinical Encounters, Consultation Notes, ICD-10 Diagnoses.
3. `/prescriptions/*` & `/api/v1/prescriptions/*` — Prescription Drafting, Digital Signing, PDF Streaming.
4. `/lab/*` & `/api/v1/laboratory/*` — Laboratory Order Management, Result Input, Report Finalization.
5. `/billing/*` & `/api/v1/hospital/billing/*` — Charge Generation, Invoicing, Payment Collection.

### Protected Patient Self-Service Surface (Authenticated Bearer JWT)
1. `/patient/*` & `/api/v1/me/*` — Personal Profile, Own Prescriptions, Own Lab Reports, Family Dependents.

### Platform Administrative Surface (SUPER_ADMIN Only)
1. `/super-admin/*` & `/api/v1/super-admin/*` — Multi-tenant Management, Hospital Onboarding, Impersonation Audits.

---

## 4. Hardware, Network & Container Topology

```
+-----------------------------------------------------------------------------+
| HOST VPS: 157.20.172.186 (Dual-Stack IPv4 / IPv6, Ubuntu 22.04 LTS)         |
|                                                                             |
|  [External Ingress: Ports 80 / 443]                                         |
|         │                                                                   |
|         ▼                                                                   |
|  +───────────────────────────────────────────────────────────────────────+  |
|  | Nginx 1.18.0 (TLS 1.2 / TLS 1.3 Termination, HSTS, Let's Encrypt)      |  |
|  +──────────────────────────────────┬────────────────────────────────────+  |
|                                     │                                       |
|               ┌─────────────────────┴──────────────────────┐                |
|               ▼                                            ▼                |
|  [Reverse Proxy: 127.0.0.1:3040]           [Reverse Proxy: 127.0.0.1:8050]  |
|  +─────────────────────────────+           +─────────────────────────────+  |
|  | Container: oh-id-frontend   |           | Container: oh-id-backend    |  |
|  | Next.js 14 / TypeScript     |           | FastAPI / Python 3.13       |  |
|  | Bridge Network              |           | Host Network Mode           |  |
|  +─────────────────────────────+           +──────────────┬──────────────+  |
|                                                           │                 |
|                                                           │ (Direct IPv6)   |
|                                                           ▼                 |
|                                            +─────────────────────────────+  |
|                                            | Supabase PostgreSQL 15.8    |  |
|                                            | Schema: oh_id               |  |
|                                            +─────────────────────────────+  |
+-----------------------------------------------------------------------------+
```
