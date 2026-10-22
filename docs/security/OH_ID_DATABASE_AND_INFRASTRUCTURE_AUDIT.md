# OH-ID — Database & Infrastructure Security Hardening Audit

**Document ID:** OHID-SEC-INFRA-01  
**Assessment Standard:** CIS PostgreSQL Benchmark 15 & CIS Linux / Docker Benchmark  
**Target Environment:** VPS `157.20.172.186` & Supabase Cloud PostgreSQL 15.8  
**Date:** October 21, 2026  
**Auditor:** Independent Database Reliability & DevSecOps Engineer  

---

## 1. Executive Summary & Infrastructure Scorecard

| Infrastructure Component | Hardening Standard | Observed Configuration | Audit Assessment |
|---|---|---|---|
| **SQL Query Parameterization** | OWASP Top 10 A03 (Injection) | 100% Parameterized queries across repositories | **PASS** (Zero dynamic SQL concatenation) |
| **Database Network Transport** | CIS Benchmark 3.1 | TLS-encrypted (`sslmode=require`) | **PASS** (All traffic encrypted in transit) |
| **Docker Container Isolation** | CIS Docker 5.1 | Backend runs in `network_mode: host` | **FINDING** (Compromises network isolation) |
| **Docker Build Secrets** | CIS Docker 4.2 | `COPY .env ./.env` in backend Dockerfile | **HIGH RISK FINDING** (Bakes secrets into image) |
| **Nginx TLS Termination** | Mozilla Modern Guidelines | TLS 1.2/1.3, Let's Encrypt RSA 2048, HSTS | **PASS** (Strong perimeter encryption) |
| **Listening Network Sockets** | CIS Linux 3.4 | Uvicorn bound to `127.0.0.1:8050` | **PASS** (Not publicly reachable directly) |
| **Audit Logging & Masking** | HIPAA §164.312(b) / DPDP | Audit logs stored in `oh_id.audit_logs` | **PASS** (Passwords/tokens masked) |
| **Automated Backups** | CIS Benchmark 8.1 | Supabase automated daily snapshots (7-day retention)| **PASS** (Point-in-Time Recovery enabled) |

---

## 2. Database Security & Query Parameterization Analysis

### Parameterized Query Verification
Repositories (`backend/app/repositories/sp_views_repository.py`, `enterprise_iam_repository.py`) were audited line-by-line for SQL injection vulnerabilities:
- **Pattern Used:** Parameterized tuple binding using `%s` or named parameters `:param`:
  ```python
  cursor.execute(
      "SELECT * FROM oh_id.vw_user_auth WHERE mobile_number = %s AND is_active = TRUE",
      (mobile_number,)
  )
  ```
- **Finding:** Zero instances of f-strings, format strings, or unescaped string concatenations were identified inside SQL execution calls.
- **Automated Pentest Test:** Executing `test_security_hardening.py` with SQL injection payload `' OR 1=1--` resulted in Pydantic phone validation rejection (`HTTP 422 Unprocessable Entity`), successfully preventing the payload from reaching the query engine.

### Database Credentials Management
- Database connection strings are strictly read from the environment (`DATABASE_URL`).
- No hardcoded database credentials exist in repository source code files.

---

## 3. Host & Container Security Audit

### 1. Docker Host Network Mode Assessment
- **Current Setup:** `docker-compose.yml` configures `oh-id-backend` with `network_mode: host`.
- **Root Cause for Configuration:** The Docker bridge virtual network was unable to route IPv6 packets to Supabase (`db.arkoolfygfqawyvwnldv.supabase.co`), causing connection timeouts. Switching to host mode permitted direct IPv6 socket resolution.
- **Residual Risk:** Host network mode removes network namespace isolation between the container and host VPS.
- **Mitigation in Place:** The Uvicorn process is explicitly bound to `127.0.0.1` (`--host 127.0.0.1 --port 8050`), preventing external internet interfaces from reaching the backend directly. Only the local Nginx reverse proxy can forward traffic.

### 2. Docker Image Secret Baking (SEC-INFRA-01 - High Severity)
- **Vulnerability:** `backend/Dockerfile` line 19 contains:
  ```dockerfile
  COPY .env ./.env
  ```
- **Exploitation Impact:** Anyone with access to the Docker image or container registry can extract production credentials (`DATABASE_URL`, `SECRET_KEY`) using `docker history --no-trunc` or inspecting image layers.
- **Immediate Remediation Required:**
  1. Remove `COPY .env ./.env` from `backend/Dockerfile`.
  2. Add `.env` and `*.env` to `.dockerignore`.
  3. Rely exclusively on `env_file: [.env]` in `docker-compose.yml` to inject environment variables at container launch time.

---

## 4. Reverse Proxy & Perimeter Transport Security

### Nginx VHost Configuration (`ohid.online`)
- **Public Ingress:** Ports 80 (HTTP) and 443 (HTTPS).
- **HTTP Redirection:** Mandatory `301 Moved Permanently` to `https://ohid.online$request_uri`.
- **TLS Protocol:** TLSv1.2, TLSv1.3 with secure cipher suites (`ECDHE-ECDSA-AES128-GCM-SHA256`, `ECDHE-RSA-AES128-GCM-SHA256`).
- **Security Headers Injected:**
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy: default-src 'self' ...`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Cache Prevention:** Responses under `/api/` carry `Cache-Control: no-store, no-cache, must-revalidate, private` to prevent caching of sensitive healthcare responses in downstream proxy caches.
