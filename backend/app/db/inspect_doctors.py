from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    cur.execute("SELECT definition FROM pg_views WHERE schemaname = 'oh_id' AND viewname = 'vw_doctors';")
    print(cur.fetchone()['definition'])
