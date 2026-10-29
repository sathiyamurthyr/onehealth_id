import { biometricService } from "../src/services/auth/biometrics";
import { secureStorage } from "../src/services/storage/secure_store";
import * as LocalAuthentication from "expo-local-authentication";

jest.mock("expo-local-authentication");

describe("BiometricService — Hardware Keystore Gating", () => {
  beforeEach(async () => {
    await secureStorage.clearSession();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await secureStorage.clearSession();
  });

  describe("Hardware Capability Assessment", () => {
    it("reports None when device lacks biometric hardware", async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      const cap = await biometricService.getCapability();
      expect(cap.hasHardware).toBe(false);
      expect(cap.isEnrolled).toBe(false);
      expect(cap.biometricType).toBe("None");
    });

    it("identifies Face ID when facial recognition is supported", async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const cap = await biometricService.getCapability();
      expect(cap.hasHardware).toBe(true);
      expect(cap.isEnrolled).toBe(true);
      expect(cap.biometricType).toBe("Face ID");
    });

    it("identifies Fingerprint when touch scanner is supported", async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const cap = await biometricService.getCapability();
      expect(cap.hasHardware).toBe(true);
      expect(cap.isEnrolled).toBe(true);
      expect(cap.biometricType).toBe("Fingerprint");
    });
  });

  describe("Authentication Prompts", () => {
    it("returns true when OS biometric authentication succeeds", async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      const res = await biometricService.authenticate("Unlock OneHealth ID");
      expect(res).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: "Unlock OneHealth ID",
          fallbackLabel: "Use Password",
        })
      );
    });

    it("returns false when user cancels or biometric fails", async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: "user_cancel",
      });

      const res = await biometricService.authenticate();
      expect(res).toBe(false);
    });
  });

  describe("Preference Persistence", () => {
    it("persists biometric toggle preference in hardware SecureStore", async () => {
      expect(await biometricService.isBiometricEnabled()).toBe(false);

      await biometricService.setBiometricEnabled(true);
      expect(await biometricService.isBiometricEnabled()).toBe(true);

      await biometricService.setBiometricEnabled(false);
      expect(await biometricService.isBiometricEnabled()).toBe(false);
    });
  });
});
