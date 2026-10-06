from backend.app.database.session import get_db_cursor

def update_vw_patients():
    with get_db_cursor() as cur:
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_patients CASCADE;
            CREATE OR REPLACE VIEW oh_id.vw_patients AS
            SELECT 
                p.id,
                p.user_id,
                p.onehealth_id,
                p.qr_token,
                p.name,
                p.age,
                p.dob,
                p.gender,
                p.phone,
                p.email,
                p.address,
                p.city,
                p.state,
                p.emergency_contact,
                p.blood_group,
                p.diagnosis,
                p.identity_type,
                p.identity_number,
                p.branch_id,
                b.name AS branch_name,
                p.is_demo_data,
                p.status,
                p.hospital_id,
                h.name AS hospital_name,
                p.tenant_id,
                p.created_at,
                p.updated_at,
                (SELECT COUNT(*) FROM oh_id.appointments a WHERE a.patient_id = p.id) AS total_appointments,
                (SELECT COUNT(*) FROM oh_id.invoices i WHERE i.patient_id = p.id AND i.payment_status != 'PAID') AS pending_bills_count
            FROM oh_id.patients p
            LEFT JOIN oh_id.hospitals h ON p.hospital_id = h.id
            LEFT JOIN oh_id.hospital_branches b ON p.branch_id = b.id;
        """)
    print("vw_patients updated with user_id and identity fields successfully!")

if __name__ == "__main__":
    update_vw_patients()
