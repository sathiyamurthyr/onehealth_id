/**
 * ONEHEALTH ID (OH-ID) Mobile — Family Member Profile & Management Tests
 * 
 * Verifies:
 * - Interactive family member card selection and navigation from profile screen.
 * - Dedicated family member profile rendering (demographics, guardian banner, clinical info).
 * - Emergency contact editing with 10-digit validation and API persistence.
 * - Isolated appointments and health timeline loading for dependents.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import React from "react";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import FamilyMemberProfileScreen from "../app/(patient)/family_member";
import PatientProfileScreen from "../app/(patient)/profile";
import { patientApi } from "../src/services/api/patient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

jest.setTimeout(15000);

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock("../src/context/AuthContext", () => {
  const actual = jest.requireActual("../src/context/AuthContext");
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

jest.mock("../src/services/api/patient", () => ({
  patientApi: {
    getMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
    getFamilyMembers: jest.fn(),
    removeFamilyMember: jest.fn(),
    getAppointments: jest.fn(),
    getHealthTimeline: jest.fn(),
    getQrPass: jest.fn(),
  },
}));

describe("OH-ID Mobile — Family Member Profile & Selection Suite", () => {
  let mockPush: jest.Mock;
  let mockBack: jest.Mock;

  const mockCharlieProfile = {
    id: "p-103",
    name: "Charlie Smith",
    onehealth_id: "OHID-IND-2026-01003",
    age: 7,
    gender: "Male",
    blood_group: "B+ Positive",
    emergency_contact: "+91 98842 40519",
    primary_condition: "Childhood Allergic Bronchitis",
    allergies: ["Peanuts & Tree Nuts"],
    primary_hospital: "Children's Specialty Clinic",
  };

  const mockFamilyMembers = [
    {
      id: "rel-101-103",
      primary_patient_id: "p-101",
      member_patient_id: "p-103",
      relationship: "Son",
      is_guardian: true,
      is_minor: true,
      consent_status: "ACTIVE",
      member_name: "Charlie Smith",
      member_onehealth_id: "OHID-IND-2026-01003",
      member_age: 7,
      member_gender: "Male",
      permissions: {
        view_appointments: true,
        view_records: true,
        manage_profile: true,
      },
    },
  ];

  const mockAppointments = [
    {
      id: "appt-901",
      appointment_date: "2026-11-05",
      appointment_time: "10:30 AM",
      doctor_name: "Dr. Ananya Sharma",
      department: "Pediatrics",
      hospital_name: "Children's Specialty Clinic",
      status: "CONFIRMED" as const,
    },
  ];

  const mockTimeline = [
    {
      id: "tl-801",
      event_type: "CONSULTATION",
      event_date: "2026-10-15",
      title: "Pediatric Consultation",
      summary: "Routine checkup and bronchial evaluation.",
      hospital_name: "Children's Specialty Clinic",
      status: "VERIFIED",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockPush = jest.fn();
    mockBack = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: mockBack,
    });

    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: "p-103",
      relationship_id: "rel-101-103",
      name: "Charlie Smith",
      relationship: "Son",
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: "p-101", username: "9884240519", name: "Alice Smith", role: "PATIENT" },
      token: "mock-jwt",
      isLoading: false,
      isAuthenticated: true,
      logout: jest.fn(),
    });

    (patientApi.getMyProfile as jest.Mock).mockResolvedValue(mockCharlieProfile);
    (patientApi.getFamilyMembers as jest.Mock).mockResolvedValue(mockFamilyMembers);
    (patientApi.getAppointments as jest.Mock).mockResolvedValue(mockAppointments);
    (patientApi.getHealthTimeline as jest.Mock).mockResolvedValue(mockTimeline);
    (patientApi.getQrPass as jest.Mock).mockResolvedValue({
      onehealth_id: "OHID-IND-2026-01003",
      qr_token: "MOCK-ZK-TOKEN-103",
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Family Member Profile Screen", () => {
    it("renders member identity, demographics, and guardian authority banner", async () => {
      const { getAllByText, getByText } = await render(<FamilyMemberProfileScreen />);

      await waitFor(() => {
        expect(getAllByText("Charlie Smith").length).toBeGreaterThanOrEqual(1);
        expect(getByText(/Legal Guardian Authority • Minor Child/i)).toBeTruthy();
        expect(getByText("7 Yrs")).toBeTruthy();
        expect(getByText("Male")).toBeTruthy();
        expect(getByText("B+ Positive")).toBeTruthy();
        expect(getByText("OHID-IND-2026-01003")).toBeTruthy();
      });
    });

    it("displays clinical information with clinician-verified tag and allergies", async () => {
      const { getByText } = await render(<FamilyMemberProfileScreen />);

      await waitFor(() => {
        expect(getByText("Childhood Allergic Bronchitis")).toBeTruthy();
        expect(getByText("Peanuts & Tree Nuts")).toBeTruthy();
        expect(getByText(/Clinician-Verified by Dr. Ananya Sharma/i)).toBeTruthy();
      });
    });

    it("allows editing emergency contact with 10-digit validation and calls updateMyProfile", async () => {
      (patientApi.updateMyProfile as jest.Mock).mockResolvedValueOnce({
        ...mockCharlieProfile,
        emergency_contact: "+91 9176669426",
      });

      const { getByTestId, getByText } = await render(<FamilyMemberProfileScreen />);

      await waitFor(() => {
        expect(getByTestId("edit-emergency-btn")).toBeTruthy();
      });

      fireEvent.press(getByTestId("edit-emergency-btn"));

      await waitFor(() => {
        expect(getByTestId("emergency-phone-input")).toBeTruthy();
      });

      const phoneInput = getByTestId("emergency-phone-input");
      fireEvent.changeText(phoneInput, "9176669426");

      await waitFor(() => {
        expect(phoneInput.props.value).toBe("9176669426");
      });

      const saveBtn = getByTestId("save-emergency-btn");
      fireEvent.press(saveBtn);

      await waitFor(() => {
        expect(patientApi.updateMyProfile).toHaveBeenCalledWith(
          { emergency_contact: "+91 9176669426" },
          "p-103"
        );
        expect(getByText("Emergency contact updated successfully.")).toBeTruthy();
      });
    });

    it("renders isolated appointments and health timeline records for the selected dependent", async () => {
      const { getByText } = await render(<FamilyMemberProfileScreen />);

      await waitFor(() => {
        expect(getByText("Dr. Ananya Sharma")).toBeTruthy();
        expect(getByText("Pediatric Consultation")).toBeTruthy();
        expect(getByText("Routine checkup and bronchial evaluation.")).toBeTruthy();
      });

      expect(patientApi.getAppointments).toHaveBeenCalledWith("p-103");
      expect(patientApi.getHealthTimeline).toHaveBeenCalledWith({ patient_id: "p-103", limit: 10 });
    });

    it("opens Zero-Knowledge QR pass modal on button press", async () => {
      const { getByTestId, getByText } = await render(<FamilyMemberProfileScreen />);

      await waitFor(() => {
        expect(getByTestId("show-member-qr-btn")).toBeTruthy();
      });

      fireEvent.press(getByTestId("show-member-qr-btn"));

      await waitFor(() => {
        expect(getByText("Zero-Knowledge Healthcare Pass")).toBeTruthy();
      });

      expect(patientApi.getQrPass).toHaveBeenCalledWith("p-103");
    });
  });

  describe("Patient Profile Screen — Family Selection Integration", () => {
    it("navigates to individual family member screen when card is pressed", async () => {
      (patientApi.getMyProfile as jest.Mock).mockResolvedValue({
        id: "p-101",
        name: "Alice Smith",
        onehealth_id: "OHID-IND-2026-01001",
        age: 32,
        gender: "Female",
        phone: "9884240519",
        blood_group: "O+",
      });
      (patientApi.getFamilyMembers as jest.Mock).mockResolvedValue(mockFamilyMembers);

      const { getByTestId } = await render(<PatientProfileScreen />);

      await waitFor(() => {
        expect(getByTestId("family-member-rel-101-103")).toBeTruthy();
      });

      fireEvent.press(getByTestId("family-member-rel-101-103"));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/(patient)/family_member",
        params: {
          id: "p-103",
          relationship_id: "rel-101-103",
          name: "Charlie Smith",
          relationship: "Son",
        },
      });
    });
  });
});
