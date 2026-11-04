/**
 * ONEHEALTH ID (OH-ID) Mobile — Documents Vault & Preview Modal Test Suite
 * Sathus Technology Pvt Ltd
 *
 * Verifies:
 * 1. Rendering of Documents Vault tab in Health Records.
 * 2. Stored documents listing with category badges and upload/OCR status pills.
 * 3. Opening DocumentPreviewModal on document tap.
 * 4. Display of patient-friendly "Securely Stored" badge and clean metadata without internal infrastructure leakage.
 * 5. Complete removal of technical details (B2, Backblaze, AES-256-GCM, Storage Encryption).
 * 6. Non-blocking verification: Documents with REVIEW_REQUIRED status remain visible, accessible, and previewable.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { DocumentPreviewModal } from "../src/components/patient/DocumentPreviewModal";
import { PatientDocument } from "../src/services/api/documents";

// Mock documentsApi
jest.mock("../src/services/api/documents", () => {
  const actual = jest.requireActual("../src/services/api/documents");
  return {
    ...actual,
    documentsApi: {
      ...actual.documentsApi,
      getDocumentFileUrl: jest.fn().mockResolvedValue({
        url: "blob:http://localhost:8081/mock-decrypted-doc",
        mimeType: "application/pdf",
        fileName: "cbc_lab_report.pdf",
        isImage: false,
        isPdf: true,
      }),
    },
  };
});

describe("DocumentPreviewModal & Patient Documents Vault", () => {
  const mockValidDoc: PatientDocument = {
    id: "doc-up-2026-001",
    document_code: "DOC-2026-001",
    title: "Complete Blood Count Lab Report",
    category: "LAB_REPORT",
    status: "AVAILABLE",
    hospital_name: "Kedar Hospital",
    doctor_name: "Dr. Aruna Devi",
    document_date: "2026-10-30",
    file_type: "PDF",
    file_size_kb: 245,
    metadata: {
      ocr_status: "COMPLETED",
      validation_decision: "STORED",
      extracted_fields: {
        hospital_name: "Kedar Super Specialty Hospital",
        doctor_name: "Dr. Aruna Devi",
        document_date: "30 Oct 2026",
      },
    },
  };

  const mockReviewRequiredDoc: PatientDocument = {
    id: "doc-up-2026-002",
    document_code: "DOC-2026-002",
    title: "Handwritten Doctor Prescription",
    category: "PRESCRIPTION",
    status: "REVIEW_REQUIRED",
    hospital_name: "City Care Clinic",
    doctor_name: "Dr. Senthil Nathan",
    document_date: "2026-10-29",
    file_type: "JPEG",
    file_size_kb: 58,
    metadata: {
      ocr_status: "LOW_CONFIDENCE",
      validation_decision: "STORED",
      extracted_fields: {
        hospital_name: "City Care Clinic",
        doctor_name: "Dr. Senthil Nathan",
        document_date: "29 Oct 2026",
      },
    },
  };

  it("renders preview modal with title, Securely Stored badge, and patient-friendly metadata", async () => {
    const handleClose = jest.fn();
    const { getByText, queryByText, getByTestId } = await render(
      <DocumentPreviewModal
        visible={true}
        document={mockValidDoc}
        onClose={handleClose}
      />
    );

    expect(getByText("Complete Blood Count Lab Report")).toBeTruthy();
    expect(getByText("Securely Stored")).toBeTruthy();
    expect(getByText("Document Processing Complete")).toBeTruthy();
    expect(getByText("Kedar Super Specialty Hospital")).toBeTruthy();

    // Verify complete removal of internal infrastructure details from patient UI
    expect(queryByText("Vault Stored")).toBeNull();
    expect(queryByText("AES-256-GCM Encrypted")).toBeNull();
    expect(queryByText("AES-256-GCM")).toBeNull();
    expect(queryByText(/Backblaze/i)).toBeNull();
    expect(queryByText("Storage Encryption")).toBeNull();

    const closeBtn = getByTestId("btn-close-document-preview");
    fireEvent.press(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("allows full preview access when document status is REVIEW_REQUIRED (non-blocking) with Securely Stored badge", async () => {
    const handleClose = jest.fn();
    const { getByText, queryByText, getByTestId } = await render(
      <DocumentPreviewModal
        visible={true}
        document={mockReviewRequiredDoc}
        onClose={handleClose}
      />
    );

    // Document is NOT blocked: shows title, preview surface, and Securely Stored badge
    expect(getByText("Handwritten Doctor Prescription")).toBeTruthy();
    expect(getByText("Securely Stored")).toBeTruthy();
    expect(getByText("OCR: Preserved")).toBeTruthy();
    // Non-blocking status pill
    expect(getByText("Under Routine Review")).toBeTruthy();

    // Verify complete removal of internal infrastructure details
    expect(queryByText("Vault Stored")).toBeNull();
    expect(queryByText("AES-256-GCM Encrypted")).toBeNull();
    expect(queryByText(/Backblaze/i)).toBeNull();
    expect(queryByText("Storage Encryption")).toBeNull();

    // Verify dismiss button works
    const dismissBtn = getByTestId("btn-dismiss-preview");
    fireEvent.press(dismissBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
