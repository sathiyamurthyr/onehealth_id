import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { gcm } from "@noble/ciphers/aes.js";
import {
  MobilePayloadCryptoClient,
  uint8ArrayToBase64,
  base64ToUint8Array,
  getRandomBytes,
  generateUUID,
  isRouteExcluded,
  isEncryptedEnvelope,
} from "../src/crypto/payload_encryption";
import { EncryptedPayloadEnvelope } from "../src/crypto/types";

describe("MobilePayloadCryptoClient — Cryptographic Engine", () => {
  const HKDF_SALT = new TextEncoder().encode("ohid-enterprise-payload-encryption-salt-2026");
  const HKDF_INFO = new TextEncoder().encode("OH-ID-PAYLOAD-ENCRYPTION-V1");

  let client: MobilePayloadCryptoClient;

  beforeEach(() => {
    client = new MobilePayloadCryptoClient();
  });

  afterEach(() => {
    client.clearSession();
  });

  describe("Utility & Encoding Functions", () => {
    it("round-trips Uint8Array <-> Base64 accurately", () => {
      const original = new Uint8Array([0, 1, 2, 127, 128, 254, 255, 42, 99]);
      const b64 = uint8ArrayToBase64(original);
      const restored = base64ToUint8Array(b64);
      expect(restored).toEqual(original);
    });

    it("generates CSPRNG random bytes with correct byte length and high entropy", () => {
      const bytes1 = getRandomBytes(16);
      const bytes2 = getRandomBytes(16);
      expect(bytes1.length).toBe(16);
      expect(bytes2.length).toBe(16);
      expect(bytes1).not.toEqual(bytes2);
    });

    it("generates valid RFC 4122 v4 UUIDs", () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it("evaluates route exclusion rules per architecture specifications", () => {
      expect(isRouteExcluded("/crypto/handshake")).toBe(true);
      expect(isRouteExcluded("/api/v1/crypto/handshake")).toBe(true);
      expect(isRouteExcluded("/health")).toBe(true);
      expect(isRouteExcluded("/api/v1/patients/verify-qr/token123")).toBe(true);
      expect(isRouteExcluded("/api/v1/patients")).toBe(false);
      expect(isRouteExcluded("/api/v1/doctors/worklist?hospital=hosp-kedar")).toBe(false);
      expect(isRouteExcluded("/auth/login")).toBe(false);
    });

    it("identifies valid vs invalid EncryptedPayloadEnvelope objects", () => {
      const validEnvelope: EncryptedPayloadEnvelope = {
        version: 1,
        key_id: "key-test-1",
        iv: "dGVzdC1pdg==",
        encrypted_data: "ZW5jcnlwdGVk",
        auth_tag: "YXV0aC10YWc=",
        req_id: "req-1",
        ts: 1700000000,
      };
      expect(isEncryptedEnvelope(validEnvelope)).toBe(true);
      expect(isEncryptedEnvelope(null)).toBe(false);
      expect(isEncryptedEnvelope({})).toBe(false);
      expect(isEncryptedEnvelope({ version: 1, key_id: "missing-fields" })).toBe(false);
    });
  });

  describe("AAD Canonicalization", () => {
    it("generates deterministic canonical AAD bytes", () => {
      const aadBytes = client.canonicalizeAad(
        1,
        "POST",
        "/api/v1/prescriptions",
        "key-sec-99",
        "req",
        "req-uuid-123",
        1700000000
      );
      const expectedAadStr =
        "v=1|method=POST|path=/api/v1/prescriptions|key_id=key-sec-99|dir=req|req_id=req-uuid-123|ts=1700000000";
      expect(new TextDecoder().decode(aadBytes)).toBe(expectedAadStr);
    });

    it("normalizes method to uppercase and ensures leading slash on path", () => {
      const aadBytes = client.canonicalizeAad(
        1,
        "get",
        "patients/summary?filter=active",
        "key-sec-99",
        "res",
        "req-1",
        1700000000
      );
      const expectedAadStr =
        "v=1|method=GET|path=/patients/summary|key_id=key-sec-99|dir=res|req_id=req-1|ts=1700000000";
      expect(new TextDecoder().decode(aadBytes)).toBe(expectedAadStr);
    });
  });

  describe("ECDH Key Agreement & AES-256-GCM Symmetrical Derivation", () => {
    it("derives identical AES-256 traffic keys across client and server keypairs", () => {
      // 1. Simulate Client keypair
      const clientKeys = p256.keygen();
      const clientPub = p256.getPublicKey(clientKeys.secretKey, false);

      // 2. Simulate Server keypair
      const serverKeys = p256.keygen();
      const serverPub = p256.getPublicKey(serverKeys.secretKey, false);

      // 3. Client computes shared secret
      const clientNobleShared = p256.getSharedSecret(clientKeys.secretKey, serverPub);
      const clientSharedSecret = clientNobleShared.slice(1); // 32-byte X coordinate
      const clientAesKey = hkdf(sha256, clientSharedSecret, HKDF_SALT, HKDF_INFO, 32);

      // 4. Server computes shared secret
      const serverNobleShared = p256.getSharedSecret(serverKeys.secretKey, clientPub);
      const serverSharedSecret = serverNobleShared.slice(1);
      const serverAesKey = hkdf(sha256, serverSharedSecret, HKDF_SALT, HKDF_INFO, 32);

      expect(clientAesKey).toEqual(serverAesKey);
      expect(clientAesKey.length).toBe(32);
    });

    it("performs bidirectional end-to-end request encryption and response decryption", async () => {
      const keyId = "sess-test-8899";
      // Generate a mock shared AES key
      const sharedSecret = getRandomBytes(32);
      const aesKey = hkdf(sha256, sharedSecret, HKDF_SALT, HKDF_INFO, 32);

      // Initialize client session
      client.setSessionKey(keyId, aesKey);

      // --- Part A: Client Encrypts Outgoing Request ---
      const requestPayload = {
        patient_id: "pt-1001",
        diagnosis: "Acute Bronchitis",
        medications: [{ name: "Amoxicillin", dose: "500mg" }],
      };

      const envelope = await client.encryptRequest(
        "POST",
        "/api/v1/consultations",
        requestPayload,
        "https://ohid.online/api/v1"
      );

      expect(envelope.version).toBe(1);
      expect(envelope.key_id).toBe(keyId);
      expect(typeof envelope.iv).toBe("string");
      expect(typeof envelope.encrypted_data).toBe("string");
      expect(typeof envelope.auth_tag).toBe("string");
      expect(typeof envelope.req_id).toBe("string");

      // Verify that server with the same key can decrypt client's request
      const serverIv = base64ToUint8Array(envelope.iv);
      const serverCiphertext = base64ToUint8Array(envelope.encrypted_data);
      const serverAuthTag = base64ToUint8Array(envelope.auth_tag);
      const combinedReq = new Uint8Array(serverCiphertext.length + serverAuthTag.length);
      combinedReq.set(serverCiphertext, 0);
      combinedReq.set(serverAuthTag, serverCiphertext.length);

      const serverReqAad = client.canonicalizeAad(
        envelope.version,
        "POST",
        "/api/v1/consultations",
        keyId,
        "req",
        envelope.req_id,
        envelope.ts!
      );
      const serverDecipher = gcm(aesKey, serverIv, serverReqAad);
      const serverDecryptedBytes = serverDecipher.decrypt(combinedReq);
      const serverRestoredPayload = JSON.parse(new TextDecoder().decode(serverDecryptedBytes));

      expect(serverRestoredPayload).toEqual(requestPayload);

      // --- Part B: Server Encrypts Response and Client Decrypts ---
      const serverResponsePayload = {
        consultation_id: "cons-9002",
        status: "SCHEDULED",
        doctor_id: "doc-55",
      };

      const resIv = getRandomBytes(12);
      const resReqId = envelope.req_id; // Same correlation ID
      const resTs = Math.floor(Date.now() / 1000);
      const resAad = client.canonicalizeAad(
        1,
        "POST",
        "/api/v1/consultations",
        keyId,
        "res",
        resReqId,
        resTs
      );

      const resPlaintextBytes = new TextEncoder().encode(JSON.stringify(serverResponsePayload));
      const resCipher = gcm(aesKey, resIv, resAad);
      const resCiphertextWithTag = resCipher.encrypt(resPlaintextBytes);
      const resCiphertext = resCiphertextWithTag.slice(0, -16);
      const resAuthTag = resCiphertextWithTag.slice(-16);

      const resEnvelope: EncryptedPayloadEnvelope = {
        version: 1,
        key_id: keyId,
        iv: uint8ArrayToBase64(resIv),
        encrypted_data: uint8ArrayToBase64(resCiphertext),
        auth_tag: uint8ArrayToBase64(resAuthTag),
        req_id: resReqId,
        ts: resTs,
      };

      const clientDecryptedResponse = client.decryptResponse(
        "POST",
        "/api/v1/consultations",
        resEnvelope
      );

      expect(clientDecryptedResponse).toEqual(serverResponsePayload);
    });
  });

  describe("Anti-Tampering & Cryptographic Integrity Protection", () => {
    let testAesKey: Uint8Array;
    const keyId = "sess-tamper-guard";

    beforeEach(() => {
      testAesKey = hkdf(sha256, getRandomBytes(32), HKDF_SALT, HKDF_INFO, 32);
      client.setSessionKey(keyId, testAesKey);
    });

    const createValidResponseEnvelope = (method: string, path: string, body: any): EncryptedPayloadEnvelope => {
      const iv = getRandomBytes(12);
      const reqId = generateUUID();
      const ts = Math.floor(Date.now() / 1000);
      const aad = client.canonicalizeAad(1, method, path, keyId, "res", reqId, ts);

      const plaintextBytes = new TextEncoder().encode(JSON.stringify(body));
      const cipher = gcm(testAesKey, iv, aad);
      const encrypted = cipher.encrypt(plaintextBytes);

      return {
        version: 1,
        key_id: keyId,
        iv: uint8ArrayToBase64(iv),
        encrypted_data: uint8ArrayToBase64(encrypted.slice(0, -16)),
        auth_tag: uint8ArrayToBase64(encrypted.slice(-16)),
        req_id: reqId,
        ts,
      };
    };

    it("rejects tampered ciphertext bytes", () => {
      const env = createValidResponseEnvelope("GET", "/api/v1/records", { sensitive: "phi_data" });
      const cipherBytes = base64ToUint8Array(env.encrypted_data);
      cipherBytes[0] ^= 0xff; // Flip bits
      env.encrypted_data = uint8ArrayToBase64(cipherBytes);

      expect(() => {
        client.decryptResponse("GET", "/api/v1/records", env);
      }).toThrow(/Cryptographic verification failed/);
    });

    it("rejects tampered authentication tag", () => {
      const env = createValidResponseEnvelope("GET", "/api/v1/records", { sensitive: "phi_data" });
      const tagBytes = base64ToUint8Array(env.auth_tag);
      tagBytes[0] ^= 0x01; // Corrupt tag
      env.auth_tag = uint8ArrayToBase64(tagBytes);

      expect(() => {
        client.decryptResponse("GET", "/api/v1/records", env);
      }).toThrow(/Cryptographic verification failed/);
    });

    it("rejects tampered IV nonce", () => {
      const env = createValidResponseEnvelope("GET", "/api/v1/records", { sensitive: "phi_data" });
      const ivBytes = base64ToUint8Array(env.iv);
      ivBytes[0] ^= 0x55;
      env.iv = uint8ArrayToBase64(ivBytes);

      expect(() => {
        client.decryptResponse("GET", "/api/v1/records", env);
      }).toThrow(/Cryptographic verification failed/);
    });

    it("rejects ciphertext decrypted against mismatched endpoint path (AAD binding)", () => {
      const env = createValidResponseEnvelope("GET", "/api/v1/records", { sensitive: "phi_data" });

      // Attempting to decrypt with different path must fail AAD validation
      expect(() => {
        client.decryptResponse("GET", "/api/v1/other-endpoint", env);
      }).toThrow(/Cryptographic verification failed/);
    });

    it("rejects ciphertext decrypted against mismatched HTTP method (AAD binding)", () => {
      const env = createValidResponseEnvelope("POST", "/api/v1/records", { sensitive: "phi_data" });

      expect(() => {
        client.decryptResponse("PUT", "/api/v1/records", env);
      }).toThrow(/Cryptographic verification failed/);
    });

    it("rejects ciphertext with mismatched key_id", () => {
      const env = createValidResponseEnvelope("GET", "/api/v1/records", { sensitive: "phi_data" });
      env.key_id = "alien-session-key";

      expect(() => {
        client.decryptResponse("GET", "/api/v1/records", env);
      }).toThrow(/Key mismatch/);
    });

    it("zeroes key material and purges session on clearSession()", () => {
      expect(client.getActiveKeyId()).toBe(keyId);
      client.clearSession();
      expect(client.getActiveKeyId()).toBeNull();

      const env = createValidResponseEnvelope("GET", "/api/v1/records", { test: true });
      expect(() => {
        client.decryptResponse("GET", "/api/v1/records", env);
      }).toThrow(/no active session key/);
    });
  });
});
