import { fetchJSON, apiClient } from "../src/services/api/client";
import { authApi } from "../src/services/api/auth";
import { secureStorage } from "../src/services/storage/secure_store";
import {
  payloadCrypto,
  uint8ArrayToBase64,
  base64ToUint8Array,
  getRandomBytes,
} from "../src/crypto/payload_encryption";
import { EncryptedPayloadEnvelope } from "../src/crypto/types";
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { gcm } from "@noble/ciphers/aes.js";

const HKDF_SALT = new TextEncoder().encode("ohid-enterprise-payload-encryption-salt-2026");
const HKDF_INFO = new TextEncoder().encode("OH-ID-PAYLOAD-ENCRYPTION-V1");

describe("OH-ID Mobile — Centralized API Client & Auth Service", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: jest.Mock;

  // Reusable simulated server keys for mock handshake handler
  const serverKeys = p256.keygen();
  const serverPub = p256.getPublicKey(serverKeys.secretKey, false);

  const createHandshakeResponse = () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({
      key_id: "server-session-handshake-1",
      server_public_key: uint8ArrayToBase64(serverPub),
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }),
  });

  beforeEach(async () => {
    await secureStorage.clearSession();
    payloadCrypto.clearSession();
    mockFetch = jest.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await secureStorage.clearSession();
    payloadCrypto.clearSession();
  });

  describe("Bearer Auth & Multi-Tenant Isolation Headers", () => {
    it("injects Authorization Bearer header when token is stored in SecureStore", async () => {
      await secureStorage.setAccessToken("test-jwt-token-xyz");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ status: "ok" }),
      });

      await fetchJSON("/patients/list", { skipEncryption: true });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers["Authorization"]).toBe("Bearer test-jwt-token-xyz");
    });

    it("injects X-Hospital-Ref-Id header from secure storage", async () => {
      await secureStorage.setActiveHospitalId("hosp-apollo-bangalore");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ status: "ok" }),
      });

      await fetchJSON("/doctor/worklist", { skipEncryption: true });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["X-Hospital-Ref-Id"]).toBe("hosp-apollo-bangalore");
    });

    it("allows overriding hospitalRefId and usertypeRefId via fetch options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ status: "ok" }),
      });

      await fetchJSON("/admin/staff", {
        skipEncryption: true,
        hospitalRefId: "hosp-manipal-specialty",
        usertypeRefId: "role-hospital-admin",
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["X-Hospital-Ref-Id"]).toBe("hosp-manipal-specialty");
      expect(headers["X-Usertype-Ref-Id"]).toBe("role-hospital-admin");
    });
  });

  describe("Application-Layer Payload Encryption & Decryption", () => {
    it("wraps mutating request bodies in encrypted envelopes with metadata headers", async () => {
      // Set active session key
      const keyId = "key-test-mutating";
      const aesKey = hkdf(sha256, getRandomBytes(32), HKDF_SALT, HKDF_INFO, 32);
      payloadCrypto.setSessionKey(keyId, aesKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true, message: "Record saved" }),
      });

      const requestPayload = { patient_id: "pt-99", pulse_rate: 72 };
      await fetchJSON("/api/v1/patients/vitals", {
        method: "POST",
        body: JSON.stringify(requestPayload),
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, req] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/patients/vitals");
      expect(req.headers["X-OH-Encrypted"]).toBe("1");
      expect(req.headers["X-Session-Key-Id"]).toBe(keyId);

      // Verify body is an EncryptedPayloadEnvelope
      const parsedBody = JSON.parse(req.body);
      expect(parsedBody.version).toBe(1);
      expect(parsedBody.key_id).toBe(keyId);
      expect(typeof parsedBody.encrypted_data).toBe("string");
      expect(typeof parsedBody.iv).toBe("string");
      expect(typeof parsedBody.auth_tag).toBe("string");
    });

    it("automatically decrypts encrypted response payloads", async () => {
      const keyId = "key-test-response";
      const aesKey = hkdf(sha256, getRandomBytes(32), HKDF_SALT, HKDF_INFO, 32);
      payloadCrypto.setSessionKey(keyId, aesKey);

      const secretClinicalData = { diagnosis: "Hypertension Stage 2", confidential: true };
      const iv = getRandomBytes(12);
      const reqId = "req-corr-123";
      const ts = Math.floor(Date.now() / 1000);
      const aad = payloadCrypto.canonicalizeAad(1, "GET", "/api/v1/patients/history", keyId, "res", reqId, ts);

      const cipher = gcm(aesKey, iv, aad);
      const encrypted = cipher.encrypt(new TextEncoder().encode(JSON.stringify(secretClinicalData)));

      const responseEnvelope: EncryptedPayloadEnvelope = {
        version: 1,
        key_id: keyId,
        iv: uint8ArrayToBase64(iv),
        encrypted_data: uint8ArrayToBase64(encrypted.slice(0, -16)),
        auth_tag: uint8ArrayToBase64(encrypted.slice(-16)),
        req_id: reqId,
        ts,
      };

      const responseHeaders = new Headers();
      responseHeaders.set("x-oh-encrypted", "1");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: responseHeaders,
        json: async () => responseEnvelope,
      });

      const result = await fetchJSON("/api/v1/patients/history", { method: "GET" });
      expect(result).toEqual(secretClinicalData);
    });

    it("retries request on 401 KEY_EXPIRED after clearing invalid session key", async () => {
      const keyId = "expired-key-id";
      payloadCrypto.setSessionKey(keyId, getRandomBytes(32));

      // First call fails with 401 KEY_EXPIRED
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ detail: "Session key expired (KEY_EXPIRED)" }),
      });

      // Second call (retry) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ recovered: true }),
      });

      const result = await fetchJSON("/api/v1/vitals", {
        method: "GET",
        skipEncryption: true,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ recovered: true });
    });
  });

  describe("authApi Service Lifecycle", () => {
    it("completes login, omits X-Requested-With, and saves tokens and profile in SecureStore", async () => {
      const mockProfile = {
        id: "usr-4455",
        user_ref_id: "usr-4455",
        username: "9876543210",
        name: "Dr. Suresh Nair",
        role: "DOCTOR",
        hospital_ref_id: "hosp-kedar-super",
        email: "suresh@kedar.in",
      };

      // Handle both potential handshake and the actual login endpoint
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/crypto/handshake")) {
          return createHandshakeResponse();
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            access_token: "jwt-suresh-access-token",
            token_type: "bearer",
            user: mockProfile,
          }),
        };
      });

      const res = await authApi.login("9876543210", "DoctorSecurePass#1");

      expect(res.access_token).toBe("jwt-suresh-access-token");
      expect(res.user.role).toBe("DOCTOR");

      // Verify that X-Requested-With was NOT sent on login request
      const loginCall = mockFetch.mock.calls.find((call) => call[0].includes("/auth/login"));
      expect(loginCall).toBeDefined();
      expect(loginCall[1].headers["X-Requested-With"]).toBeUndefined();

      // Verify SecureStore persistence
      const storedToken = await secureStorage.getAccessToken();
      expect(storedToken).toBe("jwt-suresh-access-token");

      const storedUser = await secureStorage.getActiveUser();
      expect(storedUser?.name).toBe("Dr. Suresh Nair");

      const storedHospital = await secureStorage.getActiveHospitalId();
      expect(storedHospital).toBe("hosp-kedar-super");
    });

    it("purges all tokens and active crypto session on logout()", async () => {
      await secureStorage.setAccessToken("token-to-purge");
      await secureStorage.setActiveHospitalId("hosp-temp");
      payloadCrypto.setSessionKey("key-temp", getRandomBytes(32));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true, message: "Logged out" }),
      });

      await authApi.logout();

      expect(await secureStorage.getAccessToken()).toBeNull();
      expect(await secureStorage.getActiveHospitalId()).toBeNull();
      expect(await secureStorage.getActiveUser()).toBeNull();
      expect(payloadCrypto.getActiveKeyId()).toBeNull();
    });

    it("retrieves current user profile via getMe()", async () => {
      const mockProfile = {
        id: "pt-77",
        username: "9988776655",
        name: "Ananya Sharma",
        role: "PATIENT",
        email: "ananya@example.com",
      };

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/crypto/handshake")) {
          return createHandshakeResponse();
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ success: true, data: mockProfile }),
        };
      });

      const user = await authApi.getMe();
      expect(user.role).toBe("PATIENT");
      expect(user.name).toBe("Ananya Sharma");
    });

    it("retrieves user workspace routing via getWorkspace()", async () => {
      const mockWs = {
        id: "ws-reception-1",
        workspace_type: "RECEPTION",
        role_code: "RECEPTIONIST",
        role_name: "Front Desk Officer",
        default_route: "/reception",
        hospital_ref_id: "hosp-kedar",
        hospital_name: "Kedar Hospital",
      };

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/crypto/handshake")) {
          return createHandshakeResponse();
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ success: true, data: mockWs }),
        };
      });

      const ws = await authApi.getWorkspace();
      expect(ws.role_code).toBe("RECEPTIONIST");
      expect(ws.default_route).toBe("/reception");
    });
  });

  describe("apiClient Helper Methods", () => {
    it("provides get, post, put, patch, and delete convenience methods", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true }),
      });

      await apiClient.get("/test", { skipEncryption: true });
      expect(mockFetch.mock.calls[0][1].method).toBe("GET");

      await apiClient.post("/test", { a: 1 }, { skipEncryption: true });
      expect(mockFetch.mock.calls[1][1].method).toBe("POST");

      await apiClient.put("/test", { b: 2 }, { skipEncryption: true });
      expect(mockFetch.mock.calls[2][1].method).toBe("PUT");

      await apiClient.patch("/test", { c: 3 }, { skipEncryption: true });
      expect(mockFetch.mock.calls[3][1].method).toBe("PATCH");

      await apiClient.delete("/test", { skipEncryption: true });
      expect(mockFetch.mock.calls[4][1].method).toBe("DELETE");
    });
  });
});
