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
    # Primary Standard Outcomes (Strict Medical Document Validation Specification)
    MEDICAL_DOCUMENT_ACCEPTED = "MEDICAL_DOCUMENT_ACCEPTED"
    NON_MEDICAL_DOCUMENT_REJECTED = "NON_MEDICAL_DOCUMENT_REJECTED"
    UNSUPPORTED_DOCUMENT_REJECTED = "UNSUPPORTED_DOCUMENT_REJECTED"
    VALIDATION_UNCERTAIN = "VALIDATION_UNCERTAIN"
    SECURITY_VALIDATION_FAILED = "SECURITY_VALIDATION_FAILED"

    # Backward-Compatible Operational Aliases
    STORED = "STORED"
    ACCEPTED = "ACCEPTED"
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    VERIFIED = "VERIFIED"
    REJECTED_UNSUPPORTED_TYPE = "REJECTED_UNSUPPORTED_TYPE"
    REJECTED_TOO_LARGE = "REJECTED_TOO_LARGE"
    REJECTED_INVALID_FILE = "REJECTED_INVALID_FILE"
    REJECTED_MALWARE = "REJECTED_MALWARE"
    REJECTED_LOW_OCR_CONFIDENCE = "REJECTED_LOW_OCR_CONFIDENCE"
    REJECTED_IRRELEVANT = "REJECTED_IRRELEVANT"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    PROCESSING_FAILED = "PROCESSING_FAILED"

    def __eq__(self, other):
        if self is other:
            return True
        val_self = getattr(self, "value", str(self))
        val_other = getattr(other, "value", str(other))
        if val_self == val_other:
            return True
        alias_groups = [
            {"ACCEPTED", "MEDICAL_DOCUMENT_ACCEPTED"},
            {"REJECTED_IRRELEVANT", "NON_MEDICAL_DOCUMENT_REJECTED"},
            {"REJECTED_UNSUPPORTED_TYPE", "UNSUPPORTED_DOCUMENT_REJECTED"},
            {"REJECTED_LOW_OCR_CONFIDENCE", "VALIDATION_UNCERTAIN"},
            {"REJECTED_MALWARE", "SECURITY_VALIDATION_FAILED"},
        ]
        for grp in alias_groups:
            if val_self in grp and val_other in grp:
                return True
        return False

    def __hash__(self):
        alias_canonical = {
            "ACCEPTED": "MEDICAL_DOCUMENT_ACCEPTED",
            "REJECTED_IRRELEVANT": "NON_MEDICAL_DOCUMENT_REJECTED",
            "REJECTED_UNSUPPORTED_TYPE": "UNSUPPORTED_DOCUMENT_REJECTED",
            "REJECTED_LOW_OCR_CONFIDENCE": "VALIDATION_UNCERTAIN",
            "REJECTED_MALWARE": "SECURITY_VALIDATION_FAILED",
        }
        canonical = alias_canonical.get(self.value, self.value)
        return hash(canonical)


# Decisions where the document is safely stored and usable in Health Vault
ACCEPTED_DECISIONS: frozenset = frozenset({
    ValidationDecision.MEDICAL_DOCUMENT_ACCEPTED,
    ValidationDecision.STORED,
    ValidationDecision.ACCEPTED,
    ValidationDecision.UPLOADED,
    ValidationDecision.VERIFIED,
})


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


# Supported clinical document categories allowlist (7 primary categories per OH-ID specification)
SUPPORTED_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "PRESCRIPTION": {
        "label": "Prescription",
        "description": "Outpatient, inpatient, or discharge medication orders and dosage charts",
        "min_words": 8,
    },
    "LAB_REPORT": {
        "label": "Laboratory Report",
        "description": "Pathology, hematology, biochemistry, and microbiology diagnostic investigations",
        "min_words": 10,
    },
    "CLINICAL_DOCUMENT": {
        "label": "Medical Consultation Report",
        "description": "Physician clinical encounter notes, vitals review, examination findings, and treatment plans",
        "min_words": 10,
    },
    "DISCHARGE_SUMMARY": {
        "label": "Discharge Summary",
        "description": "Hospital admission records, clinical hospital course, and discharge instructions",
        "min_words": 15,
    },
    "MEDICAL_CERTIFICATE": {
        "label": "Medical Certificate",
        "description": "Medical fitness, sickness certificates, and certified leave documentation",
        "min_words": 10,
    },
    "DIAGNOSTIC_REPORT": {
        "label": "Medical Imaging / X-ray Report",
        "description": "Radiology, X-Ray, Ultrasound, CT, MRI, ECG, and diagnostic findings",
        "min_words": 10,
    },
    "OTHER": {
        "label": "Other Supported Clinical Document",
        "description": "Immunization records, operative notes, referral letters, and authentic clinical documents",
        "min_words": 6,
    },
}

# Aliases and backward-compatible category mappings
SUPPORTED_CATEGORIES["IMAGING_REPORT"] = {
    "label": "Medical Imaging / X-ray Report",
    "description": "Radiology, X-Ray, Ultrasound, CT, MRI, ECG, and diagnostic findings",
    "min_words": 10,
}
SUPPORTED_CATEGORIES["MEDICAL_RECORD"] = SUPPORTED_CATEGORIES["CLINICAL_DOCUMENT"]
SUPPORTED_CATEGORIES["OTHER_DOCUMENT"] = SUPPORTED_CATEGORIES["OTHER"]
SUPPORTED_CATEGORIES["REFERRAL_LETTER"] = {
    "label": "Referral Letter",
    "description": "Inter-hospital and specialist medical referral documents",
    "min_words": 12,
}
SUPPORTED_CATEGORIES["HOSPITAL_REGISTRATION"] = {
    "label": "Hospital Registration Document",
    "description": "Healthcare facility statutory license or registration certificate",
    "min_words": 10,
}
SUPPORTED_CATEGORIES["INSURANCE_DOCUMENT"] = {
    "label": "Health Insurance Document",
    "description": "Health insurance policy card, pre-authorization, or claim settlement note",
    "min_words": 8,
}
SUPPORTED_CATEGORIES["PATIENT_ID"] = {
    "label": "Patient Identification Document",
    "description": "National ID, Government Health Card, Aadhaar, Voter ID, or Smart Card",
    "min_words": 6,
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

# Irrelevant Non-Medical Domain Markers (Screenshots, Messaging, Social Media, Bills, Resumes)
IRRELEVANT_DOMAIN_MARKERS: List[Tuple[str, re.Pattern]] = [
    # 1. Messaging & Chat Application Interfaces (WhatsApp, Telegram, Signal, iMessage, SMS)
    ("MESSAGING_CHAT_INTERFACE", re.compile(
        r"(?:"
        r"\b(?:type\s+a\s+message|type\s+message|send\s+a\s+message|message\.\.\.|text\s+message|imessage)\b|"
        r"(?:\b(?:typing\.\.\.|last\s+seen(?:\s+today|\s+yesterday)?|(?:currently|user\s+is|is)\s+online)\b|\bonline\s*\||^\s*online\s*$|\bonline\s*\n)|"
        r"\b(?:chats?\b\s+(?:status|calls?|updates|channels?)|unread\s+messages?|disappearing\s+messages?)\b|"
        r"\b(?:end-to-end\s+encrypted|messages\s+and\s+calls\s+are\s+end-to-end\s+encrypted)\b|"
        r"\b(?:forwarded(?:\s+many\s+times)?|delete\s+for\s+(?:everyone|me)|this\s+message\s+was\s+deleted)\b|"
        r"\b(?:voice\s+message|voice\s+call|video\s+call|missed\s+(?:voice|video)\s+call)\b|"
        r"\b(?:whatsapp|telegram|signal\s+app|wechat|viber)\b|"
        r"(?:✓✓|✔✔|✓|✔)\s*\d{1,2}:\d{2}\s*(?:am|pm)?|"
        r"\b\d{1,2}:\d{2}\s*(?:am|pm)\s*(?:✓✓|✔✔|✓|✔)"
        r")",
        re.I
    )),

    # 2. Contact List & Chat Overview Screenshots
    ("CONTACT_LIST_INTERFACE", re.compile(
        r"(?:"
        r"\b(?:search\s+or\s+start\s+new\s+chat|search\s+chats|frequently\s+contacted|recent\s+chats)\b|"
        r"\b(?:new\s+group|new\s+broadcast|linked\s+devices|starred\s+messages)\b|"
        r"\b(?:chats\s+updates\s+communities\s+calls|all\s+unread\s+favourites\s+groups)\b"
        r")",
        re.I
    )),

    # 3. Social Media Platforms (Instagram, Facebook, Twitter, X, TikTok, YouTube)
    ("SOCIAL_MEDIA_POST", re.compile(
        r"(?:"
        r"\b(?:followers?\b\s+\d+|\bfollowing\b\s+\d+|\bposts?\b\s+\d+)\b|"
        r"\b(?:instagram|facebook|twitter|x\.com|threads\.net|tiktok|snapchat|reddit)\b|"
        r"\b(?:share\s+story|add\s+to\s+story|reels|explore\s+feed|like\s+comment\s+share)\b|"
        r"\b(?:retweet|quote\s+tweet|who\s+to\s+follow|what(?:'s|\s+is)\s+happening)\b|"
        r"\b(?:subscribed?\b|subscribers?\b|\bviews?\b\s+\d+k?m?\b|thumbs\s+up)"
        r")",
        re.I
    )),

    # 4. Financial, Banking & UPI Screenshots
    ("PAYMENT_AND_BANKING", re.compile(
        r"(?:"
        r"\b(?:google\s+pay|gpay|phonepe|paytm|bhim\s+upi|upi\s+id|upi\s+ref|upi\s+transaction)\b|"
        r"\b(?:payment\s+successful|transaction\s+successful|paid\s+successfully|debited\s+from|credited\s+to)\b|"
        r"\b(?:utr(?:\s+no)?\s*:\s*[A-Za-z0-9]+|bank\s+account\s+balance|available\s+balance)\b|"
        r"\b(?:statement\s+of\s+account|mini\s+statement|account\s+number\s*:\s*x+)\b"
        r")",
        re.I
    )),

    # 5. E-Commerce & Retail Shopping
    ("ECOMMERCE_SHOPPING", re.compile(
        r"(?:"
        r"\b(?:amazon(?:\.in|\.com)?|flipkart|myntra|ajio|meesho)\b|"
        r"\b(?:order\s+(?:placed|confirmed|details|summary)|track\s+(?:order|package)|delivered\s+(?:today|by))\b|"
        r"\b(?:add\s+to\s+cart|buy\s+now|item\s+total|delivery\s+charge|free\s+delivery)\b"
        r")",
        re.I
    )),

    # 6. Food Delivery Apps
    ("FOOD_DELIVERY_APP", re.compile(
        r"(?:"
        r"\b(?:swiggy|zomato|ubereats|blinkit|zepto|instamart)\b|"
        r"\b(?:order\s+delivering\s+to|restaurant\s+partner|delivery\s+partner|cooking\s+instructions)\b"
        r")",
        re.I
    )),

    # 7. Commercial Invoices & Tax Bills
    ("TAX_INVOICE", re.compile(
        r"\b(?:tax\s+invoice|gstin|cgst|sgst|igst|subtotal|invoice\s+(?:no|number)|billing\s+address|shipping\s+address)\b",
        re.I
    )),

    # 8. Utility Bills (Electricity, Water, Telecom)
    ("UTILITY_BILL", re.compile(
        r"\b(?:electricity\s+bill|kwh|meter\s+reading|water\s+bill|broadband\s+plan|telecom\s+bill|due\s+date|consumer\s+no)\b",
        re.I
    )),

    # 9. Commercial Sales & Purchase Orders
    ("COMMERCIAL_SALES", re.compile(
        r"\b(?:purchase\s+order|quotation|terms\s+of\s+payment|commercial\s+invoice|bank\s+transfer\s+receipt|pos\s+terminal)\b",
        re.I
    )),

    # 10. Resumes & Academic CVs
    ("RESUME_CV", re.compile(
        r"\b(?:curriculum\s+vitae|resume|work\s+experience|education\s+history|technical\s+skills|career\s+objective)\b",
        re.I
    )),

    # 11. Real Estate & Rental Deeds
    ("REAL_ESTATE", re.compile(
        r"\b(?:lease\s+agreement|rental\s+agreement|landlord|tenant|property\s+deed|survey\s+number)\b",
        re.I
    )),

    # 12. Marketing Flyers & Commercial Promotions
    ("MARKETING_FLYER", re.compile(
        r"\b(?:special\s+discount|limited\s+time\s+offer|promo\s+code|call\s+now\s+for\s+booking|buy\s+one\s+get\s+one)\b",
        re.I
    )),
]

# Conversational terms used in chat dialog heuristics
CHAT_COLLOQUIAL_TERMS: Set[str] = {
    "hi", "hello", "hey", "ok", "okay", "k", "cool", "thanks", "thank you",
    "see you", "call me", "call you", "good morning", "good night", "good evening",
    "where are you", "how are you", "doing good", "can you send", "will send",
    "haha", "lol", "brb", "ttyl", "yes", "no", "sure", "fine", "yep", "nope",
    "missed call", "voice message", "photo", "sticker"
}

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

# Category Specific Heuristic Patterns
CATEGORY_HEURISTICS: Dict[str, Dict[str, Any]] = {
    "PRESCRIPTION": {
        "strong_patterns": [
            re.compile(r"\b(?:℞|rx\b|rx:)", re.I),
            re.compile(r"\b(?:tab|cap|syp|inj)\.?\s+[A-Za-z0-9\-]+\s+\d+\s*(?:mg|ml|mcg|gm)\b", re.I),
            re.compile(r"\b\d\s*-\s*\d\s*-\s*\d\b"),  # 1-0-1 dosage
            re.compile(r"\b(?:o\.?d\.?|b\.?d\.?|t\.?d\.?s\.?|q\.?i\.?d\.?|s\.?o\.?s\.?|h\.?s\.?)\b", re.I),
            re.compile(r"\b(?:after\s+food|before\s+food|oral|sublingual|for\s+\d+\s+days)\b", re.I),
        ],
        "keywords": {"rx", "tablet", "capsule", "syrup", "injection", "dosage", "dose", "mg", "ml", "od", "bd", "tds", "qid", "sos", "after food", "before food", "duration", "prescribed", "dispense"},
        "required_types": ["prescribing", "dosage_or_medicine"]
    },
    "LAB_REPORT": {
        "strong_patterns": [
            re.compile(r"\b(?:reference\s+(?:range|interval)|biological\s+ref|normal\s+range)\b", re.I),
            re.compile(r"\b(?:specimen|test\s+name|observed\s+value|result\s+units?)\b", re.I),
            re.compile(r"\b(?:pathology|hematology|biochemistry|microbiology|serology)\b", re.I),
            re.compile(r"\b(?:complete\s+blood\s+count|lipid\s+profile|liver\s+function|renal\s+function|thyroid\s+profile|urine\s+routine|hba1c)\b", re.I),
        ],
        "keywords": {"hemoglobin", "wbc", "rbc", "platelet", "glucose", "creatinine", "urea", "bilirubin", "sgot", "sgpt", "cholesterol", "triglycerides", "hba1c", "tsh", "urine", "specimen", "pathology", "cumm", "mg/dl", "g/dl"},
        "required_types": ["investigation_panel", "parameter_or_units"]
    },
    "CLINICAL_DOCUMENT": {
        "strong_patterns": [
            re.compile(r"\b(?:consultation\s+note|clinical\s+encounter|opd\s+record|clinical\s+summary|consultation\s+report)\b", re.I),
            re.compile(r"\b(?:chief\s+complaints?|history\s+of\s+presenting\s+illness|hpi)\b", re.I),
            re.compile(r"\b(?:systemic\s+examination|physical\s+examination|general\s+examination)\b", re.I),
            re.compile(r"\b(?:clinical\s+assessment|plan\s+of\s+treatment|provisional\s+diagnosis)\b", re.I),
        ],
        "keywords": {"consultation", "complaint", "vitals", "examination", "assessment", "treatment", "plan", "doctor", "patient", "clinical", "history"},
        "required_types": ["consultation_context", "clinical_findings"]
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
        "required_types": ["admission_discharge", "hospital_course"]
    },
    "MEDICAL_CERTIFICATE": {
        "strong_patterns": [
            re.compile(r"\b(?:medical\s+certificate|certificate\s+of\s+medical\s+fitness|fitness\s+certificate|sick\s+certificate)\b", re.I),
            re.compile(r"\b(?:this\s+is\s+to\s+certify\s+that|i\s+hereby\s+certify\s+that)\b", re.I),
            re.compile(r"\b(?:unfit\s+for\s+(?:duty|work|school)|fit\s+to\s+resume|suffering\s+from)\b", re.I),
            re.compile(r"\b(?:recommended\s+(?:bed\s+rest|leave|rest)\s+for\s+\d+\s+days)\b", re.I),
        ],
        "keywords": {"certify", "certified", "unfit", "fitness", "leave", "rest", "duty", "suffering from", "medical officer", "signature of doctor"},
        "required_types": ["certification", "medical_leave"]
    },
    "DIAGNOSTIC_REPORT": {
        "strong_patterns": [
            re.compile(r"\b(?:x-?ray|ultrasound|usg|ct\s+scan|computed\s+tomography|mri|magnetic\s+resonance|echocardiogram|ecg)\b", re.I),
            re.compile(r"\b(?:radiology\s+report|imaging\s+report|ultrasonography\s+report)\b", re.I),
            re.compile(r"\b(?:findings\s*:|impression\s*:|conclusion\s*:|technique\s*:)\b", re.I),
            re.compile(r"\b(?:radiologist|sonologist|imaging\s+findings)\b", re.I),
        ],
        "keywords": {"x-ray", "ultrasound", "usg", "ct scan", "mri", "radiology", "imaging", "findings", "impression", "conclusion", "technique", "radiologist", "scan"},
        "required_types": ["modality", "radiology_findings"]
    },
    "OTHER": {
        "strong_patterns": [
            re.compile(r"\b(?:immunization|vaccination|operative\s+note|clinical\s+record|medical\s+record)\b", re.I)
        ],
        "keywords": {"hospital", "clinic", "patient", "medical", "health", "doctor", "clinical", "treatment"},
        "required_types": []
    },
}

CATEGORY_HEURISTICS["IMAGING_REPORT"] = CATEGORY_HEURISTICS["DIAGNOSTIC_REPORT"]
CATEGORY_HEURISTICS["MEDICAL_RECORD"] = CATEGORY_HEURISTICS["CLINICAL_DOCUMENT"]
CATEGORY_HEURISTICS["OTHER_DOCUMENT"] = CATEGORY_HEURISTICS["OTHER"]


class EnterpriseDocumentValidator:
    """
    Authoritative Multi-Stage Document Upload Validation & Healthcare Classification Engine.
    Executes in-memory, deterministic verification before permanent storage in My Health Vault.
    Guarantees non-medical screenshots (messaging, chat, social media, shopping) are rejected.
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
            return (
                False,
                ValidationDecision.REJECTED_INVALID_FILE,
                "Uploaded file is empty (0 bytes).",
                "Please select a valid, non-empty document file."
            )

        if len(content) < 16:
            return (
                False,
                ValidationDecision.REJECTED_INVALID_FILE,
                "File content is too small to be a valid document.",
                "Please upload a complete, readable document."
            )

        # 2. Extension check
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return (
                False,
                ValidationDecision.UNSUPPORTED_DOCUMENT_REJECTED,
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
                ValidationDecision.SECURITY_VALIDATION_FAILED,
                "File security violation: Known malware signature detected (EICAR).",
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

            # Check for embedded script execution vectors in raw PDF stream
            if re.search(rb"/(?:JavaScript|JS|Launch|EmbeddedFiles)\b", content[:8192]):
                return (
                    False,
                    ValidationDecision.SECURITY_VALIDATION_FAILED,
                    "File security violation: Malicious PDF script or launch action detected.",
                    "Active script payloads in PDF documents are blocked for healthcare data safety."
                )

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

        return True, ValidationDecision.MEDICAL_DOCUMENT_ACCEPTED, None, None

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
        return cleaned[:max_chars]

    @classmethod
    def detect_chat_conversation_heuristic(cls, clean_text: str, medical_matches: int) -> bool:
        """
        Secondary heuristic detector for messaging screenshots that may lack platform branding
        but clearly display informal conversational turn-taking, timestamps, and zero clinical context.
        """
        if medical_matches >= 2:
            return False  # Authentic medical documents with timestamps are not chat conversations

        text_lower = clean_text.lower()
        # Find timestamps like 10:15 AM, 09:30 pm, 14:20
        timestamp_matches = len(re.findall(r"\b\d{1,2}:\d{2}\s*(?:am|pm)?\b", text_lower))
        if timestamp_matches == 0:
            return False

        # Count chat colloquialisms
        colloquial_matches = sum(1 for term in CHAT_COLLOQUIAL_TERMS if re.search(rf"\b{re.escape(term)}\b", text_lower))
        return colloquial_matches >= 2

    @classmethod
    def score_healthcare_relevance(
        cls,
        clean_text: str,
        is_mobile_screenshot: bool = False
    ) -> Tuple[float, List[str], Optional[str]]:
        """
        Stage D: Evaluates whether document content belongs to the authentic healthcare domain.
        Returns (relevance_score, matched_medical_terms, irrelevant_marker_detected).
        """
        words = re.findall(r"\b[A-Za-z0-9\-\.]{2,}\b", clean_text.lower())
        if not words:
            return 0.0, [], None

        # 1. Check for negative irrelevant markers (Chat screenshots, social media, shopping, bills, resumes)
        for marker_name, pattern in IRRELEVANT_DOMAIN_MARKERS:
            if pattern.search(clean_text):
                logger.info(f"Healthcare relevance gate: Irrelevant document pattern '{marker_name}' detected.")
                return 0.0, [], marker_name

        # 2. Count distinct medical domain terms
        matched_terms: List[str] = []
        for term in MEDICAL_DOMAIN_TERMS:
            if " " in term:
                if term in clean_text.lower():
                    matched_terms.append(term)
            else:
                if term in words:
                    matched_terms.append(term)

        distinct_matches = len(set(matched_terms))

        # 3. Check chat conversation heuristic for unbranded messaging screenshots
        if cls.detect_chat_conversation_heuristic(clean_text, distinct_matches):
            logger.info("Healthcare relevance gate: Conversational chat heuristic triggered (messaging screenshot).")
            return 0.0, [], "MESSAGING_CHAT_CONVERSATION"

        if distinct_matches == 0:
            return 0.0, [], None

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

            # 1. Strong regex patterns (+0.40 per pattern match)
            for pattern in config.get("strong_patterns", []):
                match = pattern.search(clean_text)
                if match:
                    matched_str = match.group(0)[:40]
                    signals.append(f"pattern:{matched_str}")
                    score += 0.40

            # 2. Category keyword matching (+0.10 per keyword, capped at 6)
            keywords = config.get("keywords", set())
            keyword_matches = [kw for kw in keywords if kw in text_lower]
            for kw in keyword_matches[:6]:
                signals.append(f"kw:{kw}")
                score += 0.10

            category_scores[cat_key] = min(1.0, round(score, 3))
            category_signals[cat_key] = signals

        if not category_scores or max(category_scores.values()) == 0.0:
            return None, 0.0, []

        best_cat = max(category_scores.keys(), key=lambda k: category_scores[k])
        best_score = category_scores[best_cat]

        return best_cat, best_score, category_signals.get(best_cat, [])

    @classmethod
    def evaluate_multipage_pdf(
        cls,
        pages_text: List[str],
        selected_category: str
    ) -> DocumentValidationResult:
        """
        Evaluates each page independently for multipage PDFs.
        Rejects mixed-content uploads containing non-medical pages (e.g. bills, receipts, chats).
        """
        if not pages_text:
            return DocumentValidationResult(
                decision=ValidationDecision.VALIDATION_UNCERTAIN,
                is_accepted=False,
                confidence=0.0,
                selected_category=selected_category,
                reason="PDF contains no extractable text pages.",
                actionable_remedy="Please upload a legible digital PDF or high-resolution document scan.",
                security_checks_passed=True
            )

        # Check each page independently
        for page_num, page_content in enumerate(pages_text, start=1):
            clean_page = cls.sanitize_untrusted_text(page_content)
            relevance, _, irrelevant_marker = cls.score_healthcare_relevance(clean_page)
            if irrelevant_marker:
                return DocumentValidationResult(
                    decision=ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED,
                    is_accepted=False,
                    confidence=0.0,
                    selected_category=selected_category,
                    reason=f"Mixed-content upload rejected: Page {page_num} contains unrelated non-medical content ({irrelevant_marker}).",
                    actionable_remedy="This file does not appear to be a supported medical document. Please upload an authentic medical record (prescription, laboratory report, consultation report or other supported clinical document).",
                    security_checks_passed=True
                )

        combined_text = "\n\n".join(pages_text)
        return cls.evaluate_validation_decision(combined_text, selected_category, is_scanned=False, page_count=len(pages_text))

    @classmethod
    def evaluate_validation_decision(
        cls,
        raw_text: str,
        selected_category: str,
        is_scanned: bool = False,
        is_mobile_screenshot: bool = False,
        page_count: int = 1
    ) -> DocumentValidationResult:
        """
        Deterministic Medical Content Validation Stage BEFORE permanent storage.
        Evaluates OCR signals, domain relevance, category structure, and negative markers.
        Rejects non-medical screenshots, chats, contacts, social media, invoices, and utility bills.
        """
        selected_cat_normalized = selected_category.upper().strip()
        if selected_cat_normalized not in SUPPORTED_CATEGORIES:
            return DocumentValidationResult(
                decision=ValidationDecision.UNSUPPORTED_DOCUMENT_REJECTED,
                is_accepted=False,
                confidence=0.0,
                selected_category=selected_category,
                reason=f"Selected document category '{selected_category}' is not supported by OH-ID workflows.",
                actionable_remedy=f"Please choose from supported categories: {', '.join(sorted(SUPPORTED_CATEGORIES.keys()))}",
                security_checks_passed=True
            )

        # 1. Sanitize OCR text
        clean_text = cls.sanitize_untrusted_text(raw_text)
        words = re.findall(r"\b[A-Za-z0-9\-\.]{2,}\b", clean_text)
        char_count = len(clean_text)
        word_count = len(words)

        # 2. Check Healthcare Domain Relevance & Negative Markers FIRST
        relevance_score, matched_terms, irrelevant_marker = cls.score_healthcare_relevance(clean_text, is_mobile_screenshot)

        # Negative Marker Match -> Definitive Rejection (Section 4)
        if irrelevant_marker:
            return DocumentValidationResult(
                decision=ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED,
                is_accepted=False,
                confidence=0.0,
                selected_category=selected_category,
                relevance_score=0.0,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason=f"Healthcare relevance check failed: Document content appears to be an unrelated screenshot or non-medical document ({irrelevant_marker}).",
                actionable_remedy="This file does not appear to be a supported medical document. Please upload an authentic medical record (prescription, laboratory report, consultation report or other supported clinical document).",
                matched_signals=matched_terms,
                security_checks_passed=True
            )

        # 3. Check readability / OCR confidence threshold
        if word_count < 4 or char_count < 15:
            # Low word count cannot be blindly accepted as medical
            return DocumentValidationResult(
                decision=ValidationDecision.VALIDATION_UNCERTAIN,
                is_accepted=False,
                confidence=0.10,
                selected_category=selected_category,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason="Document contains insufficient readable text or is severely degraded/blank.",
                actionable_remedy="We could not read this document. Please upload a clearer, well-lit scan or digital PDF.",
                security_checks_passed=True
            )

        # 4. Enforce Healthcare Relevance Floor
        # A document with NO clinical terminology cannot be stored as a medical document
        if relevance_score < 0.20:
            return DocumentValidationResult(
                decision=ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED,
                is_accepted=False,
                confidence=relevance_score,
                selected_category=selected_category,
                relevance_score=relevance_score,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason="Healthcare relevance check failed: Content does not contain recognizable clinical, medical, or healthcare terminology.",
                actionable_remedy="This file does not appear to be a supported medical document. Please upload an authentic medical record (prescription, laboratory report, consultation report or other supported clinical document).",
                matched_signals=matched_terms,
                security_checks_passed=True
            )

        # 5. Classify and match category
        detected_cat, cat_confidence, cat_signals = cls.classify_document_category(clean_text, selected_cat_normalized)
        all_matched_signals = matched_terms + cat_signals

        is_category_aligned = False
        if detected_cat:
            if detected_cat == selected_cat_normalized:
                is_category_aligned = True
            elif {detected_cat, selected_cat_normalized} in ({"DIAGNOSTIC_REPORT", "IMAGING_REPORT"}, {"CLINICAL_DOCUMENT", "MEDICAL_RECORD"}):
                is_category_aligned = True

        detected_label = SUPPORTED_CATEGORIES.get(detected_cat or selected_cat_normalized, {}).get("label", selected_category)

        # Case 5A: Category is aligned with strong or moderate signals
        if is_category_aligned and (cat_confidence >= 0.20 or relevance_score >= 0.35):
            return DocumentValidationResult(
                decision=ValidationDecision.MEDICAL_DOCUMENT_ACCEPTED,
                is_accepted=True,
                confidence=round((cat_confidence + relevance_score) / 2.0, 3),
                selected_category=selected_category,
                detected_category=detected_cat or selected_cat_normalized,
                relevance_score=relevance_score,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason=f"Medical content verified and classified as {detected_label}.",
                matched_signals=all_matched_signals,
                security_checks_passed=True
            )

        # Case 5B: Content strongly matches another supported category (auto-correct classification)
        if detected_cat and not is_category_aligned and cat_confidence >= 0.30:
            return DocumentValidationResult(
                decision=ValidationDecision.MEDICAL_DOCUMENT_ACCEPTED,
                is_accepted=True,
                confidence=round((cat_confidence + relevance_score) / 2.0, 3),
                selected_category=selected_category,
                detected_category=detected_cat,
                relevance_score=relevance_score,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason=f"Medical content verified and auto-classified as {detected_label}.",
                matched_signals=all_matched_signals,
                security_checks_passed=True
            )

        # Case 5C: General authentic clinical document (e.g. unfamiliar hospital template with verified medical terms)
        if relevance_score >= 0.30:
            return DocumentValidationResult(
                decision=ValidationDecision.MEDICAL_DOCUMENT_ACCEPTED,
                is_accepted=True,
                confidence=round(relevance_score, 3),
                selected_category=selected_category,
                detected_category=detected_cat or selected_cat_normalized,
                relevance_score=relevance_score,
                ocr_character_count=char_count,
                readable_word_count=word_count,
                reason=f"Medical content verified and accepted as {detected_label}. Stored securely in health vault.",
                matched_signals=all_matched_signals,
                security_checks_passed=True
            )

        # Case 5D: Ambiguous / Borderline content -> VALIDATION_UNCERTAIN
        return DocumentValidationResult(
            decision=ValidationDecision.VALIDATION_UNCERTAIN,
            is_accepted=False,
            confidence=round(relevance_score * 0.5, 3),
            selected_category=selected_category,
            detected_category=detected_cat,
            relevance_score=relevance_score,
            ocr_character_count=char_count,
            readable_word_count=word_count,
            reason="Document content cannot be confidently classified as a supported medical document.",
            actionable_remedy="Please upload a complete, clear medical document containing the doctor's findings, prescription, or laboratory results.",
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
evaluate_multipage_pdf = EnterpriseDocumentValidator.evaluate_multipage_pdf
