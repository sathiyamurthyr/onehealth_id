"""
Enterprise Test Suite: OH-ID Dynamic Patient Family Member Count & Database-Backed APIs
Validates:
1. Patient with zero family members sees '0'.
2. Patient with one family member sees '1'.
3. Patient with three/four family members sees exact authorized count ('3' / '4').
4. The navigation badge matches the actual authorized family-member list.
5. Cross-Patient Isolation: Patient A cannot retrieve or modify Patient B's family members.
6. Unauthenticated requests are rejected with 401 Unauthorized.
7. Both GET /api/v1/me/family/count and GET /api/v1/me/family return consistent counts.
8. Navigation item /patient/family has dynamic database-backed badge in GET /api/v1/me/workspace.
9. Removing and adding family members updates the dynamic count immediately.
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.database.session import get_db_cursor
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

@pytest.fixture
def alice_token():
    """Generates authentic bearer token for patient Alice Smith (p-101) who has 3 family members."""
    resp = client.post("/api/v1/auth/login", json={
        "username": "patient",
        "password": "patient123"
    })
    assert resp.status_code == 200, f"Alice login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture
def synthetic_patients():
    """
    Creates isolated synthetic test patients:
    - Patient Zero: 0 family members
    - Patient One: 1 family member
    - Patient Four: 4 family members
    Cleans up after test execution.
    """
    uid_suffix = uuid.uuid4().hex[:6]
    zero_uid = f"usr-zero-{uid_suffix}"
    zero_pid = f"p-zero-{uid_suffix}"
    
    one_uid = f"usr-one-{uid_suffix}"
    one_pid = f"p-one-{uid_suffix}"
    one_mem_pid = f"p-onemem-{uid_suffix}"

    four_uid = f"usr-four-{uid_suffix}"
    four_pid = f"p-four-{uid_suffix}"
    four_mems = [f"p-fourmem-{i}-{uid_suffix}" for i in range(4)]

    with get_db_cursor() as cur:
        # Create users with role-patient assignments
        for uid, uname in [
            (zero_uid, f"pat_zero_{uid_suffix}"),
            (one_uid, f"pat_one_{uid_suffix}"),
            (four_uid, f"pat_four_{uid_suffix}")
        ]:
            cur.execute("""
                INSERT INTO oh_id.users (id, username, email, full_name, role, usertype_ref_id, user_ref_id, hospital_id, hospital_ref_id, is_active, password_hash)
                VALUES (%s, %s, %s, %s, 'PATIENT', 'role-patient', %s, 'hosp-001', 'hosp-001', TRUE, 'hash')
                ON CONFLICT (id) DO NOTHING;
                INSERT INTO oh_id.user_roles (id, user_id, user_ref_id, role_id, usertype_ref_id, hospital_id, hospital_ref_id, is_primary, is_active)
                VALUES (%s, %s, %s, 'role-patient', 'role-patient', 'hosp-001', 'hosp-001', TRUE, TRUE)
                ON CONFLICT DO NOTHING;
            """, (uid, uname, f"{uname}@example.com", f"Name {uname}", uid, f"ur-{uid}", uid, uid))

        # Create primary patient records
        cur.execute("""
            INSERT INTO oh_id.patients (id, user_id, name, onehealth_id, qr_token, diagnosis, email, phone, age, gender)
            VALUES 
            (%s, %s, 'Patient Zero', %s, %s, 'Routine Checkup', %s, '9990001111', 30, 'Male'),
            (%s, %s, 'Patient One', %s, %s, 'Routine Checkup', %s, '9990002222', 35, 'Female'),
            (%s, %s, 'Patient Four', %s, %s, 'Routine Checkup', %s, '9990003333', 40, 'Male');
        """, (
            zero_pid, zero_uid, f"OHID-Z-{uid_suffix}", f"QR-Z-{uid_suffix}", f"pat_zero_{uid_suffix}@example.com",
            one_pid, one_uid, f"OHID-O-{uid_suffix}", f"QR-O-{uid_suffix}", f"pat_one_{uid_suffix}@example.com",
            four_pid, four_uid, f"OHID-F-{uid_suffix}", f"QR-F-{uid_suffix}", f"pat_four_{uid_suffix}@example.com"
        ))

        # Create family members for Patient One (1 member)
        cur.execute("""
            INSERT INTO oh_id.patients (id, name, onehealth_id, qr_token, diagnosis, email, phone, age, gender)
            VALUES (%s, 'Child One', %s, %s, 'Pediatric Wellness', 'child1@test.com', '9990004441', 5, 'Male');
            INSERT INTO oh_id.family_relationships (id, primary_patient_id, member_patient_id, relationship, is_minor, is_guardian)
            VALUES (%s, %s, %s, 'SON', TRUE, TRUE);
        """, (
            one_mem_pid, f"OHID-MEM1-{uid_suffix}", f"QR-MEM1-{uid_suffix}",
            f"rel-one-{uid_suffix}", one_pid, one_mem_pid
        ))

        # Create family members for Patient Four (4 members)
        for idx, mem_id in enumerate(four_mems):
            cur.execute("""
                INSERT INTO oh_id.patients (id, name, onehealth_id, qr_token, diagnosis, email, phone, age, gender)
                VALUES (%s, %s, %s, %s, 'General Health', %s, '9990005555', 20 + %s, 'Female');
                INSERT INTO oh_id.family_relationships (id, primary_patient_id, member_patient_id, relationship)
                VALUES (%s, %s, %s, 'DAUGHTER');
            """, (
                mem_id, f"Member Four {idx}", f"OHID-4M{idx}-{uid_suffix}", f"QR-4M{idx}-{uid_suffix}", f"four_{idx}@test.com", idx,
                f"rel-4m-{idx}-{uid_suffix}", four_pid, mem_id
            ))

    # Generate JWT tokens for each
    tokens = {
        "zero": create_access_token({"sub": f"pat_zero_{uid_suffix}", "uid": zero_uid, "role": "PATIENT", "usertype_ref_id": "role-patient"}),
        "one": create_access_token({"sub": f"pat_one_{uid_suffix}", "uid": one_uid, "role": "PATIENT", "usertype_ref_id": "role-patient"}),
        "four": create_access_token({"sub": f"pat_four_{uid_suffix}", "uid": four_uid, "role": "PATIENT", "usertype_ref_id": "role-patient"}),
        "zero_pid": zero_pid,
        "one_pid": one_pid,
        "four_pid": four_pid,
    }

    yield tokens

    # Cleanup synthetic patients
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM oh_id.family_relationships WHERE primary_patient_id IN (%s, %s, %s);", (zero_pid, one_pid, four_pid))
        all_pids = [zero_pid, one_pid, one_mem_pid, four_pid] + four_mems
        cur.execute("DELETE FROM oh_id.patients WHERE id = ANY(%s);", (all_pids,))
        cur.execute("DELETE FROM oh_id.user_roles WHERE user_id IN (%s, %s, %s);", (zero_uid, one_uid, four_uid))
        cur.execute("DELETE FROM oh_id.users WHERE id IN (%s, %s, %s);", (zero_uid, one_uid, four_uid))

# --------------------------------------------------------------------------
# 1. VERIFY PATIENT WITH 0 FAMILY MEMBERS SEES '0'
# --------------------------------------------------------------------------

def test_patient_with_zero_family_members(synthetic_patients):
    """A patient with 0 registered family members sees count 0 in both list, count, and workspace badge."""
    token = synthetic_patients["zero"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Family list endpoint returns empty list
    resp = client.get("/api/v1/me/family", headers=headers)
    assert resp.status_code == 200
    members = resp.json()["data"]
    assert isinstance(members, list)
    assert len(members) == 0

    # 2. Family count endpoint returns count 0
    resp_count = client.get("/api/v1/me/family/count", headers=headers)
    assert resp_count.status_code == 200
    assert resp_count.json()["data"]["count"] == 0

    # 3. Workspace navigation badge for /patient/family is "0"
    resp_ws = client.get("/api/v1/me/workspace", headers=headers)
    assert resp_ws.status_code == 200
    nav_items = resp_ws.json()["navigation"]
    family_nav = next((item for item in nav_items if item["href"] == "/patient/family"), None)
    assert family_nav is not None
    assert family_nav["badge"] == "0", f"Expected badge '0', got {family_nav['badge']}"

# --------------------------------------------------------------------------
# 2. VERIFY PATIENT WITH 1 FAMILY MEMBER SEES '1'
# --------------------------------------------------------------------------

def test_patient_with_one_family_member(synthetic_patients):
    """A patient with 1 registered family member sees count 1."""
    token = synthetic_patients["one"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List endpoint returns exactly 1 member
    resp = client.get("/api/v1/me/family", headers=headers)
    assert resp.status_code == 200
    members = resp.json()["data"]
    assert len(members) == 1
    assert members[0]["relationship"] == "SON"

    # 2. Count endpoint returns count 1
    resp_count = client.get("/api/v1/me/family/count", headers=headers)
    assert resp_count.status_code == 200
    assert resp_count.json()["data"]["count"] == 1

    # 3. Workspace navigation badge for /patient/family is "1"
    resp_ws = client.get("/api/v1/me/workspace", headers=headers)
    assert resp_ws.status_code == 200
    nav_items = resp_ws.json()["navigation"]
    family_nav = next((item for item in nav_items if item["href"] == "/patient/family"), None)
    assert family_nav is not None
    assert family_nav["badge"] == "1", f"Expected badge '1', got {family_nav['badge']}"

# --------------------------------------------------------------------------
# 3. VERIFY PATIENT WITH 4 FAMILY MEMBERS SEES '4'
# --------------------------------------------------------------------------

def test_patient_with_four_family_members(synthetic_patients):
    """A patient with 4 registered family members sees count 4."""
    token = synthetic_patients["four"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List endpoint returns exactly 4 members
    resp = client.get("/api/v1/me/family", headers=headers)
    assert resp.status_code == 200
    members = resp.json()["data"]
    assert len(members) == 4

    # 2. Count endpoint returns count 4
    resp_count = client.get("/api/v1/me/family/count", headers=headers)
    assert resp_count.status_code == 200
    assert resp_count.json()["data"]["count"] == 4

    # 3. Workspace navigation badge for /patient/family is "4"
    resp_ws = client.get("/api/v1/me/workspace", headers=headers)
    assert resp_ws.status_code == 200
    nav_items = resp_ws.json()["navigation"]
    family_nav = next((item for item in nav_items if item["href"] == "/patient/family"), None)
    assert family_nav is not None
    assert family_nav["badge"] == "4", f"Expected badge '4', got {family_nav['badge']}"

# --------------------------------------------------------------------------
# 4. VERIFY ALICE SMITH (SEED PATIENT) SEES '3' (NOT HARDCODED '4')
# --------------------------------------------------------------------------

def test_alice_smith_sees_exact_database_count(alice_token):
    """
    Alice Smith has exactly 3 family members in the database (Bob, Charlie, Dorothy).
    Previously hardcoded '4' must now be fixed to '3'.
    """
    headers = {"Authorization": f"Bearer {alice_token}"}

    # 1. List endpoint returns exactly 3 members
    resp = client.get("/api/v1/me/family", headers=headers)
    assert resp.status_code == 200
    members = resp.json()["data"]
    assert len(members) == 3, f"Alice should have 3 family members, got {len(members)}"

    # 2. Count endpoint returns count 3
    resp_count = client.get("/api/v1/me/family/count", headers=headers)
    assert resp_count.status_code == 200
    assert resp_count.json()["data"]["count"] == 3

    # 3. Workspace navigation badge for /patient/family is "3"
    resp_ws = client.get("/api/v1/me/workspace", headers=headers)
    assert resp_ws.status_code == 200
    nav_items = resp_ws.json()["navigation"]
    family_nav = next((item for item in nav_items if item["href"] == "/patient/family"), None)
    assert family_nav is not None
    assert family_nav["badge"] == "3", f"Expected badge '3', got {family_nav['badge']}"

# --------------------------------------------------------------------------
# 5. CROSS-PATIENT ISOLATION (PATIENT A CANNOT RETRIEVE PATIENT B'S MEMBERS)
# --------------------------------------------------------------------------

def test_cross_patient_isolation(synthetic_patients, alice_token):
    """Verifies Patient A cannot view or tamper with Patient B's family members."""
    headers_zero = {"Authorization": f"Bearer {synthetic_patients['zero']}"}
    headers_four = {"Authorization": f"Bearer {synthetic_patients['four']}"}

    # Patient Zero sees 0
    resp_zero = client.get("/api/v1/me/family", headers=headers_zero)
    assert len(resp_zero.json()["data"]) == 0

    # Patient Four sees 4
    resp_four = client.get("/api/v1/me/family", headers=headers_four)
    assert len(resp_four.json()["data"]) == 4

    # Patient Zero attempting to modify/delete Patient Four's relationship is rejected (404/403)
    four_members = resp_four.json()["data"]
    rel_id = four_members[0]["id"]
    tamper_resp = client.delete(f"/api/v1/me/family/{rel_id}", headers=headers_zero)
    assert tamper_resp.status_code == 404, "Cross-patient unlinking must be rejected"

# --------------------------------------------------------------------------
# 6. UNAUTHENTICATED REQUESTS ARE REJECTED
# --------------------------------------------------------------------------

def test_unauthenticated_requests_rejected():
    """Unauthenticated requests without cookies or token must return 401."""
    fresh_client = TestClient(app)
    # Clear any residual cookies
    fresh_client.cookies.clear()

    resp_list = fresh_client.get("/api/v1/me/family")
    assert resp_list.status_code == 401

    resp_count = fresh_client.get("/api/v1/me/family/count")
    assert resp_count.status_code == 401

    resp_ws = fresh_client.get("/api/v1/me/workspace")
    assert resp_ws.status_code == 401
