import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres", connect_timeout=5)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    rows = cur.fetchall()
    print("Supabase tables:", [r[0] for r in rows])
    conn.close()
except Exception as e:
    print("Supabase error:", e)
