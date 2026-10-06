"""
Update Hospital Admin Navigation Menu in Database
"""

from backend.app.database.session import get_db_cursor
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration.update_hospital_admin_nav")

def update_hospital_admin_navigation():
    logger.info("Updating Hospital Admin Navigation Menu...")
    nav_items = [
        {"title": "Hospital Dashboard", "href": "/hospital", "icon": "LayoutDashboard", "section": "Overview"},
        
        # Administration → Users & Access
        {"title": "All Users", "href": "/hospital/users", "icon": "Users", "section": "Users & Access"},
        {"title": "Create User", "href": "/hospital/users/create", "icon": "UserPlus", "section": "Users & Access"},
        {"title": "Pending Invitations", "href": "/hospital/users/invitations", "icon": "Clock", "section": "Users & Access"},
        {"title": "Roles & Permissions", "href": "/hospital/users/roles", "icon": "ShieldCheck", "section": "Users & Access"},
        {"title": "Branch Access", "href": "/hospital/users/branches", "icon": "Building2", "section": "Users & Access"},
        {"title": "Login & Security", "href": "/hospital/users/security", "icon": "Lock", "section": "Users & Access"},
        {"title": "Access Review", "href": "/hospital/users/access-review", "icon": "ShieldAlert", "section": "Users & Access"},
        {"title": "Access Audit", "href": "/hospital/users/audit", "icon": "FileText", "section": "Users & Access"},
        
        # Clinical & Hospital Operations
        {"title": "Patients", "href": "/patients", "icon": "Users", "section": "Clinical Operations"},
        {"title": "Appointments", "href": "/appointments", "icon": "Calendar", "section": "Clinical Operations"},
        {"title": "Queue / Tokens", "href": "/queue", "icon": "ListOrdered", "section": "Clinical Operations"},
        {"title": "Doctor Directory", "href": "/hospital/doctors", "icon": "Stethoscope", "section": "Clinical Operations"},
        {"title": "Nursing Staff", "href": "/hospital/nurses", "icon": "HeartPulse", "section": "Clinical Operations"},
        {"title": "Trainees & Interns", "href": "/hospital/trainees", "icon": "UserCheck", "section": "Clinical Operations"},
        
        # Facility Management
        {"title": "Departments", "href": "/hospital/departments", "icon": "Building", "section": "Facility & Counters"},
        {"title": "OPD Counters", "href": "/hospital/counters", "icon": "ListOrdered", "section": "Facility & Counters"},
        {"title": "Roster & Shifts", "href": "/hospital/roster", "icon": "Clock", "section": "Facility & Counters"},
        
        # Financial & Governance
        {"title": "Billing & Invoices", "href": "/billing", "icon": "Receipt", "section": "Finance"},
        {"title": "Services & Tariffs", "href": "/hospital/services", "icon": "CreditCard", "section": "Finance"},
        {"title": "Facilities & Branches", "href": "/hospital/facilities", "icon": "Building2", "section": "Governance & Compliance"},
        {"title": "Compliance Records", "href": "/hospital/compliance", "icon": "ShieldCheck", "section": "Governance & Compliance"},
        {"title": "Hospital Settings", "href": "/hospital/settings", "icon": "Settings", "section": "Governance & Compliance"}
    ]

    with get_db_cursor() as cur:
        cur.execute("""
            UPDATE oh_id.roles
            SET navigation_config = %s::jsonb
            WHERE code = 'HOSPITAL_ADMIN' OR id = 'role-hospital-admin';
        """, (json.dumps(nav_items),))

    logger.info("Successfully updated Hospital Admin navigation in database!")

if __name__ == "__main__":
    update_hospital_admin_navigation()
