from backend.app.database.session import get_readonly_cursor

def check():
    with get_readonly_cursor() as cur:
        cur.execute("SELECT id, onehealth_id, name, user_id, phone, email, hospital_id FROM oh_id.patients WHERE user_id = %s;", ('usr-patient',))
        rows = cur.fetchall()
        print("PATIENT ROWS:", [dict(r) for r in rows])

if __name__ == "__main__":
    check()
