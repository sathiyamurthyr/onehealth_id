from backend.app.database.session import get_readonly_cursor

def inspect_p101():
    with get_readonly_cursor() as cur:
        # Appointments
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.appointments WHERE patient_id = 'p-101';")
        print("Appointments count:", cur.fetchone()['c'])

        # Encounters
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.vw_opd_encounters WHERE patient_id = 'p-101';")
        print("Encounters count:", cur.fetchone()['c'])

        # Prescriptions
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.prescriptions WHERE patient_id = 'p-101';")
        print("Prescriptions count:", cur.fetchone()['c'])

        # Lab orders
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.lab_orders WHERE patient_id = 'p-101';")
        print("Lab orders count:", cur.fetchone()['c'])

        # Medical Documents
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.vw_medical_documents WHERE patient_id = 'p-101';")
        print("Medical documents count:", cur.fetchone()['c'])

        # Invoices / Bills
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.invoices WHERE patient_id = 'p-101';")
        print("Invoices count:", cur.fetchone()['c'])

        # Insurance
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.vw_patient_insurances WHERE patient_id = 'p-101';")
        print("Insurances count:", cur.fetchone()['c'])

        # Consents
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.vw_patient_consents WHERE patient_id = 'p-101';")
        print("Consents count:", cur.fetchone()['c'])

        # Notifications
        cur.execute("SELECT COUNT(*) AS c FROM oh_id.notifications WHERE patient_id = 'p-101';")
        print("Notifications count:", cur.fetchone()['c'])

if __name__ == "__main__":
    inspect_p101()
