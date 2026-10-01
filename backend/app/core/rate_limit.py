import time
import threading
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException, status

from backend.app.core.config import settings

class SlidingWindowRateLimiter:
    """
    Thread-safe sliding-window rate limiter.
    Limits request rates by client IP and action key.
    Returns HTTP 429 when threshold exceeded.
    """
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def reset(self, key: str = None):
        """Reset history for a specific key or all keys."""
        with self._lock:
            if key:
                self._history.pop(key, None)
            else:
                self._history.clear()

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            # Filter timestamps outside the sliding window
            timestamps = [t for t in self._history[key] if t > window_start]
            if len(timestamps) >= self.max_requests:
                oldest_timestamp = timestamps[0]
                retry_after = int(oldest_timestamp + self.window_seconds - now) + 1
                headers = {"Retry-After": str(max(retry_after, 1))}
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Please wait {max(retry_after, 1)} seconds before retrying.",
                    headers=headers
                )
            timestamps.append(now)
            self._history[key] = timestamps

# Pre-configured rate limiters for critical security vectors
login_rate_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60)
api_general_rate_limiter = SlidingWindowRateLimiter(max_requests=300, window_seconds=60)

def rate_limit_login(request: Request):
    """FastAPI Dependency for login rate limiting."""
    client_ip = request.client.host if request.client else "unknown"
    # Exempt testclient in non-production unless explicitly testing rate limits
    if settings.ENVIRONMENT != "production" and client_ip == "testclient" and request.headers.get("x-test-rate-limit") != "true":
        return
    login_rate_limiter.check(f"login:{client_ip}")

def rate_limit_general(request: Request):
    """FastAPI Dependency for general API rate limiting."""
    client_ip = request.client.host if request.client else "unknown"
    if settings.ENVIRONMENT != "production" and client_ip == "testclient" and request.headers.get("x-test-rate-limit") != "true":
        return
    api_general_rate_limiter.check(f"gen:{client_ip}")

