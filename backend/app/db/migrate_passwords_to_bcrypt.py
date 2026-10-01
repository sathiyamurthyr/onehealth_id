"""
Database Migration: Upgrade Plaintext Passwords to Salted Bcrypt Hashes
Ensures compliance with OWASP ASVS, HIPAA § 164.312, and ISO 27001.
"""
from backend.app.database.session import get_db_cursor
from backend.app.core.security import get_password_hash

def migrate_passwords():
    migrated_count = 0
    with get_db_cursor() as cur:
        cur.execute("SELECT id, username, password_hash FROM oh_id.users;")
        users = cur.fetchall()

        for user in users:
            current_val = user.get("password_hash") or ""
            # If not already a bcrypt hash ($2b$, $2a$, $2y$)
            if not (current_val.startswith("$2b$") or current_val.startswith("$2a$") or current_val.startswith("$2y$")):
                # Hash the plaintext value with modern bcrypt (12 rounds)
                hashed = get_password_hash(current_val)
                cur.execute(
                    "UPDATE oh_id.users SET password_hash = %s WHERE id = %s;",
                    (hashed, user["id"])
                )
                migrated_count += 1
                print(f"[MIGRATED] User '{user['username']}' (ID: {user['id']}) password upgraded to bcrypt.")

    print(f"Migration Complete: {migrated_count} user password(s) upgraded to bcrypt.")

if __name__ == "__main__":
    migrate_passwords()
