"""
OH-ID AI Platform: Patient AI Health Journey Assistant
Sathus Technology Pvt Ltd
"""

import json
import logging
from typing import Dict, Any, Optional, List
from backend.app.services.ai.gateway import ai_gateway
from backend.app.services.ai.providers.base import AICompletionResponse
from backend.app.database.session import get_readonly_cursor

logger = logging.getLogger("ohid.ai.patient_assistant")

class PatientAssistantService:
    """
    Patient-facing health journey conversational assistant.
    Explains official doctor records and prescriptions with strict source traceability.
    """

    @classmethod
    async def explain_health_journey(
        cls,
        patient_id: str,
        query: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Answers patient health record questions grounded in authorized records."""
        events: List[Dict[str, Any]] = []
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.vw_health_timeline_events 
                WHERE patient_id = %s 
                ORDER BY event_timestamp DESC LIMIT 10;
            """, (patient_id,))
            events = [dict(r) for r in cur.fetchall()]

        records_str = "\n".join([
            f"• [{str(e.get('event_timestamp', ''))[:10]}] {e.get('event_type')}: {e.get('title')} ({e.get('hospital_name')}) - Details: {e.get('summary')}"
            for e in events
        ]) or "• Baseline health profile created."

        user_prompt = (
            f"Patient Question: \"{query}\"\n\n"
            f"Authorized Health Timeline Records:\n{records_str}\n\n"
            f"Answer the patient in clear, reassuring, plain English. "
            f"Explicitly mention the hospital and date for any consultation, prescription, or lab result cited."
        )

        response: AICompletionResponse = await ai_gateway.execute_prompt(
            prompt_key="PATIENT_JOURNEY_EXPLAIN",
            user_prompt=user_prompt,
            context_metadata={"patient_id": patient_id, "query": query},
            hospital_id=user_context.get("hospital_id"),
            user_id=user_context.get("user_id"),
            patient_id=patient_id,
            module="PATIENT_ASSISTANT"
        )

        return {
            "patient_id": patient_id,
            "query": query,
            "answer_markdown": response.content,
            "citations": [c.model_dump() for c in response.citations],
            "disclaimer": "This explanation is generated from your official doctor records to help you understand your care plan. Please consult your physician for medical decisions."
        }

    @classmethod
    async def explain_prescription(
        cls,
        prescription_id: str,
        patient_id: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Explains prescription medications, timings, and dietary advice."""
        meds: List[Dict[str, Any]] = []
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_prescriptions WHERE id = %s;", (prescription_id,))
            meds = [dict(r) for r in cur.fetchall()]

        meds_str = "\n".join([
            f"• {m.get('medicine_name')} ({m.get('dosage')}): Take {m.get('frequency', 'As directed')}, Duration: {m.get('duration_days', 7)} days. Instructions: {m.get('instructions', 'None')}"
            for m in meds
        ]) or "• Regular maintenance medication."

        user_prompt = (
            f"Prescription Medications:\n{meds_str}\n\n"
            f"Explain how and when the patient should take each medicine, whether to take with food, and precautions."
        )

        response: AICompletionResponse = await ai_gateway.execute_prompt(
            prompt_key="PATIENT_JOURNEY_EXPLAIN",
            user_prompt=user_prompt,
            context_metadata={"prescription_id": prescription_id, "query": "Prescription explanation"},
            hospital_id=user_context.get("hospital_id"),
            user_id=user_context.get("user_id"),
            patient_id=patient_id,
            module="PATIENT_ASSISTANT"
        )

        return {
            "prescription_id": prescription_id,
            "patient_id": patient_id,
            "explanation_markdown": response.content,
            "medications_count": len(meds)
        }
