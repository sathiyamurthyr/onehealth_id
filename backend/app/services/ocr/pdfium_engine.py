"""
PDFium-Powered Document Text Extraction Engine
Leverages native pypdfium2 for zero-latency, high-precision digital PDF parsing.
Sathus Technology Pvt Ltd - OneHealth ID
"""

from pathlib import Path
from typing import Dict, Any, List
try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None
from backend.app.services.ocr.base import BaseOCREngine
from backend.app.core.logging import logger


class PDFiumOCREngine(BaseOCREngine):
    """
    High-performance, offline PDF text extraction engine.
    Extracts text layout directly from digital PDF streams with 100% character fidelity.
    """

    MAX_PAGES = 50

    def supported_mime_types(self) -> List[str]:
        return ["application/pdf"]

    def extract_text(self, file_input: Any, mime_type: str = "application/pdf") -> Dict[str, Any]:
        if pdfium is None:
            raise RuntimeError("pypdfium2 is not installed in the runtime environment.")
        if isinstance(file_input, (bytes, bytearray)):
            doc = pdfium.PdfDocument(bytes(file_input))
        else:
            file_path = Path(file_input)
            if not file_path.exists():
                raise FileNotFoundError(f"PDF file not found at {file_path}")
            doc = pdfium.PdfDocument(str(file_path))

        page_count = len(doc)
        if page_count > self.MAX_PAGES:
            doc.close()
            raise ValueError(f"Document exceeds maximum page limit ({self.MAX_PAGES} pages). Document has {page_count} pages.")

        pages_text: List[str] = []
        is_scanned = True

        try:
            for page_idx in range(page_count):
                page = doc[page_idx]
                textpage = page.get_textpage()
                page_text = textpage.get_text_range().strip()
                pages_text.append(page_text)
                if len(page_text) > 10:
                    is_scanned = False
                textpage.close()
                page.close()
        finally:
            doc.close()

        combined_text = "\n\n--- PAGE BREAK ---\n\n".join(pages_text)

        # Detect Tamil script presence
        has_tamil = any(0x0B80 <= ord(c) <= 0x0BFF for c in combined_text)
        detected_lang = "tam+eng" if has_tamil else "eng"

        return {
            "raw_text": combined_text,
            "page_count": page_count,
            "pages_text": pages_text,
            "is_scanned": is_scanned,
            "language_detected": detected_lang,
            "engine_used": "PYPDFIUM2_NATIVE",
        }
