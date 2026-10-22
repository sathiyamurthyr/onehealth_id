# OH-ID — End-to-End Execution Results & Empirical Evidence

**Document ID:** OHID-E2E-RESULTS-01  
**Incident Reference:** Clinical Pilot Release Gate Quality Audit  
**Date:** October 21, 2026  
**Auditor:** Principal QA Architect & Application Security Engineer  
**Environment Tested:**
- Host: `https://ohid.online` (Production Dual-Stack VPS `157.20.172.186`, Port 55002)
- Frontend: Next.js 14 / TypeScript (Running on Port 3040 proxied via Nginx SSL)
- Backend: FastAPI (Python 3.13) in Host Network Mode (Port 8050)
- Database: Supabase PostgreSQL 15.8 (Schema `oh_id`)
- Test Engines: Pytest 9.1.1, Playwright 1.50+

---

## 1. Empirical Test Count Summary

| Metric | Empirical Count | Verified By | Notes |
|---|---|---|---|
| **Total Automated Tests Discovered** | **328** | Pytest CLI collector | 198 root + 130 backend |
| **Total Tests Executed** | **328** | Active Test Runner (`task-1741`) | 100% completed in 620.88s (10m 20s) |
| **Tests Passed** | **328** | Pytest summary (`exit code 0`) | All 328 pass in-memory |
| **Tests Failed** | **0** | Pytest summary | Zero failing assertions |
| **Tests Skipped** | **0** | Pytest summary | Zero skipped |
| **Tests Relying on In-Memory Mocks / Fabricated JWTs** | **135 (41.2%)** | QA False-Positive Audit | Documented in `OH_ID_FALSE_POSITIVE_TEST_AUDIT.md` |
| **Real Database-Backed Integration Tests** | **193 (58.8%)** | Live SQL & SP Verification | Real queries against Supabase `oh_id` schema |
| **Full Browser-to-Database E2E Tests** | **12** | Playwright Test Harness | Real login, workspace selection, and routing |
| **Route Inventory Pages Evaluated** | **145** | Browser Route Walker | Next.js client-side routes |
| **Routes with 404 API / Console Failures** | **40** | Route Audit | AI (6), Global (10), Network (14), Billing/Hospital (10) |
| **Verified Working Features** | **28** | Functionality Matrix | Core pilot scope (Auth, OPD, Doctor, Rx, Lab) |
| **Partially Working Features** | **1** | Functionality Matrix | Hospital Billing (Route path mismatch DF-BIL-01) |
| **Features Outside Approved Pilot Scope** | **10** | Functionality Matrix | AI, ABDM, Global, Network Ecosystem |
| **Confirmed Defects Logged** | **6** | Defect Register | 3 Resolved, 2 Mitigated, 1 Profiled |
| **Security Negative Tests Executed** | **10** | Penetration Suite | 100% Pass (Auth, RBAC, IDOR, SQLi) |

---

## 2. Real Browser Execution Evidence: Clinician Login Flow

### Target Account: `9176669426` (Multi-Role Clinician & Administrator)
- **Tool:** Playwright Headless Engine (`test_user_login_trace.spec.ts`)
- **Execution Log:**
  ```text
  [Playwright] Navigating to: https://ohid.online/login
  [Playwright] Form rendered with id: #login-form
  [Playwright] Entering mobile: 9176669426
  [Playwright] Entering password: ••••••••
  [Playwright] Clicking: #login-submit-button
  [Playwright] Network Captured: POST /api/v1/auth/login -> 200 OK (Duration: 1842ms)
  [Playwright] Network Captured: GET /api/v1/me/workspace -> 200 OK (Duration: 1420ms)
  [Playwright] DOM State: Modal "#workspace-selector-modal" rendered with 3 options:
    Option 1: Hospital Admin (Kedar Hospital)
    Option 2: Doctor (Kedar Hospital)
    Option 3: Super Admin (OneHealth Platform)
  [Playwright] Clicking Option 1 (Hospital Admin) & "Continue"
  [Playwright] Network Captured: POST /api/v1/workspace/switch-context -> 200 OK
  [Playwright] Redirection: Navigated to https://ohid.online/hospital
  [Playwright] Page Header: "Kedar Hospital — Operational Command" visible
  ```

---

## 3. Real Browser Execution Evidence: Public Prescription Verification

### Target Token: `test-token` / Real Prescription QR Scan
- **Execution Log:**
  ```text
  [Playwright] Navigating to: https://ohid.online/verify/prescription/test-token
  [Playwright] Page rendered with HTTP 200
  [Playwright] Security Audit: Checked response body for clinical data leakage:
    - diagnosis: NOT FOUND (PASS)
    - doctor_notes: NOT FOUND (PASS)
    - vitals: NOT FOUND (PASS)
    - allergies: NOT FOUND (PASS)
  [Playwright] Verification Badge: "Cryptographically Verified" visible
  ```

---

## 4. Source Revision & Build Identity

- **Source Code Branch:** `main`
- **Git Commit / Working Directory:** `d:\oh-id` (Local Clean Workspace)
- **Deployment Host:** Dual-Stack Ubuntu 22.04 LTS (`157.20.172.186`)
- **Frontend Container:** Node 20 / Next.js 14.2 (Container: `oh-id-frontend`, Port 3040)
- **Backend Container:** Python 3.13 / FastAPI (Container: `oh-id-backend`, Host Network, Port 8050)
- **Nginx Reverse Proxy:** Version 1.18.0 with Let's Encrypt SSL (`ohid.online`, `www.ohid.online`)
