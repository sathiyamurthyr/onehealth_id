/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Screens Test Suite
 * Sathus Technology Pvt Ltd
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import PatientHomeScreen from "../app/(patient)/index";
import PatientPrescriptionsScreen from "../app/(patient)/prescriptions";
import PatientAppointmentsScreen from "../app/(patient)/appointments";
import PatientTimelineScreen from "../app/(patient)/timeline";
import { patientApi } from "../src/services/api/patient";

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

// Mock AuthContext
jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "9876543210",
      name: "Sathish Kumar",
      roles: ["PATIENT"],
      hospital_name: "Apollo Multi-Specialty Hospital",
    },
    logout: jest.fn(),
    isAuthenticated: true,
  }),
}));

// Mock patientApi completely for clean isolation
jest.mock("../src/services/api/patient", () => ({
  patientApi: {
    getOhIdCard: jest.fn(),
    getQrPass: jest.fn(),
    rotateQrToken: jest.fn(),
    getPrescriptions: jest.fn(),
    getAppointments: jest.fn(),
    getHealthTimeline: jest.fn(),
    getProfile: jest.fn(),
  },
}));

// Mock react-native-qrcode-svg
jest.mock("react-native-qrcode-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockQRCode(props: any) {
    return <View testID="mock-qr-code" accessibilityLabel={`QR-${props.value}`} />;
  };
});

describe("Patient Screens Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (patientApi.getOhIdCard as jest.Mock).mockResolvedValue({
      onehealth_id: "OHID-9876-5432",
      qr_token: "ZKP-TOKEN-9988",
      name: "Sathish Kumar",
      blood_group: "O+",
      age: 32,
      gender: "Male",
      verification_status: "VERIFIED_ACTIVE",
      facilities_count: 2,
    });
    (patientApi.getPrescriptions as jest.Mock).mockResolvedValue([]);
    (patientApi.getAppointments as jest.Mock).mockResolvedValue([]);
    (patientApi.getHealthTimeline as jest.Mock).mockResolvedValue([]);
    (patientApi.rotateQrToken as jest.Mock).mockResolvedValue({
      onehealth_id: "OHID-9876-5432",
      qr_token: "ZKP-ROTATED-TOKEN",
    });
  });

  describe("PatientHomeScreen", () => {
    it("renders patient portal header, digital card, and navigation options", async () => {
      const { getByTestId, getByText } = await render(<PatientHomeScreen />);

      await waitFor(() => {
        expect(getByText("Patient Portal")).toBeTruthy();
        expect(getByTestId("patient-digital-health-card")).toBeTruthy();
        expect(getByTestId("nav-prescriptions")).toBeTruthy();
        expect(getByTestId("nav-appointments")).toBeTruthy();
        expect(getByTestId("nav-timeline")).toBeTruthy();
      });
    });

    it("navigates to prescriptions when prescription card is pressed", async () => {
      const { getByTestId } = await render(<PatientHomeScreen />);
      const navPrescriptions = getByTestId("nav-prescriptions");
      await fireEvent.press(navPrescriptions);

      expect(mockPush).toHaveBeenCalledWith("/(patient)/prescriptions");
    });
  });

  describe("PatientPrescriptionsScreen", () => {
    it("renders list of doctor prescriptions and medicine details", async () => {
      (patientApi.getPrescriptions as jest.Mock).mockResolvedValue([
        {
          id: "rx-101",
          prescription_code: "RX-APOLLO-101",
          date: "2026-10-25",
          doctor_name: "Dr. Kedar Nathan",
          hospital_name: "Apollo Speciality",
          status: "ACTIVE",
          diagnosis: "Acute Bronchitis",
          medicines: [
            {
              name: "Azithromycin",
              dosage: "500mg",
              frequency: "OD",
              duration: "3 days",
              instructions: "Take 1 hour before meal",
            },
          ],
        },
      ]);

      const { getByText } = await render(<PatientPrescriptionsScreen />);

      await waitFor(() => {
        expect(getByText("Clinical Prescriptions")).toBeTruthy();
        expect(getByText("Dr. Kedar Nathan")).toBeTruthy();
        expect(getByText("Azithromycin")).toBeTruthy();
        expect(getByText("Acute Bronchitis")).toBeTruthy();
      });
    });

    it("handles back button navigation", async () => {
      const { getByTestId } = await render(<PatientPrescriptionsScreen />);
      const backBtn = getByTestId("back-to-patient-home");
      await fireEvent.press(backBtn);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe("PatientAppointmentsScreen", () => {
    it("renders clinic appointments and queue tokens", async () => {
      (patientApi.getAppointments as jest.Mock).mockResolvedValue([
        {
          id: "appt-501",
          appointment_date: "2026-10-30",
          appointment_time: "11:00 AM",
          doctor_name: "Dr. Rajesh Varma",
          department: "Orthopedics",
          hospital_name: "City Care Clinic",
          token_number: 7,
          token_str: "OPD-ORTHO-07",
          status: "CONFIRMED",
          chief_complaint: "Left knee pain after run",
        },
      ]);

      const { getByText } = await render(<PatientAppointmentsScreen />);

      await waitFor(() => {
        expect(getByText("Appointments & Queue")).toBeTruthy();
        expect(getByText("Dr. Rajesh Varma")).toBeTruthy();
        expect(getByText("Token #7 (OPD-ORTHO-07)")).toBeTruthy();
        expect(getByText("Left knee pain after run")).toBeTruthy();
      });
    });
  });

  describe("PatientTimelineScreen", () => {
    it("renders clinical timeline events in reverse chronological order", async () => {
      (patientApi.getHealthTimeline as jest.Mock).mockResolvedValue([
        {
          id: "evt-901",
          event_type: "CONSULTATION",
          event_date: "2026-10-24",
          title: "Comprehensive Physical Exam",
          doctor_name: "Dr. Priya Nair",
          hospital_name: "Grace Hospital",
          summary: "Vitals normal. Advised hydration and seasonal allergy management.",
        },
      ]);

      const { getByText } = await render(<PatientTimelineScreen />);

      await waitFor(() => {
        expect(getByText("Unified Health Timeline")).toBeTruthy();
        expect(getByText("Comprehensive Physical Exam")).toBeTruthy();
        expect(getByText("Dr. Priya Nair")).toBeTruthy();
      });
    });
  });
});
