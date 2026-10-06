from backend.app.database.session import get_db_cursor

def patch():
    with get_db_cursor() as cur:
        # Check columns of oh_id.user_roles
        cur.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'oh_id' AND table_name = 'user_roles';
        """)
        cols = [r['column_name'] for r in cur.fetchall()]
        print("user_roles columns:", cols)

        # 1. Add hosp-001 assignment to Dr. Senthil in oh_id.user_roles
        cur.execute("""
            INSERT INTO oh_id.user_roles (id, user_id, user_ref_id, role_id, usertype_ref_id, hospital_id, hospital_ref_id, is_primary, is_active)
            VALUES ('ur-doc1-hosp001', 'usr-kedar-doc1', 'usr-kedar-doc1', 'role-doctor', 'role-doctor', 'hosp-001', 'hosp-001', FALSE, TRUE)
            ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
        """)

        # 2. Update role-patient navigation to include id-card alias alongside onehealth-id
        cur.execute("""
            UPDATE oh_id.roles SET navigation_config = '[
                {"title": "Overview", "href": "/patient", "icon": "LayoutDashboard", "section": "My Health"},
                {"title": "My Profile", "href": "/patient/profile", "icon": "User", "section": "My Health"},
                {"title": "My OneHealth ID", "href": "/patient/onehealth-id", "icon": "CreditCard", "section": "My Health"},
                {"title": "My ID Card", "href": "/patient/id-card", "icon": "CreditCard", "section": "My Health"},
                {"title": "My QR", "href": "/patient/qr", "icon": "QrCode", "section": "My Health"},
                {"title": "Appointments", "href": "/patient/appointments", "icon": "Calendar", "section": "Medical Journey"},
                {"title": "Visits & History", "href": "/patient/visits", "icon": "Clock", "section": "Medical Journey"},
                {"title": "My Doctors", "href": "/patient/doctors", "icon": "Stethoscope", "section": "Medical Journey"},
                {"title": "My Hospitals", "href": "/patient/hospitals", "icon": "Hospital", "section": "Medical Journey"},
                {"title": "Prescriptions", "href": "/patient/prescriptions", "icon": "Pill", "section": "Clinical Records"},
                {"title": "Lab Reports", "href": "/patient/labs", "icon": "TestTube", "section": "Clinical Records"},
                {"title": "Medical Records", "href": "/patient/records", "icon": "FileText", "section": "Clinical Records"},
                {"title": "Medical Documents", "href": "/patient/documents", "icon": "FileText", "section": "Clinical Records"},
                {"title": "Diagnoses & Procedures", "href": "/patient/diagnoses", "icon": "Activity", "section": "Clinical Records"},
                {"title": "Bills & Payments", "href": "/patient/bills", "icon": "Receipt", "section": "Account & Privacy"},
                {"title": "Insurance", "href": "/patient/insurance", "icon": "ShieldCheck", "section": "Account & Privacy"},
                {"title": "Notifications", "href": "/patient/notifications", "icon": "Bell", "section": "Account & Privacy"},
                {"title": "Consent & Privacy", "href": "/patient/consent", "icon": "ShieldCheck", "section": "Account & Privacy"}
            ]'::jsonb
            WHERE id = 'role-patient' OR code = 'PATIENT';
        """)
    print("Database patch applied successfully.")

if __name__ == "__main__":
    patch()
