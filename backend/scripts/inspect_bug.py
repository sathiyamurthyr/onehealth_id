import sys
sys.path.insert(0, r"d:\oh-id")
from backend.app.database.session import get_readonly_cursor
from backend.app.repositories.sp_views_repository import sp_repository

def main():
    with get_readonly_cursor() as cur:
        cur.execute("SELECT * FROM oh_id.vw_user_workspaces WHERE user_ref_id = 'usr-356e6a6f' AND usertype_ref_id = 'role-hospital-admin';")
        rows = cur.fetchall()
        print(f"Total rows for usr-356e6a6f with role-hospital-admin: {len(rows)}")
        for r in rows:
            print(f"  role_code: {r['role_code']} | workspace_type: {r['workspace_type']} | default_route: {r['default_route']}")

    print("\nAll standard roles and their navigation config:")
    with get_readonly_cursor() as cur:
        cur.execute("SELECT code, name, workspace_type, default_route, navigation_config FROM oh_id.roles WHERE code NOT LIKE 'OPD_COORD_%' ORDER BY code;")
        for r in cur.fetchall():
            nav = r['navigation_config'] or []
            print(f"\nROLE: {r['code']} ({r['name']}) -> {r['default_route']} ({len(nav)} items)")
            for item in nav:
                print(f"   [{item.get('section', 'General')}] {item.get('title')} -> {item.get('href')}")

if __name__ == "__main__":
    main()
