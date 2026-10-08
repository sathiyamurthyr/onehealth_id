import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_readonly_cursor

tables = ['organizations', 'tenants', 'hospitals', 'invoices', 'payments', 'roles', 'permissions']
with get_readonly_cursor() as cur:
    for tbl in tables:
        cur.execute(f"""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'oh_id' AND table_name = '{tbl}';
        """)
        cols = cur.fetchall()
        print(f"\n--- TABLE: {tbl} ({len(cols)} columns) ---")
        for c in cols:
            print(f"  {c['column_name']} ({c['data_type']})")
