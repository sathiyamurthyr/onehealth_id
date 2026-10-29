"""
Enterprise Document Upload Validation & Healthcare Classification Service
Enforces strict file signature verification, executable blocking, anti-malware defense,
OCR text readability thresholds, healthcare domain relevance verification, and
category-specific classification rules for OH-ID clinical workflows.
Sathus Technology Pvt Ltd - OneHealth ID Enterprise
"""

import re
import os
import io
import math
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple, Set
from pydantic import BaseModel, Field

from backend.app.core.logging import logger, log_security_event


class ValidationDecision(str, Enum):
    ACCEPTED = "ACCEPTED"
    REJECTED_UNSUPPORTED_TYPE = "REJECTED_UNSUPPORTED_TYPE"
    REJECTED_TOO_LARGE = "REJECTED_TOO_LARGE"
    REJECTED_INVALID_FILE = "REJECTED_INVALID_FILE"
    REJECTED_MALWARE = "REJECTED_MALWARE"
    REJECTED_LOW_OCR_CONFIDENCE = "REJECTED_LOW_OCR_CONFIDENCE"
    REJECTED_IRRELEVANT = "REJECTED_IRRELEVANT"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    PROCESSING_FAILED = "PROCESSING_FAILED"


class DocumentValidationResult(BaseModel):
    decision: ValidationDecision
    is_accepted: bool
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    selected_category: str
    detected_category: Optional[str] = None
    relevance_score: float = Field(0.0, ge=0.0, le=1.0)
    ocr_character_count: int = 0
    readable_word_count: int = 0
    reason: Optional[str] = None
    actionable_remedy: Optional[str] = None
    matched_signals: List[str] = Field(default_factory=list)
    security_checks_passed: bool = False


# Supported clinical document categories allowlist
SUPPORTED_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "LAB_REPORT": {
        "label": "Laboratory Report",
        "description": "Pathology, hematology, biochemistry, and microbiology diagnostic investigations",
        "min_words": 10,
    },
    "PRESCRIPTION": {
        "label": "Prescription",
        "description": "Outpatient, inpatient, or discharge medication orders and dosage charts",
        "min_words": 8,
    },
    "DISCHARGE_SUMMARY": {
        "label": "Discharge Summary",
        "description": "Hospital admission records, clinical hospital course, and discharge instructions",
        "min_words": 20,
    },
    "MEDICAL_CERTIFICATE": {
        "label": "Medical Certificate",
        "description": "Medical fitness, sickness certificates, and certified leave documentation",
        "min_words": 15,
    },
    "DIAGNOSTIC_REPORT": {
        "label": "Diagnostic Imaging Report",
        "description": "Radiology, X-Ray, Ultrasound, CT, MRI, ECG, and diagnostic findings",
        "min_words": 15,
    },
    "IMAGING_REPORT": {
        "label": "Diagnostic Imaging Report",
        "description": "Radiology, X-Ray, Ultrasound, CT, MRI, ECG, and diagnostic findings",
        "min_words": 15,
    },
    "CLINICAL_DOCUMENT": {
        "label": "Clinical Consultation Document",
        "description": "Physician clinical encounter notes, vitals review, and treatment plans",
        "min_words": 12,
    },
    "REFERRAL_LETTER": {
        "label": "Referral Letter",
        "description": "Inter-hospital and specialist medical referral documents",
        "min_words": 15,
    },
    "HOSPITAL_REGISTRATION": {
        "label": "Hospital Registration Document",
        "description": "Healthcare facility statutory license or registration certificate",
        "min_words": 12,
    },
    "INSURANCE_DOCUMENT": {
        "label": "Health Insurance Document",
        "description": "Health insurance policy card, pre-authorization, or claim settlement note",
        "min_words": 10,
    },
}

# Maximum file sizes
MAX_FILE_SIZES: Dict[str, int] = {
    "IMAGE": 10 * 1024 * 1024,      # 10 MB
    "PDF": 20 * 1024 * 1024,        # 20 MB
    "DOCX": 10 * 1024 * 1024,       # 10 MB
}

# Supported file extensions
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".docx"}

# Executable and dangerous binary signatures
EXECUTABLE_SIGNATURES: List[Tuple[bytes, str]] = [
    (b"MZ", "DOS/Windows Executable (PE)"),
    (b"\x7fELF", "Linux ELF Executable"),
    (b"\xfe\xed\xfa\xce", "Mach-O 32-bit Binary"),
    (b"\xfe\xed\xfa\xcf", "Mach-O 64-bit Binary"),
    (b"\xce\xfa\xed\xfe", "Mach-O 32-bit (Reverse)"),
    (b"\xcf\xfa\xed\xfe", "Mach-O 64-bit (Reverse)"),
    (b"#!", "Shell Script"),
    (b"<!DOCTYPE html", "HTML/Web Script"),
    (b"<script", "JavaScript Script"),
    (b"<?php", "PHP Script"),
]

# Comprehensive Medical Domain Terminology Dictionary
MEDICAL_DOMAIN_TERMS: Set[str] = {
    # Clinical roles & institutions
    "patient", "doctor", "dr.", "physician", "surgeon", "consultant", "specialist",
    "hospital", "clinic", "healthcare", "nursing", "ward", "icu", "opd", "ipd", "bed",
    "department", "dispensary", "pharmacy", "pharmacist", "radiologist", "pathologist",
    "laboratory", "lab", "diagnostic", "centre", "center", "medical", "health",
    # Clinical encounter & history
    "diagnosis", "symptoms", "complaint", "chief", "history", "presenting", "illness",
    "vitals", "pulse", "blood pressure", "bp", "temperature", "spo2", "respiratory",
    "examination", "assessment", "treatment", "advice", "follow up", "review",
    "admission", "discharge", "admitted", "discharged", "referral", "referred",
    # Anatomy & systems
    "cardiac", "heart", "pulmonary", "lung", "chest", "abdomen", "abdominal",
    "liver", "kidney", "renal", "cns", "brain", "neuro", "ortho", "bone", "spine",
    "gastro", "ent", "eye", "dental", "skin", "thyroid", "vascular", "blood",
    # Diseases & conditions
    "fever", "cough", "hypertension", "diabetes", "asthma", "pneumonia", "infection",
    "fracture", "pain", "anemia", "jaundice", "dyspnea", "edema", "allergy",
    # Medications & pharmacy
    "rx", "tab", "tablet", "cap", "capsule", "syp", "syrup", "inj", "injection",
    "dosage", "dose", "mg", "ml", "mcg", "od", "bd", "tds", "qid", "sos", "hs",
    "daily", "weekly", "po", "iv", "im", "after food", "before food", "duration",
    # Lab markers & values
    "hemoglobin", "hb", "wbc", "rbc", "platelet", "platelets", "glucose", "sugar",
    "creatinine", "urea", "bilirubin", "sgot", "sgpt", "cholesterol", "triglycerides",
    "hdl", "ldl", "vldl", "tsh", "t3", "t4", "hba1c", "esr", "crp", "urine",
    "serum", "plasma", "specimen", "result", "units", "range", "reference", "interval",
    # Imaging modalities
    "x-ray", "xray", "ultrasound", "usg", "ct scan", "computed tomography",
    "mri", "magnetic resonance", "ecg", "echo", "echocardiogram", "radiograph",
    "findings", "impression", "conclusion",
    # Medical certificate
    "certify", "certified", "unfit", "fitness", "duty", "rest", "convalescence",
    # Tamil clinical terms
    "மருத்துவமனை", "நோயாளி", "மருத்துவர்", "சிகிச்சை", "மருந்து", "ரத்தம்", "பரிசோதனை"
}

# Irrelevant Non-Medical Domain Markers (Invoices, Utility Bills, Marketing, Resumes)
IRRELEVANT_DOMAIN_MARKERS: List[Tuple[str, re.Pattern]] = [
    ("TAX_INVOICE", re.compile(r"\b(?:tax\s+invoice|gstin|cgst|sgst|igst|subtotal|invoice\s+(?:no|number)|billing\s+address|shipping\s+address)\b", re.I)),
    ("UTILITY_BILL", re.compile(r"\b(?:electricity\s+bill|kwh|meter\s+reading|water\s+bill|broadband\s+plan|telecom\s+bill|due\s+date|consumer\s+no)\b", re.I)),
    ("COMMERCIAL_SALES", re.compile(r"\b(?:purchase\s+order|quotation|terms\s+of\s+payment|commercial\s+invoice|bank\s+transfer\s+receipt|pos\s+terminal)\b", re.I)),
    ("RESUME_CV", re.compile(r"\b(?:curriculum\s+vitae|resume|work\s+experience|education\s+history|technical\s+skills|career\s+objective)\b", re.I)),
    ("REAL_ESTATE", re.compile(r"\b(?:lease\s+agreement|rental\s+agreement|landlord|tenant|property\s+deed|survey\s+number)\b", re.I)),
    ("MARKETING_FLYER", re.compile(r"\b(?:special\s+discount|limited\s+time\s+offer|promo\s+code|call\s+now\s+for\s+booking|buy\s+one\s+get\s+one)\b", re.I)),
]

# Category Specific Heuristic Patterns
CATEGORY_HEURISTICS: Dict[str, Dict[str, Any]] = {
    "LAB_REPORT": {
        "strong_patterns": [
            re.compile(r"\b(?:reference\s+(?:range|interval)|biological\s+ref|normal\s+range)\b", re.I),
            re.compile(r"\b(?:specimen|test\s+name|observed\s+value|result\s+units?)\b", re.I),
            re.compile(r"\b(?:pathology|hematology|biochemistry|microbiology|serology)\b", re.I),
            re.compile(r"\b(?:complete\s+blood\s+count|lipid\s+profile|liver\s+function|renal\s+function|thyroid\s+profile|urine\s+routine|hba1c)\b", re.I),
        ],
        "keywords": {"hemoglobin", "wbc", "rbc", "platelet", "glucose", "creatinine", "urea", "bilirubin", "sgot", "sgpt", "cholesterol", "triglycerides", "hba1c", "tsh", "urine", "specimen", "pathology", "cumm", "mg/dl", "g/dl"},
    },
    "PRESCRIPTION": {
        "strong_patterns": [
            re.compile(r"\b(?:℞|rx\b|rx:)", re.I),
            re.compile(r"\b(?:tab|cap|syp|inj)\.?\s+[A-Za-z0-9\-]+\s+\d+\s*(?:mg|ml|mcg|gm)\b", re.I),
            re.compile(r"\b\d\s*-\s*\d\s*-\s*\d\b"),  # 1-0-1 dosage
            re.compile(r"\b(?:o\.?d\.?|b\.?d\.?|t\.?d\.?s\.?|q\.?i\.?d\.?|s\.?o\.?s\.?|h\.?s\.?)\b", re.I),
            re.compile(r"\b(?:after\s+food|before\s+food|oral|sublingual|for\s+\d+\s+days)\b", re.I),
        ],
        "keywords": {"rx", "tablet", "capsule", "syrup", "injection", "dosage", "dose", "mg", "ml", "od", "bd", "tds", "qid", "sos", "after food", "before food", "duration", "prescribed", "dispense"},
    },
    "DISCHARGE_SUMMARY": {
        "strong_patterns": [
            re.compile(r"\b(?:discharge\s+summary|inpatient\s+summary|hospital\s+summary)\b", re.I),
            re.compile(r"\b(?:date\s+of\s+admission|admission\s+date|d\.?o\.?a\.?)\b", re.I),
            re.compile(r"\b(?:date\s+of\s+discharge|discharge\s+date|d\.?o\.?d\.?)\b", re.I),
            re.compile(r"\b(?:course\s+in\s+hospital|hospital\s+course|clinical\s+course)\b", re.I),
            re.compile(r"\b(?:discharge\s+advice|condition\s+at\s+discharge|discharge\s+medications?)\b", re.I),
        ],
        "keywords": {"admission", "discharge", "admitted", "discharged", "hospital course", "discharge advice", "inpatient", "ward", "bed", "diagnosis", "surgery", "operative"},
    },
    "MEDICAL_CERTIFICATE": {
        "strong_patterns": [
            re.compile(r"\b(?:medical\s+certificate|certificate\s+of\s+medical\s+fitness|fitness\s+certificate|sick\s+certificate)\b", re.I),
            re.compile(r"\b(?:this\s+is\s+to\s+certify\s+that|i\s+hereby\s+certify\s+that)\b", re.I),
            re.compile(r"\b(?:unfit\s+for\s+(?:duty|work|school)|fit\s+to\s+resume|suffering\s+from)\b", re.I),
            re.compile(r"\b(?:recommended\s+(?:bed\s+rest|leave|rest)\s+for\s+\d+\s+days)\b", re.I),
        ],
        "keywords": {"certify", "certified", "unfit", "fitness", "leave", "rest", "duty", "suffering from", "medical officer", "signature of doctor"},
    },
    "DIAGNOSTIC_REPORT": {
        "strong_patterns": [
            re.compile(r"\b(?:x-?ray|ultrasound|usg|ct\s+scan|computed\s+tomography|mri|magnetic\s+resonance|echocardiogram|ecg)\b", re.I),
            re.compile(r"\b(?:radiology\s+report|imaging\s+report|ultrasonography\s+report)\b", re.I),
            re.compile(r"\b(?:findings\s*:|impression\s*:|conclusion\s*:|technique\s*:)\b", re.I),
            re.compile(r"\b(?:radiologist|sonologist|imaging\s+findings)\b", re.I),
        ],
        "keywords": {"x-ray", "ultrasound", "usg", "ct scan", "mri", "radiology", "imaging", "findings", "impression", "conclusion", "technique", "radiologist", "scan"},
    },
    "CLINICAL_DOCUMENT": {
        "strong_patterns": [
            re.compile(r"\b(?:consultation\s+note|clinical\s+encounter|opd\s+record|clinical\s+summary)\b", re.I),
            re.compile(r"\b(?:chief\s+complaints?|history\s+of\s+presenting\s+illness|hpi)\b", re.I),
            re.compile(r"\b(?:systemic\s+examination|physical\s+examination|general\s+examination)\b", re.I),
            re.compile(r"\b(?:clinical\s+assessment|plan\s+of\s+treatment|provisional\s+diagnosis)\b", re.I),
        ],
        "keywords": {"consultation", "complaint", "vitals", "examination", "assessment", "treatment", "plan", "doctor", "patient", "clinical", "history"},
    },
    "REFERRAL_LETTER": {
        "strong_patterns": [
            re.compile(r"\b(?:referral\s+letter|referral\s+note|referred\s+for|medical\s+referral)\b", re.I),
            re.compile(r"\b(?:referred\s+to|referring\s+doctor|dear\s+doctor)\b", re.I),
            re.compile(r"\b(?:reason\s+for\s+referral|kindly\s+(?:evaluate|manage|admit))\b", re.I),
        ],
        "keywords": {"referral", "referred", "referring", "specialist", "management", "evaluation", "transfer", "patient"},
    },
    "HOSPITAL_REGISTRATION": {
        "strong_patterns": [
            re.compile(r"\b(?:clinical\s+establishments?\s+act|hospital\s+registration|directorate\s+of\s+medical|state\s+councils?)\b", re.I),
            re.compile(r"\b(?:registration\s+certificate|certificate\s+of\s+registration|license\s+no)\b", re.I),
            re.compile(r"\b(?:allopathic|valid\s+up\s+to|authorized\s+beds?|inpatient\s+beds?)\b", re.I),
        ],
        "keywords": {"registration", "certificate", "license", "clinical establishment", "beds", "validity", "directorate", "authority"},
    },
    "INSURANCE_DOCUMENT": {
        "strong_patterns": [
            re.compile(r"\b(?:health\s+insurance|pre-?authorization|tpa|claim\s+number|policy\s+number)\b", re.I),
            re.compile(r"\b(?:cashless\s+authorization|claim\s+settlement|sum\s+insured)\b", re.I),
        ],
        "keywords": {"insurance", "policy", "tpa", "pre-authorization", "cashless", "claim", "sum insured"},
    },
}

# Alias mapping
CATEGORY_HEURISTICS["IMAGING_REPORT"] = CATEGORY_HEURISTICS["DIAGNOSTIC_REPORT"]


class EnterpriseDocumentValidator:
    """
    Authoritative Multi-Stage Document Upload Validation & Healthcare Classification Engine.
    Executes in-memory, deterministic verification before permanent storage.
    """

    @classmethod
    def validate_file_pre_flight(
        cls,
        content: bytes,
        filename: str,
        category: str
    ) -> Tuple[bool, ValidationDecision, Optional[str], Optional[str]]:
        """
        Stage A: Pre-flight file validation (Signature, Executable checks, Size, Encryption, Empty).
        Returns (is_valid, decision, reason, remedy).
        """
        # 1. Empty file
        if not content or len(content) == 0:
            return False, ValidationDecision.REJECTED_INVALID_FILE, "Uploaded file is empty (0 bytes).", "Please select a valid, non-empty file."

        if len(content) < 16:
            return False, ValidationDecision.REJECTED_INVALID_FILE, "File content is too small to be a valid document.", "Please upload a complete, readable document."

        # 2. Extension check
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return (
                False,
                ValidationDecision.REJECTED_UNSUPPORTED_TYPE,
                f"File format '{ext}' is not supported.",
                f"Supported file formats are: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        # 3. Detect category size limit
        file_category = "PDF" if ext == ".pdf" else ("DOCX" if ext == ".docx" else "IMAGE")
        max_size = MAX_FILE_SIZES.get(file_category, 10 * 1024 * 1024)
        if len(content) > max_size:
            max_mb = max_size // (1024 * 1024)
            current_mb = round(len(content) / (1024 * 1024), 2)
            return (
                False,
                ValidationDecision.REJECTED_TOO_LARGE,
                f"File size ({current_mb} MB) exceeds maximum allowed limit of {max_mb} MB for {file_category} files.",
                f"Please optimize or compress the file below {max_mb} MB before uploading."
            )

        # 4. Binary signature inspection & executable / malware blocking
        if b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE" in content[:1024]:
            logger.warning(f"Malware signature (EICAR) detected in uploaded file '{filename}'")
            return (
                False,
                ValidationDecision.REJECTED_MALWARE,
                "File security violation: Known malware signature detected.",
                "The uploaded file failed security screening. Please ensure the file is safe and free of malware."
            )

        for sig, desc in EXECUTABLE_SIGNATURES:
            if content.startswith(sig):
                logger.warning(f"Executable/script binary signature '{desc}' detected in file '{filename}'")
                return (
                    False,
                    ValidationDecision.REJECTED_INVALID_FILE,
                    f"File security violation: Executable or script payload detected ({desc}).",
                    "Only genuine medical documents and scans (PDF, JPG, PNG, WEBP, DOCX) are permitted."
                )

        # 5. Magic byte verification
        if ext == ".pdf":
            if not content.startswith(b"%PDF-"):
                return False, ValidationDecision.REJECTED_INVALID_FILE, "Invalid PDF header signature. File is corrupted or spoofed.", "Please ensure the file is an authentic, uncorrupted PDF."
            # Password / encrypted PDF check
            if b"/Encrypt" in content[:4096] or b"/Encrypt" in content[-4096:]:
                try:
                    import pypdfium2 as pdfium
                    doc = pdfium.PdfDocument(content)
                    if doc.is_encrypted:
                        doc.close()
                        return (
                            False,
                            ValidationDecision.REJECTED_INVALID_FILE,
                            "Password-protected or encrypted PDFs cannot be processed.",
                            "Please remove password protection from the PDF before uploading."
                        )
                    doc.close()
                except Exception:
                    return False, ValidationDecision.REJECTED_INVALID_FILE, "Encrypted or password-protected PDF cannot be read.", "Please upload an unencrypted PDF."

        elif ext == ".png":
            if not content.startswith(b"\x89PNG\r\n\x1a\n"):
                return False, ValidationDecision.REJECTED_INVALID_FILE, "Invalid PNG signature. File content does not match extension.", "Please verify the image file integrity."

        elif ext in (".jpg", ".jpeg"):
            if not content.startswith(b"\xff\xd8\xff"):
                return False, ValidationDecision.REJECTED_INVALID_FILE, "Invalid JPEG signature. File content does not match extension.", "Please verify the image file integrity."

        elif ext == ".webp":
            if not (content.startswith(b"RIFF") and len(content) > 12 and content[8:12] == b"WEBP"):
                return False, ValidationDecision.REJECTED_INVALID_FILE, "Invalid WebP signature.", "Please verify the image file integrity."

        elif ext == ".docx":
            if not content.startswith(b"PK\x03\x04"):
                return False, ValidationDecision.REJECTED_INVALID_FILE, "Invalid DOCX container signature.", "Please verify the Word document integrity."

        return True, ValidationDecision.ACCEPTED, None, None

    @classmethod
    def sanitize_untrusted_text(cls, raw_text: str, max_chars: int = 50000) -> str:
        """
        Sanitizes OCR extracted text before classification to prevent prompt injection,
        control characters, and memory exploitation.
        """
        if not raw_text:
            return ""
        # Strip ASCII control characters except standard whitespace
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", " ", raw_text)
        # Strip potential system prompt injection directives
        cleaned = re.sub(
            r"(?i)\b(?:system\s*override|system\s*prompt|ignore\s+all\s+previous\s+instructions|ignore\s+previous\s+instructions|you\s+must\s+classify|admin\s*override)\b.*",
            "[BLOCKED_INSTRUCTION]",
            cleaned,
        )
        return cleaned[:max_chars]  # Max characters to prevent resource exhaustion

    @classmethod
    def score_healthcare_relevance(cls, clean_text: str) -> Tuple[float, List[str], Optional[str]]:
        """
        Stage D: Evaluates whether the document content belongs to the medical/healthcare domain.
        Returns (relevance_score, matched_medical_terms, irrelevant_marker_detected).
        """
        words = re.findall(r"\b[A-Za-z0-9\-\.]{2,}\b", clean_text.lower())
        if not words:
            return 0.0, [], None

        word_count = len(words)

        # 1. Check for negative irrelevant markers (Tax invoices, utility bills, resumes, marketing)
        for marker_name, pattern in IRRELEVANT_DOMAIN_MARKERS:
            if pattern.search(clean_text):
                logger.info(f"Healthcare relevance gate: Irrelevant document pattern '{marker_name}' detected.")
                return 0.05, [], marker_name

        # 2. Count distinct medical domain terms
        matched_terms: List[str] = []
        for term in MEDICAL_DOMAIN_TERMS:
            # Check whole word / phrase match
            if " " in term:
                if term in clean_text.lower():
                    matched_terms.append(term)
            else:
                if term in words:
                    matched_terms.append(term)

        distinct_matches = len(set(matched_terms))

        if distinct_matches == 0:
            return 0.0, [], "NO_MEDICAL_CONTENT"

        # Calculate normalized relevance score
        # 1 match = ~0.25, 2 matches = ~0.45, 4+ matches = ~0.80, 7+ matches = 1.0
        relevance_score = min(1.0, round(1.0 - math.exp(-0.35 * distinct_matches), 3))

        return relevance_score, list(set(matched_terms)), None

    @classmethod
    def classify_document_category(
        cls,
        clean_text: str,
        selected_category: str
    ) -> Tuple[Optional[str], float, List[str]]:
        """
        Stage E: Classifies text against allowlisted categories and evaluates match with user selection.
        Returns (best_detected_category, confidence_score, matched_signals).
        """
        category_scores: Dict[str, float] = {}
        category_signals: Dict[str, List[str]] = {}

        text_lower = clean_text.lower()

        for cat_key, config in CATEGORY_HEURISTICS.items():
            signals: List[str] = []
            score = 0.0

            # 1. Strong regex patterns (+0.4 per pattern match)
            for pattern in config.get("strong_patterns", []):
                match = pattern.search(clean_text)
                if match:
                    matched_str = match.group(0)[:40]
                    signals.append(f"pattern:{matched_str}")
                    score += 0.40

            # 2. Category keyword matching (+0.1 per keyword)
            keywords = config.get("keywords", set())
            keyword_matches = [kw for kw in keywords if kw in text_lower]
            for kw in keyword_matches[:6]:  # Cap at 6 to avoid skew
                signals.append(f"kw:{kw}")
                score += 0.10

            category_scores[cat_key] = min(1.0, round(score, 3))
            category_signals[cat_key] = signals

        # Find best detected category
        if not category_scores or max(category_scores.values()) == 0.0:
            return None, 0.0, []

        best_cat = max(category_scores.keys(), key=lambda k: category_scores[k])
        best_score = category_scores[best_cat]

        return best_cat, best_score, category_signals.get(best_cat, [])

    @classmethod
    def evaluate_validation_decision(
        cls,
        raw_text: str,
        selected_category: str,
        is_scanned: bool = False
    ) -> DocumentValidationResult:
        """
        Comprehensive decision evaluation combining OCR readability, healthcare relevance,
        and category matching.
        """
        selected_cat_normalized = selected_category.upper().strip()
        if selected_cat_normalized not in SUPPORTED_CATEGORIES:
            return DocumentValidationResult(
                decision=ValidationDecision.REJECTED_UNSUPPORTED_TYPE,
                is_accepted=False,
                confidence=0.0,
                selected_category=selected_category,
                reason=f"Selected document category '{selected_category}' is not supported by OH-ID workflows.",
                actionable_remedy=f"Please choose from supported categories: {', '.join(SUPPORTED_CATEGORIES.keys())}",
                security_checks_passed=True
            )

        # 1. Sanitize OCR text
        clean_text = cls.sanitize_untrusted_text(raw_text)
        words = re.findall(r"\b[A-Za-z0-9\-\.]{2,}\b", clean_text)
        char_count = len(clean_text)
        word_count = len(words)

        min_words_required = SUPPORTED_CATEGORIES[selected_cat_normalized].get("min_words", 10)

        # 2. Check readability / OCR confidence
        if word_count < 4 or char_count < 15:
            return DocumentValidationResult(
                decision=ValidationDecision.REJECTED_LOW_OCR_CONFIDENCE,
                is_accepted=False,
                confidence=0.1,
                selected_category=selected_category,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason="Document contains insufficient readable text or is severely degraded/blank.",
                actionable_remedy="We could not read this document. Please upload a clearer, well-lit scan or digital PDF.",
                security_checks_passed=True
            )

        # 3. Check Healthcare Domain Relevance
        relevance_score, matched_terms, irrelevant_marker = cls.score_healthcare_relevance(clean_text)

        if irrelevant_marker or relevance_score < 0.20:
            reason_msg = (
                f"Document content appears to be a commercial/non-medical document ({irrelevant_marker})."
                if irrelevant_marker else
                "Content does not contain recognizable clinical, medical, or healthcare terminology."
            )
            return DocumentValidationResult(
                decision=ValidationDecision.REJECTED_IRRELEVANT,
                is_accepted=False,
                confidence=relevance_score,
                selected_category=selected_category,
                relevance_score=relevance_score,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason=f"Healthcare relevance check failed: {reason_msg}",
                actionable_remedy="Please ensure you upload an authentic medical record (Lab Report, Prescription, Discharge Summary, etc.). Commercial bills, invoices, and unrelated files are not accepted.",
                matched_signals=matched_terms,
                security_checks_passed=True
            )

        # 4. Classify and match category
        detected_cat, cat_confidence, cat_signals = cls.classify_document_category(clean_text, selected_cat_normalized)

        # Check category alignment
        is_category_aligned = False
        if detected_cat:
            # Direct match or alias match (e.g. DIAGNOSTIC_REPORT == IMAGING_REPORT)
            if detected_cat == selected_cat_normalized:
                is_category_aligned = True
            elif {detected_cat, selected_cat_normalized} == {"DIAGNOSTIC_REPORT", "IMAGING_REPORT"}:
                is_category_aligned = True

        all_matched_signals = matched_terms + cat_signals

        # If detected category is strong (> 0.5) and contradicts the selected category:
        if detected_cat and not is_category_aligned and cat_confidence >= 0.50:
            detected_label = SUPPORTED_CATEGORIES.get(detected_cat, {}).get("label", detected_cat)
            selected_label = SUPPORTED_CATEGORIES.get(selected_cat_normalized, {}).get("label", selected_cat_normalized)
            return DocumentValidationResult(
                decision=ValidationDecision.REJECTED_IRRELEVANT,
                is_accepted=False,
                confidence=cat_confidence,
                selected_category=selected_category,
                detected_category=detected_cat,
                relevance_score=relevance_score,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason=f"Document category mismatch: Content matches '{detected_label}' but '{selected_label}' was selected.",
                actionable_remedy=f"This document appears to be a {detected_label}. Please select '{detected_label}' in the category dropdown and re-upload.",
                matched_signals=all_matched_signals,
                security_checks_passed=True
            )

        # If category is aligned and confidence is high:
        if is_category_aligned and cat_confidence >= 0.35:
            return DocumentValidationResult(
                decision=ValidationDecision.ACCEPTED,
                is_accepted=True,
                confidence=round((cat_confidence + relevance_score) / 2.0, 3),
                selected_category=selected_category,
                detected_category=detected_cat,
                relevance_score=relevance_score,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason="Document successfully verified, classified, and accepted into clinical records.",
                matched_signals=all_matched_signals,
                security_checks_passed=True
            )

        # If healthcare relevance is established, but category signals are subtle or mixed:
        # Require authorized clinical review rather than outright rejection
        if relevance_score >= 0.35 and word_count >= min_words_required:
            return DocumentValidationResult(
                decision=ValidationDecision.REVIEW_REQUIRED,
                is_accepted=False,
                confidence=round(relevance_score * 0.75, 3),
                selected_category=selected_category,
                detected_category=detected_cat or selected_cat_normalized,
                relevance_score=relevance_score,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason="Medical content verified, but document layout requires authorized clinical review before permanent acceptance.",
                actionable_remedy="This document has been quarantined for authorized staff review. You may also re-upload with a clearer scan.",
                matched_signals=all_matched_signals,
                security_checks_passed=True
            )

        # Fallback rejection for low confidence / ambiguous content
        return DocumentValidationResult(
            decision=ValidationDecision.REJECTED_IRRELEVANT,
            is_accepted=False,
            confidence=round(relevance_score * 0.5, 3),
            selected_category=selected_category,
            detected_category=detected_cat,
            relevance_score=relevance_score,
            ocr_character_count=char_count,
            readable_word_count=word_count,
            reason="Document does not contain sufficient specific information for the selected medical category.",
            actionable_remedy="Please upload a complete, formal medical document containing the doctor's findings or laboratory results.",
            matched_signals=all_matched_signals,
            security_checks_passed=True
        )


# Singleton validator instance
document_validator = EnterpriseDocumentValidator()

# Module-level aliases for direct imports
validate_file_pre_flight = EnterpriseDocumentValidator.validate_file_pre_flight
sanitize_untrusted_text = EnterpriseDocumentValidator.sanitize_untrusted_text
score_healthcare_relevance = EnterpriseDocumentValidator.score_healthcare_relevance
classify_document_category = EnterpriseDocumentValidator.classify_document_category
evaluate_validation_decision = EnterpriseDocumentValidator.evaluate_validation_decision

