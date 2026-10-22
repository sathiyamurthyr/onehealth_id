# OH-ID — Cybersecurity Incident Response, Disaster Recovery & CERT-In Reporting

**Document ID:** OHID-SEC-IR-01  
**Assessment Standard:** CERT-In Incident Response Guidelines & NIST SP 800-61 Rev. 2  
**Target Environment:** OneHealth ID (OH-ID) Production Host & Supabase Database  
**Date:** October 21, 2026  
**Auditor:** Independent DevSecOps Auditor & Incident Commander  

---

## 1. Incident Classification & Severity Levels

| Severity Level | Operational Impact | Healthcare Specific Examples | Statutory Escalation |
|---|---|---|---|
| **SEV-1 (CRITICAL)** | Active clinical data breach, mass exfiltration, ransomware, total outage | Unauthenticated dump of patient diagnoses, prescription database corruption, compromised production database credentials | **Mandatory CERT-In notification within 6 hours**; clinic executive briefing within 2 hours |
| **SEV-2 (HIGH)** | Broken tenant isolation, privileged account takeover, single facility outage | Doctor account compromised, Hospital A user reading Hospital B records, prolonged API 500 downtime | Notify Clinic Data Protection Officer within 6 hours; commence emergency containment |
| **SEV-3 (MEDIUM)** | Repeated failed brute-force attacks, non-critical endpoint vulnerability, rate limit triggers | Sustained password guessing on single mobile number, unauthorized attempts on locked role routes | Logged and triaged by security engineering within 24 hours |
| **SEV-4 (LOW)** | Scanned anomalies, cosmetic misconfiguration, minor certificate warnings | External bot vulnerability scans, outdated client browser warnings | Addressed during normal sprint maintenance |

---

## 2. CERT-In 6-Hour Statutory Reporting Protocol

Under CERT-In Direction No. 20(3)/2022-CERT-In §(i), cybersecurity incidents of specified categories must be reported to the Indian Computer Emergency Response Team (CERT-In) within **6 hours** of noticing the incident.

```
+─────────────────────────────────────────────────────────────────────────────+
|                        CERT-In INCIDENT NOTIFICATION DATA                   |
+─────────────────────────────────────────────────────────────────────────────+
| Reporting Email: incident@cert-in.org.in                                    |
| Helpdesk Phone:  +91-1800-11-4949 / +91-11-24368572                         |
| Incident Profile: Form downloadable from https://www.cert-in.org.in         |
| Mandatory Information:                                                      |
|   1. Time of occurrence and time of detection (IST).                        |
|   2. Organization Name: Sathus Technology Pvt Ltd / Kedar Hospital          |
|   3. Affected Systems: Web server (157.20.172.186), PostgreSQL Database     |
|   4. Nature of Incident: Unauthorized access / Data breach / Ransomware     |
|   5. Impact Assessment: Approximate number of patient records affected      |
|   6. Technical Details: Source IPs, attack vectors, hash values of malware  |
|   7. Remedial Actions: Revocation of tokens, container isolation, firewall  |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Five-Phase Healthcare Incident Response Lifecycle

```
   [ 1. DETECTION ] ──► [ 2. CONTAINMENT ] ──► [ 3. ERADICATION ] ──► [ 4. RECOVERY ] ──► [ 5. POST-INCIDENT ]
   - Rate limit alarms   - Isolate container   - Rotate SECRET_KEY   - Restore snapshot   - CERT-In final report
   - 403 spikes on BOLA  - Freeze audit logs   - Patch vulnerability - Verify integrity   - Clinic debriefing
   - DB connection error - Revoke JWT tokens   - Terminate sessions  - Resume traffic     - Root cause analysis
```

### Phase 1: Detection & Verification
- Monitor Uvicorn access logs and `oh_id.audit_logs` for abnormal patterns (e.g. 50+ consecutive 401/403 responses, sudden spikes in patient list export volume).
- Triage alert within 15 minutes to confirm true positive vs. test automation traffic.

### Phase 2: Containment & Evidence Preservation
- **Immediate Token Invalidation:** In the event of token compromise or credential leak, rotate `SECRET_KEY` in `.env` and restart backend container. This immediately invalidates 100% of outstanding JWT tokens.
- **Forensic Log Freeze:** Execute snapshot of `/var/log/nginx/` and Docker container JSON logs before container restart to preserve digital forensic evidence.
- **Account Suspension:** Update `oh_id.users.is_active = FALSE` for compromised clinician or staff identities.

### Phase 3: Eradication & Remediation
- Identify vulnerable code path or misconfiguration (e.g. BOLA vulnerability, missing permission check).
- Apply minimal surgical patch in staging branch.
- Execute unit and regression suites to confirm vulnerability is closed.
- Rotate production database passwords (`DATABASE_URL`) in Supabase console if persistence layer compromise was suspected.

### Phase 4: Recovery & Verification
- Verify database state and execute database consistency check:
  ```sql
  SELECT COUNT(*) FROM oh_id.prescriptions WHERE status = 'ACTIVE' AND digital_signature_hash IS NULL;
  ```
- Bring `oh-id-backend` online in host mode.
- Execute synthetic smoke tests (login, appointment booking, prescription signing) to confirm clean recovery.

### Phase 5: Post-Incident Review & Statutory Filings
- Complete formal incident post-mortem within 48 hours.
- Submit comprehensive supplementary incident report to CERT-In within statutory timelines.
- Update threat model and test automation suite to permanently prevent regression.

---

## 4. Disaster Recovery & Database Restoration Procedures

### Database Point-in-Time Recovery (PITR)
- **Engine:** Supabase PostgreSQL Cloud.
- **RPO (Recovery Point Objective):** $< 5\text{ minutes}$ (Continuous WAL streaming).
- **RTO (Recovery Time Objective):** $< 30\text{ minutes}$ for full cluster restore.
- **Restore Procedure:**
  1. Access Supabase Management Console $\rightarrow$ Database Settings $\rightarrow$ Backups.
  2. Select target recovery timestamp (immediately prior to confirmed corruption/breach event).
  3. Initiate Point-in-Time Clone to new database instance.
  4. Verify table row counts against pre-incident baseline.
  5. Update `DATABASE_URL` in VPS `.env` and trigger rolling restart.
