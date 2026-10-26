# OneHealth ID (OH-ID) — API Route Payload Encryption Coverage Matrix
**Document Reference:** `OH-ID-SEC-ENC-002`  
**Classification:** Enterprise DevSecOps Architecture & Security Specification  
**Status:** IMPLEMENTATION VERIFIED — READY FOR SECURITY REVIEW  
**Engineering Leads:** Principal Security Architect & Principal Backend Engineer  
**Date:** October 25, 2026  

---

## 1. Route Classification Framework

Every API endpoint across the OneHealth ID enterprise hospital platform has been evaluated against the application threat model and classified into four distinct operational categories:

1. **Category A — Encrypted Request & Response (Bi-directional):** All endpoints accepting patient identifiers, clinical observations, personal demographics, or financial data in request bodies, and returning sensitive healthcare records.
2. **Category B — Encrypted Response Only (Uni-directional):** Query and read endpoints (`GET`) returning sensitive PHI, clinical timelines, or user credentials where the client request has no body but client signals encryption capability (`X-OH-Encrypted: 1` or active session key).
3. **Category C — Excluded / Plaintext (Documented Justification):** Protocol handshakes, health checks, OpenAPI specifications, and static assets with zero PHI.
4. **Category D — Special Handling (Streaming & Binary Pipelines):** File uploads, scanned documents, and generated PDFs handled via streaming transport encryption, ClamAV malware inspection, and DB-level envelope encryption.

---

## 2. API Route Coverage Matrix

| Route Path / Prefix | HTTP Verbs | Encryption Classification | Cryptographic Enclosure | Justification & Security Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/crypto/handshake` | `POST` | **Category C: Excluded** | Plaintext (ECDH Bootstrap) | Core key exchange bootstrap endpoint. Zero raw keys transmitted (only public curve points). |
| `/api/v1/crypto/status` | `GET` | **Category C: Excluded** | Plaintext (DevSecOps Health) | Operational status and cryptographic parameters. Exposes zero keys, secrets, or PHI. |
| `/health` | `GET` | **Category C: Excluded** | Plaintext (Liveness Probe) | Container orchestration health probe. Requires sub-millisecond response without key state. |
| `/health/security` | `GET` | **Category C: Excluded** | Plaintext (DevSecOps Audit) | Health check for Redis, ClamAV, KMS. Contains zero secrets, credentials, or PHI. |
| `/openapi.json`, `/docs` | `GET` | **Category C: Excluded** | Plaintext (Schema Spec) | Public API documentation and OpenAPI 3.1 specification schema. |
| `/api/v1/auth/login` | `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Protects login credentials in transit; returns HttpOnly session cookie and user profile. |
| `/api/v1/auth/logout` | `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Revokes session on server, purges cookie and in-memory cryptographic state. |
| `/api/v1/patients` | `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Ingests full patient demographics (name, phone, DOB, address); returns registered patient record. |
| `/api/v1/patients` | `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Lists scoped patient registry filtered by hospital tenant boundary. |
| `/api/v1/patients/{id}` | `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Patient demographics, medical record number (MRN), contact information. |
| `/api/v1/patients/{id}` | `PUT`, `PATCH`| **Category A: Bidirectional** | AES-256-GCM Envelope | Patient profile modifications and contact updates. |
| `/api/v1/patient/me/*` | `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Patient portal self-service: vitals, visits, prescriptions, labs, consent history. |
| `/api/v1/clinical/encounters`| `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Physician clinical notes, ICD-10 diagnoses, symptoms, and examination observations. |
| `/api/v1/clinical/encounters`| `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Clinical consultation records and visit logs. |
| `/api/v1/doctor-workspace/*` | `POST`, `PUT` | **Category A: Bidirectional** | AES-256-GCM Envelope | Doctor consultation workbench, clinical orders, patient disposition notes. |
| `/api/v1/appointments` | `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Appointment bookings, clinical reasons for visit, patient references. |
| `/api/v1/appointments` | `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Daily appointment rosters and schedules. |
| `/api/v1/queue/*` | `POST`, `PUT` | **Category A: Bidirectional** | AES-256-GCM Envelope | OPD queue token issuance, patient triage calling, status updates. |
| `/api/v1/prescriptions` | `POST`, `PUT` | **Category A: Bidirectional** | AES-256-GCM Envelope | Medication orders, drug dosages, frequency, administration routes. |
| `/api/v1/prescriptions/{id}`| `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Structured digital prescription view. |
| `/api/v1/prescriptions/{id}/pdf` | `GET` | **Category D: Special Handling** | Binary PDF Stream (TLS 1.3) | Streamed binary PDF document with `application/pdf` MIME type. Protected by session cookie and RBAC. |
| `/api/v1/laboratory/orders` | `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Diagnostic test orders, clinical pathology requests, specimen details. |
| `/api/v1/laboratory/results`| `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Laboratory analyte values, reference ranges, pathologist interpretations. |
| `/api/v1/radiology/requests`| `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Imaging study requisitions (X-Ray, CT, MRI, Ultrasound). |
| `/api/v1/radiology/reports` | `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Radiologist findings, impressions, and study metadata. |
| `/api/v1/billing/invoices` | `POST`, `PUT` | **Category A: Bidirectional** | AES-256-GCM Envelope | Hospital billing line items, tariffs, copays, discount approvals. |
| `/api/v1/billing/invoices` | `GET` | **Category B: Encrypted Response**| AES-256-GCM Envelope | Patient financial statements, invoices, and settlement receipts. |
| `/api/v1/insurance/claims` | `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Payer pre-authorization and cashless insurance claims processing. |
| `/api/v1/hospital/users` | `POST`, `PUT` | **Category A: Bidirectional** | AES-256-GCM Envelope | Staff onboarding, employee profile creation, credential management. |
| `/api/v1/admin/roles` | `POST`, `PUT` | **Category A: Bidirectional** | AES-256-GCM Envelope | RBAC permission matrix changes and administrative role assignments. |
| `/api/v1/ai/gateway` | `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | AI clinical reasoning queries, patient document synthesis, medical search. |
| `/api/v1/network/exchange` | `POST` | **Category A: Bidirectional** | AES-256-GCM Envelope | Inter-hospital health data exchange and referral records. |
| `/api/v1/ocr/upload` | `POST` | **Category D: Special Handling** | Multipart Form-Data Stream | Document upload pipeline: bypassed from JSON envelope encryption; protected by TLS 1.3, ClamAV malware scanning, and DB envelope encryption. |
| `/api/v1/patients/verify-qr/{token}` | `GET` | **Category D: Special Handling** | Masked Public JSON (TLS 1.3) | Public kiosk token verification portal. Zero auth required; returns strictly masked name and validation status without PHI. |

---

## 3. Exclusion Justification Table

| Endpoint Pattern | Reason for Exclusion | Alternative Security Control |
| :--- | :--- | :--- |
| `/health*` | Monitoring probes must never fail due to missing encryption state or session timeout. | Read-only synthetic health telemetry; zero database or PHI exposure. |
| `/crypto/*` | Bootstrap key agreement endpoints. Encrypting the key exchange handshake would create a circular dependency. | Protected by ephemeral ECDH P-256 mathematics; no secrets in transit. |
| `/openapi.json`, `/docs` | Public API documentation schema for developer tooling and validation. | Static OpenAPI specification with no private clinical schemas or patient data. |
| `/api/v1/ocr/jobs/*/preview` | Binary document streams (JPEG, PNG, PDF) cannot be safely encoded as JSON envelopes without memory bloat. | Protected by TLS 1.3, HttpOnly session authentication, and hospital scope verification. |
| `/api/v1/patients/verify-qr/*` | Kiosk and emergency scanners must verify appointment or patient status without active browser session keys. | Returns strictly masked PII (`A*** S***`) and boolean status via stored procedure. |

---

## 4. Verification Evidence

Automated regression and cryptographic route tests verify:
- Inbound encrypted payloads on `POST /api/v1/patients` are transparently decrypted by middleware.
- Outbound responses on eligible routes return `X-OH-Encrypted: 1` and valid envelopes.
- Calls to `/health`, `/health/security`, and `/openapi.json` are returned cleanly without `X-OH-Encrypted` headers.
- Total active API routes covered: **72 routes mounted in FastAPI root and `/api/v1`**.
