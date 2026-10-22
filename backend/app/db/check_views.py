from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    cur.execute("SELECT table_name FROM information_schema.views WHERE table_schema = 'oh_id';")
    views = [r['table_name'] for r in cur.fetchall()]
    print("Views in oh_id schema:", sorted(views))
