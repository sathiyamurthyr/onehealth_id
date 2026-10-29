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
  let mockLogin: jest.Mock;
  let mockLoginWithBiometrics: jest.Mock;
  let mockLogout: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace = jest.fn();
    mockLogin = jest.fn();
    mockLoginWithBiometrics = jest.fn();
    mockLogout = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      back: jest.fn(),
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      biometricCapability: {
        hasHardware: true,
        isEnrolled: true,
        biometricType: "Fingerprint",
      },
      isBiometricEnabled: true,
      login: mockLogin,
      loginWithBiometrics: mockLoginWithBiometrics,
      logout: mockLogout,
      setBiometricPreference: jest.fn(),
      refreshSession: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Role Route Resolution Matrix", () => {
    it("maps clinical and administrative roles to authoritative workspace routes", () => {
      expect(resolveRoleRoute("PATIENT")).toBe("/(patient)");
      expect(resolveRoleRoute("CITIZEN")).toBe("/(patient)");
      expect(resolveRoleRoute("DOCTOR")).toBe("/(doctor)");
      expect(resolveRoleRoute("PHYSICIAN")).toBe("/(doctor)");
      expect(resolveRoleRoute("RECEPTIONIST")).toBe("/(reception)");
      expect(resolveRoleRoute("FRONT_DESK")).toBe("/(reception)");
      expect(resolveRoleRoute("HOSPITAL_ADMIN")).toBe("/(admin)");
      expect(resolveRoleRoute("ADMIN")).toBe("/(admin)");
      expect(resolveRoleRoute("SUPER_ADMIN")).toBe("/(super)");
      expect(resolveRoleRoute("PLATFORM_ADMIN")).toBe("/(super)");
      expect(resolveRoleRoute("UNKNOWN")).toBe("/(patient)");
      expect(resolveRoleRoute(undefined)).toBe("/(patient)");
    });
  });

  describe("Interactive LoginScreen Component", () => {
    it("renders phone input, password input, and sign in button", async () => {
      const { getByTestId, getByText } = await render(<LoginScreen />);

      expect(getByTestId("mobile-input")).toBeTruthy();
      expect(getByTestId("password-input")).toBeTruthy();
      expect(getByTestId("login-button")).toBeTruthy();
      expect(getByText("Account Access")).toBeTruthy();
    });

    it("rejects email identifiers with authoritative backend error message", async () => {
      const { getByTestId, findByText } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "dr.sharma@hospital.org");
      await fireEvent.changeText(getByTestId("password-input"), "SecurePass123");
      await fireEvent.press(getByTestId("login-button"));

      const errorText = await findByText(
        "Email is not a login identifier. Please enter your 10-digit Registered Mobile Number."
      );
      expect(errorText).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("rejects mobile numbers that are fewer than 10 digits", async () => {
      const { getByTestId, findByText } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "98765");
      await fireEvent.changeText(getByTestId("password-input"), "SecurePass123");
      await fireEvent.press(getByTestId("login-button"));

      const errorText = await findByText("Please enter a valid 10-digit Indian mobile number.");
      expect(errorText).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("requires password to be entered", async () => {
      const { getByTestId, findByText } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
      await fireEvent.press(getByTestId("login-button"));

      const errorText = await findByText("Please enter your password.");
      expect(errorText).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("toggles password masking visibility", async () => {
      const { getByTestId } = await render(<LoginScreen />);

      const passwordInput = getByTestId("password-input");
      expect(passwordInput.props.secureTextEntry).toBe(true);

      const toggleButton = getByTestId("toggle-password");
      await fireEvent.press(toggleButton);

      expect(passwordInput.props.secureTextEntry).toBe(false);

      await fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it("submits valid credentials and routes to the authoritative doctor workspace", async () => {
      mockLogin.mockResolvedValueOnce({
        success: true,
        defaultRoute: "/(doctor)",
      });

      const { getByTestId } = await render(<LoginScreen />);

      await fireEvent.changeText(getByTestId("mobile-input"), "9876543210");
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
      await fireEvent.changeText(getByTestId("password-input"), "WrongPassword#");
      await fireEvent.press(getByTestId("login-button"));

      const bannerError = await findByText("Invalid mobile number or password");
      expect(bannerError).toBeTruthy();
    });

    it("allows biometric quick unlock when enrolled and enabled", async () => {
      mockLoginWithBiometrics.mockResolvedValueOnce({
        success: true,
        defaultRoute: "/(doctor)",
      });

      const { getByTestId } = await render(<LoginScreen />);

      const bioButton = getByTestId("biometric-button");
      expect(bioButton).toBeTruthy();

      await fireEvent.press(bioButton);

      await waitFor(() => {
        expect(mockLoginWithBiometrics).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/(doctor)");
      });
    });
  });

  describe("UserSessionBanner Component", () => {
    it("displays authenticated user details and handles sign out", async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: {
          username: "9988776655",
          name: "Dr. Rajesh Varma",
          role: "DOCTOR",
          hospital_name: "Apollo Hospitals",
        },
        token: "jwt-test-banner",
        logout: mockLogout,
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
  });
});
