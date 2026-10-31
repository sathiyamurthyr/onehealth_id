/**
 * ONEHEALTH ID (OH-ID) Mobile — Hardware-Backed Secure Storage Service
 * Wraps expo-secure-store for storing JWT tokens and credentials safely.
 * Includes graceful in-memory fallback for Jest unit tests.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { UserProfile } from "../../types/auth";

const TOKEN_KEY = "oh_mobile_jwt";
const HOSPITAL_KEY = "oh_mobile_active_hospital";
const USER_KEY = "oh_mobile_user_profile";
const REMEMBERED_MOBILE_KEY = "oh_mobile_remembered_phone";
const REMEMBERED_NAME_KEY = "oh_mobile_remembered_name";
const PIN_VERIFIER_KEY = "oh_mobile_pin_verifier";
const PIN_SALT_KEY = "oh_mobile_pin_salt";
const PIN_ATTEMPTS_KEY = "oh_mobile_pin_attempts";
const PIN_LOCKOUT_UNTIL_KEY = "oh_mobile_pin_lockout_until";

// Volatile in-memory fallback for test harnesses
const inMemoryCache: Record<string, string> = {};

class SecureSessionStore {
  private isWeb(): boolean {
    return (
      Platform.OS === "web" ||
      (typeof window !== "undefined" && typeof window.localStorage !== "undefined")
    );
  }

  private isNativeAvailable(): boolean {
    if (this.isWeb()) return false;
    return (
      typeof SecureStore !== "undefined" &&
      typeof SecureStore.setItemAsync === "function"
    );
  }

  public async setItem(key: string, value: string): Promise<void> {
    inMemoryCache[key] = value;
    if (this.isWeb()) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // quota exceeded or private mode fallback
      }
      return;
    }
    try {
      if (this.isNativeAvailable()) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
    } catch {
      // inMemoryCache guarantees continuity
    }
  }

  public async getItem(key: string): Promise<string | null> {
    if (this.isWeb()) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      } catch {
        // storage disabled or private mode
      }
      return inMemoryCache[key] ?? null;
    }

    try {
      if (this.isNativeAvailable()) {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch {
      // Memory fallback
    }
    return inMemoryCache[key] ?? null;
  }

  public async deleteItem(key: string): Promise<void> {
    delete inMemoryCache[key];
    if (this.isWeb()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // fallback
      }
      return;
    }
    try {
      if (this.isNativeAvailable()) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // Memory fallback
    }
  }

  // Domain accessors
  public async getAccessToken(): Promise<string | null> {
    return this.getItem(TOKEN_KEY);
  }

  public async setAccessToken(token: string): Promise<void> {
    await this.setItem(TOKEN_KEY, token);
  }

  public async getActiveHospitalId(): Promise<string | null> {
    return this.getItem(HOSPITAL_KEY);
  }

  public async setActiveHospitalId(hospitalId: string): Promise<void> {
    await this.setItem(HOSPITAL_KEY, hospitalId);
  }

  public async getActiveUser(): Promise<UserProfile | null> {
    const raw = await this.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  public async setActiveUser(user: UserProfile | null): Promise<void> {
    if (!user) {
      await this.deleteItem(USER_KEY);
    } else {
      await this.setItem(USER_KEY, JSON.stringify(user));
      if (user.username) {
        await this.setRememberedUser(user.username, user.name || user.full_name || undefined);
      }
    }
  }

  // Remembered user credentials for fast returning-user sign-in
  public async getRememberedUser(): Promise<{ phone: string | null; name: string | null }> {
    const phone = await this.getItem(REMEMBERED_MOBILE_KEY);
    const name = await this.getItem(REMEMBERED_NAME_KEY);
    return { phone, name };
  }

  public async setRememberedUser(phone: string, name?: string): Promise<void> {
    await this.setItem(REMEMBERED_MOBILE_KEY, phone);
    if (name) {
      await this.setItem(REMEMBERED_NAME_KEY, name);
    }
  }

  public async clearRememberedUser(): Promise<void> {
    await this.deleteItem(REMEMBERED_MOBILE_KEY);
    await this.deleteItem(REMEMBERED_NAME_KEY);
  }

  // Secure PIN credentials & lockout state
  public async getPinCredentials(): Promise<{ verifier: string | null; salt: string | null }> {
    const verifier = await this.getItem(PIN_VERIFIER_KEY);
    const salt = await this.getItem(PIN_SALT_KEY);
    return { verifier, salt };
  }

  public async setPinCredentials(verifier: string, salt: string): Promise<void> {
    await this.setItem(PIN_VERIFIER_KEY, verifier);
    await this.setItem(PIN_SALT_KEY, salt);
  }

  public async clearPinCredentials(): Promise<void> {
    await this.deleteItem(PIN_VERIFIER_KEY);
    await this.deleteItem(PIN_SALT_KEY);
    await this.deleteItem(PIN_ATTEMPTS_KEY);
    await this.deleteItem(PIN_LOCKOUT_UNTIL_KEY);
  }

  public async getPinAttempts(): Promise<number> {
    const val = await this.getItem(PIN_ATTEMPTS_KEY);
    return val ? parseInt(val, 10) : 0;
  }

  public async setPinAttempts(attempts: number): Promise<void> {
    await this.setItem(PIN_ATTEMPTS_KEY, attempts.toString());
  }

  public async getPinLockoutUntil(): Promise<number | null> {
    const val = await this.getItem(PIN_LOCKOUT_UNTIL_KEY);
    return val ? parseInt(val, 10) : null;
  }

  public async setPinLockoutUntil(timestamp: number | null): Promise<void> {
    if (timestamp === null) {
      await this.deleteItem(PIN_LOCKOUT_UNTIL_KEY);
    } else {
      await this.setItem(PIN_LOCKOUT_UNTIL_KEY, timestamp.toString());
    }
  }

  public async clearSession(): Promise<void> {
    await this.deleteItem(TOKEN_KEY);
    await this.deleteItem(HOSPITAL_KEY);
    await this.deleteItem(USER_KEY);
    delete inMemoryCache[TOKEN_KEY];
    delete inMemoryCache[HOSPITAL_KEY];
    delete inMemoryCache[USER_KEY];
  }
}

export const secureStorage = new SecureSessionStore();
