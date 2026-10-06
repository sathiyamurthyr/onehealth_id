"""
Seed Data: Hospital Staff Memberships, Roles, Credentials, and Access Review Records
"""

from backend.app.database.session import get_db_cursor
import logging
import json
from datetime import date, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration.seed_hospital_users")

def seed_hospital_users():
    logger.info("Seeding realistic Hospital Staff Memberships and Access Review dataset...")
    with get_db_cursor() as cur:
        # Check if memberships already exist
        cur.execute("SELECT COUNT(*) AS cnt FROM oh_id.hospital_staff_memberships;")
        cnt = cur.fetchone()["cnt"]
        if cnt > 0:
            logger.info(f"Hospital staff memberships already populated ({cnt} records).")
            return

        today = date.today()
        expiring_soon = today + timedelta(days=15)
        already_expired = today - timedelta(days=20)
        valid_far = today + timedelta(days=730)

        staff_seed = [
            # 1. Dr. Arun Kumar - Cardiologist (Hospital Verified, Active)
            {
                "id": "mem-dr-arun",
                "user_id": "u-doc-101",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "department_id": "dept-k-01",
                "employee_id": "EMP-DOC-101",
                "first_name": "Arun",
                "middle_name": "K",
                "last_name": "Kumar",
                "full_name": "Dr. Arun Kumar",
                "photo_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face",
                "gender": "Male",
                "dob": "1982-05-14",
                "mobile": "+91 98401 22334",
                "email": "dr.arunkumar@kedarhospital.in",
                "address": "14, River View Enclave, Manapakkam, Chennai",
                "emergency_contact": "+91 98401 99881",
                "joining_date": "2021-03-01",
                "employment_type": "FULL_TIME",
                "designation": "Senior Consultant Cardiologist & HOD",
                "reporting_manager_id": "u-admin-01",
                "reporting_manager_name": "Dr. Sathyamoorthy (Medical Director)",
                "employment_status": "ACTIVE",
                "role_code": "DOCTOR",
                "additional_roles": json.dumps(["DEPARTMENT_HEAD"]),
                "branch_ids": json.dumps(["br-kedar-01", "br-kedar-02"]),
                "department_ids": json.dumps(["dept-k-01", "dept-k-04"]),
                "custom_permissions": json.dumps(["consultation.write", "prescription.sign", "referral.manage", "department.roster.approve"]),
                "shift_access": "ALL_SHIFTS",
                "login_enabled": True,
                "mfa_enabled": True,
                "mfa_status": "AUTHENTICATOR_APP",
                "role_metadata": json.dumps({
                    "medical_registration_number": "TN-MCI-74892",
                    "registration_authority": "Tamil Nadu Medical Council",
                    "nmr_id": "NMR-TN-2008-04918",
                    "qualification": "MBBS, MD (General Medicine), DM (Cardiology), FACC",
                    "specialty": "Cardiology & Internal Medicine",
                    "consultation_type": "IN_PERSON_AND_TELECONSULT",
                    "opd_counter_id": "ctr-k-01",
                    "consultation_room": "Consultation Suite 101, Block A",
                    "availability": "Mon-Sat (09:00 AM - 01:30 PM)",
                    "consultation_fee": 600.00
                }),
                "credential_number": "TN-MCI-74892",
                "credential_authority": "Tamil Nadu Medical Council",
                "credential_expiry_date": str(valid_far),
                "verification_status": "VERIFIED",
                "verified_by": "hospadmin",
                "verified_at": "2024-01-10T10:00:00Z"
            },
            # 2. Dr. Rajesh Sundaram - Orthopedics (Credential Expiring in 15 days - Access Review Alert!)
            {
                "id": "mem-dr-rajesh",
                "user_id": "u-doc-102",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "department_id": "dept-k-02",
                "employee_id": "EMP-DOC-102",
                "first_name": "Rajesh",
                "middle_name": "",
                "last_name": "Sundaram",
                "full_name": "Dr. Rajesh Sundaram",
                "photo_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&crop=face",
                "gender": "Male",
                "dob": "1978-11-20",
                "mobile": "+91 98402 33445",
                "email": "dr.rajesh@kedarhospital.in",
                "address": "42, Mount-Poonamallee High Rd, Porur, Chennai",
                "emergency_contact": "+91 98402 88776",
                "joining_date": "2020-06-15",
                "employment_type": "FULL_TIME",
                "designation": "Chief Orthopedic Surgeon",
                "reporting_manager_id": "u-admin-01",
                "reporting_manager_name": "Dr. Sathyamoorthy (Medical Director)",
                "employment_status": "ACTIVE",
                "role_code": "DOCTOR",
                "additional_roles": json.dumps([]),
                "branch_ids": json.dumps(["br-kedar-01"]),
                "department_ids": json.dumps(["dept-k-02"]),
                "custom_permissions": json.dumps(["consultation.write", "prescription.sign", "ot.schedule"]),
                "shift_access": "ALL_SHIFTS",
                "login_enabled": True,
                "mfa_enabled": True,
                "mfa_status": "SMS_OTP",
                "role_metadata": json.dumps({
                    "medical_registration_number": "TN-MCI-58190",
                    "registration_authority": "Tamil Nadu Medical Council",
                    "nmr_id": "NMR-TN-2005-01823",
                    "qualification": "MBBS, MS (Ortho), M.Ch (Orthopedics), FRCS",
                    "specialty": "Orthopedics & Joint Replacement",
                    "consultation_type": "IN_PERSON",
                    "opd_counter_id": "ctr-k-02",
                    "consultation_room": "Consultation Suite 104, Block A",
                    "availability": "Mon-Fri (10:00 AM - 03:00 PM)",
                    "consultation_fee": 550.00
                }),
                "credential_number": "TN-MCI-58190",
                "credential_authority": "Tamil Nadu Medical Council",
                "credential_expiry_date": str(expiring_soon),
                "verification_status": "VERIFIED",
                "verified_by": "hospadmin",
                "verified_at": "2023-09-15T11:30:00Z"
            },
            # 3. Nurse Priya Mohan - Senior ICU & Triage Nurse (Registration Expired - Alert!)
            {
                "id": "mem-nur-priya",
                "user_id": "u-nur-201",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "department_id": "dept-k-01",
                "employee_id": "EMP-NUR-201",
                "first_name": "Priya",
                "middle_name": "L",
                "last_name": "Mohan",
                "full_name": "Priya Mohan, RN",
                "photo_url": "https://images.unsplash.com/photo-1594824813583-9824249a5b39?w=200&h=200&fit=crop&crop=face",
                "gender": "Female",
                "dob": "1991-08-12",
                "mobile": "+91 98403 44556",
                "email": "priya.nurse@kedarhospital.in",
                "address": "8, Gandhi Nagar 2nd St, Mugalivakkam, Chennai",
                "emergency_contact": "+91 98403 11223",
                "joining_date": "2022-01-10",
                "employment_type": "FULL_TIME",
                "designation": "Senior Staff Nurse & Triage In-Charge",
                "reporting_manager_id": "u-admin-01",
                "reporting_manager_name": "Matron Mary (Nursing Superintendent)",
                "employment_status": "ACTIVE",
                "role_code": "NURSE",
                "additional_roles": json.dumps(["TRIAGE_LEAD"]),
                "branch_ids": json.dumps(["br-kedar-01"]),
                "department_ids": json.dumps(["dept-k-01", "dept-k-02"]),
                "custom_permissions": json.dumps(["vitals.record", "triage.queue", "nursing.administer"]),
                "shift_access": "MORNING_ONLY",
                "login_enabled": True,
                "mfa_enabled": False,
                "mfa_status": "NOT_CONFIGURED",
                "role_metadata": json.dumps({
                    "nursing_registration_number": "TNNMC-RN-88219",
                    "registration_authority": "Tamil Nadu Nurses & Midwives Council",
                    "qualification": "B.Sc (Nursing), Critical Care Certified",
                    "ward": "OPD Triage & Emergency Bay 1",
                    "shift": "MORNING",
                    "supervisor": "Matron Mary"
                }),
                "credential_number": "TNNMC-RN-88219",
                "credential_authority": "Tamil Nadu Nurses & Midwives Council",
                "credential_expiry_date": str(already_expired),
                "verification_status": "EXPIRED",
                "verified_by": "hospadmin",
                "verified_at": "2022-01-15T09:00:00Z"
            },
            # 4. Arunachalam S - Receptionist & Front Desk
            {
                "id": "mem-rec-arun",
                "user_id": "u-rec-301",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "department_id": "dept-k-01",
                "employee_id": "EMP-REC-301",
                "first_name": "Arunachalam",
                "middle_name": "",
                "last_name": "S",
                "full_name": "Arunachalam S",
                "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
                "gender": "Male",
                "dob": "1994-03-25",
                "mobile": "+91 98404 55667",
                "email": "reception.arun@kedarhospital.in",
                "address": "21, Main Road, Iyyappanthangal, Chennai",
                "emergency_contact": "+91 98404 99001",
                "joining_date": "2023-04-01",
                "employment_type": "FULL_TIME",
                "designation": "Senior OPD Reception & Billing Coordinator",
                "reporting_manager_id": "u-admin-01",
                "reporting_manager_name": "Admin Operations Lead",
                "employment_status": "ACTIVE",
                "role_code": "RECEPTIONIST",
                "additional_roles": json.dumps([]),
                "branch_ids": json.dumps(["br-kedar-01", "br-kedar-02"]),
                "department_ids": json.dumps(["dept-k-01", "dept-k-02", "dept-k-03", "dept-k-04"]),
                "custom_permissions": json.dumps([
                    "patient.search", "patient.register", "patient.update",
                    "appointment.view", "appointment.create", "appointment.checkin",
                    "queue.view", "document.upload", "basic_document.view"
                ]),
                "shift_access": "ALL_SHIFTS",
                "login_enabled": True,
                "mfa_enabled": False,
                "mfa_status": "NOT_CONFIGURED",
                "role_metadata": json.dumps({
                    "counter_number": "Counter 1 - Main Lobby",
                    "allowed_workflows": ["PATIENT_REGISTRATION", "APPOINTMENT_BOOKING", "CHECK_IN", "TOKEN_DISPENSE"]
                }),
                "credential_number": None,
                "credential_authority": None,
                "credential_expiry_date": None,
                "verification_status": "NOT_REQUIRED",
                "verified_by": "hospadmin",
                "verified_at": "2023-04-01T10:00:00Z"
            },
            # 5. Ravi V - Senior Laboratory Technician
            {
                "id": "mem-lab-ravi",
                "user_id": "u-lab-401",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "department_id": "dept-k-03",
                "employee_id": "EMP-LAB-401",
                "first_name": "Ravi",
                "middle_name": "V",
                "last_name": "Kumar",
                "full_name": "Ravi Kumar V",
                "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
                "gender": "Male",
                "dob": "1989-07-19",
                "mobile": "+91 98405 66778",
                "email": "ravi.lab@kedarhospital.in",
                "address": "55, Anna Nagar, Ramapuram, Chennai",
                "emergency_contact": "+91 98405 22331",
                "joining_date": "2021-08-16",
                "employment_type": "FULL_TIME",
                "designation": "Senior Medical Lab Technologist (DMLT/BMLT)",
                "reporting_manager_id": "u-admin-01",
                "reporting_manager_name": "Dr. Pathologist (Lab Director)",
                "employment_status": "ACTIVE",
                "role_code": "LAB_TECHNICIAN",
                "additional_roles": json.dumps([]),
                "branch_ids": json.dumps(["br-kedar-01"]),
                "department_ids": json.dumps(["dept-k-03"]),
                "custom_permissions": json.dumps(["lab.orders.view", "lab.sample.receive", "lab.results.enter"]),
                "shift_access": "ALL_SHIFTS",
                "login_enabled": True,
                "mfa_enabled": False,
                "mfa_status": "NOT_CONFIGURED",
                "role_metadata": json.dumps({
                    "qualification": "B.Sc Medical Lab Technology (BMLT)",
                    "certifications": "NABL ISO 15189 Trained",
                    "lab_unit": "Hematology & Biochemistry Wing"
                }),
                "credential_number": "TN-PARA-LAB-4491",
                "credential_authority": "Tamil Nadu Paramedical Council",
                "credential_expiry_date": str(valid_far),
                "verification_status": "VERIFIED",
                "verified_by": "hospadmin",
                "verified_at": "2021-09-01T10:00:00Z"
            },
            # 6. Meena Sundar - Trainee / Intern (Restricted Access)
            {
                "id": "mem-trn-meena",
                "user_id": "u-trn-501",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "department_id": "dept-k-01",
                "employee_id": "TRN-INT-501",
                "first_name": "Meena",
                "middle_name": "R",
                "last_name": "Sundar",
                "full_name": "Meena Sundar (Intern)",
                "photo_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
                "gender": "Female",
                "dob": "2001-09-05",
                "mobile": "+91 98406 77889",
                "email": "meena.intern@kedarhospital.in",
                "address": "Hostel Block B, MMC Campus, Chennai",
                "emergency_contact": "+91 98406 33221",
                "joining_date": str(today - timedelta(days=90)),
                "employment_type": "INTERN",
                "designation": "Medical Resident Intern (CRRI)",
                "reporting_manager_id": "u-doc-101",
                "reporting_manager_name": "Dr. Arun Kumar",
                "employment_status": "ACTIVE",
                "role_code": "TRAINEE",
                "additional_roles": json.dumps([]),
                "branch_ids": json.dumps(["br-kedar-01"]),
                "department_ids": json.dumps(["dept-k-01"]),
                "custom_permissions": json.dumps(["patient.view", "clinical_note.draft"]),
                "shift_access": "MORNING_ONLY",
                "login_enabled": True,
                "mfa_enabled": False,
                "mfa_status": "NOT_CONFIGURED",
                "role_metadata": json.dumps({
                    "training_type": "INTERN_CRRI",
                    "institution": "Madras Medical College (MMC), Chennai",
                    "qualification": "MBBS (Intern / CRRI)",
                    "supervisor_doctor_id": "u-doc-101",
                    "supervisor_name": "Dr. Arun Kumar",
                    "start_date": str(today - timedelta(days=90)),
                    "end_date": str(today + timedelta(days=275)),
                    "access_level": "RESTRICTED_CLINICAL_SHADOW"
                }),
                "credential_number": "TN-MCI-PROV-2025-901",
                "credential_authority": "Tamil Nadu Medical Council (Provisional)",
                "credential_expiry_date": str(today + timedelta(days=275)),
                "verification_status": "VERIFIED",
                "verified_by": "hospadmin",
                "verified_at": "2024-01-02T10:00:00Z"
            },
            # 7. Dr. Senthil Nathan - General Medicine (Inactive Account - 90+ days no activity)
            {
                "id": "mem-doc-senthil",
                "user_id": "u-doc-103",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-02",
                "department_id": "dept-k-01",
                "employee_id": "EMP-DOC-103",
                "first_name": "Senthil",
                "middle_name": "",
                "last_name": "Nathan",
                "full_name": "Dr. Senthil Nathan",
                "photo_url": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop&crop=face",
                "gender": "Male",
                "dob": "1975-02-18",
                "mobile": "+91 98407 88990",
                "email": "dr.senthil@kedarhospital.in",
                "address": "12, Trunk Road, Poonamallee, Chennai",
                "emergency_contact": "+91 98407 11223",
                "joining_date": "2019-11-01",
                "employment_type": "VISITING",
                "designation": "Visiting Consultant Physician",
                "reporting_manager_id": "u-admin-01",
                "reporting_manager_name": "Dr. Sathyamoorthy",
                "employment_status": "INACTIVE",
                "status_reason": "On Sabbatical / Fellowship Abroad",
                "role_code": "DOCTOR",
                "additional_roles": json.dumps([]),
                "branch_ids": json.dumps(["br-kedar-02"]),
                "department_ids": json.dumps(["dept-k-01"]),
                "custom_permissions": json.dumps(["consultation.write", "prescription.sign"]),
                "shift_access": "ON_CALL",
                "login_enabled": False,
                "mfa_enabled": False,
                "mfa_status": "NOT_CONFIGURED",
                "role_metadata": json.dumps({
                    "medical_registration_number": "TN-MCI-45192",
                    "registration_authority": "Tamil Nadu Medical Council",
                    "qualification": "MBBS, MD (General Medicine)",
                    "specialty": "General Medicine",
                    "consultation_type": "VISITING"
                }),
                "credential_number": "TN-MCI-45192",
                "credential_authority": "Tamil Nadu Medical Council",
                "credential_expiry_date": str(valid_far),
                "verification_status": "VERIFIED",
                "verified_by": "hospadmin",
                "verified_at": "2020-01-10T10:00:00Z"
            },
            # 8. Karthik Raman - Suspended Pharmacist (Audit & Compliance case)
            {
                "id": "mem-phr-karthik",
                "user_id": "u-phr-601",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "department_id": "dept-k-04",
                "employee_id": "EMP-PHR-601",
                "first_name": "Karthik",
                "middle_name": "",
                "last_name": "Raman",
                "full_name": "Karthik Raman (Suspended)",
                "photo_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
                "gender": "Male",
                "dob": "1993-12-10",
                "mobile": "+91 98408 99001",
                "email": "karthik.pharmacy@kedarhospital.in",
                "address": "19, Lake View St, Porur, Chennai",
                "emergency_contact": "+91 98408 22334",
                "joining_date": "2022-09-01",
                "employment_type": "FULL_TIME",
                "designation": "Assistant Pharmacist",
                "reporting_manager_id": "u-admin-01",
                "reporting_manager_name": "Chief Pharmacist",
                "employment_status": "SUSPENDED",
                "status_reason": "Pending Internal Inventory Audit Review",
                "role_code": "PHARMACIST",
                "additional_roles": json.dumps([]),
                "branch_ids": json.dumps(["br-kedar-01"]),
                "department_ids": json.dumps(["dept-k-04"]),
                "custom_permissions": json.dumps([]),
                "shift_access": "MORNING_ONLY",
                "login_enabled": False,
                "mfa_enabled": False,
                "mfa_status": "NOT_CONFIGURED",
                "role_metadata": json.dumps({
                    "pharmacy_registration_number": "TN-PC-39182",
                    "qualification": "B.Pharm, Registered Pharmacist"
                }),
                "credential_number": "TN-PC-39182",
                "credential_authority": "Tamil Nadu Pharmacy Council",
                "credential_expiry_date": str(valid_far),
                "verification_status": "VERIFIED",
                "verified_by": "hospadmin",
                "verified_at": "2022-09-05T10:00:00Z"
            }
        ]

        from backend.app.core.security import get_password_hash
        default_pwd_hash = get_password_hash("password123")

        # Insert user accounts for any missing users in `oh_id.users`
        for st in staff_seed:
            uid = st["user_id"]
            uname = st["email"].split("@")[0].replace(".", "_")
            cur.execute("""
                INSERT INTO oh_id.users (id, user_ref_id, username, email, full_name, role, password_hash, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    email = EXCLUDED.email;
            """, (uid, uid, uname, st["email"], st["full_name"], st["role_code"], default_pwd_hash, st["login_enabled"]))

            # Insert staff membership
            cur.execute("""
                INSERT INTO oh_id.hospital_staff_memberships (
                    id, user_id, hospital_id, branch_id, department_id, employee_id,
                    first_name, middle_name, last_name, full_name, photo_url, gender, dob,
                    mobile, email, address, emergency_contact, joining_date, employment_type,
                    designation, reporting_manager_id, reporting_manager_name, employment_status,
                    status_reason, role_code, additional_roles, branch_ids, department_ids,
                    custom_permissions, shift_access, login_enabled, mfa_enabled, mfa_status,
                    role_metadata, credential_number, credential_authority, credential_expiry_date,
                    verification_status, verified_by, verified_at, created_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s::jsonb, %s::jsonb, %s::jsonb,
                    %s::jsonb, %s, %s, %s, %s,
                    %s::jsonb, %s, %s, %s,
                    %s, %s, %s, 'hospadmin'
                ) ON CONFLICT (user_id, hospital_id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    designation = EXCLUDED.designation,
                    employment_status = EXCLUDED.employment_status,
                    credential_expiry_date = EXCLUDED.credential_expiry_date,
                    verification_status = EXCLUDED.verification_status,
                    role_metadata = EXCLUDED.role_metadata;
            """, (
                st["id"], st["user_id"], st["hospital_id"], st.get("branch_id"), st.get("department_id"), st.get("employee_id"),
                st["first_name"], st.get("middle_name"), st["last_name"], st["full_name"], st.get("photo_url"), st.get("gender"), st.get("dob"),
                st["mobile"], st["email"], st.get("address"), st.get("emergency_contact"), st.get("joining_date"), st.get("employment_type"),
                st["designation"], st.get("reporting_manager_id"), st.get("reporting_manager_name"), st["employment_status"],
                st.get("status_reason"), st["role_code"], st.get("additional_roles", "[]"), st.get("branch_ids", "[]"), st.get("department_ids", "[]"),
                st.get("custom_permissions", "[]"), st.get("shift_access", "ALL_SHIFTS"), st.get("login_enabled", True), st.get("mfa_enabled", False), st.get("mfa_status", "NOT_CONFIGURED"),
                st.get("role_metadata", "{}"), st.get("credential_number"), st.get("credential_authority"), st.get("credential_expiry_date"),
                st.get("verification_status", "PENDING"), st.get("verified_by"), st.get("verified_at")
            ))

        # Seed Pending Staff Invitations
        invitations_seed = [
            {
                "id": "inv-doc-anand",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "full_name": "Dr. Anand Chandran",
                "email": "dr.anand@gmail.com",
                "mobile": "+91 98409 11223",
                "role_code": "DOCTOR",
                "department_id": "dept-k-01",
                "designation": "Visiting Consultant Pulmonologist",
                "employment_type": "VISITING",
                "invitation_token": "INV-PULM-ANAND-2026",
                "status": "PENDING"
            },
            {
                "id": "inv-nur-rekha",
                "hospital_id": "hosp-kedar",
                "branch_id": "br-kedar-01",
                "full_name": "Rekha Natarajan, RN",
                "email": "rekha.nurse@gmail.com",
                "mobile": "+91 98409 44556",
                "role_code": "NURSE",
                "department_id": "dept-k-02",
                "designation": "Staff Nurse (Orthopedics Wing)",
                "employment_type": "FULL_TIME",
                "invitation_token": "INV-NUR-REKHA-2026",
                "status": "PENDING"
            }
        ]

        for inv in invitations_seed:
            cur.execute("""
                INSERT INTO oh_id.staff_invitations (
                    id, hospital_id, branch_id, full_name, email, mobile, role_code,
                    department_id, designation, employment_type, invitation_token, status, invited_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, 'hospadmin'
                ) ON CONFLICT (id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    status = EXCLUDED.status;
            """, (
                inv["id"], inv["hospital_id"], inv["branch_id"], inv["full_name"],
                inv["email"], inv["mobile"], inv["role_code"], inv["department_id"],
                inv["designation"], inv["employment_type"], inv["invitation_token"],
                inv["status"]
            ))

        # Seed Access Mutation Audit Trail
        audit_seed = [
            {
                "id": "aud-usr-01",
                "hospital_id": "hosp-kedar",
                "target_user_id": "u-doc-101",
                "target_user_name": "Dr. Arun Kumar",
                "actor_id": "hospadmin",
                "actor_name": "Sathiya (Hospital Admin)",
                "actor_role": "HOSPITAL_ADMIN",
                "action_type": "ROLE_CHANGED",
                "previous_state": json.dumps({"role": "DOCTOR", "designation": "Consultant Cardiologist"}),
                "new_state": json.dumps({"role": "DOCTOR", "additional_roles": ["DEPARTMENT_HEAD"], "designation": "Senior Consultant Cardiologist & HOD"}),
                "reason": "Promoted to Department Head of Cardiology by Medical Board",
                "created_at": "2026-10-04T13:02:00Z"
            },
            {
                "id": "aud-usr-02",
                "hospital_id": "hosp-kedar",
                "target_user_id": "u-phr-601",
                "target_user_name": "Karthik Raman",
                "actor_id": "hospadmin",
                "actor_name": "Sathiya (Hospital Admin)",
                "actor_role": "HOSPITAL_ADMIN",
                "action_type": "ACCOUNT_SUSPENDED",
                "previous_state": json.dumps({"employment_status": "ACTIVE", "login_enabled": True}),
                "new_state": json.dumps({"employment_status": "SUSPENDED", "login_enabled": False}),
                "reason": "Pending Internal Inventory Audit Review",
                "created_at": "2026-10-03T18:15:00Z"
            }
        ]

        for a in audit_seed:
            cur.execute("""
                INSERT INTO oh_id.user_access_audit_logs (
                    id, hospital_id, target_user_id, target_user_name, actor_id,
                    actor_name, actor_role, action_type, previous_state, new_state, reason, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s
                ) ON CONFLICT (id) DO NOTHING;
            """, (
                a["id"], a["hospital_id"], a["target_user_id"], a["target_user_name"],
                a["actor_id"], a["actor_name"], a["actor_role"], a["action_type"],
                a["previous_state"], a["new_state"], a["reason"], a["created_at"]
            ))

    logger.info("Successfully seeded realistic Hospital Staff Memberships and Access Review dataset!")

if __name__ == "__main__":
    seed_hospital_users()
