"""
Database Migration: Unified Clinical Document Template Management
================================================================
Creates:
1. oh_id.clinical_document_templates (Catalogue for 20 templates across PRESCRIPTION and CLINICAL_REPORT)
2. oh_id.hospital_document_template_settings (Facility-level selection for Rx and Report templates)
3. Extends oh_id.prescriptions with template_id, template_version
4. Extends oh_id.opd_consultations with template_id, template_version, signed_by, signed_at, digital_signature_hash
5. Seeds all 10 Prescription Templates and 10 Clinical Consultation Report Templates
6. Updates views oh_id.vw_prescriptions_full and oh_id.vw_consultation_reports_full
"""

import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/onehealth_db")

# 10 PRESCRIPTION TEMPLATES SEED DATA
PRESCRIPTION_TEMPLATES = [
    {
        "id": "tmpl_rx_classic_hospital",
        "slug": "classic-hospital-rx",
        "name": "Classic Hospital Rx",
        "document_type": "PRESCRIPTION",
        "category": "GENERAL",
        "description": "Traditional tertiary hospital prescription with formal hospital letterhead, complete tabular medication matrix, doctor council registration box, and physical/digital signature stamps.",
        "best_suited_for": "Tertiary care and general hospital outpatient departments (SRMC standard)",
        "is_default": True,
        "layout_config": {
            "style": "classic",
            "primaryColor": "#1E3A8A", # Dark Navy
            "accentColor": "#0284C7",
            "headerStyle": "institutional_banner",
            "showLogo": True,
            "showHospitalCode": True,
            "showVitalsSummary": True,
            "showAllergyAlert": True,
            "medicationLayout": "table",
            "columns": ["medicine", "strength", "dose", "frequency", "route", "duration", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "formal_box",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_modern_clinical",
        "slug": "modern-clinical-rx",
        "name": "Modern Clinical",
        "document_type": "PRESCRIPTION",
        "category": "GENERAL",
        "description": "Clean modern typography, soft rounded cards, slate & royal blue accents, compact vitals pills, and timing glyphs.",
        "best_suited_for": "Multispecialty hospitals and modern polyclinics",
        "is_default": False,
        "layout_config": {
            "style": "modern",
            "primaryColor": "#2563EB", # Healthcare Blue
            "accentColor": "#0D9488",
            "headerStyle": "compact_card",
            "showLogo": True,
            "showHospitalCode": True,
            "showVitalsSummary": True,
            "showAllergyAlert": True,
            "medicationLayout": "cards",
            "columns": ["medicine", "dosage", "frequency", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "verified_badge",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_minimal_opd",
        "slug": "minimal-opd-rx",
        "name": "Minimal OPD",
        "document_type": "PRESCRIPTION",
        "category": "GENERAL",
        "description": "High-density, single-page condensed layout for fast-track outpatient consultations and efficient paper printing.",
        "best_suited_for": "High-volume outpatient clinics and quick routine visits",
        "is_default": False,
        "layout_config": {
            "style": "minimal",
            "primaryColor": "#0F172A",
            "accentColor": "#475569",
            "headerStyle": "minimal_line",
            "showLogo": False,
            "showHospitalCode": False,
            "showVitalsSummary": False,
            "showAllergyAlert": True,
            "medicationLayout": "condensed_rows",
            "columns": ["medicine", "frequency", "duration", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "compact_signature",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_paediatric_care",
        "slug": "paediatric-care-rx",
        "name": "Paediatric Care",
        "document_type": "PRESCRIPTION",
        "category": "PAEDIATRIC",
        "description": "Child-friendly pastel accents with prominent Age (months/years), Weight (kg), parent/guardian details, and syrup/drops liquid dosing indicators.",
        "best_suited_for": "Children's hospitals, paediatric clinics, and neonatal care",
        "is_default": False,
        "layout_config": {
            "style": "paediatric",
            "primaryColor": "#0284C7", # Sky Blue
            "accentColor": "#F59E0B", # Amber
            "headerStyle": "friendly_banner",
            "showLogo": True,
            "showHospitalCode": True,
            "showVitalsSummary": True,
            "highlightWeightAge": True,
            "showGuardianInfo": True,
            "showAllergyAlert": True,
            "medicationLayout": "dosing_cards",
            "columns": ["medicine", "syrup_drops_form", "weight_dose", "frequency", "duration", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "paediatrician_seal",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_general_physician",
        "slug": "general-physician-rx",
        "name": "General Physician",
        "document_type": "PRESCRIPTION",
        "category": "GENERAL",
        "description": "Primary healthcare layout with chief complaints, provisional diagnosis, structured medicines, non-pharmacological lifestyle/diet advice, and review calendar block.",
        "best_suited_for": "General practitioners, family physicians, and community health centers",
        "is_default": False,
        "layout_config": {
            "style": "gp_focus",
            "primaryColor": "#15803D", # Forest Green
            "accentColor": "#16A34A",
            "headerStyle": "standard_header",
            "showLogo": True,
            "showHospitalCode": True,
            "showVitalsSummary": True,
            "showAllergyAlert": True,
            "showLifestyleAdvice": True,
            "medicationLayout": "table",
            "columns": ["medicine", "strength", "dose", "frequency", "duration", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "standard_signature",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_specialist_consultation",
        "slug": "specialist-consultation-rx",
        "name": "Specialist Consultation",
        "document_type": "PRESCRIPTION",
        "category": "SPECIALTY",
        "description": "Specialty clinical layout with sub-specialty department badges (Cardiology, Neurology, Oncology, etc.), differential diagnosis, investigation orders, and multi-drug regimen with indications.",
        "best_suited_for": "Specialist outpatient clinics, super-specialty hospitals, and academic medical centers",
        "is_default": False,
        "layout_config": {
            "style": "specialist",
            "primaryColor": "#4F46E5", # Indigo
            "accentColor": "#7C3AED",
            "headerStyle": "specialty_crest",
            "showLogo": True,
            "showHospitalCode": True,
            "showSpecialtyBadge": True,
            "showVitalsSummary": True,
            "showAllergyAlert": True,
            "showInvestigationOrders": True,
            "medicationLayout": "table",
            "columns": ["medicine", "strength", "frequency", "route", "duration", "indication", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "specialist_credentials",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_chronic_care",
        "slug": "chronic-care-rx",
        "name": "Chronic Care",
        "document_type": "PRESCRIPTION",
        "category": "CHRONIC",
        "description": "Long-term disease management layout with refill counts, continuous treatment schedules, target health markers (BP target, HbA1c target), and scheduled review dates.",
        "best_suited_for": "Hypertension, Diabetes, Endocrine, and Geriatric outpatient clinics",
        "is_default": False,
        "layout_config": {
            "style": "chronic",
            "primaryColor": "#0891B2", # Cyan Teal
            "accentColor": "#0E7490",
            "headerStyle": "care_program_banner",
            "showLogo": True,
            "showHospitalCode": True,
            "showClinicalTargets": True,
            "showRefillInstructions": True,
            "showAllergyAlert": True,
            "medicationLayout": "chronic_table",
            "columns": ["medicine", "strength", "timing", "refills_allowed", "duration", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "care_provider_sign",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_emergency_prescription",
        "slug": "emergency-prescription-rx",
        "name": "Emergency Prescription",
        "document_type": "PRESCRIPTION",
        "category": "EMERGENCY",
        "description": "High-visibility clinical urgency layout with bold emergency red header, high-visibility allergy warning block, and distinct STAT emergency doses vs discharge medications.",
        "best_suited_for": "Emergency departments, trauma units, and acute urgent care",
        "is_default": False,
        "layout_config": {
            "style": "emergency",
            "primaryColor": "#DC2626", # Emergency Red
            "accentColor": "#B91C1C",
            "headerStyle": "emergency_flash",
            "showLogo": True,
            "showHospitalCode": True,
            "showTriageBadge": True,
            "showAllergyAlert": True,
            "separateStatDoses": True,
            "medicationLayout": "priority_blocks",
            "columns": ["category", "medicine", "dose", "route", "timing", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "emergency_physician_stamp",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_digital_eprescription",
        "slug": "digital-eprescription-rx",
        "name": "Digital E-Prescription",
        "document_type": "PRESCRIPTION",
        "category": "DIGITAL",
        "description": "Digital-first healthcare operating system layout with scannable central verification QR, ABDM/ABHA milestone tags, and cryptographic SHA-256 signature fingerprint pill.",
        "best_suited_for": "Digital-first clinics, telemedicine consultations, and ABDM integrated networks",
        "is_default": False,
        "layout_config": {
            "style": "digital",
            "primaryColor": "#0284C7",
            "accentColor": "#10B981",
            "headerStyle": "digital_tech_bar",
            "showLogo": True,
            "showHospitalCode": True,
            "showAbhaBadge": True,
            "showCryptoHashPill": True,
            "showAllergyAlert": True,
            "medicationLayout": "cards",
            "columns": ["medicine", "strength", "dose", "frequency", "duration", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "crypto_digital_seal",
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rx_detailed_clinical",
        "slug": "detailed-clinical-rx",
        "name": "Detailed Clinical Rx",
        "document_type": "PRESCRIPTION",
        "category": "SPECIALTY",
        "description": "Comprehensive tertiary consultation layout with expanded clinical notes, full vitals timeline, concurrent investigations, and detailed medication administration schedule.",
        "best_suited_for": "Complex inpatient discharges, tertiary referral consultations, and oncology regimens",
        "is_default": False,
        "layout_config": {
            "style": "detailed",
            "primaryColor": "#334155", # Slate Dark
            "accentColor": "#2563EB",
            "headerStyle": "comprehensive_header",
            "showLogo": True,
            "showHospitalCode": True,
            "showExpandedNotes": True,
            "showFullVitals": True,
            "showAllergyAlert": True,
            "medicationLayout": "table",
            "columns": ["item_no", "medicine", "strength", "dosage_form", "frequency", "route", "duration", "qty", "instructions"],
            "showQrVerification": True,
            "signatureStyle": "comprehensive_signoff",
            "paperSize": "A4_PORTRAIT"
        }
    }
]

# 10 CLINICAL CONSULTATION REPORT TEMPLATES SEED DATA
CLINICAL_REPORT_TEMPLATES = [
    {
        "id": "tmpl_rep_classic_hospital",
        "slug": "classic-hospital-clinical-report",
        "name": "Classic Hospital Clinical Report",
        "document_type": "CLINICAL_REPORT",
        "category": "GENERAL",
        "description": "Formal institutional hospital report with crest, complete history of present illness (HPI), systemic physical examination, diagnostic summary, and clinical management plan.",
        "best_suited_for": "Tertiary hospitals, formal clinical consult notes, and official medicolegal documentation",
        "is_default": True,
        "layout_config": {
            "style": "classic",
            "primaryColor": "#1E3A8A", # Dark Navy
            "accentColor": "#0284C7",
            "headerStyle": "institutional_banner",
            "showLogo": True,
            "sections": [
                "patient_encounter_info",
                "chief_complaint",
                "history_present_illness",
                "allergies_and_alerts",
                "vitals_dashboard",
                "physical_examination",
                "diagnostic_assessment",
                "management_plan",
                "advice_and_followup",
                "clinician_signoff"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_modern_clinical",
        "slug": "modern-clinical-consultation",
        "name": "Modern Clinical Consultation",
        "document_type": "CLINICAL_REPORT",
        "category": "GENERAL",
        "description": "Clean card-based visual hierarchy with vitals radar/pills, categorized assessment cards, investigation order badges, and highlighted treatment goals.",
        "best_suited_for": "Modern multispecialty outpatient consultations and ambulatory centers",
        "is_default": False,
        "layout_config": {
            "style": "modern",
            "primaryColor": "#2563EB",
            "accentColor": "#0D9488",
            "headerStyle": "compact_card",
            "showLogo": True,
            "sections": [
                "encounter_badge_row",
                "vitals_radar_pills",
                "chief_complaint_card",
                "clinical_assessment_card",
                "investigation_orders_pills",
                "treatment_plan_card",
                "review_schedule_badge",
                "clinician_signature_seal"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_minimal_opd",
        "slug": "minimal-opd-consultation",
        "name": "Minimal OPD Consultation",
        "document_type": "CLINICAL_REPORT",
        "category": "GENERAL",
        "description": "Condensed single-sheet encounter brief with chief complaint, focused physical findings, primary ICD-10 diagnosis, key clinical advice, and next visit date.",
        "best_suited_for": "High-volume walk-in OPD consultations and rapid follow-up assessments",
        "is_default": False,
        "layout_config": {
            "style": "minimal",
            "primaryColor": "#0F172A",
            "accentColor": "#475569",
            "headerStyle": "minimal_line",
            "showLogo": False,
            "sections": [
                "compact_header",
                "complaint_and_vitals_row",
                "focused_exam_notes",
                "icd10_diagnosis_pill",
                "clinical_advice_list",
                "followup_date_line",
                "compact_signoff"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_paediatric_clinical",
        "slug": "paediatric-clinical-report",
        "name": "Paediatric Clinical Report",
        "document_type": "CLINICAL_REPORT",
        "category": "PAEDIATRIC",
        "description": "Specialized pediatric developmental layout with birth/growth metrics (weight percentile, height, head circumference), immunization status, developmental milestones, and pediatric exam notes.",
        "best_suited_for": "Paediatric clinics, child development assessments, and well-baby checkups",
        "is_default": False,
        "layout_config": {
            "style": "paediatric",
            "primaryColor": "#0284C7",
            "accentColor": "#F59E0B",
            "headerStyle": "friendly_banner",
            "showLogo": True,
            "sections": [
                "child_and_parent_info",
                "growth_metrics_dashboard",
                "immunization_milestones",
                "chief_complaint_notes",
                "paediatric_systemic_exam",
                "assessment_and_feeding_advice",
                "next_vaccine_visit",
                "paediatrician_signoff"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_general_physician",
        "slug": "general-physician-consultation",
        "name": "General Physician Consultation",
        "document_type": "CLINICAL_REPORT",
        "category": "GENERAL",
        "description": "Comprehensive primary care evaluation including review of systems (ROS), lifestyle factors, preventative counseling, clinical impression, and follow-up schedule.",
        "best_suited_for": "Primary care physicians, annual medical wellness reviews, and internal medicine clinics",
        "is_default": False,
        "layout_config": {
            "style": "gp_focus",
            "primaryColor": "#15803D",
            "accentColor": "#16A34A",
            "headerStyle": "standard_header",
            "showLogo": True,
            "sections": [
                "patient_banner",
                "chief_complaints_timeline",
                "vitals_and_bmi_panel",
                "review_of_systems",
                "clinical_impression",
                "preventative_counseling",
                "followup_milestone",
                "physician_signature"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_specialist_consultation",
        "slug": "specialist-consultation-report",
        "name": "Specialist Consultation Report",
        "document_type": "CLINICAL_REPORT",
        "category": "SPECIALTY",
        "description": "Specialized clinical evaluation with specialty department header, referring doctor details, clinical examination findings, multi-tier differential diagnoses, and advanced investigation workup.",
        "best_suited_for": "Specialist referrals, tertiary consultations, and second opinion reports",
        "is_default": False,
        "layout_config": {
            "style": "specialist",
            "primaryColor": "#4F46E5",
            "accentColor": "#7C3AED",
            "headerStyle": "specialty_crest",
            "showLogo": True,
            "sections": [
                "specialist_letterhead",
                "referral_context_box",
                "detailed_history_and_findings",
                "differential_diagnoses_tier",
                "investigation_workup_plan",
                "specialty_management_plan",
                "next_review_clinic",
                "specialist_signature_block"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_chronic_disease",
        "slug": "chronic-disease-review-report",
        "name": "Chronic Disease Review Report",
        "document_type": "CLINICAL_REPORT",
        "category": "CHRONIC",
        "description": "Longitudinal disease monitoring layout with disease trajectory timeline, vital trends (BP, Glycemic index), target threshold comparison, organ system risk assessment, and medication compliance.",
        "best_suited_for": "Chronic disease management programs (Hypertension, Diabetes, CKD, COPD)",
        "is_default": False,
        "layout_config": {
            "style": "chronic",
            "primaryColor": "#0891B2",
            "accentColor": "#0E7490",
            "headerStyle": "care_program_banner",
            "showLogo": True,
            "sections": [
                "program_enrollment_header",
                "longitudinal_markers_panel",
                "compliance_and_lifestyle_score",
                "organ_risk_assessment",
                "adjusted_treatment_goals",
                "monitoring_orders",
                "scheduled_review_box",
                "care_team_signoff"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_emergency_assessment",
        "slug": "emergency-clinical-assessment",
        "name": "Emergency Clinical Assessment",
        "document_type": "CLINICAL_REPORT",
        "category": "EMERGENCY",
        "description": "Triage and acute urgent care summary with triage acuity level (Red/Yellow/Green), immediate interventions performed, Glasgow Coma Scale / vitals on arrival, and admission/transfer disposition.",
        "best_suited_for": "Emergency room intakes, trauma encounters, and rapid clinical stabilizations",
        "is_default": False,
        "layout_config": {
            "style": "emergency",
            "primaryColor": "#DC2626",
            "accentColor": "#B91C1C",
            "headerStyle": "emergency_flash",
            "showLogo": True,
            "sections": [
                "triage_acuity_banner",
                "arrival_vitals_and_gcs",
                "urgent_interventions_performed",
                "trauma_exam_findings",
                "emergency_diagnosis",
                "disposition_decision", # ADMIT_IPD, DISCHARGE, TRANSFER
                "emergency_physician_stamp"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_digital_clinical",
        "slug": "digital-clinical-report",
        "name": "Digital Clinical Report",
        "document_type": "CLINICAL_REPORT",
        "category": "DIGITAL",
        "description": "Telehealth and digital health record layout with telehealth session metadata, remote monitoring vitals, digital verification seal, ABDM encounter identifier, and paperless electronic signing details.",
        "best_suited_for": "Telehealth encounters, virtual outpatient clinics, and digital-first health platforms",
        "is_default": False,
        "layout_config": {
            "style": "digital",
            "primaryColor": "#0284C7",
            "accentColor": "#10B981",
            "headerStyle": "digital_tech_bar",
            "showLogo": True,
            "sections": [
                "telehealth_session_metadata",
                "remote_vitals_summary",
                "patient_reported_concerns",
                "clinical_impression_and_advice",
                "abdm_milestone_badge",
                "digital_verification_seal",
                "electronic_signature_audit"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    },
    {
        "id": "tmpl_rep_detailed_evaluation",
        "slug": "detailed-clinical-evaluation",
        "name": "Detailed Clinical Evaluation",
        "document_type": "CLINICAL_REPORT",
        "category": "SPECIALTY",
        "description": "Comprehensive tertiary consultation layout with in-depth past medical/surgical history, detailed multisystem physical examination, lab/imaging review, and multidisciplinary care team recommendations.",
        "best_suited_for": "Tertiary hospital admissions, multi-specialty tumor boards, and complex diagnostic evaluations",
        "is_default": False,
        "layout_config": {
            "style": "detailed",
            "primaryColor": "#334155",
            "accentColor": "#2563EB",
            "headerStyle": "comprehensive_header",
            "showLogo": True,
            "sections": [
                "comprehensive_patient_header",
                "past_medical_surgical_history",
                "multisystem_physical_exam",
                "diagnostic_investigations_review",
                "multidisciplinary_assessment",
                "care_pathway_plan",
                "discharge_or_followup_criteria",
                "attending_physician_signoff"
            ],
            "showQrVerification": True,
            "paperSize": "A4_PORTRAIT"
        }
    }
]


def run_migration():
    print(f"Connecting to database: {DATABASE_URL.split('@')[-1]}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        print("\n--- 1. Creating Table: oh_id.clinical_document_templates ---")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.clinical_document_templates (
                id VARCHAR(64) PRIMARY KEY,
                slug VARCHAR(64) UNIQUE NOT NULL,
                name VARCHAR(128) NOT NULL,
                document_type VARCHAR(32) NOT NULL, -- 'PRESCRIPTION' or 'CLINICAL_REPORT'
                category VARCHAR(64) NOT NULL,      -- 'GENERAL', 'SPECIALTY', 'PAEDIATRIC', 'CHRONIC', 'EMERGENCY', 'DIGITAL'
                description TEXT,
                best_suited_for VARCHAR(255),
                layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
                version INT NOT NULL DEFAULT 1,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_cdt_doctype_active ON oh_id.clinical_document_templates (document_type, is_active);
        """)
        print("[OK] Table oh_id.clinical_document_templates created.")

        print("\n--- 2. Creating Table: oh_id.hospital_document_template_settings ---")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospital_document_template_settings (
                hospital_id VARCHAR(64) PRIMARY KEY REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                rx_template_id VARCHAR(64) REFERENCES oh_id.clinical_document_templates(id),
                rx_template_version INT NOT NULL DEFAULT 1,
                clinical_report_template_id VARCHAR(64) REFERENCES oh_id.clinical_document_templates(id),
                clinical_report_template_version INT NOT NULL DEFAULT 1,
                custom_header_text TEXT,
                custom_footer_notes TEXT,
                show_hospital_logo BOOLEAN NOT NULL DEFAULT TRUE,
                updated_by VARCHAR(128),
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("[OK] Table oh_id.hospital_document_template_settings created.")

        print("\n--- 3. Extending oh_id.prescriptions Table ---")
        cur.execute("""
            ALTER TABLE oh_id.prescriptions
            ADD COLUMN IF NOT EXISTS template_id VARCHAR(64) REFERENCES oh_id.clinical_document_templates(id),
            ADD COLUMN IF NOT EXISTS template_version INT DEFAULT 1;
        """)
        print("[OK] oh_id.prescriptions extended with template_id, template_version.")

        print("\n--- 4. Extending oh_id.opd_consultations Table ---")
        cur.execute("""
            ALTER TABLE oh_id.opd_consultations
            ADD COLUMN IF NOT EXISTS template_id VARCHAR(64) REFERENCES oh_id.clinical_document_templates(id),
            ADD COLUMN IF NOT EXISTS template_version INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS signed_by VARCHAR(128),
            ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS digital_signature_hash VARCHAR(128);
        """)
        print("[OK] oh_id.opd_consultations extended with template and signature fields.")

        print("\n--- 5. Seeding All 20 Templates (10 Rx + 10 Clinical Reports) ---")
        all_templates = PRESCRIPTION_TEMPLATES + CLINICAL_REPORT_TEMPLATES
        for tmpl in all_templates:
            cur.execute("""
                INSERT INTO oh_id.clinical_document_templates (
                    id, slug, name, document_type, category, description,
                    best_suited_for, layout_config, version, is_active, is_default, updated_at
                ) VALUES (
                    %(id)s, %(slug)s, %(name)s, %(document_type)s, %(category)s, %(description)s,
                    %(best_suited_for)s, %(layout_config)s, 1, TRUE, %(is_default)s, CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    slug = EXCLUDED.slug,
                    document_type = EXCLUDED.document_type,
                    category = EXCLUDED.category,
                    description = EXCLUDED.description,
                    best_suited_for = EXCLUDED.best_suited_for,
                    layout_config = EXCLUDED.layout_config,
                    is_active = EXCLUDED.is_active,
                    is_default = EXCLUDED.is_default,
                    updated_at = CURRENT_TIMESTAMP;
            """, {
                **tmpl,
                "layout_config": json.dumps(tmpl["layout_config"])
            })
        print(f"[OK] {len(all_templates)} templates seeded/verified.")

        print("\n--- 6. Initializing Default Hospital Settings for Existing Hospitals ---")
        cur.execute("""
            INSERT INTO oh_id.hospital_document_template_settings (
                hospital_id, rx_template_id, rx_template_version,
                clinical_report_template_id, clinical_report_template_version,
                updated_by, updated_at
            )
            SELECT 
                h.id,
                'tmpl_rx_classic_hospital', 1,
                'tmpl_rep_classic_hospital', 1,
                'system_init', CURRENT_TIMESTAMP
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id) DO NOTHING;
        """)
        print("[OK] Hospital template defaults initialized.")

        print("\n--- 7. Recreating View: oh_id.vw_prescriptions_full ---")
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_prescriptions_full CASCADE;

            CREATE VIEW oh_id.vw_prescriptions_full AS
            SELECT 
                p.id,
                p.consultation_id,
                p.visit_id,
                p.encounter_id,
                p.patient_id,
                pat.name AS patient_name,
                pat.onehealth_id,
                pat.age AS patient_age,
                pat.gender AS patient_gender,
                pat.blood_group AS patient_blood_group,
                pat.phone AS patient_phone,
                pat.dob AS patient_dob,
                p.doctor_id,
                doc.name AS doctor_name,
                doc.specialty AS doctor_specialty,
                doc.registration_number AS doctor_registration,
                doc.registration_authority AS doctor_registration_authority,
                COALESCE(doc.qualification, 'MBBS, MD') AS doctor_qualification,
                COALESCE(p.hospital_id, doc.hospital_id, pat.hospital_id, 'hosp-kedar') AS hospital_id,
                hosp.name AS hospital_name,
                hosp.code AS hospital_code,
                hosp.address AS hospital_address,
                hosp.area AS hospital_area,
                hosp.city AS hospital_city,
                hosp.pin_code AS hospital_pin_code,
                hosp.phone AS hospital_phone,
                hosp.email AS hospital_email,
                p.diagnosis,
                p.chief_complaint,
                p.clinical_advice,
                p.instructions,
                p.doctor_notes,
                p.follow_up_days,
                p.follow_up_date,
                p.follow_up_appointment_id,
                p.status,
                p.valid_from,
                p.valid_until,
                p.validity_type,
                p.validity_source,
                p.validity_period_not_specified,
                p.finalized_at,
                p.superseded_by_id,
                p.superseded_at,
                p.supersession_reason,
                p.parent_prescription_id,
                p.vitals_snapshot,
                p.allergies_snapshot,
                p.cancellation_reason,
                p.cancelled_at,
                p.cancelled_by,
                p.is_patient_visible,
                p.requires_pin,
                p.verification_token,
                p.signed_by,
                p.signed_at,
                p.digital_signature_hash,
                p.created_by,
                p.created_at,
                p.updated_at,
                p.version,
                -- Template association
                COALESCE(p.template_id, 'tmpl_rx_classic_hospital') AS template_id,
                COALESCE(p.template_version, 1) AS template_version,
                COALESCE(tmpl.name, 'Classic Hospital Rx') AS template_name,
                COALESCE(tmpl.layout_config, '{}'::jsonb) AS template_layout_config,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', pi.id,
                                'medicine_name', pi.medicine_name,
                                'generic_name', pi.generic_name,
                                'brand_name', pi.brand_name,
                                'strength', pi.strength,
                                'dosage_form', pi.dosage_form,
                                'route', pi.route,
                                'dose', pi.dose,
                                'frequency', pi.frequency,
                                'duration_days', pi.duration_days,
                                'food_instruction', pi.food_instruction,
                                'specific_instructions', pi.specific_instructions,
                                'quantity', pi.quantity
                            )
                        )
                        FROM oh_id.prescription_items pi
                        WHERE pi.prescription_id = p.id
                    ),
                    '[]'::json
                ) AS items
            FROM oh_id.prescriptions p
            LEFT JOIN oh_id.patients pat ON p.patient_id = pat.id
            LEFT JOIN oh_id.doctors doc ON p.doctor_id = doc.id
            LEFT JOIN oh_id.hospitals hosp ON COALESCE(p.hospital_id, doc.hospital_id, pat.hospital_id, 'hosp-kedar') = hosp.id
            LEFT JOIN oh_id.clinical_document_templates tmpl ON p.template_id = tmpl.id;
        """)
        print("[OK] View oh_id.vw_prescriptions_full updated.")

        print("\n--- 8. Creating View: oh_id.vw_consultation_reports_full ---")
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_consultation_reports_full CASCADE;

            CREATE VIEW oh_id.vw_consultation_reports_full AS
            SELECT 
                c.id,
                c.appointment_id,
                c.patient_id,
                pat.name AS patient_name,
                pat.onehealth_id,
                pat.age AS patient_age,
                pat.gender AS patient_gender,
                pat.blood_group AS patient_blood_group,
                pat.phone AS patient_phone,
                pat.dob AS patient_dob,
                c.doctor_id,
                doc.name AS doctor_name,
                doc.specialty AS doctor_specialty,
                doc.registration_number AS doctor_registration,
                doc.registration_authority AS doctor_registration_authority,
                COALESCE(doc.qualification, 'MBBS, MD') AS doctor_qualification,
                COALESCE(doc.hospital_id, pat.hospital_id, 'hosp-kedar') AS hospital_id,
                hosp.name AS hospital_name,
                hosp.code AS hospital_code,
                hosp.address AS hospital_address,
                hosp.phone AS hospital_phone,
                hosp.email AS hospital_email,
                c.symptoms,
                c.diagnosis,
                c.clinical_notes,
                c.vitals,
                c.signed_by,
                c.signed_at,
                c.digital_signature_hash,
                c.created_at,
                -- Template association
                COALESCE(c.template_id, 'tmpl_rep_classic_hospital') AS template_id,
                COALESCE(c.template_version, 1) AS template_version,
                COALESCE(tmpl.name, 'Classic Hospital Clinical Report') AS template_name,
                COALESCE(tmpl.layout_config, '{}'::jsonb) AS template_layout_config,
                -- Linked prescription reference
                pr.id AS linked_prescription_id,
                pr.status AS linked_prescription_status
            FROM oh_id.opd_consultations c
            LEFT JOIN oh_id.patients pat ON c.patient_id = pat.id
            LEFT JOIN oh_id.doctors doc ON c.doctor_id = doc.id
            LEFT JOIN oh_id.hospitals hosp ON COALESCE(doc.hospital_id, pat.hospital_id, 'hosp-kedar') = hosp.id
            LEFT JOIN oh_id.clinical_document_templates tmpl ON c.template_id = tmpl.id
            LEFT JOIN oh_id.prescriptions pr ON pr.consultation_id = c.id;
        """)
        print("[OK] View oh_id.vw_consultation_reports_full created.")

        conn.commit()
        print("\n>>> MIGRATION SUCCESSFUL! All 20 templates and hospital settings are active. <<<")
    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()

