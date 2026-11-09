"""
Database Migration: Hospital Admin Controlled Document Branding
==============================================================
Creates:
1. oh_id.hospital_document_branding (tenant-specific branding colors and logo settings)
2. oh_id.hospital_document_branding_history (historical version snapshots for document integrity)
3. Extends oh_id.opd_consultations with branding_version and branding_snapshot
4. Extends oh_id.prescriptions with branding_version and branding_snapshot
5. Seeds initial branding records for existing hospitals (e.g. hosp-kedar)
"""

import os
import json
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/onehealth_db")

DEFAULT_BRANDING = {
    "primary_color": "#1E3A8A",
    "secondary_color": "#0284C7",
    "heading_color": "#0F172A",
    "body_text_color": "#334155",
    "page_background": "#FFFFFF",
    "section_background": "#F8FAFC",
    "border_color": "#E2E8F0",
    "accent_color": "#4F46E5",
    "success_color": "#16A34A",
    "warning_color": "#D97706",
    "error_color": "#DC2626",
    "logo_placement": "LEFT",
    "logo_size": "MEDIUM",
    "enabled_document_types": ["CLINICAL_REPORT", "PRESCRIPTION", "DISCHARGE_SUMMARY", "MEDICAL_CERTIFICATE"],
}

def run_migration():
    print(f"Connecting to DB: {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        print("\n--- 1. Creating Table: oh_id.hospital_document_branding ---")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospital_document_branding (
                hospital_id VARCHAR(64) PRIMARY KEY REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                hospital_logo_url TEXT,
                hospital_logo_asset_id VARCHAR(128),
                logo_placement VARCHAR(16) NOT NULL DEFAULT 'LEFT',
                logo_size VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
                primary_color VARCHAR(16) NOT NULL DEFAULT '#1E3A8A',
                secondary_color VARCHAR(16) NOT NULL DEFAULT '#0284C7',
                heading_color VARCHAR(16) NOT NULL DEFAULT '#0F172A',
                body_text_color VARCHAR(16) NOT NULL DEFAULT '#334155',
                page_background VARCHAR(16) NOT NULL DEFAULT '#FFFFFF',
                section_background VARCHAR(16) NOT NULL DEFAULT '#F8FAFC',
                border_color VARCHAR(16) NOT NULL DEFAULT '#E2E8F0',
                accent_color VARCHAR(16) NOT NULL DEFAULT '#4F46E5',
                success_color VARCHAR(16) NOT NULL DEFAULT '#16A34A',
                warning_color VARCHAR(16) NOT NULL DEFAULT '#D97706',
                error_color VARCHAR(16) NOT NULL DEFAULT '#DC2626',
                enabled_document_types JSONB NOT NULL DEFAULT '["CLINICAL_REPORT", "PRESCRIPTION", "DISCHARGE_SUMMARY", "MEDICAL_CERTIFICATE"]'::jsonb,
                version INT NOT NULL DEFAULT 1,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_by VARCHAR(128) NOT NULL DEFAULT 'system_init'
            );
        """)
        print("[OK] Table oh_id.hospital_document_branding created.")

        print("\n--- 2. Creating Table: oh_id.hospital_document_branding_history ---")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospital_document_branding_history (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                version INT NOT NULL,
                branding_config JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(128) NOT NULL DEFAULT 'system'
            );
        """)
        print("[OK] Table oh_id.hospital_document_branding_history created.")

        print("\n--- 3. Extending Consultations & Prescriptions for Branding Version Integrity ---")
        cur.execute("""
            ALTER TABLE oh_id.opd_consultations ADD COLUMN IF NOT EXISTS branding_version INT DEFAULT 1;
            ALTER TABLE oh_id.opd_consultations ADD COLUMN IF NOT EXISTS branding_snapshot JSONB;

            ALTER TABLE oh_id.prescriptions ADD COLUMN IF NOT EXISTS branding_version INT DEFAULT 1;
            ALTER TABLE oh_id.prescriptions ADD COLUMN IF NOT EXISTS branding_snapshot JSONB;
        """)
        print("[OK] Consultations & Prescriptions extended.")

        print("\n--- 4. Seeding Default Branding for Existing Hospitals ---")
        cur.execute("SELECT id FROM oh_id.hospitals;")
        hospitals = cur.fetchall()
        for h in hospitals:
            hid = h["id"]
            cur.execute("""
                INSERT INTO oh_id.hospital_document_branding (
                    hospital_id, logo_placement, logo_size, primary_color, secondary_color,
                    heading_color, body_text_color, page_background, section_background,
                    border_color, accent_color, success_color, warning_color, error_color,
                    enabled_document_types, version, updated_by
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s::jsonb, 1, 'system_init'
                ) ON CONFLICT (hospital_id) DO NOTHING;
            """, (
                hid,
                DEFAULT_BRANDING["logo_placement"],
                DEFAULT_BRANDING["logo_size"],
                DEFAULT_BRANDING["primary_color"],
                DEFAULT_BRANDING["secondary_color"],
                DEFAULT_BRANDING["heading_color"],
                DEFAULT_BRANDING["body_text_color"],
                DEFAULT_BRANDING["page_background"],
                DEFAULT_BRANDING["section_background"],
                DEFAULT_BRANDING["border_color"],
                DEFAULT_BRANDING["accent_color"],
                DEFAULT_BRANDING["success_color"],
                DEFAULT_BRANDING["warning_color"],
                DEFAULT_BRANDING["error_color"],
                json.dumps(DEFAULT_BRANDING["enabled_document_types"])
            ))

            # Also seed history entry for v1
            history_id = f"brh-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.hospital_document_branding_history (
                    id, hospital_id, version, branding_config, created_by
                ) VALUES (%s, %s, 1, %s::jsonb, 'system_init')
                ON CONFLICT (id) DO NOTHING;
            """, (history_id, hid, json.dumps(DEFAULT_BRANDING)))

        conn.commit()
        print(f"[OK] Successfully seeded branding for {len(hospitals)} hospitals.")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()

