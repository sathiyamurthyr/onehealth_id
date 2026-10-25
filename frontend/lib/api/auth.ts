import { fetchJSON } from "./client";
import { UserProfile } from "../types";

let _inMemoryUser: UserProfile | null = null;

export function purgeLegacyStorage(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("oh_access_token");
      localStorage.removeItem("oh_user");
      localStorage.removeItem("oh_workspace");
      localStorage.removeItem("oh_impersonation");
      localStorage.removeItem("sathus_impersonation_session");
      sessionStorage.removeItem("oh_access_token");
      sessionStorage.removeItem("oh_user");
      sessionStorage.removeItem("oh_workspace");
    } catch {
      // Ignore localStorage access restrictions
    }
  }
}

export const authApi = {
  login: async (username: string, password: string) => {
    purgeLegacyStorage();
    const res = await fetchJSON<{ access_token?: string; user: UserProfile }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    _inMemoryUser = res.user;
    return res;
  },

  register: async (payload: {
    name: string;
    phone: string;
    password: string;
    age: number;
    gender?: string;
    email?: string;
    blood_group?: string;
    emergency_contact?: string;
    address?: string;
    consent_given: boolean;
  }) => {
    purgeLegacyStorage();
    const res = await fetchJSON<{
      message: string;
      user_id: string;
      patient_id: string;
      onehealth_id: string;
      access_token?: string;
      token_type: string;
      user: UserProfile;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    _inMemoryUser = res.user;
    return res;
  },

  logout: async () => {
    try {
      await fetchJSON("/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors during logout
    }
    _inMemoryUser = null;
    purgeLegacyStorage();
  },

  getCurrentUser: (): UserProfile | null => {
    return _inMemoryUser;
  },

  setCurrentUser: (user: UserProfile | null): void => {
    _inMemoryUser = user;
  },

  purgeLegacyStorage,

  getMe: async () => {
    return fetchJSON<{ success: boolean; data: UserProfile }>("/auth/me");
  },

  getWorkspace: async () => {
    return fetchJSON<{ success: boolean; data: any }>("/auth/me/workspace");
  },

  validateInvitation: async (token: string) => {
    return fetchJSON<{ success: boolean; data: any; message?: string }>(`/auth/invitations/${token}/validate`);
  },

  acceptInvitation: async (token: string, payload: { password: string; mfa_enabled?: boolean }) => {
    return fetchJSON<{ success: boolean; data: any; message?: string }>(`/auth/invitations/${token}/accept`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  forgotPassword: async (email: string) => {
    return fetchJSON<{ success: boolean; data: { message: string; status: string } }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  verifyResetOtp: async (email: string, otp: string) => {
    return fetchJSON<{ success: boolean; data: { message: string; reset_token: string; expires_in_seconds: number } }>("/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  resetPassword: async (payload: {
    email: string;
    reset_token: string;
    new_password: string;
    confirm_password: string;
  }) => {
    return fetchJSON<{ success: boolean; data: { message: string; email?: string } }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  resendResetOtp: async (email: string) => {
    return fetchJSON<{ success: boolean; data: { message: string; status: string } }>("/auth/resend-reset-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  requestAssistance: async (payload: {
    email: string;
    category?: string;
    description?: string;
    contact_phone?: string;
  }) => {
    return fetchJSON<{ success: boolean; data: { reference_number: string; status: string; message: string } }>("/auth/request-assistance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getAssistanceStatus: async (referenceNumber: string) => {
    return fetchJSON<{ success: boolean; data: any; message?: string }>(`/auth/assistance-status/${encodeURIComponent(referenceNumber)}`);
  },
};

