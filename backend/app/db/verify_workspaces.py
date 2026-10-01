from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    cur.execute("SELECT user_ref_id, username, usertype_ref_id, role_code, workspace_type, default_route, hospital_ref_id, hospital_name, is_primary, jsonb_array_length(permissions) as perm_count FROM oh_id.vw_user_workspaces ORDER BY username, is_primary DESC;")
    rows = cur.fetchall()
    print("--- USER WORKSPACES VIEW ---")
    for r in rows:
        print(dict(r))

    print("\n--- USER HOSPITALS VIEW ---")
    cur.execute("SELECT * FROM oh_id.vw_user_hospitals;")
    for r in cur.fetchall():
        print(dict(r))
