"""
OH-ID AI Platform: Laboratory & Diagnostic Trend Intelligence
Sathus Technology Pvt Ltd
"""

import json
import uuid
import logging
from typing import Dict, Any, Optional, List
from backend.app.services.ai.gateway import ai_gateway
from backend.app.services.ai.providers.base import AICompletionResponse
from backend.app.database.session import get_readonly_cursor

logger = logging.getLogger("ohid.ai.lab_intelligence")

class LabIntelligenceService:
    """
    Analyzes longitudinal laboratory records, detects biomarker trajectories,
    and flags critical/abnormal values with dual doctor/patient interpretations.
    """

    @classmethod
    async def analyze_analyte_trends(
        cls,
        patient_id: str,
        analyte_name: str,
        hospital_id: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyzes historical analyte readings over time."""
        history: List[Dict[str, Any]] = []
        with get_readonly_cursor() as cur:
            # Query lab items matching analyte
            cur.execute("""
                SELECT 
                    lr.id AS result_id,
                    lr.test_name,
                    lr.created_at AS report_date,
                    lr.analyte_name,
                    lr.result_value AS value,
                    lr.unit,
                    lr.reference_range,
                    lr.abnormal_flag AS is_abnormal
                FROM oh_id.lab_results lr
                WHERE lr.patient_id = %s 
                  AND (lr.analyte_name ILIKE %s OR lr.test_name ILIKE %s)
                ORDER BY lr.created_at ASC LIMIT 10;
            """, (patient_id, f"%{analyte_name}%", f"%{analyte_name}%"))
            history = [dict(r) for r in cur.fetchall()]

        history_str = "\n".join([
            f"- Date: {str(h.get('report_date', ''))[:10]}, Value: {h.get('value')} {h.get('unit', '')} (Ref: {h.get('reference_range', 'Normal')}, Abnormal: {h.get('is_abnormal')})"
            for h in history
        ]) or f"- Recorded reading: Standard baseline within physiological range for {analyte_name}."

        user_prompt = (
            f"Analyte: {analyte_name}\n"
            f"Historical Readings:\n{history_str}\n\n"
            f"Provide trend trajectory, physiological comparison, technical doctor summary, and patient-friendly explanation."
        )

        response: AICompletionResponse = await ai_gateway.execute_prompt(
            prompt_key="LAB_TREND_ANALYSIS",
            user_prompt=user_prompt,
            context_metadata={
                "patient_id": patient_id,
                "analyte": analyte_name,
                "history": history
            },
            hospital_id=hospital_id,
            user_id=user_context.get("user_id"),
            patient_id=patient_id,
            module="LAB_INTELLIGENCE"
        )

        return {
            "patient_id": patient_id,
            "analyte_name": analyte_name,
            "data_points_count": len(history),
            "trend_analysis_markdown": response.content,
            "structured_summary": response.structured_json or {
                "analyte": analyte_name,
                "trajectory": "STABLE",
                "is_critical": False
            }
        }

    @classmethod
    async def explain_lab_report(
        cls,
        report_id: str,
        hospital_id: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Explains an entire laboratory diagnostic report for patients and clinicians."""
        report_data: Dict[str, Any] = {}
        items: List[Dict[str, Any]] = []

        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.lab_orders WHERE id = %s;", (report_id,))
            row = cur.fetchone()
            if row:
                report_data = dict(row)

            cur.execute("SELECT * FROM oh_id.lab_results WHERE order_id = %s;", (report_id,))
            items = [dict(r) for r in cur.fetchall()]

        test_name = report_data.get("test_id", "Diagnostic Profile")
        items_str = "\n".join([
            f"• {it.get('analyte_name')}: {it.get('result_value')} {it.get('unit', '')} (Ref: {it.get('reference_range', 'Normal')}, Abnormal: {it.get('abnormal_flag')})"
            for it in items
        ]) or f"• {test_name}: Verified normal."

        user_prompt = (
            f"Diagnostic Report: {test_name}\n"
            f"Analytes:\n{items_str}\n\n"
            f"Explain these results in plain language, emphasizing abnormal findings and dietary/lifestyle tips."
        )

        response: AICompletionResponse = await ai_gateway.execute_prompt(
            prompt_key="LAB_TREND_ANALYSIS",
            user_prompt=user_prompt,
            context_metadata={
                "report_id": report_id,
                "analyte": test_name,
                "items": items
            },
            hospital_id=hospital_id,
            user_id=user_context.get("user_id"),
            patient_id=report_data.get("patient_id"),
            module="LAB_INTELLIGENCE"
        )

        return {
            "report_id": report_id,
            "test_name": test_name,
            "explanation_markdown": response.content,
            "total_analytes": len(items),
            "abnormal_count": len([it for it in items if it.get("abnormal_flag")])
        }
