/**
 * ONEHEALTH ID (OH-ID) Mobile — Cryptographic Types & Interfaces
 * Matches backend/app/core/payload_crypto.py and frontend/lib/crypto/payload_encryption.ts
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
  server_public_key: string; // Base64 65-byte uncompressed P-256 point starting with 0x04
  algorithm: string;
  curve: string;
  kdf: string;
  expires_at: number;
  timestamp_window_seconds: number;
}

export interface CryptoStatusResponse {
  status: "ACTIVE" | "DISABLED";
  algorithm: string;
  curve: string;
  kdf: string;
  version: number;
  strict_mode: boolean;
  timestamp_window_seconds: number;
  key_ttl_seconds: number;
}
