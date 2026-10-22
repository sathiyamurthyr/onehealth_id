import sys, os
sys.path.insert(0, os.path.abspath("."))
from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    cur.execute('''
        SELECT d.id, d.name, d.specialty, d.hospital_id, h.name as hospital_name, d.is_available
        FROM oh_id.doctors d
        LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id
        ORDER BY d.hospital_id, d.name;
    ''')
    rows = cur.fetchall()
    print('TOTAL DOCTORS:', len(rows))
    by_hosp = {}
    for r in rows:
        key = f"{r['hospital_id']} ({r['hospital_name']})"
        by_hosp.setdefault(key, []).append((r['id'], r['name'], r['specialty']))
    cur.execute("SELECT COUNT(*) FROM oh_id.doctors WHERE id LIKE 'test-doc-%' OR name LIKE '%Aris Thorne%';")
    print('TEST DOCTORS COUNT:', cur.fetchone()['count'])
