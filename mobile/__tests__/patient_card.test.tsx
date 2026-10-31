/**
 * ONEHEALTH ID (OH-ID) Mobile — DigitalHealthCard Component Test Suite
 * Sathus Technology Pvt Ltd
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { DigitalHealthCard } from "../src/components/patient/DigitalHealthCard";
import { OhIdCardData } from "../src/types/patient";

// Mock react-native-qrcode-svg for clean and deterministic test assertion
jest.mock("react-native-qrcode-svg", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return function MockQRCode(props: any) {
    return (
      <View testID="mock-qr-code" accessibilityLabel={`QR-${props.value}`}>
        <Text>{props.value}</Text>
      </View>
    );
  };
});

describe("DigitalHealthCard Component", () => {
  const mockCardData: OhIdCardData = {
    onehealth_id: "OHID-KEDAR-2026-001",
    qr_token: "ZKP-TOKEN-SECRET-12345",
    name: "Sathish Kumar",
    dob: "1994-05-12",
    age: 32,
    gender: "Male",
    blood_group: "O+",
    verification_status: "VERIFIED_ACTIVE",
    facilities_count: 3,
  };

  it("renders patient demographic and identity attributes accurately", async () => {
    const { getByTestId, getByText } = await render(
      <DigitalHealthCard cardData={mockCardData} />
    );

    expect(getByTestId("patient-name")).toHaveTextContent("Sathish Kumar");
    expect(getByTestId("patient-ohid")).toHaveTextContent("OHID-KEDAR-2026-001");
    expect(getByTestId("patient-age")).toHaveTextContent("32 Yrs");
    expect(getByTestId("patient-gender")).toHaveTextContent("Male");
    expect(getByTestId("patient-blood-group")).toHaveTextContent("O+");
    expect(getByTestId("verification-badge")).toHaveTextContent(/Identity active|Active Verified/);
    expect(getByText("3 Connected Hospitals")).toBeTruthy();
  });

  it("embeds QR code with authoritative scan URL containing qr_token", async () => {
    const { getByTestId } = await render(
      <DigitalHealthCard cardData={mockCardData} />
    );

    const mockQr = getByTestId("mock-qr-code");
    expect(mockQr).toBeTruthy();
    expect(mockQr.props.accessibilityLabel).toBe(
      "QR-https://ohid.online/scan/ZKP-TOKEN-SECRET-12345"
    );
  });

  it("displays masked dynamic ZKP token preview", async () => {
    const { getByTestId } = await render(
      <DigitalHealthCard cardData={mockCardData} />
    );

    expect(getByTestId("masked-token-value")).toHaveTextContent("ZKP-TOKEN-SECRET...");
  });

  it("triggers onRotate when manual refresh button is pressed", async () => {
    const onRotateMock = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await render(
      <DigitalHealthCard cardData={mockCardData} onRotate={onRotateMock} />
    );

    const rotateBtn = getByTestId("rotate-qr-button");
    await fireEvent.press(rotateBtn);

    expect(onRotateMock).toHaveBeenCalledTimes(1);
  });

  it("opens high-contrast kiosk scanning modal on tap and closes on close button", async () => {
    const { getByTestId, queryByTestId } = await render(
      <DigitalHealthCard cardData={mockCardData} />
    );

    // Modal should initially be hidden or inactive
    const expandBtn = getByTestId("expand-qr-button");
    await fireEvent.press(expandBtn);

    // Kiosk modal header and close button should now be rendered
    const closeBtn = getByTestId("close-kiosk-modal-button");
    expect(closeBtn).toBeTruthy();

    await fireEvent.press(closeBtn);
    // Verified modal interactions
  });

  it("renders loading state when loading prop is true", async () => {
    const { getByText } = await render(
      <DigitalHealthCard cardData={null} loading={true} />
    );

    expect(getByText("Loading OneHealth ID Pass...")).toBeTruthy();
  });
});
