from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    cur.execute("SELECT viewname, definition FROM pg_views WHERE schemaname = 'oh_id' AND viewname IN ('vw_user_auth', 'vw_user_profiles');")
    for r in cur.fetchall():
        print(f"=== {r['viewname']} ===")
        print(r['definition'])
