# OH-ID — HEALTHCARE FEATURE GAP ANALYSIS
**Platform:** OneHealth ID (OH-ID) Enterprise Healthcare Ecosystem  
**Author:** Principal Healthcare Software Architect, Product Reverse Engineering Specialist & Senior Full-Stack Engineer  
**Organisation:** Sathus Technology Private Limited  
**Audit Date:** November 2026  
**Status:** COMPLETED & ACTIONABLE  

---

## 1. Classification Methodology

Every functional requirement across the five major healthcare workflows has been categorized into one of five states:
- **ALREADY IMPLEMENTED:** Fully working in the codebase with backend models, endpoints, and frontend/mobile UI.
- **PARTIALLY IMPLEMENTED:** Backend or UI exists, but specific capabilities, validation rules, or cross-client parity are missing.
- **MISSING:** Essential capability required by the reference benchmark that is not yet implemented.
- **HEALTHCARE-SPECIFIC RESTRICTION:** Workflows where generic patterns must be adapted to comply with clinical safety, patient privacy, or medical record immutability.
- **REUSABLE COMPONENT / API:** Existing assets that should be leveraged without duplicate implementations.

---

## 2. Module 1: QR Check-in and OPD Queue Management

| Capability | Status | Existing Asset / Code Location | Gap / Required Enhancement |
| :--- | :--- | :--- | :--- |
| Dynamic Patient OneHealth ID QR Card | **ALREADY IMPLEMENTED** | `mobile/app/(patient)/index.tsx`, `/api/v1/oh-id/qr/generate` | Generates zero-knowledge QR token reference without clinical disclosure. |
| Server-side QR Verification | **ALREADY IMPLEMENTED** | `backend/app/routers/ohid.py` (`verify_ohid_qr_token`), `sp_views_repository.py` | Authenticated lookup verifies token against DB and logs audit event. |
| Appointment-linked Check-in | **ALREADY IMPLEMENTED** | `sp_repository.check_in_patient_visit`, `backend/app/routers/appointments.py` | Updates appointment to `CHECKED_IN`, creates Visit, issues token. |
| Walk-in QR Check-in (No prior appointment) | **PARTIALLY IMPLEMENTED** | `backend/app/routers/appointments.py` (`create_walk_in_appointment`) | Reception UI must support 1-click "Scan QR -> Select Dept/Doctor -> Issue Token" flow without requiring prior manual booking. |
| Patient-facing Live Queue Position & Wait Status | **MISSING** | Needs widget in `frontend/app/patient/` and `mobile/app/(patient)/` | Live card displaying Token Number, Currently Serving Token, Patients Ahead, and Estimated Wait Time. |
| Duplicate Check-in Prevention | **ALREADY IMPLEMENTED** | `sp_views_repository.py` | Prevents multiple tokens for same appointment on same day. |
| Doctor Queue Management Actions | **ALREADY IMPLEMENTED** | `backend/app/routers/queue.py`, `frontend/app/doctor/queue/page.tsx` | Doctor controls: `CALL_NEXT`, `START_CONSULT`, `COMPLETE`, `HOLD`, `SKIP`, `RECALL`, `TRANSFER`. |
| Department & Counter Token Configuration | **ALREADY IMPLEMENTED** | `oh_id.opd_counters`, `sp_repository.check_in_patient_visit` | Automatic token prefixing (e.g. `CARD-001`, `GEN-002`) and daily sequence reset. |

---

## 3. Module 2: Doctor Clinical Workspace

| Capability | Status | Existing Asset / Code Location | Gap / Required Enhancement |
| :--- | :--- | :--- | :--- |
| 10-Section Unified Clinical Encounter | **ALREADY IMPLEMENTED** | `frontend/app/doctor/consultation/[id]/page.tsx`, `mobile/app/(doctor)/consultation.tsx` | History, Vitals, Examination, Diagnosis, RxPad, Referral, Follow-up, Attachments, Preview, Finalize. |
| Objective Vitals Entry with Auto-BMI | **ALREADY IMPLEMENTED** | `frontend/app/doctor/consultation/[id]/page.tsx` (lines 750-840) | Calculates BMI dynamically from height & weight; tracks BP, HR, Temp, SpO2, RR. |
| ICD-10 Search & Diagnostic Selection | **ALREADY IMPLEMENTED** | `backend/app/routers/clinical.py` (`search_icd10_codes`), Doctor UI | Fast lookup across primary, secondary, and differential diagnoses. |
| Multi-Medication Digital RxPad | **ALREADY IMPLEMENTED** | `frontend/app/doctor/consultation/[id]/page.tsx`, `mobile/app/(doctor)/rxpad.tsx` | Medicine search, brand, strength, dose, route, frequency, duration, food relation, PRN instructions. |
| 4-Digit PIN Cryptographic Signing | **ALREADY IMPLEMENTED** | `backend/app/routers/prescriptions.py` (`sign_prescription_with_pin`) | SHA-256 / HMAC cryptographic signature hashes; freezes document. |
| Clinical Decision Support (CDS) Drug-Allergy Warning | **MISSING** | Needs evaluation engine in Doctor Workspace | Before adding medicine or signing Rx, check against patient's known allergies and warn doctor of potential contraindications. |
| Integrated Diagnostic / Laboratory Order Entry | **PARTIALLY IMPLEMENTED** | `oh_id.consultation_document_attachments` | Enable doctor to specify lab orders (e.g. CBC, HbA1c, LFT) directly within the encounter alongside medications. |
| Hospital Document Branding & 20 Templates | **ALREADY IMPLEMENTED** | `clinical_templates.py`, `TemplateSamplePreview.tsx`, `PrescriptionTemplateRenderer.tsx` | 20 layout templates, 11-color institutional palette, and logo placement/size automatically applied. |
| Document Finalization Immutability | **ALREADY IMPLEMENTED** | `oh_id.opd_consultations` (`branding_version`, `branding_snapshot`) | Once signed, historical consultations and prescriptions never mutate even if hospital colors change. |

---

## 4. Module 3: Patient Appointment Booking

| Capability | Status | Existing Asset / Code Location | Gap / Required Enhancement |
| :--- | :--- | :--- | :--- |
| Multi-Hospital & Doctor Search | **ALREADY IMPLEMENTED** | `frontend/app/patient/appointments/page.tsx`, `AppointmentBookingModal.tsx` | Filter by hospital, specialty, and doctor. |
| Real-time Slot Availability Calculation | **PARTIALLY IMPLEMENTED** | `backend/app/routers/appointments.py` | Add dedicated endpoint `/api/v1/appointments/available-slots` that generates morning/afternoon slots matching doctor's schedule minus booked appointments. |
| Double-Booking & Concurrency Protection | **PARTIALLY IMPLEMENTED** | `oh_id.appointments` | Add database constraint / transactional lock on `(doctor_id, appointment_date, slot)` for active statuses. |
| Self & Family Member Booking | **ALREADY IMPLEMENTED** | `AppointmentBookingModal.tsx`, `useFamily` context | Book for primary profile or registered family dependents. |
| Check-in QR Token on Booking Confirmation | **ALREADY IMPLEMENTED** | `AppointmentQRModal.tsx`, `oh_id.appointments.checkin_token` | Patient receives verifiable QR token for check-in kiosk immediately upon booking. |
| Reschedule & Cancel with Mandatory Reason | **ALREADY IMPLEMENTED** | `RescheduleAppointmentModal.tsx`, `CancelAppointmentModal.tsx` | Preserves audit history, records responsible user and timestamp. |
| Mobile Booking Wizard Parity | **PARTIALLY IMPLEMENTED** | `mobile/app/(patient)/appointments.tsx` | Enhance mobile booking modal with identical multi-step hospital, department, doctor, and slot selection. |

---

## 5. Module 4: Patient Health Vault

| Capability | Status | Existing Asset / Code Location | Gap / Required Enhancement |
| :--- | :--- | :--- | :--- |
| Document Categories (Rx, Lab, Scans, Reports) | **ALREADY IMPLEMENTED** | `oh_id.medical_documents.category`, `frontend/app/patient/documents/page.tsx` | Standardized healthcare categorization. |
| In-App Document Preview & Metadata | **ALREADY IMPLEMENTED** | `frontend/app/patient/documents/page.tsx`, `mobile/app/(patient)/timeline.tsx` | Visual cards, download links, metadata tags, and dates. |
| Storage Quota Tracking & Enforcement | **MISSING** | Needs calculation in `backend/app/routers/patients.py` | Per-patient quota (e.g. 50MB free quota) with storage usage gauge and rejection when quota is exceeded. |
| File Signature (Magic Byte) & MIME Validation | **PARTIALLY IMPLEMENTED** | `backend/app/routers/patients.py` (checks file extension) | Add server-side binary magic-byte inspection (`%PDF`, `\xFF\xD8\xFF`, `\x89PNG`) to reject disguised malicious files. |
| Granular Time-Bound Consent Sharing | **PARTIALLY IMPLEMENTED** | `backend/app/routers/data_sharing.py`, `oh_id.medical_document_shares` | Enable patient to choose expiration (24h, 7d, 30d) and revoke active share links. |
| Access History Audit Log | **ALREADY IMPLEMENTED** | `oh_id.medical_document_audit_logs`, `frontend/app/patient/access-history/page.tsx` | Logs every document view event with actor, timestamp, and purpose. |

---

## 6. Module 5: Hospital Administration Dashboard

| Capability | Status | Existing Asset / Code Location | Gap / Required Enhancement |
| :--- | :--- | :--- | :--- |
| Real-time Facility Command Center | **ALREADY IMPLEMENTED** | `frontend/app/hospital/page.tsx`, `mobile/app/(admin)/index.tsx` | Shows today's waiting, in-consultation, completed, active doctors, and active counters. |
| Dynamic DB-Grounded Operational KPIs | **PARTIALLY IMPLEMENTED** | `backend/app/routers/operational_analytics.py` | Ensure all metrics, hourly flows, and department breakdowns are computed from actual DB records with zero fabricated data. |
| Institutional Branding & Document Customization | **ALREADY IMPLEMENTED** | `frontend/app/hospital/settings/page.tsx` (Section 5) | 11 colors, logo upload, placement, size, dual live preview, WCAG contrast scoring, and reset to OH-ID default. |
| Doctor Schedule & Shift Management | **PARTIALLY IMPLEMENTED** | `backend/app/routers/doctors.py`, `oh_id.doctor_schedules` | Provide administrative UI to edit doctor working days, OPD shifts, and slot duration intervals. |
| Department & Staff RBAC Management | **ALREADY IMPLEMENTED** | `frontend/app/hospital/staff/page.tsx`, `frontend/app/hospital/departments/page.tsx` | Clinical roster, department assignment, and permission boundaries. |
| Multi-Tenant Isolation Enforcement | **ALREADY IMPLEMENTED** | `validate_hospital_tenant_scope` in backend routers | Server-side validation blocks any cross-tenant data access with HTTP 403 Forbidden. |

---

## 7. Healthcare Safety & Clinical Requirements

1. **Patient Data Protection:** QR payloads must contain ONLY zero-knowledge token references; no patient demographics or clinical findings embedded in QR.
2. **Clinical Decision Support (CDS):** Drug-allergy warnings must be non-intrusive yet impossible to silently dismiss; require doctor acknowledgement.
3. **Legal Immutability of Finalized Documents:** Once signed, consultation reports and digital prescriptions must be cryptographically hashed and snapshotted; subsequent hospital branding edits must not alter historical documents.
4. **Concurrency Safety in Appointments:** Slot reservation must use transactional locks to guarantee that no two patients can be scheduled for the same doctor at the same minute.
5. **Storage Quota & Data Integrity:** Health Vault uploads must verify true binary headers and enforce quotas without ever deleting historical medical documents.

