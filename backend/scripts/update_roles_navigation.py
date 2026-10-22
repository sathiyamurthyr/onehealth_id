import sys
import json
sys.path.insert(0, r"d:\oh-id")
from backend.app.database.session import get_db_cursor

HOSPITAL_ADMIN_NAV = [
    {"title": "Dashboard", "href": "/hospital", "icon": "LayoutDashboard", "section": "Overview"},
    {"title": "Executive Reports", "href": "/hospital/executive-dashboard", "icon": "Activity", "section": "Overview"},
    {"title": "Hospital Profile", "href": "/hospital/facilities", "icon": "Building2", "section": "Organization"},
    {"title": "Branches & Locations", "href": "/hospital/users/branches", "icon": "Building", "section": "Organization"},
    {"title": "Clinical Facilities & Services", "href": "/hospital/billing/services", "icon": "HeartPulse", "section": "Organization"},
    {"title": "Departments & Specialties", "href": "/hospital/departments", "icon": "Layers", "section": "Organization"},
    
    # People & Access
    {"title": "All Users", "href": "/hospital/users", "icon": "Users", "section": "People & Access"},
    {"title": "Doctors", "href": "/hospital/doctors", "icon": "Stethoscope", "section": "People & Access"},
    {"title": "Nurses", "href": "/hospital/nurses", "icon": "HeartPulse", "section": "People & Access"},
    {"title": "Reception & Staff", "href": "/hospital/staff", "icon": "UserCheck", "section": "People & Access"},
    {"title": "Trainees", "href": "/hospital/trainees", "icon": "Users", "section": "People & Access"},
    {"title": "Invitations", "href": "/hospital/users/invitations", "icon": "UserPlus", "section": "People & Access"},
    {"title": "Roles & Permissions", "href": "/hospital/users/roles", "icon": "ShieldCheck", "section": "People & Access"},
    {"title": "Access Audit", "href": "/hospital/users/audit", "icon": "FileText", "section": "People & Access"},

    # Operations
    {"title": "Appointments", "href": "/appointments", "icon": "Calendar", "section": "Operations"},
    {"title": "Check-in Desk", "href": "/reception", "icon": "UserCheck", "section": "Operations"},
    {"title": "Queue & Tokens", "href": "/queue", "icon": "ListOrdered", "section": "Operations"},
    {"title": "Doctor & Nurse Roster", "href": "/hospital/roster", "icon": "Clock", "section": "Operations"},
    {"title": "OPD Counters & Shifts", "href": "/hospital/counters", "icon": "DoorClosed", "section": "Operations"},

    # Patients
    {"title": "Search Patients", "href": "/patients", "icon": "Search", "section": "Patients"},
    {"title": "Patient Registration", "href": "/patients/register", "icon": "PlusCircle", "section": "Patients"},
    {"title": "Billing & Invoices", "href": "/hospital/billing", "icon": "Receipt", "section": "Patients"},

    # Governance & Settings
    {"title": "Security & Audit Logs", "href": "/hospital/users/security", "icon": "ShieldCheck", "section": "Governance"},
    {"title": "Compliance Records", "href": "/hospital/compliance", "icon": "Award", "section": "Governance"},
    {"title": "Hospital Settings", "href": "/hospital/settings", "icon": "Settings", "section": "Governance"}
]

DOCTOR_NAV = [
    {"title": "Clinical Dashboard", "href": "/doctor", "icon": "LayoutDashboard", "section": "Clinical"},
    {"title": "Today's Appointments", "href": "/appointments", "icon": "Calendar", "section": "Clinical"},
    {"title": "Patient Queue", "href": "/doctor/queue", "icon": "ListOrdered", "section": "Clinical"},
    {"title": "My Patients", "href": "/doctor/patients", "icon": "Users", "section": "Clinical"},
    {"title": "Consultations", "href": "/doctor/consultation", "icon": "Stethoscope", "section": "Clinical"},
    {"title": "Prescriptions", "href": "/doctor/prescriptions", "icon": "Pill", "section": "Clinical"},
    {"title": "Document Inbox", "href": "/doctor/documents", "icon": "FileText", "section": "Clinical"},
    {"title": "Schedule & Roster", "href": "/doctor/schedule", "icon": "Clock", "section": "Clinical"}
]

SUPER_ADMIN_NAV = [
    {"title": "Platform Dashboard", "href": "/super-admin", "icon": "LayoutDashboard", "section": "Overview"},
    {"title": "Hospitals & Clinics", "href": "/super-admin/hospitals", "icon": "Building2", "section": "Tenants"},
    {"title": "Clients & Groups", "href": "/super-admin/clients", "icon": "Users", "section": "Tenants"},
    {"title": "Subscriptions & Plans", "href": "/super-admin/subscriptions", "icon": "CreditCard", "section": "SaaS"},
    {"title": "Payments & Billing", "href": "/super-admin/payments", "icon": "Receipt", "section": "SaaS"},
    {"title": "Feature Entitlements", "href": "/super-admin/features", "icon": "Sparkles", "section": "SaaS"},
    {"title": "Customer Support Desk", "href": "/super-admin/support", "icon": "Activity", "section": "Operations"},
    {"title": "Security & Impersonation", "href": "/super-admin/security", "icon": "ShieldCheck", "section": "Governance"},
    {"title": "Platform Audit Logs", "href": "/super-admin/audit", "icon": "FileText", "section": "Governance"},
    {"title": "System Health & Telemetry", "href": "/super-admin/health", "icon": "Activity", "section": "System"}
]

NURSE_NAV = [
    {"title": "Nurse Dashboard", "href": "/nurse", "icon": "LayoutDashboard", "section": "Nursing Station"},
    {"title": "Triage & Vitals", "href": "/nurse/vitals", "icon": "HeartPulse", "section": "Nursing Station"},
    {"title": "Assigned Patients", "href": "/nurse/patients", "icon": "Users", "section": "Nursing Station"},
    {"title": "OPD Queue Board", "href": "/queue", "icon": "ListOrdered", "section": "Operations"}
]

RECEPTIONIST_NAV = [
    {"title": "Front Desk Dashboard", "href": "/reception", "icon": "LayoutDashboard", "section": "Front Desk"},
    {"title": "Patient Search", "href": "/patients", "icon": "Search", "section": "Front Desk"},
    {"title": "Register Citizen", "href": "/patients/register", "icon": "PlusCircle", "section": "Front Desk"},
    {"title": "Appointments", "href": "/appointments", "icon": "Calendar", "section": "Front Desk"},
    {"title": "OPD Queue & Tokens", "href": "/queue", "icon": "ListOrdered", "section": "Front Desk"}
]

LAB_NAV = [
    {"title": "Laboratory Dashboard", "href": "/laboratory", "icon": "TestTube", "section": "Laboratory"},
    {"title": "Sample Collection & Worklist", "href": "/laboratory", "icon": "ListOrdered", "section": "Laboratory"},
    {"title": "Test Results & Verification", "href": "/laboratory", "icon": "FileText", "section": "Laboratory"}
]

PHARMACY_NAV = [
    {"title": "Pharmacy Dashboard", "href": "/pharmacy", "icon": "Pill", "section": "Pharmacy"},
    {"title": "Prescription Dispensing", "href": "/pharmacy", "icon": "Receipt", "section": "Pharmacy"},
    {"title": "Inventory & Stock", "href": "/pharmacy", "icon": "Layers", "section": "Pharmacy"}
]

RADIOLOGY_NAV = [
    {"title": "Radiology Dashboard", "href": "/radiology", "icon": "Activity", "section": "Radiology"},
    {"title": "Imaging Worklist", "href": "/radiology", "icon": "ListOrdered", "section": "Radiology"},
    {"title": "PACS & Reports", "href": "/radiology", "icon": "FileText", "section": "Radiology"}
]

TRAINEE_NAV = [
    {"title": "Intern Dashboard", "href": "/employee", "icon": "LayoutDashboard", "section": "Trainee Station"},
    {"title": "Department Worklist", "href": "/queue", "icon": "ListOrdered", "section": "Trainee Station"},
    {"title": "Patients Directory", "href": "/patients", "icon": "Users", "section": "Trainee Station"}
]

ROLE_CONFIGS = [
    ("HOSPITAL_ADMIN", HOSPITAL_ADMIN_NAV),
    ("DOCTOR", DOCTOR_NAV),
    ("SUPER_ADMIN", SUPER_ADMIN_NAV),
    ("PLATFORM_ADMIN", SUPER_ADMIN_NAV),
    ("NURSE", NURSE_NAV),
    ("RECEPTIONIST", RECEPTIONIST_NAV),
    ("LAB_STAFF", LAB_NAV),
    ("PHARMACY_STAFF", PHARMACY_NAV),
    ("RADIOLOGY_STAFF", RADIOLOGY_NAV),
    ("TRAINEE_INTERN", TRAINEE_NAV)
]

def update_role_navs():
    with get_db_cursor() as cur:
        for code, nav in ROLE_CONFIGS:
            cur.execute(
                "UPDATE oh_id.roles SET navigation_config = %s::jsonb WHERE code = %s;",
                (json.dumps(nav), code)
            )
            print(f"Updated navigation config for role: {code} ({len(nav)} items)")

if __name__ == "__main__":
    update_role_navs()
