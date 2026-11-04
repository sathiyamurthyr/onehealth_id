/**
 * ONEHEALTH ID (OH-ID) Mobile — Clinical Consultation Report Viewer Redesign Unit Tests
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ConsultationReportViewerModal } from "../src/components/clinical_documents/ConsultationReportViewerModal";
import { ConsultationReportDetail } from "../src/services/api/clinical_templates";

// Mock QRCode
jest.mock("react-native-qrcode-svg", () => {
  return function MockQRCode() {
    return <></>;
  };
});

describe("ConsultationReportViewerModal Redesign Test Suite", () => {
  const sampleReport: ConsultationReportDetail = {
    id: "cln-2026-000456",
    encounter_no: "ENC-2026-04567",
    consultation_date_time: "31 Oct 2026, 09:30 AM",
    department: "General Medicine",
    consultation_type: "Outpatient",
    patient_id: "p-101",
    patient_name: "Alice Smith",
    onehealth_id: "OHID-IND-2026-01001",
    patient_age: 32,
    patient_gender: "Female",
    patient_blood_group: "O+ Positive",
    patient_mobile: "+91 98765 43210",
    patient_dob: "1994-01-01",
    visit_no: "OPD-2026-00456",
    patient_address: "12, Green Park Street, Porur, Chennai - 600116, Tamil Nadu, India",
    doctor_id: "doc-01",
    doctor_name: "Dr. Senthil Nathan",
    doctor_specialty: "General Medicine",
    doctor_qualification: "MBBS, MD - General Medicine",
    doctor_registration: "TN-MCI-2026-001",
    hospital_id: "hosp-alpha",
    hospital_name: "Hospital Alpha",
    hospital_address: "148 Trunk Road, Porur, Chennai - 600116",
    hospital_phone: "+91 44 2345 6789",
    hospital_website: "www.hospitalalpha.org",
    allergies_status: "No known allergies",
    chief_complaints: "Blood pressure controlled on dual therapy. Diet compliant. Occasional fatigue.",
    relevant_history: {
      present_illness: "Known case of Type 2 Diabetes Mellitus and Hypertension.",
      past_history: "No significant past illness.",
      family_history: "Non-contributory.",
      medication_history: "On Metformin and Amlodipine.",
      lifestyle: "Diet compliant. Regular walking.",
      smoking_alcohol: "Not reported.",
    },
    examination_findings: {
      general_examination: "Patient stable. Conscious and oriented.",
      cardiovascular: "S1, S2 Normal. No murmur.",
      respiratory: "Bilateral air entry equal. No added sounds.",
      abdomen: "Soft, non-tender.",
      cns: "No focal deficits.",
      others: "No significant findings.",
    },
    clinical_impression: "Type 2 Diabetes Mellitus - Review",
    diagnosis: "Type 2 Diabetes Mellitus - Review",
    clinical_notes: "Blood pressure controlled on treatment.",
    investigations: [
      { test_name: "HbA1c", result: "7.1 %", reference_range: "4.0 - 5.6", date: "31 Oct 2026" },
      { test_name: "Fasting Blood Sugar", result: "128 mg/dL", reference_range: "70 - 110", date: "31 Oct 2026" },
      { test_name: "Lipid Profile", result: "Normal", reference_range: "-", date: "31 Oct 2026" },
    ],
    treatment_plan: [
      { id: "tp-1", medicine_name: "Metformin 500 mg", dose: "1 tablet", frequency: "1-0-1", duration: "3 months", instructions: "After food" },
      { id: "tp-2", medicine_name: "Amlodipine 5 mg", dose: "1 tablet", frequency: "0-1-0", duration: "3 months", instructions: "After food" },
    ],
    diet_lifestyle_advice: [
      "Follow diabetic diet.",
      "Regular physical activity (30 minutes daily).",
      "Maintain healthy weight.",
      "Adequate hydration.",
    ],
    follow_up_plan: "Next consultation / review in 3 months.\nRepeat HbA1c and Lipid Profile before next visit.",
    additional_notes: "Continue current medications. Monitor blood pressure and blood sugar regularly.",
    vitals: {
      bp_systolic: "120",
      bp_diastolic: "80",
      heart_rate: "72",
      temperature: "98.4",
      respiratory_rate: "18",
    },
    signed_by: "usr-doctor",
    signed_at: "31 Oct 2026, 09:30 AM",
    digital_signature_hash: "a37fe9c2d1b4097f48e91a0c8d7b321a5c6e8f6c3d2a1b0",
    template_id: "tmpl_rep_classic_hospital",
    template_name: "Classic Hospital Clinical Report",
    template_version: 1,
    template_layout_config: {},
    issue_date: "31 Oct 2026, 09:30 AM",
    valid_until: "31 Jan 2027",
    document_status: "VALID",
    document_id: "CLN-2026-000456",
    version: "1.0",
    verification_url: "https://ohid.online/verify/document/cln-2026-000456",
  };

  test("renders document header title, subtitle, and desktop toolbar actions", async () => {
    const { getByText, getByTestId } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    expect(getByText("Official Clinical Consultation Report")).toBeTruthy();
    expect(getByText(/Classic Hospital Clinical Report • Tamper-Evident Signed Copy/)).toBeTruthy();
    expect(getByTestId("btn-consultation-print")).toBeTruthy();
    expect(getByTestId("btn-consultation-share")).toBeTruthy();
    expect(getByTestId("btn-consultation-more")).toBeTruthy();
    expect(getByTestId("btn-close-consultation-report-viewer")).toBeTruthy();
  });

  test("renders Hospital Alpha branding and Encounter card metadata", async () => {
    const { getByText, getAllByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    expect(getByText("Hospital Alpha")).toBeTruthy();
    expect(getByText("Multi-Specialty Inpatient & OPD")).toBeTruthy();
    expect(getByText("ENC-2026-04567")).toBeTruthy();
    expect(getAllByText("31 Oct 2026, 09:30 AM").length).toBeGreaterThanOrEqual(1);
    expect(getByText("General Medicine")).toBeTruthy();
    expect(getByText("Outpatient")).toBeTruthy();
  });

  test("renders Patient Information card with demographics and copyable OH-ID", async () => {
    const { getByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    expect(getByText("PATIENT INFORMATION")).toBeTruthy();
    expect(getByText("Alice Smith")).toBeTruthy();
    expect(getByText("OHID-IND-2026-01001")).toBeTruthy();
    expect(getByText("32 Years / Female")).toBeTruthy();
    expect(getByText("O+ Positive")).toBeTruthy();
    expect(getByText("+91 98765 43210")).toBeTruthy();
    expect(getByText("OPD-2026-00456")).toBeTruthy();
  });

  test("renders 4 color-coded Vitals cards and Allergy status", async () => {
    const { getByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    expect(getByText("RECORDED VITAL SIGNS")).toBeTruthy();
    expect(getByText("120/80 mmHg")).toBeTruthy();
    expect(getByText("72 bpm")).toBeTruthy();
    expect(getByText("98.4 °F")).toBeTruthy();
    expect(getByText("18 / min")).toBeTruthy();
    expect(getByText("ALLERGY & ADVERSE DRUG REACTION")).toBeTruthy();
    expect(getByText("No known allergies")).toBeTruthy();
  });

  test("renders Clinical Findings: Chief complaints, Relevant history, Examination", async () => {
    const { getByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    expect(getByText("CHIEF COMPLAINTS & PRESENTING SYMPTOMS")).toBeTruthy();
    expect(getByText(/Blood pressure controlled on dual therapy/)).toBeTruthy();
    expect(getByText("RELEVANT HISTORY")).toBeTruthy();
    expect(getByText("Present Illness")).toBeTruthy();
    expect(getByText("CLINICAL EXAMINATION & SYSTEMIC FINDINGS")).toBeTruthy();
    expect(getByText("General Examination")).toBeTruthy();
  });

  test("renders Diagnosis callout and Investigations table", async () => {
    const { getByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    expect(getByText("DIAGNOSIS / CLINICAL IMPRESSION")).toBeTruthy();
    expect(getByText("Type 2 Diabetes Mellitus - Review")).toBeTruthy();
    expect(getByText("INVESTIGATIONS (Ordered / Reviewed)")).toBeTruthy();
    expect(getByText("HbA1c")).toBeTruthy();
    expect(getByText("7.1 %")).toBeTruthy();
    expect(getByText("Fasting Blood Sugar")).toBeTruthy();
    expect(getByText("128 mg/dL")).toBeTruthy();
  });

  test("renders Treatment Plan and Dietary & Lifestyle advice", async () => {
    const { getByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    expect(getByText("TREATMENT PLAN")).toBeTruthy();
    expect(getByText("Metformin 500 mg")).toBeTruthy();
    expect(getByText("Amlodipine 5 mg")).toBeTruthy();
    expect(getByText("DIETARY & LIFESTYLE ADVICE")).toBeTruthy();
    expect(getByText("Follow diabetic diet.")).toBeTruthy();
    expect(getByText("Regular physical activity (30 minutes daily).")).toBeTruthy();
  });

  test("renders Clinician Signature and Document Footer Ribbon", async () => {
    const { getByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    expect(getByText("SIGNED BY (EXAMINING CLINICIAN)")).toBeTruthy();
    expect(getByText("Electronically Signed")).toBeTruthy();
    expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
    expect(getByText("Registration No: TN-MCI-2026-001")).toBeTruthy();
    expect(getByText("Digital Signature")).toBeTruthy();
    expect(getByText("VALID")).toBeTruthy();
    expect(getByText("CLN-2026-000456")).toBeTruthy();
    expect(getByText("1.0")).toBeTruthy();
  });

  test("clicking Share opens Protected Health Information (PHI) notice", async () => {
    const { getByTestId, getByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByTestId("btn-consultation-share"));

    await waitFor(() => {
      expect(getByText("Notice: Protected Health Information (PHI)")).toBeTruthy();
      expect(getByTestId("btn-confirm-share-consultation")).toBeTruthy();
    });
  });

  test("clicking More opens document actions modal sheet", async () => {
    const { getByTestId, getByText } = await render(
      <ConsultationReportViewerModal
        visible={true}
        report={sampleReport}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByTestId("btn-consultation-more"));

    await waitFor(() => {
      expect(getByText("Document Actions")).toBeTruthy();
      expect(getByTestId("menu-action-signature-details")).toBeTruthy();
      expect(getByTestId("menu-action-verify-online")).toBeTruthy();
      expect(getByTestId("menu-action-document-history")).toBeTruthy();
      expect(getByTestId("menu-action-hospital-support")).toBeTruthy();
    });
  });
});
