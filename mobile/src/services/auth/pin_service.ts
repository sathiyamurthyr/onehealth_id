/**
 * ONEHEALTH ID (OH-ID) Mobile — Local App PIN Authentication Service
 * 
 * Implements salted PBKDF2-HMAC-SHA256 PIN derivation and verification:
 * - 6-digit numeric PIN policy.
 * - Zero plaintext storage (PBKDF2 with 100,000 iterations & 16-byte CSPRNG salt).
 * - Stored strictly in hardware keystore / Keychain via expo-secure-store.
 * - Brute-force protection: progressive delay at 3 attempts, lockout at 5 attempts.
 * - Constant-time comparison to prevent timing side-channel attacks.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";
import { secureStorage } from "../storage/secure_store";

const PIN_ITERATIONS = 100000;
const PIN_KEY_LENGTH = 32;
const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_THRESHOLD = 3;
const COOLDOWN_SECONDS = 30;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export interface PinVerificationResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  isLocked?: boolean;
  cooldownSeconds?: number;
}

class PinAuthService {
  /**
   * Checks whether the user has established a local app PIN on this device.
   */
  public async hasConfiguredPin(): Promise<boolean> {
    const { verifier, salt } = await secureStorage.getPinCredentials();
    return Boolean(verifier && salt);
  }

  /**
   * Sets up or updates the 6-digit app PIN using PBKDF2 key derivation.
   */
  public async setupPin(pin: string): Promise<{ success: boolean; error?: string }> {
    const cleanPin = pin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      return { success: false, error: "App PIN must be exactly 6 digits." };
    }

    try {
      const saltBytes = randomBytes(16);
      const derivedKey = pbkdf2(sha256, cleanPin, saltBytes, {
        c: PIN_ITERATIONS,
        dkLen: PIN_KEY_LENGTH,
      });

      const verifierHex = bytesToHex(derivedKey);
      const saltHex = bytesToHex(saltBytes);

      await secureStorage.setPinCredentials(verifierHex, saltHex);
      await secureStorage.setPinAttempts(0);
      await secureStorage.setPinLockoutUntil(null);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Failed to establish secure PIN." };
    }
  }

  /**
   * Verifies the provided 6-digit PIN against the hardware-secured verifier.
   * Enforces attempt tracking and lockout protection.
   */
  public async verifyPin(pin: string): Promise<PinVerificationResult> {
    const cleanPin = pin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      return { success: false, error: "Please enter all 6 digits of your PIN." };
    }

    // 1. Check existing lockout state
    const lockoutUntil = await secureStorage.getPinLockoutUntil();
    const now = Date.now();
    if (lockoutUntil && now < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return {
        success: false,
        error: `PIN entry temporarily locked. Please wait ${remainingSeconds}s or sign in with Mobile OTP.`,
        isLocked: true,
        cooldownSeconds: remainingSeconds,
      };
    }

    const { verifier, salt } = await secureStorage.getPinCredentials();
    if (!verifier || !salt) {
      return { success: false, error: "No PIN has been configured on this device." };
    }

    const attempts = await secureStorage.getPinAttempts();
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      return {
        success: false,
        error: "PIN authentication locked due to repeated failed attempts. Please authenticate with Mobile OTP.",
        isLocked: true,
      };
    }

    try {
      const saltBytes = hexToBytes(salt);
      const candidateKey = pbkdf2(sha256, cleanPin, saltBytes, {
        c: PIN_ITERATIONS,
        dkLen: PIN_KEY_LENGTH,
      });
      const candidateHex = bytesToHex(candidateKey);

      // Constant-time comparison
      let diff = candidateHex.length ^ verifier.length;
      for (let i = 0; i < candidateHex.length && i < verifier.length; i++) {
        diff |= candidateHex.charCodeAt(i) ^ verifier.charCodeAt(i);
      }
      const isMatch = diff === 0;

      if (isMatch) {
        await secureStorage.setPinAttempts(0);
        await secureStorage.setPinLockoutUntil(null);
        return { success: true };
      }

      // Incorrect PIN handling
      const nextAttempts = attempts + 1;
      await secureStorage.setPinAttempts(nextAttempts);

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        return {
          success: false,
          error: "Maximum failed attempts reached. Please verify with Mobile OTP to reset your PIN.",
          isLocked: true,
          remainingAttempts: 0,
        };
      }

      if (nextAttempts >= COOLDOWN_THRESHOLD) {
        const cooldownTime = Date.now() + COOLDOWN_SECONDS * 1000;
        await secureStorage.setPinLockoutUntil(cooldownTime);
        return {
          success: false,
          error: `Incorrect PIN. Security delay applied: wait ${COOLDOWN_SECONDS}s before re-trying.`,
          remainingAttempts: MAX_FAILED_ATTEMPTS - nextAttempts,
          cooldownSeconds: COOLDOWN_SECONDS,
        };
      }

      const remaining = MAX_FAILED_ATTEMPTS - nextAttempts;
      return {
        success: false,
        error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        remainingAttempts: remaining,
      };
    } catch {
      return { success: false, error: "Failed to verify PIN." };
    }
  }

  /**
   * Resets PIN and lockout state (e.g. after successful OTP recovery).
   */
  public async clearPin(): Promise<void> {
    await secureStorage.clearPinCredentials();
  }
}

export const pinService = new PinAuthService();
