"""
OH-ID AI Platform: Anthropic Claude & Local Ollama Providers
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

class ClaudeProvider(BaseAIProvider):
    def __init__(self, name: str = "ANTHROPIC", config: Optional[Dict[str, Any]] = None):
        super().__init__(name=name, config=config)
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.model = self.config.get("model", "claude-3-5-sonnet-20241022")
        self.fallback_mock = DeterministicMockProvider()

    async def generate_completion(self, request: AICompletionRequest) -> AICompletionResponse:
        start_time = time.time()
        if not self.api_key:
            return await self.fallback_mock.generate_completion(request)

        try:
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            payload = {
                "model": self.model,
                "system": request.system_prompt,
                "messages": [{"role": "user", "content": request.user_prompt}],
                "max_tokens": request.max_tokens or 2048,
                "temperature": request.temperature
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content_blocks = data.get("content", [])
                    text_out = "".join([c.get("text", "") for c in content_blocks])
                    usage = data.get("usage", {})
                    p_tokens = usage.get("input_tokens", len(request.user_prompt.split()) + 40)
                    c_tokens = usage.get("output_tokens", len(text_out.split()))
                    latency = int((time.time() - start_time) * 1000)

                    return AICompletionResponse(
                        content=text_out,
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
            logger.error("Claude invocation failed: %s. Using fallback.", e)
            return await self.fallback_mock.generate_completion(request)


class OllamaProvider(BaseAIProvider):
    def __init__(self, name: str = "OLLAMA", config: Optional[Dict[str, Any]] = None):
        super().__init__(name=name, config=config)
        self.base_url = self.config.get("base_url", os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
        self.model = self.config.get("model", "llama3.1:8b")
        self.fallback_mock = DeterministicMockProvider()

    async def generate_completion(self, request: AICompletionRequest) -> AICompletionResponse:
        start_time = time.time()
        try:
            url = f"{self.base_url}/api/chat"
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": request.system_prompt},
                    {"role": "user", "content": request.user_prompt}
                ],
                "stream": False,
                "options": {"temperature": request.temperature}
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text_out = data.get("message", {}).get("content", "")
                    latency = int((time.time() - start_time) * 1000)
                    return AICompletionResponse(
                        content=text_out,
                        prompt_tokens=len(request.user_prompt.split()) + 40,
                        completion_tokens=len(text_out.split()),
                        latency_ms=latency,
                        model_name=self.model,
                        provider_name=self.name,
                        requires_clinician_signoff=True
                    )
                else:
                    return await self.fallback_mock.generate_completion(request)
        except Exception:
            return await self.fallback_mock.generate_completion(request)
