"""
OCR Provider Abstraction and Data Models for OH-ID Document Processing
Sathus Technology Pvt Ltd - OneHealth ID
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class ExtractedField(BaseModel):
    field_name: str
    label: str
    value: Optional[str] = None
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    source_location: Optional[str] = None
    is_edited: bool = False
    warning: Optional[str] = None


class OCRResult(BaseModel):
    raw_text: str = ""
    page_count: int = 1
    language_detected: str = "eng"
    extracted_fields: Dict[str, Any] = Field(default_factory=dict)
    confidence_scores: Dict[str, float] = Field(default_factory=dict)
    source_locations: Dict[str, str] = Field(default_factory=dict)
    engine_used: str = "DEFAULT"
    warnings: List[str] = Field(default_factory=list)


class BaseOCREngine(ABC):
    """
    Abstract interface for OCR and document extraction engines.
    Allows swappable engines (PDFium, Local Tesseract, PaddleOCR, Managed/AI)
    without coupling business logic to a single vendor.
    """

    @abstractmethod
    def extract_text(self, file_path: Path, mime_type: str) -> Dict[str, Any]:
        """Extract raw text and page metadata from file."""
        pass

    @abstractmethod
    def supported_mime_types(self) -> List[str]:
        """Return list of supported MIME types for this engine."""
        pass
