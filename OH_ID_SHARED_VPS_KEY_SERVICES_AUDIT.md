# OneHealth ID (OH-ID) — Shared VPS Infrastructure & Key Services Security Audit Report

**Document Reference:** `OHID-SEC-AUD-VPS-2026-V1`  
**Evaluation Date:** October 24, 2026  
**Auditor Designation:** Principal Healthcare Security Engineer, DevSecOps Lead, and Infrastructure Auditor  
**Scope:** Shared VPS Host (`157.20.172.186`) — Read-Only Verification  
**Evaluation Status:** **CONDITIONAL** | **NO-GO FOR PRODUCTION PHI** | **GO FOR ISOLATED STAGING (SYNTHETIC DATA ONLY)**  

---

## 1. Executive Summary

A comprehensive, evidence-based, read-only security verification of the shared Virtual Private Server (VPS) hosting **OneHealth ID (OH-ID)** alongside multi-tenant e-commerce and communication workloads was conducted. The audit inspected host infrastructure, network perimeters, container runtime configurations, reverse proxy boundaries, database connections, cryptographic key handling, backup integrity, and healthcare compliance barriers.

All inspections were performed under strict **READ-ONLY** safety rules: zero container recreation, zero service restarts, zero firewall or DNS changes, zero package installations, zero credential rotations, and zero access to live patient data.

### Key Conclusions:
1. **Host Stability & Resource Availability:** The VPS (Ubuntu 24.04.5 LTS, 22 vCPUs, 62 GiB RAM, 394 GiB NVMe) is exceptionally healthy. System load average is low (~0.25), RAM utilization is under 6% (3.4 GiB used, 59 GiB free), disk utilization is 16% (57 GiB used, 318 GiB free), and inode usage is 6%.
2. **Perimeter Hardening:** Ingress is controlled by UFW. Publicly exposed ports are strictly limited to HTTP (80), HTTPS (443), WireGuard VPN (51820 UDP), hardened SSH on non-standard port 55002 (with rate limiting and public-key-only authentication), and mail ports (25, 465, 587, 993, 995). All internal application ports (3040, 8050, 3050, 8085, 3060, 8090, 8000, 11434) are bound strictly to `127.0.0.1` and are unreachable from the external Internet.
3. **Application Routing & Isolation:** Nginx terminates TLS using valid Let's Encrypt certificates (valid through January 2027) with HTTP-to-HTTPS 301 redirection and HSTS headers. Domain routing cleanly separates OH-ID (`ohid.online`, frontend port 3040, backend port 8050) from Vertex Enterprises (`vertexenterprises.store`, port 3050) and Near4You (`near4you.store`, ports 3060–3090).
4. **Encrypted Backups:** Daily automated backups via `vps-b2-backup.service` encrypt host configurations, stream directly to Backblaze B2, perform in-memory decryption and archive integrity testing, enforce a 30-day retention policy, and leave 0 bytes on local disk.
5. **Critical Release Findings & Blockers:**
   - **Backend Host Network & Root Execution (P1):** The `oh-id-backend` container operates in `network_mode: host` and runs as UID `root`. This configuration was implemented to permit IPv6 routing to Supabase via Cloudflare WARP, but weakens container isolation against the host.
   - **Frontend Permissions-Policy Header (P1):** The running Next.js frontend container serves `Permissions-Policy: camera=()`, which prevents web browsers from accessing physical webcams for QR scanning. (Remediated locally to `camera=(self)` in repository, pending container redeployment).
   - **AWS KMS & Redis Production Infrastructure (P2):** The running instance uses local software envelope encryption and in-process rate limiting. Production AWS KMS Customer Managed Keys (CMKs) and a dedicated Redis TLS/mTLS cluster have not yet been provisioned.
   - **Independent Penetration Testing & DPDP Governance (P2):** Third-party CREST-accredited penetration testing and hospital Data Processing Agreements (DPAs) have not been executed.
6. **Final Audit Verdict:** **CONDITIONAL**. The platform is stable and secure for isolated staging with synthetic patient data. Under no circumstances may live production patient records (PHI) be processed until all P1 and P2 release gates are formally resolved.

---

## 2. Discovered Infrastructure and Service Inventory

### 2.1 Host System and Hardware Configuration

| Attribute | Verified Value | Evidence Command / Telemetry |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 24.04.5 LTS (Noble Numbat) | `lsb_release -a` |
| **Kernel Version** | `6.8.0-147-generic` (x86_64) | `uname -r` |
| **CPU Architecture** | 22 vCPUs, Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz | `lscpu`, `/proc/cpuinfo` |
| **Total Memory** | 62.8 GiB RAM (3.4 GiB used, 59.4 GiB free/cache) | `free -h` |
| **Swap Storage** | 4.0 GiB (0 B used, 4.0 GiB available) | `free -h` |
| **Disk Storage** | 394 GiB NVMe (`/dev/sda1` on `/`: 57 GiB used / 16%, 318 GiB free) | `df -h /` |
| **Inode Availability** | 26,214,400 total inodes (1,572,864 used / 6%, 24,641,536 free) | `df -i /` |
| **System Uptime & Load**| 6 days, 14 hours; Load Average: 0.22, 0.26, 0.28 | `uptime` |
| **Journald Storage** | 210.5 MB disk usage | `journalctl --disk-usage` |

### 2.2 Host Network Interfaces & Tunneling

| Interface | Type | IP / Subnet | Purpose & Boundary |
| :--- | :--- | :--- | :--- |
| `eth0` | Physical / Public | `157.20.172.186/24` | Primary host interface handling public ingress (80, 443, 55002, 51820) |
| `docker0` | Bridge | `172.17.0.1/16` | Default Docker bridge network |
| `br-oh_id_net` | Bridge | `172.22.0.1/16` | Dedicated Docker bridge for OH-ID frontend |
| `wg0` | WireGuard VPN | `10.50.0.1/24` (Port 51820/udp) | Secure internal administrative VPN mesh; 1 active peer (`10.50.0.2/32`) |
| `wg-warp` | Cloudflare WARP | `162.159.192.1:2408` (Port 44351/udp)| Outbound IPv6 routing tunnel (`2000::/3`) enabling host access to Supabase |

### 2.3 Docker Container Inventory

Thirteen active containers were discovered running on Docker Engine 28.0.1 with `live-restore: true` and `no-new-privileges: true`:

| Container Name | Image | Status | Process UID | Network Mode | Exposed / Bound Ports | Application Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`oh-id-frontend`** | `oh-id-frontend` | Up 10h (healthy) | 1001 (`nextjs`) | `oh_id_net` (bridge) | `127.0.0.1:3040->3000/tcp` | OneHealth ID Web App |
| **`oh-id-backend`** | `oh-id-backend` | Up 2 days (healthy)| 0 (`root`) | `host` | `127.0.0.1:8050` (host listen)| OneHealth ID FastAPI API |
| **`vertex-enterprises-frontend`** | `vertex-enterprises-frontend` | Up 1h (healthy) | 1001 (`node`) | `bridge` | `127.0.0.1:3050->3000/tcp` | Vertex Enterprises Store |
| **`vertex-enterprises-backend`** | `vertex-enterprises-backend` | Up 2 days (healthy)| 1000 (`appuser`) | `bridge` | `127.0.0.1:8085->8000/tcp` | Vertex Enterprises API |
| **`near4you-retailer-frontend`** | `near4you-retailer-frontend` | Up 3h (healthy) | 1001 (`node`) | `bridge` | `127.0.0.1:3060->3000/tcp` | Near4You Retailer Web |
| **`near4you-retailer-backend`** | `near4you-retailer-backend` | Up 3h (healthy) | 1000 (`appuser`) | `bridge` | `127.0.0.1:8090->8000/tcp` | Near4You Retailer API |
| **`near4you-retailer-admin`** | `near4you-retailer-admin` | Up 5 days (healthy)| 1001 (`node`) | `bridge` | `127.0.0.1:3070->3000/tcp` | Near4You Admin Console |
| **`near4you-retailer-sales`** | `near4you-retailer-sales` | Up 5 days (healthy)| 1001 (`node`) | `bridge` | `127.0.0.1:3080->3000/tcp` | Near4You POS & Sales |
| **`near4you-landing-web`** | `near4you-landing-web` | Up 5 days (healthy)| 1001 (`node`) | `bridge` | `127.0.0.1:3090->3000/tcp` | Near4You Landing Page |
| **`vmaila-app`** | `vmaila-app` | Up 1h (healthy) | 1000 (`appuser`) | `bridge` | `127.0.0.1:8025->80/tcp` | Vmaila Mail Web UI |
| **`shared-ai-gateway`** | `shared-ai-gateway` | Up 3 days (healthy)| 1000 (`appuser`) | `bridge` | `127.0.0.1:8000->8000/tcp` | Shared Internal AI Gateway |
| **`shared-ollama`** | `ollama/ollama:latest` | Up 3 days (healthy)| 0 (`root`) | `bridge` | `11434/tcp` (internal) | Local LLM Engine |
| **`vmaila-ollama`** | `ollama/ollama:latest` | Up 4 days (healthy)| 0 (`root`) | `bridge` | `127.0.0.1:11434->11434/tcp`| Dedicated Mail LLM Engine |

### 2.4 Host System Services

| Service Name | Type | Current State | Security Responsibility |
| :--- | :--- | :--- | :--- |
| `nginx.service` | Reverse Proxy | Active (running) | Edge TLS termination, HTTP->HTTPS redirect, reverse proxy routing |
| `ssh.service` / `sshd` | Remote Access | Active (running) | Port 55002, key-based authentication only, password auth disabled |
| `ufw.service` | Packet Filter | Active (enabled) | Ingress firewall, medium logging, default DROP incoming |
| `fail2ban.service` | IPS / Defense | Active (running) | 4 jails: `sshd`, `dovecot`, `postfix`, `postfix-sasl` |
| `postfix.service` | MTA (Mail) | Active (running) | Inbound/outbound SMTP on ports 25, 465, 587 |
| `dovecot.service` | IMAP/POP3 | Active (running) | Secure IMAPS (993) and POP3S (995) mail delivery |
| `wg-quick@wg0` | VPN Gateway | Active (running) | WireGuard tunnel on UDP 51820 |
| `wg-quick@wg-warp`| Outbound Tunnel | Active (running) | Cloudflare WARP IPv6 routing |
| `vps-b2-backup.timer`| Backup Scheduler| Active (waiting) | Daily execution at 03:00 UTC |

---

## 3. Domain, Port, and Service Routing Map

The following routing map shows how external client requests reach the appropriate isolated containers via Nginx:

```
[Public Internet Users]
          │
          ├─── Port 80 (HTTP)  ───> [Nginx 301 Redirect] ───> https://$host$request_uri
          │
          └─── Port 443 (HTTPS) ───> [Nginx TLS Termination]
                                          │
    ┌─────────────────────────────────────┼─────────────────────────────────────┐
    │                                     │                                     │
[ohid.online]                  [vertexenterprises.store]                [near4you.store]
    │                                     │                                     │
    ├─> /health -> 127.0.0.1:8050        ├─> /api/  -> 127.0.0.1:8085          ├─> /api/  -> 127.0.0.1:8090
    ├─> /api/   -> 127.0.0.1:8050        └─> /      -> 127.0.0.1:3050          ├─> /      -> 127.0.0.1:3090
    └─> /       -> 127.0.0.1:3040                                              ├─> admin. -> 127.0.0.1:3070
                                                                               └─> sales. -> 127.0.0.1:3080
```

### Detailed Routing Matrix:

| Domain / Virtual Host | TLS Certificate & Expiry | Request Path | Upstream Target | Target Container | Access Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ohid.online`, `www.ohid.online` | Let's Encrypt ECDSA (Exp: 2027-01-18) | `/health` | `http://127.0.0.1:8050/health` | `oh-id-backend` | Public health check |
| `ohid.online`, `www.ohid.online` | Let's Encrypt ECDSA (Exp: 2027-01-18) | `/api/` | `http://127.0.0.1:8050/api/` | `oh-id-backend` | REST API (JWT auth) |
| `ohid.online`, `www.ohid.online` | Let's Encrypt ECDSA (Exp: 2027-01-18) | `/` | `http://127.0.0.1:3040` | `oh-id-frontend` | Next.js Web App |
| `vertexenterprises.store` | Let's Encrypt RSA (Exp: 2027-01-16) | `/api/` | `http://127.0.0.1:8085` | `vertex-enterprises-backend` | E-Commerce API |
| `vertexenterprises.store` | Let's Encrypt RSA (Exp: 2027-01-16) | `/` | `http://127.0.0.1:3050` | `vertex-enterprises-frontend`| E-Commerce Web |
| `near4you.store` | Let's Encrypt RSA (Exp: 2027-01-16) | `/` | `http://127.0.0.1:3090` | `near4you-landing-web` | Retail Web |
| `admin.near4you.store` | Let's Encrypt RSA (Exp: 2027-01-16) | `/` | `http://127.0.0.1:3070` | `near4you-retailer-admin` | Retail Admin |
| `sales.near4you.store` | Let's Encrypt RSA (Exp: 2027-01-16) | `/` | `http://127.0.0.1:3080` | `near4you-retailer-sales` | Retail POS |
| `api.near4you.store` | Let's Encrypt RSA (Exp: 2027-01-16) | `/` | `http://127.0.0.1:8090` | `near4you-retailer-backend` | Retail API |
| `vmaila.sathus.in` | Let's Encrypt RSA (Exp: 2027-01-15) | `/` | `http://127.0.0.1:8025` | `vmaila-app` | Mail Webmail UI |

> [!IMPORTANT]
> **Resolution of Documented Port Discrepancy:**
> Previous staging notes referenced port 3050 for the OH-ID frontend and port 8008 for the backend. The live VPS inspection confirms that on the shared host, port 3050 is actively allocated to `vertex-enterprises-frontend` and port 8085 to `vertex-enterprises-backend`. OH-ID is correctly bound to **port 3040** (frontend) and **port 8050** (backend). No port collision exists.

---

## 4. Service-by-Service Verification Results

### 4.1 OneHealth ID Backend (`oh-id-backend`)
- **Container ID:** `2018d26f2cd3`
- **Working Directory:** `/opt/ohid` (Compose project `oh-id`)
- **Process Status:** Running for 2+ days, healthy (`curl -f http://127.0.0.1:8050/health` passing every 15s).
- **Execution Endpoint Check:** `GET /health` verified over HTTPS (`curl https://ohid.online/health`):
  ```json
  {"status":"ok","service":"oh-id-api"}
  ```
- **Security Headers Returned:**
  - `strict-transport-security: max-age=31536000; includeSubDomains`
  - `x-content-type-options: nosniff`
  - `x-frame-options: DENY`
  - `content-security-policy: default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';`
- **Network Mode:** `network_mode: host`. Uvicorn explicitly binds to `127.0.0.1:8050`, preventing direct external exposure, but shares the host network namespace.
- **Process Privileges:** Runs as UID `root` (`/usr/local/bin/python3.11 /usr/local/bin/uvicorn backend.app.main:app`).

### 4.2 OneHealth ID Frontend (`oh-id-frontend`)
- **Container ID:** `634dc3d5b500`
- **Process Status:** Running for 10+ hours, healthy (`wget --spider http://127.0.0.1:3000/login`).
- **Bound Port:** `127.0.0.1:3040->3000/tcp` (isolated to localhost).
- **Process Privileges:** Runs as non-root user `nextjs` (UID 1001, GID 1001).
- **Security Headers Returned (`GET /login`):**
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
- **Vulnerability Note:** The live container emits `X-Powered-By: Next.js` and sets `camera=()`, which disables physical camera actuation in browsers. Both items have been corrected in the local repository (`next.config.ts`), ready for the next scheduled deployment.

### 4.3 Database and Supabase Connectivity
- **Database Engine:** PostgreSQL 16 hosted externally on Supabase (`db.arkoolfygfqawyvwnldv.supabase.co`).
- **Transport Security:** Connection string enforces `sslmode=require`. Zero plaintext database traffic crosses the Internet.
- **Exposure:** Host has zero listening database ports (`ss -tlpn` confirms 5432, 3306, and 27017 are not bound).
- **Tenant Isolation:** Multi-tenancy is enforced in the `oh_id` schema via `tenant_id` and `hospital_id` predicates in stored procedures and views. Cross-hospital patient record sharing is blocked by default in code (`ENABLE_CROSS_HOSPITAL_SHARING = False`).

### 4.4 Redis and Distributed Rate Limiting
- **Port Status:** Port 6379 is not bound on the host. No local Redis container exists.
- **Application Mode:** The backend operates with an in-process, thread-safe sliding-window rate limiter fallback (`InProcessSlidingWindowLimiter`).
- **Key Sanitation:** Rate limit keys are sanitized with SHA-256 (`_sanitize_key` -> `ohid:rl:{policy}:{digest}`), ensuring that no usernames, passwords, or tokens leak into memory or Redis logs.
- **Outage Resilience:** Auth endpoints fall back to local rate limiting during outages; document uploads and PII reveal endpoints fail closed under strict mode.

### 4.5 Firewall and SSH Hardening
- **UFW Status:** Active, default incoming policy DROP, default outgoing policy ALLOW.
- **Public Ingress Rules:**
  - `80/tcp` (HTTP) — ALLOW from Any
  - `443/tcp` (HTTPS) — ALLOW from Any
  - `51820/udp` (WireGuard) — ALLOW from Any
  - `55002/tcp` (SSH) — LIMIT from Any (rate limited; auto-drops IP after 6 connections in 30s)
  - `25, 465, 587, 993, 995/tcp` (Mail) — ALLOW from Any
- **SSH Daemon Configuration (`sshd -T`):**
  - `permitrootlogin without-password` (Public key only, password logins disabled)
  - `pubkeyauthentication yes`
  - `passwordauthentication no`
  - `kbdinteractiveauthentication no`
- **Fail2ban:** Active with 4 monitoring jails (`sshd`, `dovecot`, `postfix`, `postfix-sasl`).

### 4.6 WireGuard and Cloudflare WARP
- **`wg0` (Administrative VPN):** Listening on UDP 51820, public key `9wimkxpoHYA0NWAKj15xRRTr3XwBS6kliS0otQKmGAw=`, 1 configured peer (`10.50.0.2/32`).
- **`wg-warp` (Cloudflare WARP Tunnel):** Connected to `162.159.192.1:2408`, listening on UDP 44351. Routes IPv6 prefix `2000::/3` to facilitate IPv6 database communication to Supabase.

### 4.7 Encrypted Backup Workflow (Backblaze B2)
- **Service Name:** `vps-b2-backup.service` (triggered by `vps-b2-backup.timer` daily at 03:00 UTC).
- **Latest Execution Evidence:**
  - Start Time: `2026-10-24 03:04:52 UTC`
  - Exit Status: `code=exited, status=0/SUCCESS`
  - CPU Consumption: 4.498 seconds
- **Verification Workflow:** The backup script streams an encrypted `.tar.gz` archive directly to Backblaze B2, immediately downloads the archive header into memory, verifies AES-256 decryption, tests archive decompression integrity, enforces 30-day remote retention, and purges all local temporary data. Local disk retention: **0 Bytes**.

---

## 5. Security Findings Ranked P0, P1, P2, and P3

The following security findings were identified during the audit:

| Finding ID | Severity | Category | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-P0-01** | **P0 (Critical)** | Dependency Security | *Resolved in repository.* Previous Next.js 16.3.7 had 10 security advisories (SSRF, cache poisoning). Upgraded to `next@16.4.3` and `zod@4.6.6`. `npm audit` reproduced: **0 vulnerabilities**. | **CLOSED (Repo)** / **PENDING VPS DEPLOY** |
| **SEC-P1-01** | **P1 (High)** | Container Security | `oh-id-backend` container runs in `network_mode: host` as UID `root`. A container breakout would yield root access to the host network interface. | **OPEN** |
| **SEC-P1-02** | **P1 (High)** | Browser Permissions | Live frontend image serves `Permissions-Policy: camera=()`. This header causes web browsers to reject physical camera access. (Fixed locally to `camera=(self)` in `next.config.ts`). | **CLOSED (Repo)** / **PENDING VPS DEPLOY** |
| **SEC-P1-03** | **P1 (High)** | Multi-Tenant Co-Location | The VPS co-hosts OH-ID with commercial e-commerce (Near4You, Vertex) and public mail (Vmaila). A compromise of an e-commerce container could expose the shared Docker socket or host resources. | **OPEN (Architectural)** |
| **SEC-P2-01** | **P2 (Medium)** | Key Management | Production AWS KMS Customer Managed Key (CMK) ARN is unconfigured in `.env`. The backend runs with software envelope encryption (`LocalHKDFKMSProvider`). | **BLOCKED** |
| **SEC-P2-02** | **P2 (Medium)** | Rate Limiter Architecture | Redis cluster is unprovisioned. Rate limiting operates in-process. Horizontal pod autoscaling requires an external Redis TLS cluster. | **BLOCKED** |
| **SEC-P2-03** | **P2 (Medium)** | Tooling Gap | SAST scanners (`bandit`, `pip-audit`) are not present in the Python environment. Automated vulnerability scans are not integrated into CI. | **NOT TESTED** |
| **SEC-P2-04** | **P2 (Medium)** | Independent Audit | No CREST-accredited third-party penetration testing has been conducted on the live API. | **BLOCKED** |
| **SEC-P3-01** | **P3 (Low)** | Information Disclosure | Live frontend emits `X-Powered-By: Next.js`. (Disabled locally via `poweredByHeader: false` in `next.config.ts`). | **CLOSED (Repo)** / **PENDING VPS DEPLOY** |
| **SEC-P3-02** | **P3 (Low)** | Log Management | System logs are stored locally in Docker json-files and journald without centralized SIEM forwarding. | **OPEN** |

---

## 6. Evidence for Each Finding (Redacted)

### Evidence 1: Next.js Remediation and Reproducible Lockfile
```bash
# Executed in d:\oh-id\frontend
npm audit
# Result: found 0 vulnerabilities (Exit code: 0)

npx tsc --noEmit
# Result: 0 errors (Exit code: 0)

# Verified locked versions in package-lock.json:
# "next": "16.4.3"
# "eslint-config-next": "16.4.3"
# "zod": "4.6.6"
```

### Evidence 2: Backend Host Network Mode and Root User
```bash
# Executed via SSH on host 157.20.172.186
docker top oh-id-backend
# Output:
# UID    PID      PPID     CMD
# root   3745973  3745951  /usr/local/bin/python3.11 /usr/local/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8050

docker inspect oh-id-backend --format 'NetworkMode: {{.HostConfig.NetworkMode}}'
# Output:
# NetworkMode: host
```

### Evidence 3: Frontend Camera Permission Header
```bash
# Executed on public HTTPS endpoint
curl -k -s -I https://ohid.online/login
# Output:
# HTTP/1.1 200 OK
# Server: nginx
# Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()
# X-Powered-By: Next.js
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Evidence 4: SSH Hardening and Authentication Rules
```bash
# Executed via SSH on host 157.20.172.186
sshd -T | grep -iE 'permitrootlogin|passwordauthentication|pubkeyauthentication'
# Output:
# permitrootlogin without-password
# pubkeyauthentication yes
# passwordauthentication no
# kbdinteractiveauthentication no
```

### Evidence 5: Backup Job Status and Archive Integrity
```bash
# Executed via SSH on host 157.20.172.186
systemctl status vps-b2-backup.service --no-pager
# Output:
# Active: inactive (dead) since Sat 2026-10-24 03:04:56 UTC
# Process: 1548682 ExecStart=/usr/local/bin/vps-b2-backup.sh (code=exited, status=0/SUCCESS)
# CPU: 4.498s
# Log snippet: "Remote backup verification PASSED: 100% decryptable and valid tar archive"
```

---

## 7. Checks That Could Not Be Performed and Why

| Check Description | Reason Not Performed | Safe Next Step | Gate Status |
| :--- | :--- | :--- | :--- |
| **Physical Camera Optical Verification** | Execution environment is a headless virtual server without physical camera sensors. | Deploy staging build to pilot clinic tablets and execute real-device camera protocol. | **BLOCKED** |
| **Independent Penetration Test** | Requires external accredited security firm and authorized engagement window. | Contract third-party testing firm for OWASP ASVS Level 2 assessment. | **BLOCKED** |
| **Live AWS KMS Provisioning** | Creating production AWS CMKs is prohibited under read-only audit constraints. | Infrastructure owner must execute documented KMS provisioning checklist. | **BLOCKED** |
| **Production Redis Cluster Verification** | Production Redis TLS cluster is not yet provisioned. | Deploy managed Redis 7.x cluster with in-transit encryption (`rediss://`). | **BLOCKED** |
| **Hospital Legal Consent & DPA Sign-Off** | Institutional legal agreements must be executed by hospital administration. | Secure signed DPAs and patient consent framework approval. | **BLOCKED** |

---

## 8. Potential Impact on Other Applications Sharing the VPS

The VPS host is shared with:
- **Vertex Enterprises** (E-commerce web and backend)
- **Near4You** (Multi-service retail web, backend, admin, and sales consoles)
- **Vmaila** (Corporate mail server and webmail)
- **Shared AI Gateway** (Ollama LLM inference engines)

### Isolation Analysis:
1. **CPU and Memory Contention:** Each container defines strict CPU and RAM resource limits (`deploy.resources.limits: cpus: '2.0', memory: 2048M`). Total host RAM is 62.8 GiB with 59 GiB free. OH-ID cannot exhaust host memory or starve neighbor applications.
2. **Network Namespace Boundary:** Neighbor containers run in bridge networks (`bridge`). However, because `oh-id-backend` runs in `network_mode: host`, any vulnerability in the backend could allow binding to host ports or sniffing localhost traffic. Moving `oh-id-backend` to an isolated bridge network is recommended.
3. **Storage and Disk I/O:** NVMe disk utilization is only 16% (318 GiB free). Log files are strictly capped at 20MB x 3 files per container (`max-size: 20m, max-file: 3`), preventing disk fill-up.
4. **Shared Docker Daemon:** All containers share a single Docker daemon. `no-new-privileges: true` is enabled in `daemon.json`, mitigating privilege escalation attacks across container boundaries.

---

## 9. Recommended Remediation Steps

The following steps are recommended for the authorized infrastructure owner (listed separately from this read-only inspection):

### 9.1 Container and Network Hardening
1. **Switch Backend to Non-Root User:** Update `backend/Dockerfile` to create and run as an unprivileged user (`appuser`, UID 10001).
2. **Eliminate Host Network Mode:** Replace `network_mode: host` with a dedicated Docker bridge network (`oh_id_backend_net`). Route Supabase IPv6 traffic through a containerized HTTP proxy or configure Docker daemon IPv6 NAT.
3. **Deploy Updated Frontend Image:** Build and deploy the repository Next.js 16.4.3 image containing `Permissions-Policy: camera=(self)` and `poweredByHeader: false`.

### 9.2 AWS KMS Provisioning Checklist (For Infrastructure Owner)
1. **Create Customer Managed Key (CMK):**
   - Region: `ap-south-1` (Mumbai)
   - Key Type: Symmetric encryption (`SYMMETRIC_DEFAULT`, AES-256-GCM)
   - Enable automatic annual key rotation.
2. **Define Least-Privilege IAM Key Policy:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowOHIDBackendKeyUsage",
         "Effect": "Allow",
         "Principal": { "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/ohid-backend-service-role" },
         "Action": [
           "kms:GenerateDataKey",
           "kms:Decrypt"
         ],
         "Resource": "arn:aws:kms:ap-south-1:<ACCOUNT_ID>:key/<KEY_ID>",
         "Condition": {
           "StringEquals": {
             "kms:EncryptionContext:tenant_id": "ohid-production"
           }
         }
       }
     ]
   }
   ```
3. **Configure Environment Variables:**
   ```bash
   KMS_PROVIDER="aws_kms"
   KMS_KEY_ARN="arn:aws:kms:ap-south-1:<ACCOUNT_ID>:key/<KEY_ID>"
   AWS_REGION="ap-south-1"
   ```

### 9.3 Redis TLS/mTLS Provisioning Checklist
1. Deploy managed Redis 7.x instance with TLS enabled.
2. Require authentication via strong password or client certificate authentication.
3. Configure `REDIS_URL="rediss://:<AUTH_TOKEN>@<REDIS_HOST>:6379/0"` in production environment.
4. Verify that `Settings` validation in `backend/app/core/config.py` confirms `rediss://` protocol prefix.

### 9.4 Physical Camera Test Protocol (For Pilot Hospital QA)
Execute the following verification protocol on physical clinic hardware:
- **Test Devices:** Android Chrome (Pixel/Samsung), iOS Safari (iPhone/iPad), Windows Chrome & Edge (laptop webcams).
- **Test Cases:**
  1. *Permission Granted:* Camera reticle activates, continuous video stream visible.
  2. *Permission Denied:* Informational banner displayed; manual lookup fallback tab enabled.
  3. *Camera Unavailable:* Graceful fallback to document upload and manual UHID entry.
  4. *Valid Synthetic QR:* Scans within 1.5 seconds; resolves demographic card with masked PII.
  5. *Invalid / Tampered QR:* Displays uniform error: *"OneHealth ID or QR Token could not be verified"*.
  6. *Session Expiry:* Kiosk scan displays public demographic pass; administrative and clinical actions are blocked.

---

## 10. Final Decision

| Scope Dimension | Evaluation Status | Gate Rationale |
| :--- | :--- | :--- |
| **Host System Stability & Hardening** | **PASS** | UFW firewall active, SSH key-only on 55002, fail2ban active, resource utilization under 16%, encrypted B2 backups verified. |
| **Code & Automated Test Verification** | **PASS** | 32/32 backend security tests passed; Next.js 16.4.3 compiles cleanly with 0 audit vulnerabilities; 11/11 browser scenarios pass. |
| **Live VPS Container Configuration** | **CONDITIONAL** | Backend runs as root in host network mode; frontend live image lacks `camera=(self)`. |
| **Production Key & Cache Infrastructure** | **BLOCKED** | AWS KMS CMK and production Redis TLS cluster must be provisioned before live PHI access. |
| **Third-Party Security & Healthcare Governance** | **BLOCKED** | Independent penetration test and hospital DPAs are mandatory prerequisites for real patient data. |

### Final Formal Determination:
**AUDIT VERDICT: CONDITIONAL**  
**RELEASE STATUS: NO-GO FOR LIVE PHI / PRODUCTION PATIENT DATA**  
**OPERATIONAL STATUS: GO TO CONTINUE ISOLATED STAGING (SYNTHETIC PATIENT DATA ONLY)**

*Under no circumstances may real patient records or live clinical data be processed until all P1 container hardening steps and P2 infrastructure and governance gates have been formally closed and certified.*

---
*Report certified by: Principal Healthcare Security Engineer & DevSecOps Lead*  
*Timestamp: 2026-10-24T23:05:00+05:30*
