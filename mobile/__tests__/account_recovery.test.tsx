import React from "react";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import ForgotPasswordScreen from "../app/(auth)/forgot-password";
import { authApi } from "../src/services/api/auth";
import { useRouter } from "expo-router";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../src/services/api/auth", () => ({
  authApi: {
    forgotPassword: jest.fn(),
    verifyResetOtp: jest.fn(),
    resetPassword: jest.fn(),
    resendResetOtp: jest.fn(),
    requestAssistance: jest.fn(),
  },
}));

describe("OH-ID Mobile — Account Recovery & Password Reset Flow", () => {
  let mockReplace: jest.Mock;
  let mockPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace = jest.fn();
    mockPush = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      back: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Step 1 (IDENTIFY) initially with email input and request button", async () => {
    const { getByTestId, getByText } = await render(<ForgotPasswordScreen />);

    expect(getByText("Forgot Password?")).toBeTruthy();
    expect(getByTestId("recovery-email-input")).toBeTruthy();
    expect(getByTestId("send-code-button")).toBeTruthy();
  });

  it("rejects invalid or empty email addresses", async () => {
    const { getByTestId, findByText } = await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(getByTestId("recovery-email-input"), "invalid-email");
    await fireEvent.press(getByTestId("send-code-button"));

    expect(await findByText("Please enter a valid registered email address.")).toBeTruthy();
    expect(authApi.forgotPassword).not.toHaveBeenCalled();
  });

  it("submits valid email, receives generic anti-enumeration response, and moves to Step 2", async () => {
    (authApi.forgotPassword as jest.Mock).mockResolvedValueOnce({
      status: "REQUEST_ACCEPTED",
      message: "If an active account is associated with this email, a verification code has been dispatched.",
    });

    const { getByTestId, findByText } = await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(getByTestId("recovery-email-input"), "doctor@apollo.org");
    await fireEvent.press(getByTestId("send-code-button"));

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith("doctor@apollo.org");
    });

    expect(await findByText("Enter Verification Code")).toBeTruthy();
    expect(getByTestId("recovery-otp-input")).toBeTruthy();
  });

  it("rejects OTP shorter than 6 digits", async () => {
    (authApi.forgotPassword as jest.Mock).mockResolvedValueOnce({
      status: "REQUEST_ACCEPTED",
      message: "Code dispatched.",
    });

    const { getByTestId, findByText } = await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(getByTestId("recovery-email-input"), "doctor@apollo.org");
    await fireEvent.press(getByTestId("send-code-button"));

    await waitFor(() => {
      expect(getByTestId("recovery-otp-input")).toBeTruthy();
    });

    await fireEvent.changeText(getByTestId("recovery-otp-input"), "1234");
    await fireEvent.press(getByTestId("verify-code-button"));

    // Button should remain disabled for OTP length < 6
    expect(authApi.verifyResetOtp).not.toHaveBeenCalled();
  });

  it("verifies 6-digit OTP, obtains reset token, and transitions to Step 3", async () => {
    (authApi.forgotPassword as jest.Mock).mockResolvedValueOnce({
      status: "REQUEST_ACCEPTED",
      message: "Code dispatched.",
    });
    (authApi.verifyResetOtp as jest.Mock).mockResolvedValueOnce({
      message: "Verification code confirmed successfully.",
      reset_token: "mock-ephemeral-reset-token-xyz",
      expires_in_seconds: 600,
    });

    const { getByTestId, findByText } = await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(getByTestId("recovery-email-input"), "doctor@apollo.org");
    await fireEvent.press(getByTestId("send-code-button"));

    await waitFor(() => {
      expect(getByTestId("recovery-otp-input")).toBeTruthy();
    });

    await fireEvent.changeText(getByTestId("recovery-otp-input"), "482910");
    await fireEvent.press(getByTestId("verify-code-button"));

    await waitFor(() => {
      expect(authApi.verifyResetOtp).toHaveBeenCalledWith("doctor@apollo.org", "482910");
    });

    expect(await findByText("Set New Password")).toBeTruthy();
    expect(getByTestId("new-password-input")).toBeTruthy();
    expect(getByTestId("confirm-password-input")).toBeTruthy();
  });

  it("validates password checklist and completes password reset", async () => {
    (authApi.forgotPassword as jest.Mock).mockResolvedValueOnce({ status: "REQUEST_ACCEPTED" });
    (authApi.verifyResetOtp as jest.Mock).mockResolvedValueOnce({ reset_token: "token-123" });
    (authApi.resetPassword as jest.Mock).mockResolvedValueOnce({
      message: "Your password has been reset successfully.",
    });

    const { getByTestId, findByText } = await render(<ForgotPasswordScreen />);

    // Step 1
    await fireEvent.changeText(getByTestId("recovery-email-input"), "doctor@apollo.org");
    await fireEvent.press(getByTestId("send-code-button"));

    // Step 2
    await waitFor(() => expect(getByTestId("recovery-otp-input")).toBeTruthy());
    await fireEvent.changeText(getByTestId("recovery-otp-input"), "482910");
    await fireEvent.press(getByTestId("verify-code-button"));

    // Step 3
    await waitFor(() => expect(getByTestId("new-password-input")).toBeTruthy());
    await fireEvent.changeText(getByTestId("new-password-input"), "SecurePass#2026");
    await fireEvent.changeText(getByTestId("confirm-password-input"), "SecurePass#2026");

    await fireEvent.press(getByTestId("reset-password-button"));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        email: "doctor@apollo.org",
        reset_token: "token-123",
        new_password: "SecurePass#2026",
        confirm_password: "SecurePass#2026",
      });
    });

    expect(await findByText("Password Reset Complete")).toBeTruthy();
    const backToLoginBtn = getByTestId("back-to-login-success");
    await fireEvent.press(backToLoginBtn);

    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });

  it("submits assistance request and renders support ticket number", async () => {
    (authApi.requestAssistance as jest.Mock).mockResolvedValueOnce({
      reference_number: "REQ-2026-881923",
      status: "OPEN",
      message: "Your assistance request has been submitted to the Super Admin support team.",
    });

    const { getByTestId, findByText } = await render(<ForgotPasswordScreen />);

    const openAssistance = getByTestId("open-assistance-button");
    await fireEvent.press(openAssistance);

    expect(await findByText("Support Assistance")).toBeTruthy();

    await fireEvent.changeText(getByTestId("assistance-email-input"), "nurse.priya@apollo.org");
    await fireEvent.changeText(getByTestId("assistance-phone-input"), "9840122334");
    await fireEvent.changeText(getByTestId("assistance-desc-input"), "Device replaced, cannot receive SMS OTP");

    await fireEvent.press(getByTestId("submit-assistance-button"));

    await waitFor(() => {
      expect(authApi.requestAssistance).toHaveBeenCalledWith({
        email: "nurse.priya@apollo.org",
        category: "ACCOUNT_RECOVERY",
        description: "Device replaced, cannot receive SMS OTP",
        contact_phone: "9840122334",
      });
    });

    expect(await findByText("REQ-2026-881923")).toBeTruthy();
  });
});
