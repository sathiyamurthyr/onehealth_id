"""
OH-ID AI Platform: Unified AI Gateway & Model Router
Sathus Technology Pvt Ltd
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional, List
from backend.app.services.ai.providers.base import (
    BaseAIProvider,
    AICompletionRequest,
    AICompletionResponse
)
from backend.app.services.ai.providers.mock_provider import DeterministicMockProvider
from backend.app.services.ai.providers.gemini_provider import GeminiProvider
from backend.app.services.ai.providers.openai_provider import OpenAIProvider
from backend.app.services.ai.providers.claude_provider import ClaudeProvider, OllamaProvider
from backend.app.services.ai.phi_sanitizer import PHISanitizer
from backend.app.services.ai.guardrails import AIGuardrails
from backend.app.database.session import get_db_cursor, get_readonly_cursor

logger = logging.getLogger("ohid.ai.gateway")

class AIGateway:
    """
    Enterprise AI Gateway for OneHealth ID (OH-ID).
    Manages multi-provider dispatch, fallback, audit trails, and PHI compliance.
    """
    
    def __init__(self):
        self.providers: Dict[str, BaseAIProvider] = {
            "OFFLINE_MOCK": DeterministicMockProvider(),
            "GEMINI": GeminiProvider(),
            "OPENAI": OpenAIProvider(),
            "ANTHROPIC": ClaudeProvider(),
            "OLLAMA": OllamaProvider()
        }
        self.default_provider_name = "OFFLINE_MOCK"

    def register_provider(self, name: str, provider: BaseAIProvider):
        self.providers[name.upper()] = provider

    def get_provider(self, name: Optional[str] = None) -> BaseAIProvider:
        prov_key = (name or self.default_provider_name).upper()
        return self.providers.get(prov_key, self.providers["OFFLINE_MOCK"])

    async def execute_prompt(
        self,
        prompt_key: str,
        user_prompt: str,
        system_prompt: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None,
        provider_name: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        hospital_id: Optional[str] = None,
        user_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        module: str = "CLINICAL_COPILOT"
    ) -> AICompletionResponse:
        start_time = time.time()
        meta = context_metadata or {}
        patient_name = meta.get("patient_name", "")

        # 1. Guardrails: Validate Input
        is_safe, in_flags = AIGuardrails.validate_input(user_prompt)
        if not is_safe:
            return AICompletionResponse(
                content="⚠️ Security Alert: Input blocked due to detected unauthorized directives.",
                prompt_tokens=len(user_prompt.split()),
                completion_tokens=10,
                latency_ms=5,
                model_name="security-filter",
                provider_name="GUARDRAIL",
                safety_flags=in_flags,
                requires_clinician_signoff=True
            )

        # 2. PHI Sanitization
        sanitized_user_prompt, token_map = PHISanitizer.sanitize(user_prompt, patient_name=patient_name)
        sys_prompt = system_prompt or (
            "You are the OH-ID Principal Healthcare Intelligence Assistant. "
            "All assertions must be strictly grounded in authoritative records. "
            "Never invent medications, doses, or diagnoses."
        )

        request = AICompletionRequest(
            prompt_key=prompt_key,
            system_prompt=sys_prompt,
            user_prompt=sanitized_user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            context_metadata=meta
        )

        # 3. Provider Execution with Fallback
        provider = self.get_provider(provider_name)
        try:
            response = await provider.generate_completion(request)
        except Exception as e:
            logger.error("Provider %s failed: %s. Falling back to OFFLINE_MOCK.", provider.name, e)
            provider = self.providers["OFFLINE_MOCK"]
            response = await provider.generate_completion(request)

        # 4. Guardrails: Output Verification & Disclaimer Assertion
        validated_text, out_flags = AIGuardrails.validate_and_sanitize_output(
            response.content,
            is_clinical=(module in ["CLINICAL_COPILOT", "LAB_INTELLIGENCE", "PATIENT_ASSISTANT"])
        )
        
        # 5. Restore PHI in safe presentation layer
        final_content = PHISanitizer.restore(validated_text, token_map)
        response.content = final_content
        response.safety_flags.extend(in_flags + out_flags)

        # 6. Calculate Cost & Tokens
        cost_estimated = (response.prompt_tokens * 0.000002) + (response.completion_tokens * 0.000008)
        
        # 7. Immutable Audit Logging
        self._log_audit(
            hospital_id=hospital_id,
            user_id=user_id,
            patient_id=patient_id,
            module=module,
            model_name=response.model_name,
            prompt_key=prompt_key,
            prompt_tokens=response.prompt_tokens,
            completion_tokens=response.completion_tokens,
            latency_ms=response.latency_ms,
            cost_estimated=cost_estimated,
            safety_flags=response.safety_flags,
            is_success=True
        )

        return response

    def _log_audit(
        self,
        hospital_id: Optional[str],
        user_id: Optional[str],
        patient_id: Optional[str],
        module: str,
        model_name: str,
        prompt_key: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: int,
        cost_estimated: float,
        safety_flags: List[str],
        is_success: bool = True,
        error_message: Optional[str] = None
    ):
        try:
            with get_db_cursor() as cur:
                audit_id = f"ai-audit-{uuid.uuid4().hex[:12]}"
                import json
                cur.execute("""
                    INSERT INTO oh_id.ai_audit_logs (
                        id, hospital_id, user_id, patient_id, module, model_name,
                        prompt_key, prompt_tokens, completion_tokens, latency_ms,
                        cost_estimated, safety_flags, is_success, error_message
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s::jsonb, %s, %s
                    );
                """, (
                    audit_id, hospital_id, user_id, patient_id, module, model_name,
                    prompt_key, prompt_tokens, completion_tokens, latency_ms,
                    cost_estimated, json.dumps(safety_flags), is_success, error_message
                ))
        except Exception as e:
            logger.warning("Failed to record AI audit log: %s", e)

ai_gateway = AIGateway()
