/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Profile Test Suite
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import { Alert } from "react-native";
import PatientProfileScreen from "../app/(patient)/profile";
import { patientApi } from "../src/services/api/patient";

jest.setTimeout(25000);

// Mock Modal for deterministic portal unmounting
jest.mock("react-native/Libraries/Modal/Modal", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  const MockModal = (props: any) => {
    return props.visible ? React.createElement(View, { testID: "mock-modal" }, props.children) : null;
  };
  return {
    __esModule: true,
    default: MockModal,
  };
});

// Mock router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
}));

// Mock AuthContext
const mockLogout = jest.fn();
jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "usr-1001",
      username: "9876543210",
      name: "Alice Smith",
      roles: ["PATIENT"],
      hospital_name: "Kedar Hospital Network",
    },
    logout: mockLogout,
    isAuthenticated: true,
  }),
}));

// Mock patientApi
jest.mock("../src/services/api/patient", () => ({
  patientApi: {
    getMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
    getFamilyMembers: jest.fn(),
    addFamilyMember: jest.fn(),
    removeFamilyMember: jest.fn(),
    getOhIdCard: jest.fn(),
  },
}));

describe("PatientProfileScreen Integration", () => {
  const mockProfile = {
    id: "pat-1001",
    user_id: "usr-1001",
    onehealth_id: "OHID-IND-2026-01001",
    name: "Alice Smith",
    phone: "9840199999",
    email: "alice.smith@example.com",
    gender: "Female",
    dob: "1994-01-01",
    age: 32,
    blood_group: "O+",
    address: "42 Healthcare Avenue, Anna Nagar",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600040",
    emergency_contact: "John Smith (+91 98765 43210)",
    allergies: ["Penicillin"],
    preferred_language: "English",
    status: "Active Verified",
    hospital_name: "Kedar Hospital Network",
  };

  const mockFamily = [
    {
      id: "fam-rel-01",
      patient_id: "pat-1001",
      member_patient_id: "pat-2002",
      member_name: "Maya Smith",
      member_onehealth_id: "OHID-IND-2026-02002",
      relationship: "Child",
      member_age: 6,
      member_gender: "Female",
      is_guardian: true,
      permissions: {
        view_appointments: true,
        book_appointments: true,
        view_records: true,
      },
      created_at: "2026-01-15T00:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (patientApi.getMyProfile as jest.Mock).mockResolvedValue(mockProfile);
    (patientApi.getFamilyMembers as jest.Mock).mockResolvedValue(mockFamily);
    (patientApi.updateMyProfile as jest.Mock).mockResolvedValue({
      ...mockProfile,
      phone: "9840188888",
    });
    (patientApi.addFamilyMember as jest.Mock).mockResolvedValue({
      id: "fam-rel-02",
      patient_id: "pat-1001",
      member_patient_id: "pat-3003",
      member_name: "David Smith",
      member_onehealth_id: "OHID-IND-2026-03003",
      relationship: "Spouse",
      member_age: 30,
      member_gender: "Male",
      is_guardian: false,
      permissions: {
        view_appointments: true,
        book_appointments: true,
        view_records: true,
      },
      created_at: "2026-01-16T00:00:00Z",
    });
    (patientApi.removeFamilyMember as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders verified hero card, contact details, and family members", async () => {
    const { getByText } = await render(<PatientProfileScreen />);

    await waitFor(() => {
      expect(getByText("Personal Health Profile")).toBeTruthy();
      expect(getByText("Alice Smith")).toBeTruthy();
      expect(getByText("OHID-IND-2026-01001")).toBeTruthy();
      expect(getByText("Verified Identity")).toBeTruthy();
      expect(getByText("Maya Smith")).toBeTruthy();
      expect(getByText("OHID-IND-2026-02002")).toBeTruthy();
    });
  });

  it("toggles edit mode, fills updated contact info, and saves profile", async () => {
    const { getByTestId, getByText } = await render(<PatientProfileScreen />);

    await waitFor(() => {
      expect(getByText("Personal Health Profile")).toBeTruthy();
      expect(getByTestId("edit-profile-btn")).toBeTruthy();
    });

    fireEvent.press(getByTestId("edit-profile-btn"));

    await waitFor(() => {
      expect(getByTestId("edit-phone-input")).toBeTruthy();
      expect(
        getByText(/Verified identity attributes .* are officially guarded/)
      ).toBeTruthy();
    });

    const phoneInput = getByTestId("edit-phone-input");
    fireEvent.changeText(phoneInput, "9840188888");

    await waitFor(() => {
      expect(phoneInput.props.value).toBe("9840188888");
    });

    fireEvent.press(getByTestId("save-profile-btn"));

    await waitFor(() => {
      expect(patientApi.updateMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "9840188888",
        })
      );
    });
  });

  it("handles unlinking a family member with confirmation", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((title, msg, buttons: any) => {
      const unlinkBtn = buttons?.find((b: any) => b.text === "Unlink");
      if (unlinkBtn?.onPress) {
        unlinkBtn.onPress();
      }
    });

    const screen = await render(<PatientProfileScreen />);

    await waitFor(
      () => {
        expect(screen.getByText("Personal Health Profile")).toBeTruthy();
        expect(screen.getByTestId("unlink-family-fam-rel-01")).toBeTruthy();
      },
      { timeout: 5000 }
    );

    fireEvent.press(screen.getByTestId("unlink-family-fam-rel-01"));

    await waitFor(
      () => {
        expect(patientApi.removeFamilyMember).toHaveBeenCalledWith("fam-rel-01");
      },
      { timeout: 5000 }
    );

    alertSpy.mockRestore();
  });

  it("handles sign out and returns to login screen", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((title, msg, buttons: any) => {
      const signoutBtn = buttons?.find((b: any) => b.text === "Sign Out");
      if (signoutBtn?.onPress) {
        signoutBtn.onPress();
      }
    });

    const { getByTestId, getByText } = await render(<PatientProfileScreen />);

    await waitFor(
      () => {
        expect(getByText("Personal Health Profile")).toBeTruthy();
        expect(getByTestId("logout-btn")).toBeTruthy();
      },
      { timeout: 5000 }
    );

    fireEvent.press(getByTestId("logout-btn"));

    await waitFor(
      () => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
      },
      { timeout: 5000 }
    );

    alertSpy.mockRestore();
  });

  it("opens add family modal and creates family link", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByTestId, getByText } = await render(<PatientProfileScreen />);

    await waitFor(() => {
      expect(getByText("Personal Health Profile")).toBeTruthy();
      expect(getByTestId("add-family-btn")).toBeTruthy();
    });

    fireEvent.press(getByTestId("add-family-btn"));

    await waitFor(() => {
      expect(getByTestId("family-name-input")).toBeTruthy();
    });

    const nameInput = getByTestId("family-name-input");
    const relInput = getByTestId("family-rel-input");
    fireEvent.changeText(nameInput, "David Smith");
    fireEvent.changeText(relInput, "Spouse");

    await waitFor(() => {
      expect(nameInput.props.value).toBe("David Smith");
    });

    fireEvent.press(getByTestId("submit-add-family-btn"));

    await waitFor(
      () => {
        expect(patientApi.addFamilyMember).toHaveBeenCalledWith(
          expect.objectContaining({
            relationship: "Spouse",
            new_member: expect.objectContaining({ name: "David Smith" }),
          })
        );
        expect(alertSpy).toHaveBeenCalledWith("Success", "Family member linked successfully.");
      },
      { timeout: 5000 }
    );

    alertSpy.mockRestore();
  });
});
