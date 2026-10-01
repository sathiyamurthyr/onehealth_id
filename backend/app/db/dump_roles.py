from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    print("--- ROLES ---")
    cur.execute("SELECT * FROM oh_id.roles;")
    for r in cur.fetchall():
        print(dict(r))

    print("\n--- USERS ---")
    cur.execute("SELECT id, username, email, full_name, role, hospital_id FROM oh_id.users;")
    for r in cur.fetchall():
        print(dict(r))

    print("\n--- PERMISSIONS COUNT ---")
    cur.execute("SELECT COUNT(*) AS total FROM oh_id.permissions;")
    print("Total permissions:", cur.fetchone()['total'])

    print("\n--- ROLE PERMISSIONS COUNT ---")
    cur.execute("SELECT r.code, COUNT(rp.permission_id) as count FROM oh_id.roles r LEFT JOIN oh_id.role_permissions rp ON r.id = rp.role_id GROUP BY r.code;")
    for r in cur.fetchall():
        print(dict(r))
