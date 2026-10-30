import React from "react";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import RegisterScreen from "../app/(auth)/register";
import { authApi } from "../src/services/api/auth";
import { useRouter } from "expo-router";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../src/services/api/auth", () => ({
  authApi: {
    register: jest.fn(),
  },
}));

describe("OH-ID Mobile — Role Registration & Onboarding Gate", () => {
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

  it("renders role selection screen with Patient, Doctor, Hospital, and Staff options", async () => {
    const { getByTestId, getByText, queryByText } = await render(<RegisterScreen />);

    expect(getByText("Choose Account Type")).toBeTruthy();
    expect(getByTestId("role-patient-card")).toBeTruthy();
    expect(getByTestId("role-doctor-card")).toBeTruthy();
    expect(getByTestId("role-hospital-card")).toBeTruthy();
    expect(getByTestId("role-staff-card")).toBeTruthy();

    // Verify Super Admin is NOT offered as a registration card
    expect(queryByText("Super Admin Registration")).toBeNull();
    expect(queryByText("Platform Governance Registration")).toBeNull();
  });

  it("displays administrative exclusion notice preventing public Super Admin registration", async () => {
    const { getByText } = await render(<RegisterScreen />);

    expect(
      getByText(/Super Admin and Platform Governance accounts cannot be registered publicly/i)
    ).toBeTruthy();
  });

  it("opens patient registration form and validates required fields", async () => {
    const { getByTestId, findByText } = await render(<RegisterScreen />);

    await fireEvent.press(getByTestId("role-patient-card"));

    expect(await findByText("Patient Registration")).toBeTruthy();
    expect(getByTestId("patient-name-input")).toBeTruthy();
    expect(getByTestId("patient-phone-input")).toBeTruthy();
    expect(getByTestId("patient-age-input")).toBeTruthy();
    expect(getByTestId("patient-password-input")).toBeTruthy();

    // Test short name validation
    await fireEvent.changeText(getByTestId("patient-name-input"), "A");
    await fireEvent.changeText(getByTestId("patient-phone-input"), "9876543210");
    await fireEvent.changeText(getByTestId("patient-age-input"), "25");
    await fireEvent.changeText(getByTestId("patient-password-input"), "ValidPass#1");
    await fireEvent.changeText(getByTestId("patient-confirm-password-input"), "ValidPass#1");

    await fireEvent.press(getByTestId("submit-patient-register"));

    expect(await findByText("Please enter your full name (minimum 2 characters).")).toBeTruthy();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("submits valid patient registration and presents OneHealth ID pass", async () => {
    (authApi.register as jest.Mock).mockResolvedValueOnce({
      message: "Registration successful! Your OneHealth ID is OHID-2026-9912.",
      user_id: "usr-pat-123",
      patient_id: "pat-123",
      onehealth_id: "OHID-2026-9912",
      access_token: "jwt-pat-token",
      token_type: "bearer",
      user: {
        username: "9876543210",
        role: "PATIENT",
      },
    });

    const { getByTestId, findByText } = await render(<RegisterScreen />);

    await fireEvent.press(getByTestId("role-patient-card"));

    await fireEvent.changeText(getByTestId("patient-name-input"), "Ananya Sharma");
    await fireEvent.changeText(getByTestId("patient-phone-input"), "9876543210");
    await fireEvent.changeText(getByTestId("patient-age-input"), "32");
    await fireEvent.changeText(getByTestId("patient-password-input"), "SecretPassword#1");
    await fireEvent.changeText(getByTestId("patient-confirm-password-input"), "SecretPassword#1");

    await fireEvent.press(getByTestId("submit-patient-register"));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        name: "Ananya Sharma",
        phone: "9876543210",
        password: "SecretPassword#1",
        age: 32,
        gender: "Male",
        email: undefined,
        consent_given: true,
      });
    });

    expect(await findByText("OHID-2026-9912")).toBeTruthy();
    expect(await findByText("Welcome to OneHealth ID!")).toBeTruthy();

    const proceedBtn = getByTestId("go-to-patient-portal");
    await fireEvent.press(proceedBtn);

    expect(mockReplace).toHaveBeenCalledWith("/(patient)");
  });

  it("displays professional verification requirements for doctor registration", async () => {
    const { getByTestId, findByText } = await render(<RegisterScreen />);

    await fireEvent.press(getByTestId("role-doctor-card"));

    expect(await findByText("Doctor Registration")).toBeTruthy();
    expect(await findByText("Clinical Verification Mandatory")).toBeTruthy();
    expect(await findByText(/National Medical Commission \(NMC\)/i)).toBeTruthy();
    expect(getByTestId("doctor-web-onboard-button")).toBeTruthy();
  });

  it("displays administrative approval requirements for healthcare facility onboarding", async () => {
    const { getByTestId, findByText } = await render(<RegisterScreen />);

    await fireEvent.press(getByTestId("role-hospital-card"));

    expect(await findByText("Healthcare Organisation")).toBeTruthy();
    expect(await findByText("Administrative Approval Workflow")).toBeTruthy();
    expect(getByTestId("hospital-portal-button")).toBeTruthy();
    expect(getByTestId("track-hospital-app-button")).toBeTruthy();
  });

  it("displays access gating notice for hospital staff explaining administrator provisioning", async () => {
    const { getByTestId, findByText } = await render(<RegisterScreen />);

    await fireEvent.press(getByTestId("role-staff-card"));

    expect(await findByText("Hospital Staff Access")).toBeTruthy();
    expect(await findByText("Access Must Be Provisioned")).toBeTruthy();
    expect(
      await findByText(/Reception, nursing, cashier, and department staff accounts cannot be registered publicly/i)
    ).toBeTruthy();

    const returnBtn = getByTestId("staff-back-to-login");
    await fireEvent.press(returnBtn);

    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });
});
