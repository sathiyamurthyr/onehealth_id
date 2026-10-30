import React from "react";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import LoginScreen from "../app/(auth)/login";
import { UserSessionBanner } from "../src/components/common/UserSessionBanner";
import { resolveRoleRoute, useAuth } from "../src/context/AuthContext";
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

describe("OH-ID Mobile — Authentication & Role-Based Flow", () => {
  let mockReplace: jest.Mock;
  let mockPush: jest.Mock;
  let mockLogin: jest.Mock;
  let mockLoginWithBiometrics: jest.Mock;
  let mockLogout: jest.Mock;
  let mockSwitchRole: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace = jest.fn();
    mockPush = jest.fn();
    mockLogin = jest.fn();
    mockLoginWithBiometrics = jest.fn();
    mockLogout = jest.fn();
    mockSwitchRole = jest.fn();

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
      login: mockLogin,
      loginWithBiometrics: mockLoginWithBiometrics,
      logout: mockLogout,
      switchRole: mockSwitchRole,
      setBiometricPreference: jest.fn(),
      refreshSession: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Role Route Resolution Matrix", () => {
    it("maps clinical, administrative, and citizen roles to authoritative workspace routes", () => {
      expect(resolveRoleRoute("PATIENT")).toBe("/(patient)");
      expect(resolveRoleRoute("CITIZEN")).toBe("/(patient)");
      expect(resolveRoleRoute("DOCTOR")).toBe("/(doctor)");
      expect(resolveRoleRoute("PHYSICIAN")).toBe("/(doctor)");
      expect(resolveRoleRoute("NURSE")).toBe("/(doctor)");
      expect(resolveRoleRoute("CLINICAL_STAFF")).toBe("/(doctor)");
      expect(resolveRoleRoute("RECEPTIONIST")).toBe("/(reception)");
      expect(resolveRoleRoute("FRONT_DESK")).toBe("/(reception)");
      expect(resolveRoleRoute("CASHIER")).toBe("/(reception)");
      expect(resolveRoleRoute("STAFF")).toBe("/(reception)");
      expect(resolveRoleRoute("HOSPITAL_ADMIN")).toBe("/(admin)");
      expect(resolveRoleRoute("ADMIN")).toBe("/(admin)");
      expect(resolveRoleRoute("SUPER_ADMIN")).toBe("/(super)");
      expect(resolveRoleRoute("PLATFORM_ADMIN")).toBe("/(super)");
      expect(resolveRoleRoute("UNKNOWN")).toBe("/(patient)");
      expect(resolveRoleRoute(undefined)).toBe("/(patient)");
    });
  });

  describe("Interactive LoginScreen Component", () => {
    it("renders branded header, +91 country code, phone input, and Continue button initially", async () => {
      const { getByTestId, getByText, queryByTestId } = await render(<LoginScreen />);

      expect(getByText("OneHealth ID")).toBeTruthy();
      expect(getByText("Welcome to OH-ID")).toBeTruthy();
      expect(getByText("Sign in securely to continue.")).toBeTruthy();
      expect(getByText("🇮🇳 +91")).toBeTruthy();
      expect(getByTestId("mobile-input")).toBeTruthy();
      expect(getByTestId("continue-button")).toBeTruthy();

      // Password input should not be visible in initial MOBILE step
      expect(queryByTestId("password-input")).toBeNull();
    });

    it("rejects mobile numbers that are fewer than 10 digits", async () => {
      const { getByTestId, findByText, queryByTestId } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "98765");
      await fireEvent.press(getByTestId("continue-button"));

      // Still in mobile step
      expect(queryByTestId("password-input")).toBeNull();
    });

    it("transitions to security verification step on valid 10-digit mobile number", async () => {
      const { getByTestId, getByText } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
      await fireEvent.press(getByTestId("continue-button"));

      expect(getByText("Security Verification")).toBeTruthy();
      expect(getByText("+91 98765 •••••")).toBeTruthy();
      expect(getByTestId("password-input")).toBeTruthy();
      expect(getByTestId("login-button")).toBeTruthy();
    });

    it("allows stepping back from verification to edit mobile number", async () => {
      const { getByTestId, getByText, queryByTestId } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
      await fireEvent.press(getByTestId("continue-button"));

      expect(getByTestId("password-input")).toBeTruthy();

      const backBtn = getByTestId("back-to-mobile");
      await fireEvent.press(backBtn);

      expect(getByText("Welcome to OH-ID")).toBeTruthy();
      expect(queryByTestId("password-input")).toBeNull();
    });

    it("toggles password masking visibility", async () => {
      const { getByTestId } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
      await fireEvent.press(getByTestId("continue-button"));

      const passwordInput = getByTestId("password-input");
      expect(passwordInput.props.secureTextEntry).toBe(true);

      const toggleButton = getByTestId("toggle-password");
      await fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(false);

      await fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it("submits valid credentials and routes to authoritative workspace", async () => {
      mockLogin.mockResolvedValueOnce({
        success: true,
        defaultRoute: "/(doctor)",
      });

      const { getByTestId } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
      await fireEvent.press(getByTestId("continue-button"));

      await fireEvent.changeText(getByTestId("password-input"), "DoctorSecret#1");
      await fireEvent.press(getByTestId("login-button"));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("9876543210", "DoctorSecret#1");
        expect(mockReplace).toHaveBeenCalledWith("/(doctor)");
      });
    });

    it("renders server-side authentication error in alert banner", async () => {
      mockLogin.mockResolvedValueOnce({
        success: false,
        error: "Invalid mobile number or password",
        defaultRoute: "/(auth)/login",
      });

      const { getByTestId, findByText } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
      await fireEvent.press(getByTestId("continue-button"));

      await fireEvent.changeText(getByTestId("password-input"), "WrongPassword#");
      await fireEvent.press(getByTestId("login-button"));

      const bannerError = await findByText("Invalid mobile number or password");
      expect(bannerError).toBeTruthy();
    });

    it("navigates to forgot-password screen when 'Having trouble signing in?' is tapped", async () => {
      const { getByTestId } = await render(<LoginScreen />);
      const recoveryLink = getByTestId("forgot-password-link");
      await fireEvent.press(recoveryLink);

      expect(mockPush).toHaveBeenCalledWith("/(auth)/forgot-password");
    });

    it("navigates to registration screen when 'Register' link is tapped", async () => {
      const { getByTestId } = await render(<LoginScreen />);
      const registerLink = getByTestId("register-link");
      await fireEvent.press(registerLink);

      expect(mockPush).toHaveBeenCalledWith("/(auth)/register");
    });

    it("navigates to forgot-password screen from password verification step", async () => {
      const { getByTestId } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
      await fireEvent.press(getByTestId("continue-button"));

      const inlineForgot = getByTestId("verify-forgot-password-link");
      await fireEvent.press(inlineForgot);

      expect(mockPush).toHaveBeenCalledWith("/(auth)/forgot-password");
    });

    it("allows biometric quick unlock when enrolled and enabled", async () => {
      mockLoginWithBiometrics.mockResolvedValueOnce({
        success: true,
        defaultRoute: "/(doctor)",
      });

      const { getByTestId } = await render(<LoginScreen />);

      const bioButton = getByTestId("biometric-quick-button");
      expect(bioButton).toBeTruthy();

      await fireEvent.press(bioButton);

      await waitFor(() => {
        expect(mockLoginWithBiometrics).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/(doctor)");
      });
    });

    it("triggers OTP request countdown in verification step", async () => {
      const { getByTestId, findByText } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
      await fireEvent.press(getByTestId("continue-button"));

      const otpBtn = getByTestId("otp-request-button");
      await fireEvent.press(otpBtn);

      const notice = await findByText("Verification challenge initiated. Check your registered SMS.");
      expect(notice).toBeTruthy();
    });
  });

  describe("UserSessionBanner Component & Multi-Role Switching", () => {
    it("displays authenticated user details and handles sign out", async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: {
          username: "9988776655",
          name: "Dr. Rajesh Varma",
          role: "DOCTOR",
          hospital_name: "Apollo Hospitals",
        },
        token: "jwt-test-banner",
        availableRoles: ["DOCTOR"],
        logout: mockLogout,
        switchRole: mockSwitchRole,
      });

      const { getByText, getByTestId } = await render(<UserSessionBanner />);

      expect(getByText("Dr. Rajesh Varma")).toBeTruthy();
      expect(getByText("Apollo Hospitals")).toBeTruthy();
      expect(getByText("DOCTOR")).toBeTruthy();

      const logoutBtn = getByTestId("logout-button");
      await fireEvent.press(logoutBtn);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
      });
    });

    it("displays role switch pills when user has multiple authorized roles", async () => {
      mockSwitchRole.mockResolvedValueOnce("/(admin)");

      (useAuth as jest.Mock).mockReturnValue({
        user: {
          username: "9840012345",
          name: "Dr. Rajesh Varma",
          role: "DOCTOR",
          roles: ["DOCTOR", "HOSPITAL_ADMIN"],
          hospital_name: "Apollo Hospitals",
        },
        token: "jwt-test-banner",
        availableRoles: ["DOCTOR", "HOSPITAL_ADMIN"],
        logout: mockLogout,
        switchRole: mockSwitchRole,
      });

      const { getByText, getByTestId } = await render(<UserSessionBanner />);

      expect(getByText("Switch Workspace Role:")).toBeTruthy();
      const adminRolePill = getByTestId("switch-role-HOSPITAL_ADMIN");
      expect(adminRolePill).toBeTruthy();

      await fireEvent.press(adminRolePill);

      await waitFor(() => {
        expect(mockSwitchRole).toHaveBeenCalledWith("HOSPITAL_ADMIN");
        expect(mockReplace).toHaveBeenCalledWith("/(admin)");
      });
    });
  });
});
