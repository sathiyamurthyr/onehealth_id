"""
Enterprise Test Suite: OH-ID Family Healthcare Model
Validates:
1. Multi-Patient Independent Identity (Unique Person ID, Unique OH-ID, Unique QR).
2. Data Isolation (Prescriptions, labs, visits, timeline never mixed across family members).
3. Context-Aware Switching with Authorization Verification.
4. Duplicate Prevention & Pre-check (search existing OH-ID vs create new).
5. Granular Permissions & Minor/Guardian Consent scopes.
6. Complete Family Audit Logging & IDOR Protection.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

@pytest.fixture
def patient_token():
    """Generates authentic bearer token for patient Alice Smith (p-101)."""
    resp = client.post("/api/v1/auth/login", json={
        "username": "patient",
        "password": "patient123"
    })
    assert resp.status_code == 200, f"Patient login failed: {resp.text}"
    return resp.json()["access_token"]

# --------------------------------------------------------------------------
# 1. FAMILY MEMBERS LISTING & OVERVIEW
# --------------------------------------------------------------------------

def test_list_family_members(patient_token):
    """Verifies that primary patient Alice Smith can view her linked family members with unique OH-IDs."""
    headers = {"Authorization": f"Bearer {patient_token}"}
    resp = client.get("/api/v1/me/family", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data, list)
    assert len(data) >= 3

    # Check distinct identities
    member_names = [m["member_name"] for m in data]
    member_ohids = [m["member_onehealth_id"] for m in data]
    relationships = [m["relationship"] for m in data]

    assert "Bob Smith" in member_names
    assert "Charlie Smith" in member_names
    assert "Dorothy Smith" in member_names

    # OH-IDs must all be unique and different from Alice's (OHID-IND-2026-01001)
    assert len(set(member_ohids)) == len(member_ohids)
    assert "OHID-IND-2026-01001" not in member_ohids

    # Minor / Guardian flags
    charlie = next(m for m in data if m["member_name"] == "Charlie Smith")
    assert charlie["is_minor"] is True
    assert charlie["is_guardian"] is True
    assert charlie["relationship"] == "SON"

def test_get_family_overview(patient_token):
    """Verifies aggregated family overview showing upcoming appointments with distinct member tags."""
    headers = {"Authorization": f"Bearer {patient_token}"}
    resp = client.get("/api/v1/me/family/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "primary_patient" in data
    assert "family_members" in data
    assert "upcoming_family_appointments" in data

    appts = data["upcoming_family_appointments"]
    assert len(appts) >= 3
    # Check that appointments carry individual patient names and relationships
    patient_names = [a["patient_name"] for a in appts]
    assert "Bob Smith" in patient_names or "Charlie Smith" in patient_names or "Alice Smith" in patient_names

# --------------------------------------------------------------------------
# 2. DUPLICATE CHECK & PRE-LINKING PREVIEW
# --------------------------------------------------------------------------

def test_check_existing_patient_by_ohid(patient_token):
    """Verifies duplicate check finds Bob Smith by OH-ID."""
    headers = {"Authorization": f"Bearer {patient_token}"}
    resp = client.post("/api/v1/me/family/check-existing", json={
        "identifier": "OHID-IND-2026-01002"
    }, headers=headers)
    assert resp.status_code == 200
    res = resp.json()["data"]
    assert res["found"] is True
    assert len(res["candidates"]) >= 1
    assert res["candidates"][0]["onehealth_id"] == "OHID-IND-2026-01002"
    assert res["candidates"][0]["name"] == "Bob Smith"

def test_check_existing_patient_not_found(patient_token):
    """Verifies non-existent identifier returns found=False."""
    headers = {"Authorization": f"Bearer {patient_token}"}
    resp = client.post("/api/v1/me/family/check-existing", json={
        "identifier": "OHID-NONEXISTENT-999"
    }, headers=headers)
    assert resp.status_code == 200
    res = resp.json()["data"]
    assert res["found"] is False
    assert len(res["candidates"]) == 0

# --------------------------------------------------------------------------
# 3. CONTEXT SWITCHING & CLINICAL DATA ISOLATION (NEVER MIX DATA)
# --------------------------------------------------------------------------

def test_prescriptions_data_isolation(patient_token):
    """
    CRITICAL RULE: Prescriptions must belong strictly to the selected person.
    Alice's Rx -> Alice only.
    Bob's Rx -> Bob only (Cardiology: Telmisartan, Rosuvastatin).
    Charlie's Rx -> Charlie only (Pediatric: Levocetirizine, Budesonide).
    """
    headers = {"Authorization": f"Bearer {patient_token}"}

    # 1. Primary Patient (Alice)
    resp_alice = client.get("/api/v1/me/prescriptions", headers=headers)
    assert resp_alice.status_code == 200
    alice_rxs = resp_alice.json()["data"]
    for rx in alice_rxs:
        assert rx["patient_id"] == "p-101"

    # 2. Family Member: Bob Smith (p-102)
    resp_bob = client.get("/api/v1/me/prescriptions?patient_id=p-102", headers=headers)
    assert resp_bob.status_code == 200
    bob_rxs = resp_bob.json()["data"]
    assert len(bob_rxs) >= 1
    for rx in bob_rxs:
        assert rx["patient_id"] == "p-102"

    # 3. Family Member: Charlie Smith (p-103, Minor Child)
    resp_charlie = client.get("/api/v1/me/prescriptions?patient_id=p-103", headers=headers)
    assert resp_charlie.status_code == 200
    charlie_rxs = resp_charlie.json()["data"]
    assert len(charlie_rxs) >= 1
    for rx in charlie_rxs:
        assert rx["patient_id"] == "p-103"

def test_lab_reports_data_isolation(patient_token):
    """
    CRITICAL RULE: Lab reports belong strictly to the selected patient.
    Dorothy (p-104) has DEXA Bone Density Scan; Charlie has Pediatric IgE; Bob has Lipid Profile.
    """
    headers = {"Authorization": f"Bearer {patient_token}"}

    # Dorothy's Labs
    resp_dorothy = client.get("/api/v1/me/lab-reports?patient_id=p-104", headers=headers)
    assert resp_dorothy.status_code == 200
    dorothy_labs = resp_dorothy.json()["data"]
    assert len(dorothy_labs) >= 1
    for l in dorothy_labs:
        assert l["patient_id"] == "p-104"

    # Charlie's Labs
    resp_charlie = client.get("/api/v1/me/lab-reports?patient_id=p-103", headers=headers)
    assert resp_charlie.status_code == 200
    charlie_labs = resp_charlie.json()["data"]
    assert len(charlie_labs) >= 1
    for l in charlie_labs:
        assert l["patient_id"] == "p-103"

def test_timeline_data_isolation(patient_token):
    """Verifies that unified timeline returns only the selected person's chronological events."""
    headers = {"Authorization": f"Bearer {patient_token}"}
    resp = client.get("/api/v1/me/timeline?patient_id=p-102", headers=headers)
    assert resp.status_code == 200
    timeline = resp.json()["data"]
    for item in timeline:
        # None of the items should reference other patient IDs in details
        if "details" in item and "patient_id" in item["details"]:
            assert item["details"]["patient_id"] == "p-102"

# --------------------------------------------------------------------------
# 4. IDOR & ACCESS CONTROL PROTECTION
# --------------------------------------------------------------------------

def test_unauthorized_patient_access_forbidden(patient_token):
    """
    Attempting to access a non-linked patient's records (e.g. p-999 or unrelated patient)
    must strictly return 403 Forbidden.
    """
    headers = {"Authorization": f"Bearer {patient_token}"}
    resp = client.get("/api/v1/me/prescriptions?patient_id=p-999", headers=headers)
    assert resp.status_code == 403
    detail = resp.json()["detail"].lower()
    assert any(w in detail for w in ["relationship", "authorization", "forbidden", "consent", "not linked"])

# --------------------------------------------------------------------------
# 5. ADDING NEW FAMILY MEMBER & AUDIT TRAIL
# --------------------------------------------------------------------------

def test_add_new_family_member_and_unlink(patient_token):
    """Tests creating a new dependent with auto-generated unique OH-ID and unlinking."""
    headers = {"Authorization": f"Bearer {patient_token}"}

    # 1. Add new family member (Daughter)
    resp = client.post("/api/v1/me/family/add", json={
        "relationship": "DAUGHTER",
        "is_guardian": True,
        "is_minor": True,
        "new_member": {
            "name": "Daisy Smith",
            "age": 4,
            "dob": "2022-09-14",
            "gender": "Female",
            "blood_group": "B+ Positive",
            "diagnosis": "Routine Pediatric Checkup",
            "city": "Chennai"
        },
        "notes": "Younger daughter"
    }, headers=headers)

    assert resp.status_code == 200
    created = resp.json()["data"]
    assert created["member_name"] == "Daisy Smith"
    assert created["relationship"] == "DAUGHTER"
    assert created["is_minor"] is True
    assert created["is_guardian"] is True
    assert created["member_onehealth_id"].startswith("OHID-IND-2026-")

    relationship_id = created["relationship_id"]

    # 2. Verify she appears in family list
    resp_list = client.get("/api/v1/me/family", headers=headers)
    assert resp_list.status_code == 200
    names = [m["member_name"] for m in resp_list.json()["data"]]
    assert "Daisy Smith" in names

    # 3. Update permissions
    resp_perm = client.put(f"/api/v1/me/family/{relationship_id}/permissions", json={
        "permissions": {
            "view_appointments": True,
            "book_appointments": True,
            "view_records": True,
            "view_prescriptions": True,
            "view_lab_reports": True,
            "view_bills": True,
            "manage_profile": True,
            "receive_notifications": True
        }
    }, headers=headers)
    assert resp_perm.status_code == 200
    assert resp_perm.json()["data"]["permissions"]["manage_profile"] is True

    # 4. Check audit logs
    resp_audit = client.get("/api/v1/me/family/audit-logs", headers=headers)
    assert resp_audit.status_code == 200
    logs = resp_audit.json()["data"]
    assert isinstance(logs, list)

    # 5. Unlink Daisy
    resp_del = client.delete(f"/api/v1/me/family/{relationship_id}", headers=headers)
    assert resp_del.status_code == 200
    assert "successfully unlinked" in resp_del.json()["message"]
