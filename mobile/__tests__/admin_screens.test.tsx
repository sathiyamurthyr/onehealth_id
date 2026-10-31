/**
 * ONEHEALTH ID (OH-ID) Mobile — Administration Workflows Test Suite
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

jest.setTimeout(15000);

import HospitalAdminHomeScreen from "../app/(admin)/index";
import SuperAdminHomeScreen from "../app/(super)/index";
import { adminApi } from "../src/services/api/admin";

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
      username: "9876543210",
      name: "Dr. Admin Chief",
      role: "HOSPITAL_ADMIN",
      hospital_name: "OneHealth Hospital — Main Branch",
    },
    token: "valid-admin-jwt",
    isAuthenticated: true,
  }),
}));

describe("Phase F: Administration Workflows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Hospital Administrator", () => {
    test("renders facility census, staff roster, and reconciliation controls", async () => {
      const { getByTestId, getByText, getAllByText } = await render(<HospitalAdminHomeScreen />);

      await waitFor(() => {
        expect(getByTestId("hospital-admin-screen")).toBeTruthy();
        expect(getByText("Hospital Admin")).toBeTruthy();
        expect(getAllByText("OneHealth Hospital — Main Branch").length).toBeGreaterThanOrEqual(1);
        expect(getByText("IPD Bed Occupancy")).toBeTruthy();
        expect(getByText("Active Clinical Staff Roster")).toBeTruthy();
        expect(getByTestId("btn-reconcile-ledger")).toBeTruthy();
      });
    });

    test("adjusts and commits IPD bed census", async () => {
      const bedSpy = jest.spyOn(adminApi, "updateBedOccupancy").mockResolvedValueOnce({
        occupied: 45,
        total: 50,
        percentage: 90,
      });

      const { getByTestId } = await render(<HospitalAdminHomeScreen />);

      await fireEvent.press(getByTestId("btn-open-bed-modal"));
      await waitFor(() => {
        expect(getByTestId("adjust-beds-modal")).toBeTruthy();
      });

      await fireEvent.changeText(getByTestId("input-occupied-beds"), "45");
      await fireEvent.press(getByTestId("btn-save-beds"));

      await waitFor(() => {
        expect(bedSpy).toHaveBeenCalledWith(45, 50);
      });
    });

    test("enrolls a new clinical staff member", async () => {
      const staffSpy = jest.spyOn(adminApi, "addStaffMember").mockResolvedValueOnce({
        id: "st-new-99",
        name: "Dr. Ramesh Sundaram",
        role: "DOCTOR",
        department: "Cardiology",
        mobile: "9876543299",
        license_no: "TN-MCI-2026-99112",
        status: "ACTIVE",
      });

      const { getByTestId, getByText } = await render(<HospitalAdminHomeScreen />);

      await fireEvent.press(getByTestId("btn-open-staff-modal"));
      await waitFor(() => {
        expect(getByTestId("enroll-staff-modal")).toBeTruthy();
      });

      await fireEvent.changeText(getByTestId("input-staff-name"), "Dr. Ramesh Sundaram");
      await fireEvent.press(getByTestId("role-chip-DOCTOR"));
      await fireEvent.changeText(getByTestId("input-staff-dept"), "Cardiology");
      await fireEvent.changeText(getByTestId("input-staff-phone"), "9876543299");
      await fireEvent.changeText(getByTestId("input-staff-license"), "TN-MCI-2026-99112");

      await fireEvent.press(getByTestId("btn-confirm-add-staff"));

      await waitFor(() => {
        expect(staffSpy).toHaveBeenCalledWith({
          name: "Dr. Ramesh Sundaram",
          role: "DOCTOR",
          department: "Cardiology",
          mobile: "9876543299",
          license_no: "TN-MCI-2026-99112",
        });
        expect(getByText("Dr. Ramesh Sundaram")).toBeTruthy();
      });
    });

    test("signs off on daily operational shift reconciliation", async () => {
      const { getByTestId, getByText } = await render(<HospitalAdminHomeScreen />);

      const reconcileBtn = getByTestId("btn-reconcile-ledger");
      await fireEvent.press(reconcileBtn);

      await waitFor(() => {
        expect(getByText(/Reconciled & Cryptographically Stamped/i)).toBeTruthy();
      });
    });
  });

  describe("Platform Super Administrator", () => {
    test("renders platform governance and cryptographic status card", async () => {
      const { getByTestId, getByText } = await render(<SuperAdminHomeScreen />);

      await waitFor(() => {
        expect(getByTestId("super-admin-screen")).toBeTruthy();
        expect(getByText("Super Admin Portal")).toBeTruthy();
        expect(getByText("Sathus Platform Administration")).toBeTruthy();
        expect(getByTestId("crypto-status-card")).toBeTruthy();
        expect(getByText("AES-256-GCM")).toBeTruthy();
        expect(getByText("ECDH P-256")).toBeTruthy();
      });
    });

    test("executes live cryptographic handshake diagnostics", async () => {
      const cryptoSpy = jest.spyOn(adminApi, "testCryptographicSubsystem").mockResolvedValueOnce({
        handshakeSuccess: true,
        keyId: "KEY-SESSION-SUPER-TEST",
        algorithm: "AES-256-GCM (Authenticated)",
        keyDerivation: "NIST P-256 ECDH + HKDF-SHA256",
        timestamp: Date.now(),
      });

      const { getByTestId, getByText } = await render(<SuperAdminHomeScreen />);

      await fireEvent.press(getByTestId("btn-run-crypto-test"));

      await waitFor(() => {
        expect(cryptoSpy).toHaveBeenCalled();
        expect(getByTestId("crypto-test-result")).toBeTruthy();
        expect(getByText(/Handshake Verified: AES-256-GCM/i)).toBeTruthy();
      });
    });

    test("reviews hospital onboarding application with dual-auth operator OTP", async () => {
      const reviewSpy = jest.spyOn(adminApi, "reviewHospitalApplication").mockResolvedValueOnce({
        success: true,
        applicationId: "app-01",
        status: "APPROVED",
        audit_id: "AUDIT-STAMP-TEST-001",
      });

      const { getByTestId, getByText } = await render(<SuperAdminHomeScreen />);

      await waitFor(() => {
        expect(getByTestId("btn-approve-app-01")).toBeTruthy();
      });

      await fireEvent.press(getByTestId("btn-approve-app-01"));

      await waitFor(() => {
        expect(getByTestId("super-admin-review-modal")).toBeTruthy();
      });

      await fireEvent.changeText(getByTestId("input-review-reason"), "Verified NABH infrastructure");
      await fireEvent.changeText(getByTestId("input-operator-otp"), "654321");

      await fireEvent.press(getByTestId("btn-confirm-review-action"));

      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith(
          "app-01",
          "APPROVED",
          "Verified NABH infrastructure",
          "654321"
        );
        expect(getByTestId("review-success-state")).toBeTruthy();
        expect(getByText("Application Updated")).toBeTruthy();
      });
    });
  });
});
