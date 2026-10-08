from typing import List, Optional, Dict, Any
import json
import uuid
import logging
from datetime import datetime, timezone
from backend.app.database.session import get_db_cursor, get_readonly_cursor

logger = logging.getLogger("ohid.phase3_repository")

class Phase3RepositoryMixin:
    """
    Phase 3: Clinical Care Ecosystem Repository Mixin for OH-ID.
    Provides complete clinical care modules matching the exact database schema:
    - Pharmacy Prescriptions & Dispensation
    - Structured Laboratory Specimen Accessions & Analyte Results
    - Radiology Orders, Studies & Imaging Reports
    - Nursing Observations, Vitals, Shift Notes & Medication Administration Record (MAR)
    - Concurrency-Safe IPD Admissions, Wards & Bed Allocation/Transfer
    - Emergency Rapid Intake, Acuity Triage & Anonymous ID Reconciliation
    - Clinical Referrals & Inter-Hospital Care Transfers
    - Structured & Versioned Inpatient Discharges
    """

    # --------------------------------------------------------------------------
    # 1. PHARMACY WORKFLOW & DISPENSATION
    # --------------------------------------------------------------------------

    def list_pharmacy_prescriptions(
        self,
        hospital_id: Optional[str] = None,
        status: Optional[str] = None,
        patient_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists electronic prescriptions awaiting pharmacy verification and dispensing."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []

            if hospital_id:
                clauses.append("p.hospital_id = %s")
                params.append(hospital_id)
            if status:
                clauses.append("p.status = %s")
                params.append(status)
            if patient_id:
                clauses.append("p.patient_id = %s")
                params.append(patient_id)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    p.id,
                    p.id AS prescription_id,
                    p.patient_id,
                    p.doctor_id,
                    p.hospital_id,
                    p.diagnosis,
                    p.instructions,
                    p.status,
                    p.created_at,
                    p.created_at AS prescription_date,
                    pt.name AS patient_name,
                    pt.onehealth_id,
                    pt.phone AS patient_phone,
                    d.name AS doctor_name,
                    d.specialty AS doctor_specialty,
                    h.name AS hospital_name,
                    COALESCE(
                        (SELECT json_agg(pi.*) FROM oh_id.prescription_items pi WHERE pi.prescription_id = p.id),
                        '[]'::json
                    ) AS items
                FROM oh_id.prescriptions p
                JOIN oh_id.patients pt ON p.patient_id = pt.id
                JOIN oh_id.doctors d ON p.doctor_id = d.id
                JOIN oh_id.hospitals h ON p.hospital_id = h.id
                {where_str}
                ORDER BY p.created_at DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_pharmacy_prescription(self, prescription_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single prescription with patient and provider details for dispensing."""
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT 
                    p.*,
                    pt.name AS patient_name,
                    pt.onehealth_id,
                    pt.phone AS patient_phone,
                    pt.age AS patient_age,
                    pt.gender AS patient_gender,
                    d.name AS doctor_name,
                    d.specialty AS doctor_specialty,
                    h.name AS hospital_name,
                    COALESCE(
                        (SELECT json_agg(pi.*) FROM oh_id.prescription_items pi WHERE pi.prescription_id = p.id),
                        '[]'::json
                    ) AS items
                FROM oh_id.prescriptions p
                JOIN oh_id.patients pt ON p.patient_id = pt.id
                JOIN oh_id.doctors d ON p.doctor_id = d.id
                JOIN oh_id.hospitals h ON p.hospital_id = h.id
                WHERE p.id = %s;
            """, (prescription_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def dispense_prescription(
        self,
        prescription_id: str,
        hospital_id: str,
        pharmacist_id: str,
        items_dispensed: List[Dict[str, Any]],
        substitution_allowed: bool = False,
        notes: Optional[str] = None,
        is_partial: bool = False
    ) -> Dict[str, Any]:
        """
        Records prescription dispensation without modifying the finalized doctor prescription.
        Maintains medication history and logs clinical audit.
        """
        with get_db_cursor() as cur:
            cur.execute("SELECT id, patient_id, hospital_id, status FROM oh_id.prescriptions WHERE id = %s;", (prescription_id,))
            rx = cur.fetchone()
            if not rx:
                raise ValueError(f"Prescription '{prescription_id}' not found.")
            
            patient_id = rx["patient_id"]
            dispense_status = "PARTIALLY_DISPENSED" if is_partial else "DISPENSED"
            dispensations = []

            for item in items_dispensed:
                dispense_id = f"disp-{uuid.uuid4().hex[:12]}"
                cur.execute("""
                    INSERT INTO oh_id.pharmacy_dispensations (
                        id, hospital_id, prescription_id, patient_id, medicine_name,
                        prescribed_quantity, dispensed_quantity, dosage_instructions,
                        batch_number, expiry_date, substitution_notes, pharmacist_id,
                        status, dispensed_at
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, CURRENT_TIMESTAMP
                    ) RETURNING *;
                """, (
                    dispense_id, hospital_id, prescription_id, patient_id,
                    item.get("medicine_name", "Prescribed Medication"),
                    item.get("prescribed_quantity", 1),
                    item.get("dispensed_quantity", 1),
                    item.get("instructions", "As directed"),
                    item.get("batch_number"),
                    item.get("expiry_date"),
                    notes,
                    pharmacist_id,
                    dispense_status
                ))
                dispensations.append(dict(cur.fetchone()))

            # Update prescription status flag
            cur.execute("""
                UPDATE oh_id.prescriptions
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (dispense_status, prescription_id))

            # Record audit log
            cur.execute("""
                INSERT INTO oh_id.audit_logs (
                    id, actor_id, actor_name, hospital_id, action, resource_type, resource_id, details, ip_address, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                );
            """, (
                f"aud-{uuid.uuid4().hex[:12]}", pharmacist_id, "Pharmacist", hospital_id,
                'DISPENSE_PRESCRIPTION', 'pharmacy_dispensations', prescription_id,
                json.dumps({"prescription_id": prescription_id, "items_count": len(items_dispensed)}),
                '127.0.0.1'
            ))

            return {
                "prescription_id": prescription_id,
                "status": dispense_status,
                "dispensed_items": dispensations,
                "dispensed_at": datetime.now(timezone.utc).isoformat()
            }

    def list_pharmacy_dispensations(
        self,
        hospital_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        prescription_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists medication dispensing history."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if hospital_id:
                clauses.append("pd.hospital_id = %s")
                params.append(hospital_id)
            if patient_id:
                clauses.append("pd.patient_id = %s")
                params.append(patient_id)
            if prescription_id:
                clauses.append("pd.prescription_id = %s")
                params.append(prescription_id)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    pd.*,
                    p.name AS patient_name,
                    p.onehealth_id,
                    h.name AS hospital_name
                FROM oh_id.pharmacy_dispensations pd
                JOIN oh_id.patients p ON pd.patient_id = p.id
                JOIN oh_id.hospitals h ON pd.hospital_id = h.id
                {where_str}
                ORDER BY pd.dispensed_at DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # 2. LABORATORY WORKFLOW (SAMPLES & ANALYTES)
    # --------------------------------------------------------------------------

    def list_lab_samples(
        self,
        hospital_id: Optional[str] = None,
        status: Optional[str] = None,
        order_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists laboratory specimen accessions and collection orders."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if hospital_id:
                clauses.append("ls.hospital_id = %s")
                params.append(hospital_id)
            if status:
                clauses.append("ls.status = %s")
                params.append(status)
            if order_id:
                clauses.append("ls.order_id = %s")
                params.append(order_id)
            if patient_id:
                clauses.append("ls.patient_id = %s")
                params.append(patient_id)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    ls.*,
                    p.name AS patient_name,
                    p.onehealth_id,
                    COALESCE(tc.name, lo.test_id, 'Diagnostic Test') AS test_name,
                    COALESCE(tc.category, 'LABORATORY') AS test_category
                FROM oh_id.lab_samples ls
                JOIN oh_id.patients p ON ls.patient_id = p.id
                JOIN oh_id.lab_orders lo ON ls.order_id = lo.id
                LEFT JOIN oh_id.lab_test_catalog tc ON lo.test_id = tc.id
                {where_str}
                ORDER BY ls.collection_time DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def collect_lab_sample(
        self,
        order_id: str,
        patient_id: str,
        hospital_id: str,
        sample_type: str,
        collected_by: str,
        accession_number: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Registers and records specimen collection for an investigation order."""
        with get_db_cursor() as cur:
            sample_id = f"samp-{uuid.uuid4().hex[:12]}"
            acc_num = accession_number or f"ACC-{uuid.uuid4().hex[:8].upper()}"

            cur.execute("""
                INSERT INTO oh_id.lab_samples (
                    id, hospital_id, order_id, patient_id, sample_type, accession_number,
                    collector_id, collection_time, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, CURRENT_TIMESTAMP, 'COLLECTED'
                ) RETURNING *;
            """, (sample_id, hospital_id, order_id, patient_id, sample_type, acc_num, collected_by))
            sample = dict(cur.fetchone())

            # Update lab order status
            cur.execute("""
                UPDATE oh_id.lab_orders
                SET status = 'SAMPLE_COLLECTED', sample_id = %s, collected_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (sample_id, order_id))

            return sample

    def update_lab_sample_status(
        self,
        sample_id: str,
        status: str,
        rejection_reason: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Updates specimen processing status (e.g. RECEIVED, PROCESSING, REJECTED)."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.lab_samples
                SET status = %s, rejection_reason = %s
                WHERE id = %s
                RETURNING *;
            """, (status, rejection_reason, sample_id))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Lab sample '{sample_id}' not found.")
            return dict(row)

    def record_lab_results(
        self,
        investigation_id: str,
        patient_id: str,
        hospital_id: str,
        technician_id: str,
        analytes: List[Dict[str, Any]],
        sample_id: Optional[str] = None,
        method: Optional[str] = None,
        is_verified: bool = False,
        pathologist_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Records structured lab test analytes with reference ranges, abnormal flags, and verification status."""
        with get_db_cursor() as cur:
            status = "FINALIZED" if is_verified else "PRELIMINARY"
            verified_at = datetime.now(timezone.utc) if is_verified else None
            inserted_results = []

            # Get test name from lab_orders
            cur.execute("""
                SELECT lo.test_id, COALESCE(tc.name, lo.test_id, 'Diagnostic Test') AS test_name
                FROM oh_id.lab_orders lo
                LEFT JOIN oh_id.lab_test_catalog tc ON lo.test_id = tc.id
                WHERE lo.id = %s;
            """, (investigation_id,))
            inv_row = cur.fetchone()
            test_name = inv_row["test_name"] if inv_row else "Clinical Lab Test"

            for a in analytes:
                res_id = f"res-{uuid.uuid4().hex[:12]}"
                cur.execute("""
                    INSERT INTO oh_id.lab_results (
                        id, hospital_id, order_id, sample_id, patient_id, test_name,
                        analyte_name, result_value, unit, reference_range,
                        abnormal_flag, critical_flag, methodology, technician_id,
                        verifier_id, status, verified_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s
                    ) RETURNING *;
                """, (
                    res_id, hospital_id, investigation_id, sample_id, patient_id, test_name,
                    a.get("analyte_name", "Analyte"), str(a.get("value", "")), a.get("unit", ""),
                    a.get("reference_range", ""), a.get("abnormal_flag", False), a.get("critical_flag", False),
                    method, technician_id, pathologist_id, status, verified_at
                ))
                inserted_results.append(dict(cur.fetchone()))

            # Update parent lab order record
            cur.execute("""
                UPDATE oh_id.lab_orders
                SET status = %s, result_value = %s, completed_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (status, f"{len(analytes)} analytes recorded via {method or 'Automated Analysis'}", investigation_id))

            if sample_id and is_verified:
                cur.execute("UPDATE oh_id.lab_samples SET status = 'COMPLETED' WHERE id = %s;", (sample_id,))

            return {
                "id": inserted_results[0]["id"] if inserted_results else f"res-{uuid.uuid4().hex[:8]}",
                "investigation_id": investigation_id,
                "patient_id": patient_id,
                "status": status,
                "analytes": inserted_results
            }

    def verify_lab_result(self, result_id: str, pathologist_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """Pathologist review and sign-off on preliminary lab results to make them FINALIZED."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.lab_results
                SET status = 'FINALIZED',
                    verifier_id = %s,
                    verified_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *;
            """, (pathologist_id, result_id))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Lab result '{result_id}' not found.")
            res = dict(row)

            # Update parent order
            cur.execute("""
                UPDATE oh_id.lab_orders
                SET status = 'FINALIZED', verified_by = %s, reported_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (pathologist_id, res["order_id"]))

            return res

    def get_lab_order_results(self, investigation_id: str) -> List[Dict[str, Any]]:
        """Retrieves structured result history for an investigation order."""
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT 
                    lr.*,
                    p.name AS patient_name,
                    p.onehealth_id
                FROM oh_id.lab_results lr
                JOIN oh_id.patients p ON lr.patient_id = p.id
                WHERE lr.order_id = %s
                ORDER BY lr.created_at DESC;
            """, (investigation_id,))
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # 3. RADIOLOGY & IMAGING WORKFLOW
    # --------------------------------------------------------------------------

    def list_radiology_orders(
        self,
        hospital_id: Optional[str] = None,
        status: Optional[str] = None,
        patient_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists diagnostic imaging orders."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if hospital_id:
                clauses.append("ro.hospital_id = %s")
                params.append(hospital_id)
            if status:
                clauses.append("ro.status = %s")
                params.append(status)
            if patient_id:
                clauses.append("ro.patient_id = %s")
                params.append(patient_id)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    ro.*,
                    p.name AS patient_name,
                    p.onehealth_id,
                    p.phone AS patient_phone,
                    d.name AS ordering_doctor_name,
                    d.specialty AS ordering_doctor_specialty
                FROM oh_id.radiology_orders ro
                JOIN oh_id.patients p ON ro.patient_id = p.id
                JOIN oh_id.doctors d ON ro.ordering_doctor_id = d.id
                {where_str}
                ORDER BY ro.created_at DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def create_radiology_order(
        self,
        patient_id: str,
        hospital_id: str,
        ordering_doctor_id: str,
        modality: str,
        body_part: str,
        clinical_indication: str,
        priority: str = "ROUTINE",
        visit_id: Optional[str] = None,
        admission_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a structured imaging requisition."""
        with get_db_cursor() as cur:
            order_id = f"rad-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.radiology_orders (
                    id, hospital_id, patient_id, visit_id, ordering_doctor_id,
                    modality, body_part, clinical_indication, priority, status
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, 'ORDERED'
                ) RETURNING *;
            """, (
                order_id, hospital_id, patient_id, visit_id, ordering_doctor_id,
                modality.upper(), body_part, clinical_indication, priority.upper()
            ))
            return dict(cur.fetchone())

    def schedule_radiology_order(
        self,
        order_id: str,
        scheduled_at: str,
        technician_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Schedules imaging examination appointment with radiology technician."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.radiology_orders
                SET status = 'SCHEDULED',
                    scheduled_time = %s,
                    technician_id = COALESCE(%s, technician_id)
                WHERE id = %s
                RETURNING *;
            """, (scheduled_at, technician_id, order_id))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Radiology order '{order_id}' not found.")
            return dict(row)

    def perform_radiology_study(
        self,
        order_id: str,
        performed_by: str,
        dicom_study_uid: Optional[str] = None,
        pacs_series_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Marks imaging study as completed by radiology technician."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.radiology_orders
                SET status = 'PERFORMED',
                    technician_id = %s,
                    performed_time = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *;
            """, (performed_by, order_id))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Radiology order '{order_id}' not found.")
            return dict(row)

    def create_radiology_report(
        self,
        order_id: str,
        patient_id: str,
        hospital_id: str,
        radiologist_id: str,
        modality: str,
        body_part: str,
        findings: str,
        impression: str,
        status: str = "FINALIZED",
        dicom_study_uid: Optional[str] = None,
        pacs_series_url: Optional[str] = None,
        recommendations: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates an immutable structured radiology report with impression and diagnostic findings."""
        with get_db_cursor() as cur:
            report_id = f"radrep-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.radiology_reports (
                    id, hospital_id, order_id, patient_id, radiologist_id, modality,
                    study_description, findings, impression, recommendations,
                    image_study_uid, status, finalized_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, CURRENT_TIMESTAMP
                ) RETURNING *;
            """, (
                report_id, hospital_id, order_id, patient_id, radiologist_id, modality.upper(),
                body_part, findings, impression, recommendations, dicom_study_uid, status
            ))
            report = dict(cur.fetchone())

            # Update order to FINALIZED
            cur.execute("UPDATE oh_id.radiology_orders SET status = 'FINALIZED' WHERE id = %s;", (order_id,))
            return report

    def list_radiology_reports(
        self,
        hospital_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        order_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists diagnostic imaging reports."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if hospital_id:
                clauses.append("rr.hospital_id = %s")
                params.append(hospital_id)
            if patient_id:
                clauses.append("rr.patient_id = %s")
                params.append(patient_id)
            if order_id:
                clauses.append("rr.order_id = %s")
                params.append(order_id)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    rr.*,
                    p.name AS patient_name,
                    p.onehealth_id,
                    d.name AS radiologist_name,
                    d.specialty AS radiologist_specialty
                FROM oh_id.radiology_reports rr
                JOIN oh_id.patients p ON rr.patient_id = p.id
                JOIN oh_id.doctors d ON rr.radiologist_id = d.id
                {where_str}
                ORDER BY rr.finalized_at DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # 4. NURSING WORKFLOW, VITALS & MAR
    # --------------------------------------------------------------------------

    def list_nursing_observations(
        self,
        patient_id: str,
        encounter_id: Optional[str] = None,
        admission_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Retrieves clinical vital signs and nursing observations timeline."""
        with get_readonly_cursor() as cur:
            clauses = ["patient_id = %s"]
            params = [patient_id]
            if encounter_id:
                clauses.append("encounter_id = %s")
                params.append(encounter_id)
            if admission_id:
                clauses.append("admission_id = %s")
                params.append(admission_id)

            where_str = "WHERE " + " AND ".join(clauses)
            cur.execute(f"""
                SELECT * FROM oh_id.nursing_observations
                {where_str}
                ORDER BY recorded_at DESC
                LIMIT %s;
            """, tuple(params + [limit]))
            return [dict(row) for row in cur.fetchall()]

    def record_nursing_observation(
        self,
        patient_id: str,
        hospital_id: str,
        nurse_id: str,
        vital_type: str,
        value: float,
        unit: str,
        pain_score: Optional[int] = None,
        encounter_id: Optional[str] = None,
        admission_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Records a single vital observation point."""
        with get_db_cursor() as cur:
            obs_id = f"obs-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.nursing_observations (
                    id, hospital_id, patient_id, admission_id, encounter_id, nurse_id,
                    observation_type, data, pain_score, recorded_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, CURRENT_TIMESTAMP
                ) RETURNING *;
            """, (
                obs_id, hospital_id, patient_id, admission_id, encounter_id, nurse_id,
                vital_type.upper(), json.dumps({"value": value, "unit": unit, "notes": notes}), pain_score
            ))
            return dict(cur.fetchone())

    def record_vitals_batch(
        self,
        patient_id: str,
        hospital_id: str,
        nurse_id: str,
        vitals_data: Dict[str, Any],
        encounter_id: Optional[str] = None,
        admission_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Atomically records a comprehensive set of clinical vitals."""
        standard_units = {
            "temperature": "°C",
            "heart_rate": "bpm",
            "blood_pressure_systolic": "mmHg",
            "blood_pressure_diastolic": "mmHg",
            "respiratory_rate": "breaths/min",
            "spo2": "%",
            "weight": "kg",
            "height": "cm",
            "pain_score": "/10"
        }
        results = []
        pain = vitals_data.get("pain_score")
        notes = vitals_data.get("notes")

        for key, val in vitals_data.items():
            if key in ["pain_score", "notes"] or val is None:
                continue
            try:
                num_val = float(val)
                unit = standard_units.get(key, "units")
                obs = self.record_nursing_observation(
                    patient_id=patient_id,
                    hospital_id=hospital_id,
                    nurse_id=nurse_id,
                    vital_type=key,
                    value=num_val,
                    unit=unit,
                    pain_score=int(pain) if pain is not None else None,
                    encounter_id=encounter_id,
                    admission_id=admission_id,
                    notes=notes
                )
                results.append(obs)
            except (ValueError, TypeError):
                continue
        return results

    def list_nursing_notes(
        self,
        patient_id: str,
        admission_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Lists nursing progress evaluations and shift handover notes."""
        with get_readonly_cursor() as cur:
            clauses = ["patient_id = %s"]
            params = [patient_id]
            if admission_id:
                clauses.append("admission_id = %s")
                params.append(admission_id)

            where_str = "WHERE " + " AND ".join(clauses)
            cur.execute(f"""
                SELECT * FROM oh_id.nursing_notes
                {where_str}
                ORDER BY created_at DESC
                LIMIT %s;
            """, tuple(params + [limit]))
            return [dict(row) for row in cur.fetchall()]

    def record_nursing_note(
        self,
        patient_id: str,
        hospital_id: str,
        nurse_id: str,
        note_type: str,
        assessment: str,
        care_provided: str,
        patient_response: Optional[str] = None,
        concerns: Optional[str] = None,
        admission_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a finalized nursing assessment note."""
        with get_db_cursor() as cur:
            note_id = f"nn-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.nursing_notes (
                    id, hospital_id, patient_id, admission_id, nurse_id, note_type,
                    assessment, care_provided, patient_response, concerns, is_finalized
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, TRUE
                ) RETURNING *;
            """, (
                note_id, hospital_id, patient_id, admission_id, nurse_id, note_type,
                assessment, care_provided, patient_response, concerns
            ))
            row = cur.fetchone()
            res = dict(row)
            res["status"] = "FINALIZED" if res.get("is_finalized") else "DRAFT"
            return res

    def list_medication_administrations(
        self,
        patient_id: str,
        admission_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Lists Medication Administration Record (MAR) events."""
        with get_readonly_cursor() as cur:
            clauses = ["patient_id = %s"]
            params = [patient_id]
            if admission_id:
                clauses.append("admission_id = %s")
                params.append(admission_id)

            where_str = "WHERE " + " AND ".join(clauses)
            cur.execute(f"""
                SELECT * FROM oh_id.medication_administrations
                {where_str}
                ORDER BY administered_time DESC
                LIMIT %s;
            """, tuple(params + [limit]))
            return [dict(row) for row in cur.fetchall()]

    def record_medication_administration(
        self,
        prescription_id: str,
        patient_id: str,
        hospital_id: str,
        nurse_id: str,
        medicine_name: str,
        dose: str,
        route: str,
        status: str = "ADMINISTERED",
        reason_not_administered: Optional[str] = None,
        admission_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Records nurse administration of prescribed medicine (MAR)."""
        with get_db_cursor() as cur:
            mar_id = f"mar-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.medication_administrations (
                    id, hospital_id, patient_id, admission_id, prescription_id, nurse_id,
                    medicine_name, prescribed_dose, administered_dose, route,
                    status, reason_if_not_given, administered_time
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, CURRENT_TIMESTAMP
                ) RETURNING *;
            """, (
                mar_id, hospital_id, patient_id, admission_id, prescription_id, nurse_id,
                medicine_name, dose, dose, route, status, reason_not_administered
            ))
            return dict(cur.fetchone())

    # --------------------------------------------------------------------------
    # 5. IPD, WARDS & CONCURRENCY-SAFE BED MANAGEMENT
    # --------------------------------------------------------------------------

    def list_inpatient_wards(self, hospital_id: str) -> List[Dict[str, Any]]:
        """Lists hospital wards and their configuration."""
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT 
                    w.*,
                    COUNT(b.id) AS total_beds,
                    COUNT(CASE WHEN b.status = 'OCCUPIED' THEN 1 END) AS occupied_beds,
                    COUNT(CASE WHEN b.status = 'AVAILABLE' THEN 1 END) AS available_beds
                FROM oh_id.wards w
                LEFT JOIN oh_id.beds b ON w.id = b.ward_id
                WHERE w.hospital_id = %s
                GROUP BY w.id
                ORDER BY w.name ASC;
            """, (hospital_id,))
            return [dict(row) for row in cur.fetchall()]

    def list_inpatient_beds(
        self,
        hospital_id: str,
        ward_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Lists beds with real-time occupancy status."""
        with get_readonly_cursor() as cur:
            clauses = ["b.hospital_id = %s"]
            params = [hospital_id]
            if ward_id:
                clauses.append("b.ward_id = %s")
                params.append(ward_id)
            if status:
                clauses.append("b.status = %s")
                params.append(status)

            where_str = "WHERE " + " AND ".join(clauses)
            cur.execute(f"""
                SELECT 
                    b.*,
                    w.name AS ward_name,
                    w.ward_type,
                    p.name AS patient_name,
                    p.onehealth_id
                FROM oh_id.beds b
                JOIN oh_id.wards w ON b.ward_id = w.id
                LEFT JOIN oh_id.patients p ON b.current_patient_id = p.id
                {where_str}
                ORDER BY w.name ASC, b.bed_number ASC;
            """, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def get_inpatient_occupancy_dashboard(self, hospital_id: str) -> List[Dict[str, Any]]:
        """Queries the live inpatient occupancy view."""
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.vw_inpatient_occupancy_dashboard
                WHERE hospital_id = %s
                ORDER BY ward_name ASC;
            """, (hospital_id,))
            return [dict(row) for row in cur.fetchall()]

    def list_inpatient_admissions(
        self,
        hospital_id: str,
        status: Optional[str] = None,
        patient_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists inpatient admissions."""
        with get_readonly_cursor() as cur:
            clauses = ["adm.hospital_id = %s"]
            params = [hospital_id]
            if status:
                clauses.append("adm.status = %s")
                params.append(status)
            if patient_id:
                clauses.append("adm.patient_id = %s")
                params.append(patient_id)

            where_str = "WHERE " + " AND ".join(clauses)
            sql = f"""
                SELECT 
                    adm.*,
                    p.name AS patient_name,
                    p.onehealth_id,
                    p.gender AS patient_gender,
                    p.age AS patient_age,
                    d.name AS doctor_name,
                    d.specialty AS doctor_specialty,
                    b.bed_number,
                    b.ward_id
                FROM oh_id.ipd_admissions adm
                JOIN oh_id.patients p ON adm.patient_id = p.id
                JOIN oh_id.doctors d ON adm.admitting_doctor_id = d.id
                LEFT JOIN oh_id.beds b ON adm.bed_id = b.id
                {where_str}
                ORDER BY adm.admission_date DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def create_inpatient_admission(
        self,
        patient_id: str,
        hospital_id: str,
        admitting_doctor_id: str,
        department: str,
        admission_type: str = "ELECTIVE",
        reason_for_admission: Optional[str] = None,
        ward_id: Optional[str] = None,
        bed_id: Optional[str] = None,
        allocated_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates an inpatient admission and optionally allocates a bed atomically."""
        with get_db_cursor() as cur:
            adm_id = f"adm-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.ipd_admissions (
                    id, patient_id, hospital_id, admitting_doctor_id,
                    admission_type, reason_for_admission, admission_date, status, bed_id
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, CURRENT_TIMESTAMP, 'ADMITTED', %s
                ) RETURNING *;
            """, (
                adm_id, patient_id, hospital_id, admitting_doctor_id,
                admission_type.upper(), reason_for_admission, bed_id
            ))
            admission = dict(cur.fetchone())

            if bed_id:
                self.allocate_bed_transactional(
                    admission_id=adm_id,
                    bed_id=bed_id,
                    patient_id=patient_id,
                    hospital_id=hospital_id,
                    allocated_by=allocated_by or admitting_doctor_id
                )

            return admission

    def allocate_bed_transactional(
        self,
        admission_id: str,
        bed_id: str,
        patient_id: str,
        hospital_id: str,
        allocated_by: str,
        reason: str = "Initial Inpatient Bed Allocation"
    ) -> Dict[str, Any]:
        """
        Concurrency-safe transactional bed allocation using PostgreSQL row-level locks (SELECT FOR UPDATE).
        Guarantees two users cannot allocate the same bed simultaneously.
        """
        with get_db_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.beds WHERE id = %s AND hospital_id = %s FOR UPDATE;", (bed_id, hospital_id))
            bed = cur.fetchone()
            if not bed:
                raise ValueError(f"Bed '{bed_id}' not found in hospital '{hospital_id}'.")
            
            if bed["status"] not in ["AVAILABLE", "CLEANING"]:
                raise ValueError(f"Bed '{bed['bed_number']}' is currently '{bed['status']}' and cannot be allocated.")

            alloc_id = f"alloc-{uuid.uuid4().hex[:12]}"

            cur.execute("""
                INSERT INTO oh_id.bed_allocations (
                    id, hospital_id, admission_id, patient_id, bed_id,
                    allocated_by, allocated_at, status, transfer_reason
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, CURRENT_TIMESTAMP, 'OCCUPIED', %s
                ) RETURNING *;
            """, (alloc_id, hospital_id, admission_id, patient_id, bed_id, allocated_by, reason))
            allocation = dict(cur.fetchone())

            cur.execute("""
                UPDATE oh_id.beds
                SET status = 'OCCUPIED', current_patient_id = %s, is_occupied = TRUE
                WHERE id = %s;
            """, (patient_id, bed_id))

            cur.execute("""
                UPDATE oh_id.ipd_admissions
                SET bed_id = %s
                WHERE id = %s;
            """, (bed_id, admission_id))

            return allocation

    def transfer_bed_transactional(
        self,
        admission_id: str,
        from_bed_id: str,
        to_bed_id: str,
        patient_id: str,
        hospital_id: str,
        transferred_by: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Concurrency-safe inpatient bed transfer with complete audit history and state preservation.
        Locks both source and destination beds.
        """
        with get_db_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.beds WHERE id = %s AND hospital_id = %s FOR UPDATE;", (to_bed_id, hospital_id))
            target_bed = cur.fetchone()
            if not target_bed:
                raise ValueError(f"Target bed '{to_bed_id}' not found.")
            if target_bed["status"] != "AVAILABLE":
                raise ValueError(f"Target bed '{target_bed['bed_number']}' is not available (status: {target_bed['status']}).")

            cur.execute("SELECT * FROM oh_id.beds WHERE id = %s AND hospital_id = %s FOR UPDATE;", (from_bed_id, hospital_id))
            cur.execute("""
                UPDATE oh_id.beds
                SET status = 'CLEANING', current_patient_id = NULL, is_occupied = FALSE
                WHERE id = %s;
            """, (from_bed_id,))

            cur.execute("""
                UPDATE oh_id.bed_allocations
                SET status = 'TRANSFERRED', released_at = CURRENT_TIMESTAMP, released_by = %s
                WHERE admission_id = %s AND bed_id = %s AND status = 'OCCUPIED';
            """, (transferred_by, admission_id, from_bed_id))

            cur.execute("""
                UPDATE oh_id.beds
                SET status = 'OCCUPIED', current_patient_id = %s, is_occupied = TRUE
                WHERE id = %s;
            """, (patient_id, to_bed_id))

            new_alloc_id = f"alloc-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.bed_allocations (
                    id, hospital_id, admission_id, patient_id, bed_id, from_bed_id,
                    allocated_by, allocated_at, status, transfer_reason
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, CURRENT_TIMESTAMP, 'OCCUPIED', %s
                ) RETURNING *;
            """, (new_alloc_id, hospital_id, admission_id, patient_id, to_bed_id, from_bed_id, transferred_by, reason))
            new_allocation = dict(cur.fetchone())

            cur.execute("""
                UPDATE oh_id.ipd_admissions
                SET bed_id = %s
                WHERE id = %s;
            """, (to_bed_id, admission_id))

            return new_allocation

    def release_bed_transactional(self, bed_id: str, released_by: str, reason: str = "Discharge") -> None:
        """Releases an occupied bed into available status upon discharge."""
        with get_db_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.beds WHERE id = %s FOR UPDATE;", (bed_id,))
            cur.execute("""
                UPDATE oh_id.beds
                SET status = 'AVAILABLE', current_patient_id = NULL, is_occupied = FALSE
                WHERE id = %s;
            """, (bed_id,))
            cur.execute("""
                UPDATE oh_id.bed_allocations
                SET status = 'RELEASED', released_at = CURRENT_TIMESTAMP, released_by = %s
                WHERE bed_id = %s AND status = 'OCCUPIED';
            """, (released_by, bed_id))

    # --------------------------------------------------------------------------
    # 6. EMERGENCY WORKFLOW & TRIAGE
    # --------------------------------------------------------------------------

    def list_emergency_encounters(
        self,
        hospital_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists emergency triage encounters."""
        with get_readonly_cursor() as cur:
            clauses = ["hospital_id = %s"]
            params = [hospital_id]
            if status:
                clauses.append("disposition = %s")
                params.append(status)

            where_str = "WHERE " + " AND ".join(clauses)
            sql = f"""
                SELECT * FROM oh_id.vw_emergency_triage_active
                {where_str}
                ORDER BY triage_score ASC, arrival_time DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def create_emergency_intake(
        self,
        hospital_id: str,
        arrival_mode: str,
        presenting_complaint: str,
        registered_by: str,
        patient_id: Optional[str] = None,
        is_unknown_identity: bool = False,
        temporary_identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Rapid emergency registration. Supports unknown identity with temporary identifiers
        without generating duplicate permanent OH-IDs.
        """
        with get_db_cursor() as cur:
            enc_id = f"emg-{uuid.uuid4().hex[:12]}"
            temp_id = temporary_identifier or (f"EMG-UNKNOWN-{uuid.uuid4().hex[:6].upper()}" if is_unknown_identity else None)

            cur.execute("""
                INSERT INTO oh_id.emergency_encounters (
                    id, hospital_id, patient_id, is_anonymous_patient, temporary_identity_code,
                    arrival_mode, presenting_complaint, disposition, status, arrival_time
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, 'UNDER_EVALUATION', 'ACTIVE', CURRENT_TIMESTAMP
                ) RETURNING *;
            """, (
                enc_id, hospital_id, patient_id, is_unknown_identity, temp_id,
                arrival_mode, presenting_complaint
            ))
            row = cur.fetchone()
            res = dict(row)
            res["is_unknown_identity"] = res.get("is_anonymous_patient")
            return res

    def update_emergency_triage(
        self,
        encounter_id: str,
        triage_nurse_id: str,
        triage_category: str,
        triage_priority: int,
        vital_signs: Optional[Dict[str, Any]] = None,
        pain_score: Optional[int] = None,
        observations: Optional[str] = None
    ) -> Dict[str, Any]:
        """Updates clinical emergency triage category (Level 1 Resuscitation to Level 5 Non-urgent)."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.emergency_encounters
                SET emergency_category = %s,
                    triage_score = %s,
                    triage_nurse_id = %s,
                    triage_notes = %s
                WHERE id = %s
                RETURNING *;
            """, (
                triage_category.upper(), triage_priority, triage_nurse_id,
                observations or json.dumps(vital_signs or {}), encounter_id
            ))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Emergency encounter '{encounter_id}' not found.")
            res = dict(row)
            res["triage_priority"] = res.get("triage_score")
            return res

    def update_emergency_disposition(
        self,
        encounter_id: str,
        disposition: str,
        attending_doctor_id: Optional[str] = None,
        disposition_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Finalizes emergency outcome (ADMITTED_IPD, DISCHARGED, TRANSFERRED, EXPIRED)."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.emergency_encounters
                SET disposition = %s,
                    attending_doctor_id = COALESCE(%s, attending_doctor_id),
                    disposition_time = CURRENT_TIMESTAMP,
                    status = 'RESOLVED'
                WHERE id = %s
                RETURNING *;
            """, (disposition.upper(), attending_doctor_id, encounter_id))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Emergency encounter '{encounter_id}' not found.")
            return dict(row)

    def reconcile_emergency_identity(
        self,
        encounter_id: str,
        verified_patient_id: str,
        verified_by: str
    ) -> Dict[str, Any]:
        """Reconciles an anonymous/unknown emergency encounter with a verified permanent OH-ID patient record."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.emergency_encounters
                SET patient_id = %s,
                    is_anonymous_patient = FALSE,
                    triage_notes = COALESCE(triage_notes, '') || ' [Identity reconciled to verified patient by ' || %s || ']'
                WHERE id = %s
                RETURNING *;
            """, (verified_patient_id, verified_by, encounter_id))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Emergency encounter '{encounter_id}' not found.")
            res = dict(row)
            res["is_unknown_identity"] = res.get("is_anonymous_patient")
            return res

    # --------------------------------------------------------------------------
    # 7. CLINICAL REFERRAL MANAGEMENT
    # --------------------------------------------------------------------------

    def list_clinical_referrals(
        self,
        hospital_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists outgoing and incoming inter-hospital and specialist referrals."""
        with get_readonly_cursor() as cur:
            clauses = []
            params = []
            if hospital_id:
                clauses.append("(ref.hospital_id = %s OR ref.source_facility_id = %s)")
                params.extend([hospital_id, hospital_id])
            if patient_id:
                clauses.append("ref.patient_id = %s")
                params.append(patient_id)
            if status:
                clauses.append("ref.status = %s")
                params.append(status)

            where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            sql = f"""
                SELECT 
                    ref.*,
                    p.name AS patient_name,
                    p.onehealth_id,
                    d_src.name AS referring_doctor_name,
                    d_src.specialty AS referring_doctor_specialty
                FROM oh_id.referrals ref
                JOIN oh_id.patients p ON ref.patient_id = p.id
                JOIN oh_id.doctors d_src ON ref.referring_doctor_id = d_src.id
                {where_str}
                ORDER BY ref.created_at DESC
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall()]

    def create_clinical_referral(
        self,
        patient_id: str,
        referring_hospital_id: str,
        referring_doctor_id: str,
        destination_hospital_id: str,
        specialty_needed: str,
        reason_for_referral: str,
        urgency: str = "ROUTINE",
        clinical_summary: Optional[str] = None,
        destination_doctor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a digital medical referral with clinical summary and care transfer instructions."""
        with get_db_cursor() as cur:
            ref_id = f"ref-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO oh_id.referrals (
                    id, patient_id, hospital_id, referring_doctor_id,
                    specialty, reason, clinical_summary, urgency, status
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, 'SENT'
                ) RETURNING *;
            """, (
                ref_id, patient_id, referring_hospital_id, referring_doctor_id,
                specialty_needed, reason_for_referral, clinical_summary, urgency.upper()
            ))
            return dict(cur.fetchone())

    def update_referral_status(
        self,
        referral_id: str,
        status: str,
        updated_by: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Transitions referral state (e.g., ACCEPTED, IN_PROGRESS, COMPLETED, DECLINED)."""
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.referrals
                SET status = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *;
            """, (status.upper(), referral_id))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Referral '{referral_id}' not found.")
            return dict(row)

    # --------------------------------------------------------------------------
    # 8. DISCHARGE MANAGEMENT & IMMUTABLE CLINICAL SUMMARIES
    # --------------------------------------------------------------------------

    def get_inpatient_discharge_summary(self, admission_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves the discharge summary for an inpatient admission."""
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT 
                    dis.*,
                    p.name AS patient_name,
                    p.onehealth_id,
                    p.gender AS patient_gender,
                    p.age AS patient_age,
                    d.name AS attending_doctor_name,
                    d.specialty AS attending_doctor_specialty,
                    h.name AS hospital_name
                FROM oh_id.discharges dis
                JOIN oh_id.patients p ON dis.patient_id = p.id
                JOIN oh_id.doctors d ON dis.attending_doctor_id = d.id
                JOIN oh_id.hospitals h ON dis.hospital_id = h.id
                WHERE dis.admission_id = %s;
            """, (admission_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def create_or_update_discharge_summary(
        self,
        admission_id: str,
        patient_id: str,
        hospital_id: str,
        attending_doctor_id: str,
        diagnosis: str,
        discharge_type: str = "ROUTINE",
        condition_at_discharge: str = "STABLE",
        clinical_summary: Optional[str] = None,
        procedures_performed: Optional[List[str]] = None,
        discharge_medications: Optional[List[Dict[str, Any]]] = None,
        follow_up_instructions: Optional[str] = None,
        status: str = "DRAFT"
    ) -> Dict[str, Any]:
        """Creates or updates a draft discharge summary."""
        with get_db_cursor() as cur:
            summary_text = clinical_summary or "Clinical course and hospital stay managed according to protocol."
            follow_up_text = follow_up_instructions or "Routine follow-up in OPD after 7 days."
            
            cur.execute("SELECT id, version FROM oh_id.discharges WHERE admission_id = %s;", (admission_id,))
            existing = cur.fetchone()
            
            if existing:
                cur.execute("""
                    UPDATE oh_id.discharges
                    SET primary_diagnosis = %s,
                        discharge_type = %s,
                        condition_at_discharge = %s,
                        hospital_course_summary = %s,
                        procedures_performed = %s,
                        discharge_medications = %s,
                        follow_up_instructions = %s,
                        status = %s,
                        version = version + 1
                    WHERE admission_id = %s
                    RETURNING *;
                """, (
                    diagnosis, discharge_type.upper(), condition_at_discharge.upper(),
                    summary_text, json.dumps(procedures_performed or []),
                    json.dumps(discharge_medications or []), follow_up_text,
                    status, admission_id
                ))
            else:
                dis_id = f"dis-{uuid.uuid4().hex[:12]}"
                cur.execute("""
                    INSERT INTO oh_id.discharges (
                        id, hospital_id, admission_id, patient_id, attending_doctor_id,
                        primary_diagnosis, discharge_type, condition_at_discharge,
                        hospital_course_summary, procedures_performed, discharge_medications,
                        follow_up_instructions, status, version
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, 1
                    )
                    RETURNING *;
                """, (
                    dis_id, hospital_id, admission_id, patient_id, attending_doctor_id,
                    diagnosis, discharge_type.upper(), condition_at_discharge.upper(), summary_text,
                    json.dumps(procedures_performed or []), json.dumps(discharge_medications or []),
                    follow_up_text, status
                ))
            return dict(cur.fetchone())

    def finalize_discharge(self, discharge_id: str, finalized_by: str) -> Dict[str, Any]:
        """
        Finalizes an inpatient discharge record:
        - Locks summary to immutable status FINALIZED
        - Updates ipd_admissions.status to DISCHARGED with discharge_date
        - Automatically releases allocated bed back to AVAILABLE
        """
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.discharges
                SET status = 'FINALIZED',
                    finalized_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *;
            """, (discharge_id,))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Discharge summary '{discharge_id}' not found.")
            discharge = dict(row)

            admission_id = discharge["admission_id"]

            cur.execute("""
                UPDATE oh_id.ipd_admissions
                SET status = 'DISCHARGED',
                    discharge_date = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING bed_id;
            """, (admission_id,))
            adm = cur.fetchone()

            if adm and adm.get("bed_id"):
                bed_id = adm["bed_id"]
                cur.execute("""
                    UPDATE oh_id.beds
                    SET status = 'AVAILABLE', current_patient_id = NULL, is_occupied = FALSE
                    WHERE id = %s;
                """, (bed_id,))
                cur.execute("""
                    UPDATE oh_id.bed_allocations
                    SET status = 'RELEASED', released_at = CURRENT_TIMESTAMP, released_by = %s
                    WHERE admission_id = %s AND status = 'OCCUPIED';
                """, (finalized_by, admission_id))

            return discharge
