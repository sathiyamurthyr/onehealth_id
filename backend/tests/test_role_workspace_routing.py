import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def get_auth_token():
    # Login with multi-role user (9176669426 has HOSPITAL_ADMIN, DOCTOR, SUPER_ADMIN)
    res = client.post("/api/v1/auth/login", json={
        "username": "9176669426",
        "password": "Password@123"
    })
    if res.status_code != 200:
        # Fallback to Asdfg!23
        res = client.post("/api/v1/auth/login", json={
            "username": "9176669426",
            "password": "Asdfg!23"
        })
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def test_scenario_a_hospital_admin_selection_and_navigation():
    """
    Scenario A: Selecting Hospital Admin must load the Hospital Admin workspace,
    route to /hospital, display Hospital Admin navigation, and strictly exclude Doctor menus.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch available workspaces
    ws_res = client.get("/api/v1/workspace/me", headers=headers)
    assert ws_res.status_code == 200
    available_ws = ws_res.json().get("available_workspaces", [])
    
    admin_ws = next((w for w in available_ws if w.get("role_code") == "HOSPITAL_ADMIN"), None)
    assert admin_ws is not None, "User must have HOSPITAL_ADMIN workspace assigned"

    # Switch to Hospital Admin
    switch_res = client.post("/api/v1/workspace/switch-context", json={
        "hospital_ref_id": admin_ws.get("hospital_ref_id"),
        "usertype_ref_id": admin_ws.get("usertype_ref_id"),
        "role_code": "HOSPITAL_ADMIN"
    }, headers=headers)
    assert switch_res.status_code == 200, f"Switch failed: {switch_res.text}"
    switched = switch_res.json()
    admin_token = switched["access_token"]
    ws_def = switched["workspace"]["workspace"]

    # 1. Verify workspace attributes
    assert ws_def["role_code"] == "HOSPITAL_ADMIN"
    assert ws_def["workspace_type"] == "HOSPITAL_ADMIN"
    assert ws_def["default_route"] == "/hospital"

    # 2. Verify authoritative /api/v1/me/workspace call with admin token
    me_headers = {"Authorization": f"Bearer {admin_token}"}
    verified_res = client.get("/api/v1/me/workspace", headers=me_headers)
    assert verified_res.status_code == 200
    v_data = verified_res.json()
    v_ws = v_data["workspace"]
    assert v_ws["role_code"] == "HOSPITAL_ADMIN"
    assert v_ws["workspace_type"] == "HOSPITAL_ADMIN"
    assert v_ws["default_route"] == "/hospital"

    # 3. Verify navigation items: Hospital Admin menus present, Doctor menus absent
    nav_titles = [item["title"] for item in v_data.get("navigation", [])]
    assert "Dashboard" in nav_titles
    assert "All Users" in nav_titles
    assert "Roles & Permissions" in nav_titles
    assert "Appointments" in nav_titles

    # Clinical doctor menus MUST NOT be in Hospital Admin navigation
    assert "Clinical Dashboard" not in nav_titles
    assert "Patient Queue" not in nav_titles
    assert "Prescriptions" not in nav_titles
    assert "Consultations" not in nav_titles


def test_scenario_b_doctor_selection_and_navigation():
    """
    Scenario B: Selecting Doctor must load the Doctor workspace,
    route to /doctor, display Doctor clinical navigation, and exclude Hospital Admin menus.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    ws_res = client.get("/api/v1/workspace/me", headers=headers)
    assert ws_res.status_code == 200
    available_ws = ws_res.json().get("available_workspaces", [])
    
    doc_ws = next((w for w in available_ws if w.get("role_code") == "DOCTOR"), None)
    assert doc_ws is not None, "User must have DOCTOR workspace assigned"

    # Switch to Doctor
    switch_res = client.post("/api/v1/workspace/switch-context", json={
        "hospital_ref_id": doc_ws.get("hospital_ref_id"),
        "usertype_ref_id": doc_ws.get("usertype_ref_id"),
        "role_code": "DOCTOR"
    }, headers=headers)
    assert switch_res.status_code == 200
    switched = switch_res.json()
    doc_token = switched["access_token"]
    ws_def = switched["workspace"]["workspace"]

    assert ws_def["role_code"] == "DOCTOR"
    assert ws_def["workspace_type"] == "DOCTOR"
    assert ws_def["default_route"] == "/doctor"

    # Verify authoritative /api/v1/me/workspace
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    verified_res = client.get("/api/v1/me/workspace", headers=doc_headers)
    assert verified_res.status_code == 200
    v_data = verified_res.json()
    assert v_data["workspace"]["role_code"] == "DOCTOR"
    assert v_data["workspace"]["workspace_type"] == "DOCTOR"
    assert v_data["workspace"]["default_route"] == "/doctor"

    nav_titles = [item["title"] for item in v_data.get("navigation", [])]
    assert "Clinical Dashboard" in nav_titles
    assert "Patient Queue" in nav_titles
    assert "Consultations" in nav_titles

    # Hospital Admin menus MUST NOT be in Doctor navigation
    assert "Executive Reports" not in nav_titles
    assert "Roles & Permissions" not in nav_titles
    assert "OPD Counters & Shifts" not in nav_titles


def test_scenario_c_multi_role_account_switching():
    """
    Scenario C: User switches between Hospital Admin, Doctor, and Super Admin.
    Context switching must be atomic, returning fresh scoped tokens with zero stale menu leakage.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Switch to Hospital Admin
    res1 = client.post("/api/v1/workspace/switch-context", json={
        "role_code": "HOSPITAL_ADMIN"
    }, headers=headers)
    assert res1.status_code == 200
    token1 = res1.json()["access_token"]
    data1 = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token1}"}).json()
    assert data1["workspace"]["role_code"] == "HOSPITAL_ADMIN"
    assert "All Users" in [i["title"] for i in data1["navigation"]]
    assert "Clinical Dashboard" not in [i["title"] for i in data1["navigation"]]

    # 2. Switch to Doctor
    res2 = client.post("/api/v1/workspace/switch-context", json={
        "role_code": "DOCTOR"
    }, headers={"Authorization": f"Bearer {token1}"})
    assert res2.status_code == 200
    token2 = res2.json()["access_token"]
    data2 = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token2}"}).json()
    assert data2["workspace"]["role_code"] == "DOCTOR"
    assert "Clinical Dashboard" in [i["title"] for i in data2["navigation"]]
    assert "Roles & Permissions" not in [i["title"] for i in data2["navigation"]]

    # 3. Switch to Super Admin
    res3 = client.post("/api/v1/workspace/switch-context", json={
        "role_code": "SUPER_ADMIN"
    }, headers={"Authorization": f"Bearer {token2}"})
    assert res3.status_code == 200
    token3 = res3.json()["access_token"]
    data3 = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token3}"}).json()
    assert data3["workspace"]["role_code"] == "SUPER_ADMIN"
    assert data3["workspace"]["default_route"] == "/super-admin"
    assert "Hospitals & Clinics" in [i["title"] for i in data3["navigation"]]
    assert "Clinical Dashboard" not in [i["title"] for i in data3["navigation"]]

    # 4. Switch back to Hospital Admin
    res4 = client.post("/api/v1/workspace/switch-context", json={
        "role_code": "HOSPITAL_ADMIN"
    }, headers={"Authorization": f"Bearer {token3}"})
    assert res4.status_code == 200
    token4 = res4.json()["access_token"]
    data4 = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token4}"}).json()
    assert data4["workspace"]["role_code"] == "HOSPITAL_ADMIN"
    assert "Clinical Dashboard" not in [i["title"] for i in data4["navigation"]]


def test_scenario_d_tamper_and_zero_trust_security():
    """
    Scenario D: Attempts to select unassigned roles or unauthorized hospitals
    must be strictly rejected by the backend with HTTP 403 Forbidden.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Attempt to switch to an unassigned role (NURSE)
    tamper_role = client.post("/api/v1/workspace/switch-context", json={
        "role_code": "NURSE",
        "usertype_ref_id": "role-nurse"
    }, headers=headers)
    assert tamper_role.status_code == 403, f"Expected 403, got {tamper_role.status_code}: {tamper_role.text}"

    # 2. Attempt to switch to an unauthorized hospital
    tamper_hosp = client.post("/api/v1/workspace/switch-context", json={
        "hospital_ref_id": "hosp-unauthorized-random-id",
        "role_code": "HOSPITAL_ADMIN"
    }, headers=headers)
    assert tamper_hosp.status_code == 403, f"Expected 403, got {tamper_hosp.status_code}: {tamper_hosp.text}"


def test_scenario_e_supported_roles_navigation_resolution():
    """
    Scenario E: Ensure all primary roles have distinct, populated navigation configurations.
    """
    from backend.app.repositories.sp_views_repository import sp_repository
    roles = sp_repository.list_roles()
    role_map = {r["code"]: r for r in roles}

    expected_roles = [
        "HOSPITAL_ADMIN", "DOCTOR", "SUPER_ADMIN", "NURSE",
        "RECEPTIONIST", "LAB_STAFF", "PHARMACY_STAFF", "RADIOLOGY_STAFF"
    ]
    for code in expected_roles:
        assert code in role_map, f"Role {code} must exist in system"
        nav = role_map[code].get("navigation_config") or []
        assert len(nav) > 0, f"Role {code} must have navigation items configured"
