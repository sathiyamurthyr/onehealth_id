"""
OH-ID AI Platform: Abstract Base Model Provider
Sathus Technology Pvt Ltd
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class AICompletionRequest(BaseModel):
    prompt_key: str
    system_prompt: str
    user_prompt: str
    temperature: float = 0.2
    max_tokens: Optional[int] = 2048
    context_metadata: Dict[str, Any] = Field(default_factory=dict)

class AICitation(BaseModel):
    source_type: str # VISIT, CONSULTATION, PRESCRIPTION, LAB_REPORT, RADIOLOGY, SOP
    hospital_id: Optional[str] = None
    record_id: str
    date: Optional[str] = None
    description: str

class AICompletionResponse(BaseModel):
    content: str
    structured_json: Optional[Dict[str, Any]] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: int = 0
    model_name: str
    provider_name: str
    citations: List[AICitation] = Field(default_factory=list)
    safety_flags: List[str] = Field(default_factory=list)
    requires_clinician_signoff: bool = True

class BaseAIProvider(ABC):
    """Abstract base class for all OH-ID model providers."""
    
    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        self.name = name
        self.config = config or {}

    @abstractmethod
    async def generate_completion(self, request: AICompletionRequest) -> AICompletionResponse:
        """Generates AI completion given an AICompletionRequest."""
        pass
