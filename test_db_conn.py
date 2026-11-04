import os
import psycopg2
from backend.app.core.config import settings

try:
    db_url = settings.DATABASE_URL or os.getenv("DATABASE_URL")
    conn = psycopg2.connect(db_url, connect_timeout=5)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'oh_id'")
    rows = cur.fetchall()
    print("OneHealth ID (oh_id) tables count:", len(rows))
    print("Tables sample:", [r[0] for r in rows[:10]])
    conn.close()
except Exception as e:
    print("Database connection error:", e)
