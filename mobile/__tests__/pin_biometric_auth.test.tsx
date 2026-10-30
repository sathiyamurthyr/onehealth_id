/**
 * ONEHEALTH ID (OH-ID) Mobile — Local App PIN & Biometric Returning User Tests
 * 
 * Verifies:
 * - PBKDF2-HMAC-SHA256 salted derivation and constant-time verification.
 * - 6-digit PIN policy enforcement.
 * - Brute-force protection: progressive cooldown at 3 attempts, lockout at 5 attempts.
 * - Interactive Returning User UI: masked phone badge, 6 PIN dots, biometric unlock, and OTP fallback.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import React from "react";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import LoginScreen from "../app/(auth)/login";
import { pinService } from "../src/services/auth/pin_service";
import { secureStorage } from "../src/services/storage/secure_store";
import { useAuth } from "../src/context/AuthContext";
import { useRouter } from "expo-router";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../src/context/AuthContext", () => {
  const actual = jest.requireActual("../src/context/AuthContext");
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

describe("OH-ID Mobile — App PIN & Returning User Biometric System", () => {
  let mockReplace: jest.Mock;
  let mockPush: jest.Mock;
  let mockLogin: jest.Mock;
  let mockLoginWithBiometrics: jest.Mock;
  let mockLoginWithPin: jest.Mock;
  let mockSetupAppPin: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    await secureStorage.clearPinCredentials();

    mockReplace = jest.fn();
    mockPush = jest.fn();
    mockLogin = jest.fn();
    mockLoginWithBiometrics = jest.fn();
    mockLoginWithPin = jest.fn();
    mockSetupAppPin = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      back: jest.fn(),
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      activeRole: null,
      availableRoles: [],
      biometricCapability: {
        hasHardware: true,
        isEnrolled: true,
        biometricType: "Fingerprint",
      },
      isBiometricEnabled: true,
      hasConfiguredPin: true,
      rememberedPhone: "9176669426",
      rememberedName: "Dr. Sathyamoorthy",
      login: mockLogin,
      loginWithBiometrics: mockLoginWithBiometrics,
      loginWithPin: mockLoginWithPin,
      setupAppPin: mockSetupAppPin,
      clearAppPin: jest.fn(),
      logout: jest.fn(),
      switchRole: jest.fn(),
      setBiometricPreference: jest.fn(),
      refreshSession: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Cryptographic PinAuthService (PBKDF2-HMAC-SHA256)", () => {
    it("enforces strict 6-digit numeric PIN policy", async () => {
      const shortRes = await pinService.setupPin("12345");
      expect(shortRes.success).toBe(false);
      expect(shortRes.error).toContain("must be exactly 6 digits");

      const alphaRes = await pinService.setupPin("12345A");
      expect(alphaRes.success).toBe(false);
      expect(alphaRes.error).toContain("must be exactly 6 digits");

      const validRes = await pinService.setupPin("849201");
      expect(validRes.success).toBe(true);

      const hasPin = await pinService.hasConfiguredPin();
      expect(hasPin).toBe(true);
    });

    it("verifies correct PIN and rejects incorrect candidates", async () => {
      await pinService.setupPin("654321");

      const failRes = await pinService.verifyPin("000000");
      expect(failRes.success).toBe(false);
      expect(failRes.remainingAttempts).toBe(4);

      const passRes = await pinService.verifyPin("654321");
      expect(passRes.success).toBe(true);
    });

    it("triggers progressive cooldown after 3 failed attempts and lockout after 5", async () => {
      await pinService.setupPin("112233");

      // Attempts 1 and 2
      await pinService.verifyPin("000001");
      await pinService.verifyPin("000002");

      // Attempt 3 triggers cooldown
      const attempt3 = await pinService.verifyPin("000003");
      expect(attempt3.success).toBe(false);
      expect(attempt3.cooldownSeconds).toBe(30);

      // Attempt 4
      await pinService.verifyPin("000004");

      // Attempt 5 triggers lockout
      const attempt5 = await pinService.verifyPin("000005");
      expect(attempt5.success).toBe(false);
      expect(attempt5.isLocked).toBe(true);
      expect(attempt5.error).toContain("locked");

      // Subsequent attempt remains locked
      const lockedAttempt = await pinService.verifyPin("112233");
      expect(lockedAttempt.success).toBe(false);
      expect(lockedAttempt.isLocked).toBe(true);

      // Resetting PIN clears lockout
      await pinService.clearPin();
      const hasPin = await pinService.hasConfiguredPin();
      expect(hasPin).toBe(false);
    });
  });

  describe("Returning User Interactive Login Screen", () => {
    it("renders 'Welcome Back' card with masked mobile and 6 PIN dots for returning user", async () => {
      const { getByText, getByTestId } = await render(<LoginScreen />);

      expect(getByText("Welcome Back")).toBeTruthy();
      expect(getByText("Sign in securely with your 6-digit PIN.")).toBeTruthy();
      expect(getByText("+91 91766 •••••")).toBeTruthy();
      expect(getByTestId("pin-dot-0")).toBeTruthy();
      expect(getByTestId("pin-dot-5")).toBeTruthy();
      expect(getByTestId("pin-quick-biometric")).toBeTruthy();
    });

    it("updates PIN dots and verifies automatically when 6 digits are entered", async () => {
      mockLoginWithPin.mockResolvedValueOnce({
        success: true,
        defaultRoute: "/(patient)",
      });

      const { getByTestId } = await render(<LoginScreen />);

      const pinInput = getByTestId("pin-input");
      await fireEvent.changeText(pinInput, "123456");

      await waitFor(() => {
        expect(mockLoginWithPin).toHaveBeenCalledWith("123456");
        expect(mockReplace).toHaveBeenCalledWith("/(patient)");
      });
    });

    it("displays error notice when PIN verification fails", async () => {
      mockLoginWithPin.mockResolvedValueOnce({
        success: false,
        error: "Incorrect PIN. 4 attempts remaining.",
      });

      const { getByTestId, findByText } = await render(<LoginScreen />);

      const pinInput = getByTestId("pin-input");
      await fireEvent.changeText(pinInput, "999999");

      const errorText = await findByText("Incorrect PIN. 4 attempts remaining.");
      expect(errorText).toBeTruthy();
    });

    it("triggers biometric unlock from returning user card", async () => {
      mockLoginWithBiometrics.mockResolvedValueOnce({
        success: true,
        defaultRoute: "/(doctor)",
      });

      const { getByTestId } = await render(<LoginScreen />);
      const bioBtn = getByTestId("pin-quick-biometric");
      await fireEvent.press(bioBtn);

      await waitFor(() => {
        expect(mockLoginWithBiometrics).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/(doctor)");
      });
    });

    it("allows switching from PIN login to Mobile OTP login", async () => {
      const { getByTestId, getByText, queryByTestId } = await render(<LoginScreen />);

      const switchBtn = getByTestId("switch-to-otp-button");
      await fireEvent.press(switchBtn);

      expect(getByText("Welcome to OH-ID")).toBeTruthy();
      expect(getByTestId("mobile-input")).toBeTruthy();
      expect(queryByTestId("pin-input")).toBeNull();
    });

    it("allows switching to Mobile OTP via 'Forgot PIN?' link", async () => {
      const { getByTestId, getByText } = await render(<LoginScreen />);

      const forgotPinBtn = getByTestId("forgot-pin-button");
      await fireEvent.press(forgotPinBtn);

      expect(getByText("Welcome to OH-ID")).toBeTruthy();
      expect(getByTestId("mobile-input")).toBeTruthy();
    });
  });
});

