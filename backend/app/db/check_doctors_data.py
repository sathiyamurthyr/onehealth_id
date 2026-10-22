from backend.app.database.session import get_readonly_cursor

with get_readonly_cursor() as cur:
    cur.execute("SELECT id, name, specialty, hospital_id, registration_number FROM oh_id.doctors;")
    docs = cur.fetchall()
    print(f"Total doctors in oh_id.doctors: {len(docs)}")
    for d in docs:
        print(f"  {d['id']} | {d['name']} | {d['specialty']} | {d['hospital_id']} | {d.get('registration_number')}")
