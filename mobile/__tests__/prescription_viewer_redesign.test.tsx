import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import {
  PrescriptionViewerModal,
  getPrescriptionValidity,
  PrescriptionData,
} from "../src/components/clinical_documents";

describe("OH-ID Prescription Viewer Redesign & Document Actions", () => {
  jest.setTimeout(20000);
  const mockPrescription: PrescriptionData = {
    id: "enc-2026-001",
    patient_name: "Alice Smith",
    onehealth_id: "OHID-IND-2026-01001",
    patient_age: 32,
    patient_gender: "Female",
    patient_blood_group: "O+",
    doctor_name: "Dr. Senthil Nathan",
    doctor_qualification: "MBBS, MD (General Medicine)",
    doctor_registration: "TN-MCI-2026-001",
    hospital_name: "SRMC Academic Medical Centre & Hospital",
    hospital_address: "148 Trunk Road, Porur, Chennai - 600116",
    hospital_phone: "+91 44 2476 8000",
    diagnosis: "Acute Upper Respiratory Tract Infection",
    symptoms: "Mild fever, cough, sneezing for 2 days",
    vitals: {
      bp_systolic: "120",
      bp_diastolic: "80",
      heart_rate: "74",
      temperature: "98.6",
    },
    items: [
      {
        medicine_name: "Amoxicillin & Clavulanate",
        strength: "625 mg",
        dosage_form: "Tablet",
        dose: "1 Tab",
        frequency: "1-0-1",
        duration_days: 5,
        food_instruction: "After food",
        instructions: "Take with warm water after meals.",
      },
      {
        medicine_name: "Paracetamol",
        strength: "650 mg",
        dosage_form: "Tablet",
        dose: "1 Tab",
        frequency: "SOS",
        duration_days: 3,
        food_instruction: "After food",
        instructions: "Take when fever exceeds 99°F.",
      },
    ],
    advice: "Take medications after food. Drink plenty of warm water.",
    follow_up_date: "In 7 days (Review OPD)",
    template_id: "tmpl_rx_classic_hospital",
    template_name: "Classic Hospital Rx",
    signed_at: "2026-10-27T10:30:00.000Z",
    valid_until: "2026-11-10T23:59:59.000Z",
    status: "VALID",
    digital_signature_hash: "7a9f82d1c0e4f5a6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
    verification_url: "https://ohid.online/verify/prescription/enc-2026-001",
  };

  describe("Document Expiry and Validity Calculation", () => {
    it("returns VALID status for future valid_until date", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const res = getPrescriptionValidity({
        ...mockPrescription,
        valid_until: futureDate.toISOString(),
      });
      expect(res.status).toBe("VALID");
      expect(res.label).toBe("VALID");
      expect(res.isExpired).toBe(false);
    });

    it("returns EXPIRING_SOON when valid_until is within 3 days", () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 2);
      const res = getPrescriptionValidity({
        ...mockPrescription,
        valid_until: nearDate.toISOString(),
      });
      expect(res.status).toBe("EXPIRING_SOON");
      expect(res.label).toBe("EXPIRING SOON");
      expect(res.isExpiringSoon).toBe(true);
    });

    it("returns EXPIRED and flags isExpired when valid_until is in the past", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const res = getPrescriptionValidity({
        ...mockPrescription,
        valid_until: pastDate.toISOString(),
      });
      expect(res.status).toBe("EXPIRED");
      expect(res.label).toBe("EXPIRED");
      expect(res.isExpired).toBe(true);
    });

    it("returns REVOKED when status is explicitly REVOKED", () => {
      const res = getPrescriptionValidity({
        ...mockPrescription,
        status: "REVOKED",
      });
      expect(res.status).toBe("REVOKED");
      expect(res.label).toBe("REVOKED");
      expect(res.isExpired).toBe(true);
    });

    it("returns SUPERSEDED when status is explicitly SUPERSEDED", () => {
      const res = getPrescriptionValidity({
        ...mockPrescription,
        status: "SUPERSEDED",
      });
      expect(res.status).toBe("SUPERSEDED");
      expect(res.label).toBe("SUPERSEDED");
      expect(res.isExpired).toBe(true);
    });

    it("displays 'No expiry date specified' without inventing a date when valid_until is omitted", () => {
      const res = getPrescriptionValidity({
        ...mockPrescription,
        valid_until: undefined,
      });
      expect(res.status).toBe("VALID");
      expect(res.expiryText).toBe("No expiry date specified");
      expect(res.isExpired).toBe(false);
    });
  });

  describe("PrescriptionViewerModal UI and Actions", () => {
    it("renders document surface, patient details, and persistent action bar", async () => {
      const onClose = jest.fn();
      const { getByText, getByTestId } = await render(
        <PrescriptionViewerModal
          visible={true}
          prescription={mockPrescription}
          onClose={onClose}
        />
      );

      // Header & Title
      expect(getByText("Official Doctor Prescription")).toBeTruthy();
      expect(getByTestId("viewer-header-row")).toBeTruthy();
      expect(getByTestId("viewer-persistent-action-bar")).toBeTruthy();

      // Patient Demographics
      expect(getByText("Alice Smith")).toBeTruthy();
      expect(getByText("OHID-IND-2026-01001")).toBeTruthy();
      expect(getByText("Acute Upper Respiratory Tract Infection")).toBeTruthy();

      // Prescriber Details
      expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
      expect(getByText(/TN-MCI-2026-001/)).toBeTruthy();

      // Persistent Actions
      expect(getByTestId("btn-rx-action-print")).toBeTruthy();
      expect(getByTestId("btn-rx-action-share")).toBeTruthy();
      expect(getByTestId("btn-rx-action-more")).toBeTruthy();
    });

    it("triggers share action on pressing Share button", async () => {
      const onClose = jest.fn();
      const { getByTestId, findByText } = await render(
        <PrescriptionViewerModal
          visible={true}
          prescription={mockPrescription}
          onClose={onClose}
        />
      );

      fireEvent.press(getByTestId("btn-rx-action-share"));
      const notice = await findByText(/Protected Health Information/);
      expect(notice).toBeTruthy();
    });

    it("triggers more actions sheet on pressing More button", async () => {
      const onClose = jest.fn();
      const { getByTestId, findByText } = await render(
        <PrescriptionViewerModal
          visible={true}
          prescription={mockPrescription}
          onClose={onClose}
        />
      );

      fireEvent.press(getByTestId("btn-rx-action-more"));
      const actionsTitle = await findByText(/Prescription Document Actions/);
      expect(actionsTitle).toBeTruthy();
    });

    it("invokes onClose when close button is pressed", async () => {
      const onClose = jest.fn();
      const { getByTestId } = await render(
        <PrescriptionViewerModal
          visible={true}
          prescription={mockPrescription}
          onClose={onClose}
        />
      );

      fireEvent.press(getByTestId("btn-close-prescription-viewer"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
