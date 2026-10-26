/**
 * ONEHEALTH ID (OH-ID) — Centralized API Payload Encryption Client
 * Implements client-side authenticated AES-256-GCM payload encryption & decryption
 * using native browser Web Crypto API (window.crypto.subtle).
 *
 * Security Guarantees:
 * 1. Zero static secrets in JavaScript bundles.
 * 2. Zero keys in localStorage or sessionStorage (purely in-memory).
 * 3. Ephemeral ECDH P-256 session key exchange with HKDF-SHA256 derivation.
 * 4. Derived AES keys are non-extractable (extractable: false).
 * 5. Unique 96-bit CSPRNG nonces per request.
 * 6. Protocol AAD binding (version, HTTP method, path, key_id, direction, req_id, timestamp).
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

export interface EncryptedPayloadEnvelope {
  version: number;
  key_id: string;
  iv: string;             // Base64 12-byte nonce
  encrypted_data: string; // Base64 ciphertext
  auth_tag: string;       // Base64 16-byte authentication tag
  req_id: string;         // Unique request identifier (UUID)
  ts: number;             // Unix timestamp in seconds
}

export interface HandshakeResponse {
  version: number;
  key_id: string;
  server_public_key: string;
  algorithm: string;
  curve: string;
  kdf: string;
  expires_at: number;
  timestamp_window_seconds: number;
}

const HKDF_SALT = new TextEncoder().encode("ohid-enterprise-payload-encryption-salt-2026");
const HKDF_INFO = new TextEncoder().encode("OH-ID-PAYLOAD-ENCRYPTION-V1");
const ENCRYPTION_VERSION = 1;

// Excluded routes matching backend specifications
const EXCLUDED_PREFIXES = [
  "/crypto/",
  "/api/v1/crypto/",
  "/health",
  "/openapi",
  "/docs",
  "/redoc",
  "/static/",
  "/api/v1/ocr/jobs/",
  "/api/v1/prescriptions/",
  "/api/v1/patients/verify-qr/",
  "/api/v1/verify/",
];

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function isRouteExcluded(path: string): boolean {
  const cleanPath = path.split("?")[0].trim();
  return EXCLUDED_PREFIXES.some(prefix => cleanPath.startsWith(prefix));
}

export function isEncryptedEnvelope(data: unknown): data is EncryptedPayloadEnvelope {
  if (!data || typeof data !== "object") return false;
  const cand = data as Record<string, unknown>;
  return (
    typeof cand.encrypted_data === "string" &&
    typeof cand.iv === "string" &&
    typeof cand.auth_tag === "string" &&
    typeof cand.key_id === "string" &&
    typeof cand.version === "number" &&
    (typeof cand.ts === "number" || typeof cand.timestamp === "number")
  );
}

class PayloadCryptoClient {
  private activeAesKey: CryptoKey | null = null;
  private activeKeyId: string | null = null;
  private keyExpiresAt: number = 0;
  private handshakePromise: Promise<string> | null = null;

  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.crypto !== "undefined" &&
      typeof window.crypto.subtle !== "undefined"
    );
  }

  public getActiveKeyId(): string | null {
    if (this.activeAesKey && this.activeKeyId && Date.now() < this.keyExpiresAt) {
      return this.activeKeyId;
    }
    return null;
  }

  /**
   * Canonicalize AAD matching the exact backend Python canonicalization rules:
   * v={version}|method={METHOD}|path={PATH}|key_id={KEY_ID}|dir={DIR}|req_id={REQ_ID}|ts={TS}
   */
  public canonicalizeAad(
    version: number,
    method: string,
    path: string,
    keyId: string,
    direction: "req" | "res",
    reqId: string,
    ts: number
  ): Uint8Array {
    let cleanPath = path.split("?")[0].trim();
    if (!cleanPath.startsWith("/")) {
      cleanPath = "/" + cleanPath;
    }
    const aadStr = `v=${version}|method=${method.toUpperCase().trim()}|path=${cleanPath}|key_id=${keyId.trim()}|dir=${direction.trim().toLowerCase()}|req_id=${reqId.trim()}|ts=${ts}`;
    return new TextEncoder().encode(aadStr);
  }

  /**
   * Establishes a shared session key with the server via ephemeral ECDH P-256.
   * Concurrent calls are deduped to prevent redundant round-trips.
   */
  public async ensureActiveSession(apiBaseUrl: string): Promise<string> {
    if (!this.isSupported()) {
      throw new Error("Web Crypto API is not available in this environment.");
    }

    // Return cached key if still valid (with a 30-second buffer before expiry)
    if (this.activeAesKey && this.activeKeyId && Date.now() + 30000 < this.keyExpiresAt) {
      return this.activeKeyId;
    }

    // Dedup in-flight handshakes
    if (this.handshakePromise) {
      return this.handshakePromise;
    }

    this.handshakePromise = (async () => {
      try {
        // 1. Generate client ephemeral ECDH P-256 keypair
        const clientKeyPair = await window.crypto.subtle.generateKey(
          { name: "ECDH", namedCurve: "P-256" },
          true, // extractable public key so we can export and send to server
          ["deriveKey", "deriveBits"]
        );

        // 2. Export client public key in raw X9.62 uncompressed format (65 bytes)
        const rawClientPubKey = await window.crypto.subtle.exportKey("raw", clientKeyPair.publicKey);
        const clientPubKeyB64 = arrayBufferToBase64(rawClientPubKey);

        // 3. Post to /api/v1/crypto/handshake
        const handshakeUrl = `${apiBaseUrl.replace(/\/$/, "")}/crypto/handshake`;
        const response = await fetch(handshakeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ client_public_key: clientPubKeyB64 }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Cryptographic handshake failed with status ${response.status}`);
        }

        const data: HandshakeResponse = await response.json();
        const serverPubKeyBytes = base64ToUint8Array(data.server_public_key);

        // 4. Import server public key
        const serverPubKey = await window.crypto.subtle.importKey(
          "raw",
          serverPubKeyBytes as unknown as BufferSource,
          { name: "ECDH", namedCurve: "P-256" },
          false,
          []
        );

        // 5. Derive shared secret using ECDH
        const sharedBits = await window.crypto.subtle.deriveBits(
          { name: "ECDH", public: serverPubKey },
          clientKeyPair.privateKey,
          256
        );

        // 6. Derive AES-256-GCM traffic key using HKDF-SHA256 (non-extractable!)
        const hkdfKey = await window.crypto.subtle.importKey(
          "raw",
          sharedBits,
          { name: "HKDF" },
          false,
          ["deriveKey"]
        );

        const aesKey = await window.crypto.subtle.deriveKey(
          {
            name: "HKDF",
            hash: "SHA-256",
            salt: HKDF_SALT,
            info: HKDF_INFO,
          },
          hkdfKey,
          { name: "AES-GCM", length: 256 },
          false, // Non-extractable for memory safety
          ["encrypt", "decrypt"]
        );

        this.activeAesKey = aesKey;
        this.activeKeyId = data.key_id;
        this.keyExpiresAt = data.expires_at * 1000;

        return data.key_id;
      } finally {
        this.handshakePromise = null;
      }
    })();

    return this.handshakePromise;
  }

  /**
   * Encrypts a request payload into a canonical EncryptedPayloadEnvelope.
   */
  public async encryptRequest(
    method: string,
    path: string,
    payload: unknown,
    apiBaseUrl: string
  ): Promise<EncryptedPayloadEnvelope> {
    const keyId = await this.ensureActiveSession(apiBaseUrl);
    if (!this.activeAesKey) {
      throw new Error("No active cryptographic session key available.");
    }

    // Serialize payload to UTF-8 bytes
    const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // Generate unique 96-bit (12-byte) nonce
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const reqId = window.crypto.randomUUID ? window.crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const ts = Math.floor(Date.now() / 1000);

    // Bind AAD
    const aad = this.canonicalizeAad(ENCRYPTION_VERSION, method, path, keyId, "req", reqId, ts);

    // Authenticated AES-GCM encryption
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource, additionalData: aad as unknown as BufferSource, tagLength: 128 },
      this.activeAesKey,
      plaintextBytes as unknown as BufferSource
    );

    const encBytes = new Uint8Array(encryptedBuffer);
    const ciphertext = encBytes.slice(0, encBytes.length - 16);
    const authTag = encBytes.slice(encBytes.length - 16);

    return {
      version: ENCRYPTION_VERSION,
      key_id: keyId,
      iv: arrayBufferToBase64(iv),
      encrypted_data: arrayBufferToBase64(ciphertext),
      auth_tag: arrayBufferToBase64(authTag),
      req_id: reqId,
      ts,
    };
  }

  /**
   * Decrypts an incoming EncryptedPayloadEnvelope using the active session key.
   */
  public async decryptResponse<T = unknown>(
    method: string,
    path: string,
    envelope: EncryptedPayloadEnvelope
  ): Promise<T> {
    if (!this.activeAesKey || !this.activeKeyId) {
      throw new Error("Cannot decrypt response: no active session key established.");
    }

    if (envelope.key_id !== this.activeKeyId) {
      throw new Error(`Key mismatch: response key_id '${envelope.key_id}' does not match active session key '${this.activeKeyId}'.`);
    }

    const iv = base64ToUint8Array(envelope.iv);
    const ciphertext = base64ToUint8Array(envelope.encrypted_data);
    const authTag = base64ToUint8Array(envelope.auth_tag);

    // Combine ciphertext and auth tag for Web Crypto SubtleCrypto.decrypt
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext, 0);
    combined.set(authTag, ciphertext.length);

    const ts = envelope.ts ?? (envelope as unknown as Record<string, unknown>).timestamp;
    const aad = this.canonicalizeAad(envelope.version, method, path, envelope.key_id, "res", envelope.req_id, Number(ts));

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as unknown as BufferSource, additionalData: aad as unknown as BufferSource, tagLength: 128 },
        this.activeAesKey,
        combined as unknown as BufferSource
      );

      const plaintext = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(plaintext) as T;
    } catch (err) {
      throw new Error(`Cryptographic verification failed: response payload authentication tag was rejected or payload was tampered with (${err}).`);
    }
  }

  /**
   * Purges active key material from memory (e.g. on logout or unauthorized error).
   */
  public clearSession(): void {
    this.activeAesKey = null;
    this.activeKeyId = null;
    this.keyExpiresAt = 0;
    this.handshakePromise = null;
  }
}

export const payloadCrypto = new PayloadCryptoClient();
