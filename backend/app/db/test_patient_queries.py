from backend.app.database.session import get_readonly_cursor
import json

def test_queries():
    patient_id = "p-101"
    with get_readonly_cursor() as cur:
        # 1. Patient Record
        cur.execute("SELECT * FROM oh_id.vw_patients WHERE id = %s OR user_id = %s;", (patient_id, "usr-patient"))
        patient = cur.fetchone()
        print("1. Patient:", patient['name'], patient['onehealth_id'])

        # 2. Appointments
        cur.execute("""
            SELECT 
                a.id, a.patient_id, a.doctor_id, d.name AS doctor_name, d.specialty AS doctor_specialty,
                a.hospital_id, COALESCE(h.name, 'Hospital Facility') AS hospital_name,
                a.department_id, COALESCE(dept.name, 'General OPD') AS department_name,
                a.slot, a.status, a.token_number, a.priority, a.notes, a.created_at
            FROM oh_id.appointments a
            LEFT JOIN oh_id.doctors d ON a.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON a.hospital_id = h.id
            LEFT JOIN oh_id.departments dept ON a.department_id = dept.id
            WHERE a.patient_id = %s
            ORDER BY a.created_at DESC;
        """, (patient_id,))
        appts = cur.fetchall()
        print(f"2. Appointments ({len(appts)}):", [a['doctor_name'] for a in appts])

        # 3. Visits / Encounters
        cur.execute("""
            SELECT * FROM oh_id.vw_opd_encounters 
            WHERE patient_id = %s 
            ORDER BY created_at DESC;
        """, (patient_id,))
        visits = cur.fetchall()
        print(f"3. Visits ({len(visits)}):", [(v['hospital_name'], v['diagnosis']) for v in visits])

        # 4. Prescriptions
        cur.execute("""
            SELECT * FROM oh_id.vw_prescriptions_full 
            WHERE patient_id = %s 
            ORDER BY created_at DESC;
        """, (patient_id,))
        rxs = cur.fetchall()
        print(f"4. Prescriptions ({len(rxs)}):", [(r['doctor_name'], r['status']) for r in rxs])

        # 5. Lab Reports
        cur.execute("""
            SELECT * FROM oh_id.vw_lab_orders 
            WHERE patient_id = %s 
            ORDER BY ordered_at DESC;
        """, (patient_id,))
        labs = cur.fetchall()
        print(f"5. Lab Reports ({len(labs)}):", [(l['test_name'], l['status']) for l in labs])

        # 6. Documents
        cur.execute("""
            SELECT * FROM oh_id.vw_medical_documents 
            WHERE patient_id = %s 
            ORDER BY document_date DESC;
        """, (patient_id,))
        docs = cur.fetchall()
        print(f"6. Documents ({len(docs)}):", [(d['title'], d['category']) for d in docs])

        # 7. Invoices / Bills
        cur.execute("""
            SELECT 
                i.id, i.invoice_number, i.patient_id, i.hospital_id, COALESCE(h.name, 'Healthcare Facility') AS hospital_name,
                i.appointment_id, i.subtotal, i.tax_gst, i.discount, i.total_amount, i.paid_amount, i.balance_amount,
                i.payment_status, i.created_at,
                (
                    SELECT json_agg(json_build_object(
                        'id', ii.id, 'item_type', ii.item_type, 'description', ii.description,
                        'quantity', ii.quantity, 'unit_price', ii.unit_price, 'total_price', ii.total_price
                    ))
                    FROM oh_id.invoice_items ii WHERE ii.invoice_id = i.id
                ) AS items,
                (
                    SELECT json_agg(json_build_object(
                        'id', p.id, 'payment_mode', p.payment_mode, 'amount', p.amount,
                        'transaction_ref', p.transaction_ref, 'status', p.status, 'payment_date', p.payment_date
                    ))
                    FROM oh_id.payments p WHERE p.invoice_id = i.id
                ) AS payments
            FROM oh_id.invoices i
            LEFT JOIN oh_id.hospitals h ON i.hospital_id = h.id
            WHERE i.patient_id = %s
            ORDER BY i.created_at DESC;
        """, (patient_id,))
        bills = cur.fetchall()
        print(f"7. Bills ({len(bills)}):", [(b['invoice_number'], b['total_amount'], b['payment_status']) for b in bills])

        # 8. Insurances
        cur.execute("""
            SELECT * FROM oh_id.vw_patient_insurances 
            WHERE patient_id = %s 
            ORDER BY created_at DESC;
        """, (patient_id,))
        ins = cur.fetchall()
        print(f"8. Insurance ({len(ins)}):", [(i['provider_name'], i['policy_number']) for i in ins])

        # 9. Consents
        cur.execute("""
            SELECT * FROM oh_id.vw_patient_consents 
            WHERE patient_id = %s 
            ORDER BY granted_at DESC;
        """, (patient_id,))
        consents = cur.fetchall()
        print(f"9. Consents ({len(consents)}):", [(c['hospital_name'], c['status']) for c in consents])

        # 10. Notifications
        cur.execute("""
            SELECT * FROM oh_id.notifications 
            WHERE patient_id = %s OR user_id = 'usr-patient'
            ORDER BY created_at DESC;
        """, (patient_id,))
        notifs = cur.fetchall()
        print(f"10. Notifications ({len(notifs)}):", [(n['title'], n['category']) for n in notifs])

        # 11. Visited Hospitals
        cur.execute("""
            SELECT 
                h.id AS hospital_id,
                h.name AS hospital_name,
                h.code AS hospital_code,
                h.city AS hospital_city,
                h.address AS hospital_address,
                h.phone AS hospital_phone,
                h.email AS hospital_email,
                COUNT(DISTINCT v.id) AS visits_count,
                COUNT(DISTINCT lo.id) AS labs_count
            FROM oh_id.hospitals h
            LEFT JOIN oh_id.vw_opd_encounters v ON v.hospital_id = h.id AND v.patient_id = %s
            LEFT JOIN oh_id.lab_orders lo ON lo.hospital_id = h.id AND lo.patient_id = %s
            WHERE h.id IN (
                SELECT hospital_id FROM oh_id.appointments WHERE patient_id = %s
                UNION
                SELECT hospital_id FROM oh_id.vw_opd_encounters WHERE patient_id = %s
                UNION
                SELECT hospital_id FROM oh_id.lab_orders WHERE patient_id = %s
                UNION
                SELECT hospital_id FROM oh_id.invoices WHERE patient_id = %s
            )
            GROUP BY h.id, h.name, h.code, h.city, h.address, h.phone, h.email
            ORDER BY visits_count DESC, h.name ASC;
        """, (patient_id, patient_id, patient_id, patient_id, patient_id, patient_id))
        visited_hosps = cur.fetchall()
        print(f"11. Visited Hospitals ({len(visited_hosps)}):", [(vh['hospital_name'], vh['visits_count']) for vh in visited_hosps])

        # 12. Visited Doctors
        cur.execute("""
            SELECT 
                d.id AS doctor_id,
                d.name AS doctor_name,
                d.specialty,
                d.qualification,
                d.room_number,
                COALESCE(h.name, 'Hospital') AS hospital_name,
                COALESCE(dept.name, 'General') AS department_name,
                MAX(v.created_at) AS last_visit_date,
                COUNT(v.id) AS consultations_count
            FROM oh_id.doctors d
            JOIN oh_id.vw_opd_encounters v ON v.doctor_id = d.id AND v.patient_id = %s
            LEFT JOIN oh_id.hospitals h ON COALESCE(v.hospital_id, d.hospital_id) = h.id
            LEFT JOIN oh_id.departments dept ON d.department_id = dept.id
            GROUP BY d.id, d.name, d.specialty, d.qualification, d.room_number, h.name, dept.name
            ORDER BY last_visit_date DESC;
        """, (patient_id,))
        visited_docs = cur.fetchall()
        print(f"12. Visited Doctors ({len(visited_docs)}):", [(vd['doctor_name'], vd['specialty'], str(vd['last_visit_date'])) for vd in visited_docs])

if __name__ == "__main__":
    test_queries()
