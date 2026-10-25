/**
 * ONEHEALTH ID (OH-ID) — Centralized API Client
 * Centralizes authentication headers, token refresh, base URL, error parsing, and request logging.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8050/api/v1";

export async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(options?.headers as Record<string, string>),
  };

  // Protect state-changing requests against CSRF
  if (options?.method && ["POST", "PUT", "PATCH", "DELETE"].includes(options.method.toUpperCase())) {
    headers["X-Requested-With"] = "XMLHttpRequest";
  }

  const cleanEndpoint = endpoint.startsWith("/api/v1")
    ? endpoint.replace(/^\/api\/v1/, "")
    : endpoint;
  const url = `${API_BASE}${cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`}`;
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      // Purge any legacy browser-stored credentials on unauthorized response
      try {
        localStorage.removeItem("oh_access_token");
        localStorage.removeItem("oh_workspace");
        localStorage.removeItem("oh_user");
        localStorage.removeItem("oh_impersonation");
        localStorage.removeItem("sathus_impersonation_session");
      } catch {
        // Ignore localStorage access restrictions
      }

      const path = window.location.pathname;
      const isPublicRoute =
        path.startsWith("/login") ||
        path.startsWith("/scan") ||
        path.startsWith("/verify") ||
        path.startsWith("/share") ||
        path === "/" ||
        path.startsWith("/terms") ||
        path.startsWith("/privacy") ||
        path.startsWith("/register");

      if (!endpoint.includes("/auth/login") && !isPublicRoute) {
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

export const apiClient = {
  get: async <T = any>(endpoint: string, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, { ...options, method: "GET" });
    return { data };
  },
  post: async <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  put: async <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  patch: async <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  delete: async <T = any>(endpoint: string, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, { ...options, method: "DELETE" });
    return { data };
  },
  upload: async <T = any>(endpoint: string, formData: FormData): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, {
      method: "POST",
      body: formData,
    });
    return { data };
  },
};

export { API_BASE };



