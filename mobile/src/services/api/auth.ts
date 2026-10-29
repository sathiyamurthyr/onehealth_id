/**
 * ONEHEALTH ID (OH-ID) Mobile — Auth API Service
 * 
 * Provides native authentication, session management, and credential lifecycles.
 * Integrates directly with secure keystore (SecureStore) and payload crypto.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import { fetchJSON } from "./client";
import { secureStorage } from "../storage/secure_store";
import { payloadCrypto } from "../../crypto/payload_encryption";
import {
  UserProfile,
  LoginResponse,
  RegisterResponse,
  WorkspaceResponse,
} from "../../types/auth";

export interface RegisterPayload {
  name: string;
  phone: string;
  password: string;
  age?: number;
  gender?: string;
  email?: string;
  blood_group?: string;
  emergency_contact?: string;
  address?: string;
  consent_given: boolean;
}

export const authApi = {
  /**
   * Mobile user authentication.
   * Omission of `X-Requested-With` header in client.ts ensures raw JWT delivery
   * in response body for secure storage in device keychain.
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetchJSON<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: username.trim(), password }),
    });

    if (res.access_token) {
      await secureStorage.setAccessToken(res.access_token);
    }

    if (res.user) {
      await secureStorage.setActiveUser(res.user);
      const hospitalId = res.user.hospital_ref_id || res.user.hospital_id;
      if (hospitalId) {
        await secureStorage.setActiveHospitalId(hospitalId);
      }
    }

    return res;
  },

  /**
   * Citizen self-registration for OneHealth ID.
   */
  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const res = await fetchJSON<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.access_token) {
      await secureStorage.setAccessToken(res.access_token);
    }

    if (res.user) {
      await secureStorage.setActiveUser(res.user);
    }

    return res;
  },

  /**
   * Retrieves authenticated profile for the current user.
   */
  getMe: async (): Promise<UserProfile> => {
    const res = await fetchJSON<{ success: boolean; data: UserProfile }>("/auth/me");
    const user = res.data;
    if (user) {
      await secureStorage.setActiveUser(user);
    }
    return user;
  },

  /**
   * Retrieves active workspace context and role routing for authenticated user.
   */
  getWorkspace: async (): Promise<WorkspaceResponse["workspace"]> => {
    const res = await fetchJSON<{ success: boolean; data: any }>("/auth/me/workspace");
    return res.data;
  },

  /**
   * Logs out user, revokes active server-side session, and purges all credentials.
   */
  logout: async (): Promise<void> => {
    try {
      await fetchJSON("/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout to guarantee local wipe
    } finally {
      payloadCrypto.clearSession();
      await secureStorage.clearSession();
    }
  },
};
