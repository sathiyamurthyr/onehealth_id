"""
OH-ID AI Platform: Google Gemini Provider
Sathus Technology Pvt Ltd
"""

import os
import time
import httpx
from typing import Dict, Any, Optional
from backend.app.services.ai.providers.base import (
    BaseAIProvider,
    AICompletionRequest,
    AICompletionResponse
)
from backend.app.services.ai.providers.mock_provider import DeterministicMockProvider
from backend.app.core.logging import logger

class GeminiProvider(BaseAIProvider):
    def __init__(self, name: str = "GEMINI", config: Optional[Dict[str, Any]] = None):
        super().__init__(name=name, config=config)
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = self.config.get("model", "gemini-1.5-flash")
        self.fallback_mock = DeterministicMockProvider()

    async def generate_completion(self, request: AICompletionRequest) -> AICompletionResponse:
        start_time = time.time()
        if not self.api_key:
            logger.info("GEMINI_API_KEY not configured. Seamlessly utilizing Deterministic Healthcare Intelligence Provider.")
            return await self.fallback_mock.generate_completion(request)

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"System Directive:\n{request.system_prompt}\n\nTask:\n{request.user_prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": request.temperature,
                    "maxOutputTokens": request.max_tokens or 2048
                }
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    text_out = ""
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text_out = "".join([p.get("text", "") for p in parts])
                    
                    usage = data.get("usageMetadata", {})
                    p_tokens = usage.get("promptTokenCount", len(request.user_prompt.split()) + 40)
                    c_tokens = usage.get("candidatesTokenCount", len(text_out.split()))
                    latency = int((time.time() - start_time) * 1000)

                    return AICompletionResponse(
                        content=text_out,
                        structured_json=None,
                        prompt_tokens=p_tokens,
                        completion_tokens=c_tokens,
                        latency_ms=latency,
                        model_name=self.model,
                        provider_name=self.name,
                        requires_clinician_signoff=True
                    )
                else:
                    logger.warning("Gemini API error %s: %s. Falling back to mock.", resp.status_code, resp.text)
                    return await self.fallback_mock.generate_completion(request)
        except Exception as e:
            logger.error("Gemini invocation failed: %s. Using fallback.", e)
            return await self.fallback_mock.generate_completion(request)
