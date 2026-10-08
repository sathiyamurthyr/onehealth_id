"""
Expands oh_id.vw_health_timeline_events to incorporate Phase 3 Clinical Care Ecosystem events:
- Pharmacy Dispensations
- Radiology Orders and Finalized Reports
- Structured Lab Results
- Inpatient Admissions
- Bed Allocations and Transfers
- Nursing Observations and Vitals
- Medication Administrations
- Emergency Encounters
- Referrals
- Structured Discharges
"""

import sys
import logging
from pathlib import Path

_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_db_cursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.db.update_timeline_view")

def update_timeline_view():
    with get_db_cursor() as cur:
        cur.execute("DROP VIEW IF EXISTS oh_id.vw_health_timeline_events CASCADE;")
        cur.execute("""
            CREATE VIEW oh_id.vw_health_timeline_events AS
            -- 1. Consultations
            SELECT 
                'event-con-' || c.id AS event_id,
                c.patient_id,
                'CONSULTATION' AS event_type,
                'Doctor Consultation: ' || c.diagnosis AS title,
                COALESCE(c.clinical_notes, c.symptoms, 'Clinical evaluation completed') AS summary,
                c.created_at AS event_timestamp,
                d.hospital_id,
                h.name AS hospital_name,
                c.doctor_id,
                d.name AS provider_name,
                d.specialty AS provider_specialty,
                jsonb_build_object(
                    'consultation_id', c.id,
                    'diagnosis', c.diagnosis,
                    'status', COALESCE(c.status, 'FINALIZED'),
                    'vitals', c.vitals,
                    'version', COALESCE(c.version, 1),
                    'digital_signature', c.digital_signature
                ) AS metadata,
                c.id AS reference_id
            FROM oh_id.opd_consultations c
            LEFT JOIN oh_id.doctors d ON c.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id

            UNION ALL

            -- 2. Prescriptions
            SELECT 
                'event-rx-' || pr.id AS event_id,
                pr.patient_id,
                'PRESCRIPTION' AS event_type,
                'Prescription Generated (' || COALESCE(pr.status, 'ACTIVE') || ')' AS title,
                COALESCE(pr.instructions, 'Medications prescribed for treatment plan') AS summary,
                pr.created_at AS event_timestamp,
                d.hospital_id,
                h.name AS hospital_name,
                pr.doctor_id,
                d.name AS provider_name,
                d.specialty AS provider_specialty,
                jsonb_build_object(
                    'prescription_id', pr.id,
                    'status', COALESCE(pr.status, 'ACTIVE'),
                    'version', COALESCE(pr.version, 1),
                    'instructions', pr.instructions
                ) AS metadata,
                pr.id AS reference_id
            FROM oh_id.prescriptions pr
            LEFT JOIN oh_id.doctors d ON pr.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id

            UNION ALL

            -- 3. Lab Orders / Investigations
            SELECT 
                'event-lab-' || lo.id AS event_id,
                lo.patient_id,
                CASE 
                    WHEN lo.status = 'COMPLETED' THEN 'LAB_REPORT'
                    ELSE 'INVESTIGATION'
                END AS event_type,
                COALESCE(tc.name, lo.test_id) || ' (' || lo.status || ')' AS title,
                CASE 
                    WHEN lo.result_value IS NOT NULL THEN 'Result: ' || lo.result_value || ' ' || COALESCE(lo.result_unit, '')
                    ELSE 'Ordered diagnostic test'
                END AS summary,
                COALESCE(lo.completed_at, lo.ordered_at) AS event_timestamp,
                lo.hospital_id,
                h.name AS hospital_name,
                lo.doctor_id,
                d.name AS provider_name,
                d.specialty AS provider_specialty,
                jsonb_build_object(
                    'order_id', lo.id,
                    'test_id', lo.test_id,
                    'test_name', tc.name,
                    'status', lo.status,
                    'priority', lo.priority,
                    'is_abnormal', lo.is_abnormal,
                    'result_value', lo.result_value,
                    'result_unit', lo.result_unit
                ) AS metadata,
                lo.id AS reference_id
            FROM oh_id.lab_orders lo
            LEFT JOIN oh_id.lab_test_catalog tc ON lo.test_id = tc.id
            LEFT JOIN oh_id.hospitals h ON lo.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON lo.doctor_id = d.id

            UNION ALL

            -- 4. Pharmacy Dispensations (Phase 3)
            SELECT
                'event-pharm-' || pd.id AS event_id,
                pd.patient_id,
                'PHARMACY_DISPENSED' AS event_type,
                'Medication Dispensed: ' || pd.medicine_name AS title,
                'Dispensed ' || pd.dispensed_quantity || ' units (Batch: ' || COALESCE(pd.batch_number, 'N/A') || ')' AS summary,
                pd.dispensed_at AS event_timestamp,
                pd.hospital_id,
                h.name AS hospital_name,
                pd.pharmacist_id AS doctor_id,
                COALESCE(u.full_name, 'Hospital Pharmacist') AS provider_name,
                'Pharmacy & Dispensary' AS provider_specialty,
                jsonb_build_object(
                    'dispensation_id', pd.id,
                    'prescription_id', pd.prescription_id,
                    'medicine_name', pd.medicine_name,
                    'prescribed_quantity', pd.prescribed_quantity,
                    'dispensed_quantity', pd.dispensed_quantity,
                    'batch_number', pd.batch_number,
                    'expiry_date', pd.expiry_date,
                    'status', pd.status
                ) AS metadata,
                pd.id AS reference_id
            FROM oh_id.pharmacy_dispensations pd
            LEFT JOIN oh_id.hospitals h ON pd.hospital_id = h.id
            LEFT JOIN oh_id.users u ON pd.pharmacist_id = u.id

            UNION ALL

            -- 5. Radiology Reports (Phase 3)
            SELECT
                'event-rad-' || rr.id AS event_id,
                rr.patient_id,
                'IMAGING_REPORT' AS event_type,
                rr.modality || ' Imaging: ' || rr.study_description AS title,
                'Impression: ' || rr.impression AS summary,
                rr.finalized_at AS event_timestamp,
                rr.hospital_id,
                h.name AS hospital_name,
                rr.radiologist_id AS doctor_id,
                COALESCE(d.name, u.full_name, 'Dr. Radiologist') AS provider_name,
                'Radiology & Imaging' AS provider_specialty,
                jsonb_build_object(
                    'report_id', rr.id,
                    'order_id', rr.order_id,
                    'modality', rr.modality,
                    'findings', rr.findings,
                    'impression', rr.impression,
                    'recommendations', rr.recommendations,
                    'image_study_uid', rr.image_study_uid,
                    'status', rr.status
                ) AS metadata,
                rr.id AS reference_id
            FROM oh_id.radiology_reports rr
            LEFT JOIN oh_id.hospitals h ON rr.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON rr.radiologist_id = d.id
            LEFT JOIN oh_id.users u ON rr.radiologist_id = u.id

            UNION ALL

            -- 6. Inpatient Admissions (Phase 3)
            SELECT
                'event-ipd-' || adm.id AS event_id,
                adm.patient_id,
                'ADMISSION' AS event_type,
                'Hospital Admission (' || COALESCE(adm.admission_type, 'INPATIENT') || '): ' || COALESCE(adm.specialty, 'General Inpatient') AS title,
                'Admitted for: ' || COALESCE(adm.reason_for_admission, 'Clinical management') AS summary,
                adm.admission_date AS event_timestamp,
                adm.hospital_id,
                h.name AS hospital_name,
                adm.admitting_doctor_id AS doctor_id,
                COALESCE(d.name, 'Dr. Admitting Physician') AS provider_name,
                COALESCE(adm.specialty, 'Inpatient Medicine') AS provider_specialty,
                jsonb_build_object(
                    'admission_id', adm.id,
                    'bed_id', adm.bed_id,
                    'admission_type', adm.admission_type,
                    'status', adm.status,
                    'admission_date', adm.admission_date
                ) AS metadata,
                adm.id AS reference_id
            FROM oh_id.ipd_admissions adm
            LEFT JOIN oh_id.hospitals h ON adm.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON adm.admitting_doctor_id = d.id

            UNION ALL

            -- 7. Nursing Observations & Vitals (Phase 3)
            SELECT
                'event-nurs-' || no.id AS event_id,
                no.patient_id,
                'NURSING_OBSERVATION' AS event_type,
                'Nursing Observation (' || COALESCE(no.observation_type, 'VITALS') || ')' AS title,
                'Recorded clinical observation' AS summary,
                no.recorded_at AS event_timestamp,
                no.hospital_id,
                h.name AS hospital_name,
                no.nurse_id AS doctor_id,
                COALESCE(u.full_name, 'Staff Nurse') AS provider_name,
                'Nursing Department' AS provider_specialty,
                jsonb_build_object(
                    'observation_id', no.id,
                    'observation_type', no.observation_type,
                    'data', no.data,
                    'pain_score', no.pain_score
                ) AS metadata,
                no.id AS reference_id
            FROM oh_id.nursing_observations no
            LEFT JOIN oh_id.hospitals h ON no.hospital_id = h.id
            LEFT JOIN oh_id.users u ON no.nurse_id = u.id

            UNION ALL

            -- 8. Medication Administration (Phase 3)
            SELECT
                'event-mar-' || ma.id AS event_id,
                ma.patient_id,
                'MEDICATION_ADMINISTERED' AS event_type,
                'Medication Administered: ' || ma.medicine_name AS title,
                'Dose: ' || COALESCE(ma.administered_dose, ma.prescribed_dose, 'Prescribed') || ' via ' || COALESCE(ma.route, 'Oral') || ' (' || ma.status || ')' AS summary,
                ma.administered_time AS event_timestamp,
                ma.hospital_id,
                h.name AS hospital_name,
                ma.nurse_id AS doctor_id,
                COALESCE(u.full_name, 'Staff Nurse') AS provider_name,
                'Inpatient Care' AS provider_specialty,
                jsonb_build_object(
                    'administration_id', ma.id,
                    'medicine_name', ma.medicine_name,
                    'administered_dose', ma.administered_dose,
                    'route', ma.route,
                    'status', ma.status
                ) AS metadata,
                ma.id AS reference_id
            FROM oh_id.medication_administrations ma
            LEFT JOIN oh_id.hospitals h ON ma.hospital_id = h.id
            LEFT JOIN oh_id.users u ON ma.nurse_id = u.id

            UNION ALL

            -- 9. Emergency Encounters (Phase 3)
            SELECT
                'event-em-' || ee.id AS event_id,
                COALESCE(ee.patient_id, 'emergency-unregistered') AS patient_id,
                'EMERGENCY_VISIT' AS event_type,
                'Emergency Visit: Triage ' || COALESCE(ee.emergency_category, 'Acuity') AS title,
                'Chief Complaint: ' || ee.presenting_complaint AS summary,
                ee.arrival_time AS event_timestamp,
                ee.hospital_id,
                h.name AS hospital_name,
                ee.attending_doctor_id AS doctor_id,
                COALESCE(d.name, u.full_name, 'Emergency Duty Physician') AS provider_name,
                'Emergency Medicine' AS provider_specialty,
                jsonb_build_object(
                    'encounter_id', ee.id,
                    'emergency_category', ee.emergency_category,
                    'triage_score', ee.triage_score,
                    'arrival_mode', ee.arrival_mode,
                    'disposition', ee.disposition,
                    'status', ee.status
                ) AS metadata,
                ee.id AS reference_id
            FROM oh_id.emergency_encounters ee
            LEFT JOIN oh_id.hospitals h ON ee.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON ee.attending_doctor_id = d.id
            LEFT JOIN oh_id.users u ON ee.attending_doctor_id = u.id

            UNION ALL

            -- 10. Referrals (Phase 3)
            SELECT
                'event-ref-' || ref.id AS event_id,
                ref.patient_id,
                'REFERRAL' AS event_type,
                'Clinical Referral: ' || COALESCE(ref.specialty, ref.destination_specialty, 'Specialist Care') || ' (' || ref.status || ')' AS title,
                'Reason: ' || COALESCE(ref.reason, 'Clinical consultation') AS summary,
                ref.created_at AS event_timestamp,
                ref.hospital_id,
                h.name AS hospital_name,
                ref.referring_doctor_id AS doctor_id,
                COALESCE(d.name, 'Referring Clinician') AS provider_name,
                COALESCE(ref.specialty, 'Specialist Care') AS provider_specialty,
                jsonb_build_object(
                    'referral_id', ref.id,
                    'referral_type', ref.referral_type,
                    'destination_facility_name', ref.destination_facility_name,
                    'destination_doctor_name', ref.destination_doctor_name,
                    'urgency', ref.urgency,
                    'status', ref.status
                ) AS metadata,
                ref.id AS reference_id
            FROM oh_id.referrals ref
            LEFT JOIN oh_id.hospitals h ON ref.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON ref.referring_doctor_id = d.id

            UNION ALL

            -- 11. Structured Discharges (Phase 3)
            SELECT
                'event-dis-' || dis.id AS event_id,
                dis.patient_id,
                'DISCHARGE' AS event_type,
                'Hospital Discharge (' || dis.discharge_type || '): ' || dis.condition_at_discharge AS title,
                'Primary Diagnosis: ' || dis.primary_diagnosis || ' | Course: ' || dis.hospital_course_summary AS summary,
                dis.finalized_at AS event_timestamp,
                dis.hospital_id,
                h.name AS hospital_name,
                dis.attending_doctor_id AS doctor_id,
                COALESCE(d.name, 'Attending Physician') AS provider_name,
                'Inpatient Care' AS provider_specialty,
                jsonb_build_object(
                    'discharge_id', dis.id,
                    'admission_id', dis.admission_id,
                    'discharge_type', dis.discharge_type,
                    'condition_at_discharge', dis.condition_at_discharge,
                    'primary_diagnosis', dis.primary_diagnosis,
                    'status', dis.status,
                    'version', dis.version
                ) AS metadata,
                dis.id AS reference_id
            FROM oh_id.discharges dis
            LEFT JOIN oh_id.hospitals h ON dis.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON dis.attending_doctor_id = d.id;
        """)
        logger.info("oh_id.vw_health_timeline_events successfully upgraded with Phase 3 events!")

if __name__ == "__main__":
    update_timeline_view()
