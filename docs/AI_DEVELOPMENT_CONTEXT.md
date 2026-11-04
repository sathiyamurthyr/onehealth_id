# OH-ID — Enterprise AI Development Context & Platform Memory

**Project:** OneHealth ID (OH-ID) Enterprise Healthcare Operating System  
**Organization:** Sathus Technology Private Limited  
**Target URL:** [https://ohid.online](https://ohid.online)  
**Methodology:** Superpowers (Engineering Discipline) | Hallmark (Healthcare UI/UX) | Claude-Mem (Context Continuity)  
**Last Updated:** November 1, 2026  

---

## 1. System Architecture & Tech Stack

```
                          ┌───────────────────────────┐
                          │   Nginx Reverse Proxy     │
                          │   (TLS 1.3, HTTP/2, HSTS)  │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
    ┌──────────────────────────┐                  ┌──────────────────────────┐
    │   Next.js 14 Frontend    │                  │    FastAPI Backend       │
    │   Node 20 / TypeScript   │                  │    Python 3.13           │
    │   Port 3040 / Docker     │                  │    Port 8050 (Live 8008) │
    └──────────────────────────┘                  └─────────────┬────────────┘
                 │                                              │
                 │                                ┌─────────────┴────────────┐
                 ▼                                ▼                          ▼
    ┌──────────────────────────┐     ┌───────────────────────┐  ┌───────────────────────┐
    │  Expo React Native App   │     │ PostgreSQL (Supabase) │  │ Encrypted File Store  │
    │  Mobile & PWA Hybrid     │     │ Schema: oh_id         │  │ Local / Object Store  │
    │  Native Crypto (ECDH)    │     │ Stored Procs & Views  │  │ AES-256 GCM Rest      │
    └──────────────────────────┘     └───────────────────────┘  └───────────────────────┘
```

### Core Technologies
- **Backend**: Python 3.13, FastAPI, Pydantic v2, PyJWT, Cryptography, psycopg2. Powered strictly by database views and stored procedures (`sp_views_repository.py`) to prevent raw SQL exposure.
- **Frontend Web**: Next.js 14.2 (App Router), React 18, Tailwind CSS, Lucide Icons, Playwright E2E.
- **Mobile Application**: Expo SDK 58, React Native 0.88, React 19, TypeScript 5.8, Expo Router, Lucide React Native, Noble Cryptography (Curve25519, ChaCha20, AES-GCM).
- **Database**: PostgreSQL 15.8 (Supabase Cloud), Multi-tenant schema `oh_id` with strict tenant isolation by `hospital_id` and `tenant_id`.
- **Security & Crypto**: Application-layer envelope encryption (`PayloadEncryptionMiddleware` + mobile ECDH client handshake), hardware Keystore / SecureStore tokens, PBKDF2/bcrypt 12-round password hashing, IDOR prevention, and role-based access control (RBAC).

---

## 2. Completed Implementation & Baseline Status

### Pilot Baseline (Kedar Hospital Pilot - `hosp-kedar`)
- **Module 1: Identity & Multi-Role Workspaces**: Mobile-only authentication, 10-digit mobile identifier, bcrypt password verification, dynamic workspace resolution (`/me/workspace`), multi-role modal.
- **Module 2: Patient Registration & OneHealth ID**: Citizen walk-in and self-service onboarding, duplicate prevention via phone + DOB, auto-generation of unique `OHID-IND-YYYY-XXXXX` identifier.
- **Module 3: OPD Reception & Queues**: Live OPD counters, queue state machines (`SCHEDULED` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `COMPLETED`), physical room assignments, sequential token generation (`OPD-01`, `Token #6`).
- **Module 4: Doctor Consultation Workspace**: Patient history, ICD-10 clinical diagnosis, allergies, vital signs capture, clinical consultation notes, and encounter finalization.
- **Module 5: Digital Prescriptions & Rx Templates**: Digital medication scheduling, frequency tokens (`1-0-1`), duration, clinical advice, SHA-256 digital signing with doctor PIN, PDF generation, public cryptographic QR verification (`/verify/prescription/{token}`).
- **Module 6: Diagnostic & Lab Reports**: Investigation ordering, specimen tracking, pathology approval workflow, structured clinical report viewer.
- **Module 7: Hospital Administration & Staff Roster**: Staff onboarding, role assignment, OPD counter mapping, department configurations, and operational audit reports.

### Mobile & UX Recent Milestones (Completed & Verified)
1. **Medical Document Upload Pipeline**:
   - Permission scoping fix: Replaced broad hospital management checks with precise `patient.read` / `patient.create` self-ownership permissions.
   - Comprehensive validation: MIME validation, magic byte checking, client-side preview, progress tracking (0% $\rightarrow$ 100%), and meaningful error toasts.
2. **Patient Appointment Booking Flow**:
   - 7-step booking modal: Select Patient (Myself / Family) $\rightarrow$ Find Hospital $\rightarrow$ Specialty $\rightarrow$ Doctor $\rightarrow$ Date & Time $\rightarrow$ Review $\rightarrow$ Confirm.
   - Duty Doctor fallback: Seamless recommendation of on-duty doctors when specific specialists have exhausted slots.
3. **Global Mobile UI Standardization (Hallmark Target)**:
   - Logo-Only Header: Approved OneHealth ID cross icon only, distinct page titles, persistent status/right actions.
   - Persistent 5-tab Bottom Navigation: Home, Health, Appointments, Documents, Profile.
4. **Premium API Loading & Skeleton Screens**:
   - 10-stage skeleton design: Launch splash, dashboard cards, appointments skeleton list, prescription cards, and blocking request overlays.
5. **OH-ID 8K-Style Appointment Management Flow (8 Screens)**:
   - Screen 1: Appointments List with View Details & 3-dots action popup menu (`Edit`, `Reschedule`, `Change Doctor`, `Cancel`).
   - Screen 2: Appointment Details with Token #, Room, 6-action quick grid, and collapsible instructions accordion.
   - Screen 3: Edit Appointment details (Reason, Department, Doctor, Date, Time).
   - Screen 4: Reschedule Appointment with November 2026 calendar and slot chips.
   - Screen 5: Change Doctor with slot counts and radio selection.
   - Screen 6: Cancel Appointment with illustration, summary, policy, and reason dropdown.
   - Screen 7: Success confirmation with reference ID (`OHID-APT-000867-R1`).
   - Screen 8: Appointment Management Overview with 9 verified feature cards.
6. **Consultation Report & Prescription Viewers**:
   - Multi-tab clinical viewers with digital signing verification, drug schedules, dosage metrics, and PDF exports.

---

## 3. Active Sprint & Epic Focus

- **Current Epic**: Enterprise Hardening, Cross-Hospital Interoperability & Mobile Clinical Quality.
- **Active Sprint**: Sprint 14 — Patient Self-Service Resilience, Clinical Workflow Polishing & End-to-End Regression Shielding.

### Outstanding Tasks & Enhancements Under Evaluation
1. **Web App Parity for 8-Screen Appointment Management**:
   - Align Next.js web patient portal (`frontend/app/patient/appointments`) with the newly verified 8-screen mobile experience.
2. **Family Member Consultation Permissions**:
   - Enforce granular granular proxy-booking permissions when booking on behalf of elderly dependents or minors.
3. **Offline Queue Sync in Mobile**:
   - Graceful offline token caching when clinic Wi-Fi drops in basement OPD areas.
4. **Automated End-to-End Regression Suite Consolidation**:
   - Unify Playwright test harnesses across Desktop, Tablet, and Mobile viewport configurations.

---

## 4. Key Architectural & Technical Decisions

1. **Database Views and Stored Procedures**:
   - Direct table modifications from API routes are forbidden. All data access runs through schema `oh_id` stored functions and views managed via `sp_views_repository.py`.
2. **Payload Encryption Strategy**:
   - Sensitive clinical data in transit utilizes client-side ECDH (Curve25519) session establishment with ephemeral AES-256-GCM symmetric keys.
3. **IDOR & Multi-Tenant Isolation**:
   - Patients may only access records where `patient_id == effective_patient_id` or where active family proxy consent is proven.
   - Hospital staff may only access records within their `hospital_id` tenancy unless cross-facility consent token is presented.
4. **No Synthetic Shortcuts**:
   - Production and pilot tests must exercise actual authorization endpoints, token lifecycles, and database constraints.

---

## 5. Verified Test Suite Inventory

| Test Suite Category | Framework | Coverage / Count | Status |
|---|---|---|---|
| **Mobile Component & Flow Tests** | Jest + React Native Testing Library | 26 Suites (210 tests) | **PASS (100%)** |
| **Mobile 8K Appointment Management** | Jest (`appointment_management_8k.test.tsx`) | 8 Screens | **PASS (8/8)** |
| **Mobile Booking Flow** | Jest (`appointment_booking_flow.test.tsx`) | 6 Tests | **PASS (6/6)** |
| **Mobile TypeScript Compilation** | `tsc --noEmit` | Mobile codebase | **PASS (0 errors)** |
| **Backend Integration Tests** | Pytest (`backend/tests/`) | Core Identity & Operations | **PASS (20/20)** |
| **Playwright E2E (Mobile Viewport)** | Playwright (`appointment_management_8k_verification.spec.ts`) | 8 Screens Captured | **PASS** |

---

## 6. Known Gaps & Action Items

- **Multi-Role Login Friction (`DF-AUTH-01`)**: When users possess multiple staff/admin roles, ensure the workspace modal defaults gracefully to their primary active persona without manual stall.
- **Duty Doctor Visibility**: Ensure duty doctor rosters display estimated wait times based on live OPD queue depth.
- **Web Design Token Alignment**: Ensure Tailwind design tokens in `frontend/design-system` mirror the mobile color tokens (`#155EEF` primary blue, `#102A56` navy, `#E4EAF2` border).

