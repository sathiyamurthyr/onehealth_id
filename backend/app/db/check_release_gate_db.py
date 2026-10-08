"""
OH-ID Pilot Release Gate Database Inspector
"""
import sys
from pathlib import Path

_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_readonly_cursor

def inspect_db():
    with get_readonly_cursor() as cur:
        # 1. Schema Tables & Views
        cur.execute("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'oh_id' ORDER BY table_name;")
        items = cur.fetchall()
        print(f"Total oh_id Tables/Views: {len(items)}")

        # 2. Audit Telemetry
        cur.execute("SELECT COUNT(*) as cnt FROM oh_id.vw_audit_logs;")
        audit_cnt = cur.fetchone()["cnt"]
        print(f"Audit Log Total Entries: {audit_cnt}")

        cur.execute("SELECT action, COUNT(*) as cnt FROM oh_id.audit_logs GROUP BY action ORDER BY cnt DESC LIMIT 10;")
        print("Top Audit Actions:")
        for r in cur.fetchall():
            print(f"  - {r['action']}: {r['cnt']}")

        # 3. Core Entities
        cur.execute("SELECT COUNT(*) as cnt FROM oh_id.hospitals;")
        hosp_cnt = cur.fetchone()["cnt"]

        cur.execute("SELECT COUNT(*) as cnt FROM oh_id.users;")
        user_cnt = cur.fetchone()["cnt"]

        cur.execute("SELECT COUNT(*) as cnt FROM oh_id.patients;")
        patient_cnt = cur.fetchone()["cnt"]

        cur.execute("SELECT COUNT(*) as cnt FROM oh_id.appointments;")
        appt_cnt = cur.fetchone()["cnt"]

        cur.execute("SELECT COUNT(*) as cnt FROM oh_id.prescriptions;")
        presc_cnt = cur.fetchone()["cnt"]

        cur.execute("SELECT COUNT(*) as cnt FROM oh_id.vw_billing_invoices;")
        inv_cnt = cur.fetchone()["cnt"]

        print(f"Hospitals: {hosp_cnt}")
        print(f"Users: {user_cnt}")
        print(f"Patients: {patient_cnt}")
        print(f"Appointments: {appt_cnt}")
        print(f"Prescriptions: {presc_cnt}")
        print(f"Billing Invoices: {inv_cnt}")

        # 4. Universal Mobile Auth Check
        cur.execute("SELECT username, phone, email, role, is_active FROM oh_id.vw_user_auth LIMIT 10;")
        print("\nActive Auth Personas (Sample):")
        for u in cur.fetchall():
            print(f"  - {u['username']} | Mobile: {u['phone']} | Email: {u['email']} | Role: {u['role']} | Active: {u['is_active']}")

if __name__ == "__main__":
    inspect_db()
