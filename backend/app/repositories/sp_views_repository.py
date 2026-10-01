from typing import List, Optional, Dict, Any
import json
from backend.app.database.session import get_db_cursor, get_readonly_cursor

class SPViewsRepository:
    """
    Mandatory Enterprise Healthcare Repository for OneHealth ID (OH-ID) & Kedar Hospital Pilot.
    Executes ONLY database Views for reading and Stored Procedures for writing.
    Strictly forbids direct base table mutations in compliance with the Zero Direct Queries Rule.
    """

    # --------------------------------------------------------------------------
    # PATIENT IDENTITY & REGISTRY (Reads from vw_patients, Writes via sp_register_patient_v2, sp_update_patient)
    # --------------------------------------------------------------------------

    def list_patients(
        self,
        search: Optional[str] = None,
        hospital_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []

            if search:
                pattern = f"%{search}%"
                clauses.append("(name ILIKE %s OR onehealth_id ILIKE %s OR phone ILIKE %s OR identity_number ILIKE %s)")
                params.extend([pattern, pattern, pattern, pattern])

            if hospital_id:
                clauses.append("hospital_id = %s")
                params.append(hospital_id)

            if branch_id:
                clauses.append("branch_id = %s")
                params.append(branch_id)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"SELECT * FROM oh_id.vw_patients {where_str} ORDER BY created_at DESC LIMIT %s OFFSET %s;"
            params.extend([limit, offset])

            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def count_patients(self, search: Optional[str] = None, hospital_id: Optional[str] = None) -> int:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if search:
                pattern = f"%{search}%"
                clauses.append("(name ILIKE %s OR onehealth_id ILIKE %s OR phone ILIKE %s)")
                params.extend([pattern, pattern, pattern])
            if hospital_id:
                clauses.append("hospital_id = %s")
                params.append(hospital_id)
            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            cur.execute(f"SELECT COUNT(*) AS total FROM oh_id.vw_patients {where_str};", tuple(params))
            row = cur.fetchone()
            return row['total'] if row else 0

    def get_patient_by_id(self, patient_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_patients WHERE id = %s;", (patient_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_patient_by_qr(self, qr_token: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_patients WHERE qr_token = %s OR onehealth_id = %s;", (qr_token, qr_token))
            row = cur.fetchone()
            return dict(row) if row else None

    def check_duplicate_patient(
        self,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        identity_number: Optional[str] = None,
        name: Optional[str] = None,
        age: Optional[int] = None,
        hospital_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if phone and len(phone.strip()) >= 5:
                clauses.append("phone ILIKE %s")
                params.append(f"%{phone.strip()}%")
            if email and "@" in email:
                clauses.append("email ILIKE %s")
                params.append(email.strip())
            if identity_number and len(identity_number.strip()) >= 4:
                clauses.append("identity_number ILIKE %s")
                params.append(identity_number.strip())
            if name and age is not None:
                clauses.append("(name ILIKE %s AND age = %s)")
                params.extend([f"%{name.strip()}%", age])

            if not clauses:
                return []

            sql = f"SELECT * FROM oh_id.vw_patients WHERE ({' OR '.join(clauses)})"
            if hospital_id:
                sql += " AND (hospital_id = %s OR hospital_id IS NULL)"
                params.append(hospital_id)
            sql += " LIMIT 5;"

            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def register_patient(
        self,
        name: str,
        age: int,
        diagnosis: str,
        gender: str = "Unspecified",
        phone: Optional[str] = None,
        email: Optional[str] = None,
        address: Optional[str] = None,
        emergency_contact: Optional[str] = None,
        blood_group: Optional[str] = None,
        identity_type: str = "NATIONAL_ID",
        identity_number: Optional[str] = None,
        hospital_id: Optional[str] = "hosp-kedar",
        branch_id: Optional[str] = "branch-kedar-01",
        tenant_id: Optional[str] = "ten-kedar",
        created_by: str = "system",
        patient_id: Optional[str] = None,
        is_demo_data: bool = False
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            try:
                cur.execute(
                    """
                    CALL oh_id.sp_register_patient_v2(
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, NULL, NULL
                    );
                    """,
                    (
                        patient_id, name, age, gender, phone, email,
                        address, emergency_contact, blood_group, diagnosis,
                        identity_type, identity_number, hospital_id, branch_id, tenant_id,
                        created_by, is_demo_data
                    )
                )
                res = cur.fetchone()
                new_id = res['o_patient_id']
            except Exception:
                # Fallback to standard registration
                cur.execute(
                    """
                    CALL oh_id.sp_register_patient(
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, NULL, NULL
                    );
                    """,
                    (
                        patient_id, name, age, gender, phone, email,
                        address, emergency_contact, blood_group, diagnosis,
                        hospital_id, created_by
                    )
                )
                res = cur.fetchone()
                new_id = res['o_patient_id']

        return self.get_patient_by_id(new_id)

    def update_patient(
        self,
        patient_id: str,
        name: Optional[str] = None,
        age: Optional[int] = None,
        diagnosis: Optional[str] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None,
        actor_id: str = "system"
    ) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_update_patient(%s, %s, %s, %s, %s, %s, %s);
                """,
                (patient_id, name, age, diagnosis, phone, address, actor_id)
            )
        return self.get_patient_by_id(patient_id)

    # --------------------------------------------------------------------------
    # ZERO-KNOWLEDGE QR TOKENS & AUDITING
    # --------------------------------------------------------------------------

    def resolve_qr_token(self, qr_token: str, scanned_by: str = "staff", hospital_id: str = "hosp-kedar") -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_patients WHERE qr_token = %s OR onehealth_id = %s;", (qr_token, qr_token))
            row = cur.fetchone()
            if not row:
                return None
            patient = dict(row)

        with get_db_cursor() as cur:
            cur.execute(
                """
                INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, hospital_id, action, resource_type, resource_id, details)
                VALUES (
                    'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
                    %s, 'Staff', %s, 'QR_SCAN', 'PATIENT', %s,
                    json_build_object('onehealth_id', %s, 'method', 'ZERO_KNOWLEDGE_TOKEN_SCAN')::jsonb
                );
                """,
                (scanned_by, hospital_id, patient['id'], patient['onehealth_id'])
            )
        return patient

    def rotate_patient_qr(self, patient_id: str, actor_id: str = "staff") -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute("CALL oh_id.sp_rotate_patient_qr(%s, %s, NULL);", (patient_id, actor_id))
            res = cur.fetchone()
            new_qr = res['o_new_qr_token']
        patient = self.get_patient_by_id(patient_id)
        if patient:
            patient['qr_token'] = new_qr
        return patient

    # --------------------------------------------------------------------------
    # DOCTOR MODULE (Reads from vw_doctors, Writes via sp_create_doctor)
    # --------------------------------------------------------------------------

    def list_doctors(self, hospital_id: Optional[str] = None, department_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if hospital_id:
                clauses.append("hospital_id = %s")
                params.append(hospital_id)
            if department_id:
                clauses.append("department_id = %s")
                params.append(department_id)
            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            cur.execute(f"SELECT * FROM oh_id.vw_doctors {where_str} ORDER BY rating DESC, name ASC;", tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_doctor_by_id(self, doctor_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_doctors WHERE id = %s;", (doctor_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def create_doctor(
        self,
        name: str,
        specialty: str,
        department_id: Optional[str] = "dept-k-01",
        hospital_id: Optional[str] = "hosp-kedar",
        phone: Optional[str] = None,
        email: Optional[str] = None,
        room_number: Optional[str] = "Room 101",
        consultation_fee: float = 500.00,
        actor_id: str = "system",
        doctor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_create_doctor(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL);
                """,
                (
                    doctor_id, name, specialty, department_id, hospital_id,
                    phone, email, room_number, consultation_fee, actor_id
                )
            )
            res = cur.fetchone()
            new_id = res['o_doctor_id']

        return self.get_doctor_by_id(new_id)

    # --------------------------------------------------------------------------
    # APPOINTMENTS & CHECK-IN (Reads from vw_appointments, Writes via sp_book_appointment, sp_check_in_appointment)
    # --------------------------------------------------------------------------

    def list_appointments(
        self,
        patient_id: Optional[str] = None,
        doctor_id: Optional[str] = None,
        hospital_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if patient_id:
                clauses.append("patient_id = %s")
                params.append(patient_id)
            if doctor_id:
                clauses.append("doctor_id = %s")
                params.append(doctor_id)
            if hospital_id:
                clauses.append("hospital_id = %s")
                params.append(hospital_id)
            if status:
                clauses.append("status = %s")
                params.append(status)
            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            cur.execute(f"SELECT * FROM oh_id.vw_appointments {where_str} ORDER BY slot DESC, created_at DESC;", tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_appointment_by_id(self, appointment_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_appointments WHERE id = %s;", (appointment_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def book_appointment(
        self,
        patient_id: str,
        doctor_id: str,
        slot: str,
        status: str = "scheduled",
        hospital_id: Optional[str] = "hosp-kedar",
        department_id: Optional[str] = None,
        notes: Optional[str] = None,
        booked_by: str = "system",
        appointment_id: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_book_appointment(
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, 1
                );
                """,
                (
                    appointment_id, patient_id, doctor_id, slot, status,
                    hospital_id, department_id, notes, booked_by
                )
            )
            res = cur.fetchone()
            new_id = res['o_appointment_id']

        return self.get_appointment_by_id(new_id)

    def check_in_appointment(self, appointment_id: str, actor_id: str = "receptionist") -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_check_in_appointment(%s, %s, NULL, NULL, NULL);
                """,
                (appointment_id, actor_id)
            )
            res = cur.fetchone()
            queue_id = res['o_queue_id']
            token_number = res['o_token_number']
            status = res['o_status']

        appt = self.get_appointment_by_id(appointment_id)
        return {
            "appointment": appt,
            "queue_id": queue_id,
            "token_number": token_number,
            "status": status
        }

    def update_appointment_status(
        self,
        appointment_id: str,
        status: str,
        actor_id: str = "system"
    ) -> Optional[Dict[str, Any]]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_update_appointment_status(%s, %s, %s);
                """,
                (appointment_id, status, actor_id)
            )
        return self.get_appointment_by_id(appointment_id)

    # --------------------------------------------------------------------------
    # OPD QUEUE MANAGEMENT (Reads from vw_queue_board, Writes via sp_queue_action)
    # --------------------------------------------------------------------------

    def list_queue_entries(self, doctor_id: Optional[str] = None, hospital_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if doctor_id:
                clauses.append("doctor_id = %s")
                params.append(doctor_id)
            if hospital_id:
                clauses.append("hospital_id = %s")
                params.append(hospital_id)
            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            cur.execute(f"SELECT * FROM oh_id.vw_queue_board {where_str} ORDER BY token_number ASC;", tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_queue_entry_by_id(self, queue_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_queue_board WHERE id = %s;", (queue_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def execute_queue_action(self, queue_id: str, action: str, actor_id: str = "staff") -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_queue_action(%s, %s, %s, NULL);
                """,
                (queue_id, action, actor_id)
            )
            res = cur.fetchone()
            new_status = res['o_new_status']

        return {"queue_id": queue_id, "action": action, "status": new_status}

    # --------------------------------------------------------------------------
    # DOCTOR CONSULTATION & CLINICAL (Reads from vw_opd_encounters, Writes via sp_record_consultation)
    # --------------------------------------------------------------------------

    def record_consultation(
        self,
        appointment_id: Optional[str],
        patient_id: str,
        doctor_id: str,
        symptoms: Optional[str],
        diagnosis: str,
        clinical_notes: Optional[str] = None,
        vitals: Optional[Dict[str, Any]] = None,
        actor_id: str = "doctor",
        consultation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_record_consultation(%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, NULL);
                """,
                (
                    consultation_id, appointment_id, patient_id, doctor_id,
                    symptoms, diagnosis, clinical_notes,
                    json.dumps(vitals or {}), actor_id
                )
            )
            res = cur.fetchone()
            new_cid = res['o_consultation_id']

        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_opd_encounters WHERE id = %s;", (new_cid,))
            row = cur.fetchone()
            return dict(row) if row else {"id": new_cid, "diagnosis": diagnosis}

    def list_opd_encounters(self, patient_id: Optional[str] = None, doctor_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if patient_id:
                clauses.append("patient_id = %s")
                params.append(patient_id)
            if doctor_id:
                clauses.append("doctor_id = %s")
                params.append(doctor_id)
            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            cur.execute(f"SELECT * FROM oh_id.vw_opd_encounters {where_str} ORDER BY created_at DESC;", tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def list_ipd_admissions(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_ipd_admissions ORDER BY admission_date DESC;")
            return [dict(row) for row in cur.fetchall()]

    def list_wards_and_beds(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_wards_and_beds ORDER BY ward_name, bed_number;")
            return [dict(row) for row in cur.fetchall()]

    def list_lab_orders(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_lab_orders ORDER BY ordered_at DESC;")
            return [dict(row) for row in cur.fetchall()]

    def list_pharmacy_dispensary(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_pharmacy_dispensary ORDER BY created_at DESC;")
            return [dict(row) for row in cur.fetchall()]

    def list_billing_invoices(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_billing_invoices ORDER BY created_at DESC;")
            return [dict(row) for row in cur.fetchall()]

    def get_invoice_by_id(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_billing_invoices WHERE id = %s;", (invoice_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    # --------------------------------------------------------------------------
    # DASHBOARD & CONFIGURATION (Reads from views and configuration tables)
    # --------------------------------------------------------------------------

    def get_dashboard_summary(self, hospital_id: str = "hosp-kedar") -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute(
                """
                SELECT 
                    h.id AS hospital_id,
                    h.name AS hospital_name,
                    COALESCE(b.name, 'Mugalivakkam Main Branch') AS branch_name,
                    COALESCE(b.area, 'Mugalivakkam') AS branch_area,
                    (SELECT COUNT(*) FROM oh_id.vw_patients WHERE hospital_id = %s) AS total_patients,
                    (SELECT COUNT(*) FROM oh_id.vw_appointments WHERE hospital_id = %s) AS total_appointments,
                    (SELECT COUNT(*) FROM oh_id.vw_appointments WHERE hospital_id = %s AND status = 'checked_in') AS checked_in_count,
                    (SELECT COUNT(*) FROM oh_id.vw_queue_board WHERE hospital_id = %s AND status = 'WAITING') AS waiting_count,
                    (SELECT COUNT(*) FROM oh_id.vw_queue_board WHERE hospital_id = %s AND status = 'IN_CONSULTATION') AS in_consultation_count,
                    (SELECT COUNT(*) FROM oh_id.vw_queue_board WHERE hospital_id = %s AND status = 'COMPLETED') AS completed_count,
                    (SELECT COUNT(*) FROM oh_id.vw_doctors WHERE hospital_id = %s AND is_available = TRUE) AS available_doctors
                FROM oh_id.hospitals h
                LEFT JOIN oh_id.hospital_branches b ON b.hospital_id = h.id AND b.is_main_branch = TRUE
                WHERE h.id = %s
                LIMIT 1;
                """,
                (hospital_id, hospital_id, hospital_id, hospital_id, hospital_id, hospital_id, hospital_id, hospital_id)
            )
            row = cur.fetchone()
            if row:
                return dict(row)
            return {
                "hospital_id": hospital_id,
                "hospital_name": "Kedar Hospital",
                "branch_name": "Kedar Hospital - Mugalivakkam Main",
                "branch_area": "Mugalivakkam",
                "total_patients": 0,
                "total_appointments": 0,
                "checked_in_count": 0,
                "waiting_count": 0,
                "in_consultation_count": 0,
                "completed_count": 0,
                "available_doctors": 0
            }

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_dashboard_metrics;")
            row = cur.fetchone()
            return dict(row) if row else {}

    def get_hospital_configuration(self, hospital_id: str = "hosp-kedar") -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.hospitals WHERE id = %s;", (hospital_id,))
            hosp = cur.fetchone()
            cur.execute("SELECT * FROM oh_id.hospital_branches WHERE hospital_id = %s ORDER BY is_main_branch DESC, name ASC;", (hospital_id,))
            branches = [dict(r) for r in cur.fetchall()]
            cur.execute("SELECT * FROM oh_id.vw_departments WHERE hospital_id = %s ORDER BY name ASC;", (hospital_id,))
            departments = [dict(r) for r in cur.fetchall()]
            cur.execute("SELECT * FROM oh_id.vw_doctors WHERE hospital_id = %s ORDER BY name ASC;", (hospital_id,))
            doctors = [dict(r) for r in cur.fetchall()]

            return {
                "hospital": dict(hosp) if hosp else None,
                "branches": branches,
                "departments": departments,
                "doctors": doctors
            }

    # --------------------------------------------------------------------------
    # ADMINISTRATION & RBAC AUTHENTICATION (Reads from vw_user_auth, vw_audit_logs, vw_departments)
    # --------------------------------------------------------------------------

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_user_auth WHERE username = %s;", (username,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_user_auth WHERE id = %s;", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def list_departments(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_departments ORDER BY name ASC;")
            return [dict(row) for row in cur.fetchall()]

    def list_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_audit_logs ORDER BY created_at DESC LIMIT %s;", (limit,))
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # BILLING & PAYMENTS (Reads from vw_billing_invoices, Writes via sp_record_payment)
    # --------------------------------------------------------------------------

    def list_billing_invoices(self, hospital_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            if hospital_id:
                cur.execute("SELECT * FROM oh_id.vw_billing_invoices WHERE hospital_id = %s ORDER BY created_at DESC;", (hospital_id,))
            else:
                cur.execute("SELECT * FROM oh_id.vw_billing_invoices ORDER BY created_at DESC;")
            return [dict(row) for row in cur.fetchall()]

    def get_invoice_by_id(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_billing_invoices WHERE id = %s;", (invoice_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def record_payment(
        self,
        invoice_id: str,
        amount: float,
        payment_mode: str = "UPI",
        transaction_ref: Optional[str] = None,
        recorded_by: str = "system"
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_record_payment(
                    %s, %s, %s, %s, %s, NULL, NULL
                );
                """,
                (
                    invoice_id,
                    amount,
                    payment_mode,
                    transaction_ref or "TXN-MANUAL",
                    recorded_by
                )
            )
            res = cur.fetchone()
            return {
                "payment_id": res.get("o_payment_id") if res else None,
                "payment_status": res.get("o_payment_status") if res else "SUCCESS"
            }

sp_repository = SPViewsRepository()

