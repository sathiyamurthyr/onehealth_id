import bcrypt, sys
sys.path.insert(0, 'd:/oh-id')
from backend.app.database.session import get_db_cursor

new_pw = "Asdfg!23"
new_hash = bcrypt.hashpw(new_pw[:72].encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
print("New hash:", new_hash)

update_sql = """
UPDATE oh_id.users
SET password_hash = %s
WHERE RIGHT(REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g'), 10) = %s
   OR username = %s
"""

with get_db_cursor() as cur:
    cur.execute(update_sql, (new_hash, "9176669426", "9176669426"))
    print("Rows updated:", cur.rowcount)

# Verify the new password works
from backend.app.core.security import verify_password
from backend.app.repositories.sp_views_repository import sp_repository

user = sp_repository.get_user_by_mobile("9176669426")
if user:
    result = verify_password(new_pw, user.get("password_hash", ""))
    print("Verification after update:", result)
    print("User:", user.get("username"), "|", user.get("full_name"))
else:
    print("User not found!")
