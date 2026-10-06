/**
 * ONEHEALTH ID (OH-ID) — Centralized API Client
 * Centralizes authentication headers, token refresh, base URL, error parsing, and request logging.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8050/api/v1";

export async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("oh_access_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("oh_access_token");
      localStorage.removeItem("oh_workspace");
      localStorage.removeItem("oh_user");
      if (!endpoint.includes("/auth/login") && !window.location.pathname.startsWith("/login")) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
      }
    }

    let errorDetail = "API Error";
    try {
      const err = await response.json();
      errorDetail = err.detail || err.error?.message || err.message || JSON.stringify(err);
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

