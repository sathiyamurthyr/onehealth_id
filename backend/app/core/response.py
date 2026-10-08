"""
ONEHEALTH ID (OH-ID) — Standard API Response Envelope
Provides consistent JSON envelope formats for all HTTP responses in compliance with Section 27.
"""

from typing import Any, Optional, Dict
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorDetails(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class StandardResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    error: Optional[ErrorDetails] = None


from fastapi.encoders import jsonable_encoder


def success_response(
    data: Any = None,
    message: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
    status_code: int = 200
) -> JSONResponse:
    payload = {
        "success": True,
        "data": data,
        "message": message,
        "meta": meta or {}
    }
    return JSONResponse(status_code=status_code, content=jsonable_encoder(payload))


def error_response(
    code: str = "ERROR",
    message: str = "",
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 400
) -> JSONResponse:
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {}
        }
    }
    return JSONResponse(status_code=status_code, content=jsonable_encoder(payload))
