# OH-ID — Multi-Tenant Isolation & BOLA/IDOR Penetration Test Results

**Document ID:** OHID-SEC-BOLA-01  
**Assessment Standard:** OWASP Top 10 API Security (API1:2023 Broken Object Level Authorization) & Section 35 Tenant Isolation  
**Target System:** OneHealth ID (OH-ID) Clinical Operating System  
**Date:** October 21, 2026  
**Auditor:** Independent Penetration Testing Lead & Application Security Engineer  

---

## 1. Multi-Tenant Testing Topology & Synthetic Identities

To rigorously validate cross-tenant and cross-patient isolation, tests were executed using two independently authenticated identities operating within separate clinical facilities:

```
+─────────────────────────────────────────────────────────────+
| TEST CONTEXT 1: KEDAR HOSPITAL (Tenant A: `hosp-kedar`)     |
| - User A (Nurse): Deepa Mohan (`usr-29809196ec`)             |
| - Doctor A: Dr. K. Senthil Nathan (`usr-kedar-doc-kumar`)   |
| - Patient A: Alice Smith (`p-101` / `pat-kedar-001`)        |
| - Invoice A: `inv-kedar-001`                                |
+─────────────────────────────────────────────────────────────+
| TEST CONTEXT 2: APOLLO CITY HOSPITAL (Tenant B: `hosp-001`) |
| - Doctor B: Dr. Priya Sharma (`doc-apollo-001`)             |
| - Patient B: Bob Johnson (`p-202` / `pat-apollo-002`)       |
| - Invoice B: `inv-apollo-002`                               |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Controlled Penetration Test Execution & Empirical Results

| Test ID | Target Endpoint | Attack Vector Tested | Request Modifications | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|---|---|
| **BOLA-01** | `GET /api/v1/patients/{patient_id}` | Patient Cross-Reading (IDOR) | Patient A requests Patient B's profile (`p-202`) | `403 Forbidden` | `403 Forbidden` (`detail: Forbidden: Patient self-isolation`) | **PASS** |
| **BOLA-02** | `GET /api/v1/prescriptions/{rx_id}` | Cross-Patient Prescription Access | Patient A requests Patient B's prescription (`rx-apollo-01`) | `403 Forbidden` | `403 Forbidden` (`detail: Forbidden: Access to other patient prescription denied`) | **PASS** |
| **BOLA-03** | `GET /api/v1/prescriptions/{rx_id}/pdf` | Prescription PDF Exfiltration | Patient A attempts downloading Patient B's signed PDF | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **BOLA-04** | `GET /api/v1/hospital/billing/invoices/{id}` | Billing Invoice IDOR | Patient A attempts querying Patient B's invoice (`inv-apollo-002`) | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **BOLA-05** | `POST /api/v1/clinical/encounters/{id}/notes` | Unauthorized Clinical Note Modification | Nurse A attempts saving clinical diagnosis to Encounter B | `403 Forbidden` | `403 Forbidden` (`detail: User lacks required permission clinical.write`) | **PASS** |
| **BOLA-06** | `POST /api/v1/hospital/opd/call-next` | Unauthorized Queue State Transition | Nurse A attempts calling next queue token | `403 Forbidden` | `403 Forbidden` (`detail: User lacks required permission queue.call`) | **PASS** |
| **BOLA-07** | `POST /api/v1/workspace/switch-context` | Unauthorized Tenant Switch | Nurse A attempts switching context to Hospital B (`hosp-001`) | `403 Forbidden` | `403 Forbidden` (`detail: User is not assigned to target hospital`) | **PASS** |
| **BOLA-08** | `POST /api/v1/workspace/switch-context` | Non-Existent Tenant Injection | User A attempts switching to fabricated `hosp-fake-999` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **BOLA-09** | `GET /api/v1/hospital/dashboard?hospital_id=hosp-001` | Cross-Hospital Dashboard Viewing | Hospital Admin A attempts loading Hospital B's dashboard | `403 Forbidden` | `403 Forbidden` (`detail: Cross-hospital tenant boundary violation`) | **PASS** |
| **BOLA-10** | `GET /api/v1/hospital/patients` | Header Tampering (`X-Hospital-Ref-Id`) | Clinician A supplies `X-Hospital-Ref-Id: hosp-001` on token | `403 Forbidden` | `403 Forbidden` | **PASS** |

---

## 3. Deep Dive: Zero-Trust Tenant Scoping

### Backend Enforcement Mechanism
All multi-tenant routes pass the resolved user through:
```python
def validate_hospital_tenant_scope(user: Dict[str, Any], target_hospital_id: Optional[str]):
    if not target_hospital_id:
        return
    user_perms = user.get("permissions") or []
    if "system.manage" in user_perms or "organization.read" in user_perms:
        return  # Platform Super Admin permitted
    user_hosp = user.get("hospital_ref_id") or user.get("hospital_id")
    if user_hosp and user_hosp != target_hospital_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Cross-hospital tenant boundary violation. You do not have access to this hospital facility."
        )
```

### Key Security Verifications
1. **Frontend Bypass Proof:** Direct `curl` and `requests` calls bypassing the Next.js UI were rejected identically by the FastAPI layer. Frontend route guards are treated strictly as navigation conveniences, not security boundaries.
2. **Object Identification:** Changing sequential IDs (e.g. `1`, `2`, `3`) or UUIDs in request paths failed to bypass access controls.
3. **Information Leakage on Denial:** Denied requests return generic error messages without echoing target patient names, hospital codes, or database schema internals.
