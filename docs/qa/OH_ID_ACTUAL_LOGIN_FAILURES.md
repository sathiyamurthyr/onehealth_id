# OH-ID — Actual Login & Authentication Failures Investigation

**Document ID:** OHID-INVESTIGATION-AUTH-01  
**Incident Reference:** "9176669426 this is not login" & Live Clinic Pilot Quality Audit  
**Date:** October 21, 2026  
**Auditor:** Principal QA Architect & Application Security Engineer  
**Live Target Host:** `https://ohid.online` (Dual-stack VPS `157.20.172.186`)  

---

## 1. Executive Summary of Root Causes

The automated test suite reported **328/328 passing**, yet manual and clinical pilot login attempts revealed failures, confusion, and broken user journeys. Our live tracing on `https://ohid.online` with real credentials and Playwright browser telemetry pinpointed four distinct root causes:

1. **Multi-Role Modal Disconnect (DF-AUTH-01):**
   - The user account `9176669426` (`sathiyamurthyr12_7f1b`) possesses three distinct roles: `HOSPITAL_ADMIN` at hospital `vinokari`, `DOCTOR` at `vinokari`, and `SUPER_ADMIN` at `vinokari`.
   - On successful authentication, the frontend does **not** redirect to a dashboard. Instead, it pauses on `/login` and renders the modal **"Select Your Workspace"**.
   - When clinicians log in expecting immediate entry to their clinical queue or dashboard, the modal appears without proactive onboarding instructions. If a clinician clicks outside or expects automatic routing, the session remains on `/login`, presenting the appearance that login "did not work".
2. **Credential Divergence Between Test Fixtures and Production (DF-AUTH-02):**
   - Existing automated tests (e.g. `test_multi_role_workspace_selection.py`) used `"Password@123"` with a fallback to `"Asdfg!23"`.
   - In production database `oh_id.vw_user_auth`, the bcrypt hash `$2b$12$BD6OO/.75HmXIeJMmN...` exclusively matches `"Asdfg!23"`. Entering `"Password@123"` returns `HTTP 401 Unauthorized` with generic text `"The mobile number or password is incorrect."`.
3. **Bcrypt + Workspace View High Latency (DF-AUTH-03):**
   - Bcrypt 12 rounds on the server takes $1.5\text{s} - 2.0\text{s}$.
   - The subsequent `/api/v1/me/workspace` query joins 7 tables in `vw_user_workspaces`, adding another $1.5\text{s} - 2.5\text{s}$.
   - Total login form transition time is $3.5\text{s} - 5.2\text{s}$. During this window, the submit button is disabled with `"Authenticating & Resolving Workspace..."`, leading users on slower mobile connections to assume the form froze.
4. **Subapp Network Routing Failure (DF-AUTH-04 - Fixed):**
   - Earlier in the pilot rollout, `oh-id-backend` inside Docker bridge network was unable to route IPv6 packets to Supabase (`db.arkoolfygfqawyvwnldv.supabase.co`), throwing `HTTP 500 Internal Server Error` on every login attempt. Reconfiguring the container to `network_mode: host` resolved the network socket issue.

---

## 2. Detailed Reproduction Register

### Defect DF-AUTH-01: Multi-Role Account Stalls on Login Page Without Auto-Redirect
- **URL & Role:** `https://ohid.online/login` | Multi-role user (`9176669426`)
- **Preconditions:** User `9176669426` exists in `oh_id.users` and is assigned multiple usertypes (`role-hospital-admin`, `role-doctor`, `role-super-admin`).
- **Steps to Reproduce:**
  1. Navigate to `https://ohid.online/login`.
  2. Input Registered Mobile Number `9176669426`.
  3. Input Password `Asdfg!23`.
  4. Click `Sign In to OneHealth OS`.
- **Expected Result:** Clinician expects to land immediately in their primary workspace or receive an unambiguous workspace prompt.
- **Actual Result:** Form button changes to disabled `"Authenticating & Resolving Workspace..."` for $\sim 4.5\text{s}$. A modal opens titled `"Select Your Workspace"`. If the user does not click `"Continue"`, the page stays at `https://ohid.online/login`.
- **Network Requests Captured:**
  - `POST https://ohid.online/api/v1/auth/login` $\rightarrow$ `200 OK` (Duration: $1842\text{ms}$)
  - `GET https://ohid.online/api/v1/me/workspace` $\rightarrow$ `200 OK` (Duration: $1420\text{ms}$)
- **Post-Action State:** Clicking `"Continue"` on choice #1 sends `POST /api/v1/workspace/switch-context` $\rightarrow$ `200 OK` and successfully redirects to `https://ohid.online/hospital`.

### Defect DF-AUTH-02: Stale Test Password Confusion
- **URL & Role:** `https://ohid.online/login`
- **Steps to Reproduce:**
  1. Input `9176669426` and `Password@123`.
  2. Submit form.
- **Expected Result:** Clear error indicating incorrect password.
- **Actual Result:** `POST /api/v1/auth/login` returns `HTTP 401 Unauthorized`. Frontend renders `#login-error-banner` with text: `"The mobile number or password is incorrect."`.
- **Root Cause:** Password hash in database was initialized to `Asdfg!23`, while test files documented `Password@123`.

---

## 3. Recommended Remediation & Action Items

1. **Auto-Select Default Workspace if One is Primary:** If an account has a workspace marked `is_primary = True`, provide an option to auto-enter that primary workspace directly or provide a prominent 5-second countdown auto-redirect.
2. **Visual Step Indicator:** When the login API succeeds and workspace resolution begins, transition the UI state from the form to a dedicated step container rather than a secondary modal overlay.
3. **Database Query Optimization for `vw_user_workspaces`:** Add indexing on `oh_id.user_workspaces (user_ref_id, is_active)` to reduce the multi-table view lookup from $1500\text{ms}$ down to $< 100\text{ms}$.
