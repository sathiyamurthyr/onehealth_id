import sys
import os
sys.path.insert(0, os.path.abspath("."))

from backend.app.database.session import get_db_cursor

def run_migration():
    print("=== STARTING HOSPITAL BRANCHES & PATIENT SP REPAIR ===")
    with get_db_cursor() as cur:
        # 1. Ensure every hospital has at least one main branch
        cur.execute("""
            SELECT *
            FROM oh_id.hospitals h
            WHERE NOT EXISTS (
                SELECT 1 FROM oh_id.hospital_branches b WHERE b.hospital_id = h.id
            );
        """)
        hospitals_needing_branches = cur.fetchall()
        print(f"Found {len(hospitals_needing_branches)} hospitals missing a branch in oh_id.hospital_branches.")

        for h in hospitals_needing_branches:
            h_id = h["id"]
            h_name = h["name"]
            br_id = f"br-{h_id[5:13]}" if h_id.startswith("hosp-") else f"br-{h_id[:8]}"
            br_code = f"BR-{h_name.upper().replace(' ', '')[:6]}-01"
            print(f"Creating main branch {br_id} ({br_code}) for hospital {h_id} ({h_name})...")
            cur.execute("""
                INSERT INTO oh_id.hospital_branches (
                    id, hospital_id, name, code, address, city, state, pincode, phone, is_main_branch, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, TRUE
                )
                ON CONFLICT (id) DO NOTHING;
            """, (
                br_id,
                h_id,
                f"{h_name} - Main Campus",
                br_code,
                h.get("address") or "Main Road",
                h.get("city") or "Chennai",
                h.get("state") or "Tamil Nadu",
                h.get("pin_code") or h.get("pincode") or "600001",
                h.get("phone") or "+91 44 2800 0000"
            ))

        # 2. Update sp_register_patient_v2 to defensively validate and resolve branch_id and tenant_id
        print("Updating procedure oh_id.sp_register_patient_v2...")
        cur.execute("""
CREATE OR REPLACE PROCEDURE oh_id.sp_register_patient_v2(
    IN p_id character varying,
    IN p_name character varying,
    IN p_age integer,
    IN p_gender character varying,
    IN p_phone character varying,
    IN p_email character varying,
    IN p_address text,
    IN p_emergency_contact character varying,
    IN p_blood_group character varying,
    IN p_diagnosis text,
    IN p_identity_type character varying,
    IN p_identity_number character varying,
    IN p_hospital_id character varying,
    IN p_branch_id character varying,
    IN p_tenant_id character varying,
    IN p_created_by character varying,
    IN p_is_demo_data boolean,
    INOUT o_patient_id character varying DEFAULT NULL::character varying,
    INOUT o_onehealth_id character varying DEFAULT NULL::character varying,
    INOUT o_qr_token character varying DEFAULT NULL::character varying
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_new_id VARCHAR(64);
    v_seq INT;
    v_rand VARCHAR(12);
    v_ohid VARCHAR(64);
    v_qr VARCHAR(255);
    v_hosp VARCHAR(64);
    v_ten VARCHAR(64);
    v_branch VARCHAR(64) := NULL;
BEGIN
    v_new_id := COALESCE(p_id, 'p-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    v_hosp := COALESCE(p_hospital_id, 'hosp-kedar');

    -- Resolve tenant_id from hospital if not supplied or default
    IF p_tenant_id IS NOT NULL AND p_tenant_id <> 'ten-kedar' THEN
        v_ten := p_tenant_id;
    ELSE
        SELECT tenant_id INTO v_ten FROM oh_id.hospitals WHERE id = v_hosp;
        v_ten := COALESCE(v_ten, p_tenant_id, 'ten-kedar');
    END IF;

    -- Safely resolve branch_id
    IF p_branch_id IS NOT NULL AND p_branch_id <> '' THEN
        -- Check exact id or code for this hospital
        SELECT id INTO v_branch 
        FROM oh_id.hospital_branches 
        WHERE (id = p_branch_id OR code = p_branch_id) AND hospital_id = v_hosp
        LIMIT 1;

        -- If not found under this hospital, check global branch id
        IF v_branch IS NULL THEN
            SELECT id INTO v_branch 
            FROM oh_id.hospital_branches 
            WHERE id = p_branch_id
            LIMIT 1;
        END IF;
    END IF;

    -- If no valid branch matched, fallback to the main branch for this hospital
    IF v_branch IS NULL AND v_hosp IS NOT NULL THEN
        SELECT id INTO v_branch 
        FROM oh_id.hospital_branches 
        WHERE hospital_id = v_hosp 
        ORDER BY is_main_branch DESC, created_at ASC 
        LIMIT 1;
    END IF;

    -- Secure, non-sequential OneHealth ID format (OHID-KEDAR-2026-XXXXX)
    v_rand := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || v_new_id || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    v_ohid := 'OHID-KEDAR-2026-' || v_rand;

    -- Zero-knowledge QR token (never contains medical history or diagnosis)
    v_qr := 'QR-OHID-SECURE-' || MD5(v_ohid || v_new_id || RANDOM()::TEXT);

    INSERT INTO oh_id.patients (
        id, onehealth_id, qr_token, name, age, gender, phone, email,
        address, emergency_contact, blood_group, diagnosis,
        identity_type, identity_number, hospital_id, branch_id, tenant_id,
        status, is_demo_data
    ) VALUES (
        v_new_id, v_ohid, v_qr, p_name, p_age, p_gender, p_phone, p_email,
        p_address, p_emergency_contact, p_blood_group, p_diagnosis,
        COALESCE(p_identity_type, 'NATIONAL_ID'), p_identity_number, v_hosp, v_branch, v_ten,
        'ACTIVE', COALESCE(p_is_demo_data, FALSE)
    );

    -- Audit log entry
    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, hospital_id, tenant_id, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_created_by, 'Hospital Staff', v_hosp, v_ten, 'PATIENT_REGISTER', 'PATIENT', v_new_id,
        json_build_object(
            'onehealth_id', v_ohid,
            'name', p_name,
            'identity_type', p_identity_type,
            'branch_id', v_branch
        )::jsonb
    );

    o_patient_id := v_new_id;
    o_onehealth_id := v_ohid;
    o_qr_token := v_qr;
END;
$procedure$;
        """)
        print("Procedure oh_id.sp_register_patient_v2 updated successfully.")

if __name__ == "__main__":
    run_migration()
