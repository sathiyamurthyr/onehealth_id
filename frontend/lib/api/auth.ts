import { fetchJSON } from "./client";
import { UserProfile } from "../types";

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await fetchJSON<{ access_token: string; user: UserProfile }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("oh_access_token", res.access_token);
      localStorage.setItem("oh_user", JSON.stringify(res.user));
    }
    return res;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("oh_access_token");
      localStorage.removeItem("oh_user");
    }
  },

  getCurrentUser: (): UserProfile | null => {
    if (typeof window !== "undefined") {
      const u = localStorage.getItem("oh_user");
      if (u) {
        try {
          return JSON.parse(u);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  getMe: async () => {
    return fetchJSON<{ success: boolean; data: UserProfile }>("/auth/me");
  },
};
