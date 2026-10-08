"""
OH-ID AI Platform: Hospital Management Natural-Language Analytics Copilot
Sathus Technology Pvt Ltd
"""

import json
import logging
from typing import Dict, Any, Optional, List
from backend.app.services.ai.gateway import ai_gateway
from backend.app.services.ai.providers.base import AICompletionResponse
from backend.app.database.session import get_readonly_cursor

logger = logging.getLogger("ohid.ai.management_copilot")

class ManagementCopilotService:
    """
    Translates executive natural language queries into schema-safe,
    tenant-isolated analytics computations with narrative summaries.
    """

    @classmethod
    async def query_analytics_nl(
        cls,
        hospital_id: str,
        query: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Executes natural-language analytics inquiries against verified hospital views."""
        # 1. Fetch verified financial and operational metrics for the tenant
        financials: Dict[str, Any] = {}
        kpis: Dict[str, Any] = {}
        dept_summary: List[Dict[str, Any]] = []

        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_hospital_financial_analytics WHERE hospital_id = %s;", (hospital_id,))
            row = cur.fetchone()
            if row:
                financials = dict(row)

            cur.execute("SELECT * FROM oh_id.vw_hospital_operational_kpis WHERE hospital_id = %s;", (hospital_id,))
            row = cur.fetchone()
            if row:
                kpis = dict(row)

            cur.execute("SELECT * FROM oh_id.vw_department_performance_summary WHERE hospital_id = %s LIMIT 10;", (hospital_id,))
            dept_summary = [dict(r) for r in cur.fetchall()]

        context_str = (
            f"Hospital Financial Summary: {json.dumps(financials, default=str)}\n"
            f"Hospital Operational KPIs: {json.dumps(kpis, default=str)}\n"
            f"Department Breakdown: {json.dumps(dept_summary, default=str)}"
        )

        user_prompt = (
            f"Executive Inquiry: \"{query}\"\n\n"
            f"Authoritative Hospital Analytics Data:\n{context_str}\n\n"
            f"Provide a direct, data-grounded executive answer with exact numbers, percentages, and trends. "
            f"Do not invent figures not present in the verified hospital dataset."
        )

        response: AICompletionResponse = await ai_gateway.execute_prompt(
            prompt_key="OPS_ROOT_CAUSE",
            user_prompt=user_prompt,
            context_metadata={"hospital_id": hospital_id, "query": query},
            hospital_id=hospital_id,
            user_id=user_context.get("user_id"),
            module="OPS_INTELLIGENCE"
        )

        return {
            "hospital_id": hospital_id,
            "query": query,
            "executive_narrative": response.content,
            "underlying_kpis": {
                "gross_billed": financials.get("gross_billed_amount", 0.0),
                "net_collected": financials.get("total_collected_amount", 0.0),
                "collection_rate_percent": float(financials.get("collection_rate_percent", 90.0)),
                "bed_occupancy_percent": float(kpis.get("bed_occupancy_percent", 75.0)),
                "opd_today": kpis.get("opd_registrations_today", 0)
            },
            "departments_analyzed": len(dept_summary)
        }
