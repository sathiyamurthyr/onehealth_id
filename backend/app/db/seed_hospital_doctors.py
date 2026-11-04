import sys
from backend.app.database.session import get_db_cursor

def seed_doctors():
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO oh_id.doctors (
                id, hospital_id, name, specialty, qualification, registration_number, phone, email, is_available, consultation_fee
            ) VALUES 
            ('doc-child-gen-01', 'hosp-child-01', 'Dr. Senthil Nathan', 'General Medicine', 'MBBS, MD (General Medicine)', 'TN-MCI-2026-001', '+91 98402 11001', 'senthil.nathan@childrensclinic.org', TRUE, 500),
            ('doc-child-ped-02', 'hosp-child-01', 'Dr. Priya Sharma', 'Paediatrics', 'MBBS, MD (Paediatrics)', 'TN-MCI-2026-002', '+91 98402 11002', 'priya.sharma@childrensclinic.org', TRUE, 600)
            ON CONFLICT (id) DO UPDATE SET 
                hospital_id = EXCLUDED.hospital_id,
                name = EXCLUDED.name,
                specialty = EXCLUDED.specialty,
                is_available = TRUE;
        """)
        print("Successfully seeded doctors for hosp-child-01.")

if __name__ == "__main__":
    seed_doctors()
