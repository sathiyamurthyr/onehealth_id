import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    cur.execute("""
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'oh_id' 
        ORDER BY table_type, table_name;
    """)
    rows = cur.fetchall()
    print(f"Total objects in oh_id schema: {len(rows)}")
    for r in rows:
        print(f"[{r['table_type']}] {r['table_name']}")
