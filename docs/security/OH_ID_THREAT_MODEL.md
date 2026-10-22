# OH-ID — Healthcare Threat Model (STRIDE & DREAD Assessment)

**Document ID:** OHID-SEC-THREAT-01  
**Assessment Standard:** STRIDE Threat Classification & DREAD Risk Rating  
**Target System:** OneHealth ID (OH-ID) Core Clinical Operating System  
**Date:** October 21, 2026  
**Auditor:** Independent Principal Application Security Architect  

---

## 1. Threat Actor Profiles & Capabilities

| Threat Actor | Motivation | Capabilities | Target Assets |
|---|---|---|---|
| **External Cybercriminal** | Financial extortion (Ransomware), data selling on dark web | Remote network attacks, automated credential stuffing, vulnerability scanning | PII database, EHR records, payment receipts |
| **Nosy / Curious Staff** | Snooping on VIPs, relatives, or neighbors | Legitimate receptionist or nursing credentials, insider access | Clinical diagnoses, prescriptions, lab results |
| **Rogue / Corrupt Clinician** | Falsifying medical records, issuing unauthorized narcotic/controlled substances | Doctor credentials, digital signing keys | Prescriptions, encounters, patient identities |
| **Disgruntled Administrator** | Sabotage, extortion, tenant disruption | Hospital Admin credentials, user management access | Hospital tenant configuration, staff accounts |
| **Malicious Patient / Impersonator** | Accessing family records without consent, insurance fraud | Registered patient account, mobile phone, browser access | Other patients' invoices, prescriptions, records |

---

## 2. STRIDE Healthcare Threat Analysis

```
+----------------------------------------------------------------------------------------------------+
|                                    STRIDE THREAT MAPPING                                           |
+----------------------------------------------------------------------------------------------------+
| S - SPOOFING IDENTITY:                                                                             |
|   * T-S01: Attacker attempts mobile brute-force to guess credentials of doctor or administrator.   |
|   * T-S02: Attacker crafts fake JWT token signed with default fallback SECRET_KEY.                 |
|   * T-S03: Patient impersonates another patient using manipulated phone numbers.                   |
+----------------------------------------------------------------------------------------------------+
| T - TAMPERING WITH DATA:                                                                           |
|   * T-T01: Pharmacy or unauthorized staff alters dosage on a finalized digital prescription.      |
|   * T-T02: Attacker injects SQL payloads into OPD patient search or appointment booking.           |
|   * T-T03: Lab technician modifies critical biomarker results without pathologist sign-off.       |
+----------------------------------------------------------------------------------------------------+
| R - REPUDIATION:                                                                                   |
|   * T-R01: Prescribing doctor denies issuing a prescription involved in an adverse drug event.     |
|   * T-R02: Administrator deletes or disables a doctor without an immutable audit record.          |
+----------------------------------------------------------------------------------------------------+
| I - INFORMATION DISCLOSURE:                                                                        |
|   * T-I01: Insecure Direct Object Reference (IDOR) allows Patient A to view Patient B's diagnosis. |
|   * T-I02: Public QR scan on printed prescription leaks confidential clinical notes or vitals.     |
|   * T-I03: Production secrets baked into Docker image layer (COPY .env) exposed via registry.     |
|   * T-I04: Database error stack traces leak schema tables, view names, or SQL syntax.              |
+----------------------------------------------------------------------------------------------------+
| D - DENIAL OF SERVICE:                                                                             |
|   * T-D01: CPU exhaustion via parallel Bcrypt 12 requests crashing login service.                 |
|   * T-D02: High-frequency ReportLab PDF generation requests exhausting server memory.              |
+----------------------------------------------------------------------------------------------------+
| E - ELEVATION OF PRIVILEGE:                                                                        |
|   * T-E01: Receptionist calls `/api/v1/clinical/encounters/notes` to record medical diagnoses.    |
|   * T-E02: Hospital Admin calls `/api/v1/prescriptions` to create and sign clinical prescriptions. |
|   * T-E03: Hospital A user supplies `X-Hospital-Ref-Id: hosp-002` to access Hospital B patients.  |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. DREAD Risk Scoring Matrix

| Threat ID | Threat Description | Damage (1-10) | Reproducibility (1-10) | Exploitability (1-10) | Affected Users (1-10) | Discoverability (1-10) | Total DREAD Score | Risk Level |
|---|---|---|---|---|---|---|---|---|
| **T-I03** | Secrets baked into Dockerfile layer (`COPY .env`) | 9 | 10 | 8 | 10 | 8 | **9.0** | **CRITICAL** |
| **T-S02** | Default `SECRET_KEY` fallback in config | 10 | 9 | 8 | 10 | 7 | **8.8** | **CRITICAL** |
| **T-E02** | Hospital Admin creating medical prescriptions | 8 | 9 | 8 | 7 | 6 | **7.6** | **HIGH** |
| **T-E03** | Insecure fallback in workspace context resolution | 9 | 7 | 6 | 9 | 6 | **7.4** | **HIGH** |
| **T-I01** | BOLA / IDOR in clinical document endpoints | 9 | 8 | 5 | 8 | 7 | **7.4** | **HIGH** |
| **T-D01** | Rate limit bypass via reverse proxy IP flaw | 7 | 8 | 7 | 9 | 5 | **7.2** | **HIGH** |
| **T-T01** | Prescription medication tampering post-issuance | 9 | 4 | 4 | 6 | 5 | **5.6** | **MEDIUM** |
| **T-I02** | Sensitive diagnosis leakage on public QR scan | 8 | 3 | 3 | 5 | 5 | **4.8** | **MEDIUM** |

---

## 4. Threat Mitigations & Countermeasure Register

1. **Mitigation for T-I03 & T-S02 (Secrets & Cryptographic Keys):**  
   - Remove `COPY .env ./.env` from `backend/Dockerfile`. Add `.env` to `.dockerignore`.
   - Require `SECRET_KEY` to be supplied via environment variable; fail startup immediately if default fallback is active in production (`raise ValueError("SECRET_KEY must be set in production")`).
2. **Mitigation for T-E02 (Privilege Separation):**  
   - Restrict prescription creation strictly to clinicians with `role == 'DOCTOR'` and permission `prescription.create`. Exclude pure administrative roles (`HOSPITAL_ADMIN`).
3. **Mitigation for T-E03 (Insecure Workspace Fallback):**  
   - Remove the unsafe fallback block in `get_current_user_context` that accepts token claims when `workspace` is `None`. Require valid database workspace mapping for all multi-tenant routes.
4. **Mitigation for T-D01 (Rate Limiting IP Detection):**  
   - Update `SlidingWindowRateLimiter` to inspect `request.headers.get("X-Forwarded-For")` behind trusted reverse proxy configurations.
5. **Mitigation for T-R01 (Repudiation & Integrity):**  
   - Enforce SHA-256 digital signature computation over medication items, prescriber registration authority, and timestamp. Store in `oh_id.prescriptions.digital_signature_hash`.
