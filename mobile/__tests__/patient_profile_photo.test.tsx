/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Profile Photo & Crop Management Test Suite
 * Sathus Technology Pvt Ltd
 *
 * Verifies the complete Patient Profile Photo UX flow:
 * 1. Profile photo rendering with Camera edit badge and Verified Check badge.
 * 2. Opening the "Update Profile Picture" bottom sheet (Take Photo, Choose Gallery, View, Remove).
 * 3. Opening the "Crop & Adjust" modal with 3x3 grid overlay and rotate/zoom/fit controls.
 * 4. Multi-stage "Uploading Photo..." progress modal (Preparing, Uploading, Processing, Saving).
 * 5. Celebration success modal "Profile Picture Updated" with OK button.
 * 6. Contact Information Edit Form reset button to restore defaults.
 * 7. Identity isolation: Profile photo updates NEVER modify identity verification status.
 */

import React from "react";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import { Alert } from "react-native";
import PatientProfileScreen from "../app/(patient)/profile";
import { patientApi } from "../src/services/api/patient";

jest.setTimeout(45000);

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
    canGoBack: () => true,
  }),
}));

// Mock AuthContext
const mockLogout = jest.fn();
jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "usr-1001",
      username: "9884240519",
      name: "Alice Smith",
      roles: ["PATIENT"],
      hospital_name: "Apollo City Hospital – Chennai Central",
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

describe("PatientProfileScreen — Photo & Edit Workflow", () => {
  const mockProfile = {
    id: "pat-1001",
    user_id: "usr-1001",
    onehealth_id: "OHID-IND-2026-01001",
    name: "Alice Smith",
    phone: "9884240519",
    email: "alice.smith@example.com",
    gender: "Female",
    dob: "1994-01-01",
    age: 32,
    blood_group: "O+",
    address: "12 Anna Salai, T. Nagar",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600017",
    emergency_contact: "John Smith (+91 98765 43210)",
    preferred_language: "English",
    status: "Active Verified",
    verification_status: "VERIFIED_ACTIVE",
    hospital_name: "Apollo City Hospital – Chennai Central",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (patientApi.getMyProfile as jest.Mock).mockResolvedValue(mockProfile);
    (patientApi.getFamilyMembers as jest.Mock).mockResolvedValue([]);
    (patientApi.updateMyProfile as jest.Mock).mockResolvedValue({
      ...mockProfile,
      phone: "9884240519",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders circular profile photo with camera edit badge and verified identity tag", async () => {
    const { getByTestId, getByText } = await render(<PatientProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("patient-avatar-image")).toBeTruthy();
      expect(getByTestId("btn-avatar-camera")).toBeTruthy();
      expect(getByText("Alice Smith")).toBeTruthy();
      expect(getByText("Verified Identity")).toBeTruthy();
      expect(getByText("OHID-IND-2026-01001")).toBeTruthy();
      expect(getByText("Apollo City Hospital – Chennai Central")).toBeTruthy();
    });
  });

  it("handles profile photo management: sheet, crop/adjust, multi-stage upload, and celebration modal", async () => {
    const { getByTestId, getByText, queryByTestId } = await render(<PatientProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("btn-avatar-camera")).toBeTruthy();
      expect(getByText("Verified Identity")).toBeTruthy();
    });

    // 1. Open "Update Profile Picture" bottom sheet
    fireEvent.press(getByTestId("btn-avatar-camera"));

    await waitFor(() => {
      expect(getByTestId("update-profile-picture-sheet")).toBeTruthy();
      expect(getByText("Update Profile Picture")).toBeTruthy();
      expect(getByTestId("option-take-photo")).toBeTruthy();
      expect(getByTestId("option-choose-gallery")).toBeTruthy();
      expect(getByTestId("option-view-photo")).toBeTruthy();
      expect(getByTestId("option-remove-photo")).toBeTruthy();
      expect(getByTestId("cancel-photo-sheet")).toBeTruthy();
    });

    // 2. Select "Choose from Gallery" option to launch Crop & Adjust modal
    fireEvent.press(getByTestId("option-choose-gallery"));

    await waitFor(() => {
      expect(getByTestId("crop-adjust-modal")).toBeTruthy();
      expect(getByText("Crop & Adjust")).toBeTruthy();
      expect(getByTestId("crop-preview-image")).toBeTruthy();
      expect(getByTestId("crop-rotate-btn")).toBeTruthy();
      expect(getByTestId("crop-zoom-btn")).toBeTruthy();
      expect(getByTestId("crop-fit-btn")).toBeTruthy();
      expect(getByTestId("crop-apply-btn")).toBeTruthy();
    });

    // 3. Test Crop controls: Rotate, Zoom, Fit
    fireEvent.press(getByTestId("crop-rotate-btn"));
    await waitFor(() => {
      expect(getByText(/Rotate \(90°\)/)).toBeTruthy();
    });

    fireEvent.press(getByTestId("crop-zoom-btn"));
    await waitFor(() => {
      expect(getByText(/Zoom/)).toBeTruthy();
    });

    fireEvent.press(getByTestId("crop-fit-btn"));
    await waitFor(() => {
      expect(getByText("Rotate")).toBeTruthy();
      expect(getByText("Zoom")).toBeTruthy();
    });

    // 4. Press "Apply" to start Multi-Stage Uploading progress
    fireEvent.press(getByTestId("crop-apply-btn"));

    await waitFor(() => {
      expect(getByTestId("uploading-photo-modal")).toBeTruthy();
      expect(getByText("Uploading Photo...")).toBeTruthy();
      expect(getByText("Preparing photo")).toBeTruthy();
      expect(getByText("Uploading to secure server")).toBeTruthy();
      expect(getByText("Processing image")).toBeTruthy();
      expect(getByText("Saving profile picture")).toBeTruthy();
    });

    // 5. Upload finishes and celebration confirmation modal is displayed
    await waitFor(
      () => {
        expect(getByTestId("profile-photo-success-modal")).toBeTruthy();
        expect(getByText("Profile Picture Updated")).toBeTruthy();
        expect(getByText("Your profile picture has been successfully updated.")).toBeTruthy();
      },
      { timeout: 8000 }
    );

    // 6. Dismiss celebration modal
    fireEvent.press(getByTestId("photo-success-ok-btn"));

    await waitFor(() => {
      expect(queryByTestId("profile-photo-success-modal")).toBeNull();
      // Strict rule verification: Identity verification status is preserved and unmutated
      expect(getByText("Verified Identity")).toBeTruthy();
      expect(getByText("OHID-IND-2026-01001")).toBeTruthy();
    });
  });

  it("handles remove photo action without altering verified identity attributes", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((title, msg, buttons: any) => {
      const removeBtn = buttons?.find((b: any) => b.text === "Remove");
      if (removeBtn?.onPress) {
        removeBtn.onPress();
      }
    });

    const { getByTestId, getByText, queryByTestId } = await render(<PatientProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("btn-avatar-camera")).toBeTruthy();
    });

    // Open sheet
    fireEvent.press(getByTestId("btn-avatar-camera"));

    await waitFor(() => {
      expect(getByTestId("option-remove-photo")).toBeTruthy();
    });

    // Press Remove Photo option
    fireEvent.press(getByTestId("option-remove-photo"));

    await waitFor(() => {
      // Avatar falls back to circular initials without crashing
      expect(getByText("A")).toBeTruthy();
      // Identity status remains intact
      expect(getByText("Verified Identity")).toBeTruthy();
    });

    alertSpy.mockRestore();
  });

  it("resets contact info form to profile defaults when Reset button is pressed", async () => {
    const { getByTestId, getByText } = await render(<PatientProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("edit-profile-btn")).toBeTruthy();
    });

    fireEvent.press(getByTestId("edit-profile-btn"));

    await waitFor(() => {
      expect(getByTestId("edit-phone-input")).toBeTruthy();
      expect(getByTestId("reset-profile-btn")).toBeTruthy();
    });

    const phoneInput = getByTestId("edit-phone-input");
    fireEvent.changeText(phoneInput, "9999999999");

    await waitFor(() => {
      expect(phoneInput.props.value).toBe("9999999999");
    });

    fireEvent.press(getByTestId("reset-profile-btn"));

    await waitFor(() => {
      expect(phoneInput.props.value).toBe("9884240519");
    });
  });
});

