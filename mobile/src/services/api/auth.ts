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
  VerifyResetOtpResponse,
  ResetPasswordRequest,
  PasswordAssistanceRequest,
  PasswordAssistanceResponse,
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
   * Dispatches a single-use 6-digit password reset OTP to user's registered email.
   * Employs anti-enumeration generic messaging.
   */
  forgotPassword: async (email: string): Promise<{ message: string; status: string }> => {
    const res = await fetchJSON<{ success: boolean; data: { message: string; status: string } }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }
    );
    return res.data;
  },

  /**
   * Verifies the 6-digit reset code and retrieves an ephemeral single-use reset token.
   */
  verifyResetOtp: async (email: string, otp: string): Promise<VerifyResetOtpResponse> => {
    const res = await fetchJSON<{ success: boolean; data: VerifyResetOtpResponse }>(
      "/auth/verify-reset-otp",
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      }
    );
    return res.data;
  },

  /**
   * Resets the user's password using the verified ephemeral reset token.
   */
  resetPassword: async (payload: ResetPasswordRequest): Promise<{ message: string; email?: string }> => {
    const res = await fetchJSON<{ success: boolean; data: { message: string; email?: string } }>(
      "/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  /**
   * Resends password reset OTP subject to rate limiting and 60s cooldown.
   */
  resendResetOtp: async (email: string): Promise<{ message: string; status: string }> => {
    const res = await fetchJSON<{ success: boolean; data: { message: string; status: string } }>(
      "/auth/resend-reset-otp",
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }
    );
    return res.data;
  },

  /**
   * Submits a recovery assistance request to Super Admin support channel.
   */
  requestAssistance: async (payload: PasswordAssistanceRequest): Promise<PasswordAssistanceResponse> => {
    const res = await fetchJSON<{ success: boolean; data: PasswordAssistanceResponse }>(
      "/auth/request-assistance",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  /**
   * Checks status of assistance ticket.
   */
  getAssistanceStatus: async (referenceNumber: string): Promise<any> => {
    const res = await fetchJSON<{ success: boolean; data: any }>(
      `/auth/assistance-status/${encodeURIComponent(referenceNumber.trim())}`
    );
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
