import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from backend.app.core.config import settings

@contextmanager
def get_db_cursor():
    """Provides a transactional database cursor connected to PostgreSQL with search_path=oh_id."""
    conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=10)
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SET search_path TO {settings.DB_SCHEMA}, public;")
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

@contextmanager
def get_readonly_cursor():
    """Provides a read-only cursor for high performance View queries."""
    conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=10)
    conn.autocommit = True
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SET search_path TO {settings.DB_SCHEMA}, public;")
            yield cur
    finally:
        conn.close()
