/**
 * ONEHEALTH ID (OH-ID) Mobile — Document Upload & Validation Screen Test Suite
 * Sathus Technology Pvt Ltd
 *
 * Validates enterprise client-side preflight rules, category selection,
 * multi-stage validation progress, and outcome cards (ACCEPTED, REVIEW_REQUIRED, REJECTED_*).
 */

 
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import DocumentUploadScreen from "../app/(patient)/upload";
import {
  documentsApi,
  SUPPORTED_DOCUMENT_CATEGORIES,
} from "../src/services/api/documents";
import * as DocumentPicker from "expo-document-picker";

// Mock router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
  }),
}));

// Mock expo-document-picker
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock documentsApi.uploadAndValidateDocument
jest.mock("../src/services/api/documents", () => {
  const actual = jest.requireActual("../src/services/api/documents");
  return {
    ...actual,
    documentsApi: {
      ...actual.documentsApi,
      uploadAndValidateDocument: jest.fn(),
    },
  };
});

describe("DocumentUploadScreen — Enterprise Document Validation UX", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders screen title, category pills, and upload guidelines correctly", async () => {
    const { getByText, getByTestId } = await render(<DocumentUploadScreen />);

    expect(getByText("Upload Medical Document")).toBeTruthy();
    expect(getByText("1. Select Medical Document Category")).toBeTruthy();
    expect(getByText("Upload & Security Policy")).toBeTruthy();

    // Verify category pills exist
    for (const cat of SUPPORTED_DOCUMENT_CATEGORIES) {
      expect(getByTestId(`category-pill-${cat.key}`)).toBeTruthy();
    }
  });

  it("allows selecting different document categories and displays active limits", async () => {
    const { getByTestId, getByText } = await render(<DocumentUploadScreen />);

    const prescriptionPill = getByTestId("category-pill-PRESCRIPTION");
    await fireEvent.press(prescriptionPill);

    expect(
      getByText(/Doctor medication orders, dosages, and prescription slips/)
    ).toBeTruthy();
    expect(getByText(/Max File Size: 10 MB/)).toBeTruthy();
  });

  it("handles picking a valid file and populates the file card", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: "file:///mock/lab_cbc.pdf",
          name: "patient_cbc_report.pdf",
          mimeType: "application/pdf",
          size: 512 * 1024,
        },
      ],
    });

    const { getByTestId, getByText } = await render(<DocumentUploadScreen />);

    const pickBtn = getByTestId("pick-document-button");
    await fireEvent.press(pickBtn);

    await waitFor(() => {
      expect(getByTestId("selected-file-card")).toBeTruthy();
      expect(getByText("patient_cbc_report.pdf")).toBeTruthy();
    });
  });

  it("triggers client-side preflight check and displays error if an unsupported file type is picked", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: "file:///mock/malware.exe",
          name: "executable_binary.exe",
          mimeType: "application/x-msdownload",
          size: 1024,
        },
      ],
    });

    const { getByTestId, getByText } = await render(<DocumentUploadScreen />);

    const pickBtn = getByTestId("pick-document-button");
    await fireEvent.press(pickBtn);

    await waitFor(() => {
      expect(getByTestId("client-error-card")).toBeTruthy();
      expect(getByText(/not supported/i)).toBeTruthy();
    });
  });

  it("allows quick selection of sample valid lab report and submits for validation", async () => {
    (documentsApi.uploadAndValidateDocument as jest.Mock).mockResolvedValueOnce({
      id: "doc-101",
      status: "ACCEPTED",
      validation_decision: "ACCEPTED",
      file_name: "cbc_pathology_report_2026.pdf",
      document_category: "LAB_REPORT",
      file_size_bytes: 245 * 1024,
      extracted_fields: {
        hospital_name: "Apollo Hospitals",
        doctor_name: "Dr. K. Sharma",
        document_date: "2026-05-10",
        document_type: "Hematology Lab Report",
      },
    });

    const { getByTestId, getByText } = await render(<DocumentUploadScreen />);

    // Tap synthetic valid lab button
    await fireEvent.press(getByTestId("sample-valid-lab-btn"));

    expect(getByTestId("selected-file-card")).toBeTruthy();
    expect(getByText("cbc_pathology_report_2026.pdf")).toBeTruthy();

    // Tap submit
    await fireEvent.press(getByTestId("submit-validation-button"));

    // Multi-stage indicators run, then ACCEPTED outcome card renders
    await waitFor(
      () => {
        expect(getByTestId("validation-outcome-accepted")).toBeTruthy();
        expect(getByText("Document Accepted")).toBeTruthy();
        expect(getByText(/Apollo Hospitals/)).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it("displays actionable remedy and rejection card for REJECTED_IRRELEVANT content", async () => {
    (documentsApi.uploadAndValidateDocument as jest.Mock).mockResolvedValueOnce({
      id: "doc-err-1",
      status: "REJECTED_IRRELEVANT",
      validation_decision: "REJECTED_IRRELEVANT",
      file_name: "electricity_power_bill_may2026.pdf",
      document_category: "PRESCRIPTION",
      file_size_bytes: 180 * 1024,
      rejection_reason:
        "Document classified as non-healthcare utility bill. Score: 0.05",
      actionable_remedy:
        "Please upload an authentic medical record (e.g. Doctor RxPad, Diagnostic Lab Report, Discharge Summary). Non-medical bills and invoices are strictly blocked.",
    });

    const { getByTestId, getByText } = await render(<DocumentUploadScreen />);

    await fireEvent.press(getByTestId("sample-irrelevant-btn"));
    await fireEvent.press(getByTestId("submit-validation-button"));

    await waitFor(
      () => {
        expect(getByTestId("validation-outcome-rejected")).toBeTruthy();
        expect(getByText("Irrelevant Content Blocked")).toBeTruthy();
        expect(getByText(/Non-medical bills and invoices are strictly blocked/)).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it("displays unreadable document card for REJECTED_LOW_OCR_CONFIDENCE", async () => {
    (documentsApi.uploadAndValidateDocument as jest.Mock).mockResolvedValueOnce({
      id: "doc-err-2",
      status: "REJECTED_LOW_OCR_CONFIDENCE",
      validation_decision: "REJECTED_LOW_OCR_CONFIDENCE",
      file_name: "scanned_blurry.png",
      document_category: "LAB_REPORT",
      file_size_bytes: 120 * 1024,
      rejection_reason: "OCR text extraction yielded insufficient legible characters.",
      actionable_remedy:
        "Ensure the document is well-lit, laid flat, and in sharp focus before taking a picture or scan.",
    });

    const { getByTestId, getByText } = await render(<DocumentUploadScreen />);

    await fireEvent.press(getByTestId("sample-valid-lab-btn"));
    await fireEvent.press(getByTestId("submit-validation-button"));

    await waitFor(
      () => {
        expect(getByTestId("validation-outcome-rejected")).toBeTruthy();
        expect(getByText("Unreadable Document")).toBeTruthy();
        expect(getByText(/Ensure the document is well-lit/)).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it("navigates back when top back button is pressed", async () => {
    const { getByTestId } = await render(<DocumentUploadScreen />);
    const backBtn = getByTestId("upload-back-btn");
    await fireEvent.press(backBtn);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
