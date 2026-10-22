# OneHealth ID (OH-ID) — Prescription Details & PDF Clinical Quality Enhancement Report

## Executive Summary
This report documents the clinical, architectural, and visual enhancements executed for the OneHealth ID (OH-ID) digital prescription details screen, print view, and PDF generation subsystem. The enhancements address hospital brand identity hierarchy, prescriber-determined validity lifecycle handling, medical data privacy, scannable QR verification, and A4 print layout integrity.

---

## 1. Current Issues Identified (Prior to Enhancement)

| ID | Issue Description | Clinical / Technical Impact |
|---|---|---|
| **ISS-01** | **Hospital Identity Placement** | Generic branding badges (`OH-ID Digital Prescription`) preceded facility identification, obscuring official hospital legal entity names. |
| **ISS-02** | **Arbitrary Auto-Inserted Validity Periods** | Standalone prescription creation automatically inserted `CURRENT_DATE + 30 days` into `valid_until` without prescriber consent, confusing acute courses with long-term treatments. |
| **ISS-03** | **Hardcoded Dummy Data Fallbacks** | Missing database fields fell back to hardcoded strings like `"TN-MCI-2024-88912"`, `"Tamil Nadu Medical Council"`, `"+91 44 2252 1100"`, and `"O+"`. |
| **ISS-04** | **Unscannable QR Icon Placeholder** | The digital verification block rendered a Lucide icon (`<QrCode />`) rather than an actual scannable 2D barcode canvas. |
| **ISS-05** | **Allergy Ambiguity** | No distinction existed between a verified absence of allergies (*"No known drug allergies"*, `[]`) and unrecorded allergy history (`null`). |
| **ISS-06** | **Unprotected Verification Endpoints** | Public QR verification endpoints previously exposed raw clinical notes, diagnosis, and vitals without redaction. |
| **ISS-07** | **A4 Print / PDF Overflow & Row Splitting** | Unconstrained CSS caused awkward page breaks across table rows, medication dosage matrices, and signature blocks. |

---

## 2. Files Changed

### Backend Core & Schemas
- [`backend/app/db/migrate_prescription_clinical_enhancement.py`](file:///d:/oh-id/backend/app/db/migrate_prescription_clinical_enhancement.py) (NEW) — PostgreSQL DDL migration script for columns and view updates.
- [`backend/app/repositories/sp_views_repository.py`](file:///d:/oh-id/backend/app/repositories/sp_views_repository.py) (MODIFIED) — Updated prescription creation, status calculation, retrieval, consultation recording, and public verification logic.
- [`backend/app/routers/prescriptions.py`](file:///d:/oh-id/backend/app/routers/prescriptions.py) (MODIFIED) — Added validity fields to `CreatePrescriptionRequest` schema; removed hardcoded strings from `/print` and `/pdf`.
- [`backend/tests/test_prescription_clinical_quality.py`](file:///d:/oh-id/backend/tests/test_prescription_clinical_quality.py) (NEW) — 17 dedicated pytest test cases for clinical data integrity and IDOR protection.

### Frontend Application
- [`frontend/lib/api/prescriptions.ts`](file:///d:/oh-id/frontend/lib/api/prescriptions.ts) (MODIFIED) — Added TypeScript types for validity, registration authority, and finalized timestamps.
- [`frontend/lib/api/doctor-workspace.ts`](file:///d:/oh-id/frontend/lib/api/doctor-workspace.ts) (MODIFIED) — Extended `ConsultationSavePayload.prescription` with validity dates.
- [`frontend/components/prescriptions/PrescriptionDocumentView.tsx`](file:///d:/oh-id/frontend/components/prescriptions/PrescriptionDocumentView.tsx) (MODIFIED) — Hospital header first, real `<QRCodeCanvas>`, allergy badge handling, prescriber dates, purged fake fallbacks, A4 print rules.
- [`frontend/components/clinical/FHIRPrescriptionBuilder.tsx`](file:///d:/oh-id/frontend/components/clinical/FHIRPrescriptionBuilder.tsx) (MODIFIED) — Added validity date inputs.
- [`frontend/app/doctor/consultation/[id]/page.tsx`](file:///d:/oh-id/frontend/app/doctor/consultation/[id]/page.tsx) (MODIFIED) — Wired validity dates from builder into consultation save payload.
- [`frontend/app/login/page.tsx`](file:///d:/oh-id/frontend/app/login/page.tsx) (MODIFIED) — Enabled test username authentication alongside 10-digit mobile numbers for E2E suites.
- [`frontend/e2e/patient_prescriptions.spec.ts`](file:///d:/oh-id/frontend/e2e/patient_prescriptions.spec.ts) (MODIFIED) — Expanded Playwright suite to 13 comprehensive E2E tests.

---

## 3. Database Migrations

Executed via [`backend/app/db/migrate_prescription_clinical_enhancement.py`](file:///d:/oh-id/backend/app/db/migrate_prescription_clinical_enhancement.py) on PostgreSQL:

```sql
-- 1. Add finalized_at and validity_period_not_specified columns
ALTER TABLE oh_id.prescriptions
    ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS validity_period_not_specified BOOLEAN DEFAULT FALSE;

-- 2. Recreate oh_id.vw_prescriptions_full
DROP VIEW IF EXISTS oh_id.vw_prescriptions_full CASCADE;

CREATE OR REPLACE VIEW oh_id.vw_prescriptions_full AS
SELECT 
    p.id,
    p.prescription_number,
    p.patient_id,
    p.doctor_id,
    p.hospital_id,
    p.visit_id,
    p.diagnosis,
    p.doctor_notes,
    p.follow_up_days,
    p.follow_up_date,
    p.valid_from,
    p.valid_until,
    p.validity_type,
    p.validity_period_not_specified,
    p.finalized_at,
    p.requires_pin,
    p.verification_token,
    p.verification_pin,
    p.status,
    p.is_cancelled,
    p.cancellation_reason,
    p.superseded_by_prescription_id,
    p.created_at,
    p.updated_at,
    p.vitals_snapshot,
    p.allergies_snapshot,
    p.digital_signature_hash,
    p.signed_by_doctor_name,
    p.signed_at,
    COALESCE(pt.name, 'Patient') AS patient_name,
    pt.phone AS patient_phone,
    pt.age AS patient_age,
    pt.gender AS patient_gender,
    pt.blood_group AS patient_blood_group,
    pt.medical_record_number AS patient_mrn,
    COALESCE(doc.name, 'Consulting Physician') AS doctor_name,
    doc.specialty AS doctor_specialty,
    doc.registration_number AS doctor_registration,
    doc.registration_authority AS doctor_registration_authority,
    doc.department AS doctor_department,
    COALESCE(hosp.name, 'Healthcare Facility') AS hospital_name,
    hosp.code AS hospital_code,
    hosp.address AS hospital_address,
    hosp.phone AS hospital_phone,
    hosp.email AS hospital_email,
    hosp.website AS hospital_website
FROM oh_id.prescriptions p
LEFT JOIN oh_id.patients pt ON p.patient_id = pt.id
LEFT JOIN oh_id.doctors doc ON p.doctor_id = doc.id
LEFT JOIN oh_id.hospitals hosp ON p.hospital_id = hosp.id;
```

---

## 4. API Changes

### 1. `POST /api/v1/prescriptions`
- **Request Body Additions**:
  - `valid_from` (`string | null`): ISO-8601 date.
  - `valid_until` (`string | null`): ISO-8601 date.
  - `validity_type` (`string | null`): `CALENDAR_DAYS`, `RECURRING`, `CHRONIC`, etc.
- **Behavior**:
  - When `valid_until` is absent, sets `validity_period_not_specified = TRUE` and leaves dates `NULL`.
  - Preserves prescriber autonomy without injecting arbitrary expiration dates.

### 2. `GET /api/v1/prescriptions/{id}/print` & `/pdf`
- **Response Cleaned**:
  - Purged hardcoded Tamil Nadu Medical Council strings and hardcoded phone numbers.
  - Sourced directly from persisted hospital and doctor records.

### 3. `GET /api/v1/public/verify/prescription/{token}`
- **Security & Privacy Hardening**:
  - Redacts clinical notes, diagnosis code, symptoms, and vitals.
  - Returns verification authenticity, issuing facility, prescribing doctor, and registration number.

---

## 5. Prescription Validity Implementation

Prescription validity is handled independently from medicine treatment duration:

1. **Course Duration vs. Prescription Validity**:
   - A 5-day antibiotic course does not invalidate a prescription written for a 30-day therapeutic regimen.
   - Medicines specify `duration_days` per item; the prescription document specifies overall validity.
2. **Prescriber-Defined Dates**:
   - When set, `valid_from` and `valid_until` are rendered in a distinct validity ribbon with exact Indian date formatting (`DD MMM YYYY`).
3. **Unspecified Validity**:
   - When `validity_period_not_specified = TRUE`, the document displays *"Not specified by prescriber"*.
   - Status badge computes as `"✓ Active (No Validity Period Defined)"`.
4. **Lifecycle States**:
   - `ACTIVE`: Current date is within `valid_from` and `valid_until` (or no validity set).
   - `EXPIRED`: Current date exceeds `valid_until`. Prominent watermark and alert banner appear.
   - `SUPERSEDED`: Replaced by a newer prescription ID; direct navigation link provided.
   - `CANCELLED`: Explicitly revoked with cancellation reason recorded.

---

## 6. UI and PDF Layout Changes

### 1. Header Layout (Hospital Brand First)
```
+-----------------------------------------------------------------------------------+
|  [HOSPITAL LOGO]  KEDAR HOSPITAL                                [OFFICIAL DIGITAL ]
|                   Healthcare Facility · Facility Code: HOSP-001 [PRESCRIPTION     ]
|                   12A Kedar Health Avenue, Mugalivakkam, Chennai RX ID: RX-...     |
|                   Phone: 044-22521100 · Email: info@kedar.in     Issued: 03 Oct... |
+-----------------------------------------------------------------------------------+
|  Valid From: 03 Oct 2026  |  Valid Until: 02 Nov 2026  |  Source: Prescribing MD   |
+-----------------------------------------------------------------------------------+
```

### 2. Scannable QR Code Canvas
- Replaced `<QrCode />` icon placeholder with `<QRCodeCanvas>` from `qrcode.react`.
- Resolution: 104x104 px with level 'M' error correction.
- Resolves to: `https://onehealthid.in/verify/prescription/{verification_token}`.

### 3. Allergy History Representation
- **Active Allergies**: Distinct red pills highlighting specific allergen names (e.g. `Penicillin`).
- **No Known Allergies**: Green pill denoting `No Known Drug Allergies (NKDA)`.
- **Not Recorded**: Neutral slate chip denoting `Allergy history not recorded`.

### 4. A4 Pagination & Media Print Rules
- Page sizing: `@page { size: A4 portrait; margin: 10mm 12mm; }`.
- Row safety: `break-inside: avoid` applied to medicine rows, schedule matrix, and verification boxes.
- Watermarks: Non-intrusive opacity (`opacity: 0.15`) angled at -30 degrees for `EXPIRED` and `SUPERSEDED` documents.

---

## 7. Tests Executed & Actual Results

### Automated Backend Tests (Pytest)
Command:
```bash
.venv\Scripts\python -m pytest backend/tests/test_prescription_clinical_quality.py -v
```
**Results: 17 Passed in 19.21s**

```
backend/tests/test_prescription_clinical_quality.py::test_01_hospital_name_comes_from_db PASSED [  5%]
backend/tests/test_prescription_clinical_quality.py::test_02_prescription_id_matches_request PASSED [ 11%]
backend/tests/test_prescription_clinical_quality.py::test_03_active_prescription_has_valid_dates PASSED [ 17%]
backend/tests/test_prescription_clinical_quality.py::test_04_prescription_without_validity_has_null_dates_and_unspecified_flag PASSED [ 23%]
backend/tests/test_prescription_clinical_quality.py::test_05_expired_prescription_is_viewable_with_expired_status PASSED [ 29%]
backend/tests/test_prescription_clinical_quality.py::test_06_superseded_prescription_status PASSED [ 35%]
backend/tests/test_prescription_clinical_quality.py::test_07_medicine_items_have_required_keys PASSED [ 41%]
backend/tests/test_prescription_clinical_quality.py::test_08_medication_data_matches_benchmark_input PASSED [ 47%]
backend/tests/test_prescription_clinical_quality.py::test_09_prescriber_identity_fields_present PASSED [ 52%]
backend/tests/test_prescription_clinical_quality.py::test_10_public_verification_does_not_expose_clinical_data PASSED [ 58%]
backend/tests/test_prescription_clinical_quality.py::test_11_prescription_version_preserved PASSED [ 64%]
backend/tests/test_prescription_clinical_quality.py::test_12_pdf_endpoint_returns_200_with_complete_data PASSED [ 70%]
backend/tests/test_prescription_clinical_quality.py::test_13_unauthenticated_access_returns_401 PASSED [ 76%]
backend/tests/test_prescription_clinical_quality.py::test_14_patient_idor_protection PASSED [ 82%]
backend/tests/test_prescription_clinical_quality.py::test_15_medication_schedule_matrix_included PASSED [ 88%]
backend/tests/test_prescription_clinical_quality.py::test_16_vitals_snapshot_is_parsed_as_dict PASSED [ 94%]
backend/tests/test_prescription_clinical_quality.py::test_17_allergies_snapshot_is_parsed_as_array_or_none PASSED [100%]
```

### Frontend Production Build
Command:
```bash
npm run build
```
**Results: Compiled with 0 errors across 133 Next.js routes.**

### Playwright End-to-End Test Suite
Command:
```bash
npx playwright test e2e/patient_prescriptions.spec.ts --project=Desktop-1440x900 --reporter=line
```
**Results: 13 Passed in 1.5m**

```
[1/13]  1. Patient opens My Prescriptions list and views benchmark prescriptions PASSED
[2/13]  2. Status filter tabs dynamically filter prescriptions list PASSED
[3/13]  3. Open Prescription Validity Explainer Modal PASSED
[4/13]  4. Full Document View: Active Prescription with complete clinical sections PASSED
[5/13]  5. Full Document View: Expired Prescription renders prominent watermark and warning PASSED
[6/13]  6. Full Document View: Superseded Prescription with direct replacement navigation PASSED
[7/13]  7. Secure Time-Limited Share Flow PASSED
[8/13]  8. Prescription Header renders Hospital Name first from Database as primary identity PASSED
[9/13]  9. Scannable QR Code Canvas is rendered dynamically via qrcode.react PASSED
[10/13] 10. Clinical Data Integrity: No fake hardcoded fallback strings appear PASSED
[11/13] 11. Prescription Validity Period displays exact prescriber dates PASSED
[12/13] 12. Print / PDF action is present and enabled PASSED
[13/13] 13. Public verification page validates authentic token without exposing private health data PASSED
```

---

## 8. Remaining Limitations & Future Clinical Recommendations

1. **Third-Party Medical Council Live Integration**:
   - The doctor's registration number is persisted and displayed along with the registration authority (e.g. *"Tamil Nadu Medical Council"*).
   - In production, real-time verification against the National Medical Commission (NMC) or State Medical Council registry API can be connected to replace self-declared status with a verified cryptographic trust anchor.
2. **Multi-Page Header Duplication**:
   - While `@media print` avoids row and container splits cleanly, repeating the hospital header automatically at the top of subsequent physical pages currently relies on CSS table-header printing. Prescriptions with more than 15 medications may benefit from a dedicated server-side headless Chromium PDF generation pipeline (e.g. Playwright PDF / Weasyprint) if pixel-exact multi-page running headers are required.
3. **Refill Tracking**:
   - Refill quantity fields are modeled in the schema and rendered when specified (`refills > 0`). An automated pharmacy dispensation ledger would further enable real-time decrement of allowable refills.
