from backend.app.database.session import get_readonly_cursor
import json

tables = ["family_relationships"]
views = ["vw_family_members"]

with get_readonly_cursor() as cur:
    for t in tables:
        cur.execute(f"""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema='oh_id' AND table_name='{t}'
            ORDER BY ordinal_position;
        """)
        cols = cur.fetchall()
        print(f"\n--- TABLE: {t} ---")
        for c in cols:
            print(f"  {c['column_name']} ({c['data_type']}) nullable={c['is_nullable']}")
        cur.execute(f"SELECT * FROM oh_id.{t} LIMIT 5;")
        rows = cur.fetchall()
        print(f"  Sample rows ({len(rows)}):")
        for r in rows:
            print("   ", dict(r))

    for v in views:
        cur.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema='oh_id' AND table_name='{v}'
            ORDER BY ordinal_position;
        """)
        cols = cur.fetchall()
        print(f"\n--- VIEW: {v} ---")
        for c in cols:
            print(f"  {c['column_name']} ({c['data_type']})")
        cur.execute(f"SELECT * FROM oh_id.{v} LIMIT 5;")
        rows = cur.fetchall()
        print(f"  Sample rows ({len(rows)}):")
        for r in rows:
            print("   ", dict(r))
