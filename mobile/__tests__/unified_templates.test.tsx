/**
 * ONEHEALTH ID (OH-ID) Mobile — Unified Document Templates Test Suite
 * Sathus Technology Pvt Ltd
 *
 * Verifies:
 * 1. Polymorphic PrescriptionTemplateRenderer (10 Rx designs)
 * 2. Polymorphic ClinicalReportTemplateRenderer (10 Consultation Report designs)
 * 3. Super Admin Template Catalogue Management & Previews
 * 4. Hospital Admin Template Preferences & Facility Branding
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import { PrescriptionTemplateRenderer } from "../src/components/clinical_documents/PrescriptionTemplateRenderer";
import { ClinicalReportTemplateRenderer } from "../src/components/clinical_documents/ClinicalReportTemplateRenderer";
import SuperAdminHomeScreen from "../app/(super)/index";
import HospitalAdminHomeScreen from "../app/(admin)/index";
import { clinicalTemplatesApi } from "../src/services/api/clinical_templates";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "superadmin",
      name: "Super Administrator",
      role: "SUPER_ADMIN",
      hospital_name: "OneHealth Central Platform",
    },
    token: "mock-jwt-token",
    isAuthenticated: true,
  }),
}));

// Mock clinicalTemplatesApi
jest.mock("../src/services/api/clinical_templates", () => ({
  clinicalTemplatesApi: {
    listTemplates: jest.fn().mockResolvedValue([
      {
        id: "tmpl_rx_classic_hospital",
        document_type: "PRESCRIPTION",
        name: "Classic Hospital Rx",
        description: "Traditional SRMC hospital layout with structured medicine table.",
        category: "General Practice",
        version: 1,
        layout_config: { style: "tabular" },
        is_active: true,
        is_default: true,
      },
      {
        id: "tmpl_rx_modern_clinical",
        document_type: "PRESCRIPTION",
        name: "Modern Clinical",
        description: "Streamlined vitals cards and modern drug timing pills.",
        category: "Multispecialty",
        version: 1,
        layout_config: { style: "cards" },
        is_active: true,
        is_default: false,
      },
      {
        id: "tmpl_rep_classic_hospital",
        document_type: "CLINICAL_REPORT",
        name: "Classic Hospital Clinical Report",
        description: "Comprehensive inpatient and outpatient clinical summary.",
        category: "Hospital Inpatient & OPD",
        version: 1,
        layout_config: { style: "formal" },
        is_active: true,
        is_default: true,
      },
      {
        id: "tmpl_rep_chronic_disease",
        document_type: "CLINICAL_REPORT",
        name: "Chronic Disease Review Report",
        description: "Longitudinal markers, lifestyle tracking, and risk assessment.",
        category: "Chronic Disease",
        version: 1,
        layout_config: { style: "chronic" },
        is_active: true,
        is_default: false,
      },
    ]),
    getHospitalSettings: jest.fn().mockResolvedValue({
      hospital_id: "hosp-kedar",
      hospital_name: "Kedar Hospital",
      rx_template_id: "tmpl_rx_classic_hospital",
      rx_template_name: "Classic Hospital Rx",
      rx_template_version: 1,
      clinical_report_template_id: "tmpl_rep_classic_hospital",
      clinical_report_template_name: "Classic Hospital Clinical Report",
      clinical_report_template_version: 1,
      custom_header_text: "Centre of Excellence in Cardiology",
      custom_footer_notes: "Emergency 24x7: 1066",
      show_hospital_logo: true,
    }),
    updateHospitalSettings: jest.fn().mockResolvedValue({
      hospital_id: "hosp-kedar",
      rx_template_id: "tmpl_rx_modern_clinical",
      rx_template_name: "Modern Clinical",
      rx_template_version: 1,
      clinical_report_template_id: "tmpl_rep_chronic_disease",
      clinical_report_template_name: "Chronic Disease Review Report",
      clinical_report_template_version: 1,
      show_hospital_logo: true,
    }),
    toggleStatus: jest.fn().mockResolvedValue({ id: "tmpl_rx_modern_clinical", is_active: false }),
    setDefault: jest.fn().mockResolvedValue({ id: "tmpl_rx_modern_clinical", is_default: true }),
    getDoctorHospitalTemplates: jest.fn().mockResolvedValue({
      hospital_id: "hosp-kedar",
      hospital_name: "Kedar Hospital",
      rx_template_id: "tmpl_rx_classic_hospital",
      rx_template_name: "Classic Hospital Rx",
      clinical_report_template_id: "tmpl_rep_classic_hospital",
      clinical_report_template_name: "Classic Hospital Clinical Report",
    }),
    getConsultationReport: jest.fn().mockResolvedValue({
      id: "c-test-01",
      patient_id: "p-101",
      patient_name: "Alice Smith",
      onehealth_id: "OHID-IND-2026-0001",
      doctor_id: "doc-01",
      doctor_name: "Dr. Senthil Nathan",
      hospital_id: "hosp-kedar",
      hospital_name: "Kedar Hospital",
      diagnosis: "Type 2 Diabetes Mellitus",
      symptoms: "Polydipsia, fatigue",
      clinical_notes: "HbA1c 6.8%. Diet compliant.",
      vitals: { bp_systolic: "124", bp_diastolic: "80", heart_rate: "74" },
      template_id: "tmpl_rep_chronic_disease",
      template_name: "Chronic Disease Review Report",
      template_version: 1,
      template_layout_config: {},
    }),
  },
}));

describe("Unified Clinical Document Templates Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. PRESCRIPTION TEMPLATE RENDERER TESTS
  // =========================================================================
  describe("PrescriptionTemplateRenderer", () => {
    const baseRx = {
      id: "rx-test-001",
      patient_name: "Alice Smith",
      onehealth_id: "OHID-IND-2026-01001",
      patient_age: 32,
      patient_gender: "Female",
      patient_blood_group: "O+",
      allergies: ["Penicillin"],
      diagnosis: "Acute Bronchitis",
      items: [
        {
          medicine_name: "Azithromycin",
          strength: "500 mg",
          dosage_form: "Tablet",
          dose: "1 Tab",
          frequency: "Once daily (Morning)",
          duration_days: 5,
          food_instruction: "After food",
          instructions: "Complete full course",
        },
      ],
      doctor_name: "Dr. Senthil Nathan",
      doctor_qualification: "MBBS, MD",
      doctor_registration: "TN-MCI-2026-001",
      hospital_name: "Kedar Hospital",
      digital_signature_hash: "SHA256:7a9f82d1c0e4...VERIFIED",
    };

    test("renders Classic Hospital Rx layout (tabular with allergies)", async () => {
      const { getByText } = await render(
        <PrescriptionTemplateRenderer
          prescription={{ ...baseRx, template_id: "tmpl_rx_classic_hospital", template_name: "Classic Hospital Rx" }}
        />
      );

      expect(getByText("Alice Smith")).toBeTruthy();
      expect(getByText("Kedar Hospital")).toBeTruthy();
      expect(getByText(/ALLERGIES: Penicillin/)).toBeTruthy();
      expect(getByText(/1\. Azithromycin/)).toBeTruthy();
      expect(getByText("DRUG NAME & FORM")).toBeTruthy();
      expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
    });

    test("renders Modern Clinical Rx layout", async () => {
      const { getByText } = await render(
        <PrescriptionTemplateRenderer
          prescription={{ ...baseRx, template_id: "tmpl_rx_modern_clinical", template_name: "Modern Clinical" }}
        />
      );

      expect(getByText("Prescribed Medications")).toBeTruthy();
      expect(getByText("Azithromycin")).toBeTruthy();
      expect(getByText("5d")).toBeTruthy();
    });

    test("renders Emergency Prescription layout with alert banner", async () => {
      const { getByText } = await render(
        <PrescriptionTemplateRenderer
          prescription={{
            ...baseRx,
            template_id: "tmpl_rx_emergency_prescription",
            template_name: "Emergency Prescription",
          }}
        />
      );

      expect(getByText(/EMERGENCY MEDICINE RX/)).toBeTruthy();
      expect(getByText("STAT / URGENT")).toBeTruthy();
    });

    test("renders Digital E-Prescription layout with cryptographic seal", async () => {
      const { getByText } = await render(
        <PrescriptionTemplateRenderer
          prescription={{
            ...baseRx,
            template_id: "tmpl_rx_digital_eprescription",
            template_name: "Digital E-Prescription",
          }}
        />
      );

      expect(getByText("ONEHEALTH TAMPER-EVIDENT E-PRESCRIPTION")).toBeTruthy();
      expect(getByText("Instant Pharmacy Check-in")).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. CLINICAL REPORT TEMPLATE RENDERER TESTS
  // =========================================================================
  describe("ClinicalReportTemplateRenderer", () => {
    const baseReport = {
      id: "c-test-001",
      patient_id: "p-101",
      patient_name: "Alice Smith",
      onehealth_id: "OHID-IND-2026-01001",
      patient_age: 32,
      patient_gender: "Female",
      patient_blood_group: "O+",
      doctor_id: "doc-01",
      doctor_name: "Dr. Senthil Nathan",
      doctor_specialty: "General Medicine",
      doctor_qualification: "MBBS, MD",
      doctor_registration: "TN-MCI-2026-001",
      hospital_id: "hosp-kedar",
      hospital_name: "Kedar Hospital",
      symptoms: "Persistent dry cough, mild evening fever",
      diagnosis: "Reactive Airway Disease",
      clinical_notes: "Bilateral wheezing on auscultation. Vitals stable.",
      vitals: { bp_systolic: "120", bp_diastolic: "80", heart_rate: "76", temperature: "98.8" },
      template_id: "tmpl_rep_classic_hospital",
      template_name: "Classic Hospital Clinical Report",
      template_version: 1,
      template_layout_config: {},
      digital_signature_hash: "SHA256:4f8e91a0c8...VERIFIED",
    };

    test("renders Classic Hospital Clinical Report layout with vitals & diagnosis", async () => {
      const { getByText } = await render(<ClinicalReportTemplateRenderer report={baseReport} />);

      expect(getByText("Kedar Hospital")).toBeTruthy();
      expect(getByText("Alice Smith")).toBeTruthy();
      expect(getByText("CHIEF COMPLAINTS & PRESENTING SYMPTOMS")).toBeTruthy();
      expect(getByText("Reactive Airway Disease")).toBeTruthy();
      expect(getByText("120/80 mmHg")).toBeTruthy();
      expect(getByText("76 bpm")).toBeTruthy();
    });

    test("renders Chronic Disease Review Report layout", async () => {
      const { getByText } = await render(
        <ClinicalReportTemplateRenderer
          report={{
            ...baseReport,
            template_id: "tmpl_rep_chronic_disease",
            template_name: "Chronic Disease Review Report",
          }}
        />
      );

      expect(getByText("CHRONIC DISEASE PROGRAM REVIEW")).toBeTruthy();
      expect(getByText("CURRENT CLINICAL STATUS")).toBeTruthy();
    });

    test("renders Emergency Clinical Assessment layout", async () => {
      const { getByText } = await render(
        <ClinicalReportTemplateRenderer
          report={{
            ...baseReport,
            template_id: "tmpl_rep_emergency_assessment",
            template_name: "Emergency Clinical Assessment",
          }}
        />
      );

      expect(getByText(/EMERGENCY TRIAGE & CRITICAL CLINICAL ASSESSMENT/)).toBeTruthy();
      expect(getByText("ACUTE PRESENTATION & TRIAGE FINDINGS")).toBeTruthy();
    });
  });

  // =========================================================================
  // 3. SUPER ADMIN TEMPLATE CATALOGUE UI TESTS
  // =========================================================================
  describe("Super Admin Template Management Screen", () => {
    test("renders template management catalogue with dual tabs", async () => {
      const { getByTestId, getByText } = await render(<SuperAdminHomeScreen />);

      await waitFor(() => {
        expect(getByText("Document Template System")).toBeTruthy();
        expect(getByTestId("tab-prescription-templates")).toBeTruthy();
        expect(getByTestId("tab-clinical-report-templates")).toBeTruthy();
        expect(getByText("Classic Hospital Rx")).toBeTruthy();
        expect(getByText("Modern Clinical")).toBeTruthy();
      });
    });

    test("switches between Prescription and Clinical Report tabs", async () => {
      const { getByTestId, getByText } = await render(<SuperAdminHomeScreen />);

      await waitFor(() => {
        expect(getByText("Classic Hospital Rx")).toBeTruthy();
      });

      // Switch to Clinical Report tab
      fireEvent.press(getByTestId("tab-clinical-report-templates"));

      await waitFor(() => {
        expect(getByText("Classic Hospital Clinical Report")).toBeTruthy();
        expect(getByText("Chronic Disease Review Report")).toBeTruthy();
      });
    });

    test("opens template preview modal on clicking Preview Design", async () => {
      const { getByTestId } = await render(<SuperAdminHomeScreen />);

      await waitFor(() => {
        expect(getByTestId("btn-preview-tmpl_rx_classic_hospital")).toBeTruthy();
      });

      fireEvent.press(getByTestId("btn-preview-tmpl_rx_classic_hospital"));

      await waitFor(() => {
        expect(getByTestId("super-admin-template-preview-modal")).toBeTruthy();
        expect(getByTestId("btn-close-template-preview")).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // 4. HOSPITAL ADMIN TEMPLATE PREFERENCES UI TESTS
  // =========================================================================
  describe("Hospital Admin Template Preferences", () => {
    test("renders hospital active template settings card", async () => {
      const { getByTestId, getByText } = await render(<HospitalAdminHomeScreen />);

      await waitFor(() => {
        expect(getByText("Prescription & Report Templates")).toBeTruthy();
        expect(getByTestId("hospital-template-settings-card")).toBeTruthy();
        expect(getByText("Classic Hospital Rx")).toBeTruthy();
        expect(getByText("Classic Hospital Clinical Report")).toBeTruthy();
        expect(getByTestId("btn-choose-rx-template")).toBeTruthy();
        expect(getByTestId("btn-choose-report-template")).toBeTruthy();
      });
    });

    test("opens template selector modal when clicking Change on Rx template", async () => {
      const { getByTestId } = await render(<HospitalAdminHomeScreen />);

      await waitFor(() => {
        expect(getByTestId("btn-choose-rx-template")).toBeTruthy();
      });

      fireEvent.press(getByTestId("btn-choose-rx-template"));

      await waitFor(() => {
        expect(getByTestId("hospital-template-selector-modal")).toBeTruthy();
        expect(getByTestId("option-template-tmpl_rx_modern_clinical")).toBeTruthy();
      });
    });

    test("opens branding and notes modal", async () => {
      const { getByTestId } = await render(<HospitalAdminHomeScreen />);

      await waitFor(() => {
        expect(getByTestId("btn-open-branding-modal")).toBeTruthy();
      });

      fireEvent.press(getByTestId("btn-open-branding-modal"));

      await waitFor(() => {
        expect(getByTestId("hospital-branding-modal")).toBeTruthy();
        expect(getByTestId("input-custom-header")).toBeTruthy();
        expect(getByTestId("btn-save-branding")).toBeTruthy();
      });
    });
  });
});
