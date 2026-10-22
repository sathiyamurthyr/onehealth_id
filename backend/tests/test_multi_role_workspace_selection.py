import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

def test_login_and_workspace_selection_security():
    # 1. Login with a practitioner account
    login_payload = {
        "username": "9176669426",
        "password": "Password@123"
    }
    res = client.post("/api/v1/auth/login", json=login_payload)
    if res.status_code != 200:
        res = client.post("/api/v1/auth/login", json={
            "username": "9176669426",
            "password": "Asdfg!23"
        })
    assert res.status_code == 200, f"Login failed: {res.text}"
    data = res.json()
    token = data["access_token"]
    user = data["user"]
    assert token is not None
    assert user["username"] is not None

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Query Authoritative Workspace Context
    ws_res = client.get("/api/v1/workspace/me", headers=headers)
    assert ws_res.status_code == 200, f"Workspace resolution failed: {ws_res.text}"
    ws_data = ws_res.json()
    
    available_workspaces = ws_data.get("available_workspaces", [])
    for ws in available_workspaces:
        # safe ascii logging
        cat = str(ws.get('category_title', '')).encode('ascii', 'ignore').decode('ascii')
        print(f"  - [{cat}] {ws.get('role_name')} ({ws.get('role_code')}) @ {ws.get('hospital_name')}")

    assert len(available_workspaces) >= 1
    # Verify category_title is populated on workspaces
    for ws in available_workspaces:
        assert ws.get("category_title") is not None, "category_title must be populated"

    # 3. Test Controlled Context Switching to a valid workspace
    if len(available_workspaces) > 1:
        target_ws = available_workspaces[1]
        switch_req = {
            "hospital_ref_id": target_ws.get("hospital_ref_id"),
            "usertype_ref_id": target_ws.get("usertype_ref_id"),
            "role_code": target_ws.get("role_code"),
            "department_id": target_ws.get("department_id")
        }
        switch_res = client.post("/api/v1/workspace/switch-context", json=switch_req, headers=headers)
        assert switch_res.status_code == 200, f"Context switch failed: {switch_res.text}"
        switched_data = switch_res.json()
        assert "access_token" in switched_data
        assert switched_data["workspace"]["workspace"]["role_code"] == target_ws.get("role_code")
        print(f"[Test Evidence] Successfully switched context to: {target_ws.get('role_name')} with fresh scoped token.")

    # 4. Security Invariant: Tamper Resistance (Requesting SUPER_ADMIN without authorization)
    tamper_req = {
        "hospital_ref_id": "hosp-unauthorized-target",
        "role_code": "SUPER_ADMIN",
        "usertype_ref_id": "SUPER_ADMIN"
    }
    tamper_res = client.post("/api/v1/workspace/switch-context", json=tamper_req, headers=headers)
    assert tamper_res.status_code == 403, f"Tamper attempt should be rejected with 403, got {tamper_res.status_code}: {tamper_res.text}"
    print(f"[Test Evidence] Tamper attempt strictly rejected with 403: {tamper_res.json()['detail']}")

if __name__ == "__main__":
    test_login_and_workspace_selection_security()
