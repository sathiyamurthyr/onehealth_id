/**
 * ONEHEALTH ID (OH-ID) Mobile — Reception Desk Test Suite
 * Sathus Technology Pvt Ltd
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ReceptionHomeScreen from "../app/(reception)/index";
import { receptionApi } from "../src/services/api/reception";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    CameraView: (props: any) => <View testID="mock-camera-view" {...props} />,
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "9876543210",
      name: "Lakshmi FrontDesk",
      role: "RECEPTIONIST",
      hospital_name: "OneHealth Hospital",
    },
    token: "valid-jwt-token",
    isAuthenticated: true,
  }),
}));

describe("Phase D: Reception Desk & OPD Check-In Workflows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(receptionApi, "getCounterCensus").mockResolvedValue({
      tokens_issued: 42,
      waiting_count: 8,
      avg_wait_mins: 15,
    });
  });

  test("renders Reception desk screen with hospital census and front-desk actions", async () => {
    const { getByTestId, getByText } = await render(<ReceptionHomeScreen />);

    expect(getByTestId("reception-home-screen")).toBeTruthy();
    expect(getByText("Reception Desk")).toBeTruthy();
    expect(getByText("Issued Today")).toBeTruthy();
    expect(getByText("In Queue")).toBeTruthy();
    expect(getByText("Walk-In Citizen Registration")).toBeTruthy();
    expect(getByText("Emergency STAT Triage Token")).toBeTruthy();
  });

  test("launches camera scanner modal and allows closing it", async () => {
    const { getByTestId, queryByTestId } = await render(<ReceptionHomeScreen />);

    const openCameraBtn = getByTestId("open-camera-scanner-btn");
    await fireEvent.press(openCameraBtn);

    expect(getByTestId("camera-scanner-modal")).toBeTruthy();

    const closeBtn = getByTestId("close-camera-modal-btn");
    await fireEvent.press(closeBtn);

    await waitFor(() => {
      expect(queryByTestId("camera-scanner-modal")).toBeNull();
    });
  });

  test("resolves patient via manual lookup and displays verification card", async () => {
    const scanSpy = jest.spyOn(receptionApi, "scanAndVerifyQr").mockResolvedValueOnce({
      patient_id: "p-test-01",
      onehealth_id: "OHID-AAKASH-01",
      name: "Aakash Verma",
      age: 42,
      gender: "Male",
      blood_group: "O+",
      verification_status: "VERIFIED",
    });

    const { getByTestId, getByText } = await render(<ReceptionHomeScreen />);

    const input = getByTestId("manual-search-input");
    await fireEvent.changeText(input, "OHID-AAKASH-01");

    const searchBtn = getByTestId("manual-search-btn");
    await fireEvent.press(searchBtn);

    await waitFor(() => {
      expect(scanSpy).toHaveBeenCalledWith("OHID-AAKASH-01");
      expect(getByTestId("scanned-patient-card")).toBeTruthy();
      expect(getByText("Aakash Verma")).toBeTruthy();
      expect(getByText("OHID-AAKASH-01")).toBeTruthy();
    });
  });

  test("issues OPD queue token with department and priority selection", async () => {
    jest.spyOn(receptionApi, "scanAndVerifyQr").mockResolvedValueOnce({
      patient_id: "p-test-01",
      onehealth_id: "OHID-AAKASH-01",
      name: "Aakash Verma",
      age: 42,
      gender: "Male",
      blood_group: "O+",
      verification_status: "VERIFIED",
    });

    const issueSpy = jest.spyOn(receptionApi, "issueOpdToken").mockResolvedValueOnce({
      token_id: "tok-99",
      token_number: 14,
      token_str: "OPD-CAR-14",
      patient_id: "p-test-01",
      patient_name: "Aakash Verma",
      onehealth_id: "OHID-AAKASH-01",
      department: "Cardiology",
      priority: "URGENT",
      counter_name: "Counter 01",
      room_number: "Room 102",
      estimated_wait_minutes: 5,
      issued_at: "10:30 AM",
    });

    const { getByTestId, getByText } = await render(<ReceptionHomeScreen />);

    // 1. Resolve patient
    await fireEvent.changeText(getByTestId("manual-search-input"), "OHID-AAKASH-01");
    await fireEvent.press(getByTestId("manual-search-btn"));

    await waitFor(() => {
      expect(getByTestId("btn-open-checkin-modal")).toBeTruthy();
    });

    // 2. Open Check-in Modal
    await fireEvent.press(getByTestId("btn-open-checkin-modal"));
    expect(getByTestId("checkin-department-modal")).toBeTruthy();

    // 3. Select Department & Urgency
    await fireEvent.press(getByTestId("dept-option-Cardiology"));
    await fireEvent.press(getByTestId("priority-chip-URGENT"));
    await fireEvent.changeText(getByTestId("complaint-input"), "Mild chest discomfort");

    // 4. Confirm Issue Token
    await fireEvent.press(getByTestId("confirm-issue-token-btn"));

    await waitFor(() => {
      expect(issueSpy).toHaveBeenCalledWith({
        patient_id: "p-test-01",
        patient_name: "Aakash Verma",
        onehealth_id: "OHID-AAKASH-01",
        department: "Cardiology",
        priority: "URGENT",
        chief_complaint: "Mild chest discomfort",
      });
      expect(getByTestId("confirmed-token-card")).toBeTruthy();
      expect(getByText("#14")).toBeTruthy();
      expect(getByText("OPD-CAR-14")).toBeTruthy();
      expect(getByText("Cardiology")).toBeTruthy();
    });
  });

  test("validates and registers walk-in citizen generating fresh OneHealth ID", async () => {
    const regSpy = jest.spyOn(receptionApi, "registerWalkInPatient").mockResolvedValueOnce({
      patient_id: "p-new-walkin",
      onehealth_id: "OHID-WALKIN-999",
      qr_token: "ZKP-9876500000-PASS",
      name: "Ramesh Sharma",
      mobile: "9876500000",
      verification_status: "VERIFIED_ACTIVE",
    });

    const { getByTestId, getByText } = await render(<ReceptionHomeScreen />);

    await fireEvent.press(getByTestId("open-walkin-modal-btn"));
    expect(getByTestId("walkin-registration-modal")).toBeTruthy();

    // Validate invalid mobile rejection
    await fireEvent.changeText(getByTestId("walkin-name-input"), "Ramesh Sharma");
    await fireEvent.changeText(getByTestId("walkin-phone-input"), "12345");
    await fireEvent.changeText(getByTestId("walkin-age-input"), "45");
    await fireEvent.press(getByTestId("submit-walkin-btn"));

    expect(getByText("Please enter a valid 10-digit Indian mobile number.")).toBeTruthy();
    expect(regSpy).not.toHaveBeenCalled();

    // Provide valid mobile and submit
    await fireEvent.changeText(getByTestId("walkin-phone-input"), "9876500000");
    await fireEvent.press(getByTestId("submit-walkin-btn"));

    await waitFor(() => {
      expect(regSpy).toHaveBeenCalledWith({
        name: "Ramesh Sharma",
        mobile: "9876500000",
        age: 45,
        gender: "Male",
        blood_group: "O+",
        initial_department: "General Medicine",
      });
      // Advances to Check-In modal
      expect(getByTestId("checkin-department-modal")).toBeTruthy();
    });
  });

  test("verifies receptionist RBAC notice is present on the screen", async () => {
    const { getByText } = await render(<ReceptionHomeScreen />);
    expect(
      getByText(/Receptionist RBAC Protection: Clinical notes, detailed diagnoses/i)
    ).toBeTruthy();
  });
});

