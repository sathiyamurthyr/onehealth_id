import sys, uuid
sys.path.insert(0, 'd:/oh-id')
from backend.app.database.session import get_db_cursor
from backend.app.repositories.sp_views_repository import sp_repository

USER_ID = 'usr-356e6a6f'
SUPER_ADMIN_ROLE_ID = 'role-super-admin'

with get_db_cursor() as cur:
    # Check if SUPER_ADMIN already exists
    cur.execute("""
        SELECT id, is_active FROM oh_id.user_roles
        WHERE user_id = %s AND role_id = %s
        LIMIT 1;
    """, (USER_ID, SUPER_ADMIN_ROLE_ID))
    existing = cur.fetchone()

    if existing:
        existing = dict(existing)
        if not existing['is_active']:
            cur.execute("""
                UPDATE oh_id.user_roles
                SET is_active = TRUE
                WHERE id = %s;
            """, (existing['id'],))
            print("[UPDATED] Re-activated existing SUPER_ADMIN assignment.")
        else:
            print("[ALREADY EXISTS] SUPER_ADMIN already active for this user.")
    else:
        new_id = 'ur-' + str(uuid.uuid4())[:8]
        cur.execute("""
            INSERT INTO oh_id.user_roles
                (id, user_id, user_ref_id, role_id, usertype_ref_id,
                 hospital_id, hospital_ref_id, is_primary, is_active, created_at)
            VALUES
                (%s, %s, %s, %s, %s,
                 NULL, NULL, FALSE, TRUE, NOW());
        """, (new_id, USER_ID, USER_ID, SUPER_ADMIN_ROLE_ID, SUPER_ADMIN_ROLE_ID))
        print(f"[INSERTED] SUPER_ADMIN role assigned (id={new_id}). Rows affected:", cur.rowcount)

print()

# Verify final workspace list
workspaces = sp_repository.list_user_workspaces(USER_ID)
print(f"Final workspaces ({len(workspaces)}):")
for ws in workspaces:
    wtype = ws.get("workspace_type", "")
    rname = ws.get("role_name", "")
    rcode = ws.get("role_code", "")
    hname = ws.get("hospital_name", "") or "(platform-wide)"
    cat = (ws.get("category_title") or "").encode("ascii", "ignore").decode("ascii")
    print(f"  [{wtype}] {rname} ({rcode}) @ {hname} | category={cat}")
