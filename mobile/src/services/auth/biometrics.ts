/**
 * ONEHEALTH ID (OH-ID) Mobile — Biometric Authentication Service
 * Wraps expo-local-authentication with enterprise hardware keystore gating.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import * as LocalAuthentication from "expo-local-authentication";
import { secureStorage } from "../storage/secure_store";

const BIOMETRIC_ENABLED_KEY = "oh_mobile_biometric_enabled";

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: "Face ID" | "Fingerprint" | "Biometrics" | "None";
}

class BiometricService {
  /**
   * Assesses biometric hardware capability and user enrollment status.
   */
  public async getCapability(): Promise<BiometricCapability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());

      let biometricType: BiometricCapability["biometricType"] = "None";

      if (hasHardware) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          biometricType = "Face ID";
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          biometricType = "Fingerprint";
        } else if (types.length > 0) {
          biometricType = "Biometrics";
        }
      }

      return {
        hasHardware,
        isEnrolled,
        biometricType,
      };
    } catch {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricType: "None",
      };
    }
  }

  /**
   * Prompts the native OS biometric sheet for user authentication.
   */
  public async authenticate(
    promptMessage: string = "Authenticate to unlock your OneHealth ID"
  ): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: "Cancel",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether the user has toggled biometric unlock on this device.
   */
  public async isBiometricEnabled(): Promise<boolean> {
    const val = await secureStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return val === "true";
  }

  /**
   * Sets user preference for biometric unlock on this device.
   */
  public async setBiometricEnabled(enabled: boolean): Promise<void> {
    await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false");
  }
}

export const biometricService = new BiometricService();
