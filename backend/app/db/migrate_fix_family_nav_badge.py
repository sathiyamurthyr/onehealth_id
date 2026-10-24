"""
Migration: Remove hardcoded badge '4' from role-patient navigation_config in oh_id.roles.
Ensures family member count is purely dynamic from database and backend API.
"""

from backend.app.database.session import get_db_cursor
import json

CLEAN_NAV_SQL = """
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

def run_migration():
    print("Removing hardcoded '4' badge from oh_id.roles.navigation_config...")
    with get_db_cursor() as cur:
        cur.execute(CLEAN_NAV_SQL)
    print("Successfully removed hardcoded badge from oh_id.roles!")

if __name__ == "__main__":
    run_migration()
