import sys
sys.path.insert(0, r"d:\oh-id")
from backend.app.database.session import get_db_cursor

SQL_MIGRATION = """
-- 1. Recreate oh_id.vw_user_workspaces without cross-join on u.role = r.code
DROP VIEW IF EXISTS oh_id.vw_user_workspaces CASCADE;

CREATE OR REPLACE VIEW oh_id.vw_user_workspaces AS
SELECT 
    COALESCE(ur.user_ref_id, ur.user_id, u.id) AS user_ref_id,
    u.username,
    u.email,
    u.full_name,
    COALESCE(ur.usertype_ref_id, ur.role_id, r.id) AS usertype_ref_id,
    r.code AS role_code,
    r.name AS role_name,
    r.workspace_type,
    r.default_route,
    r.dashboard_layout,
    r.navigation_config,
    COALESCE(ur.hospital_ref_id, ur.hospital_id, u.hospital_id) AS hospital_ref_id,
    COALESCE(h.name, u.tenant_id, 'OneHealth Hospital') AS hospital_name,
    COALESCE(h.code, 'HOSP-GEN') AS hospital_code,
    ur.branch_ref_id,
    hb.name AS branch_name,
    ur.department_id,
    dept.name AS department_name,
    COALESCE(u.tenant_id, h.tenant_id, h.id) AS tenant_id,
    COALESCE(t.name, h.name, 'OneHealth Group') AS tenant_name,
    COALESCE(ur.is_primary, TRUE) AS is_primary,
    COALESCE(ur.is_active, TRUE) AS is_active,
    COALESCE((
        SELECT jsonb_agg(DISTINCT p.code)
        FROM oh_id.role_permissions rp
        JOIN oh_id.permissions p ON rp.permission_id = p.id
        WHERE rp.usertype_ref_id = COALESCE(ur.usertype_ref_id, ur.role_id, r.id) 
           OR rp.role_id = COALESCE(ur.role_id, ur.usertype_ref_id, r.id)
    ), '[]'::jsonb) AS permissions
FROM oh_id.user_roles ur
JOIN oh_id.users u ON COALESCE(ur.user_ref_id, ur.user_id) = u.id
JOIN oh_id.roles r ON (COALESCE(ur.usertype_ref_id, ur.role_id) = r.id OR COALESCE(ur.usertype_ref_id, ur.role_id) = r.code)
LEFT JOIN oh_id.hospitals h ON COALESCE(ur.hospital_ref_id, ur.hospital_id, u.hospital_id) = h.id
LEFT JOIN oh_id.hospital_branches hb ON ur.branch_ref_id = hb.id
LEFT JOIN oh_id.departments dept ON (ur.department_id = dept.id OR ur.department_ref_id = dept.id)
LEFT JOIN oh_id.tenants t ON COALESCE(u.tenant_id, h.tenant_id) = t.id
WHERE (ur.is_active IS NULL OR ur.is_active = TRUE) AND (u.is_active IS NULL OR u.is_active = TRUE)

UNION ALL

SELECT 
    u.id AS user_ref_id,
    u.username,
    u.email,
    u.full_name,
    COALESCE(u.usertype_ref_id, r.id) AS usertype_ref_id,
    r.code AS role_code,
    r.name AS role_name,
    r.workspace_type,
    r.default_route,
    r.dashboard_layout,
    r.navigation_config,
    COALESCE(u.hospital_ref_id, u.hospital_id) AS hospital_ref_id,
    COALESCE(h.name, u.tenant_id, 'OneHealth Hospital') AS hospital_name,
    COALESCE(h.code, 'HOSP-GEN') AS hospital_code,
    NULL AS branch_ref_id,
    NULL AS branch_name,
    NULL AS department_id,
    NULL AS department_name,
    COALESCE(u.tenant_id, h.tenant_id, h.id) AS tenant_id,
    COALESCE(t.name, h.name, 'OneHealth Group') AS tenant_name,
    TRUE AS is_primary,
    COALESCE(u.is_active, TRUE) AS is_active,
    COALESCE((
        SELECT jsonb_agg(DISTINCT p.code)
        FROM oh_id.role_permissions rp
        JOIN oh_id.permissions p ON rp.permission_id = p.id
        WHERE rp.usertype_ref_id = COALESCE(u.usertype_ref_id, r.id) 
           OR rp.role_id = COALESCE(u.usertype_ref_id, r.id)
    ), '[]'::jsonb) AS permissions
FROM oh_id.users u
JOIN oh_id.roles r ON (u.usertype_ref_id = r.id OR u.role = r.code)
LEFT JOIN oh_id.hospitals h ON COALESCE(u.hospital_ref_id, u.hospital_id) = h.id
LEFT JOIN oh_id.tenants t ON COALESCE(u.tenant_id, h.tenant_id) = t.id
WHERE (u.is_active IS NULL OR u.is_active = TRUE)
  AND NOT EXISTS (
      SELECT 1 FROM oh_id.user_roles ur 
      WHERE (ur.user_ref_id = u.id OR ur.user_id = u.id)
        AND (ur.is_active IS NULL OR ur.is_active = TRUE)
  );

-- 2. Recreate oh_id.vw_user_hospitals
DROP VIEW IF EXISTS oh_id.vw_user_hospitals CASCADE;

CREATE OR REPLACE VIEW oh_id.vw_user_hospitals AS
SELECT DISTINCT
    COALESCE(ur.user_ref_id, ur.user_id, u.id) AS user_ref_id,
    COALESCE(ur.hospital_ref_id, ur.hospital_id, u.hospital_id) AS hospital_ref_id,
    COALESCE(h.name, 'OneHealth Hospital') AS hospital_name,
    COALESCE(h.code, 'HOSP-GEN') AS hospital_code,
    COALESCE(h.city, 'Chennai') AS hospital_city,
    COALESCE(ur.is_primary, TRUE) AS is_primary
FROM oh_id.user_roles ur
JOIN oh_id.users u ON COALESCE(ur.user_ref_id, ur.user_id) = u.id
JOIN oh_id.hospitals h ON COALESCE(ur.hospital_ref_id, ur.hospital_id, u.hospital_id) = h.id
WHERE (ur.is_active IS NULL OR ur.is_active = TRUE) AND (u.is_active IS NULL OR u.is_active = TRUE)

UNION

SELECT DISTINCT
    u.id AS user_ref_id,
    COALESCE(u.hospital_ref_id, u.hospital_id) AS hospital_ref_id,
    COALESCE(h.name, 'OneHealth Hospital') AS hospital_name,
    COALESCE(h.code, 'HOSP-GEN') AS hospital_code,
    COALESCE(h.city, 'Chennai') AS hospital_city,
    TRUE AS is_primary
FROM oh_id.users u
JOIN oh_id.hospitals h ON COALESCE(u.hospital_ref_id, u.hospital_id) = h.id
WHERE (u.is_active IS NULL OR u.is_active = TRUE)
  AND NOT EXISTS (
      SELECT 1 FROM oh_id.user_roles ur 
      WHERE (ur.user_ref_id = u.id OR ur.user_id = u.id)
        AND (ur.is_active IS NULL OR ur.is_active = TRUE)
  );
"""

def run():
    print("Applying migration for vw_user_workspaces and vw_user_hospitals...")
    with get_db_cursor() as cur:
        cur.execute(SQL_MIGRATION)
    print("Migration successfully applied!")

if __name__ == "__main__":
    run()
