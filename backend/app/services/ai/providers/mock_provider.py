"""
OH-ID AI Platform: Deterministic Offline Rule-Based Mock Provider
Sathus Technology Pvt Ltd

Provides realistic, grounded, testable completions for all prompt keys without external API dependencies.
"""

import time
import json
from typing import Dict, Any, List, Optional
from backend.app.services.ai.providers.base import (
    BaseAIProvider,
    AICompletionRequest,
    AICompletionResponse,
    AICitation
)

class DeterministicMockProvider(BaseAIProvider):
    def __init__(self, name: str = "OFFLINE_MOCK", config: Optional[Dict[str, Any]] = None):
        super().__init__(name=name, config=config)

    async def generate_completion(self, request: AICompletionRequest) -> AICompletionResponse:
        start_time = time.time()
        key = request.prompt_key.upper()
        meta = request.context_metadata
        citations: List[AICitation] = []
        structured_json: Optional[Dict[str, Any]] = None

        if "BRIEF" in key or "DOCTOR_PATIENT_BRIEF" in key:
            patient_name = meta.get("patient_name", "Patient")
            allergies = meta.get("allergies", "No known drug allergies")
            chief_complaint = meta.get("chief_complaint", "Routine review")
            
            content = (
                f"### 📋 30-Second Clinical Brief for {patient_name}\n\n"
                f"• **Chief Concern Today:** {chief_complaint}\n"
                f"• **Allergy Alert:** {allergies}\n"
                f"• **Active Prescriptions:** Metformin 500mg BD, Telmisartan 40mg OD\n"
                f"• **Key Historical Observations:** Type 2 Diabetes Mellitus (HbA1c 7.2% on last check), Hypertension stage 1.\n"
                f"• **Recent Investigations:** CBC normal, Fasting Lipid Profile pending review.\n"
                f"• **Follow-Up Target:** Assess glycemic control and review blood pressure trajectory.\n\n"
                f"*⚠️ Draft Brief for Clinician Reference — Requires Clinical Validation.*"
            )
            structured_json = {
                "patient_name": patient_name,
                "chief_concern": chief_complaint,
                "allergies": allergies,
                "active_meds": ["Metformin 500mg BD", "Telmisartan 40mg OD"],
                "key_findings": ["Type 2 Diabetes Mellitus", "Hypertension stage 1"],
                "disclaimer": "REQUIRES CLINICIAN REVIEW"
            }
            if meta.get("patient_id"):
                citations.append(AICitation(
                    source_type="CONSULTATION",
                    record_id=f"con-hist-{meta.get('patient_id')}",
                    date="2026-09-15",
                    description="Previous OPD consultation recorded at Kedar Hospital"
                ))

        elif "NOTE_DRAFT" in key or "CONSULTATION_NOTE_DRAFT" in key:
            raw_input = meta.get("raw_input", "Patient presents for follow-up")
            content = (
                f"### 📝 Structured Clinical Note (Draft)\n\n"
                f"**SUBJECTIVE (HPI):**\n"
                f"{raw_input}\n"
                f"Patient describes onset 2 weeks ago, intermittent severity, mild relief with rest.\n\n"
                f"**OBJECTIVE:**\n"
                f"• Vitals: BP 124/82 mmHg, Pulse 76 bpm, SpO2 98% on room air.\n"
                f"• Physical Exam: Systemic examination unremarkable, abdomen soft, non-tender.\n\n"
                f"**ASSESSMENT (DRAFT):**\n"
                f"1. Symptomatic presentation under clinical review.\n"
                f"2. Known chronic conditions stable.\n\n"
                f"**PLAN & PATIENT INSTRUCTIONS (DRAFT):**\n"
                f"• Maintain hydration and follow low-sodium dietary measures.\n"
                f"• Return for review in 2 weeks or if red-flag symptoms develop.\n\n"
                f"*(Note: Clinician must review and sign off before finalization. Diagnoses and prescriptions cannot be finalized autonomously.)*"
            )
            structured_json = {
                "hpi": f"{raw_input}. Patient describes onset 2 weeks ago.",
                "vitals_summary": "BP 124/82, Pulse 76, SpO2 98%",
                "assessment_draft": "Symptomatic presentation under clinical review.",
                "patient_instructions": "Maintain hydration, low sodium, review in 2 weeks.",
                "signoff_required": True
            }

        elif "LAB_TREND" in key or "LAB_TREND_ANALYSIS" in key:
            analyte = meta.get("analyte", "Hemoglobin (Hb)")
            history = meta.get("history", [{"date": "2026-06-01", "val": 13.2}, {"date": "2026-09-01", "val": 12.4}])
            content = (
                f"### 🔬 Longitudinal Analyte Analysis: {analyte}\n\n"
                f"• **Trajectory:** Mild gradual downward trend over the recorded observation period.\n"
                f"• **Current Status:** Within adult physiological reference range.\n"
                f"• **Doctor Technical Summary:** Analyte level dropped by ~0.8 units over 3 months. No critical value trigger.\n"
                f"• **Patient-Friendly Explanation:** Your {analyte} level remains in the normal range, with a slight variation since your last test. Continue a balanced diet.\n"
            )
            structured_json = {
                "analyte": analyte,
                "trajectory": "STABLE_TO_MILD_DECREASE",
                "is_critical": False,
                "history_points": len(history),
                "doctor_summary": "Analyte within normal reference limits.",
                "patient_summary": "Normal range with routine variation."
            }

        elif "PATIENT_JOURNEY" in key or "PATIENT_JOURNEY_EXPLAIN" in key:
            query = meta.get("query", "Summarize my health record")
            content = (
                f"### 🌟 Your Health Journey Summary\n\n"
                f"Based on your authorized health records across Kedar Hospital & connected providers:\n\n"
                f"1. **Recent Consultation (15 Sep 2026):** General Medicine review with Dr. Kedar Sharma. Blood pressure was well-controlled.\n"
                f"2. **Prescriptions:** Prescribed regular maintenance medications. All medications are current.\n"
                f"3. **Diagnostic Reports:** Complete Blood Count (CBC) on 18 Sep 2026 showed normal results.\n"
                f"4. **Next Recommended Step:** Routine follow-up scheduled for October.\n\n"
                f"*ℹ️ This summary is generated to help you understand your doctor's official records.*"
            )
            structured_json = {
                "summary": "Health journey is on track with normal routine lab results and active maintenance treatment.",
                "verified_records_count": 3
            }
            citations.append(AICitation(
                source_type="VISIT",
                hospital_id="hosp-kedar",
                record_id="vis-sep-15",
                date="2026-09-15",
                description="Consultation with Dr. Kedar Sharma"
            ))
            citations.append(AICitation(
                source_type="LAB_REPORT",
                hospital_id="hosp-kedar",
                record_id="lab-sep-18-cbc",
                date="2026-09-18",
                description="Complete Blood Count (CBC) Profile"
            ))

        elif "OPS_ROOT_CAUSE" in key:
            content = (
                f"### 📊 Hospital Operations Root-Cause Analysis\n\n"
                f"**Primary Delay Contributors:**\n"
                f"1. **Cardiology OPD Surge (+34% volume):** 28 walk-in patients exceeded scheduled roster capacity.\n"
                f"2. **Counter Bottleneck at Counter #2:** Registration throughput dropped by 18% during peak hours (10:00 - 11:30 AM).\n"
                f"3. **Doctor Shift Delay:** 2 physician consultations commenced 22 minutes after scheduled slot.\n\n"
                f"**Actionable Recommendations:**\n"
                f"• Activate auxiliary registration counter #4 during 10:00 - 12:00 window.\n"
                f"• Rebalance Cardiology walk-in tokens to General Medicine triage.\n"
                f"• Send automated SMS queue delay notification to patients with token > 25."
            )
            structured_json = {
                "bottlenecks": ["Cardiology OPD Surge", "Counter 2 Throughput Drop", "Clinician Shift Delay"],
                "recommendations": [
                    "Activate auxiliary counter #4",
                    "Rebalance Cardiology tokens",
                    "Dispatch queue delay notifications"
                ],
                "confidence_score": 0.92
            }

        else:
            content = (
                f"### 🤖 OH-ID Clinical Intelligence Response\n\n"
                f"Processed request for prompt key: {key}.\n"
                f"Content is verified against authoritative database records."
            )
            structured_json = {"status": "success", "prompt_key": key}

        latency = int((time.time() - start_time) * 1000) + 12
        prompt_tokens = len(request.user_prompt.split()) + 40
        completion_tokens = len(content.split())

        return AICompletionResponse(
            content=content,
            structured_json=structured_json,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency,
            model_name="ohid-deterministic-clinical-v1",
            provider_name=self.name,
            citations=citations,
            safety_flags=[],
            requires_clinician_signoff=True
        )
