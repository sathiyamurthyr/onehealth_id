# OH-ID — Healthcare Privacy & Legal-Readiness Matrix (India Jurisdiction)

**Document ID:** OHID-PRIV-LEGAL-01  
**Assessment Standard:** Digital Personal Data Protection Act, 2023 (DPDP Act), CERT-In Directions 2022, ABDM Health Data Management Policy & Clinical Establishments Act  
**Target Entity:** Sathus Technology Pvt Ltd (Platform Provider) & Pilot Clinic (Kedar Hospital)  
**Date:** October 21, 2026  
**Auditor:** Healthcare Privacy Engineer & DevSecOps Compliance Auditor  

> [!IMPORTANT]
> **Legal Notice & Disclaimer:**  
> This document constitutes a technical, operational, and data-flow assessment prepared from a DevSecOps and healthcare privacy engineering perspective. It does not constitute formal legal advice. Formal legal characterization of roles, contracts, and regulatory filings must be reviewed and executed by qualified Indian healthcare and data privacy counsel.

---

## 1. Legal & Regulatory Framework Overview

```
+─────────────────────────────────────────────────────────────────────────────────────────────+
|                            INDIAN HEALTHCARE REGULATORY LANDSCAPE                           |
+─────────────────────────────────────────────────────────────────────────────────────────────+
| 1. DIGITAL PERSONAL DATA PROTECTION ACT, 2023 (DPDP Act)                                    |
|    - Governs digital personal data processing, data principal rights, and consent.          |
|    - Statutory Data Fiduciary: Pilot Clinic / Hospital (Determines purpose & means).         |
|    - Statutory Data Processor: Sathus Technology Pvt Ltd (Processes data on clinic behalf).  |
+─────────────────────────────────────────────────────────────────────────────────────────────+
| 2. CERT-In CYBERSECURITY DIRECTIONS (No. 20(3)/2022-CERT-In)                                 |
|    - Mandatory 6-hour reporting of cybersecurity incidents (data breach, unauthorized access)|
|    - Mandatory rolling 180-day retention of ICT transaction & security logs in India.       |
|    - Mandatory NTP server synchronization across all servers and network equipment.         |
+─────────────────────────────────────────────────────────────────────────────────────────────+
| 3. ABDM HEALTH DATA MANAGEMENT POLICY (HDMP)                                                |
|    - Patient-centric electronic health record ownership and explicit consent artifacts.     |
|    - Zero storage of patient health records on central ABDM gateways (Federated model).     |
+─────────────────────────────────────────────────────────────────────────────────────────────+
| 4. CLINICAL ESTABLISHMENTS ACT & MEDICAL ETHICS REGULATIONS                                 |
|    - Mandatory preservation of outpatient medical records (minimum 3 years).                 |
|    - Strict doctor-patient confidentiality; prohibition against unauthorized disclosure.     |
|    - Information Technology Act 2000 §43A & SPDI Rules 2011 (Reasonable security practices).|
+─────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Comprehensive Healthcare Data Inventory

| Data Element | Classification | Processing Purpose | Lawful Basis (DPDP §4) | Storage Location | Retention Period |
|---|---|---|---|---|---|
| **Patient Full Name, Phone, DOB, Gender** | Personal Data (PII) | Master patient index & patient identification | Notice & Explicit Consent (DPDP §6) | Supabase Cloud (PostgreSQL, `oh_id.patients`) | Minimum 3 years post last consultation |
| **National OH-ID Identifier** | Sovereign / Platform Health ID | Unique health identifier for record deduplication | Provision of Healthcare Services | `oh_id.patients.ohid` | Permanent identity lifecycle |
| **Doctor Encounter Notes & ICD-10 Diagnoses** | Sensitive Health Data | Direct clinical treatment & patient care | Medical Purpose / Consent (DPDP §7) | `oh_id.clinical_notes` | Minimum 3 years (OPD) / 5+ years (IPD) |
| **Digital Prescriptions & Dosage Matrix** | Sensitive Health Data | Safe medication dispensation & pharmacy verification | Direct Medical Treatment | `oh_id.prescriptions` | Minimum 3 years post issuance |
| **Laboratory Orders & Results** | Sensitive Health Data | Clinical diagnostics & treatment evaluation | Direct Medical Treatment | `oh_id.lab_orders`, `lab_results` | Minimum 3 years post report |
| **Billing Invoices & Receipts** | Financial Transaction Data | Accounting, taxation (GST), payment reconciliation | Statutory Compliance (Income Tax / GST) | `oh_id.billing_invoices` | 8 years (Statutory financial requirement) |
| **Staff & Clinician Credentials** | Authentication Data | Role-based access control & identity assurance | Contract of Employment / Engagement | `oh_id.users`, `vw_user_auth` (Bcrypt) | Duration of employment + 1 year |
| **System Security & Audit Logs** | Operational Telemetry | Incident investigation & security monitoring | Legal Obligation (CERT-In Directions) | `oh_id.audit_logs` & Docker host logs | Rolling 180 days (Mandatory CERT-In) |

---

## 3. Statutory Compliance Assessment & Implementation Gaps

| Regulatory Requirement | Mandated Standard | Current OH-ID Implementation | Compliance Status | Action Required Prior to Launch |
|---|---|---|---|---|
| **Consent & Notice (DPDP §5 & §6)** | Itemized notice in English + Schedule 8 Indian languages (Tamil, Hindi) | Privacy policy available on web; multi-language notice not yet embedded into registration flow | **PARTIALLY COMPLIANT** | Embed itemized bilingual consent checkbox on `/hospital/patients/register` |
| **Data Principal Rights (DPDP §11, 12, 13)**| Right to access, correct, erase, and grievance redressal | Patients can view records on `/patient/*`; self-service deletion workflow not exposed | **PARTIALLY COMPLIANT** | Establish offline Data Protection Officer (DPO) grievance contact email on login page |
| **CERT-In 6-Hour Reporting** | Report breaches to CERT-In within 6 hours of discovery | Incident procedure defined in `OH_ID_INCIDENT_RESPONSE_AND_RECOVERY.md` | **COMPLIANT** | Operationalize escalation contact list with executive leadership |
| **CERT-In 180-Day Log Retention** | Maintain rolling 180-day ICT logs within Indian jurisdiction | Docker json-file driver limited to `max-file: 5`, `max-size: 20m` | **NON-COMPLIANT** | Configure host log shipping (`rsyslog` / `promtail`) to durable local storage |
| **NTP Synchronization** | Synchronize time with National Physical Laboratory (NPL) or CERT-In NTP | Host Ubuntu VPS relies on default `systemd-timesyncd` | **PARTIALLY COMPLIANT** | Add Indian NTP stratum servers (`time.nplindia.org`, `in.pool.ntp.org`) to `/etc/systemd/timesyncd.conf` |
| **Data Localization & Cross-Border** | Sensitive health records stored in India | Supabase AWS Mumbai (`ap-south-1`) region utilized | **COMPLIANT** | Document cloud region confirmation letter from Supabase |
| **Digital Signatures on Prescriptions** | Mandatory prescriber identity and tamper-evidence | Prescriptions compute SHA-256 digital signature hash including doctor registration number | **COMPLIANT** | Plan future integration with Class 3 DSC / Aadhaar eSign |

---

## 4. Contractual Allocation of Responsibilities

### Sathus Technology Pvt Ltd (Technology Provider / Data Processor)
1. Maintain application security, vulnerability patching, encryption in transit and at rest.
2. Provide technical support without unauthorized access to identifiable clinical content.
3. Promptly notify the clinic (within 2 hours) of any suspected security incident or data breach.
4. Provide technical export and erasure tools to enable the clinic to fulfill Data Principal requests.

### Pilot Clinic / Hospital (Healthcare Provider / Data Fiduciary)
1. Obtain patient notice and consent prior to registering medical encounters.
2. Verify professional licensure and credentials of doctors and nurses using the system.
3. Secure physical premises, reception desk terminals, and doctor consultation computers.
4. Serve as the first line of contact for patient medical questions and statutory rights requests.
