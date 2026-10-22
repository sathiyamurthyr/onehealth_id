from backend.app.database.session import get_db_cursor

SQL = """
DROP VIEW IF EXISTS oh_id.vw_doctors CASCADE;

CREATE OR REPLACE VIEW oh_id.vw_doctors AS
SELECT 
    d.id,
    d.user_id,
    d.name,
    d.specialty,
    d.qualification,
    d.registration_number,
    d.registration_authority,
    d.phone,
    d.email,
    d.room_number,
    d.opd_timings,
    d.consultation_fee,
    d.rating,
    d.experience_years,
    d.bio,
    d.available_days,
    d.slot_duration_mins,
    d.morning_start_time,
    d.morning_end_time,
    d.evening_start_time,
    d.evening_end_time,
    d.is_available,
    d.hospital_id,
    h.name AS hospital_name,
    d.department_id,
    dept.name AS department_name,
    (
        SELECT count(*) AS count
        FROM oh_id.queue_entries q
        WHERE q.doctor_id = d.id AND q.status = 'WAITING'
    ) AS active_waiting_count,
    (
        SELECT count(*) AS count
        FROM oh_id.appointments a
        WHERE a.doctor_id = d.id AND a.status = 'scheduled'
    ) AS upcoming_appointments_count
FROM oh_id.doctors d
LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id
LEFT JOIN oh_id.departments dept ON d.department_id = dept.id;
"""

with get_db_cursor() as cur:
    cur.execute(SQL)
    print("vw_doctors successfully dropped and recreated with all columns including registration_number.")
