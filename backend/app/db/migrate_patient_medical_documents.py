import json
from backend.app.database.session import get_db_cursor

def migrate_patient_medical_documents():
    with get_db_cursor() as cur:
        # 1. Alter table oh_id.medical_documents to add extended columns if not present
        cur.execute("""
            ALTER TABLE oh_id.medical_documents 
            ADD COLUMN IF NOT EXISTS document_code VARCHAR(64),
            ADD COLUMN IF NOT EXISTS department VARCHAR(100),
            ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'AVAILABLE',
            ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) DEFAULT 'HEALTHCARE_PROVIDER',
            ADD COLUMN IF NOT EXISTS source_label VARCHAR(100),
            ADD COLUMN IF NOT EXISTS visit_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS verification_token VARCHAR(128),
            ADD COLUMN IF NOT EXISTS digital_signature TEXT;
        """)

        # 2. Unique index on document_code and verification_token
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_documents_code ON oh_id.medical_documents (document_code);
            CREATE INDEX IF NOT EXISTS idx_medical_documents_vtoken ON oh_id.medical_documents (verification_token);
        """)

        # 3. Create table for time-limited document sharing
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.medical_document_shares (
                id VARCHAR(64) PRIMARY KEY,
                document_id VARCHAR(64) NOT NULL REFERENCES oh_id.medical_documents(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                share_token VARCHAR(128) UNIQUE NOT NULL,
                recipient_name VARCHAR(200),
                access_level VARCHAR(30) DEFAULT 'VIEW_ONLY',
                expires_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ,
                revocation_reason TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_med_doc_shares_token ON oh_id.medical_document_shares (share_token);
            CREATE INDEX IF NOT EXISTS idx_med_doc_shares_doc_pat ON oh_id.medical_document_shares (document_id, patient_id);
        """)

        # 4. Create table for document audit logging
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.medical_document_audit_logs (
                id VARCHAR(64) PRIMARY KEY,
                document_id VARCHAR(64) NOT NULL REFERENCES oh_id.medical_documents(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                actor_id VARCHAR(64),
                action VARCHAR(50) NOT NULL, -- VIEW, DOWNLOAD, PRINT, SHARE_CREATE, SHARE_REVOKE, VERIFY
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_med_doc_audit_doc_pat ON oh_id.medical_document_audit_logs (document_id, patient_id);
        """)

        # 5. Create or Replace view oh_id.vw_medical_documents
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_medical_documents CASCADE;
            CREATE OR REPLACE VIEW oh_id.vw_medical_documents AS
            SELECT 
                md.id,
                md.document_code,
                md.patient_id,
                p.name AS patient_name,
                p.onehealth_id,
                p.gender AS patient_gender,
                p.dob AS patient_dob,
                md.hospital_id,
                COALESCE(h.name, md.source_label, 'Healthcare Facility') AS hospital_name,
                h.code AS hospital_code,
                h.city AS hospital_city,
                h.state AS hospital_state,
                h.address AS hospital_address,
                h.phone AS hospital_phone,
                h.email AS hospital_email,
                md.doctor_id,
                COALESCE(d.name, (md.metadata->>'doctor_name')) AS doctor_name,
                d.specialty AS doctor_specialty,
                COALESCE(md.department, d.specialty, 'General Medicine') AS department,
                md.title,
                md.category,
                md.status,
                md.source_type,
                COALESCE(md.source_label, h.name, 'Healthcare Provider') AS source_label,
                md.file_type,
                md.file_size_kb,
                md.document_date,
                md.reference_id,
                md.visit_id,
                md.notes,
                md.metadata,
                md.images,
                md.verification_token,
                md.digital_signature,
                md.created_at
            FROM oh_id.medical_documents md
            LEFT JOIN oh_id.patients p ON md.patient_id = p.id
            LEFT JOIN oh_id.hospitals h ON md.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON md.doctor_id = d.id;
        """)

        # 6. Seed Rich Multi-Hospital Benchmark Documents for p-101 (Alice Smith)
        benchmark_docs = [
            # 1. Discharge Summary
            {
                "id": "doc-bench-01",
                "document_code": "DIS-20261002-0004",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "doctor_id": "doc-k-kumar",
                "title": "Hospital Discharge Summary — Acute Coronary Care",
                "category": "DISCHARGE_SUMMARY",
                "department": "Inpatient Cardiology",
                "status": "AVAILABLE",
                "source_type": "HEALTHCARE_PROVIDER",
                "source_label": "Kedar Hospital",
                "file_type": "PDF",
                "file_size_kb": 348,
                "document_date": "2026-10-02",
                "reference_id": "ADM-20260929-0012",
                "visit_id": "VIS-20261002-00125",
                "notes": "Patient admitted on 29 Sep 2026 with atypical chest discomfort. Successfully stabilized and discharged with dual antiplatelet regimen and lifestyle guidance.",
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
                        "Tab. Metoprolol Succinate ER 25mg once daily morning",
                        "Tab. Metformin 500mg twice daily with meals"
                    ],
                    "dietary_lifestyle_advice": "Low salt (<3g/day), low saturated fat diet. Supervised brisk walking 30 mins daily starting next week. Avoid strenuous physical lifting for 2 weeks.",
                    "follow_up": "Cardiology Outpatient Clinic on 16 Oct 2026 with repeat lipid profile and ECG.",
                    "doctor_name": "Dr. Arun Kumar, MD, DM (Cardiology)",
                    "doctor_reg_no": "TMC-49281-2012"
                },
                "images": [],
                "verification_token": "vtok-doc-dis-20261002-0004",
                "digital_signature": "SHA256:8f4c2e9b01a67384de9f120cbacde982103847291a0cde839201fba9c8e71620"
            },
            # 2. Laboratory Report
            {
                "id": "doc-bench-02",
                "document_code": "LAB-20261002-00125",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "doctor_id": "d-201",
                "title": "Complete Blood Count (CBC) Laboratory Diagnostic Report",
                "category": "LAB_REPORT",
                "department": "Diagnostic Pathology",
                "status": "FINAL",
                "source_type": "HEALTHCARE_PROVIDER",
                "source_label": "ABC Diagnostics & Kedar Hospital",
                "file_type": "PDF",
                "file_size_kb": 286,
                "document_date": "2026-10-02",
                "reference_id": "lo-cbc-01",
                "visit_id": "VIS-20261002-00125",
                "notes": "18 parameters analyzed via 5-part automated cell counter. All parameters within laboratory standard reference intervals.",
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
            # 3. Prescription
            {
                "id": "doc-bench-03",
                "document_code": "RX-20261003-00124",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "doctor_id": "doc-k-kumar",
                "title": "Post-Discharge Cardiovascular Prescription",
                "category": "PRESCRIPTION",
                "department": "Cardiology",
                "status": "VALID",
                "source_type": "HEALTHCARE_PROVIDER",
                "source_label": "Kedar Hospital",
                "file_type": "PDF",
                "file_size_kb": 210,
                "document_date": "2026-10-03",
                "reference_id": "rx-2026-001",
                "visit_id": "VIS-20261002-00125",
                "notes": "Long-term secondary prevention therapy for coronary artery disease and glycemic management.",
                "metadata": {
                    "valid_from": "2026-10-03",
                    "valid_until": "2026-11-03",
                    "validity_status": "ACTIVE",
                    "prescribed_medicines": [
                        "Tab. Ecosprin 75mg (Aspirin) — 1 tab after lunch daily (30 days)",
                        "Tab. Atorva 40mg (Atorvastatin) — 1 tab bedtime daily (30 days)",
                        "Tab. Metolar-XR 25mg (Metoprolol ER) — 1 tab morning daily (30 days)",
                        "Tab. Glycomet-SR 500mg (Metformin) — 1 tab twice daily with meals (30 days)"
                    ],
                    "doctor_name": "Dr. Arun Kumar",
                    "doctor_specialty": "Cardiology",
                    "reg_no": "TMC-49281-2012"
                },
                "images": [],
                "verification_token": "vtok-rx-20261003-00124",
                "digital_signature": "SHA256:3d8e9f2a01b47283cf7a109badcbf761029483719a0cde819201fba7c8e51408"
            },
            # 4. Medical Certificate
            {
                "id": "doc-bench-04",
                "document_code": "MC-20260920-0012",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "doctor_id": "doc-k-kumar",
                "title": "Medical Certificate — Fitness & Sick Leave",
                "category": "MEDICAL_CERTIFICATE",
                "department": "Orthopedics & Spine Care",
                "status": "AVAILABLE",
                "source_type": "HEALTHCARE_PROVIDER",
                "source_label": "Kedar Hospital",
                "file_type": "PDF",
                "file_size_kb": 175,
                "document_date": "2026-09-20",
                "reference_id": "MC-2026-09201",
                "visit_id": "OPD-20260920-0014",
                "notes": "Certified that patient was suffering from Acute Cervical Radiculopathy and advised 5 days of rest from 20 Sep 2026 to 24 Sep 2026.",
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
            },
            # 5. Imaging Report with Multi-Slice DICOM Previews
            {
                "id": "doc-bench-05",
                "document_code": "IMG-20260915-0012",
                "patient_id": "p-101",
                "hospital_id": "hosp-001",
                "doctor_id": "d-201",
                "title": "High-Resolution Lumbar Spine MRI & Neural Foraminal Study",
                "category": "IMAGING_REPORT",
                "department": "Diagnostic Radiology & Imaging",
                "status": "AVAILABLE",
                "source_type": "HEALTHCARE_PROVIDER",
                "source_label": "ABC Diagnostics Radiology Center",
                "file_type": "PDF",
                "file_size_kb": 840,
                "document_date": "2026-09-15",
                "reference_id": "MRI-LUM-2026-8812",
                "visit_id": "RAD-20260915-0003",
                "notes": "1.5 Tesla MRI of Lumbosacral Spine with T1, T2 sagittal & axial fast spin echo sequences.",
                "metadata": {
                    "modality": "MRI (Magnetic Resonance Imaging)",
                    "anatomical_region": "Lumbosacral Spine (L1-S1)",
                    "field_strength": "1.5 Tesla Superconducting",
                    "contrast_used": "No (Plain MRI)",
                    "slices_captured": 48,
                    "findings_summary": "Mild diffuse disc bulge at L4-L5 causing shallow thecal sac indentation without neural compression. Conus medullaris terminates normally at L1 level. Intact spinal canal dimensions.",
                    "radiologist": "Dr. Meera Swaminathan, DMRD, DNB (Radiology)",
                    "institution": "ABC Diagnostics Advanced Imaging Center"
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
                        "sequence": "T1 Sagittal Bone Windows",
                        "description": "T1-weighted sagittal scan confirming intact vertebral body heights and normal marrow signal.",
                        "image_url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80"
                    },
                    {
                        "slice_id": "SLC-03",
                        "sequence": "T2 Axial L4-L5 Disc Level",
                        "description": "Axial T2 sequence demonstrating symmetric disc margin without significant foraminal narrowing.",
                        "image_url": "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=600&q=80"
                    },
                    {
                        "slice_id": "SLC-04",
                        "sequence": "T2 Axial L5-S1 Junction",
                        "description": "Axial cut at the lumbosacral articulation demonstrating patent lateral recesses.",
                        "image_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80"
                    }
                ],
                "verification_token": "vtok-doc-img-20260915-0012",
                "digital_signature": "SHA256:5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
            },
            # 6. Referral Letter
            {
                "id": "doc-bench-06",
                "document_code": "REF-20260912-0008",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "doctor_id": "doc-k-kumar",
                "title": "Inter-Hospital Clinical Specialty Referral Letter",
                "category": "REFERRAL_LETTER",
                "department": "Orthopedics & Spine Care",
                "status": "AVAILABLE",
                "source_type": "HEALTHCARE_PROVIDER",
                "source_label": "Kedar Hospital",
                "file_type": "PDF",
                "file_size_kb": 165,
                "document_date": "2026-09-12",
                "reference_id": "REF-2026-KED-8821",
                "visit_id": "OPD-20260912-0009",
                "notes": "Formal medical referral from Dr. Rajesh Kumar (Kedar Hospital) to Dr. Senthil Nathan (Neurology, Apollo Speciality Hospital) for electromyography evaluation.",
                "metadata": {
                    "referring_doctor": "Dr. Rajesh Kumar, MS (Ortho), Kedar Hospital",
                    "referred_to_doctor": "Dr. Senthil Nathan, DM (Neurology), Apollo Speciality Hospital",
                    "reason_for_referral": "Evaluation of persistent upper extremity paresthesia; nerve conduction velocity (NCV) / EMG test requested.",
                    "clinical_summary": "Patient presented with tingling sensation along right C6 dermatome. Conservative therapy initiated. Kindly evaluate for peripheral radicular involvement.",
                    "urgency": "ROUTINE (Within 1-2 weeks)"
                },
                "images": [],
                "verification_token": "vtok-doc-ref-20260912-0008",
                "digital_signature": "SHA256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b"
            },
            # 7. Clinical Consultation Document
            {
                "id": "doc-bench-07",
                "document_code": "CLN-20260901-0003",
                "patient_id": "p-101",
                "hospital_id": "hosp-001",
                "doctor_id": "d-201",
                "title": "Comprehensive Diabetic Consultation & Metabolic Review",
                "category": "CLINICAL_DOCUMENT",
                "department": "Endocrinology & Diabetology",
                "status": "AVAILABLE",
                "source_type": "HEALTHCARE_PROVIDER",
                "source_label": "Apollo City Hospital",
                "file_type": "PDF",
                "file_size_kb": 290,
                "document_date": "2026-09-01",
                "reference_id": "CLN-HIST-2026-0901",
                "visit_id": "OPD-20260901-0003",
                "notes": "Outpatient clinical consultation record with glycemic status, fundus screening check, and foot examination.",
                "metadata": {
                    "consultant": "Dr. Senthil Nathan, MD, DM (Endocrinology)",
                    "vital_signs": {"bp": "128/82 mmHg", "pulse": "74 bpm", "bmi": "24.6 kg/m²", "weight": "68 kg"},
                    "clinical_assessment": "Type 2 Diabetes Mellitus with sub-optimal glycemic control (HbA1c 6.8%). No peripheral neuropathy on monofilament testing. Bilateral fundus normal.",
                    "plan": "Continue Metformin 500mg BD. Self-monitoring of blood glucose twice weekly. Dietary consultation completed."
                },
                "images": [],
                "verification_token": "vtok-doc-cln-20260901-0003",
                "digital_signature": "SHA256:3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b"
            },
            # 8. Insurance Document
            {
                "id": "doc-bench-08",
                "document_code": "INS-20260905-0019",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "doctor_id": None,
                "title": "Health Insurance Cashless Pre-Authorization Approval",
                "category": "INSURANCE_DOCUMENT",
                "department": "Insurance & TPA Desk",
                "status": "AVAILABLE",
                "source_type": "HEALTHCARE_PROVIDER",
                "source_label": "Star Health & Allied Insurance",
                "file_type": "PDF",
                "file_size_kb": 225,
                "document_date": "2026-09-05",
                "reference_id": "TPA-STAR-2026-89102",
                "visit_id": "ADM-20260929-0012",
                "notes": "Pre-authorization approval letter for cashless inpatient admission up to ₹75,000.",
                "metadata": {
                    "insurer": "Star Health & Allied Insurance Co. Ltd.",
                    "policy_number": "SH-MED-2025-9928102",
                    "tpa_claim_id": "TPA-CLM-2026-881920",
                    "authorized_amount": "₹ 75,000.00",
                    "deductible_copay": "₹ 0.00 (Nil)",
                    "valid_until": "2026-10-15",
                    "hospital_network": "Kedar Hospital (Empaneled Tier-1 Network Facility)"
                },
                "images": [],
                "verification_token": "vtok-doc-ins-20260905-0019",
                "digital_signature": "SHA256:7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a"
            },
            # 9. Patient Uploaded Document
            {
                "id": "doc-bench-09",
                "document_code": "DOC-UP-20260922-001",
                "patient_id": "p-101",
                "hospital_id": "hosp-kedar",
                "doctor_id": None,
                "title": "Previous 12-Lead Resting ECG Strip from Outstation Clinic",
                "category": "OTHER",
                "department": "Personal Health Vault",
                "status": "AVAILABLE",
                "source_type": "PATIENT_UPLOADED",
                "source_label": "Uploaded by You",
                "file_type": "PDF",
                "file_size_kb": 512,
                "document_date": "2026-09-22",
                "reference_id": "SELF-UPLOAD-001",
                "visit_id": None,
                "notes": "Scanned copy of baseline electrocardiogram taken during annual company health checkup at Coimbatore.",
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
            }
        ]

        for d in benchmark_docs:
            cur.execute("""
                INSERT INTO oh_id.medical_documents (
                    id, document_code, patient_id, hospital_id, doctor_id, title, category,
                    department, status, source_type, source_label, file_type, file_size_kb,
                    document_date, reference_id, visit_id, notes, metadata, images,
                    verification_token, digital_signature, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    document_code = EXCLUDED.document_code,
                    title = EXCLUDED.title,
                    category = EXCLUDED.category,
                    department = EXCLUDED.department,
                    status = EXCLUDED.status,
                    source_type = EXCLUDED.source_type,
                    source_label = EXCLUDED.source_label,
                    file_type = EXCLUDED.file_type,
                    file_size_kb = EXCLUDED.file_size_kb,
                    document_date = EXCLUDED.document_date,
                    reference_id = EXCLUDED.reference_id,
                    visit_id = EXCLUDED.visit_id,
                    notes = EXCLUDED.notes,
                    metadata = EXCLUDED.metadata,
                    images = EXCLUDED.images,
                    verification_token = EXCLUDED.verification_token,
                    digital_signature = EXCLUDED.digital_signature;
            """, (
                d["id"],
                d["document_code"],
                d["patient_id"],
                d["hospital_id"],
                d["doctor_id"],
                d["title"],
                d["category"],
                d["department"],
                d["status"],
                d["source_type"],
                d["source_label"],
                d["file_type"],
                d["file_size_kb"],
                d["document_date"],
                d["reference_id"],
                d["visit_id"],
                d["notes"],
                json.dumps(d["metadata"]),
                json.dumps(d["images"]),
                d["verification_token"],
                d["digital_signature"]
            ))

        print("Successfully migrated medical documents schema and seeded 9 rich benchmark documents for p-101.")

if __name__ == "__main__":
    migrate_patient_medical_documents()
