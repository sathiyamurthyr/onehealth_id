"""
OH-ID AI Platform: PHI De-Identification & Minimization Engine
Sathus Technology Pvt Ltd
"""

import re
from typing import Dict, Any, Tuple

class PHISanitizer:
    """
    Sanitizes Direct Protected Health Information (PHI) before dispatching prompts to LLMs.
    Reversibly masks names, phone numbers, email addresses, and national identity numbers.
    """
    
    PHONE_REGEX = re.compile(r'\b(?:\+91|91|0)?[6-9]\d{9}\b')
    EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    AADHAAR_REGEX = re.compile(r'\b\d{4}\s?\d{4}\s?\d{4}\b')
    
    @classmethod
    def sanitize(cls, raw_text: str, patient_name: str = "") -> Tuple[str, Dict[str, str]]:
        token_map: Dict[str, str] = {}
        sanitized = raw_text
        
        # 1. Mask Patient Name if provided
        if patient_name and len(patient_name.strip()) > 2:
            name_token = "[PATIENT_NAME]"
            token_map[name_token] = patient_name
            sanitized = re.sub(re.escape(patient_name), name_token, sanitized, flags=re.IGNORECASE)
            
        # 2. Mask Phone Numbers
        for idx, match in enumerate(cls.PHONE_REGEX.findall(sanitized)):
            token = f"[PHONE_TOKEN_{idx+1}]"
            token_map[token] = match
            sanitized = sanitized.replace(match, token)
            
        # 3. Mask Email Addresses
        for idx, match in enumerate(cls.EMAIL_REGEX.findall(sanitized)):
            token = f"[EMAIL_TOKEN_{idx+1}]"
            token_map[token] = match
            sanitized = sanitized.replace(match, token)
            
        # 4. Mask Aadhaar / 12-digit National IDs
        for idx, match in enumerate(cls.AADHAAR_REGEX.findall(sanitized)):
            token = f"[NATIONAL_ID_TOKEN_{idx+1}]"
            token_map[token] = match
            sanitized = sanitized.replace(match, token)
            
        return sanitized, token_map

    @classmethod
    def restore(cls, sanitized_text: str, token_map: Dict[str, str]) -> str:
        restored = sanitized_text
        for token, original in token_map.items():
            restored = restored.replace(token, original)
        return restored
