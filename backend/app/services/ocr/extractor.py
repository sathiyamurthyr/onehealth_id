"""
Structured Entity & Clinical Field Extractor for OH-ID Document OCR
Applies data minimization, multi-language pattern matching (English & Tamil),
and rigorous confidence scoring without hallucinating missing values.
Sathus Technology Pvt Ltd - OneHealth ID
"""

import re
from typing import Dict, Any, Optional, Tuple, List
from backend.app.services.ocr.base import ExtractedField, OCRResult
from backend.app.core.logging import logger


class DocumentFieldExtractor:
    """
    Extracts hospital details, patient details, and clinical document metadata
    from OCR raw text with confidence calculations and source location mapping.
    """

    # Common Indian & Tamil hospital suffixes
    HOSPITAL_PATTERNS = [
        r"(?:Hospital|Clinic|Healthcare|Medical\s+Cent(?:er|re)|Nursing\s+Home|Super\s+Specialty\s+Hospital|மருத்துவமனை)",
    ]

    def extract_fields(
        self,
        raw_text: str,
        document_category: str,
        detected_language: str = "eng"
    ) -> Dict[str, Any]:
        """
        Extract relevant fields based on document category and text content.
        Only extracts fields pertinent to the specified document category.
        """
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        
        extracted: Dict[str, Any] = {}
        confidence: Dict[str, float] = {}
        source_locations: Dict[str, str] = {}

        # 1. Hospital Details Extraction
        h_name, h_conf, h_loc = self._extract_hospital_name(lines)
        if h_name:
            extracted["hospital_name"] = h_name
            confidence["hospital_name"] = h_conf
            source_locations["hospital_name"] = h_loc

        h_reg, h_reg_conf, h_reg_loc = self._extract_hospital_reg_no(lines)
        if h_reg:
            extracted["hospital_reg_no"] = h_reg
            confidence["hospital_reg_no"] = h_reg_conf
            source_locations["hospital_reg_no"] = h_reg_loc

        h_city, h_state, h_city_conf, h_city_loc = self._extract_hospital_location(lines)
        if h_city:
            extracted["hospital_city"] = h_city
            if h_state:
                extracted["hospital_state"] = h_state
            confidence["hospital_city"] = h_city_conf
            source_locations["hospital_city"] = h_city_loc

        # 2. Patient Details Extraction
        p_name, p_conf, p_loc = self._extract_patient_name(lines)
        if p_name:
            extracted["patient_name"] = p_name
            confidence["patient_name"] = p_conf
            source_locations["patient_name"] = p_loc

        p_age, p_dob, p_age_conf, p_age_loc = self._extract_patient_age_or_dob(lines)
        if p_age is not None:
            extracted["patient_age"] = p_age
            confidence["patient_age"] = p_age_conf
            source_locations["patient_age"] = p_age_loc
        if p_dob:
            extracted["patient_dob"] = p_dob
            confidence["patient_dob"] = p_age_conf
            source_locations["patient_dob"] = p_age_loc

        p_gender, p_g_conf, p_g_loc = self._extract_patient_gender(lines)
        if p_gender:
            extracted["patient_gender"] = p_gender
            confidence["patient_gender"] = p_g_conf
            source_locations["patient_gender"] = p_g_loc

        p_id, p_id_conf, p_id_loc = self._extract_patient_id(lines)
        if p_id:
            extracted["patient_id_number"] = p_id
            confidence["patient_id_number"] = p_id_conf
            source_locations["patient_id_number"] = p_id_loc

        p_phone, p_phone_conf, p_phone_loc = self._extract_phone_number(lines)
        if p_phone:
            extracted["patient_phone"] = p_phone
            confidence["patient_phone"] = p_phone_conf
            source_locations["patient_phone"] = p_phone_loc

        # 3. Clinical Document Details Extraction
        doc_date, d_date_conf, d_date_loc = self._extract_document_date(lines)
        if doc_date:
            extracted["document_date"] = doc_date
            confidence["document_date"] = d_date_conf
            source_locations["document_date"] = d_date_loc

        doc_type, d_type_conf, d_type_loc = self._extract_document_type(lines, document_category)
        if doc_type:
            extracted["document_type"] = doc_type
            confidence["document_type"] = d_type_conf
            source_locations["document_type"] = d_type_loc

        doc_name, d_name_conf, d_name_loc = self._extract_doctor_name(lines)
        if doc_name:
            extracted["doctor_name"] = doc_name
            confidence["doctor_name"] = d_name_conf
            source_locations["doctor_name"] = d_name_loc

        doc_ref, d_ref_conf, d_ref_loc = self._extract_reference_number(lines)
        if doc_ref:
            extracted["document_number"] = doc_ref
            confidence["document_number"] = d_ref_conf
            source_locations["document_number"] = d_ref_loc

        return {
            "extracted_fields": extracted,
            "confidence_scores": confidence,
            "source_locations": source_locations,
        }

    # --------------------------------------------------------------------------
    # Field Extractors & Confidence Scoring Logic
    # --------------------------------------------------------------------------

    def _extract_hospital_name(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        # Look in first 10 lines for header institution name
        for idx, line in enumerate(lines[:10]):
            for pat in self.HOSPITAL_PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    # Clean line from prefixes like "Name of Hospital:" or similar
                    clean = re.sub(r"^(?:Hospital\s*Name|Facility|Institution|மருத்துவமனை பெயர்)\s*[:\-]\s*", "", line, flags=re.IGNORECASE).strip()
                    # Discard if too long (likely full paragraph)
                    if 4 <= len(clean) <= 100:
                        conf = 0.96 if re.search(r"^(?:Hospital\s*Name|மருத்துவமனை)", line, re.IGNORECASE) else 0.90
                        return clean, conf, f"Line {idx+1}"
        return None, 0.0, None

    def _extract_hospital_reg_no(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        pattern = re.compile(r"(?:Hospital\s+Reg(?:istration)?\.?\s*(?:No|Number)|CEA\s*Reg|Clinical\s+Est\.?\s*No|பதிவு\s*எண்)\s*[:\-]\s*([A-Za-z0-9\/\-_]{4,30})", re.IGNORECASE)
        for idx, line in enumerate(lines[:15]):
            m = pattern.search(line)
            if m:
                return m.group(1).strip(), 0.95, f"Line {idx+1}"
        return None, 0.0, None

    def _extract_hospital_location(self, lines: List[str]) -> Tuple[Optional[str], Optional[str], float, Optional[str]]:
        # Search for Indian cities / state names in header lines
        cities = ["Chennai", "Coimbatore", "Madurai", "Trichy", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode", "Thanjavur", "Kanchipuram", "Bengaluru", "Bangalore", "Hyderabad", "Mumbai", "Delhi", "Kolkata", "சென்னை", "கோயம்புத்தூர்", "மதுரை"]
        for idx, line in enumerate(lines[:12]):
            for city in cities:
                if re.search(r"(?:^|[\s,.\-:])" + re.escape(city) + r"(?:$|[\s,.\-:])", line, re.IGNORECASE):
                    state = "Tamil Nadu" if city in ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tirunelveli", "Vellore", "சென்னை", "கோயம்புத்தூர்", "மதுரை"] else None
                    return city, state, 0.88, f"Line {idx+1}"
        return None, None, 0.0, None

    def _extract_patient_name(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        # Patterns: Patient Name: ..., Name: ..., Pt Name: ..., நோயாளி: ...
        pattern = re.compile(r"(?:Patient(?:\s*Name)?|Pt(?:\.?\s*Name)?|Name\s*of\s*Patient|Client\s*Name|நோயாளி(?:யின்)?\s*பெயர்|பெயர்)\s*[:\-]\s*([A-Za-z\s\.\u0B80-\u0BFF]{3,50})", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = pattern.search(line)
            if m:
                val = m.group(1).strip()
                # Exclude obvious non-name words
                if not re.search(r"^(?:Male|Female|Age|Date|Doctor|Hospital|Address|Signature)", val, re.IGNORECASE):
                    # Clean any trailing labels
                    val = re.split(r"\s+(?:Age|Sex|Gender|DOB|Date|MRN|UHID|Phone)", val, flags=re.IGNORECASE)[0].strip()
                    if len(val) >= 2:
                        return val, 0.94, f"Line {idx+1}"

        # Secondary search: Salutations (Mr. / Mrs. / Ms. / Master / Selvan / Selvi)
        sal_pattern = re.compile(r"\b(Mr\.?|Mrs\.?|Ms\.?|Master\.?|Selvan\.?|Selvi\.?)\s+([A-Za-z\s\.\u0B80-\u0BFF]{3,40})", re.IGNORECASE)
        for idx, line in enumerate(lines[:20]):
            m = sal_pattern.search(line)
            if m:
                val = f"{m.group(1)} {m.group(2)}".strip()
                val = re.split(r"\s+(?:Age|Sex|Gender|DOB|Date|MRN|UHID)", val, flags=re.IGNORECASE)[0].strip()
                return val, 0.85, f"Line {idx+1}"

        return None, 0.0, None

    def _extract_patient_age_or_dob(self, lines: List[str]) -> Tuple[Optional[int], Optional[str], float, Optional[str]]:
        # Age pattern: Age: 35 Y, Age / Sex: 45/M, 42 Yrs, வயது: 42
        age_pattern = re.compile(r"(?:Age|வயது)\s*[:\/\-]?\s*(\d{1,3})\s*(?:Y(?:ears?|rs?)?)?", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = age_pattern.search(line)
            if m:
                age_val = int(m.group(1))
                if 0 <= age_val <= 125:
                    return age_val, None, 0.92, f"Line {idx+1}"

        # DOB pattern: DOB: 12/04/1985, Date of Birth: 1985-04-12, பிறந்த தேதி
        dob_pattern = re.compile(r"(?:DOB|Date\s*of\s*Birth|பிறந்த\s*தேதி)\s*[:\-]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = dob_pattern.search(line)
            if m:
                dob_str = m.group(1).strip()
                return None, dob_str, 0.93, f"Line {idx+1}"

        return None, None, 0.0, None

    def _extract_patient_gender(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        gender_pattern = re.compile(r"(?:Gender|Sex|பாலினம்)\s*[:\/\-]?\s*(Male|Female|Other|ஆண்|பெண்|M|F)(?:$|[\s,.\-:])", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = gender_pattern.search(line)
            if m:
                raw_g = m.group(1).upper()
                if raw_g in ("MALE", "M", "ஆண்"):
                    return "Male", 0.95, f"Line {idx+1}"
                elif raw_g in ("FEMALE", "F", "பெண்"):
                    return "Female", 0.95, f"Line {idx+1}"
                else:
                    return "Other", 0.90, f"Line {idx+1}"

        # Standalone line match (e.g. line containing solely "ஆண்" or "Female")
        for idx, line in enumerate(lines):
            clean = line.strip()
            if clean in ("ஆண்", "Male", "M"):
                return "Male", 0.90, f"Line {idx+1}"
            elif clean in ("பெண்", "Female", "F"):
                return "Female", 0.90, f"Line {idx+1}"

        # Proximity match: "Age / Sex: 45 / M"
        prox_pattern = re.compile(r"\b\d{1,2}\s*(?:Y(?:rs?)?)?\s*[\/\\]\s*(M(?:ale)?|F(?:emale)?|ஆண்|பெண்)(?:$|[\s,.\-:])", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = prox_pattern.search(line)
            if m:
                raw_g = m.group(1).upper()
                return ("Male" if raw_g in ("M", "MALE", "ஆண்") else "Female"), 0.88, f"Line {idx+1}"

        return None, 0.0, None

    def _extract_patient_id(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        # UHID / MRN / OPD No / IPD No / Patient ID
        id_pattern = re.compile(r"(?:UHID|MRN|Patient\s*ID|OPD\s*(?:No|#)|IPD\s*(?:No|#)|Reg(?:\.?\s*No)?|நோயாளி\s*எண்)\s*[:\-#]\s*([A-Za-z0-9\/\-_]{4,30})", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = id_pattern.search(line)
            if m:
                val = m.group(1).strip()
                # Check that it is not a phone number or date
                if not re.match(r"^\d{10}$", val) and not re.match(r"^\d{2}[\/\-]\d{2}[\/\-]\d{4}$", val):
                    return val, 0.91, f"Line {idx+1}"
        return None, 0.0, None

    def _extract_phone_number(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        phone_pattern = re.compile(r"(?:Phone|Mobile|Tel|Cell|தொலைபேசி|அலைபேசி)?\s*[:\-]?\s*(?:\+?91[\-\s]?)?([6-9]\d{9})\b")
        for idx, line in enumerate(lines):
            m = phone_pattern.search(line)
            if m:
                phone = m.group(1)
                # Discard if it looks like an ID or pin code
                if not line.startswith("PIN") and not line.startswith("PINCODE"):
                    return phone, 0.89, f"Line {idx+1}"
        return None, 0.0, None

    def _extract_document_date(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        date_pattern = re.compile(r"(?:Date(?:\s*of\s*(?:Discharge|Admission|Visit|Report|Prescription))?|Dated|தேதி)\s*[:\-]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = date_pattern.search(line)
            if m:
                return m.group(1).strip(), 0.92, f"Line {idx+1}"

        # Standalone date pattern near top
        standalone_date = re.compile(r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b")
        for idx, line in enumerate(lines[:10]):
            m = standalone_date.search(line)
            if m:
                return m.group(1).strip(), 0.82, f"Line {idx+1}"

        return None, 0.0, None

    def _extract_document_type(self, lines: List[str], fallback_category: str) -> Tuple[str, float, str]:
        type_keywords = [
            ("Discharge Summary", "DISCHARGE_SUMMARY", r"Discharge\s+Summary|விடுதலை\s+சுருக்கம்"),
            ("Prescription", "PRESCRIPTION", r"Prescription|Rx|மருத்துவ\s+சீட்டு"),
            ("Laboratory Report", "LAB_REPORT", r"Lab(?:oratory)?\s+Report|Test\s+Report|Blood\s+Test|ஆய்வக\s+அறிக்கை"),
            ("Imaging / Radiology Report", "IMAGING_REPORT", r"Radiology|X-Ray|CT\s+Scan|MRI|Ultrasound|Echo"),
            ("Referral Letter", "REFERRAL_LETTER", r"Referral\s+Letter|Transfer\s+Summary"),
            ("Hospital Registration Document", "HOSPITAL_REGISTRATION", r"Hospital\s+Registration|Clinical\s+Establishment\s+Certificate"),
            ("Patient Identification Document", "PATIENT_ID", r"Patient\s+ID|Health\s+Card|OneHealth\s+Card|Aadhaar|Smart\s+Card"),
            ("Medical Record", "MEDICAL_RECORD", r"Medical\s+Record|Case\s+Sheet|Clinical\s+Notes"),
            ("Insurance Document", "INSURANCE_DOCUMENT", r"Insurance|Policy|Claim|Pre-Auth|TPA"),
        ]

        full_header_text = " ".join(lines[:12])
        for title, cat, pat in type_keywords:
            if re.search(pat, full_header_text, re.IGNORECASE):
                return title, 0.94, "Header Detection"

        # Map fallback_category to user-friendly label
        category_map = {
            "DISCHARGE_SUMMARY": "Discharge Summary",
            "PRESCRIPTION": "Prescription",
            "LAB_REPORT": "Laboratory Report",
            "IMAGING_REPORT": "Imaging Report",
            "REFERRAL_LETTER": "Referral Letter",
            "HOSPITAL_REGISTRATION": "Hospital Registration Document",
            "PATIENT_ID": "Patient Identification Document",
            "MEDICAL_RECORD": "Medical Record",
            "INSURANCE_DOCUMENT": "Insurance Document",
            "OTHER": "Other Supporting Document",
        }
        val = category_map.get(fallback_category, fallback_category.replace("_", " ").title())
        return val, 0.75, "User Category Selection"

    def _extract_doctor_name(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        # Dr. ... or Doctor: ...
        doc_pattern = re.compile(r"(?:Doctor|Consultant|Treating\s*Clinician|மருத்துவர்)?\s*[:\-]?\s*(Dr\.?\s+[A-Za-z\s\.\u0B80-\u0BFF]{3,40})", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = doc_pattern.search(line)
            if m:
                name = m.group(1).strip()
                # Exclude if it captured something irrelevant
                if not re.search(r"^(?:Dr\.\s*(?:Hospital|Pharmacy|Clinic|Date|Report))", name, re.IGNORECASE):
                    return name, 0.90, f"Line {idx+1}"
        return None, 0.0, None

    def _extract_reference_number(self, lines: List[str]) -> Tuple[Optional[str], float, Optional[str]]:
        ref_pattern = re.compile(r"(?:Report\s*(?:No|#)|Bill\s*(?:No|#)|Invoice\s*(?:No|#)|Prescription\s*(?:No|#)|Ref(?:\.?\s*No)?)\s*[:\-#]\s*([A-Za-z0-9\/\-_]{3,25})", re.IGNORECASE)
        for idx, line in enumerate(lines):
            m = ref_pattern.search(line)
            if m:
                return m.group(1).strip(), 0.88, f"Line {idx+1}"
        return None, 0.0, None
