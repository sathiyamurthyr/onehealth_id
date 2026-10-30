import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react-native";
import EntryGatewayScreen from "../app/index";
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

describe("OH-ID Mobile — Entry Gateway & Route Protection", () => {
  let mockReplace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      back: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects unauthenticated users to /(auth)/login immediately", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(<EntryGatewayScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
    });
  });

  it("redirects authenticated doctor to /(doctor)", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        username: "9840111222",
        role: "DOCTOR",
        name: "Dr. Senthil",
      },
      token: "jwt-token-doctor",
      isLoading: false,
      isAuthenticated: true,
    });

    render(<EntryGatewayScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(doctor)");
    });
  });

  it("redirects authenticated patient to /(patient)", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        username: "9840199999",
        role: "PATIENT",
        name: "Ramesh Patel",
      },
      token: "jwt-token-patient",
      isLoading: false,
      isAuthenticated: true,
    });

    render(<EntryGatewayScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(patient)");
    });
  });

  it("displays neutral branded loading state without internal engineering details", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
    });

    const { getByText, queryByText } = await render(<EntryGatewayScreen />);

    expect(getByText("OneHealth ID")).toBeTruthy();
    expect(
      getByText("One Digital Health Identity. A Connected Healthcare Journey.")
    ).toBeTruthy();

    // Verify internal foundation workspace details and badges are ABSENT
    expect(queryByText("Phase A: Foundation Workspace")).toBeNull();
    expect(queryByText("React Native New Architecture & Expo Router foundation")).toBeNull();
    expect(queryByText("ISO 27001 Ready")).toBeNull();
    expect(queryByText("Zero PHI Cache")).toBeNull();
    expect(queryByText("Platform Role Spaces")).toBeNull();
  });
});
