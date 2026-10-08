"""
OH-ID PHASE 6: AI HEALTHCARE INTELLIGENCE & AUTONOMOUS OPERATIONS REPOSITORY MIXIN
Sathus Technology Pvt Ltd
"""

import logging
from typing import List, Dict, Any, Optional
from backend.app.database.session import get_readonly_cursor, get_db_cursor

logger = logging.getLogger("ohid.phase6_ai_repository")

class Phase6AIRepositoryMixin:
    """
    Repository mixin providing database operations for AI Providers, Models,
    Prompts, Insights, Predictions, Knowledge Base, and Agents.
    """

    def get_ai_providers(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.ai_providers ORDER BY is_default DESC, created_at ASC;")
            return [dict(r) for r in cur.fetchall()]

    def get_ai_models(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT m.*, p.name AS provider_name, p.display_name AS provider_display_name
                FROM oh_id.ai_models m
                JOIN oh_id.ai_providers p ON m.provider_id = p.id
                ORDER BY m.created_at ASC;
            """)
            return [dict(r) for r in cur.fetchall()]

    def get_ai_prompts(self) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.ai_prompts WHERE is_active = TRUE ORDER BY prompt_key ASC, version DESC;")
            return [dict(r) for r in cur.fetchall()]

    def get_ai_governance_telemetry(self, hospital_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            if hospital_id:
                cur.execute("""
                    SELECT * FROM oh_id.vw_ai_governance_telemetry 
                    WHERE hospital_id = %s OR hospital_id IS NULL;
                """, (hospital_id,))
            else:
                cur.execute("SELECT * FROM oh_id.vw_ai_governance_telemetry;")
            return [dict(r) for r in cur.fetchall()]

    def get_ai_predictions(self, hospital_id: str, prediction_type: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            if prediction_type:
                cur.execute("""
                    SELECT * FROM oh_id.vw_ai_operational_predictions 
                    WHERE hospital_id = %s AND prediction_type = %s 
                    ORDER BY created_at DESC LIMIT 20;
                """, (hospital_id, prediction_type))
            else:
                cur.execute("""
                    SELECT * FROM oh_id.vw_ai_operational_predictions 
                    WHERE hospital_id = %s 
                    ORDER BY created_at DESC LIMIT 20;
                """, (hospital_id,))
            return [dict(r) for r in cur.fetchall()]

    def get_ai_insights_for_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.ai_insights 
                WHERE patient_id = %s 
                ORDER BY created_at DESC LIMIT 20;
            """, (patient_id,))
            return [dict(r) for r in cur.fetchall()]

    def list_knowledge_documents(self, hospital_id: str) -> List[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.knowledge_documents 
                WHERE hospital_id = %s AND is_active = TRUE 
                ORDER BY created_at DESC;
            """, (hospital_id,))
            return [dict(r) for r in cur.fetchall()]

    def get_knowledge_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.knowledge_documents WHERE id = %s;", (document_id,))
            row = cur.fetchone()
            return dict(row) if row else None
