from typing import List, Optional, Dict, Any
from backend.app.database.session import get_db_cursor, get_readonly_cursor

class SPViewsRepository:
    """
    Mandatory Enterprise Healthcare Repository.
    Executes ONLY database Views for reading and Stored Procedures for writing.
    Never executes direct queries on underlying base tables.
    """

    # --------------------------------------------------------------------------
    # PATIENT MODULE (Reads from vw_patients, Writes via sp_register_patient, sp_update_patient)
    # --------------------------------------------------------------------------

    def list_patients(self, search: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            if search:
                pattern = f"%{search}%"
                cur.execute(
                    """
                    SELECT * FROM oh_id.vw_patients 
                    WHERE name ILIKE %s OR onehealth_id ILIKE %s OR phone ILIKE %s
                    ORDER BY created_at DESC;
                    """,
                    (pattern, pattern, pattern)
                )
            else:
                cur.execute("SELECT * FROM oh_id.vw_patients ORDER BY created_at DESC;")
            return [dict(row) for row in cur.fetchall()]

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
        hospital_id: Optional[str] = "hosp-001",
        created_by: str = "system",
        patient_id: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
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
            new_id, new_ohid, new_qr = res['o_patient_id'], res['o_onehealth_id'], res['o_qr_token']
        
        # Return enriched record from View
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
    # DOCTOR MODULE (Reads from vw_doctors, Writes via sp_create_doctor)
    # --------------------------------------------------------------------------

    def list_doctors(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_doctors ORDER BY rating DESC, name ASC;")
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
        department_id: Optional[str] = "dept-101",
        hospital_id: Optional[str] = "hosp-001",
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
    # APPOINTMENTS MODULE (Reads from vw_appointments, Writes via sp_book_appointment, sp_update_appointment_status)
    # --------------------------------------------------------------------------

    def list_appointments(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_appointments ORDER BY slot DESC, created_at DESC;")
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
        hospital_id: Optional[str] = None,
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
    # QUEUE MODULE (Reads from vw_queue_board, Writes via sp_queue_action)
    # --------------------------------------------------------------------------

    def list_queue_entries(self, doctor_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            if doctor_id:
                cur.execute("SELECT * FROM oh_id.vw_queue_board WHERE doctor_id = %s ORDER BY token_number ASC;", (doctor_id,))
            else:
                cur.execute("SELECT * FROM oh_id.vw_queue_board ORDER BY token_number ASC;")
            return [dict(row) for row in cur.fetchall()]

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
    # CLINICAL OPD & IPD MODULES (Reads from vw_opd_encounters, vw_ipd_admissions, vw_wards_and_beds)
    # --------------------------------------------------------------------------

    def list_opd_encounters(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_opd_encounters ORDER BY created_at DESC;")
            return [dict(row) for row in cur.fetchall()]

    def list_ipd_admissions(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_ipd_admissions ORDER BY admission_date DESC;")
            return [dict(row) for row in cur.fetchall()]

    def list_wards_and_beds(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_wards_and_beds ORDER BY ward_name, bed_number;")
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # LABORATORY MODULE (Reads from vw_lab_orders)
    # --------------------------------------------------------------------------

    def list_lab_orders(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_lab_orders ORDER BY ordered_at DESC;")
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # PHARMACY MODULE (Reads from vw_pharmacy_dispensary)
    # --------------------------------------------------------------------------

    def list_pharmacy_dispensary(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_pharmacy_dispensary ORDER BY created_at DESC;")
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # BILLING MODULE (Reads from vw_billing_invoices, Writes via sp_generate_invoice, sp_record_payment)
    # --------------------------------------------------------------------------

    def list_billing_invoices(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
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
        recorded_by: str = "cashier"
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                """
                CALL oh_id.sp_record_payment(%s, %s, %s, %s, %s, NULL, NULL);
                """,
                (invoice_id, amount, payment_mode, transaction_ref, recorded_by)
            )
            res = cur.fetchone()
            payment_id, payment_status = res['o_payment_id'], res['o_payment_status']

        return {
            "payment_id": payment_id,
            "invoice_id": invoice_id,
            "status": payment_status,
            "amount": amount
        }

    # --------------------------------------------------------------------------
    # DASHBOARD & ANALYTICS (Reads from vw_dashboard_metrics)
    # --------------------------------------------------------------------------

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_dashboard_metrics;")
            row = cur.fetchone()
            return dict(row) if row else {}

    # --------------------------------------------------------------------------
    # ADMINISTRATION & AUTHENTICATION (Reads from vw_user_profiles, vw_audit_logs, vw_departments)
    # --------------------------------------------------------------------------

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_user_profiles WHERE username = %s;", (username,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_user_profiles WHERE id = %s;", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def list_departments(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_departments ORDER BY name ASC;")
            return [dict(row) for row in cur.fetchall()]

    def list_audit_logs(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_audit_logs ORDER BY created_at DESC LIMIT 100;")
            return [dict(row) for row in cur.fetchall()]

sp_repository = SPViewsRepository()
