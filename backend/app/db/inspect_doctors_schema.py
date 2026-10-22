from backend.app.database.session import get_db_cursor

with get_db_cursor() as cur:
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'oh_id' AND table_name = 'doctors';
    """)
    print("oh_id.doctors columns:")
    for row in cur.fetchall():
        print(f"  {row['column_name']} ({row['data_type']})")

    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'oh_id' AND table_name = 'vw_doctors';
    """)
    print("\noh_id.vw_doctors columns:")
    for row in cur.fetchall():
        print(f"  {row['column_name']} ({row['data_type']})")
