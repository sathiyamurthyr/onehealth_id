"""
OH-ID AI Platform: Doctor Clinical AI Copilot & Longitudinal Record Intelligence
Sathus Technology Pvt Ltd
"""

import json
import uuid
import logging
from typing import Dict, Any, Optional, List
from backend.app.services.ai.gateway import ai_gateway
from backend.app.services.ai.providers.base import AICompletionResponse, AICitation
from backend.app.database.session import get_readonly_cursor, get_db_cursor

logger = logging.getLogger("ohid.ai.clinical_copilot")

class ClinicalCopilotService:
    """
    Assists clinicians during OPD consultations, ward rounds, and discharge planning.
    Always produces DRAFT suggestions that require explicit physician sign-off.
    """

    @classmethod
    async def generate_patient_brief(
        cls,
        patient_id: str,
        hospital_id: str,
        user_context: Dict[str, Any],
        chief_complaint: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generates a 30-second pre-consultation clinical briefing."""
        # 1. Fetch Authoritative Records from Database Views
        patient_data: Dict[str, Any] = {}
        consultations: List[Dict[str, Any]] = []
        prescriptions: List[Dict[str, Any]] = []
        lab_reports: List[Dict[str, Any]] = []
        
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_patients WHERE id = %s;", (patient_id,))
            row = cur.fetchone()
            if row:
                patient_data = dict(row)

            cur.execute("""
                SELECT * FROM oh_id.vw_opd_encounters 
                WHERE patient_id = %s 
                ORDER BY created_at DESC LIMIT 5;
            """, (patient_id,))
            consultations = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT * FROM oh_id.vw_prescriptions_full 
                WHERE patient_id = %s 
                ORDER BY created_at DESC LIMIT 5;
            """, (patient_id,))
            prescriptions = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT * FROM oh_id.vw_lab_orders 
                WHERE patient_id = %s 
                ORDER BY ordered_at DESC LIMIT 5;
            """, (patient_id,))
            lab_reports = [dict(r) for r in cur.fetchall()]

        patient_name = patient_data.get("name", "Unknown Patient")
        age = patient_data.get("age", "N/A")
        gender = patient_data.get("gender", "N/A")
        allergies = patient_data.get("allergies") or "No known drug allergies recorded"

        # Format context for prompt
        recent_cons_str = "; ".join([f"{str(c.get('created_at', ''))[:10]}: {c.get('diagnosis', 'Review')}" for c in consultations]) or "No prior visits recorded"
        recent_meds_str = "; ".join([f"{p.get('medicine_name', 'Med')} ({p.get('dosage', 'Standard')})" for p in prescriptions]) or "No active prescriptions"
        recent_labs_str = "; ".join([f"{l.get('test_name', 'Lab')}: {l.get('status', 'Completed')}" for l in lab_reports]) or "No recent laboratory orders"

        user_prompt = (
            f"Generate a 30-second Doctor Patient Brief for {patient_name} ({age}y, {gender}).\n"
            f"Chief Complaint Today: {chief_complaint or 'Scheduled OPD Consultation'}\n"
            f"Allergies: {allergies}\n"
            f"Active/Recent Prescriptions: {recent_meds_str}\n"
            f"Previous Consultations: {recent_cons_str}\n"
            f"Recent Labs: {recent_labs_str}\n"
        )

        response: AICompletionResponse = await ai_gateway.execute_prompt(
            prompt_key="DOCTOR_PATIENT_BRIEF",
            user_prompt=user_prompt,
            context_metadata={
                "patient_id": patient_id,
                "patient_name": patient_name,
                "allergies": allergies,
                "chief_complaint": chief_complaint or "Scheduled OPD Consultation",
                "current_meds": recent_meds_str
            },
            hospital_id=hospital_id,
            user_id=user_context.get("user_id"),
            patient_id=patient_id,
            module="CLINICAL_COPILOT"
        )

        # Store in oh_id.ai_insights
        insight_id = f"ins-brief-{uuid.uuid4().hex[:12]}"
        cls._store_insight(
            insight_id=insight_id,
            hospital_id=hospital_id,
            patient_id=patient_id,
            insight_type="PATIENT_BRIEF",
            content_json={
                "brief_markdown": response.content,
                "structured": response.structured_json,
                "latency_ms": response.latency_ms,
                "model": response.model_name
            },
            citations=[c.model_dump() for c in response.citations]
        )

        return {
            "insight_id": insight_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "brief_markdown": response.content,
            "structured_data": response.structured_json,
            "citations": [c.model_dump() for c in response.citations],
            "is_draft": True,
            "requires_clinician_signoff": True
        }

    @classmethod
    async def draft_consultation_notes(
        cls,
        raw_notes: str,
        patient_id: str,
        hospital_id: str,
        user_context: Dict[str, Any],
        vitals: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Ambient note drafter converting free-text/speech notes into SOAP format."""
        user_prompt = (
            f"Raw Clinician Input:\n{raw_notes}\n\n"
            f"Vitals Recorded: {json.dumps(vitals or {})}\n"
            f"Format into a clean, structured SOAP consultation note."
        )

        response: AICompletionResponse = await ai_gateway.execute_prompt(
            prompt_key="CONSULTATION_NOTE_DRAFT",
            user_prompt=user_prompt,
            context_metadata={
                "patient_id": patient_id,
                "raw_input": raw_notes,
                "vitals": vitals
            },
            hospital_id=hospital_id,
            user_id=user_context.get("user_id"),
            patient_id=patient_id,
            module="CLINICAL_COPILOT"
        )

        insight_id = f"ins-draft-{uuid.uuid4().hex[:12]}"
        cls._store_insight(
            insight_id=insight_id,
            hospital_id=hospital_id,
            patient_id=patient_id,
            insight_type="CONSULTATION_NOTE_DRAFT",
            content_json={
                "draft_note_markdown": response.content,
                "structured": response.structured_json
            },
            citations=[]
        )

        return {
            "insight_id": insight_id,
            "draft_note_markdown": response.content,
            "structured_draft": response.structured_json,
            "is_draft": True,
            "requires_clinician_signoff": True
        }

    @classmethod
    async def generate_longitudinal_summary(
        cls,
        patient_id: str,
        hospital_id: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Synthesizes patient multi-episode trajectory across all authorized records."""
        events: List[Dict[str, Any]] = []
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.vw_health_timeline_events 
                WHERE patient_id = %s 
                ORDER BY event_timestamp DESC LIMIT 15;
            """, (patient_id,))
            events = [dict(r) for r in cur.fetchall()]

        timeline_summary = "\n".join([
            f"- [{str(e.get('event_timestamp', ''))[:10]}] {e.get('event_type')}: {e.get('title')} ({e.get('hospital_name')})"
            for e in events
        ]) or "No historical timeline events recorded."

        user_prompt = (
            f"Generate a Longitudinal Health Summary for patient ID {patient_id}.\n"
            f"Timeline Events:\n{timeline_summary}\n"
            f"Highlight key clinical milestones, chronicity, and unresolved follow-ups."
        )

        response = await ai_gateway.execute_prompt(
            prompt_key="PATIENT_JOURNEY_EXPLAIN",
            user_prompt=user_prompt,
            context_metadata={"patient_id": patient_id, "query": "Longitudinal summary"},
            hospital_id=hospital_id,
            user_id=user_context.get("user_id"),
            patient_id=patient_id,
            module="CLINICAL_COPILOT"
        )

        return {
            "patient_id": patient_id,
            "longitudinal_summary_markdown": response.content,
            "events_analyzed": len(events),
            "citations": [c.model_dump() for c in response.citations]
        }

    @classmethod
    def _store_insight(
        cls,
        insight_id: str,
        hospital_id: str,
        patient_id: str,
        insight_type: str,
        content_json: Dict[str, Any],
        citations: List[Dict[str, Any]]
    ):
        try:
            with get_db_cursor() as cur:
                cur.execute("""
                    INSERT INTO oh_id.ai_insights (
                        id, hospital_id, patient_id, insight_type, content_json, grounding_citations
                    ) VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb);
                """, (
                    insight_id, hospital_id, patient_id, insight_type,
                    json.dumps(content_json), json.dumps(citations)
                ))
        except Exception as e:
            logger.warning("Failed to store AI insight: %s", e)
