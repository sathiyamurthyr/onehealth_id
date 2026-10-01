import os
import psycopg2
from backend.app.core.config import settings

db_url = settings.DATABASE_URL or os.getenv("DATABASE_URL")
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Test calling Stored Procedure
cur.execute("""
CALL oh_id.sp_register_patient(
    NULL, 'Test Patient 99', 29, 'Male', '+91 99999 88888', 'test99@example.com',
    'Test Road, Chennai', 'Emergency Person', 'B+ Positive', 'Seasonal Fever',
    'hosp-001', 'usr-admin', NULL, NULL, NULL
);
""")
sp_res = cur.fetchone()
print("Stored Procedure Call Success! Returned OUT parameters:", sp_res)
conn.commit()

# Test querying View
cur.execute("SELECT id, onehealth_id, name, qr_token FROM oh_id.vw_patients WHERE name = %s;", ('Test Patient 99',))
view_res = cur.fetchone()
print("View Query Success! Retrieved from vw_patients:", view_res)

cur.close()
conn.close()
