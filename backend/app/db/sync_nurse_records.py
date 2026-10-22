from backend.app.database.session import get_db_cursor

SQL = """
INSERT INTO oh_id.nurses (
    id, user_id, hospital_id, name, email, phone, qualification,
    registration_number, ward, shift, status
)
SELECT 
    'nur-' || substr(md5(random()::text), 1, 8),
    u.id,
    COALESCE(u.hospital_id, u.hospital_ref_id, r.hospital_id, 'hosp-kedar'),
    u.full_name,
    u.email,
    COALESCE(u.phone, u.mobile, '+91 98401 00000'),
    'B.Sc. Nursing, RN',
    'TNNMC-RN-' || (1000 + floor(random() * 9000))::int,
    COALESCE(r.room_number, 'Ward 3B - Step Down'),
    COALESCE(r.shift, 'MORNING'),
    'ACTIVE'
FROM oh_id.users u
LEFT JOIN oh_id.hospital_staff_rosters r ON u.id = r.staff_id
WHERE u.role = 'NURSE' 
  AND NOT EXISTS (SELECT 1 FROM oh_id.nurses n WHERE n.user_id = u.id)
ON CONFLICT DO NOTHING;
"""

with get_db_cursor() as cur:
    cur.execute(SQL)
    print("Nurses synchronized successfully.")
