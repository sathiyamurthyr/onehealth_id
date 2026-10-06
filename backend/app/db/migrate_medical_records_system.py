"""
Database Migration and Seed Script for OH-ID Unified Medical Records & Documents System.
Implements:
1. oh_id.document_requests table for doctor-patient document requests
2. Enhanced oh_id.medical_documents schema with clinical review & verification tracking
3. oh_id.consultation_document_attachments for linking documents to consultation encounters
4. oh_id.vw_medical_documents_full & oh_id.vw_doctor_document_inbox views
5. Rich multi-hospital benchmark records & realistic workflow test fixtures
"""

import os
import sys
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath("."))
from backend.app.database.session import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration.medical_records_system")

def run_migration():
    logger.info("Starting migration for Unified Medical Records & Documents System...")
    with get_db_cursor() as cur:
        # 1. Document Requests Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.document_requests (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
                branch_id VARCHAR(64),
                requested_by_doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
                requested_by_name VARCHAR(150) NOT NULL,
                document_type VARCHAR(64) NOT NULL, -- IMAGING_REPORT, PREVIOUS_PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY, OTHER
                title VARCHAR(200) NOT NULL,
                instructions TEXT,
                urgency VARCHAR(20) DEFAULT 'ROUTINE', -- ROUTINE, URGENT, STAT
                status VARCHAR(30) DEFAULT 'PENDING',  -- PENDING, UPLOADED, REVIEWED, CANCELLED
                fulfilled_document_id VARCHAR(64),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_doc_req_patient ON oh_id.document_requests(patient_id);
            CREATE INDEX IF NOT EXISTS idx_doc_req_doctor ON oh_id.document_requests(requested_by_doctor_id);
            CREATE INDEX IF NOT EXISTS idx_doc_req_status ON oh_id.document_requests(status);
        """)

        # 2. Enhanced oh_id.medical_documents columns
        cur.execute("""
            ALTER TABLE oh_id.medical_documents 
            ADD COLUMN IF NOT EXISTS document_code VARCHAR(64),
            ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(64),
            ADD COLUMN IF NOT EXISTS created_by VARCHAR(64),
            ADD COLUMN IF NOT EXISTS verified_by VARCHAR(64),
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(64),
            ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS review_notes TEXT,
            ADD COLUMN IF NOT EXISTS related_visit_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS related_appointment_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS related_order_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS related_prescription_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS related_request_id VARCHAR(64) REFERENCES oh_id.document_requests(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'AVAILABLE',
            ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) DEFAULT 'HOSPITAL',
            ADD COLUMN IF NOT EXISTS source_label VARCHAR(150),
            ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'PDF',
            ADD COLUMN IF NOT EXISTS file_size_kb INT DEFAULT 250,
            ADD COLUMN IF NOT EXISTS file_hash VARCHAR(128),
            ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS verification_token VARCHAR(128),
            ADD COLUMN IF NOT EXISTS digital_signature TEXT,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        """)

        # 3. Consultation Document Attachments
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.consultation_document_attachments (
                id VARCHAR(64) PRIMARY KEY,
                consultation_id VARCHAR(64) NOT NULL,
                document_id VARCHAR(64) NOT NULL REFERENCES oh_id.medical_documents(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                doctor_id VARCHAR(64),
                clinical_context TEXT,
                attached_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_consultation_doc UNIQUE (consultation_id, document_id)
            );
            CREATE INDEX IF NOT EXISTS idx_cda_consultation ON oh_id.consultation_document_attachments(consultation_id);
            CREATE INDEX IF NOT EXISTS idx_cda_doc ON oh_id.consultation_document_attachments(document_id);
            CREATE INDEX IF NOT EXISTS idx_cda_patient ON oh_id.consultation_document_attachments(patient_id);
        """)

        # 4. Master View: oh_id.vw_medical_documents_full
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_medical_documents_full CASCADE;
            CREATE OR REPLACE VIEW oh_id.vw_medical_documents_full AS
            SELECT 
                md.id,
                md.document_code,
                md.patient_id,
                p.name AS patient_name,
                p.onehealth_id,
                p.gender AS patient_gender,
                p.dob AS patient_dob,
                p.phone AS patient_phone,
                md.hospital_id,
                COALESCE(h.name, md.source_label, 'Healthcare Facility') AS hospital_name,
                h.code AS hospital_code,
                h.city AS hospital_city,
                h.state AS hospital_state,
                md.branch_id,
                md.doctor_id,
                COALESCE(d.name, (md.metadata->>'doctor_name'), (md.metadata->>'consultant'), 'Attending Clinician') AS doctor_name,
                d.specialty AS doctor_specialty,
                COALESCE(md.department, d.specialty, 'General Medicine') AS department,
                md.title,
                md.category,
                md.status,
                md.source_type,
                COALESCE(md.source_label, h.name, 'Healthcare Provider') AS source_label,
                md.uploaded_by,
                md.created_by,
                md.verified_by,
                md.verified_at,
                md.reviewed_by,
                md.reviewed_at,
                md.review_notes,
                rev_doc.name AS reviewed_by_doctor_name,
                md.related_visit_id,
                md.related_appointment_id,
                md.related_order_id,
                md.related_prescription_id,
                md.related_request_id,
                dr.title AS request_title,
                md.file_type,
                md.file_size_kb,
                md.file_hash,
                md.document_date,
                md.reference_id,
                md.visit_id,
                md.notes,
                md.tags,
                md.metadata,
                md.images,
                md.verification_token,
                md.digital_signature,
                md.created_at,
                md.updated_at
            FROM oh_id.medical_documents md
            LEFT JOIN oh_id.patients p ON md.patient_id = p.id
            LEFT JOIN oh_id.hospitals h ON md.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON md.doctor_id = d.id
            LEFT JOIN oh_id.doctors rev_doc ON md.reviewed_by = rev_doc.id
            LEFT JOIN oh_id.document_requests dr ON md.related_request_id = dr.id;
        """)

        # 5. Doctor Document Inbox View: oh_id.vw_doctor_document_inbox
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_doctor_document_inbox CASCADE;
            CREATE OR REPLACE VIEW oh_id.vw_doctor_document_inbox AS
            SELECT 
                md.id AS document_id,
                md.document_code,
                md.patient_id,
                p.name AS patient_name,
                p.onehealth_id,
                p.phone AS patient_phone,
                md.hospital_id,
                h.name AS hospital_name,
                md.doctor_id,
                d.name AS doctor_name,
                md.title,
                md.category,
                md.status,
                md.source_type,
                md.source_label,
                md.uploaded_by,
                md.reviewed_by,
                md.reviewed_at,
                md.review_notes,
                md.related_request_id,
                dr.title AS request_title,
                dr.instructions AS request_instructions,
                dr.urgency AS request_urgency,
                md.document_date,
                md.file_type,
                md.file_size_kb,
                md.created_at,
                CASE 
                    WHEN md.status = 'UPLOADED' AND (md.source_type IN ('PATIENT', 'EXTERNAL_PROVIDER') OR md.related_request_id IS NOT NULL) THEN 'AWAITING_REVIEW'
                    WHEN md.source_type = 'PATIENT' THEN 'PATIENT_UPLOADED'
                    WHEN md.status IN ('VERIFIED', 'AVAILABLE') AND md.source_type IN ('HOSPITAL', 'DOCTOR', 'LAB') THEN 'VERIFIED_OFFICIAL'
                    ELSE 'GENERAL'
                END AS triage_bucket
            FROM oh_id.medical_documents md
            LEFT JOIN oh_id.patients p ON md.patient_id = p.id
            LEFT JOIN oh_id.hospitals h ON md.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON md.doctor_id = d.id
            LEFT JOIN oh_id.document_requests dr ON md.related_request_id = dr.id;
        """)

        logger.info("Views created. Now seeding document requests and benchmark records...")

        # 6. Seed Document Requests
        seed_requests = [
            {
                "id": "req-doc-001",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "branch-kedar-main",
                "requested_by_doctor_id": "doc-arun-kumar",
                "requested_by_name": "Dr. Arun Kumar, MD",
                "document_type": "IMAGING_REPORT",
                "title": "Previous 1.5T Lumbar Spine MRI Scan & Radiologist Report",
                "instructions": "Please upload the complete MRI report with disc sequence details from your previous scan at ABC Diagnostics for neurological evaluation.",
                "urgency": "URGENT",
                "status": "PENDING",
                "fulfilled_document_id": None,
                "created_at": datetime.now(timezone.utc) - timedelta(days=2)
            },
            {
                "id": "req-doc-002",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "branch-kedar-main",
                "requested_by_doctor_id": "doc-k-01",
                "requested_by_name": "Dr. Senthil Nathan, DM",
                "document_type": "PREVIOUS_LAB_REPORT",
                "title": "Historical HbA1c & Fasting Lipid Panel (Past 6 Months)",
                "instructions": "Please provide previous glycemic records from 2025/2026 to correlate with current metabolic therapy.",
                "urgency": "ROUTINE",
                "status": "UPLOADED",
                "fulfilled_document_id": "doc-bench-09",
                "created_at": datetime.now(timezone.utc) - timedelta(days=5)
            }
        ]

        for req in seed_requests:
            cur.execute("""
                INSERT INTO oh_id.document_requests (
                    id, patient_id, hospital_id, branch_id, requested_by_doctor_id, requested_by_name,
                    document_type, title, instructions, urgency, status, fulfilled_document_id, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status,
                    fulfilled_document_id = EXCLUDED.fulfilled_document_id,
                    instructions = EXCLUDED.instructions;
            """, (
                req["id"], req["patient_id"], req["hospital_id"], req["branch_id"],
                req["requested_by_doctor_id"], req["requested_by_name"], req["document_type"],
                req["title"], req["instructions"], req["urgency"], req["status"],
                req["fulfilled_document_id"], req["created_at"]
            ))

        # 7. Seed Diverse Multi-Source Documents
        seed_documents = [
            # Doc 1: Official Discharge Summary (Hospital Provider Record)
            {
                "id": "doc-bench-01",
                "document_code": "DIS-20261002-0004",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "branch-kedar-main",
                "doctor_id": "doc-arun-kumar",
                "title": "Hospital Inpatient Discharge Summary — Acute Coronary Care",
                "category": "DISCHARGE_SUMMARY",
                "department": "Inpatient Cardiology",
                "status": "AVAILABLE",
                "source_type": "HOSPITAL",
                "source_label": "Kedar Hospital",
                "uploaded_by": "user-hospadmin",
                "created_by": "doc-arun-kumar",
                "verified_by": "doc-arun-kumar",
                "verified_at": datetime.now(timezone.utc) - timedelta(days=2),
                "reviewed_by": "doc-arun-kumar",
                "reviewed_at": datetime.now(timezone.utc) - timedelta(days=2),
                "review_notes": "Official hospital discharge documentation sealed and validated.",
                "file_type": "PDF",
                "file_size_kb": 348,
                "document_date": "2026-10-02",
                "reference_id": "ADM-20260929-0012",
                "visit_id": "VIS-20261002-00125",
                "notes": "Patient admitted on 29 Sep 2026 with atypical chest discomfort. Successfully stabilized and discharged with dual antiplatelet regimen.",
                "tags": ["Cardiology", "Inpatient", "Discharge Summary", "Coronary Care"],
                "metadata": {
                    "admission_date": "2026-09-29T10:00:00Z",
                    "discharge_date": "2026-10-02T14:30:00Z",
                    "admission_type": "EMERGENCY",
                    "bed_room": "ICU-Bed 04 / Room 302",
                    "admitting_diagnosis": "Unstable Angina / Atypical Angina Pectoris (ICD-10 I20.0)",
                    "discharge_diagnosis": "Coronary Artery Disease with Moderate LAD Stenosis, Controlled Type 2 Diabetes",
                    "procedures_performed": [
                        {"name": "Diagnostic Coronary Angiography", "date": "2026-09-30", "findings": "50-60% mid-LAD plaque, non-critical, managed medically."},
                        {"name": "2D Echocardiography", "date": "2026-09-29", "findings": "LVEF 58%, normal LV wall motion, mild diastolic dysfunction."}
                    ],
                    "discharge_condition": "Hemodynamically Stable, Afebrile, Pain-Free",
                    "discharge_medications": [
                        "Tab. Ecosprin 75mg once daily after lunch",
                        "Tab. Atorvastatin 40mg once daily at bedtime",
                        "Tab. Metoprolol Succinate ER 25mg once daily morning"
                    ],
                    "dietary_lifestyle_advice": "Low salt (<3g/day), low saturated fat diet. Supervised brisk walking 30 mins daily starting next week.",
                    "follow_up": "Cardiology Outpatient Clinic on 16 Oct 2026 with repeat lipid profile.",
                    "doctor_name": "Dr. Arun Kumar, MD, DM (Cardiology)",
                    "doctor_reg_no": "TMC-49281-2012"
                },
                "images": [],
                "verification_token": "vtok-doc-dis-20261002-0004",
                "digital_signature": "SHA256:8f4c2e9b01a67384de9f120cbacde982103847291a0cde839201fba9c8e71620"
            },
            # Doc 2: Official Lab Report (Lab Generated & Pathologist Verified)
            {
                "id": "doc-bench-02",
                "document_code": "LAB-20261002-00125",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "branch-kedar-main",
                "doctor_id": "doc-arun-kumar",
                "title": "Complete Blood Count (CBC) Laboratory Diagnostic Report",
                "category": "LAB_REPORT",
                "department": "Diagnostic Pathology",
                "status": "VERIFIED",
                "source_type": "LAB",
                "source_label": "Kedar Central Pathology Laboratory",
                "uploaded_by": "user-labtech",
                "created_by": "user-labtech",
                "verified_by": "doc-arun-kumar",
                "verified_at": datetime.now(timezone.utc) - timedelta(days=2),
                "reviewed_by": "doc-arun-kumar",
                "reviewed_at": datetime.now(timezone.utc) - timedelta(days=2),
                "review_notes": "Hematology counts fully consistent with post-acute recovery; no leukocytosis or anemia.",
                "file_type": "PDF",
                "file_size_kb": 286,
                "document_date": "2026-10-02",
                "reference_id": "lo-cbc-01",
                "visit_id": "VIS-20261002-00125",
                "notes": "18 parameters analyzed via 5-part automated cell counter. All parameters within standard reference intervals.",
                "tags": ["Hematology", "CBC", "Laboratory", "Blood Test"],
                "metadata": {
                    "sample_type": "Whole Blood (EDTA)",
                    "collected_at": "2026-10-02T08:15:00Z",
                    "reported_at": "2026-10-02T14:30:00Z",
                    "total_parameters": 18,
                    "within_range_count": 18,
                    "outside_range_count": 0,
                    "critical_count": 0,
                    "key_values": {
                        "Hemoglobin": "13.8 g/dL (Ref: 13.0 - 17.0)",
                        "Total WBC Count": "7,200 /µL (Ref: 4,000 - 11,000)",
                        "Platelet Count": "250,000 /µL (Ref: 150,000 - 450,000)",
                        "Hematocrit (PCV)": "42.1 % (Ref: 38.0 - 50.0)"
                    },
                    "pathologist": "Dr. R. Meenakshi Sundaram, MD (Pathology)",
                    "accreditation": "NABL ISO 15189:2022 Accredited"
                },
                "images": [],
                "verification_token": "vtok-lab-20261002-00125",
                "digital_signature": "SHA256:7a9f1c3e04b58291df8c210abedcf871204938182b0def928310fba8c9e62519"
            },
            # Doc 3: Patient Uploaded Unverified Record ("Uploaded by You — Not verified by healthcare provider")
            {
                "id": "doc-bench-09",
                "document_code": "DOC-UP-20260922-001",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "branch-kedar-main",
                "doctor_id": None,
                "title": "Previous 12-Lead Resting ECG Strip from Outstation Health Check",
                "category": "PREVIOUS_LAB_REPORT",
                "department": "Personal Health Vault",
                "status": "UPLOADED",
                "source_type": "PATIENT",
                "source_label": "Uploaded by You",
                "uploaded_by": "user-patient-101",
                "created_by": "user-patient-101",
                "verified_by": None,
                "verified_at": None,
                "reviewed_by": None,
                "reviewed_at": None,
                "review_notes": None,
                "related_request_id": "req-doc-002",
                "file_type": "PDF",
                "file_size_kb": 512,
                "document_date": "2026-09-22",
                "reference_id": "SELF-UPLOAD-001",
                "visit_id": None,
                "notes": "Scanned copy of baseline electrocardiogram taken during annual company health checkup at Coimbatore.",
                "tags": ["ECG", "Personal Records", "Cardiac Baseline"],
                "metadata": {
                    "uploader": "Alice Smith (Patient)",
                    "upload_date": "2026-09-22T16:00:00Z",
                    "document_origin": "Sri Ramakrishna Hospital, Coimbatore",
                    "document_tags": ["ECG", "Personal Records", "Cardiac Baseline"],
                    "is_self_uploaded": True
                },
                "images": [],
                "verification_token": "vtok-doc-up-20260922-001",
                "digital_signature": "SHA256:2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
            },
            # Doc 4: Patient-Uploaded Document that HAS BEEN REVIEWED by Doctor ("Reviewed by Dr. Arun Kumar")
            {
                "id": "doc-bench-10",
                "document_code": "DOC-REV-20260925-002",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "branch-kedar-main",
                "doctor_id": "doc-arun-kumar",
                "title": "Previous Outstation Glycated Hemoglobin (HbA1c) Trend Sheet",
                "category": "PREVIOUS_LAB_REPORT",
                "department": "Endocrinology",
                "status": "REVIEWED",
                "source_type": "PATIENT",
                "source_label": "Uploaded by Patient (Reviewed by Clinician)",
                "uploaded_by": "user-patient-101",
                "created_by": "user-patient-101",
                "verified_by": None,
                "verified_at": None,
                "reviewed_by": "doc-arun-kumar",
                "reviewed_at": datetime.now(timezone.utc) - timedelta(days=1),
                "review_notes": "Reviewed by Dr. Arun Kumar: Baseline HbA1c of 7.2% from July 2026 noted. Correlated with current oral hypoglycemic therapy.",
                "file_type": "PDF",
                "file_size_kb": 195,
                "document_date": "2026-07-15",
                "reference_id": "PAT-EXT-002",
                "visit_id": "VIS-20261002-00125",
                "notes": "Patient self-uploaded historical diabetic records.",
                "tags": ["Diabetes", "HbA1c", "Patient Upload", "Reviewed"],
                "metadata": {
                    "uploader": "Alice Smith (Patient)",
                    "upload_date": "2026-09-25T11:00:00Z",
                    "reviewed_by": "Dr. Arun Kumar, MD",
                    "reviewed_date": "2026-10-03T10:30:00Z",
                    "clinical_action": "Incorporated into longitudinal diabetic assessment"
                },
                "images": [],
                "verification_token": "vtok-doc-rev-20260925-002",
                "digital_signature": "SHA256:4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e"
            },
            # Doc 5: Doctor Uploaded External Medical Document (Source: EXTERNAL_PROVIDER, Uploaded By: DOCTOR)
            {
                "id": "doc-bench-11",
                "document_code": "EXT-DOC-20261004-001",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "branch-kedar-main",
                "doctor_id": "doc-arun-kumar",
                "title": "External Spine MRI Diagnostic Imaging & Radiologist Finding",
                "category": "IMAGING_REPORT",
                "department": "Radiology & Spine Care",
                "status": "REVIEWED",
                "source_type": "EXTERNAL_PROVIDER",
                "source_label": "ABC Diagnostics Advanced MRI Center (External)",
                "uploaded_by": "doc-arun-kumar",
                "created_by": "doc-arun-kumar",
                "verified_by": "doc-arun-kumar",
                "verified_at": datetime.now(timezone.utc),
                "reviewed_by": "doc-arun-kumar",
                "reviewed_at": datetime.now(timezone.utc),
                "review_notes": "Patient presented external 1.5T MRI films and printed report during OPD consultation. Disc bulge at L4-L5 confirmed; neural exit foramina patent.",
                "file_type": "PDF",
                "file_size_kb": 820,
                "document_date": "2026-09-20",
                "reference_id": "EXT-MRI-2026-8812",
                "visit_id": "OPD-20260920-0014",
                "notes": "Uploaded and clinically reviewed by Dr. Arun Kumar during outpatient consultation.",
                "tags": ["MRI", "Spine", "External Provider", "Doctor Uploaded"],
                "metadata": {
                    "origin_hospital": "ABC Imaging & Diagnostic Centre, Chennai",
                    "origin_doctor": "Dr. Meera Swaminathan, DMRD (Radiologist)",
                    "modality": "1.5 Tesla MRI Lumbar Spine",
                    "uploaded_by_doctor": "Dr. Arun Kumar, MD",
                    "upload_reason": "Patient provided external MRI disc and report for neuro-orthopedic second opinion."
                },
                "images": [
                    {
                        "slice_id": "SLC-01",
                        "sequence": "T2 Sagittal Midline",
                        "description": "Mid-sagittal T2-weighted sequence showing normal lordosis and L4-L5 disc hydration.",
                        "image_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80"
                    },
                    {
                        "slice_id": "SLC-02",
                        "sequence": "T1 Axial L4-L5 Intervertebral Disc",
                        "description": "Axial T1 view confirming mild broad-based posterior disc protrusion without thecal sac compromise.",
                        "image_url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80"
                    }
                ],
                "verification_token": "vtok-ext-mri-20261004-001",
                "digital_signature": "SHA256:6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f"
            },
            # Doc 6: Official Medical Certificate (Doctor Signed)
            {
                "id": "doc-bench-04",
                "document_code": "MC-20260920-0012",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "branch-kedar-main",
                "doctor_id": "doc-arun-kumar",
                "title": "Medical Certificate — Fitness & Sick Leave",
                "category": "MEDICAL_CERTIFICATE",
                "department": "Orthopedics & Spine Care",
                "status": "AVAILABLE",
                "source_type": "HOSPITAL",
                "source_label": "Kedar Hospital",
                "uploaded_by": "doc-arun-kumar",
                "created_by": "doc-arun-kumar",
                "verified_by": "doc-arun-kumar",
                "verified_at": datetime.now(timezone.utc) - timedelta(days=14),
                "reviewed_by": "doc-arun-kumar",
                "reviewed_at": datetime.now(timezone.utc) - timedelta(days=14),
                "review_notes": "Official medical fitness certificate issued for employment sickness absence.",
                "file_type": "PDF",
                "file_size_kb": 175,
                "document_date": "2026-09-20",
                "reference_id": "MC-2026-09201",
                "visit_id": "OPD-20260920-0014",
                "notes": "Certified that patient was suffering from Acute Cervical Radiculopathy and advised 5 days of rest from 20 Sep 2026 to 24 Sep 2026.",
                "tags": ["Medical Certificate", "Fitness", "Sick Leave"],
                "metadata": {
                    "certificate_type": "Medical Leave & Treatment Certificate",
                    "issued_to": "Alice Smith / Sathiya Murthy",
                    "diagnosis": "Acute Cervical Radiculopathy (C5-C6) with Muscle Spasm",
                    "rest_period": "5 Days (20 Sep 2026 to 24 Sep 2026)",
                    "fitness_resumption_date": "25 Sep 2026",
                    "certifying_doctor": "Dr. Rajesh Kumar, MS (Ortho)",
                    "reg_no": "TMC-38192-2008"
                },
                "images": [],
                "verification_token": "vtok-doc-mc-20260920-0012",
                "digital_signature": "SHA256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
            }
        ]

        for doc in seed_documents:
            cur.execute("""
                INSERT INTO oh_id.medical_documents (
                    id, document_code, patient_id, hospital_id, branch_id, doctor_id, title, category,
                    department, status, source_type, source_label, uploaded_by, created_by,
                    verified_by, verified_at, reviewed_by, reviewed_at, review_notes,
                    related_request_id, file_type, file_size_kb, document_date, reference_id,
                    visit_id, notes, tags, metadata, images, verification_token, digital_signature,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    document_code = EXCLUDED.document_code,
                    title = EXCLUDED.title,
                    category = EXCLUDED.category,
                    department = EXCLUDED.department,
                    status = EXCLUDED.status,
                    source_type = EXCLUDED.source_type,
                    source_label = EXCLUDED.source_label,
                    uploaded_by = EXCLUDED.uploaded_by,
                    created_by = EXCLUDED.created_by,
                    verified_by = EXCLUDED.verified_by,
                    verified_at = EXCLUDED.verified_at,
                    reviewed_by = EXCLUDED.reviewed_by,
                    reviewed_at = EXCLUDED.reviewed_at,
                    review_notes = EXCLUDED.review_notes,
                    related_request_id = EXCLUDED.related_request_id,
                    file_type = EXCLUDED.file_type,
                    file_size_kb = EXCLUDED.file_size_kb,
                    document_date = EXCLUDED.document_date,
                    notes = EXCLUDED.notes,
                    tags = EXCLUDED.tags,
                    metadata = EXCLUDED.metadata,
                    images = EXCLUDED.images,
                    verification_token = EXCLUDED.verification_token,
                    digital_signature = EXCLUDED.digital_signature;
            """, (
                doc["id"], doc["document_code"], doc["patient_id"], doc["hospital_id"], doc["branch_id"],
                doc["doctor_id"], doc["title"], doc["category"], doc["department"], doc["status"],
                doc["source_type"], doc["source_label"], doc["uploaded_by"], doc["created_by"],
                doc["verified_by"], doc["verified_at"], doc["reviewed_by"], doc["reviewed_at"], doc["review_notes"],
                doc.get("related_request_id"), doc["file_type"], doc["file_size_kb"], doc["document_date"],
                doc["reference_id"], doc["visit_id"], doc["notes"], json.dumps(doc["tags"]),
                json.dumps(doc["metadata"]), json.dumps(doc["images"]), doc["verification_token"],
                doc["digital_signature"]
            ))

        # 8. Seed Consultation Document Attachments
        cur.execute("""
            INSERT INTO oh_id.consultation_document_attachments (
                id, consultation_id, document_id, patient_id, doctor_id, clinical_context, attached_at
            ) VALUES 
            ('cda-001', 'ENC-2026-CONSULT', 'doc-bench-11', 'p-101', 'doc-arun-kumar', 'External MRI scan reviewed during diagnostic evaluation for radiculopathy.', CURRENT_TIMESTAMP),
            ('cda-002', 'ENC-2026-CONSULT', 'doc-bench-10', 'p-101', 'doc-arun-kumar', 'Historical HbA1c trend correlated with current cardiovascular management.', CURRENT_TIMESTAMP)
            ON CONFLICT (consultation_id, document_id) DO NOTHING;
        """)

        # 9. Seed Audit Logs
        cur.execute("""
            INSERT INTO oh_id.medical_document_audit_logs (
                id, document_id, patient_id, actor_id, action, ip_address, user_agent, created_at
            ) VALUES
            ('mda-001', 'doc-bench-01', 'p-101', 'hospadmin', 'VIEW', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', CURRENT_TIMESTAMP - INTERVAL '1 day'),
            ('mda-002', 'doc-bench-11', 'p-101', 'doctor', 'UPLOAD_EXTERNAL', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
            ('mda-003', 'doc-bench-10', 'p-101', 'doctor', 'CLINICAL_REVIEW', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', CURRENT_TIMESTAMP - INTERVAL '1 hour')
            ON CONFLICT (id) DO NOTHING;
        """)

    logger.info("Successfully migrated and seeded Unified Medical Records & Documents System!")

if __name__ == "__main__":
    run_migration()
