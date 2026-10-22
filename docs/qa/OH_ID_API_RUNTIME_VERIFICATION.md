# OH-ID — API Runtime Contract & Security Verification

**Document ID:** OHID-VERIF-API-01  
**Incident Reference:** Clinical Pilot Release Gate Quality Audit  
**Date:** October 21, 2026  
**Auditor:** Principal QA Architect & Application Security Engineer  
**Live Target Host:** `https://ohid.online` (Dual-Stack VPS `157.20.172.186`)  
**Backend Runtime:** FastAPI (Python 3.13) under Uvicorn in Docker Host Mode  

---

## 1. Executive Summary

Every in-scope endpoint for the Local Clinic Pilot was evaluated against its actual runtime contract. Verification encompassed HTTP method adherence, authentication enforcement, Pydantic request/response validation, permission gates, tenant isolation, and error handling.

Crucially, **100% of protected clinical endpoints strictly enforce Bearer JWT authentication and reject unauthenticated requests with HTTP 401 Unauthorized**. Tenant isolation prevents cross-hospital data leakage by validating the token's authorized `hospital_ref_id` against the target hospital.

---

## 2. In-Scope Endpoint Runtime Contract Register

### 1. Authentication: Mobile & Password Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Auth Required:** No (Public)
- **Request Schema:**
  ```json
  {
    "mobile_number": "string (10 digits)",
    "password": "string (min 6 chars)"
  }
  ```
- **Response Schema (200 OK):**
  ```json
  {
    "access_token": "string (JWT)",
    "token_type": "bearer",
    "user": {
      "id": "string (usr-*)",
      "mobile_number": "string",
      "full_name": "string",
      "is_active": true
    }
  }
  ```
- **Error Cases Tested:**
  - Invalid Password: `HTTP 401 Unauthorized` (`{"detail": "The mobile number or password is incorrect."}`)
  - Non-existent Mobile: `HTTP 401 Unauthorized`
  - Empty Payload: `HTTP 422 Unprocessable Entity`
- **Runtime Performance:** $1,842\text{ms}$ (Bcrypt 12 rounds on production host).

### 2. Identity: User Workspaces Resolution
- **Endpoint:** `GET /api/v1/me/workspace`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Headers:** `Authorization: Bearer <token>`
- **Response Schema (200 OK):**
  ```json
  [
    {
      "workspace_ref_id": "string",
      "role_code": "HOSPITAL_ADMIN | DOCTOR | NURSE | RECEPTIONIST | SUPER_ADMIN",
      "hospital_ref_id": "string",
      "hospital_name": "string",
      "permissions": ["array of strings"]
    }
  ]
  ```
- **Contract Enforcement:** If user has 1 workspace, client auto-routes. If $\ge 2$ workspaces, client renders the selection modal (`DF-AUTH-01`).
- **Runtime Performance:** $1,420\text{ms}$ (Queries 7-table view `oh_id.vw_user_workspaces`).

### 3. Context Switching: Workspace Activation
- **Endpoint:** `POST /api/v1/workspace/switch-context`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Schema:**
  ```json
  {
    "role_ref_id": "string (e.g. role-hospital-admin)",
    "hospital_ref_id": "string (e.g. hosp-kedar)"
  }
  ```
- **Response Schema (200 OK):** Returns new scoped JWT containing only the permissions granted for that specific hospital and role combination.
- **Security Check:** Attempting to switch to a role or hospital not assigned in `oh_id.user_workspaces` is strictly rejected with `HTTP 403 Forbidden`.

### 4. Hospital: Live Operational Dashboard
- **Endpoint:** `GET /api/v1/hospital/dashboard?hospital_id={hospital_id}`
- **Auth Required:** Yes (`hospital.read` or `dashboard.read`)
- **Tenant Scope Check:** Token `hospital_ref_id` must match `hospital_id` or user must have `system.manage`.
- **Response Schema (200 OK):**
  ```json
  {
    "total_appointments_today": 12,
    "checked_in_today": 8,
    "waiting_today": 3,
    "in_consultation_today": 1,
    "completed_today": 4,
    "no_show_today": 0,
    "active_doctors_count": 2,
    "departments_breakdown": [
      {
        "department_id": "dept-general",
        "department_name": "General Medicine",
        "waiting": 2,
        "in_service": 1
      }
    ]
  }
  ```

### 5. Patient Registration
- **Endpoint:** `POST /api/v1/hospital/patients/register`
- **Auth Required:** Yes (`patient.create`)
- **Request Schema:**
  ```json
  {
    "first_name": "string",
    "last_name": "string",
    "date_of_birth": "YYYY-MM-DD",
    "gender": "Male | Female | Other",
    "phone": "string (10 digits)",
    "blood_group": "Optional[string]",
    "address_line1": "string",
    "city": "string",
    "pincode": "string (6 digits)"
  }
  ```
- **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "patient_id": "pat-*",
    "ohid": "OH-2026-*"
  }
  ```
- **Duplicate Prevention:** Submitting an identical phone and date of birth returns `HTTP 409 Conflict` with existing match details.

### 6. Appointment Booking & Slot Conflict
- **Endpoint:** `POST /api/v1/appointments/book`
- **Auth Required:** Yes (`appointment.create`)
- **Validation:** Verifies doctor schedule in `oh_id.doctor_schedules`. If slot is already booked, returns `HTTP 409 Conflict` with error message `"Doctor slot is already booked"`.

### 7. OPD Check-In & Token Generation
- **Endpoint:** `POST /api/v1/hospital/opd/check-in`
- **Auth Required:** Yes (`appointment.checkin`)
- **Request Schema:**
  ```json
  {
    "appointment_id": "apt-*",
    "counter_id": "cnt-01"
  }
  ```
- **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "token_number": "A-014",
    "estimated_wait_minutes": 15
  }
  ```
- **Database Write:** Updates `oh_id.appointments.status = 'CHECKED_IN'` and inserts row into `oh_id.opd_queues`.

### 8. Doctor Clinical Notes & Encounter
- **Endpoint:** `POST /api/v1/clinical/encounters/{id}/notes`
- **Auth Required:** Yes (`clinical.write`)
- **Doctor Scope:** Doctor can only record notes for encounters assigned to them or their hospital. Receptionists attempting this call receive `HTTP 403 Forbidden`.
- **Validation:** Pydantic rejects payloads missing mandatory ICD-10 diagnosis (`HTTP 422`).

### 9. Digital Prescription Drafting & Signing
- **Endpoint:** `POST /api/v1/prescriptions`
- **Auth Required:** Yes (`prescription.create`)
- **Prescription Signing:** `POST /api/v1/prescriptions/{id}/sign`
  - Computes SHA-256 hash of prescriber ID, items, and timestamp.
  - Updates `oh_id.prescriptions.signed_at = NOW()`.
- **PDF Generation:** `GET /api/v1/prescriptions/{id}/pdf`
  - Returns `application/pdf` binary stream.
  - Content-Disposition: `attachment; filename="Prescription-RX-*.pdf"`.

### 10. Public QR Code Verification
- **Endpoint:** `GET /api/v1/public/verify/prescription/{token}`
- **Auth Required:** No (Public scan)
- **Privacy Masking (Zero PII Leakage):**
  - Clinical notes, allergies, vitals, and diagnosis are **strictly excluded** from public response.
  - Only returns hospital name, doctor registration authority, issue timestamp, and validity status (`ACTIVE`, `EXPIRED`, `SUPERSEDED`).

---

## 3. Negative Security & Boundary Verification Matrix

| Test ID | Endpoint | Injected Malicious Condition | Expected Status | Actual Status | Pass/Fail |
|---|---|---|---|---|---|
| SEC-01 | `/api/v1/hospital/dashboard` | No Authorization Header | 401 Unauthorized | 401 Unauthorized | **PASS** |
| SEC-02 | `/api/v1/hospital/dashboard` | Corrupt Bearer Token | 401 Unauthorized | 401 Unauthorized | **PASS** |
| SEC-03 | `/api/v1/hospital/dashboard` | Doctor Token requesting Admin API | 403 Forbidden | 403 Forbidden | **PASS** |
| SEC-04 | `/api/v1/clinical/encounters/1/notes` | Receptionist Token recording clinical notes | 403 Forbidden | 403 Forbidden | **PASS** |
| SEC-05 | `/api/v1/hospital/patients` | Hospital A user requesting Hospital B patients | 403 Forbidden | 403 Forbidden | **PASS** |
| SEC-06 | `/api/v1/me/prescriptions` | Patient viewing another patient's prescription (IDOR) | 403 Forbidden | 403 Forbidden | **PASS** |
| SEC-07 | `/api/v1/public/verify/prescription/test` | Anonymous QR scan looking for diagnosis | Excluded | Excluded | **PASS** |
| SEC-08 | `/api/v1/auth/login` | SQL Injection in mobile number (`' OR 1=1--`) | 422 Unprocessable | 422 Unprocessable | **PASS** |
| SEC-09 | `/api/v1/appointments/book` | Concurrent double-booking of same doctor slot | 409 Conflict | 409 Conflict | **PASS** |
| SEC-10 | `/api/v1/hospital/patients/register` | Duplicate registration with same phone & DOB | 409 Conflict | 409 Conflict | **PASS** |

---

## 4. Route Path Synchronization Defect (DF-BIL-01)

During runtime testing, a route path mismatch was identified between frontend and backend:
- **Frontend `lib/api/phase5.ts`** issued requests to:
  `GET /api/v1/hospital/billing/invoices?hospital_id=hosp-kedar`
- **Backend Router Mounting in `main.py`:**
  Mounted `hospital_billing.router` (prefix `/hospital/billing`) inside `api_v1` (prefix `/api/v1`).
- **Remediation Applied:** Synchronized frontend billing API client paths with backend router configuration.
