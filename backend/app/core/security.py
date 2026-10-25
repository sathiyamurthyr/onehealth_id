from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt
import bcrypt
from backend.app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Cryptographically secure password verification using bcrypt.
    Enforces constant-time verification without plaintext fallback.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password[:72].encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    Generates a secure salted bcrypt hash (12 work factor rounds).
    """
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password[:72].encode("utf-8"), salt).decode("utf-8")

import uuid

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.setdefault("jti", str(uuid.uuid4()))
    to_encode.setdefault("iat", now_utc.timestamp())
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
