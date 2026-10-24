from backend.app.database.session import get_db_cursor
import json

sql = """
-- Add patient.self.family permission
INSERT INTO oh_id.permissions (id, code, module, description)
VALUES ('perm-slf-09', 'patient.self.family', 'patient_self', 'Manage family member relationships and authorized healthcare access')
ON CONFLICT (code) DO NOTHING;

INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-patient', 'role-patient', id FROM oh_id.permissions WHERE code = 'patient.self.family'
ON CONFLICT DO NOTHING;

UPDATE oh_id.roles SET 
    navigation_config = '[
        {"title": "Overview", "href": "/patient", "icon": "LayoutDashboard", "section": "My Health"},
        {"title": "My Profile", "href": "/patient/profile", "icon": "User", "section": "My Health"},
        {"title": "Family Members", "href": "/patient/family", "icon": "Users", "section": "My Health"},
        {"title": "My OneHealth ID", "href": "/patient/onehealth-id", "icon": "CreditCard", "section": "My Health"},
        {"title": "My QR", "href": "/patient/qr", "icon": "QrCode", "section": "My Health"},
        {"title": "Appointments", "href": "/patient/appointments", "icon": "Calendar", "section": "Medical Journey"},
        {"title": "Visits & History", "href": "/patient/visits", "icon": "Clock", "section": "Medical Journey"},
        {"title": "Complete Timeline", "href": "/patient/timeline", "icon": "History", "section": "Medical Journey"},
        {"title": "My Doctors", "href": "/patient/doctors", "icon": "Stethoscope", "section": "Medical Journey"},
        {"title": "My Hospitals", "href": "/patient/hospitals", "icon": "Hospital", "section": "Medical Journey"},
        {"title": "Prescriptions", "href": "/patient/prescriptions", "icon": "Pill", "section": "Clinical Records"},
        {"title": "Lab Reports", "href": "/patient/labs", "icon": "TestTube", "section": "Clinical Records"},
        {"title": "Medical Documents", "href": "/patient/documents", "icon": "FileText", "section": "Clinical Records"},
        {"title": "Diagnoses & Procedures", "href": "/patient/diagnoses", "icon": "Activity", "section": "Clinical Records"},
        {"title": "Bills & Payments", "href": "/patient/bills", "icon": "Receipt", "section": "Account & Privacy"},
        {"title": "Insurance", "href": "/patient/insurance", "icon": "ShieldCheck", "section": "Account & Privacy"},
        {"title": "Notifications", "href": "/patient/notifications", "icon": "Bell", "section": "Account & Privacy"},
        {"title": "Consent & Privacy", "href": "/patient/consent", "icon": "ShieldCheck", "section": "Account & Privacy"}
    ]'::jsonb
WHERE id = 'role-patient' OR code = 'PATIENT';
"""

def update_nav():
    with get_db_cursor() as cur:
        cur.execute(sql)
    print("Role patient navigation successfully updated with Family Members and Timeline!")

if __name__ == "__main__":
    update_nav()
