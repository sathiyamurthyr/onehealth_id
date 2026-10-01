from backend.app.database.session import get_db_cursor

SQL = """
INSERT INTO oh_id.roles (id, usertype_ref_id, code, name, workspace_type, default_route, dashboard_layout, navigation_config, description, is_system_role)
VALUES 
('role-receptionist', 'role-receptionist', 'RECEPTIONIST', 'Receptionist / Front Desk', 'EMPLOYEE', '/employee',
  '["registration_stats", "checkin_overview", "today_appointments", "quick_actions"]'::jsonb,
  '[
    {"title": "Frontdesk Dashboard", "href": "/employee", "icon": "LayoutDashboard", "section": "Front Desk"},
    {"title": "Patient Search", "href": "/patients", "icon": "Search", "section": "Front Desk"},
    {"title": "Register Citizen", "href": "/patients/new", "icon": "UserPlus", "section": "Front Desk"},
    {"title": "Appointments", "href": "/appointments", "icon": "Calendar", "section": "Front Desk"},
    {"title": "OPD Queue Board", "href": "/queue", "icon": "ListOrdered", "section": "Front Desk"}
  ]'::jsonb,
  'Front office operations: citizen identity intake, duplicate search, appointment booking, and arrival check-in.', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    code = 'RECEPTIONIST',
    workspace_type = 'EMPLOYEE',
    default_route = '/employee';

UPDATE oh_id.users SET role = 'RECEPTIONIST', usertype_ref_id = 'role-receptionist' WHERE username = 'receptionist';
UPDATE oh_id.user_roles SET role_id = 'role-receptionist', usertype_ref_id = 'role-receptionist' WHERE user_id = 'usr-receptionist';

-- Also map role_permissions for role-receptionist
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-receptionist', 'role-receptionist', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view',
  'patient.read', 'patient.create', 'patient.update', 'patient.qr.view', 'patient.qr.scan',
  'appointment.read', 'appointment.create', 'appointment.update', 'appointment.checkin',
  'queue.read',
  'billing.read'
)
ON CONFLICT DO NOTHING;
"""

with get_db_cursor() as cur:
    cur.execute(SQL)
    print("Receptionist role code set to RECEPTIONIST with workspace_type EMPLOYEE.")
