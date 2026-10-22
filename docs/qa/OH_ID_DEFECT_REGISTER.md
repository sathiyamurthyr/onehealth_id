# OH-ID — Defect Register & Resolution Tracking

**Document ID:** OHID-DEFECT-REG-01  
**Incident Reference:** Clinical Pilot Release Gate Quality Audit  
**Date:** October 21, 2026  
**Auditor:** Principal QA Architect & Application Security Engineer  

---

## 1. Defect Severity & Priority Classification

- **P0 (Critical):** Cross-tenant data exposure, authentication bypass, unhandled crash of all users, or data corruption.
- **P1 (High):** Login failure, broken patient registration, appointment or consultation workflow, or prescription integrity failure.
- **P2 (Medium):** Broken secondary functions, API route mismatch, false-positive test reporting, or high latency.
- **P3 (Low):** Minor cosmetic issues, missing helper text, or non-critical styling inconsistencies.

---

## 2. Complete Defect Register

### DF-AUTH-01: Multi-Role Account Stalls on Login Page Without Auto-Redirect
- **Priority / Severity:** P1 (High)
- **Status:** **CONFIRMED & MITIGATED** (Guidance Documented; UX Enhancement Recommended)
- **URL & Role:** `https://ohid.online/login` | Multi-role user (`9176669426`, Doctor / Hospital Admin / Super Admin)
- **Preconditions:** User possesses $\ge 2$ active role assignments in `oh_id.user_workspaces`.
- **Steps to Reproduce:**
  1. Open `https://ohid.online/login`.
  2. Enter mobile `9176669426` and password `Asdfg!23`.
  3. Click "Sign In to OneHealth OS".
- **Expected Result:** Clinician enters their clinical workspace directly or receives an immediate, prominent workspace selector with auto-selection countdown.
- **Actual Result:** Form button changes to disabled `"Authenticating & Resolving Workspace..."` for $\sim 4.5\text{s}$. A modal opens titled `"Select Your Workspace"`. If the user does not click `"Continue"`, the page stays at `https://ohid.online/login`, creating the impression that login failed.
- **Network Request:** `POST /api/v1/auth/login` (200 OK) $\rightarrow$ `GET /api/v1/me/workspace` (200 OK).
- **Root Cause:** Next.js `/login` page state machine only triggers `router.push()` automatically if `workspaces.length === 1`. For multi-workspace accounts, it halts and waits for explicit user modal interaction.
- **Regression Test:** `frontend/e2e/test_user_login_trace.spec.ts`

---

### DF-AUTH-02: Stale Test Password Confusion
- **Priority / Severity:** P1 (High)
- **Status:** **RESOLVED**
- **URL & Role:** `https://ohid.online/login` | Account `9176669426`
- **Steps to Reproduce:**
  1. Enter mobile `9176669426` and test password `Password@123`.
  2. Click "Sign In".
- **Expected Result:** Login succeeds if credentials match test documentation.
- **Actual Result:** `POST /api/v1/auth/login` returned `HTTP 401 Unauthorized`.
- **Root Cause:** Database user password in production Supabase was hashed from `Asdfg!23`, whereas test documentation and code comments referenced `Password@123`.
- **Resolution:** Validated authentic bcrypt hash against `Asdfg!23`. Updated test documentation and automated test credentials.

---

### DF-AUTH-03: High Login Form Latency
- **Priority / Severity:** P2 (Medium)
- **Status:** **CONFIRMED & PROFILED**
- **URL & Role:** `https://ohid.online/login`
- **Observed Behavior:** Form submit takes $3.5\text{s} - 5.2\text{s}$ to transition.
- **Root Cause:**
  1. Bcrypt 12 rounds on production host: $\sim 1,800\text{ms}$.
  2. Seven-table join in `oh_id.vw_user_workspaces`: $\sim 1,420\text{ms}$.
  3. Sequential execution on login submission.
- **Remediation Plan:**
  - Add composite index on `oh_id.user_workspaces(user_ref_id, is_active)`.
  - Cache user workspace resolution in Redis/memory for 5 minutes post-login.

---

### DF-AUTH-04: Subapp IPv6 Timeout in Docker Bridge Mode
- **Priority / Severity:** P0 (Critical)
- **Status:** **RESOLVED**
- **Symptom:** `POST /api/v1/auth/login` threw `HTTP 500 Internal Server Error` on live domain `https://ohid.online`.
- **Root Cause:** Backend Docker container inside default bridge network was unable to route IPv6 packets to Supabase host `db.arkoolfygfqawyvwnldv.supabase.co`.
- **Resolution:** Switched `oh-id-backend` service in `docker-compose.yml` to `network_mode: host`. Database queries now resolve directly and reliably.

---

### DF-BIL-01: Billing API Route Path Mismatch
- **Priority / Severity:** P2 (Medium)
- **Status:** **RESOLVED**
- **URL & Role:** `https://ohid.online/hospital/billing` | Hospital Admin / Billing Clerk
- **Symptom:** `/hospital/billing` browser requests returned 404 for `/hospital/billing/invoices`.
- **Root Cause:** Router mounting in `backend/app/main.py` mounted `hospital_billing.router` (with prefix `/hospital/billing`) into `api_v1`, producing `/api/v1/hospital/billing/invoices`, while frontend legacy code called `/api/v1/billing/invoices`.
- **Resolution:** Synchronized frontend `lib/api/phase5.ts` endpoint paths with backend FastAPI router definitions.

---

### DF-E2E-01: Route Inventory Test Harness False-Positive Pass Status
- **Priority / Severity:** P2 (Medium)
- **Status:** **RESOLVED (Audit Finding & Harness Hardening)**
- **Scope:** `frontend/e2e/reports/route-inventory.json`
- **Symptom:** 40 routes marked `status: "PASS"` despite 404 network failures and unhandled console exceptions.
- **Root Cause:** E2E test script evaluated only `res.status() === 200` on the initial document load, disregarding asynchronous network failures and client-side JavaScript crashes.
- **Resolution:** Documented in `OH_ID_FALSE_POSITIVE_TEST_AUDIT.md`. Hardened assertion criteria to require zero 4xx/5xx network failures and zero console errors.

---

## 3. Defect Summary Table

| Defect ID | Title | Severity | Status | Verified By |
|---|---|---|---|---|
| DF-AUTH-01 | Multi-Role Modal Disconnect | P1 | Mitigated | Playwright Trace |
| DF-AUTH-02 | Stale Test Password Confusion | P1 | Resolved | Live API & DB Auth |
| DF-AUTH-03 | High Login Form Latency | P2 | Profiled | Network Timing Trace |
| DF-AUTH-04 | Docker Bridge IPv6 Database Timeout | P0 | Resolved | Live Production Trace |
| DF-BIL-01 | Billing API Route Mismatch | P2 | Resolved | Route Contract Audit |
| DF-E2E-01 | Route Inventory False-Positive Pass | P2 | Resolved | Test Harness Audit |
