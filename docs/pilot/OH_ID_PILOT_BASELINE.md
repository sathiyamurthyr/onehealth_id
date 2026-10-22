# OH-ID — Kedar Hospital Pilot Baseline & Deployment Assessment

**Document ID:** OHID-PILOT-BASE-01  
**Project:** OneHealth ID (OH-ID) Enterprise Hospital Operating System  
**Pilot Facility:** Kedar Hospital (Facility ID: `hosp-kedar`, Tenant: `ten-kedar`)  
**Production URL:** [https://ohid.online](https://ohid.online/)  
**Date:** October 21, 2026  
**Auditor Roles:** Principal Healthcare Software Engineer, QA Lead, DevSecOps Specialist  

---

## 1. System & Deployment Baseline

| Inspection Item | Specification / Verified Runtime | Verification Evidence |
|---|---|---|
| **Repository Branch** | `feature/ohid-kedar-pilot` | `git status` |
| **Commit Revision** | `eaf0e53a6c87eb0d592d01b2a998a99978545733` | `git log -1` |
| **Commit Message** | `feat(core): dynamic multi-tenant workspace resolution, hardcoding elimination & resilient SP registration` | Git author metadata |
| **Target Host** | `157.20.172.186` (Dual-Stack VPS, SSH port 55002) | Host ping & Nginx vhost |
| **Frontend Runtime** | Next.js 14.2 / Node 20 (Container `oh-id-frontend`, Port 3040) | Docker ps & curl `https://ohid.online/` |
| **Backend Runtime** | Python 3.13 / FastAPI (Container `oh-id-backend`, Host Mode, Port 8050) | Uvicorn process & `https://ohid.online/health` |
| **Database Instance** | PostgreSQL 15.8 (Supabase Cloud, schema `oh_id`) | Direct IPv6 connection & schema inspection |
| **Reverse Proxy** | Nginx 1.18.0 with Let's Encrypt TLS (HTTP/2, HSTS enabled) | `curl -I https://ohid.online` |
| **AI Gateway Status** | **DISCONNECTED** (Shared Ollama gateway strictly excluded) | Architectural Constraint |

---

## 2. Live Service Health & Route Architecture

### Core Endpoints Verified Live
1. `GET https://ohid.online/health` $\rightarrow$ `{"status":"ok","service":"oh-id-api"}` (`200 OK`)
2. `GET https://ohid.online/login` $\rightarrow$ Serves Next.js login page shell with `#login-form` (`200 OK`)
3. `POST https://ohid.online/api/v1/auth/login` $\rightarrow$ Mobile authentication and JWT issuance (`200 OK`)
4. `GET https://ohid.online/api/v1/me/workspace` $\rightarrow$ Dynamic role and workspace profile gathering (`200 OK`)
5. `GET https://ohid.online/verify/prescription/{token}` $\rightarrow$ Public cryptographic QR verification (`200 OK`)

### In-Scope Clinical Modules (Kedar Hospital Pilot)
- **Module 1: Identity & Workspaces** — Mobile-only authentication, bcrypt 12-round verification, multi-role workspace selection modal, and scoped context switching.
- **Module 2: Patient Registration** — Walk-in registration, demographic validation, duplicate detection by phone + DOB, and OH-ID identifier assignment.
- **Module 3: OPD Reception & Queues** — Appointment booking, doctor schedule checking, double-booking collision prevention, check-in, and sequential token generation (`A-001`, `A-002`).
- **Module 4: Doctor Consultation Workspace** — Patient encounter opening, clinical notes, mandatory ICD-10 diagnosis, vitals recording, and allergy history.
- **Module 5: Digital Prescriptions** — Medication scheduling, frequency formatting (`1-0-1`), duration validation, SHA-256 digital signing, PDF generation, and public QR verification.
- **Module 6: Laboratory Diagnostics** — Investigation order creation, sample tracking, result input with reference ranges, and pathologist approval.
- **Module 7: Hospital Administration** — Staff directory, OPD counter mapping, department configuration, and tenant isolation.

---

## 3. Discovered Discrepancies & Staging Remediation Summary

1. **User Login Confusion (`DF-AUTH-01`):**  
   User `9176669426` holds three distinct roles (`HOSPITAL_ADMIN`, `DOCTOR`, `SUPER_ADMIN`). On successful authentication, the frontend pauses on `/login` and renders the workspace selection modal. Without onboarding guidance, users assumed the login stalled.
2. **False-Positive Suite Audit (`DF-E2E-01`):**  
   While 328/328 backend tests passed in-memory, 41.2% relied on synthetic `jwt.encode()` fixtures bypassing `/auth/login`. In the frontend route inventory, 40 routes were marked `PASS` despite 404 network failures on non-pilot routes.
3. **Secret Layer Baking (`SEC-INFRA-01`):**  
   `backend/Dockerfile` previously contained `COPY .env ./.env`. This was remediated in staging by removing the line and adding `.env` to `.dockerignore`.
4. **Rate Limiting Reverse Proxy IP (`SEC-AUTH-01`):**  
   Rate limiter was updated to inspect `X-Forwarded-For` when connections arrive from local reverse proxy `127.0.0.1`.
5. **Clinical Prescription Privilege Boundary (`SEC-PRIV-01`):**  
   Restricted prescription authoring strictly to accounts with the `DOCTOR` role or explicit `prescription.create` permission.
