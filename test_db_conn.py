import os
from backend.app.core.config import settings

try:
    db_url = settings.DATABASE_URL or os.getenv("DATABASE_URL")
    conn = psycopg2.connect(db_url, connect_timeout=5)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    rows = cur.fetchall()
    print("Supabase tables:", [r[0] for r in rows])
    conn.close()
except Exception as e:
    print("Supabase error:", e)
