import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from backend.app.database.session import get_readonly_cursor

def main():
    with get_readonly_cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='oh_id';")
        tables = [r['table_name'] for r in cur.fetchall()]
        print("Tables in oh_id:", sorted(tables))

        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='appointments';")
        cols = cur.fetchall()
        print("\nColumns in oh_id.appointments:")
        for c in cols:
            print(f"  {c['column_name']} ({c['data_type']})")

        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='hospitals';")
        cols = cur.fetchall()
        print("\nColumns in oh_id.hospitals:")
        for c in cols:
            print(f"  {c['column_name']} ({c['data_type']})")

        cur.execute("SELECT id, name, city, address, is_active FROM oh_id.hospitals;")
        hosps = cur.fetchall()
        print("\nExisting hospitals:")
        for h in hosps:
            print(f"  {h}")

        cur.execute("SELECT id, name, specialty, hospital_id FROM oh_id.doctors LIMIT 10;")
        docs = cur.fetchall()
        print("\nSample doctors:")
        for d in docs:
            print(f"  {d}")

        cur.execute("SELECT * FROM oh_id.family_relationships LIMIT 10;")
        rels = cur.fetchall()
        print("\nFamily relationships:")
        for r in rels:
            print(f"  {r}")

if __name__ == "__main__":
    main()
