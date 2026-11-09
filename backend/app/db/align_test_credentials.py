"""
ONEHEALTH ID (OH-ID) — Test Credentials Alignment Migration
Sathus Technology Pvt Ltd

Aligns all requested role credentials, passwords, and default workspace routes:
1. Super Admin: admin (or 9840000000) / admin123 -> /super-admin
2. Hospital Admin: hospadmin / hosp_admin (or 9840012345) / admin123 -> /hospital
3. Doctor: dr.senthil (or 9840111222) / doctor123 -> /doctor
4. Doctor: sathiyamurthyr12_7f1b (or 9176669426) / doctor123 -> /doctor
5. Nurse: nurse (or 9840155666) / nurse123 -> /nurse
6. Receptionist: receptionist (or 9840177888) / rec123 -> /reception (Updated from /employee)
7. Patient: 9884240519 / Password@123 -> /patient (Updated to Password@123)
8. Patient: patient (or 9840199999) / patient123 -> /patient (Citizen Health Pass)
"""

import sys
import logging
from backend.app.database.session import get_db_cursor
from backend.app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("align_credentials")

def align_credentials():
    with get_db_cursor() as cur:
        logger.info("1. Updating Receptionist role default_route to /reception in oh_id.roles...")
        cur.execute("""
            UPDATE oh_id.roles 
            SET default_route = '/reception',
                workspace_type = 'RECEPTIONIST'
            WHERE code = 'RECEPTIONIST';
        """)

        logger.info("2. Updating password for Alice Smith (9884240519) to Password@123...")
        new_hash_alice = get_password_hash("Password@123")
        cur.execute("""
            UPDATE oh_id.users
            SET password_hash = %s
            WHERE phone = '9884240519';
        """, (new_hash_alice,))

        logger.info("3. Ensuring citizen patient (patient / 9840199999) with password patient123 exists...")
        cur.execute("""
            SELECT id FROM oh_id.users WHERE username = 'patient' OR phone = '9840199999';
        """)
        existing_patient = cur.fetchone()

        patient_hash = get_password_hash("patient123")
        if not existing_patient:
            logger.info("Creating user 'patient' / 9840199999...")
            cur.execute("""
                INSERT INTO oh_id.users (
                    id, username, phone, email, full_name, role, usertype_ref_id,
                    hospital_id, hospital_ref_id, password_hash, is_active
                ) VALUES (
                    'usr-patient-citizen', 'patient', '9840199999', 'patient@onehealth.org',
                    'Alice Smith', 'PATIENT', 'role-patient',
                    'hosp-kedar', 'hosp-kedar', %s, true
                );
            """, (patient_hash,))
            cur.execute("""
                INSERT INTO oh_id.user_roles (
                    id, user_id, user_ref_id, role_id, usertype_ref_id, hospital_id, hospital_ref_id, is_primary, is_active
                ) VALUES (
                    'ur-patient-citizen', 'usr-patient-citizen', 'usr-patient-citizen', 'role-patient', 'role-patient', 'hosp-kedar', 'hosp-kedar', true, true
                );
            """)
        else:
            logger.info("Updating existing user %s to patient / 9840199999...", existing_patient['id'])
            cur.execute("""
                UPDATE oh_id.users
                SET password_hash = %s,
                    username = 'patient',
                    phone = '9840199999',
                    is_active = true
                WHERE id = %s;
            """, (patient_hash, existing_patient['id']))

        logger.info("Alignment complete. Committing changes.")

if __name__ == "__main__":
    align_credentials()
    print("Test credentials successfully aligned in PostgreSQL database.")
