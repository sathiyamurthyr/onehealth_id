"""
Enterprise Session and Token Revocation Manager
Implements distributed and persistent server-side token revocation, short-lived
session tracking, user deactivation checks, and role change invalidation.
Sathus Technology Pvt Ltd - OneHealth ID Enterprise Security
"""

import time
import uuid
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Set
from backend.app.core.config import settings
from backend.app.core.logging import logger, log_security_event
from backend.app.database.session import get_db_cursor, get_readonly_cursor


class SessionManager:
    """
    Enterprise Session & Token Revocation Manager.
    - Redis-backed distributed revocation cache for sub-millisecond evaluation.
    - PostgreSQL persistence in `oh_id.user_sessions` for audit and failover durability.
    - Immediate invalidation on logout, role changes, or user deactivation.
    """

    def __init__(self):
        self._in_memory_revoked: Set[str] = set()
        self._user_revoked_before: Dict[str, float] = {}
        self._lock = threading.Lock()
        self._redis_client = None

    def set_redis_client(self, client: Any) -> None:
        """Injects or overrides Redis client for testing or custom pools."""
        with self._lock:
            self._redis_client = client

    def get_redis_client(self) -> Optional[Any]:
        if self._redis_client is not None:
            return self._redis_client

        if settings.REDIS_ENABLED or (settings.REDIS_URL and settings.ENVIRONMENT == "production"):
            try:
                import redis
                with self._lock:
                    if self._redis_client is None:
                        self._redis_client = redis.from_url(
                            settings.REDIS_URL,
                            decode_responses=True,
                            socket_timeout=1.5,
                            socket_connect_timeout=1.5
                        )
                return self._redis_client
            except Exception as e:
                logger.warning(f"Failed to connect to Redis session store: {e}")
                return None
        return None

    def record_session(
        self,
        user_id: str,
        jti: str,
        expires_at: datetime,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Records an active user session in the persistent database."""
        try:
            with get_db_cursor() as cur:
                session_id = f"sess-{uuid.uuid4().hex[:12]}"
                cur.execute("""
                    INSERT INTO oh_id.user_sessions (
                        id, user_id, session_token, ip_address, user_agent,
                        is_active, expires_at, last_activity_at, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        TRUE, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (id) DO NOTHING;
                """, (
                    session_id, user_id, jti, ip_address or "127.0.0.1",
                    (user_agent or "Browser")[:500], expires_at
                ))
        except Exception as e:
            logger.debug(f"Non-critical: Failed to persist user_session record: {e}")

    def revoke_token(
        self,
        jti: str,
        user_id: Optional[str] = None,
        ttl_seconds: int = 86400,
        reason: str = "logout"
    ) -> None:
        """
        Invalidates a specific token JTI server-side.
        Subsequent requests using this token will be rejected with 401 Unauthorized.
        """
        if not jti:
            return

        # 1. Update in-memory revocation set
        with self._lock:
            self._in_memory_revoked.add(jti)

        # 2. Add to distributed Redis blocklist if available
        client = self.get_redis_client()
        if client:
            try:
                client.setex(f"ohid:revoked_token:{jti}", ttl_seconds, "1")
            except Exception as err:
                logger.warning(f"Redis token revocation failed: {err}")

        # 3. Update PostgreSQL session table
        try:
            with get_db_cursor() as cur:
                cur.execute("""
                    UPDATE oh_id.user_sessions
                    SET is_active = FALSE
                    WHERE session_token = %s;
                """, (jti,))
        except Exception as db_err:
            logger.debug(f"Database session revocation update: {db_err}")

        log_security_event(
            "SESSION_REVOKED",
            actor_id=user_id or "UNKNOWN",
            resource=f"token:{jti[:8]}...",
            status="SUCCESS",
            details={"reason": reason}
        )

    def revoke_all_user_sessions(self, user_id: str, reason: str = "role_change") -> None:
        """
        Invalidates ALL active sessions and tokens for a specific user.
        Used on password change, role demotion, or administrative account lock.
        """
        if not user_id:
            return

        now = time.time()
        with self._lock:
            self._user_revoked_before[user_id] = now

        client = self.get_redis_client()
        if client:
            try:
                client.setex(f"ohid:user_revoked_before:{user_id}", 86400 * 7, str(now))
            except Exception as err:
                logger.warning(f"Redis user revocation timestamp update failed: {err}")

        try:
            with get_db_cursor() as cur:
                cur.execute("""
                    UPDATE oh_id.user_sessions
                    SET is_active = FALSE
                    WHERE user_id = %s;
                """, (user_id,))
        except Exception as db_err:
            logger.debug(f"Database user sessions bulk revocation: {db_err}")

        log_security_event(
            "USER_ALL_SESSIONS_REVOKED",
            actor_id=user_id,
            resource=f"user:{user_id}",
            status="SUCCESS",
            details={"reason": reason}
        )

    def is_token_revoked(
        self,
        jti: Optional[str],
        user_id: Optional[str] = None,
        issued_at: Optional[float] = None
    ) -> bool:
        """
        Checks whether a token or user session has been revoked.
        Returns True if revoked, False if still active.
        """
        if not jti:
            return False

        # 1. Check in-memory revoked set
        with self._lock:
            if jti in self._in_memory_revoked:
                return True

            if user_id and issued_at:
                revoked_before = self._user_revoked_before.get(user_id)
                if revoked_before and issued_at < revoked_before:
                    return True

        # 2. Check Redis distributed blocklist
        client = self.get_redis_client()
        if client:
            try:
                if client.exists(f"ohid:revoked_token:{jti}"):
                    return True

                if user_id and issued_at:
                    rev_ts_str = client.get(f"ohid:user_revoked_before:{user_id}")
                    if rev_ts_str and issued_at < float(rev_ts_str):
                        return True
            except Exception as e:
                logger.debug(f"Redis revocation lookup failed: {e}")

        # 3. Check persistent database session status
        try:
            with get_readonly_cursor() as cur:
                cur.execute("""
                    SELECT is_active, expires_at 
                    FROM oh_id.user_sessions 
                    WHERE session_token = %s 
                    LIMIT 1;
                """, (jti,))
                row = cur.fetchone()
                if row:
                    if not row.get("is_active", True):
                        return True
                    if row.get("expires_at") and row["expires_at"] < datetime.now(timezone.utc):
                        return True
        except Exception as e:
            logger.debug(f"DB session verification check: {e}")

        return False

    def reset(self) -> None:
        """Reset state for tests."""
        with self._lock:
            self._in_memory_revoked.clear()
            self._user_revoked_before.clear()


session_manager = SessionManager()
