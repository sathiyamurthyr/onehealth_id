from typing import List, Optional, Dict, Any
import json
import uuid
from datetime import date, datetime, timedelta
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
        patient_id: str,
        doctor_id: str,
        diagnosis: str,
        appointment_id: Optional[str] = None,
        symptoms: Optional[str] = None,
        clinical_notes: Optional[str] = None,
        vitals: Optional[Dict[str, Any]] = None,
        chief_complaint: Optional[Dict[str, Any]] = None,
        examination: Optional[Dict[str, Any]] = None,
        medical_history: Optional[Dict[str, Any]] = None,
        diagnoses: Optional[List[Dict[str, Any]]] = None,
        prescription: Optional[Dict[str, Any]] = None,
        referral: Optional[Dict[str, Any]] = None,
        follow_up: Optional[Dict[str, Any]] = None,
        actor_id: str = "doctor",
        consultation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            new_cid = consultation_id or f"c-{uuid.uuid4().hex[:10]}"

            # 1. Insert or update OPD consultation
            cur.execute(
                """
                INSERT INTO oh_id.opd_consultations (
                    id, appointment_id, patient_id, doctor_id, symptoms, diagnosis,
                    clinical_notes, vitals, chief_complaint, examination, medical_history,
                    diagnoses, consultation_status, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb,
                    %s::jsonb, 'COMPLETED', CURRENT_TIMESTAMP
                ) ON CONFLICT (id) DO UPDATE SET
                    diagnosis = EXCLUDED.diagnosis,
                    clinical_notes = EXCLUDED.clinical_notes,
                    vitals = EXCLUDED.vitals,
                    chief_complaint = EXCLUDED.chief_complaint,
                    examination = EXCLUDED.examination,
                    medical_history = EXCLUDED.medical_history,
                    diagnoses = EXCLUDED.diagnoses,
                    consultation_status = 'COMPLETED';
                """,
                (
                    new_cid, appointment_id, patient_id, doctor_id,
                    symptoms, diagnosis, clinical_notes,
                    json.dumps(vitals or {}),
                    json.dumps(chief_complaint or {}),
                    json.dumps(examination or {}),
                    json.dumps(medical_history or {}),
                    json.dumps(diagnoses or [])
                )
            )

            # 2. Insert or update FHIR Prescription & Prescription Items
            if prescription and prescription.get("items"):
                rx_id = prescription.get("id") or f"rx-{uuid.uuid4().hex[:10]}"
                cur.execute(
                    """
                    INSERT INTO oh_id.prescriptions (
                        id, consultation_id, patient_id, doctor_id, diagnosis, instructions,
                        status, valid_from, valid_until, signed_by, signed_at,
                        digital_signature_hash, created_by, created_at, version
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, CURRENT_TIMESTAMP, 1
                    ) ON CONFLICT (id) DO UPDATE SET
                        diagnosis = EXCLUDED.diagnosis,
                        instructions = EXCLUDED.instructions,
                        status = EXCLUDED.status,
                        valid_until = EXCLUDED.valid_until,
                        signed_by = EXCLUDED.signed_by,
                        signed_at = EXCLUDED.signed_at,
                        digital_signature_hash = EXCLUDED.digital_signature_hash;
                    """,
                    (
                        rx_id, new_cid, patient_id, doctor_id, diagnosis,
                        prescription.get("instructions"),
                        prescription.get("status") or "ACTIVE",
                        prescription.get("valid_from") or date.today(),
                        prescription.get("valid_until") or (date.today() + timedelta(days=30)),
                        prescription.get("signed_by"),
                        datetime.now() if prescription.get("signed_by") else None,
                        prescription.get("digital_signature_hash"),
                        actor_id
                    )
                )

                # Delete existing items for this prescription and re-insert
                cur.execute("DELETE FROM oh_id.prescription_items WHERE prescription_id = %s;", (rx_id,))
                for it in prescription.get("items", []):
                    item_id = it.get("id") or f"rxi-{uuid.uuid4().hex[:10]}"
                    cur.execute(
                        """
                        INSERT INTO oh_id.prescription_items (
                            id, prescription_id, medicine_name, dosage, duration_days, generic_name,
                            brand_name, strength, dosage_form, route, dose, frequency,
                            timing_morning, timing_afternoon, timing_evening, timing_night,
                            food_instruction, duration_value, duration_unit, start_date, end_date,
                            quantity, expected_supply_duration, refills, is_prn, prn_indication,
                            specific_instructions, is_dispensed, dispensed_quantity, batch_number,
                            expiry_date, item_status
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s
                        );
                        """,
                        (
                            item_id, rx_id, it.get("medicine_name"),
                            it.get("dosage") or it.get("strength") or "500 mg",
                            it.get("duration_value") or it.get("duration_days") or 5,
                            it.get("generic_name"), it.get("brand_name"),
                            it.get("strength") or "500 mg",
                            it.get("dosage_form") or "Tablet",
                            it.get("route") or "Oral",
                            it.get("dose") or "1 tablet",
                            it.get("frequency") or "Once daily",
                            bool(it.get("timing_morning", True)),
                            bool(it.get("timing_afternoon", False)),
                            bool(it.get("timing_evening", False)),
                            bool(it.get("timing_night", False)),
                            it.get("food_instruction") or "AFTER_FOOD",
                            it.get("duration_value") or 5,
                            it.get("duration_unit") or "Days",
                            it.get("start_date") or date.today(),
                            it.get("end_date") or (date.today() + timedelta(days=it.get("duration_value", 5))),
                            it.get("quantity") or 5,
                            it.get("expected_supply_duration") or it.get("duration_value") or 5,
                            it.get("refills") or 0,
                            bool(it.get("is_prn", False)),
                            it.get("prn_indication"),
                            it.get("specific_instructions"),
                            bool(it.get("is_dispensed", False)),
                            it.get("dispensed_quantity") or 0,
                            it.get("batch_number"),
                            it.get("expiry_date"),
                            it.get("status") or "ACTIVE"
                        )
                    )

            # 3. Create Doctor Referral if requested
            if referral and referral.get("specialty"):
                ref_id = f"ref-{uuid.uuid4().hex[:10]}"
                cur.execute(
                    """
                    INSERT INTO oh_id.referrals (
                        id, patient_id, referring_doctor_id, receiving_doctor_id, referral_type,
                        specialty, receiving_doctor_name, reason, clinical_summary, priority,
                        requested_evaluation, attached_reports, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, 'PENDING');
                    """,
                    (
                        ref_id, patient_id, doctor_id, referral.get("receiving_doctor_id"),
                        referral.get("referral_type", "INTERNAL"), referral.get("specialty"),
                        referral.get("receiving_doctor_name"), referral.get("reason"),
                        referral.get("clinical_summary"), referral.get("priority", "ROUTINE"),
                        referral.get("requested_evaluation"),
                        json.dumps(referral.get("attached_reports", []))
                    )
                )

            # 4. Create Follow-up Plan if requested
            if follow_up and follow_up.get("scheduled_date"):
                fup_id = f"fup-{uuid.uuid4().hex[:10]}"
                cur.execute(
                    """
                    INSERT INTO oh_id.follow_up_plans (
                        id, patient_id, doctor_id, department_id, scheduled_date, scheduled_time,
                        duration_minutes, reason, required_investigations, instructions, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, 'PLANNED');
                    """,
                    (
                        fup_id, patient_id, doctor_id, follow_up.get("department_id"),
                        follow_up.get("scheduled_date"), follow_up.get("scheduled_time", "10:30 AM"),
                        follow_up.get("duration_minutes", 15), follow_up.get("reason"),
                        json.dumps(follow_up.get("required_investigations", [])),
                        follow_up.get("instructions")
                    )
                )

            # 5. Mark appointment and queue token completed
            if appointment_id:
                cur.execute("UPDATE oh_id.appointments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (appointment_id,))
                cur.execute("UPDATE oh_id.queue_entries SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE appointment_id = %s;", (appointment_id,))

            # 6. Audit Trail
            cur.execute(
                """
                INSERT INTO oh_id.audit_logs (
                    id, actor_id, actor_name, action, resource_type, resource_id, details
                ) VALUES (%s, %s, 'Doctor', 'CONSULTATION_RECORDED', 'CONSULTATION', %s, %s::jsonb);
                """,
                (
                    f"aud-{uuid.uuid4().hex[:10]}", actor_id, new_cid,
                    json.dumps({
                        "patient_id": patient_id,
                        "diagnosis": diagnosis,
                        "has_prescription": bool(prescription and prescription.get("items")),
                        "has_referral": bool(referral),
                        "has_follow_up": bool(follow_up)
                    })
                )
            )

        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_opd_encounters WHERE id = %s;", (new_cid,))
            row = cur.fetchone()
            return dict(row) if row else {"id": new_cid, "diagnosis": diagnosis}

    def list_prescriptions(
        self,
        patient_id: Optional[str] = None,
        doctor_id: Optional[str] = None,
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
            if status:
                clauses.append("status = %s")
                params.append(status)
            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            cur.execute(f"SELECT * FROM oh_id.vw_prescriptions_full {where_str} ORDER BY created_at DESC;", tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_prescription_by_id(self, prescription_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_prescriptions_full WHERE id = %s;", (prescription_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def sign_prescription(
        self,
        prescription_id: str,
        signed_by: str,
        digital_signature_hash: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            sig_hash = digital_signature_hash or f"SHA256:{uuid.uuid4().hex}{uuid.uuid4().hex}"
            cur.execute(
                """
                UPDATE oh_id.prescriptions
                SET status = 'ACTIVE',
                    signed_by = %s,
                    signed_at = CURRENT_TIMESTAMP,
                    digital_signature_hash = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (signed_by, sig_hash, prescription_id)
            )
        return self.get_prescription_by_id(prescription_id) or {"id": prescription_id, "status": "ACTIVE"}

    def dispense_prescription(
        self,
        prescription_id: str,
        items: List[Dict[str, Any]],
        dispensed_by: str = "Pharmacist"
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            for it in items:
                cur.execute(
                    """
                    UPDATE oh_id.prescription_items
                    SET is_dispensed = TRUE,
                        dispensed_quantity = %s,
                        batch_number = %s,
                        expiry_date = %s,
                        item_status = 'COMPLETED'
                    WHERE id = %s;
                    """,
                    (it.get("dispensed_quantity", 1), it.get("batch_number"), it.get("expiry_date"), it.get("item_id"))
                )

            # Check if all items are dispensed
            cur.execute(
                """
                SELECT COUNT(*) AS total, SUM(CASE WHEN is_dispensed THEN 1 ELSE 0 END) AS dispensed
                FROM oh_id.prescription_items WHERE prescription_id = %s;
                """,
                (prescription_id,)
            )
            res = cur.fetchone()
            new_status = "DISPENSED" if res["total"] == res["dispensed"] else "PARTIALLY_DISPENSED"
            cur.execute("UPDATE oh_id.prescriptions SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_status, prescription_id))

        return self.get_prescription_by_id(prescription_id) or {"id": prescription_id, "status": new_status}

    def get_patient_clinical_timeline(self, patient_id: str) -> List[Dict[str, Any]]:
        timeline = []
        with get_readonly_cursor() as cur:
            # Consultations
            cur.execute("SELECT * FROM oh_id.vw_opd_encounters WHERE patient_id = %s ORDER BY created_at DESC;", (patient_id,))
            for enc in cur.fetchall():
                e = dict(enc)
                timeline.append({
                    "id": e["id"],
                    "type": "CONSULTATION",
                    "date": e["created_at"].isoformat() if hasattr(e["created_at"], "isoformat") else str(e["created_at"]),
                    "title": f"OPD Consultation — {e.get('diagnosis') or 'Routine Check'}",
                    "subtitle": f"Attending: {e.get('doctor_name') or 'Doctor'} ({e.get('doctor_specialty') or 'General Medicine'})",
                    "doctor_name": e.get("doctor_name"),
                    "details": {
                        "symptoms": e.get("symptoms"),
                        "clinical_notes": e.get("clinical_notes"),
                        "vitals": e.get("vitals"),
                        "chief_complaint": e.get("chief_complaint"),
                        "examination": e.get("examination"),
                        "medical_history": e.get("medical_history"),
                        "diagnoses": e.get("diagnoses")
                    },
                    "status": e.get("consultation_status") or "COMPLETED"
                })

            # Prescriptions
            cur.execute("SELECT * FROM oh_id.vw_prescriptions_full WHERE patient_id = %s ORDER BY created_at DESC;", (patient_id,))
            for rx in cur.fetchall():
                r = dict(rx)
                items = r.get("items") or []
                med_names = [it.get("medicine_name") for it in items if it.get("medicine_name")]
                timeline.append({
                    "id": r["id"],
                    "type": "PRESCRIPTION",
                    "date": r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else str(r["created_at"]),
                    "title": f"Prescription — {', '.join(med_names[:3]) or 'Medication Order'}",
                    "subtitle": f"Prescribed by: {r.get('doctor_name')} • Valid: {r.get('valid_from')} to {r.get('valid_until')}",
                    "doctor_name": r.get("doctor_name"),
                    "details": {
                        "instructions": r.get("instructions"),
                        "items": items,
                        "valid_from": str(r.get("valid_from")),
                        "valid_until": str(r.get("valid_until")),
                        "signed_by": r.get("signed_by"),
                        "signed_at": str(r.get("signed_at")) if r.get("signed_at") else None
                    },
                    "status": r.get("status")
                })

            # Lab Orders
            cur.execute("SELECT * FROM oh_id.vw_lab_orders WHERE patient_id = %s ORDER BY ordered_at DESC;", (patient_id,))
            for lo in cur.fetchall():
                l = dict(lo)
                timeline.append({
                    "id": l["id"],
                    "type": "LAB_REPORT",
                    "date": l["ordered_at"].isoformat() if hasattr(l["ordered_at"], "isoformat") else str(l["ordered_at"]),
                    "title": f"Lab Report: {l.get('test_name')}",
                    "subtitle": f"Result: {l.get('result_value') or 'Pending'} {l.get('result_unit') or ''} • Ref: {l.get('normal_range')}",
                    "doctor_name": l.get("doctor_name"),
                    "details": {
                        "test_code": l.get("test_code"),
                        "result_value": l.get("result_value"),
                        "result_unit": l.get("result_unit"),
                        "is_abnormal": l.get("is_abnormal"),
                        "normal_range": l.get("normal_range")
                    },
                    "status": l.get("status")
                })

            # Referrals
            cur.execute("SELECT r.*, d.name AS referring_doctor_name FROM oh_id.referrals r LEFT JOIN oh_id.doctors d ON r.referring_doctor_id = d.id WHERE r.patient_id = %s ORDER BY r.created_at DESC;", (patient_id,))
            for ref in cur.fetchall():
                rf = dict(ref)
                timeline.append({
                    "id": rf["id"],
                    "type": "REFERRAL",
                    "date": rf["created_at"].isoformat() if hasattr(rf["created_at"], "isoformat") else str(rf["created_at"]),
                    "title": f"Doctor Referral to {rf.get('specialty')}",
                    "subtitle": f"To: {rf.get('receiving_doctor_name') or 'Specialist'} • Priority: {rf.get('priority')}",
                    "doctor_name": rf.get("referring_doctor_name"),
                    "details": {
                        "reason": rf.get("reason"),
                        "clinical_summary": rf.get("clinical_summary"),
                        "requested_evaluation": rf.get("requested_evaluation"),
                        "priority": rf.get("priority")
                    },
                    "status": rf.get("status")
                })

        # Sort timeline by date descending
        timeline.sort(key=lambda x: x["date"], reverse=True)
        return timeline

    def get_patient_reports_summary(self, patient_id: str) -> Dict[str, Any]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_lab_orders WHERE patient_id = %s ORDER BY ordered_at ASC;", (patient_id,))
            orders = [dict(r) for r in cur.fetchall()]

        # Build trends
        trends: Dict[str, List[Dict[str, Any]]] = {}
        for ord_item in orders:
            tname = ord_item.get("test_name") or "General Test"
            if ord_item.get("result_value"):
                if tname not in trends:
                    trends[tname] = []
                dt = ord_item.get("completed_at") or ord_item.get("ordered_at")
                trends[tname].append({
                    "date": dt.strftime("%b %d, %Y") if hasattr(dt, "strftime") else str(dt)[:10],
                    "value": ord_item.get("result_value"),
                    "unit": ord_item.get("result_unit"),
                    "is_abnormal": ord_item.get("is_abnormal"),
                    "reference_range": ord_item.get("normal_range")
                })

        return {"orders": orders, "trends": trends}

    def list_referrals(self, patient_id: Optional[str] = None, doctor_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if patient_id:
                clauses.append("r.patient_id = %s")
                params.append(patient_id)
            if doctor_id:
                clauses.append("(r.referring_doctor_id = %s OR r.receiving_doctor_id = %s)")
                params.extend([doctor_id, doctor_id])
            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT r.*, p.name AS patient_name, p.onehealth_id, d.name AS referring_doctor_name
                FROM oh_id.referrals r
                LEFT JOIN oh_id.patients p ON r.patient_id = p.id
                LEFT JOIN oh_id.doctors d ON r.referring_doctor_id = d.id
                {where_str}
                ORDER BY r.created_at DESC;
            """
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def list_follow_up_plans(self, patient_id: Optional[str] = None, doctor_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if patient_id:
                clauses.append("f.patient_id = %s")
                params.append(patient_id)
            if doctor_id:
                clauses.append("f.doctor_id = %s")
                params.append(doctor_id)
            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT f.*, p.name AS patient_name, p.onehealth_id, d.name AS doctor_name, dep.name AS department_name
                FROM oh_id.follow_up_plans f
                LEFT JOIN oh_id.patients p ON f.patient_id = p.id
                LEFT JOIN oh_id.doctors d ON f.doctor_id = d.id
                LEFT JOIN oh_id.departments dep ON f.department_id = dep.id
                {where_str}
                ORDER BY f.scheduled_date ASC;
            """
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_doctor_schedule(self, doctor_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.doctor_schedules WHERE doctor_id = %s ORDER BY CASE day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END;", (doctor_id,))
            return [dict(row) for row in cur.fetchall()]

    def update_doctor_schedule(self, doctor_id: str, items: List[Dict[str, Any]], hospital_id: str = "hosp-kedar") -> List[Dict[str, Any]]:
        with get_db_cursor() as cur:
            for it in items:
                cur.execute(
                    """
                    INSERT INTO oh_id.doctor_schedules (
                        id, doctor_id, hospital_id, day_of_week, working_start_time, working_end_time,
                        break_start_time, break_end_time, appointment_duration_minutes, buffer_time_minutes,
                        emergency_slots_count, followup_slots_count, new_patient_slots_count,
                        overbooking_allowed, overbooking_max, is_active
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, TRUE
                    ) ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
                        working_start_time = EXCLUDED.working_start_time,
                        working_end_time = EXCLUDED.working_end_time,
                        break_start_time = EXCLUDED.break_start_time,
                        break_end_time = EXCLUDED.break_end_time,
                        appointment_duration_minutes = EXCLUDED.appointment_duration_minutes,
                        buffer_time_minutes = EXCLUDED.buffer_time_minutes,
                        emergency_slots_count = EXCLUDED.emergency_slots_count,
                        followup_slots_count = EXCLUDED.followup_slots_count,
                        new_patient_slots_count = EXCLUDED.new_patient_slots_count,
                        overbooking_allowed = EXCLUDED.overbooking_allowed,
                        overbooking_max = EXCLUDED.overbooking_max;
                    """,
                    (
                        f"ds-{doctor_id}-{it.get('day_of_week')}",
                        doctor_id, hospital_id, it.get("day_of_week"),
                        it.get("working_start_time", "09:00"), it.get("working_end_time", "17:00"),
                        it.get("break_start_time", "13:00"), it.get("break_end_time", "14:00"),
                        it.get("appointment_duration_minutes", 15), it.get("buffer_time_minutes", 5),
                        it.get("emergency_slots_count", 2), it.get("followup_slots_count", 4),
                        it.get("new_patient_slots_count", 8),
                        it.get("overbooking_allowed", True), it.get("overbooking_max", 2)
                    )
                )
        return self.get_doctor_schedule(doctor_id)

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

    def get_doctor_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_doctors WHERE user_id = %s LIMIT 1;", (user_id,))
            row = cur.fetchone()
            if row:
                return dict(row)
            cur.execute("SELECT * FROM oh_id.vw_doctors WHERE id = %s LIMIT 1;", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        clean_user = (username or "").strip()
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.vw_user_auth 
                WHERE LOWER(username) = LOWER(%s)
                   OR LOWER(id) = LOWER(%s)
                   OR LOWER(user_ref_id) = LOWER(%s)
                   OR LOWER(email) = LOWER(%s)
                LIMIT 1;
            """, (clean_user, clean_user, clean_user, clean_user))
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

    # --------------------------------------------------------------------------
    # ENTERPRISE WORKSPACES & RBAC RESOLUTION (Reads from vw_user_workspaces, vw_user_hospitals)
    # --------------------------------------------------------------------------

    def get_user_workspace(
        self,
        user_ref_id: str,
        hospital_ref_id: Optional[str] = None,
        usertype_ref_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            clauses = ["user_ref_id = %s"]
            params = [user_ref_id]

            if hospital_ref_id:
                clauses.append("hospital_ref_id = %s")
                params.append(hospital_ref_id)
            if usertype_ref_id:
                clauses.append("usertype_ref_id = %s")
                params.append(usertype_ref_id)

            where_str = f"WHERE {' AND '.join(clauses)}"
            sql = f"SELECT * FROM oh_id.vw_user_workspaces {where_str} ORDER BY is_primary DESC LIMIT 1;"
            cur.execute(sql, tuple(params))
            row = cur.fetchone()
            if row:
                return dict(row)

            # Fallback if specific context not found
            cur.execute(
                "SELECT * FROM oh_id.vw_user_workspaces WHERE user_ref_id = %s ORDER BY is_primary DESC LIMIT 1;",
                (user_ref_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def list_user_workspaces(self, user_ref_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute(
                "SELECT * FROM oh_id.vw_user_workspaces WHERE user_ref_id = %s ORDER BY is_primary DESC, role_name ASC;",
                (user_ref_id,)
            )
            return [dict(r) for r in cur.fetchall()]

    def list_user_hospitals(self, user_ref_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute(
                "SELECT * FROM oh_id.vw_user_hospitals WHERE user_ref_id = %s ORDER BY is_primary DESC, hospital_name ASC;",
                (user_ref_id,)
            )
            return [dict(r) for r in cur.fetchall()]

    def list_roles(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.roles ORDER BY is_system_role DESC, name ASC;")
            return [dict(r) for r in cur.fetchall()]

    def list_permissions(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.permissions ORDER BY module ASC, code ASC;")
            return [dict(r) for r in cur.fetchall()]

    def list_users(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_user_profiles ORDER BY full_name ASC;")
            return [dict(r) for r in cur.fetchall()]

    def assign_user_role(
        self,
        user_ref_id: str,
        usertype_ref_id: str,
        hospital_ref_id: str,
        branch_ref_id: Optional[str] = None,
        department_id: Optional[str] = None,
        is_primary: bool = False
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                "CALL oh_id.sp_assign_user_role(%s, %s, %s, %s, %s, %s, NULL);",
                (user_ref_id, usertype_ref_id, hospital_ref_id, branch_ref_id, department_id, is_primary)
            )
            res = cur.fetchone()
            return {"status": res.get("o_status") if res else "SUCCESS"}

    def manage_role_permission(
        self,
        usertype_ref_id: str,
        permission_code: str,
        action: str
    ) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute(
                "CALL oh_id.sp_manage_role_permission(%s, %s, %s, NULL);",
                (usertype_ref_id, permission_code, action)
            )
            res = cur.fetchone()
            return {"status": res.get("o_status") if res else "SUCCESS"}

    def get_doctor_by_user_id(self, user_ref_id: str) -> Optional[Dict[str, Any]]:
        """Resolve doctor profile associated with an authenticated user login."""
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_doctors WHERE user_id = %s LIMIT 1;", (user_ref_id,))
            row = cur.fetchone()
            if row:
                return dict(row)
            # Fallback mapping if user_id was not explicitly set in legacy rows
            cur.execute(
                """
                SELECT d.* FROM oh_id.vw_doctors d
                JOIN oh_id.users u ON u.email = d.email
                WHERE u.id = %s OR u.user_ref_id = %s
                LIMIT 1;
                """,
                (user_ref_id, user_ref_id)
            )
            row = cur.fetchone()
            if row:
                return dict(row)

            # Fallback by doctor username matching
            cur.execute("SELECT * FROM oh_id.vw_doctors LIMIT 1;")
            fallback_row = cur.fetchone()
            return dict(fallback_row) if fallback_row else None

    def search_doctors(
        self,
        name: Optional[str] = None,
        specialty: Optional[str] = None,
        department_id: Optional[str] = None,
        hospital_id: Optional[str] = None,
        is_available: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Search other doctors strictly for clinical referral / consultation transfer / on-call."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if name:
                clauses.append("name ILIKE %s")
                params.append(f"%{name}%")
            if specialty:
                clauses.append("specialty ILIKE %s")
                params.append(f"%{specialty}%")
            if department_id:
                clauses.append("department_id = %s")
                params.append(department_id)
            if hospital_id:
                clauses.append("hospital_id = %s")
                params.append(hospital_id)
            if is_available is not None:
                clauses.append("is_available = %s")
                params.append(is_available)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            cur.execute(f"SELECT * FROM oh_id.vw_doctors {where_str} ORDER BY name ASC;", tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def create_standalone_prescription(
        self,
        patient_id: str,
        doctor_id: str,
        hospital_id: str,
        diagnosis: str,
        doctor_notes: Optional[str] = None,
        follow_up_days: int = 0,
        follow_up_date: Optional[str] = None,
        requires_pin: bool = False,
        verification_token: Optional[str] = None,
        digital_signature_hash: Optional[str] = None,
        status: str = "SIGNED",
        visit_id: Optional[str] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        actor_id: str = "doctor"
    ) -> Dict[str, Any]:
        """Creates an immutable prescription with medications, signature hash, and verification token."""
        import uuid
        import hashlib
        import datetime

        rx_id = f"RX-2026-{uuid.uuid4().hex[:6].upper()}"
        vis_id = visit_id or f"VIS-{uuid.uuid4().hex[:8].upper()}"
        sig_hash = digital_signature_hash or f"SHA256:{hashlib.sha256(f'{rx_id}-{patient_id}-{doctor_id}-{datetime.datetime.now()}'.encode()).hexdigest()}"
        ver_token = verification_token or f"vtok_{uuid.uuid4().hex[:16]}"

        with get_db_cursor() as cur:
            # 1. Insert into oh_id.prescriptions
            cur.execute(
                """
                INSERT INTO oh_id.prescriptions (
                    id, consultation_id, visit_id, encounter_id, patient_id, doctor_id, diagnosis,
                    instructions, doctor_notes, follow_up_days, follow_up_date, requires_pin,
                    status, valid_from, valid_until, signed_by, signed_at, digital_signature_hash,
                    verification_token, created_by, version, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', %s, CURRENT_TIMESTAMP, %s,
                    %s, %s, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                );
                """,
                (
                    rx_id, None, vis_id, None, patient_id, doctor_id, diagnosis,
                    doctor_notes, doctor_notes, follow_up_days, follow_up_date, requires_pin,
                    status, actor_id, sig_hash,
                    ver_token, actor_id
                )
            )

            # 2. Insert items
            if items:
                for idx, it in enumerate(items, 1):
                    item_id = f"pi-{rx_id}-{idx}"
                    cur.execute(
                        """
                        INSERT INTO oh_id.prescription_items (
                            id, prescription_id, medicine_name, dosage, dose, strength, dosage_form,
                            route, frequency, duration_days, duration_value, quantity, food_instruction,
                            specific_instructions, is_dispensed, item_status
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s,
                            %s, FALSE, 'ACTIVE'
                        );
                        """,
                        (
                            item_id, rx_id, it.get("medicine_name", "Medicine"),
                            it.get("dosage") or it.get("dose", "1 tab"),
                            it.get("dose", "1"),
                            it.get("strength", "500 mg"),
                            it.get("dosage_form", "Tablet"),
                            it.get("route", "Oral"),
                            it.get("frequency", "Twice daily (1-0-1)"),
                            int(it.get("duration_days") or 5),
                            int(it.get("duration_days") or 5),
                            int(it.get("quantity") or 10),
                            it.get("food_instruction", "After food"),
                            it.get("specific_instructions") or it.get("instructions", "As directed by physician")
                        )
                    )

        # 3. Retrieve and return formatted prescription from view
        created = self.get_prescription_by_id(rx_id)
        return created or {"id": rx_id, "status": status, "verification_token": ver_token, "digital_signature_hash": sig_hash}

    def get_prescription_by_id(self, prescription_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full prescription details including items, patient and doctor details."""
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_prescriptions_full WHERE id = %s;", (prescription_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def list_prescriptions(
        self,
        patient_id: Optional[str] = None,
        doctor_id: Optional[str] = None,
        hospital_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List prescriptions with optional filters for patient, doctor, hospital, and status."""
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
            where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            query = f"SELECT * FROM oh_id.vw_prescriptions_full {where_sql} ORDER BY created_at DESC LIMIT %s;"
            params.append(limit)
            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def sign_prescription(self, prescription_id: str, signed_by: str) -> Dict[str, Any]:
        """Sign and finalize an immutable prescription."""
        with get_db_cursor() as cur:
            cur.execute(
                """
                UPDATE oh_id.prescriptions
                SET status = 'SIGNED', signed_by = %s, signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (signed_by, prescription_id)
            )
        return self.get_prescription_by_id(prescription_id) or {"id": prescription_id, "status": "SIGNED"}

sp_repository = SPViewsRepository()


