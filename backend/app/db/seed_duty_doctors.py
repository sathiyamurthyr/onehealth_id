from backend.app.database.session import get_db_cursor

def seed_duty_doctors():
    with get_db_cursor() as cur:
        # 1. Fetch all distinct hospitals
        cur.execute("SELECT id, name FROM oh_id.hospitals;")
        hospitals = cur.fetchall()
        print(f"Found {len(hospitals)} hospitals. Seeding Duty Doctors...")

        for h in hospitals:
            h_id = h["id"]
            h_name = h["name"]
            duty_doc_id = f"doc-duty-{h_id}"
            cur.execute("""
                INSERT INTO oh_id.doctors (
                    id, hospital_id, name, specialty, qualification, registration_number, 
                    phone, email, is_available, consultation_fee, rating
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, TRUE, 350, 4.8
                )
                ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name,
                    specialty = EXCLUDED.specialty,
                    qualification = EXCLUDED.qualification,
                    is_available = TRUE,
                    consultation_fee = EXCLUDED.consultation_fee;
            """, (
                duty_doc_id,
                h_id,
                "Duty Medical Officer (OPD)",
                "General OPD & Duty Doctor",
                "MBBS • On-Duty Physician",
                "TN-MCI-DUTY-2026",
                "+91 98400 00000",
                f"dutydoc@{h_id}.org"
            ))

        print("Duty Doctors successfully seeded for all hospitals.")

if __name__ == "__main__":
    seed_duty_doctors()

