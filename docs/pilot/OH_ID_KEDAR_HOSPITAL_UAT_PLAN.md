# OH-ID — Kedar Hospital Pilot User Acceptance Testing (UAT) Plan

**Document ID:** OHID-UAT-PLAN-01  
**Target Facility:** Kedar Hospital, Chennai (`hosp-kedar`)  
**Pilot Lead:** Clinical Workflow Analyst & Principal QA Architect  
**Testing Methodology:** Synthetic Data Clinical Simulation  
**Date:** October 21, 2026  

---

## 1. UAT Objectives & Safety Rules

1. **Synthetic Data Mandate:** 100% of test records must use synthetic patient demographics, mock telephone numbers (`9840999001`–`9840999099`), and dummy addresses. Zero real patient records shall be processed.
2. **End-to-End Chain Validation:** Every test scenario must verify the full data chain:
   $$\text{UI Input} \longrightarrow \text{API Request} \longrightarrow \text{Validation} \longrightarrow \text{DB Transaction} \longrightarrow \text{Persisted Record} \longrightarrow \text{UI Refresh}$$
3. **Immutability of Finalized Clinical Records:** Prescriptions and lab reports, once cryptographically signed, must not be directly mutable; any amendment must trigger version incrementation.

---

## 2. Test Personas & Approved Test Credentials

| Persona ID | Clinical Role | User Account / Phone | Target Workspace | Purpose |
|---|---|---|---|---|
| **PER-01** | Chief Medical Officer / Doctor | `9176669426` / `Asdfg!23` | Doctor Workspace (`/doctor`) | Clinical consultation, encounter diagnosis, prescription signing |
| **PER-02** | Hospital Administrator | `9176669426` / `Asdfg!23` | Hospital Admin (`/hospital`) | OPD counter management, doctor schedules, staff directory |
| **PER-03** | Super Administrator | `9840000000` / `admin123` | Super Admin (`/super-admin`)| Platform health, hospital tenant configuration, audit logs |
| **PER-04** | Receptionist | `frontdesk.cd3e8e` (or synthetic) | Frontdesk Queue (`/hospital/queue`)| Walk-in registration, appointment booking, OPD check-in |
| **PER-05** | Registered Patient | Synthetic (`p-kedar-001`) | Patient Portal (`/patient`) | Personal prescription viewing, QR verification |

---

## 3. Detailed UAT Clinical Workflow Scenarios

### SCN-01: Multi-Role Authentication & Workspace Context Switching
- **Goal:** Verify that a user with both `DOCTOR` and `HOSPITAL_ADMIN` roles can select their intended workspace, receive the correct scoped JWT, and switch contexts seamlessly without menu leakage.
- **Steps:**
  1. Open `https://ohid.online/login`.
  2. Enter `9176669426` and `Asdfg!23`. Submit.
  3. Verify workspace selection modal renders with options for Kedar Hospital.
  4. Select `Doctor (Kedar Hospital)`. Click Continue.
  5. Verify redirection to `https://ohid.online/doctor`.
  6. Verify navigation contains clinical items (Queue, Consultations, Prescriptions) and excludes administrative menus (Billing Setup, Global Entitlements).
  7. Switch context to `Hospital Admin`. Verify redirection to `https://ohid.online/hospital` with administrative dashboard.

### SCN-02: Patient Registration & Duplicate Detection
- **Goal:** Register a new walk-in patient and verify duplicate detection on identical phone + DOB.
- **Steps:**
  1. Navigate to `/hospital/patients/register`.
  2. Input: Name `Ramesh Krishnan`, DOB `1985-04-12`, Gender `Male`, Phone `9840999011`, Address `12 Cross St, T Nagar, Chennai`.
  3. Submit form.
  4. Verify API response `200 OK` with generated OH-ID identifier (`OH-2026-*`).
  5. Refresh page, search for `9840999011`, verify patient appears in search results.
  6. Attempt registering identical patient with phone `9840999011` and DOB `1985-04-12`.
  7. Verify system raises duplicate conflict alert (`HTTP 409 Conflict`) and prevents duplicate record insertion.

### SCN-03: Appointment Booking & Slot Collision Prevention
- **Goal:** Book a consultation slot and prevent double-booking for the same doctor at the same time.
- **Steps:**
  1. Navigate to `/hospital/appointments`.
  2. Select Doctor `Dr. K. Senthil Nathan`, Date `Tomorrow`, Time `10:00 AM`.
  3. Book appointment for patient `Ramesh Krishnan`.
  4. Verify status transitions to `BOOKED` / `CONFIRMED`.
  5. Attempt booking the exact same doctor and slot for a second patient.
  6. Verify system returns `HTTP 409 Conflict` (`Doctor slot is already booked`).

### SCN-04: OPD Reception Check-In & Queue Token Generation
- **Goal:** Check in the booked patient, assign a service counter, and issue a sequential daily token.
- **Steps:**
  1. Navigate to `/hospital/queue`.
  2. Locate patient `Ramesh Krishnan` under today's appointments.
  3. Click `Check In`. Select OPD Counter `Counter 1 (General OPD)`.
  4. Verify system issues sequential token `A-015`.
  5. Verify token status in database `oh_id.opd_queues` is `WAITING`.

### SCN-05: Doctor Queue Call-Next & Clinical Encounter
- **Goal:** Doctor calls the patient from the queue, opens the encounter, and begins consultation.
- **Steps:**
  1. Log in as Doctor (`PER-01`).
  2. Open `/doctor/queue`.
  3. Click `Call Next Patient`.
  4. Verify Token `A-015` transitions to `IN_CONSULTATION`.
  5. Verify clinical consultation workspace opens with patient demographics and previous history.

### SCN-06: Clinical Notes Recording with Mandatory ICD-10 Coding
- **Goal:** Record chief complaints, vitals, and diagnosis. Verify ICD-10 requirement.
- **Steps:**
  1. Open clinical notes form.
  2. Input Chief Complaint: `Fever, dry cough, body pain for 3 days`.
  3. Input Vitals: BP `120/80`, Pulse `78 bpm`, Temp `100.2 °F`, SpO2 `98%`.
  4. Attempt saving without diagnosis $\rightarrow$ Verify validation error (`Diagnosis is mandatory`).
  5. Select ICD-10 Diagnosis: `J06.9 (Acute upper respiratory infection, unspecified)`.
  6. Click `Save Clinical Encounter`.
  7. Refresh page $\rightarrow$ Verify notes and vitals persist accurately.

### SCN-07: Digital Prescription Drafting, Scheduling & SHA-256 Signing
- **Goal:** Prescribe medications with schedule matrix, validate dosage/duration, and sign cryptographically.
- **Steps:**
  1. Navigate to Prescription Builder.
  2. Add Medication 1: `Paracetamol 650 mg`, Frequency `1-0-1 (After Food)`, Duration `5 days`.
  3. Add Medication 2: `Azithromycin 500 mg`, Frequency `1-0-0 (Before Food)`, Duration `3 days`.
  4. Click `Digitally Sign & Issue Prescription`.
  5. Enter Doctor Verification PIN `1234`.
  6. Verify status updates to `ACTIVE`.
  7. Verify `digital_signature_hash` (SHA-256) is populated in `oh_id.prescriptions`.

### SCN-08: Prescription PDF Generation & Public QR Code Tamper Verification
- **Goal:** Generate authoritative PDF and verify anonymous QR code verification.
- **Steps:**
  1. Click `Print / View Prescription PDF`.
  2. Verify browser receives `application/pdf` binary stream with hospital branding, doctor registration number, and medications table.
  3. Extract verification URL from QR token (`/verify/prescription/{token}`).
  4. In an unauthenticated incognito session, load verification URL.
  5. Verify page renders `Cryptographically Verified` status, hospital name, and doctor registration authority.
  6. Verify clinical notes, vitals, and diagnosis are **not displayed** (Zero PII leakage).

### SCN-09: Laboratory Investigation Order & Result Recording
- **Goal:** Doctor orders diagnostic tests; lab enters results and publishes report.
- **Steps:**
  1. Doctor orders `Complete Blood Count (CBC)` and `Serum Creatinine`.
  2. Lab Technician loads order, enters numerical values (e.g. `Hemoglobin: 14.2 g/dL`).
  3. Pathologist approves and finalizes report.
  4. Verify report status is `FINALIZED` and appears in patient medical history.

### SCN-10: Patient Self-Service Portal & IDOR Protection
- **Goal:** Patient accesses own prescriptions and is blocked from reading other patients' records.
- **Steps:**
  1. Log in as Patient `Ramesh Krishnan`.
  2. Navigate to `/patient/prescriptions`. Verify only own prescriptions appear.
  3. Alter URL ID to another patient's prescription $\rightarrow$ Verify `HTTP 403 Forbidden`.

### SCN-11: Multi-Tenant Hospital Boundary Enforcement
- **Goal:** Confirm that staff at Kedar Hospital cannot view or modify data from Apollo Hospital.
- **Steps:**
  1. Log in as Kedar Hospital Staff.
  2. Issue API request with `hospital_id=hosp-001` (Apollo Hospital).
  3. Verify system raises `HTTP 403 Forbidden` (`Cross-hospital tenant boundary violation`).
