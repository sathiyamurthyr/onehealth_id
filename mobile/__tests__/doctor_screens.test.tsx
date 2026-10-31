/**
 * ONEHEALTH ID (OH-ID) Mobile — Doctor Screens Test Suite
 * Sathus Technology Pvt Ltd
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

jest.setTimeout(15000);

import DoctorHomeScreen from "../app/(doctor)/index";
import DoctorScanScreen from "../app/(doctor)/scan";
import DoctorConsultationScreen from "../app/(doctor)/consultation";
import DoctorRxPadScreen from "../app/(doctor)/rxpad";
import { doctorApi } from "../src/services/api/doctor";

// Mock router
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    patient_id: "p-test-101",
    patient_name: "Aakash Verma",
    onehealth_id: "OHID-AAKASH-01",
    token_str: "OPD-GEN-01",
  }),
}));

// Mock AuthContext
jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "9876543210",
      name: "Dr. Senthil Kumar",
      roles: ["DOCTOR"],
      hospital_name: "OneHealth Hospital",
    },
    logout: jest.fn(),
    isAuthenticated: true,
  }),
}));

// Mock expo-camera
jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    CameraView: (props: any) => <View testID="mock-camera-view" {...props} />,
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

// Mock doctorApi
jest.mock("../src/services/api/doctor", () => ({
  doctorApi: {
    getProfile: jest.fn(),
    getQueue: jest.fn(),
    getPatientContext: jest.fn(),
    recordConsultation: jest.fn(),
    createPrescription: jest.fn(),
    resolveQrWorkflow: jest.fn(),
    updateQueueStatus: jest.fn(),
  },
}));

describe("Doctor Screens Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (doctorApi.getProfile as jest.Mock).mockResolvedValue({
      id: "doc-101",
      user_id: "9876543210",
      name: "Dr. Senthil Kumar",
      specialty: "General Medicine",
      qualification: "MBBS, MD",
      registration_number: "TN-MCI-2026-64829",
      room_number: "Room 101",
      current_hospital_name: "OneHealth Hospital",
      current_hospital_id: "hosp-kedar",
    });

    (doctorApi.getQueue as jest.Mock).mockResolvedValue([
      {
        id: "q-01",
        token_number: 1,
        token_str: "OPD-GEN-01",
        patient_id: "p-101",
        patient_name: "Aakash Verma",
        onehealth_id: "OHID-AAKASH-01",
        age: 42,
        gender: "Male",
        priority: "URGENT",
        status: "WAITING",
        chief_complaint: "High fever (102°F) and breathing difficulty",
        wait_time_minutes: 5,
      },
    ]);
  });

  describe("DoctorHomeScreen", () => {
    it("renders doctor credentials, facility info, and queue items", async () => {
      const { getByText, getAllByText, getByTestId } = await render(<DoctorHomeScreen />);

      await waitFor(() => {
        expect(getByText("Doctor Workspace")).toBeTruthy();
        expect(getAllByText("Dr. Senthil Kumar").length).toBeGreaterThanOrEqual(1);
        expect(getByText(/TN-MCI-2026-64829/)).toBeTruthy();
        expect(getByTestId("queue-item-q-01")).toBeTruthy();
        expect(getByText("Aakash Verma")).toBeTruthy();
        expect(getByText("High fever (102°F) and breathing difficulty")).toBeTruthy();
      });
    });

    it("launches consultation when Start Consult is pressed", async () => {
      const { getByTestId } = await render(<DoctorHomeScreen />);

      await waitFor(() => {
        expect(getByTestId("btn-start-consult-q-01")).toBeTruthy();
      });

      const startBtn = getByTestId("btn-start-consult-q-01");
      await fireEvent.press(startBtn);

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/(doctor)/consultation",
          params: expect.objectContaining({
            patient_id: "p-101",
            patient_name: "Aakash Verma",
          }),
        })
      );
    });

    it("navigates to QR scanner and RxPad when action buttons are pressed", async () => {
      const { getByTestId } = await render(<DoctorHomeScreen />);

      const scanBtn = getByTestId("btn-scan-patient-qr");
      await fireEvent.press(scanBtn);
      expect(mockPush).toHaveBeenCalledWith("/(doctor)/scan");

      const rxpadBtn = getByTestId("btn-open-rxpad");
      await fireEvent.press(rxpadBtn);
      expect(mockPush).toHaveBeenCalledWith("/(doctor)/rxpad");
    });
  });

  describe("DoctorScanScreen", () => {
    it("renders camera viewfinder by default and switches to manual entry", async () => {
      const { getByTestId, queryByTestId } = await render(<DoctorScanScreen />);

      expect(getByTestId("tab-camera-mode")).toBeTruthy();
      expect(getByTestId("tab-manual-mode")).toBeTruthy();
      expect(getByTestId("mock-camera-view")).toBeTruthy();

      // Switch to manual mode
      const manualTab = getByTestId("tab-manual-mode");
      await fireEvent.press(manualTab);

      expect(queryByTestId("mock-camera-view")).toBeNull();
      expect(getByTestId("manual-code-input")).toBeTruthy();
    });

    it("resolves manual OneHealth ID and renders patient details card", async () => {
      (doctorApi.resolveQrWorkflow as jest.Mock).mockResolvedValueOnce({
        patient_id: "p-resolved-99",
        patient_name: "Deepika Padukone",
        onehealth_id: "OHID-DEEPIKA-99",
        age: 38,
        gender: "Female",
        blood_group: "B+",
        workflow_type: "OPD_CONSULTATION",
      });

      const { getByTestId, getByText } = await render(<DoctorScanScreen />);

      const manualTab = getByTestId("tab-manual-mode");
      await fireEvent.press(manualTab);

      const input = getByTestId("manual-code-input");
      await fireEvent.changeText(input, "OHID-DEEPIKA-99");

      const submitBtn = getByTestId("submit-manual-code-btn");
      await fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(getByTestId("scan-result-card")).toBeTruthy();
        expect(getByText("Deepika Padukone")).toBeTruthy();
        expect(getByText("OHID-DEEPIKA-99")).toBeTruthy();
        expect(getByText("38 Yrs")).toBeTruthy();
      });
    });
  });

  describe("DoctorConsultationScreen", () => {
    it("renders patient encounter banner, vitals, and diagnosis fields", async () => {
      const { getByText, getByTestId } = await render(<DoctorConsultationScreen />);

      expect(getByText("Clinical Encounter")).toBeTruthy();
      expect(getByText("Aakash Verma")).toBeTruthy();
      expect(getByText("OPD-GEN-01")).toBeTruthy();
      expect(getByTestId("vital-bp-systolic")).toBeTruthy();
      expect(getByTestId("vital-heart-rate")).toBeTruthy();
      expect(getByTestId("input-primary-diagnosis")).toBeTruthy();
    });

    it("allows adding a medication to the prescription list", async () => {
      const { getByTestId, getByText } = await render(<DoctorConsultationScreen />);

      const drugNameInput = getByTestId("input-drug-name");
      await fireEvent.changeText(drugNameInput, "Amoxicillin");

      const addBtn = getByTestId("btn-add-drug");
      await fireEvent.press(addBtn);

      expect(getByText(/Amoxicillin/)).toBeTruthy();
    });

    it("opens 4-digit digital signing PIN modal and finalizes encounter", async () => {
      (doctorApi.recordConsultation as jest.Mock).mockResolvedValueOnce({
        message: "Consultation encounter successfully finalized and recorded.",
        consultation_id: "c-1234",
        digital_signature: "SHA256:4f8e91a0c8d7...VERIFIED",
      });

      const { getByTestId, getByText } = await render(<DoctorConsultationScreen />);

      const finalizeBtn = getByTestId("btn-finalize-consultation");
      await fireEvent.press(finalizeBtn);

      // PIN modal is visible
      expect(getByTestId("digital-signing-modal")).toBeTruthy();

      const pinInput = getByTestId("input-doctor-pin");
      await fireEvent.changeText(pinInput, "1234");

      const confirmSignBtn = getByTestId("btn-confirm-sign");
      await fireEvent.press(confirmSignBtn);

      await waitFor(() => {
        expect(doctorApi.recordConsultation).toHaveBeenCalledWith(
          "p-test-101",
          expect.objectContaining({
            prescription: expect.objectContaining({
              verification_pin: "1234",
              requires_pin: true,
            }),
          })
        );
        expect(getByTestId("signing-success-box")).toBeTruthy();
        expect(getByText("Encounter Digitally Signed")).toBeTruthy();
      });
    });
  });

  describe("DoctorRxPadScreen", () => {
    it("renders standalone prescription builder and signs prescription", async () => {
      (doctorApi.createPrescription as jest.Mock).mockResolvedValueOnce({
        message: "Prescription created and signed",
        prescription_id: "rx-999",
        digital_signature: "SHA256:rx999sig...VERIFIED",
      });

      const { getByTestId, getByText } = await render(<DoctorRxPadScreen />);

      expect(getByText("Digital RxPad")).toBeTruthy();
      expect(getByTestId("rxpad-patient-name")).toBeTruthy();
      expect(getByTestId("rxpad-diagnosis")).toBeTruthy();

      const signBtn = getByTestId("btn-sign-prescription");
      await fireEvent.press(signBtn);

      const pinInput = getByTestId("rxpad-input-pin");
      await fireEvent.changeText(pinInput, "1234");

      const confirmBtn = getByTestId("rxpad-btn-confirm-sign");
      await fireEvent.press(confirmBtn);

      await waitFor(() => {
        expect(doctorApi.createPrescription).toHaveBeenCalled();
        expect(getByTestId("rxpad-success-box")).toBeTruthy();
        expect(getByText("Prescription Issued")).toBeTruthy();
      });
    });
  });
});
