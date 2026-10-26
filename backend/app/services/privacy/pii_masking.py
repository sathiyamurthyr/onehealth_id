"""
Enterprise PII Masking and Controlled Demographic Privacy Service
Enforces deterministic, backend-governed masking for patient names, phones,
identifiers, addresses, emergency contacts, and clinical summaries.
Sathus Technology Pvt Ltd - OneHealth ID Enterprise Security
"""

import re
from typing import Dict, Any, List, Optional, Union

class PIIMaskingService:
    """
    Centralized, backend-enforced PII masking policy engine.
    Ensures that unprivileged, directory, search, list, and summary views
    never serialize or transmit unmasked raw patient identifiers to clients.
    """

    @staticmethod
    def mask_name(name: Optional[str]) -> str:
        """
        Masks patient name while preserving the first letter of each token
        for clinical verification safety.
        Example: 'Rajesh Kumar' -> 'R***** K****', 'Ananya' -> 'A*****'
        """
        if not name or not name.strip():
            return ""

        words = name.strip().split()
        masked_words = []
        for w in words:
            if len(w) <= 1:
                masked_words.append(w)
            elif len(w) == 2:
                masked_words.append(w[0] + "*")
            else:
                masked_words.append(w[0] + "*" * min(5, len(w) - 1))
        return " ".join(masked_words)

    @staticmethod
    def mask_phone(phone: Optional[str]) -> str:
        """
        Masks mobile phone number, keeping only the final 4 digits for verification.
        Example: '9840112233' -> '***-***-2233', '+919840112233' -> '+91 ******2233'
        """
        if not phone or not phone.strip():
            return ""

        clean = re.sub(r'[\s\-()]', '', phone.strip())
        if len(clean) <= 4:
            return "****"

        last_4 = clean[-4:]
        if clean.startswith("+91"):
            return f"+91 ******{last_4}"
        elif clean.startswith("+"):
            country_code = clean[:3]
            return f"{country_code} ******{last_4}"
        else:
            return f"***-***-{last_4}"

    @staticmethod
    def mask_email(email: Optional[str]) -> str:
        """
        Masks email address, showing first and last character of username and full domain.
        Example: 'rajesh.kumar@domain.com' -> 'r**********r@domain.com'
        """
        if not email or "@" not in email:
            return ""

        user_part, domain = email.strip().split("@", 1)
        if len(user_part) <= 2:
            masked_user = "* " * len(user_part)
        else:
            masked_user = user_part[0] + "*" * min(8, len(user_part) - 2) + user_part[-1]
        return f"{masked_user}@{domain}"

    @staticmethod
    def mask_national_id(id_number: Optional[str]) -> str:
        """
        Masks national health ID, Aadhaar, MRN, or Social ID.
        Retains only last 4 alphanumeric characters.
        Example: '1234-5678-9012' -> '********9012'
        """
        if not id_number or not id_number.strip():
            return ""

        clean = re.sub(r'[\s\-]', '', id_number.strip())
        if len(clean) <= 4:
            return "****"
        return "*" * (len(clean) - 4) + clean[-4:]

    @staticmethod
    def mask_address(address: Optional[str], city: Optional[str] = None, state: Optional[str] = None) -> str:
        """
        Masks detailed street address, providing only general municipal/regional context if available.
        Example: '12, 4th Cross St, Anna Nagar, Chennai' -> 'Protected Address, Chennai, Tamil Nadu'
        """
        if not address and not city and not state:
            return "[Protected Demographic]"

        location_parts = []
        if city:
            location_parts.append(city)
        if state:
            location_parts.append(state)

        if location_parts:
            return f"[Protected Address], {', '.join(location_parts)}"
        return "[Protected Demographic Address]"

    @staticmethod
    def mask_emergency_contact(contact: Optional[str]) -> str:
        """Masks emergency contact phone number."""
        if not contact or not contact.strip():
            return "[Protected]"
        return PIIMaskingService.mask_phone(contact)

    @staticmethod
    def mask_diagnosis(diagnosis: Optional[str]) -> str:
        """
        Protects clinical diagnostic information in general directory / non-consultation views.
        """
        if not diagnosis or not diagnosis.strip():
            return "General Outpatient Consultation"
        return "[Protected Health Information - Open Chart for Details]"

    # --------------------------------------------------------------------------
    # Record and List Masking Helpers
    # --------------------------------------------------------------------------

    @classmethod
    def mask_patient_dict(
        cls,
        patient: Dict[str, Any],
        preserve_clinical_details: bool = False
    ) -> Dict[str, Any]:
        """
        Applies masking policy to a patient dictionary record.
        If preserve_clinical_details is True, retains diagnosis (for active doctor OPD).
        """
        if not patient:
            return {}

        masked = dict(patient)

        # Always mask sensitive PII in general views
        if "name" in masked:
            masked["name"] = cls.mask_name(masked.get("name"))
        if "phone" in masked:
            masked["phone"] = cls.mask_phone(masked.get("phone"))
        if "email" in masked:
            masked["email"] = cls.mask_email(masked.get("email"))
        if "address" in masked:
            masked["address"] = cls.mask_address(
                masked.get("address"),
                masked.get("city"),
                masked.get("state")
            )
        if "emergency_contact" in masked:
            masked["emergency_contact"] = cls.mask_emergency_contact(masked.get("emergency_contact"))
        if "identity_number" in masked:
            masked["identity_number"] = cls.mask_national_id(masked.get("identity_number"))

        if not preserve_clinical_details:
            if "diagnosis" in masked:
                masked["diagnosis"] = cls.mask_diagnosis(masked.get("diagnosis"))

        # Explicitly tag as masked so client knows full values require authorized reveal
        masked["is_pii_masked"] = True
        return masked

    @classmethod
    def mask_patient_list(
        cls,
        patients: List[Dict[str, Any]],
        preserve_clinical_details: bool = False
    ) -> List[Dict[str, Any]]:
        """Applies masking policy across a list of patient records."""
        return [cls.mask_patient_dict(p, preserve_clinical_details) for p in patients]

    @classmethod
    def mask_ocr_extracted_fields(cls, fields: Dict[str, Any]) -> Dict[str, Any]:
        """
        Applies privacy masking to extracted fields preview for non-administrative views.
        """
        if not fields:
            return {}
        res = dict(fields)
        if "patient_phone" in res:
            res["patient_phone"] = cls.mask_phone(res["patient_phone"])
        if "patient_address" in res:
            res["patient_address"] = "[Protected Address]"
        if "patient_id_number" in res:
            res["patient_id_number"] = cls.mask_national_id(res["patient_id_number"])
        return res


# Singleton instance
pii_masker = PIIMaskingService()
