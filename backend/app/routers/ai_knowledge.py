"""
OH-ID Phase 6: Enterprise Healthcare RAG & Knowledge Base Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.services.ai.rag_engine import HealthcareRAGEngine
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/ai/knowledge", tags=["Enterprise Healthcare RAG & Knowledge Base"])

class DocumentIngestRequest(BaseModel):
    title: str = Field(..., min_length=3)
    category: str = Field(default="SOP") # SOP, CLINICAL_PROTOCOL, HOSPITAL_POLICY, PATIENT_EDUCATION
    content: str = Field(..., min_length=10)
    hospital_id: Optional[str] = None

class KnowledgeQueryRequest(BaseModel):
    query: str = Field(..., min_length=2)
    hospital_id: Optional[str] = None

@router.get("/documents")
def list_documents(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "doctor.workspace", "system.manage"))
):
    """Lists ingested hospital SOPs, clinical guidelines, and policy documents."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.list_knowledge_documents(target_hosp)
    except Exception as e:
        logger.error("Failed to list knowledge documents: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load documents")

@router.post("/documents")
def ingest_document(
    payload: DocumentIngestRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.manage", "system.manage"))
):
    """Ingests and indexes a new hospital protocol or SOP for RAG knowledge retrieval."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return HealthcareRAGEngine.ingest_document(
            hospital_id=target_hosp,
            title=payload.title,
            category=payload.category,
            content=payload.content,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to ingest knowledge document: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to ingest document")

@router.post("/query")
async def query_knowledge_base(
    payload: KnowledgeQueryRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "doctor.workspace", "system.manage"))
):
    """Queries hospital SOPs and clinical protocols with exact document and section citations."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return await HealthcareRAGEngine.query_knowledge_base(
            hospital_id=target_hosp,
            query=payload.query,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to query knowledge base: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to query knowledge base")
