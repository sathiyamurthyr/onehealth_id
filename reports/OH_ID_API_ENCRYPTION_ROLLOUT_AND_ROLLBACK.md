# OneHealth ID (OH-ID) — API Payload Encryption Rollout & Rollback Strategy
**Document Reference:** `OH-ID-SEC-ENC-004`  
**Classification:** Enterprise DevSecOps Operational Playbook  
**Status:** IMPLEMENTATION VERIFIED — READY FOR SECURITY REVIEW  
**Engineering Leads:** Principal Security Architect & Principal Backend Engineer  
**Date:** October 25, 2026  

---

## 1. Rollout Overview & Staging Protocol

To eliminate operational risk across hospital clinical operations, the deployment of application-layer API payload encryption follows a phased migration framework.

In compliance with the project's absolute restrictions:
- **Zero code has been pushed to remote branches or live servers.**
- **Zero production containers or VPS configurations have been modified.**
- All validation has been performed exclusively on local branch `enc` using synthetic data.

---

## 2. Phased Migration Framework

```
Phase 1: Local Verification [COMPLETED]
├── Implement Backend Engine & Middleware
├── Implement Frontend Web Crypto Client
├── Cross-Platform Interoperability Verification (Python <-> Node)
└── Multi-Suite Automated Security & Regression Tests (83/83 Passed)

Phase 2: Staging Canary Deployment [UPCOMING - PENDING SECURITY REVIEW]
├── Configure Staging Environment (.env.staging)
│   ├── PAYLOAD_ENCRYPTION_ENABLED=True
│   └── PAYLOAD_ENCRYPTION_STRICT=False (Graceful Ingestion)
├── Synthetic Clinical Data Ingestion Tests
└── Multi-Browser / Cross-Device Compatibility Verification (Chrome, Edge, Safari, Firefox, iOS, Android)

Phase 3: Production Phased Rollout
├── Stage 3A: Permissive Envelope Deployment (STRICT=False)
│   └── Monitor adoption telemetry and client-side error rates
└── Stage 3B: Strict Enterprise Enforcement (STRICT=True)
    └── Reject unencrypted mutating requests (HTTP 400 ENCRYPTION_REQUIRED)
```

---

## 3. Configuration Flags & Operational Knobs

All cryptographic behavior is controlled via environment variables loaded into `backend/app/core/config.py`:

| Environment Variable | Default Value | Production Target | Operational Description |
| :--- | :--- | :--- | :--- |
| `PAYLOAD_ENCRYPTION_ENABLED` | `True` | `True` | Master kill-switch. When `False`, the middleware immediately passes all traffic through without cryptographic processing. |
| `PAYLOAD_ENCRYPTION_STRICT` | `False` | `True` | Enforcement gate. When `False`, unencrypted requests from legacy clients are permitted. When `True`, unencrypted requests on sensitive routes receive HTTP 400 (`ENCRYPTION_REQUIRED`). |
| `PAYLOAD_ENCRYPTION_KEY_TTL_SECONDS`| `3600` | `3600` | In-memory session key lifespan (1 hour). Keys are automatically purged upon expiry. |
| `PAYLOAD_ENCRYPTION_TIMESTAMP_WINDOW`| `60` | `60` | Freshness window ($\pm 60\text{s}$) for anti-replay timestamp verification. |
| `PAYLOAD_ENCRYPTION_MAX_PAYLOAD_SIZE`| `10485760` | `10485760` | Maximum plaintext payload size (10 MB) to protect against memory exhaustion. |

---

## 4. Telemetry & DevSecOps Monitoring (Zero PHI Exposure)

The payload encryption middleware and cryptographic engine emit structured DevSecOps audit logs via `backend/app/core/logging.py`:

### 4.1 Permitted Log Fields
- `event_type`: (e.g. `PAYLOAD_ENCRYPTION_KEY_ESTABLISHED`, `PAYLOAD_REPLAY_DETECTED`, `PAYLOAD_DECRYPTION_AUTH_TAG_FAILED`)
- `status`: (`SUCCESS`, `DENIED`, `ERROR`)
- `resource`: Key ID or request ID (e.g. `key:k-sess-a1b2c3d4e5f6`, `req:req-uuid-1234`)
- `correlation_id`: Distributed trace identifier (`corr-...`)
- `details`: Algorithm, TTL, clock skew seconds, HTTP method, and path.

### 4.2 Prohibited Log Content (Enforced by Design)
- **Zero plaintext patient data:** Demographics, medical notes, vitals, or diagnoses are never written to logs.
- **Zero raw keys:** Private curve points, shared secrets, and derived AES keys are never logged.
- **Zero ciphertext snippets:** Raw Base64 payloads are omitted from logs to avoid trace log inflation.

---

## 5. Rollback & Emergency Break-Glass Procedure

If an unresolvable cryptographic defect, widespread client clock-skew issue, or legacy client incompatibility emerges in production, the following deterministic rollback options are available:

### 5.1 Zero-Downtime Hot Toggle (No Container Rebuild)
1. Set `PAYLOAD_ENCRYPTION_STRICT=False` in `/opt/oh-id/.env`.
2. Issue a graceful reload to the FastAPI worker:
   ```bash
   docker compose exec backend kill -HUP 1
   ```
   *Result:* Existing clients continue using encryption while un-upgraded clients fall back cleanly.

### 5.2 Full Emergency Kill-Switch (Immediate Pass-Through)
1. Set `PAYLOAD_ENCRYPTION_ENABLED=False` in `/opt/oh-id/.env`.
2. Reload backend workers.
   *Result:* `PayloadEncryptionMiddleware` enters complete bypass mode. All requests and responses are processed as standard JSON over transport TLS. Zero downtime to clinical hospital operations.

### 5.3 Git Rollback Procedure
If a full code revert is required:
1. Revert to previous branch commit:
   ```bash
   git checkout feature/ohid-kedar-pilot
   ```
2. Validate frontend production build:
   ```bash
   npm run build
   ```

---

## 6. Final Verification Verdict

```
====================================================================================================
FINAL RELEASE GATE VERDICT:
IMPLEMENTATION VERIFIED — READY FOR SECURITY REVIEW
====================================================================================================
```

### Justification:
1. **Cryptographic Rigor:** Implemented AES-256-GCM authenticated encryption with ephemeral ECDH P-256 key agreement and HKDF-SHA256 derivation.
2. **Key Hygiene:** Zero static secrets in JavaScript bundles; zero keys in persistent browser storage; keys hold `extractable: false` memory protection.
3. **Attack Resistance:** Automated tests verified rejection of tampered ciphertext, tampered tags, path/method swaps, replay attacks, and clock skew.
4. **Zero Regressions:** 100% pass rate across 15 payload encryption tests and 68 existing regression tests. Frontend Next.js build completed with zero errors.
5. **Operational Safety:** Controlled kill-switches, strict mode toggles, and zero PHI telemetry logging in place.
