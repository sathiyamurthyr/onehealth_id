/**
 * ONEHEALTH ID (OH-ID) Mobile — Centralized Native API Client
 * 
 * Features:
 * 1. Bearer Token Authentication (Hardware Keystore / SecureStore).
 * 2. Active Hospital Tenant Isolation (X-Hospital-Ref-Id header).
 * 3. Transparent Inbound Application-Layer Payload Encryption (ECDH + AES-256-GCM).
 * 4. Transparent Outbound Response Decryption.
 * 5. Automated Cryptographic Key Expiry Recovery (re-handshake and retry).
 * 6. Explicitly omits X-Requested-With on login to ensure native token delivery.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import { Platform } from "react-native";
import {
  payloadCrypto,
  isRouteExcluded,
  isEncryptedEnvelope,
} from "../../crypto/payload_encryption";
import { EncryptedPayloadEnvelope } from "../../crypto/types";
import { secureStorage } from "../storage/secure_store";

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  // In local web preview (e.g. localhost:8081), ensure requests target the local dev backend
  // to avoid CORS preflight rejections from remote production deployments.
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const isLocalWeb =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocalWeb) {
      if (envUrl && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
        return envUrl;
      }
      return "http://localhost:8008/api/v1";
    }
  }

  return envUrl || "https://ohid.online/api/v1";
};

export interface FetchOptions extends RequestInit {
  skipEncryption?: boolean;
  hospitalRefId?: string;
  usertypeRefId?: string;
}

export async function fetchJSON<T>(
  endpoint: string,
  options?: FetchOptions
): Promise<T> {
  const API_BASE = getApiBaseUrl();
  const method = (options?.method || "GET").toUpperCase();
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    "Accept": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  // 1. Bearer Token Authentication Injection
  const token = await secureStorage.getAccessToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 2. Multi-Tenant Hospital Context Injection
  const hospitalId = options?.hospitalRefId || (await secureStorage.getActiveHospitalId());
  if (hospitalId && !headers["X-Hospital-Ref-Id"]) {
    headers["X-Hospital-Ref-Id"] = hospitalId;
  }
  if (options?.usertypeRefId && !headers["X-Usertype-Ref-Id"]) {
    headers["X-Usertype-Ref-Id"] = options.usertypeRefId;
  }

  // Normalize URL path
  const cleanEndpoint = endpoint.startsWith("/api/v1")
    ? endpoint.replace(/^\/api\/v1/, "")
    : endpoint;
  const url = `${API_BASE.replace(/\/$/, "")}${cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`}`;

  // Deterministic canonical path for Additional Authenticated Data (AAD)
  const apiBasePath = (() => {
    try {
      const parsed = new URL(API_BASE);
      return parsed.pathname.replace(/\/$/, "");
    } catch {
      return "/api/v1";
    }
  })();
  const canonicalPath = cleanEndpoint.startsWith("/api/v1")
    ? cleanEndpoint
    : `${apiBasePath}${cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`}`;

  let requestBody = options?.body;
  const canEncrypt =
    !options?.skipEncryption &&
    !isFormData &&
    !isRouteExcluded(canonicalPath);

  // 3. Inbound Request Body Encryption
  if (canEncrypt && ["POST", "PUT", "PATCH", "DELETE"].includes(method) && requestBody) {
    try {
      let parsedPayload: unknown;
      if (typeof requestBody === "string") {
        try {
          parsedPayload = JSON.parse(requestBody);
        } catch {
          parsedPayload = requestBody;
        }
      } else {
        parsedPayload = requestBody;
      }

      const envelope: EncryptedPayloadEnvelope = await payloadCrypto.encryptRequest(
        method,
        canonicalPath,
        parsedPayload,
        API_BASE
      );

      requestBody = JSON.stringify(envelope);
      headers["X-OH-Encrypted"] = "1";
      headers["X-Session-Key-Id"] = envelope.key_id;
      headers["Content-Type"] = "application/json";
    } catch (encErr) {
      console.warn("Mobile payload encryption skipped or failed:", encErr);
    }
  } else if (canEncrypt) {
    // For read operations (e.g. GET), signal encryption capability or establish session
    try {
      const activeKeyId = await payloadCrypto.ensureActiveSession(API_BASE);
      if (activeKeyId) {
        headers["X-OH-Encrypted"] = "1";
        headers["X-Session-Key-Id"] = activeKeyId;
      }
    } catch (encErr) {
      console.warn("Mobile read encryption handshake skipped:", encErr);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      body: requestBody,
      headers,
    });
  } catch (netErr: any) {
    const isLocal = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
    throw new Error(
      netErr?.message?.includes("Failed to fetch") || netErr?.message?.includes("Network request failed")
        ? isLocal
          ? "Unable to reach OneHealth ID server (http://localhost:8008). Please ensure the backend is running."
          : "Unable to connect to OneHealth ID server. Please check your network connection."
        : netErr?.message || "A network error occurred."
    );
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const err = await response.json();
      errorDetail = err.detail || err.error?.message || err.message || JSON.stringify(err);
    } catch {
      // Body not JSON
    }

    // 4. Automatic Session Recovery on Key Expiry
    if (
      response.status === 401 &&
      (errorDetail.includes("KEY_EXPIRED") || errorDetail.includes("Session key"))
    ) {
      payloadCrypto.clearSession();
      // Re-try once with fresh handshake if not already retrying
      if (!(options as any)?._isRetry) {
        return fetchJSON<T>(endpoint, { ...(options || {}), _isRetry: true } as any);
      }
    }

    if (response.status === 401 && !endpoint.includes("/auth/login")) {
      payloadCrypto.clearSession();
      await secureStorage.clearSession();
    }

    throw new Error(errorDetail);
  }

  const responseData = await response.json();

  // 5. Outbound Encrypted Response Decryption
  if (
    response.headers.get("x-oh-encrypted") === "1" ||
    isEncryptedEnvelope(responseData)
  ) {
    return payloadCrypto.decryptResponse<T>(
      method,
      canonicalPath,
      responseData as EncryptedPayloadEnvelope
    );
  }

  return responseData as T;
}

export const apiClient = {
  get: async <T = any>(endpoint: string, options?: FetchOptions): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, { ...options, method: "GET" });
    return { data };
  },
  post: async <T = any>(endpoint: string, body?: any, options?: FetchOptions): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, {
      ...options,
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    return { data };
  },
  put: async <T = any>(endpoint: string, body?: any, options?: FetchOptions): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, {
      ...options,
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    return { data };
  },
  patch: async <T = any>(endpoint: string, body?: any, options?: FetchOptions): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    return { data };
  },
  delete: async <T = any>(endpoint: string, options?: FetchOptions): Promise<{ data: T }> => {
    const data = await fetchJSON<T>(endpoint, { ...options, method: "DELETE" });
    return { data };
  },
};
