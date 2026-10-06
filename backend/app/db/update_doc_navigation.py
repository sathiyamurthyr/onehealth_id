"""
Script to update role navigation configs for role-doctor and role-patient with the new Medical Documents & Document Inbox endpoints.
"""
import os
import sys
import json
import logging

sys.path.insert(0, os.path.abspath("."))
from backend.app.database.session import get_db_cursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_role_nav():
    with get_db_cursor() as cur:
        # 1. Update Doctor Role Navigation
        doctor_nav = [
            {"title": "Doctor Dashboard", "href": "/doctor", "icon": "LayoutDashboard", "section": "Clinical"},
            {"title": "My Live Queue", "href": "/doctor/queue", "icon": "ListOrdered", "section": "Clinical"},
            {"title": "My Appointments", "href": "/appointments", "icon": "Calendar", "section": "Clinical"},
            {"title": "Patients Directory", "href": "/doctor/patients", "icon": "Users", "section": "Clinical"},
            {"title": "Document Inbox", "href": "/doctor/documents", "icon": "FileText", "section": "Clinical"},
        ]
        cur.execute(
            """
            UPDATE oh_id.roles
            SET navigation_config = %s::jsonb
            WHERE id = 'role-doctor';
            """,
            (json.dumps(doctor_nav),)
        )

        # 2. Update Patient Role Navigation
        patient_nav = [
            {"title": "My Health Dashboard", "href": "/patient", "icon": "LayoutDashboard", "section": "My Health"},
            {"title": "My OneHealth ID Card", "href": "/patient/id-card", "icon": "QrCode", "section": "My Health"},
            {"title": "My Appointments", "href": "/patient/appointments", "icon": "Calendar", "section": "My Health"},
            {"title": "My Medical Documents", "href": "/patient/documents", "icon": "FileText", "section": "My Health"},
            {"title": "Medical Records & Visits", "href": "/patient/records", "icon": "Clock", "section": "My Health"},
            {"title": "Health Timeline", "href": "/patient/timeline", "icon": "History", "section": "My Health"},
            {"title": "Family Members", "href": "/patient/family", "icon": "Users", "section": "Family Health"},
        ]
        cur.execute(
            """
            UPDATE oh_id.roles
            SET navigation_config = %s::jsonb
            WHERE id = 'role-patient';
            """,
            (json.dumps(patient_nav),)
        )

        logger.info("Successfully updated role-doctor and role-patient navigation configs in database.")

if __name__ == "__main__":
    update_role_nav()
