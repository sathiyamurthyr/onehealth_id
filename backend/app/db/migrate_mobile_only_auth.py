"""
ONE HEALTH ID (OH-ID) — Mobile-Only Universal Auth Schema Migration
Populates authoritative mobile numbers for core personas and updates oh_id.vw_user_auth.
"""

import sys
from pathlib import Path

_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.migration.mobile_auth")

CORE_PERSONAS_MOBILE_MAP = [
    {"user_id": "usr-admin", "username": "admin", "phone": "9840000000", "full_name": "Sathus Platform Super Admin"},
    {"user_id": "usr-hosp-admin", "username": "hospadmin", "phone": "9840012345", "full_name": "Kedar Hospital Administrator"},
    {"user_id": "usr-doctor-senthil", "username": "dr.senthil", "phone": "9840111222", "full_name": "Dr. Senthil Nathan"},
    {"user_id": "usr-doctor-anitha", "username": "dr.anitha", "phone": "9840133444", "full_name": "Dr. Anitha Raman"},
    {"user_id": "usr-nurse", "username": "nurse", "phone": "9840155666", "full_name": "Staff Nurse Priya"},
    {"user_id": "usr-receptionist", "username": "receptionist", "phone": "9840177888", "full_name": "Sarah Jenkins"},
    {"user_id": "usr-patient", "username": "patient", "phone": "9840199999", "full_name": "Ramesh Patel"},
    {"user_id": "usr-cashier", "username": "cashier", "phone": "9840188888", "full_name": "Kavitha Sundaram"},
    {"user_id": "usr-pharmacist", "username": "pharmacist", "phone": "9840166666", "full_name": "Gopal Pharmacist"},
    {"user_id": "usr-labtech", "username": "labtech", "phone": "9840144444", "full_name": "Muthu Lab Technician"},
]

def run_migration():
    logger.info("Starting Mobile-Only Auth Migration...")
    with get_db_cursor() as cur:
        # 1. First, normalize all phone numbers in oh_id.users by stripping non-digit chars
        cur.execute("""
            UPDATE oh_id.users
            SET phone = RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10)
            WHERE phone IS NOT NULL AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 10;
        """)

        # 2. Update phone numbers for seed users and disambiguate any test accounts
        for p in CORE_PERSONAS_MOBILE_MAP:
            cur.execute("""
                UPDATE oh_id.users 
                SET phone = CONCAT('98499', LPAD((FLOOR(RANDOM() * 90000 + 10000))::text, 5, '0'))
                WHERE phone = %s
                  AND id != %s AND username != %s;
            """, (p["phone"], p["user_id"], p["username"]))

            cur.execute("""
                UPDATE oh_id.users 
                SET phone = %s
                WHERE id = %s OR username = %s;
            """, (p["phone"], p["user_id"], p["username"]))
            logger.info(f"Updated user '{p['username']}' with mobile '{p['phone']}'.")

        # 2. Add index on users.phone if not exists
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_phone ON oh_id.users(phone);
        """)
        logger.info("Ensured index idx_users_phone exists.")

        # 3. Recreate vw_user_auth to return phone and enforce clean column mappings
        cur.execute("DROP VIEW IF EXISTS oh_id.vw_user_auth CASCADE;")
        cur.execute("""
            CREATE VIEW oh_id.vw_user_auth AS
            SELECT 
                u.id,
                u.user_ref_id,
                u.username,
                u.phone,
                u.email,
                u.full_name,
                u.role,
                u.usertype_ref_id,
                r.workspace_type,
                r.default_route,
                u.password_hash,
                u.is_active,
                u.hospital_id,
                u.hospital_ref_id,
                h.name AS hospital_name,
                u.tenant_id,
                t.name AS tenant_name,
                COALESCE((
                    SELECT jsonb_agg(DISTINCT p.code)
                    FROM oh_id.user_roles ur
                    JOIN oh_id.role_permissions rp ON (ur.role_id = rp.role_id OR ur.usertype_ref_id = rp.usertype_ref_id)
                    JOIN oh_id.permissions p ON rp.permission_id = p.id
                    WHERE ur.user_id = u.id OR ur.user_ref_id = u.id
                ), '[]'::jsonb) AS permissions,
                COALESCE((
                    SELECT jsonb_agg(DISTINCT r_sub.code)
                    FROM oh_id.user_roles ur
                    JOIN oh_id.roles r_sub ON (ur.role_id = r_sub.id OR ur.usertype_ref_id = r_sub.id)
                    WHERE ur.user_id = u.id OR ur.user_ref_id = u.id
                ), '[]'::jsonb) AS roles
            FROM oh_id.users u
            LEFT JOIN oh_id.roles r ON u.usertype_ref_id = r.id OR u.role = r.code
            LEFT JOIN oh_id.hospitals h ON (u.hospital_ref_id = h.id OR u.hospital_id = h.id)
            LEFT JOIN oh_id.tenants t ON u.tenant_id = t.id;
        """)
        logger.info("Updated view oh_id.vw_user_auth with phone column.")

    logger.info("Mobile-Only Auth Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
