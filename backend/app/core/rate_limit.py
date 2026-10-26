"""
Enterprise Distributed Rate Limiter
Supports atomic sliding-window rate limiting backed by Redis, with multi-tenant,
per-user, and per-IP policies, privacy-preserving hashed keys, and risk-aware
fail-open/fail-closed behaviors during infrastructure outages.
Sathus Technology Pvt Ltd - OneHealth ID Enterprise Security
"""

import time
import uuid
import hashlib
import threading
from enum import Enum
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Any
from fastapi import Request, HTTPException, status

from backend.app.core.config import settings
from backend.app.core.logging import logger, log_security_event


class EndpointRisk(str, Enum):
    """Categorizes endpoint security risk to dictate outage failure policies."""
    CRITICAL_AUTH = "CRITICAL_AUTH"       # Login, MFA, Password Reset, Registration
    DOCUMENT_UPLOAD = "DOCUMENT_UPLOAD"   # Quarantined Document & Attachment Upload
    PII_REVEAL = "PII_REVEAL"             # Sensitive Clinical Field Unmasking
    GENERAL_API = "GENERAL_API"           # Directory views, standard read operations


# Atomic Redis Lua script for precise sliding-window rate limiting
SLIDING_WINDOW_LUA_SCRIPT = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local window_start = now - window

-- Purge timestamps older than the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count occurrences in the current active window
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window + 10))
    return {1, limit - count - 1, 0}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 1
    if oldest and #oldest >= 2 then
        retry_after = math.ceil(tonumber(oldest[2]) + window - now)
        if retry_after < 1 then retry_after = 1 end
    end
    return {0, 0, retry_after}
end
"""


class InProcessSlidingWindowLimiter:
    """Thread-safe in-process sliding window limiter for local fallback."""
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def reset(self, key: Optional[str] = None):
        with self._lock:
            if key:
                self._history.pop(key, None)
            else:
                self._history.clear()

    def check(self, key: str, max_requests: Optional[int] = None, window_seconds: Optional[int] = None) -> Tuple[bool, int, int]:
        max_req = max_requests or self.max_requests
        win_sec = window_seconds or self.window_seconds
        now = time.time()
        window_start = now - win_sec

        with self._lock:
            valid_timestamps = [t for t in self._history[key] if t > window_start]
            if len(valid_timestamps) >= max_req:
                oldest = valid_timestamps[0]
                retry_after = max(int(oldest + win_sec - now) + 1, 1)
                return False, 0, retry_after
            valid_timestamps.append(now)
            self._history[key] = valid_timestamps
            remaining = max_req - len(valid_timestamps)
            return True, remaining, 0


class SlidingWindowRateLimiter(InProcessSlidingWindowLimiter):
    """
    Backwards-compatible standalone sliding-window rate limiter.
    Raises HTTPException(429) directly when rate limit is exceeded.
    """
    def check(self, key: str, max_requests: Optional[int] = None, window_seconds: Optional[int] = None) -> None:
        allowed, _, retry_after = super().check(key, max_requests, window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {retry_after} seconds before retrying.",
                headers={"Retry-After": str(retry_after)}
            )


class DistributedRateLimiter:
    """
    Distributed Enterprise Rate Limiter.
    Utilizes Redis for cross-worker / cross-container atomic operations.
    Enforces risk-based fail-closed/fail-open policies during Redis connectivity outages.
    Ensures zero sensitive data (tokens, PII, passwords) leaks into Redis keys.
    """

    def __init__(self):
        self._redis_client = None
        self._lua_sha = None
        self._local_fallback = InProcessSlidingWindowLimiter()
        self._lock = threading.Lock()

    def set_redis_client(self, client: Any) -> None:
        """Explicitly sets or overrides Redis client (used for testing or custom pools)."""
        with self._lock:
            self._redis_client = client
            self._lua_sha = None

    def get_redis_client(self) -> Optional[Any]:
        """Resolves active Redis connection or initializes it lazily if enabled."""
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
                logger.warning(f"Failed to initialize Redis rate limiter client: {e}")
                return None
        return None

    def _sanitize_key(self, policy: str, raw_identifier: str) -> str:
        """
        Hashes identifiers with SHA-256 to ensure no plaintext PII, usernames,
        passwords, or sensitive tokens are stored in Redis key names.
        """
        digest = hashlib.sha256(raw_identifier.strip().lower().encode("utf-8")).hexdigest()[:16]
        return f"ohid:rl:{policy}:{digest}"

    def check_rate_limit(
        self,
        policy: str,
        identifier: str,
        max_requests: int,
        window_seconds: int,
        risk_level: EndpointRisk = EndpointRisk.GENERAL_API
    ) -> None:
        """
        Enforces rate limiting. Raises HTTP 429 when rate is exceeded.
        Applies strict fail-closed or resilient fail-open during Redis outages based on endpoint risk.
        """
        if not settings.RATE_LIMIT_ENABLED:
            return

        sanitized_key = self._sanitize_key(policy, identifier)
        now = time.time()
        member_id = f"{now}:{uuid.uuid4().hex[:8]}"

        client = self.get_redis_client()
        if client:
            try:
                # Atomic execution via Redis Lua script
                res = client.eval(
                    SLIDING_WINDOW_LUA_SCRIPT,
                    1,
                    sanitized_key,
                    now,
                    window_seconds,
                    max_requests,
                    member_id
                )
                allowed, remaining, retry_after = int(res[0]), int(res[1]), int(res[2])
                if allowed == 0:
                    log_security_event(
                        "RATE_LIMIT_EXCEEDED",
                        resource=f"policy:{policy}",
                        status="DENIED",
                        details={"policy": policy, "retry_after": retry_after}
                    )
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Please wait {retry_after} seconds before retrying.",
                        headers={"Retry-After": str(retry_after)}
                    )
                return
            except HTTPException:
                raise
            except Exception as redis_err:
                logger.error(f"Redis rate limiter failed for policy {policy}: {redis_err}")
                self._handle_outage(policy, sanitized_key, max_requests, window_seconds, risk_level, str(redis_err))
                return

        # Fallback when Redis is not configured in local development
        allowed, remaining, retry_after = self._local_fallback.check(sanitized_key, max_requests, window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {retry_after} seconds before retrying.",
                headers={"Retry-After": str(retry_after)}
            )

    def _handle_outage(
        self,
        policy: str,
        sanitized_key: str,
        max_requests: int,
        window_seconds: int,
        risk_level: EndpointRisk,
        error_msg: str
    ) -> None:
        """
        Deterministic handling of rate limiter outages according to endpoint risk:
        - CRITICAL_AUTH: Fall back to local process limiter to block brute force.
        - DOCUMENT_UPLOAD: Fail-closed (HTTP 503) under strict security mode to prevent storage flooding.
        - PII_REVEAL: Fail-closed to protect patient privacy against unthrottled enumeration.
        - GENERAL_API: Fail-open with security warning.
        """
        is_strict = settings.RATE_LIMIT_FAIL_POLICY == "strict"

        if risk_level == EndpointRisk.CRITICAL_AUTH:
            # Fall back to local in-process limiter
            allowed, _, retry_after = self._local_fallback.check(sanitized_key, max_requests, window_seconds)
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Please wait {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)}
                )
            log_security_event(
                "RATE_LIMIT_FALLBACK_LOCAL",
                resource=f"policy:{policy}",
                status="DEGRADED",
                details={"policy": policy, "error": error_msg}
            )
            return

        elif risk_level in (EndpointRisk.DOCUMENT_UPLOAD, EndpointRisk.PII_REVEAL):
            if is_strict:
                log_security_event(
                    "RATE_LIMIT_FAIL_CLOSED",
                    resource=f"policy:{policy}",
                    status="DENIED",
                    details={"policy": policy, "reason": "Service temporarily unavailable"}
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Security rate limiting service temporarily unavailable. Request rejected under fail-closed protection."
                )
            else:
                allowed, _, retry_after = self._local_fallback.check(sanitized_key, max_requests, window_seconds)
                if not allowed:
                    raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Retry after {retry_after}s.")
                return

        else:
            # GENERAL_API: Fail-open to preserve hospital operational uptime
            log_security_event(
                "RATE_LIMIT_FAIL_OPEN",
                resource=f"policy:{policy}",
                status="DEGRADED",
                details={"policy": policy, "error": error_msg}
            )
            return

    def health_check(self) -> Dict[str, Any]:
        """Validates staging/production Redis connectivity without leaking credentials."""
        client = self.get_redis_client()
        if not client:
            return {
                "status": "DISABLED" if not settings.REDIS_ENABLED else "OFFLINE",
                "connected": False,
                "tls_enabled": settings.REDIS_URL.startswith("rediss://")
            }
        try:
            pong = client.ping()
            return {
                "status": "HEALTHY",
                "connected": True,
                "ping": pong,
                "tls_enabled": settings.REDIS_URL.startswith("rediss://")
            }
        except Exception as e:
            return {
                "status": "UNHEALTHY",
                "connected": False,
                "error": str(e),
                "tls_enabled": settings.REDIS_URL.startswith("rediss://")
            }

    def reset(self):
        """Clears local fallback history."""
        self._local_fallback.reset()


# Singleton instance
distributed_rate_limiter = DistributedRateLimiter()


def get_client_ip(request: Request) -> str:
    """
    Resolves client IP securely.
    Prioritizes trusted reverse proxy header (X-Real-IP) when behind localhost/Nginx.
    """
    host_ip = request.client.host if request.client else "unknown"
    if host_ip in ("127.0.0.1", "::1", "localhost"):
        real_ip = request.headers.get("x-real-ip")
        if real_ip and real_ip.strip():
            return real_ip.strip()
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ips = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
            if ips:
                return ips[-1]
    return host_ip


def rate_limit_login(request: Request):
    """Dependency: Login and authentication rate limiter (15 requests/min per IP)."""
    client_ip = get_client_ip(request)
    if settings.ENVIRONMENT != "production" and client_ip == "testclient" and request.headers.get("x-test-rate-limit") != "true":
        return
    distributed_rate_limiter.check_rate_limit(
        policy="login",
        identifier=f"ip:{client_ip}",
        max_requests=15,
        window_seconds=60,
        risk_level=EndpointRisk.CRITICAL_AUTH
    )


def rate_limit_document_upload(request: Request):
    """Dependency: Strict upload rate limiter (20 uploads/min per IP)."""
    client_ip = get_client_ip(request)
    if settings.ENVIRONMENT != "production" and client_ip == "testclient" and request.headers.get("x-test-rate-limit") != "true":
        return
    distributed_rate_limiter.check_rate_limit(
        policy="upload",
        identifier=f"ip:{client_ip}",
        max_requests=20,
        window_seconds=60,
        risk_level=EndpointRisk.DOCUMENT_UPLOAD
    )


def rate_limit_general(request: Request):
    """Dependency: General API rate limiter (300 requests/min per IP)."""
    client_ip = get_client_ip(request)
    if settings.ENVIRONMENT != "production" and client_ip == "testclient" and request.headers.get("x-test-rate-limit") != "true":
        return
    distributed_rate_limiter.check_rate_limit(
        policy="general",
        identifier=f"ip:{client_ip}",
        max_requests=300,
        window_seconds=60,
        risk_level=EndpointRisk.GENERAL_API
    )
