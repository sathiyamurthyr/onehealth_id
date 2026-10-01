import os
import psycopg2
from pathlib import Path

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"
)

def run_init():
    current_dir = Path(__file__).resolve().parent
    schema_path = current_dir / "oh_id_schema.sql"
    seed_path = current_dir / "seed_data.sql"

    print("Connecting to PostgreSQL database...")
    conn = psycopg2.connect(DB_URL, connect_timeout=10)
    conn.autocommit = True
    cur = conn.cursor()

    print(f"Executing schema from {schema_path}...")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    cur.execute(schema_sql)
    print("Schema, tables, views, and stored procedures created successfully!")

    print(f"Executing seed data from {seed_path}...")
    with open(seed_path, "r", encoding="utf-8") as f:
        seed_sql = f.read()
    cur.execute(seed_sql)
    print("Seed data applied successfully!")

    # Verify Views
    cur.execute("SELECT COUNT(*) FROM oh_id.vw_patients;")
    patient_count = cur.fetchone()[0]
    print(f"Verification: Found {patient_count} patients in oh_id.vw_patients view.")

    cur.execute("SELECT COUNT(*) FROM oh_id.vw_doctors;")
    doc_count = cur.fetchone()[0]
    print(f"Verification: Found {doc_count} doctors in oh_id.vw_doctors view.")

    cur.execute("SELECT COUNT(*) FROM oh_id.vw_appointments;")
    appt_count = cur.fetchone()[0]
    print(f"Verification: Found {appt_count} appointments in oh_id.vw_appointments view.")

    cur.close()
    conn.close()
    print("Database initialization complete!")

if __name__ == "__main__":
    run_init()
