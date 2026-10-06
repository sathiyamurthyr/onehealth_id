"""
OH-ID India Healthcare Compliance & Governance Migration Script
==============================================================
Creates tables, views, and benchmark seed data for:
1. Statutory Hospital Licenses & Registrations (Tamil Nadu CEA, Pharmacy, AERB, Fire Safety, TNPCB, NABH/NABL)
2. ABDM National Health Stack Integration (HFR Facility Registry, HPR Doctor/Practitioner Registry, M1/M2/M3 Milestones)
3. Patient ABHA Health ID Linking & Identity Governance
4. ABDM Electronic Consent Artifacts & Purpose-Bound Sharing
5. DPDP Act Privacy Governance & Patient Grievance Redressal
6. Immutable Compliance Audit Trail
"""

import sys
import os
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath("."))
from backend.app.database.session import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration.india_compliance_governance")

def migrate_india_compliance_governance():
    logger.info("Starting OH-ID India Healthcare Compliance & Governance Migration...")

    with get_db_cursor() as cur:
        # =========================================================================
        # 1. STATUTORY HOSPITAL LICENSES & REGISTRATIONS
        # =========================================================================
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.hospital_statutory_licenses (
            id VARCHAR(64) PRIMARY KEY,
            hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id),
            license_category VARCHAR(64) NOT NULL, -- CEA_REGISTRATION, PHARMACY_20B_21B, FIRE_SAFETY_NOC, AERB_XRAY_CT, TNPCB_BIOMEDICAL_WASTE, NABH_ACCREDITATION, NABL_LAB, PNDT_ULTRASOUND, BLOOD_BANK_LICENSE
            title VARCHAR(255) NOT NULL,
            license_number VARCHAR(128) NOT NULL,
            issuing_authority VARCHAR(255) NOT NULL,
            state_code VARCHAR(16) DEFAULT 'TN', -- TN (Tamil Nadu), IN (National), etc.
            facility_branch_id VARCHAR(64),
            issue_date DATE NOT NULL,
            expiry_date DATE NOT NULL,
            status VARCHAR(32) DEFAULT 'VALID', -- VALID, EXPIRING_SOON, EXPIRED, UNDER_RENEWAL
            verification_status VARCHAR(32) DEFAULT 'VERIFIED', -- VERIFIED, PENDING_VERIFICATION, REJECTED
            verified_by VARCHAR(64),
            verified_at TIMESTAMP WITH TIME ZONE,
            document_url TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_statutory_licenses_hosp ON oh_id.hospital_statutory_licenses(hospital_id, status);
        CREATE INDEX IF NOT EXISTS idx_statutory_licenses_category ON oh_id.hospital_statutory_licenses(license_category);
        """)
        logger.info("✓ Created table: oh_id.hospital_statutory_licenses")

        # =========================================================================
        # 2. ABDM FACILITY REGISTRY (HFR) & MILESTONE INTEGRATION
        # =========================================================================
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.abdm_facility_registry (
            facility_id VARCHAR(64) PRIMARY KEY,
            hospital_id VARCHAR(64) UNIQUE NOT NULL REFERENCES oh_id.hospitals(id),
            hfr_id VARCHAR(64) UNIQUE NOT NULL, -- National HFR ID e.g. IN3310008892
            facility_name VARCHAR(255) NOT NULL,
            facility_type VARCHAR(64) NOT NULL, -- HOSPITAL_SECONDARY, HOSPITAL_TERTIARY, CLINIC, DIAGNOSTIC_CENTER
            ownership_type VARCHAR(64) DEFAULT 'PRIVATE_COMMERCIAL', -- PRIVATE_COMMERCIAL, STATE_GOVERNMENT, CENTRAL_GOVERNMENT, NGO_TRUST
            state_code VARCHAR(16) DEFAULT 'TN',
            district VARCHAR(128) DEFAULT 'Chennai',
            pincode VARCHAR(16) DEFAULT '600125',
            abdm_m1_status VARCHAR(32) DEFAULT 'ACTIVE', -- M1: ABHA creation, verification & discovery
            abdm_m2_status VARCHAR(32) DEFAULT 'ACTIVE', -- M2: Health Information Provider (HIP) FHIR Records
            abdm_m3_status VARCHAR(32) DEFAULT 'ACTIVE', -- M3: Health Information User (HIU) Consent Records
            bridge_url TEXT DEFAULT 'https://abdm-bridge.kedarhealth.com/v0.5',
            client_id VARCHAR(128) DEFAULT 'SBX_KEDAR_HFR_008892',
            public_key TEXT,
            verification_status VARCHAR(64) DEFAULT 'VERIFIED_BY_STATE_REGISTRAR',
            verified_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_abdm_facility_hosp ON oh_id.abdm_facility_registry(hospital_id);
        """)
        logger.info("✓ Created table: oh_id.abdm_facility_registry")

        # =========================================================================
        # 3. ABDM PRACTITIONER REGISTRY (HPR) & COUNCIL VERIFICATION
        # =========================================================================
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.abdm_practitioner_registry (
            hpr_mapping_id VARCHAR(64) PRIMARY KEY,
            doctor_id VARCHAR(64) UNIQUE NOT NULL REFERENCES oh_id.doctors(id),
            hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id),
            hpr_id VARCHAR(64) UNIQUE, -- National HPR ID e.g. 91-8890-4412-1001
            doctor_name VARCHAR(255) NOT NULL,
            council_registration_number VARCHAR(128) NOT NULL,
            registration_council VARCHAR(255) DEFAULT 'Tamil Nadu Medical Council', -- TNMC, NMC, etc.
            system_of_medicine VARCHAR(64) DEFAULT 'MODERN_MEDICINE_ALLOPATHY', -- ALLOPATHY, AYUSH_AYURVEDA, AYUSH_SIDDHA, DENTAL
            is_allied_health BOOLEAN DEFAULT FALSE,
            ncahp_enrolment_id VARCHAR(128), -- For allied healthcare professionals under NCAHP
            ncahp_status_label VARCHAR(64) DEFAULT 'REGISTRATION_EXEMPT_OR_NMC_DOCTOR', -- ENROLLED_DATA_COLLECTION vs REGISTERED
            hpr_verification_status VARCHAR(32) DEFAULT 'VERIFIED', -- VERIFIED, PENDING_VERIFICATION, UNLINKED
            verified_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_abdm_hpr_doc ON oh_id.abdm_practitioner_registry(doctor_id);
        CREATE INDEX IF NOT EXISTS idx_abdm_hpr_hosp ON oh_id.abdm_practitioner_registry(hospital_id);
        """)
        logger.info("✓ Created table: oh_id.abdm_practitioner_registry")

        # =========================================================================
        # 4. PATIENT ABHA HEALTH ID LINKING & IDENTITY GOVERNANCE
        # =========================================================================
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.patient_abha_mappings (
            mapping_id VARCHAR(64) PRIMARY KEY,
            patient_id VARCHAR(64) UNIQUE NOT NULL REFERENCES oh_id.patients(id),
            abha_number VARCHAR(32), -- 14-digit ABHA Number (masked in logs)
            abha_address VARCHAR(128) UNIQUE NOT NULL, -- e.g. sathiya.murthy@abdm
            link_status VARCHAR(32) DEFAULT 'LINKED', -- LINKED, PENDING_OTP, UNLINKED
            auth_method VARCHAR(32) DEFAULT 'AADHAAR_OTP', -- AADHAAR_OTP, MOBILE_OTP, DEMOGRAPHIC
            kyc_status VARCHAR(32) DEFAULT 'VERIFIED', -- VERIFIED, PENDING, REJECTED
            kyc_verified_at TIMESTAMP WITH TIME ZONE,
            care_context_count INT DEFAULT 4,
            consent_revoked BOOLEAN DEFAULT FALSE,
            linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_patient_abha_pat ON oh_id.patient_abha_mappings(patient_id);
        CREATE INDEX IF NOT EXISTS idx_patient_abha_addr ON oh_id.patient_abha_mappings(abha_address);
        """)
        logger.info("✓ Created table: oh_id.patient_abha_mappings")

        # =========================================================================
        # 5. ABDM ELECTRONIC CONSENT ARTIFACTS
        # =========================================================================
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.abdm_consent_artifacts (
            consent_id VARCHAR(64) PRIMARY KEY,
            patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id),
            requester_hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id),
            requester_doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
            requester_name VARCHAR(255) NOT NULL,
            provider_hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
            provider_hospital_name VARCHAR(255) NOT NULL,
            purpose_code VARCHAR(32) NOT NULL, -- CARETREAT (Care & Treatment), DSRCH (Research), PATRQT (Patient Request), PUBHLTH (Public Health)
            purpose_text VARCHAR(255) NOT NULL,
            data_categories JSONB NOT NULL, -- ["OPConsultation", "Prescription", "DiagnosticReport", "DischargeSummary"]
            date_range_from DATE NOT NULL,
            date_range_to DATE NOT NULL,
            consent_status VARCHAR(32) DEFAULT 'GRANTED', -- REQUESTED, GRANTED, DENIED, EXPIRED, REVOKED
            granted_at TIMESTAMP WITH TIME ZONE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            revoked_at TIMESTAMP WITH TIME ZONE,
            revocation_reason TEXT,
            digital_signature TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_consent_artifacts_pat ON oh_id.abdm_consent_artifacts(patient_id, consent_status);
        CREATE INDEX IF NOT EXISTS idx_consent_artifacts_req ON oh_id.abdm_consent_artifacts(requester_hospital_id);
        """)
        logger.info("✓ Created table: oh_id.abdm_consent_artifacts")

        # =========================================================================
        # 6. DPDP ACT PRIVACY GOVERNANCE & PATIENT GRIEVANCE REDRESSAL
        # =========================================================================
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.privacy_grievances (
            grievance_id VARCHAR(64) PRIMARY KEY,
            hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id),
            patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id),
            patient_name VARCHAR(255) NOT NULL,
            patient_mobile VARCHAR(32) NOT NULL,
            grievance_type VARCHAR(64) NOT NULL, -- DATA_CORRECTION, CONSENT_REVOCATION_DISPUTE, UNAUTHORIZED_ACCESS_REPORT, DATA_ERASURE_REQUEST, GENERAL_PRIVACY
            description TEXT NOT NULL,
            status VARCHAR(32) DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED, CLOSED
            grievance_officer_id VARCHAR(64),
            grievance_officer_name VARCHAR(255),
            resolution_notes TEXT,
            sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
            resolved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_privacy_grievances_hosp ON oh_id.privacy_grievances(hospital_id, status);
        CREATE INDEX IF NOT EXISTS idx_privacy_grievances_pat ON oh_id.privacy_grievances(patient_id);
        """)
        logger.info("✓ Created table: oh_id.privacy_grievances")

        # =========================================================================
        # 7. COMPLIANCE AUDIT LOGS
        # =========================================================================
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.compliance_audit_logs (
            audit_id VARCHAR(64) PRIMARY KEY,
            hospital_id VARCHAR(64) NOT NULL,
            event_type VARCHAR(64) NOT NULL, -- STATUTORY_LICENSE_VERIFIED, ABDM_HFR_SYNC, ABDM_HPR_SYNC, ABHA_LINKED, CONSENT_REQUESTED, CONSENT_GRANTED, CONSENT_REVOKED, GRIEVANCE_LODGED, GRIEVANCE_RESOLVED, REGULATORY_EXPORT_DOWNLOADED
            actor_id VARCHAR(64) NOT NULL,
            actor_role VARCHAR(64) NOT NULL,
            resource_type VARCHAR(64) NOT NULL,
            resource_id VARCHAR(64) NOT NULL,
            action_status VARCHAR(32) DEFAULT 'SUCCESS',
            details JSONB DEFAULT '{}'::jsonb,
            ip_address VARCHAR(64) DEFAULT '127.0.0.1',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_compliance_audit_hosp ON oh_id.compliance_audit_logs(hospital_id, event_type);
        """)
        logger.info("✓ Created table: oh_id.compliance_audit_logs")

        # =========================================================================
        # 8. DATABASE VIEWS
        # =========================================================================
        cur.execute("""
        CREATE OR REPLACE VIEW oh_id.vw_hospital_compliance_overview AS
        SELECT 
            h.id AS hospital_id,
            h.name AS hospital_name,
            h.code AS hospital_code,
            hfr.hfr_id,
            hfr.facility_type,
            hfr.abdm_m1_status,
            hfr.abdm_m2_status,
            hfr.abdm_m3_status,
            hfr.verification_status AS hfr_verification_status,
            (SELECT COUNT(*) FROM oh_id.hospital_statutory_licenses l WHERE l.hospital_id = h.id AND l.status = 'VALID') AS valid_licenses_count,
            (SELECT COUNT(*) FROM oh_id.hospital_statutory_licenses l WHERE l.hospital_id = h.id AND l.status = 'EXPIRING_SOON') AS expiring_licenses_count,
            (SELECT COUNT(*) FROM oh_id.hospital_statutory_licenses l WHERE l.hospital_id = h.id AND l.status = 'EXPIRED') AS expired_licenses_count,
            (SELECT COUNT(*) FROM oh_id.abdm_practitioner_registry p WHERE p.hospital_id = h.id AND p.hpr_verification_status = 'VERIFIED') AS verified_hpr_doctors_count,
            (SELECT COUNT(*) FROM oh_id.privacy_grievances g WHERE g.hospital_id = h.id AND g.status IN ('OPEN', 'INVESTIGATING')) AS open_grievances_count,
            (SELECT COUNT(*) FROM oh_id.abdm_consent_artifacts c WHERE c.requester_hospital_id = h.id AND c.consent_status = 'GRANTED') AS active_consents_count
        FROM oh_id.hospitals h
        LEFT JOIN oh_id.abdm_facility_registry hfr ON h.id = hfr.hospital_id;
        """)
        logger.info("✓ Created view: oh_id.vw_hospital_compliance_overview")

        cur.execute("""
        CREATE OR REPLACE VIEW oh_id.vw_patient_consent_artifacts_full AS
        SELECT 
            c.consent_id,
            c.patient_id,
            p.name AS patient_name,
            p.onehealth_id AS oh_id,
            c.requester_hospital_id,
            h_req.name AS requester_hospital_name,
            c.requester_doctor_id,
            c.requester_name,
            c.provider_hospital_id,
            c.provider_hospital_name,
            c.purpose_code,
            c.purpose_text,
            c.data_categories,
            c.date_range_from,
            c.date_range_to,
            c.consent_status,
            c.granted_at,
            c.expires_at,
            c.revoked_at,
            c.revocation_reason,
            c.digital_signature,
            c.created_at
        FROM oh_id.abdm_consent_artifacts c
        JOIN oh_id.patients p ON c.patient_id = p.id
        JOIN oh_id.hospitals h_req ON c.requester_hospital_id = h_req.id;
        """)
        logger.info("✓ Created view: oh_id.vw_patient_consent_artifacts_full")

        cur.execute("""
        CREATE OR REPLACE VIEW oh_id.vw_privacy_grievances_full AS
        SELECT 
            g.grievance_id,
            g.hospital_id,
            h.name AS hospital_name,
            g.patient_id,
            g.patient_name,
            g.patient_mobile,
            p.onehealth_id AS oh_id,
            g.grievance_type,
            g.description,
            g.status,
            g.grievance_officer_id,
            g.grievance_officer_name,
            g.resolution_notes,
            g.sla_deadline,
            g.resolved_at,
            g.created_at,
            g.updated_at
        FROM oh_id.privacy_grievances g
        JOIN oh_id.hospitals h ON g.hospital_id = h.id
        JOIN oh_id.patients p ON g.patient_id = p.id;
        """)
        logger.info("✓ Created view: oh_id.vw_privacy_grievances_full")

        # =========================================================================
        # 9. SEED BENCHMARK STATUTORY LICENSES & REGULATORY DATA
        # =========================================================================
        now = datetime.now(timezone.utc)
        issue_date_valid = (now - timedelta(days=180)).date()
        expiry_date_valid = (now + timedelta(days=900)).date()
        expiry_date_soon = (now + timedelta(days=22)).date()

        # Seed Statutory Licenses for Kedar Hospital (hosp-kedar)
        statutory_licenses = [
            (
                "lic-cea-01",
                "hosp-kedar",
                "CEA_REGISTRATION",
                "Tamil Nadu Clinical Establishments Act Registration",
                "TN/CEA/2024/00812",
                "Directorate of Medical and Rural Health Services (DMRHS), Tamil Nadu",
                "TN",
                "br-kedar-01",
                issue_date_valid,
                expiry_date_valid,
                "VALID",
                "VERIFIED",
                "State District Registrar (Kanchipuram)",
                now - timedelta(days=175),
                "https://storage.kedarhealth.com/compliance/cea_certificate_2024.pdf",
                json.dumps({"inspected_by": "Joint Director of Health Services, TN", "beds_authorized": 75, "icu_beds": 12})
            ),
            (
                "lic-pharm-01",
                "hosp-kedar",
                "PHARMACY_20B_21B",
                "Form 20B & 21B Allopathic Retail & Hospital Pharmacy License",
                "TN-DRUG-RET-88419",
                "Drugs Control Administration, Government of Tamil Nadu",
                "TN",
                "br-kedar-01",
                issue_date_valid,
                expiry_date_valid,
                "VALID",
                "VERIFIED",
                "Assistant Director of Drugs Control (Zone IV)",
                now - timedelta(days=170),
                "https://storage.kedarhealth.com/compliance/pharmacy_license_20b.pdf",
                json.dumps({"pharmacist_in_charge": "R. Sundaram (TN-PC-44120)", "schedule_x_included": False})
            ),
            (
                "lic-fire-01",
                "hosp-kedar",
                "FIRE_SAFETY_NOC",
                "Fire Prevention & Safety Compliance No-Objection Certificate",
                "TN-FRS-NOC-2025-44",
                "Tamil Nadu Fire and Rescue Services Department",
                "TN",
                "br-kedar-01",
                (now - timedelta(days=340)).date(),
                expiry_date_soon,
                "EXPIRING_SOON",
                "VERIFIED",
                "Divisional Fire Officer (South Chennai)",
                now - timedelta(days=330),
                "https://storage.kedarhealth.com/compliance/fire_noc_2025.pdf",
                json.dumps({"smoke_detectors_tested": True, "fire_drills_completed": 2, "renewal_initiated": True})
            ),
            (
                "lic-aerb-01",
                "hosp-kedar",
                "AERB_XRAY_CT",
                "AERB Diagnostic Radiology Equipment Authorization (eLORA)",
                "AERB/DRA/TN-CHE/2024/991",
                "Atomic Energy Regulatory Board (AERB), Govt. of India",
                "IN",
                "br-kedar-01",
                issue_date_valid,
                expiry_date_valid,
                "VALID",
                "VERIFIED",
                "AERB Regional Regulatory Centre (Southern Region)",
                now - timedelta(days=160),
                "https://storage.kedarhealth.com/compliance/aerb_elora_registration.pdf",
                json.dumps({"radiological_safety_officer": "Dr. K. Ramanathan (RSO-1082)", "modalities": ["500mA X-Ray", "16-Slice CT"]})
            ),
            (
                "lic-tnpcb-01",
                "hosp-kedar",
                "TNPCB_BIOMEDICAL_WASTE",
                "Bio-Medical Waste Management Authorization (BMWM Rules)",
                "TNPCB/BMW/CHE/AUTH/2024/302",
                "Tamil Nadu Pollution Control Board (TNPCB)",
                "TN",
                "br-kedar-01",
                issue_date_valid,
                expiry_date_valid,
                "VALID",
                "VERIFIED",
                "District Environmental Engineer (TNPCB Maraimalai Nagar)",
                now - timedelta(days=150),
                "https://storage.kedarhealth.com/compliance/tnpcb_bmw_auth.pdf",
                json.dumps({"cbmwtf_partner": "GJ Multiclave India Pvt Ltd", "barcoded_bags_enabled": True})
            ),
            (
                "lic-nabh-01",
                "hosp-kedar",
                "NABH_ACCREDITATION",
                "NABH Entry-Level Hospital Accreditation Certificate",
                "NABH/HO/PE/2024/5521",
                "National Accreditation Board for Hospitals & Healthcare Providers (NABH)",
                "IN",
                "br-kedar-01",
                issue_date_valid,
                expiry_date_valid,
                "VALID",
                "VERIFIED",
                "NABH Accreditation Committee",
                now - timedelta(days=140),
                "https://storage.kedarhealth.com/compliance/nabh_entry_level.pdf",
                json.dumps({"accreditation_standard": "NABH 5th Edition Standards for Hospitals", "quality_manager": "Dr. Senthil Nathan"})
            )
        ]

        for lic in statutory_licenses:
            cur.execute("""
            INSERT INTO oh_id.hospital_statutory_licenses (
                id, hospital_id, license_category, title, license_number, issuing_authority,
                state_code, facility_branch_id, issue_date, expiry_date, status,
                verification_status, verified_by, verified_at, document_url, metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                license_number = EXCLUDED.license_number,
                issuing_authority = EXCLUDED.issuing_authority,
                status = EXCLUDED.status,
                expiry_date = EXCLUDED.expiry_date,
                updated_at = CURRENT_TIMESTAMP;
            """, lic)
        logger.info("✓ Seeded 6 benchmark statutory licenses for Kedar Hospital")

        # Seed ABDM HFR Facility Registry Mapping
        cur.execute("""
        INSERT INTO oh_id.abdm_facility_registry (
            facility_id, hospital_id, hfr_id, facility_name, facility_type, ownership_type,
            state_code, district, pincode, abdm_m1_status, abdm_m2_status, abdm_m3_status,
            bridge_url, client_id, verification_status, verified_at
        ) VALUES (
            'hfr-kedar-01',
            'hosp-kedar',
            'IN3310008892',
            'Kedar Health Multi-Speciality Hospital',
            'HOSPITAL_SECONDARY',
            'PRIVATE_COMMERCIAL',
            'TN',
            'Chennai',
            '600125',
            'ACTIVE',
            'ACTIVE',
            'ACTIVE',
            'https://abdm-bridge.kedarhealth.com/v0.5',
            'SBX_KEDAR_HFR_008892',
            'VERIFIED_BY_STATE_REGISTRAR',
            CURRENT_TIMESTAMP - INTERVAL '120 days'
        ) ON CONFLICT (facility_id) DO UPDATE SET
            hfr_id = EXCLUDED.hfr_id,
            abdm_m1_status = EXCLUDED.abdm_m1_status,
            abdm_m2_status = EXCLUDED.abdm_m2_status,
            abdm_m3_status = EXCLUDED.abdm_m3_status,
            verification_status = EXCLUDED.verification_status;
        """)
        logger.info("✓ Seeded ABDM HFR mapping (IN3310008892) for Kedar Hospital")

        # Seed HPR Doctor Mappings
        hpr_doctors = [
            (
                "hpr-doc-01",
                "doc-k-01",
                "hosp-kedar",
                "91-8890-4412-1001",
                "Dr. Senthil Nathan",
                "TNMC-78901",
                "Tamil Nadu Medical Council",
                "MODERN_MEDICINE_ALLOPATHY",
                False,
                None,
                "REGISTRATION_EXEMPT_OR_NMC_DOCTOR",
                "VERIFIED",
                now - timedelta(days=150),
                json.dumps({"qualification": "MBBS, MD (General Medicine)", "nmr_uid": "NMR-2012-TNMC-78901"})
            ),
            (
                "hpr-doc-02",
                "doc-k-02",
                "hosp-kedar",
                "91-8890-4412-1002",
                "Dr. Anitha Raman",
                "TNMC-84210",
                "Tamil Nadu Medical Council",
                "MODERN_MEDICINE_ALLOPATHY",
                False,
                None,
                "REGISTRATION_EXEMPT_OR_NMC_DOCTOR",
                "VERIFIED",
                now - timedelta(days=145),
                json.dumps({"qualification": "MBBS, MS (General Surgery)", "nmr_uid": "NMR-2015-TNMC-84210"})
            )
        ]

        for hpr in hpr_doctors:
            cur.execute("""
            INSERT INTO oh_id.abdm_practitioner_registry (
                hpr_mapping_id, doctor_id, hospital_id, hpr_id, doctor_name, council_registration_number,
                registration_council, system_of_medicine, is_allied_health, ncahp_enrolment_id,
                ncahp_status_label, hpr_verification_status, verified_at, metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (hpr_mapping_id) DO UPDATE SET
                hpr_id = EXCLUDED.hpr_id,
                council_registration_number = EXCLUDED.council_registration_number,
                hpr_verification_status = EXCLUDED.hpr_verification_status;
            """, hpr)
        logger.info("✓ Seeded ABDM HPR doctor mappings for Dr. Senthil Nathan and Dr. Anitha Raman")

        # Seed Patient P-101 ABHA Mapping
        cur.execute("""
        INSERT INTO oh_id.patient_abha_mappings (
            mapping_id, patient_id, abha_number, abha_address, link_status,
            auth_method, kyc_status, kyc_verified_at, care_context_count, consent_revoked
        ) VALUES (
            'abha-p101',
            'p-101',
            '91-4421-9982-1044',
            'sathiya.murthy@abdm',
            'LINKED',
            'AADHAAR_OTP',
            'VERIFIED',
            CURRENT_TIMESTAMP - INTERVAL '60 days',
            4,
            FALSE
        ) ON CONFLICT (patient_id) DO UPDATE SET
            abha_number = EXCLUDED.abha_number,
            abha_address = EXCLUDED.abha_address,
            link_status = EXCLUDED.link_status,
            kyc_status = EXCLUDED.kyc_status;
        """)
        logger.info("✓ Seeded Patient P-101 ABHA linking (sathiya.murthy@abdm)")

        # Seed ABDM Consent Artifacts for P-101
        cur.execute("""
        INSERT INTO oh_id.abdm_consent_artifacts (
            consent_id, patient_id, requester_hospital_id, requester_doctor_id, requester_name,
            provider_hospital_id, provider_hospital_name, purpose_code, purpose_text,
            data_categories, date_range_from, date_range_to, consent_status,
            granted_at, expires_at, digital_signature
        ) VALUES (
            'art-abdm-01',
            'p-101',
            'hosp-kedar',
            'doc-k-01',
            'Dr. Senthil Nathan',
            'hosp-001',
            'Apollo City Hospital - Chennai Central',
            'CARETREAT',
            'Outpatient Consultation & Chronic Diabetes Care Protocol',
            '["OPConsultation", "Prescription", "DiagnosticReport", "DischargeSummary"]'::jsonb,
            CURRENT_DATE - INTERVAL '365 days',
            CURRENT_DATE,
            'GRANTED',
            CURRENT_TIMESTAMP - INTERVAL '15 days',
            CURRENT_TIMESTAMP + INTERVAL '165 days',
            'SHA256withECDSA:MEQCICx6bN1hVl8wK4y8aU9y...'
        ) ON CONFLICT (consent_id) DO UPDATE SET
            consent_status = EXCLUDED.consent_status,
            expires_at = EXCLUDED.expires_at;
        """)
        logger.info("✓ Seeded active ABDM electronic consent artifact (art-abdm-01)")

        # Seed DPDP Grievance for Kedar Hospital
        cur.execute("""
        INSERT INTO oh_id.privacy_grievances (
            grievance_id, hospital_id, patient_id, patient_name, patient_mobile,
            grievance_type, description, status, grievance_officer_id,
            grievance_officer_name, resolution_notes, sla_deadline, resolved_at
        ) VALUES (
            'grv-2026-001',
            'hosp-kedar',
            'p-101',
            'Sathiya Murthy',
            '+91 98401 23456',
            'DATA_CORRECTION',
            'Requested update to historical emergency contact phone number and residential address.',
            'RESOLVED',
            'usr-admin-kedar',
            'Kedar Admin (Data Protection Officer)',
            'Demographic verification completed via Aadhaar KYC and hospital records updated accurately in compliance with DPDP Act Section 12.',
            CURRENT_TIMESTAMP - INTERVAL '5 days',
            CURRENT_TIMESTAMP - INTERVAL '6 days'
        ) ON CONFLICT (grievance_id) DO UPDATE SET
            status = EXCLUDED.status,
            resolution_notes = EXCLUDED.resolution_notes;
        """)
        logger.info("✓ Seeded DPDP privacy grievance record (grv-2026-001)")

    logger.info("==========================================================================")
    logger.info("✓ OH-ID India Healthcare Compliance & Governance Migration Completed Successfully!")
    logger.info("==========================================================================")

if __name__ == "__main__":
    migrate_india_compliance_governance()
