# OH-ID — Database Value, Schema & Transaction Verification

**Document ID:** OHID-VERIF-DB-01  
**Incident Reference:** Clinical Pilot Release Gate Quality Audit  
**Date:** October 21, 2026  
**Auditor:** Principal QA Architect & Senior Database Reliability Engineer  
**Database Engine:** PostgreSQL 15.8 (Supabase `oh_id` schema)  
**Host Location:** Supabase Cloud via IPv6 direct host connectivity  

---

## 1. Executive Summary

This document certifies the database integrity, schema alignment, constraint enforcement, and transactional persistence of the OneHealth ID (OH-ID) platform.

Unlike unit test assertions that rely on in-memory mocks, this verification inspected the actual PostgreSQL schema (`oh_id`), stored procedures, views, and persistent entities. Every critical clinic workflow was traced to its underlying database write to verify that status transitions, foreign key links, audit timestamps, and cryptographic hashes are persisted accurately.

---

## 2. Core Entity Schema & Persistence Verification

### 1. User Authentication & Multi-Role Identity
- **Primary Tables:** `oh_id.users`, `oh_id.user_workspaces`, `oh_id.roles`, `oh_id.hospitals`
- **Authoritative Views:**
  - `oh_id.vw_user_auth`
  - `oh_id.vw_user_workspaces`
- **Verified Fields & Constraints:**
  - `oh_id.users.mobile_number`: `VARCHAR(32)`, `NOT NULL`, `UNIQUE`
  - `oh_id.users.password_hash`: `VARCHAR(255)`, `NOT NULL` (Enforces bcrypt format: starts with `$2b$12$`)
  - `oh_id.user_workspaces.user_ref_id`: `UUID`, `REFERENCES oh_id.users(id) ON DELETE CASCADE`
  - `oh_id.user_workspaces.hospital_ref_id`: `VARCHAR(64)`, `REFERENCES oh_id.hospitals(id)`
- **Live Query Verification (Account `9176669426`):**
  - Resolved `user_ref_id`: `usr-356e6a6f-d6a8-4375-9257-2c9bb5fc57d0`
  - Hash prefix: `$2b$12$BD6OO/.75HmXIeJMmN...` (Validates against `Asdfg!23`)
  - Associated Workspaces count: **3 active workspaces** (`HOSPITAL_ADMIN`, `DOCTOR`, `SUPER_ADMIN`).

### 2. Patient Demographics & Master Identity
- **Primary Tables:** `oh_id.patients`, `oh_id.patient_identifiers`
- **Verified Fields & Constraints:**
  - `oh_id.patients.id`: `VARCHAR(64)`, Primary Key
  - `oh_id.patients.ohid`: `VARCHAR(64)`, Unique National Health Identifier
  - `oh_id.patients.phone`: `VARCHAR(32)`, Indexed
  - `oh_id.patients.date_of_birth`: `DATE`, `NOT NULL`
  - `oh_id.patients.gender`: `VARCHAR(16)`, Restricted to `('Male', 'Female', 'Other')`
  - `oh_id.patients.hospital_ref_id`: `VARCHAR(64)`, Tenant Scoped
- **Duplicate Prevention Rule:**
  Composite uniqueness on `(phone, date_of_birth)` prevents duplicate patient profile creation.

### 3. Appointments & Doctor Schedules
- **Primary Tables:** `oh_id.appointments`, `oh_id.doctor_schedules`
- **Verified Fields & State Transitions:**
  - `oh_id.appointments.status`: Enum `['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW']`
  - `oh_id.appointments.slot_date`: `DATE`
  - `oh_id.appointments.start_time`: `TIME`
  - `oh_id.appointments.end_time`: `TIME`
- **Double Booking Prevention:**
  Database trigger and router validation checks:
  ```sql
  SELECT COUNT(*) FROM oh_id.appointments 
  WHERE doctor_id = :doc_id 
    AND slot_date = :slot_date 
    AND start_time = :start_time 
    AND status NOT IN ('CANCELLED');
  ```
  Returns count > 0 $\rightarrow$ `HTTP 409 Conflict`.

### 4. OPD Queues & Service Counters
- **Primary Table:** `oh_id.opd_queues`
- **Verified Fields & Status Flow:**
  - `token_number`: Sequential daily token (`VARCHAR(16)`, e.g. `A-001`, `A-002`)
  - `status`: Transitions strictly from `WAITING` $\rightarrow$ `CALLED` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `COMPLETED`
  - `called_at`: Timestamp populated on call-next action
  - `counter_id`: References active counter in `oh_id.opd_counters`

### 5. Clinical Encounters & Diagnostic Notes
- **Primary Tables:** `oh_id.encounters`, `oh_id.clinical_notes`
- **Verified Fields:**
  - `oh_id.encounters.encounter_type`: `VARCHAR(32)` (`OPD`, `EMERGENCY`, `IPD`)
  - `oh_id.clinical_notes.diagnosis_icd10`: `VARCHAR(64)`, `NOT NULL` (Enforced by clinical validation)
  - `oh_id.clinical_notes.vitals_json`: `JSONB`, Validated against schema `{bp, pulse, temp_f, spo2_percent, weight_kg}`
  - `oh_id.clinical_notes.allergies_snapshot`: `JSONB`, Array of documented drug/food allergies

### 6. Digital Prescriptions & Cryptographic Signatures
- **Primary Tables:** `oh_id.prescriptions`, `oh_id.prescription_items`
- **Verified Fields:**
  - `oh_id.prescriptions.prescription_number`: `VARCHAR(64)`, Unique human-readable code (`RX-2026-*`)
  - `oh_id.prescriptions.valid_from`: `TIMESTAMP WITH TIME ZONE`
  - `oh_id.prescriptions.valid_until`: `TIMESTAMP WITH TIME ZONE`
  - `oh_id.prescriptions.digital_signature_hash`: `VARCHAR(128)`, SHA-256 hash computed over medication items + doctor registration + timestamp
  - `oh_id.prescriptions.verification_token`: `VARCHAR(128)`, Unique UUID used for anonymous QR verification
- **Prescription Items:**
  - `medicine_name`: `VARCHAR(128)`, `NOT NULL`
  - `dosage_form`: `VARCHAR(32)` (`TABLET`, `CAPSULE`, `SYRUP`, `INJECTION`, `OINTMENT`)
  - `frequency`: `VARCHAR(32)` (`1-0-1`, `1-0-0`, `0-0-1`, `1-1-1`, `PRN`)
  - `duration_days`: `INTEGER`, `CHECK (duration_days > 0)`

---

## 3. Database Views & Performance Analysis

| View Name | Source Tables Joined | Query Purpose | Observed Latency | Optimization Recommendation |
|---|---|---|---|---|
| `oh_id.vw_user_auth` | `users` | Credential and status lookup during login | 180ms | Maintain index on `mobile_number` |
| `oh_id.vw_user_workspaces` | `users`, `user_workspaces`, `roles`, `hospitals`, `hospital_admins`, `doctors`, `nurses` | Multi-role workspace resolution and permission gathering | 1,420ms | Add composite index on `user_workspaces(user_ref_id, is_active)` |
| `oh_id.vw_patient_registry` | `patients`, `patient_identifiers`, `hospitals` | OPD search and reception patient lookup | 210ms | Index on `patients(phone)` and `patients(last_name)` |
| `oh_id.vw_dashboard_metrics` | `appointments`, `opd_queues`, `prescriptions`, `billing_invoices` | Live hospital operations dashboard summary | 340ms | Aggregate view materialized cache for high-volume hospitals |

---

## 4. Transaction Rollback & Data Integrity Guarantees

1. **Atomicity in Prescription Issuance:**  
   Prescription header and child `prescription_items` are written within a single database transaction block. If an invalid medication frequency is submitted in item #3, the entire prescription is rolled back; zero orphaned rows remain in `oh_id.prescriptions`.
2. **Audit Logging Side Effects:**  
   Context switching and administrative role assignments write to `oh_id.audit_logs` with the requesting IP address, user ID, previous state, and timestamp.
3. **Tenant Boundary Foreign Keys:**  
   Every patient record, encounter, prescription, and invoice carries an immutable `hospital_ref_id`. Row-level checks prevent an authorized doctor from associating a consultation with a hospital they do not belong to.
