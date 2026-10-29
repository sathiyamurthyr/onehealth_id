/**
 * ONEHEALTH ID (OH-ID) Mobile — Hardware-Backed Secure Storage Service
 * Wraps expo-secure-store for storing JWT tokens and credentials safely.
 * Includes graceful in-memory fallback for Jest unit tests.
 */

import * as SecureStore from "expo-secure-store";
import { UserProfile } from "../../types/auth";

const TOKEN_KEY = "oh_mobile_jwt";
const HOSPITAL_KEY = "oh_mobile_active_hospital";
const USER_KEY = "oh_mobile_user_profile";

// Volatile in-memory fallback for test harnesses
const inMemoryCache: Record<string, string> = {};

class SecureSessionStore {
  private isNativeAvailable(): boolean {
    return (
      typeof SecureStore !== "undefined" &&
      typeof SecureStore.setItemAsync === "function"
    );
  }

  public async setItem(key: string, value: string): Promise<void> {
    inMemoryCache[key] = value;
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
    }
  }

  public async clearSession(): Promise<void> {
    await this.deleteItem(TOKEN_KEY);
    await this.deleteItem(HOSPITAL_KEY);
    await this.deleteItem(USER_KEY);
    for (const k of Object.keys(inMemoryCache)) {
      delete inMemoryCache[k];
    }
  }
}

export const secureStorage = new SecureSessionStore();
