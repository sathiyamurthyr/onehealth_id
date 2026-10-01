from backend.app.database.session import get_db_cursor

SQL = """
UPDATE oh_id.roles 
SET navigation_config = '[
    {"title": "Frontdesk Dashboard", "href": "/employee", "icon": "LayoutDashboard", "section": "Front Desk"},
    {"title": "Patient Search", "href": "/patients", "icon": "Search", "section": "Front Desk"},
    {"title": "Register Citizen", "href": "/patients/new", "icon": "UserPlus", "section": "Front Desk"},
    {"title": "Appointments", "href": "/appointments", "icon": "Calendar", "section": "Front Desk"},
    {"title": "OPD Queue Board", "href": "/queue", "icon": "ListOrdered", "section": "Front Desk"}
]'::jsonb,
dashboard_layout = '["registration_stats", "checkin_overview", "today_appointments", "quick_actions"]'::jsonb
WHERE id = 'role-receptionist';
"""

with get_db_cursor() as cur:
    cur.execute(SQL)
    print("Updated navigation_config for role-receptionist.")
