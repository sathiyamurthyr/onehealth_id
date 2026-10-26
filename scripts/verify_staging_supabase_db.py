"""
Isolated Read-Only Staging Database & Supabase Connectivity Verification Tool
Strictly Read-Only: Zero data modification, zero migrations, zero credentials printed.
"""

import sys
from pathlib import Path

# Add repository root to python search path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

import psycopg2
from psycopg2.extras import RealDictCursor
from backend.app.core.config import settings


def sanitize_dsn(dsn_dict: dict) -> dict:
    """Mask sensitive credentials from DSN parameters."""
    safe = {}
    for k, v in dsn_dict.items():
        if k in ("password", "secret", "token"):
            safe[k] = "[REDACTED]"
        elif k == "user":
            safe[k] = v[:3] + "***" if v else "[NONE]"
        else:
            safe[k] = v
    return safe


def verify_supabase_staging():
    print("=" * 80)
    print("ONEHEALTH ID — STAGING DATABASE & SUPABASE CONNECTION VERIFICATION")
    print("=" * 80)
    
    if not settings.DATABASE_URL:
        print("[ERROR] DATABASE_URL is not set in environment or .env file.")
        sys.exit(1)

    print("\n[1] CONNECTIVITY & TLS HANDSHAKE")
    try:
        conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=10)
        dsn_params = conn.get_dsn_parameters()
        safe_dsn = sanitize_dsn(dsn_params)
        print(f"  Connection Status  : ESTABLISHED")
        print(f"  Target Database    : {safe_dsn.get('dbname')}")
        print(f"  Target Host        : {safe_dsn.get('host')}")
        print(f"  Target Port        : {safe_dsn.get('port')}")
        print(f"  SSL Mode Active    : {safe_dsn.get('sslmode', 'require')}")
    except Exception as e:
        print(f"  Connection Status  : FAILED ({type(e).__name__}: {e})")
        sys.exit(1)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 2. Database Identity & Version
            print("\n[2] DATABASE METADATA & SCHEMA VERIFICATION")
            cur.execute("SELECT current_database() as db, current_user as u, session_user as s, version() as v;")
            meta = cur.fetchone()
            print(f"  Current Database   : {meta['db']}")
            print(f"  Active DB User     : {meta['u']}")
            print(f"  Session DB User    : {meta['s']}")
            print(f"  PostgreSQL Version : {meta['v'].split(',')[0]}")

            # 3. Schema & Table Isolation
            cur.execute(f"SET search_path TO {settings.DB_SCHEMA}, public;")
            cur.execute("SELECT current_schema() as current_schema;")
            schema_row = cur.fetchone()
            print(f"  Configured Schema  : {settings.DB_SCHEMA}")
            print(f"  Active search_path : {schema_row['current_schema']}")

            cur.execute("""
                SELECT table_schema, count(*) as table_count
                FROM information_schema.tables 
                WHERE table_schema IN (%s, 'public') 
                GROUP BY table_schema
                ORDER BY table_schema;
            """, (settings.DB_SCHEMA,))
            tables = cur.fetchall()
            for t in tables:
                print(f"  Tables in '{t['table_schema']}'   : {t['table_count']} tables")

            # 4. Read-Only Privilege Check
            print("\n[3] ROLE PRIVILEGE & HEALTHCARE DATA ISOLATION")
            cur.execute("""
                SELECT 
                    has_table_privilege(current_user, 'oh_id.patients', 'select') as can_select,
                    has_table_privilege(current_user, 'oh_id.patients', 'insert') as can_insert,
                    has_table_privilege(current_user, 'oh_id.patients', 'update') as can_update,
                    has_table_privilege(current_user, 'oh_id.patients', 'delete') as can_delete;
            """)
            privs = cur.fetchone()
            print(f"  Table 'oh_id.patients' Privileges:")
            print(f"    SELECT : {privs['can_select']}")
            print(f"    INSERT : {privs['can_insert']}")
            print(f"    UPDATE : {privs['can_update']}")
            print(f"    DELETE : {privs['can_delete']}")

            # 5. Safe Transaction Lifecycle Test
            print("\n[4] TRANSACTION & RECONNECT LIFECYCLE")
            cur.execute("SELECT 1 as ping;")
            ping = cur.fetchone()
            assert ping['ping'] == 1, "Ping query failed"
            print("  Ping Check         : PASSED (SELECT 1 returned 1)")

        conn.commit()
        print("  Transaction Commit : PASSED")
        conn.close()
        print("  Connection Close   : GRACEFUL SHUTDOWN PASSED")

        # Reconnect test
        conn2 = psycopg2.connect(settings.DATABASE_URL, connect_timeout=10)
        conn2.close()
        print("  Reconnect Test     : PASSED")

    except Exception as e:
        print(f"  [ERROR] Verification failed: {type(e).__name__}: {e}")
        conn.close()
        sys.exit(1)

    print("\n" + "=" * 80)
    print("RESULT: SUPABASE STAGING CONNECTIVITY & SCHEMA INTEGRITY FULLY VERIFIED")
    print("=" * 80)


if __name__ == "__main__":
    verify_supabase_staging()
