from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    cur.execute("""
        SELECT DISTINCT h.id, h.name, h.code 
        FROM (
            SELECT hospital_id FROM oh_id.appointments WHERE patient_id = 'p-101'
            UNION
            SELECT hospital_id FROM oh_id.vw_opd_encounters WHERE patient_id = 'p-101'
            UNION
            SELECT hospital_id FROM oh_id.lab_orders WHERE patient_id = 'p-101'
            UNION
            SELECT hospital_id FROM oh_id.invoices WHERE patient_id = 'p-101'
        ) x
        JOIN oh_id.hospitals h ON x.hospital_id = h.id;
    """)
    print("HOSPITALS VISITED BY p-101:", cur.fetchall())

    cur.execute("""
        SELECT DISTINCT d.id, d.name, d.specialty, h.name as hospital_name
        FROM (
            SELECT doctor_id, hospital_id FROM oh_id.appointments WHERE patient_id = 'p-101'
            UNION
            SELECT doctor_id, hospital_id FROM oh_id.vw_opd_encounters WHERE patient_id = 'p-101'
            UNION
            SELECT doctor_id, hospital_id FROM oh_id.prescriptions WHERE patient_id = 'p-101'
        ) x
        JOIN oh_id.doctors d ON x.doctor_id = d.id
        LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id;
    """)
    print("\nDOCTORS VISITED BY p-101:", cur.fetchall())
