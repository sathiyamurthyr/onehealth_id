"""
OH-ID Phase 8 Router: Developer Ecosystem, Third-Party Apps & Webhooks
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/global/developer", tags=["Global - Developer Ecosystem & Webhooks"])
repo = SPViewsRepository()

class AppRegistrationPayload(BaseModel):
    id: Optional[str] = None
    app_name: str
    developer_organization: str
    contact_email: str
    app_type: str = Field("EHR_INTEGRATION", description="EHR_INTEGRATION, PATIENT_APP, TELEHEALTH, RPM_DEVICE, ANALYTICS, PAYER_PORTAL")
    allowed_scopes: List[str] = ["READ_PATIENTS", "TELEHEALTH_ACCESS"]
    sandbox_mode: bool = True
    rate_limit_per_minute: int = 1000
    is_active: bool = True

class CreateApiKeyPayload(BaseModel):
    app_id: str
    key_name: str
    is_active: bool = True

class WebhookSubscriptionPayload(BaseModel):
    id: Optional[str] = None
    app_id: str
    target_url: str
    subscribed_events: List[str] = ["PATIENT_REGISTERED", "CONSULTATION_COMPLETED", "RPM_ALERT_TRIGGERED"]
    secret_token: Optional[str] = None
    is_active: bool = True

@router.get("/apps", response_model=List[Dict[str, Any]])
def list_developer_apps(
    developer_organization: Optional[str] = Query(None),
    app_type: Optional[str] = Query(None)
):
    """Lists registered developer applications with authorized scopes and sandbox statuses."""
    return repo.list_developer_apps(developer_organization=developer_organization, app_type=app_type)

@router.get("/apps/{app_id}", response_model=Dict[str, Any])
def get_developer_app(app_id: str):
    """Retrieves specific developer app details."""
    app = repo.get_developer_app(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Developer application not found")
    return app

@router.post("/apps/register", response_model=Dict[str, Any])
def register_developer_app(payload: AppRegistrationPayload):
    """Registers a third-party application onto the OH-ID Global Ecosystem."""
    return repo.register_developer_app(payload.model_dump())

@router.get("/apps/{app_id}/keys", response_model=List[Dict[str, Any]])
def list_app_api_keys(app_id: str):
    """Lists all provisioned API keys for a developer app (hashed secrets hidden)."""
    return repo.list_api_keys(app_id)

@router.post("/apps/keys/create", response_model=Dict[str, Any])
def create_api_key(payload: CreateApiKeyPayload):
    """Generates a secure API key with prefix identification and returns the raw secret once."""
    return repo.create_api_key(app_id=payload.app_id, key_name=payload.key_name, is_active=payload.is_active)

@router.delete("/apps/keys/{key_id}", response_model=Dict[str, Any])
@router.post("/apps/keys/{key_id}/revoke", response_model=Dict[str, Any])
def revoke_api_key(key_id: str):
    """Instantly revokes an active developer API key."""
    key = repo.revoke_api_key(key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return key

@router.get("/webhooks", response_model=List[Dict[str, Any]])
def list_webhooks(app_id: Optional[str] = Query(None)):
    """Lists registered webhook event listeners."""
    return repo.list_webhooks(app_id=app_id)

@router.post("/webhooks/subscribe", response_model=Dict[str, Any])
def create_webhook_subscription(payload: WebhookSubscriptionPayload):
    """Subscribes a secure callback endpoint to real-time OH-ID network events."""
    return repo.create_webhook(payload.model_dump())
