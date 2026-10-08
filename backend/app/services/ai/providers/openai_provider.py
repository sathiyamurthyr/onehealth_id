"""
OH-ID AI Platform: OpenAI Provider
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

class OpenAIProvider(BaseAIProvider):
    def __init__(self, name: str = "OPENAI", config: Optional[Dict[str, Any]] = None):
        super().__init__(name=name, config=config)
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = self.config.get("model", "gpt-4o")
        self.fallback_mock = DeterministicMockProvider()

    async def generate_completion(self, request: AICompletionRequest) -> AICompletionResponse:
        start_time = time.time()
        if not self.api_key:
            return await self.fallback_mock.generate_completion(request)

        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": request.system_prompt},
                    {"role": "user", "content": request.user_prompt}
                ],
                "temperature": request.temperature,
                "max_tokens": request.max_tokens or 2048
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    text_out = choices[0]["message"]["content"] if choices else ""
                    usage = data.get("usage", {})
                    p_tokens = usage.get("prompt_tokens", len(request.user_prompt.split()) + 40)
                    c_tokens = usage.get("completion_tokens", len(text_out.split()))
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
                    return await self.fallback_mock.generate_completion(request)
        except Exception as e:
            logger.error("OpenAI invocation failed: %s. Using fallback.", e)
            return await self.fallback_mock.generate_completion(request)
