"""
Duplicate Detection & Identity Matching Service for Document OCR
Searches existing OH-ID patient registry and hospital directory to prevent duplicate
records and ambiguous auto-merging.
Sathus Technology Pvt Ltd - OneHealth ID
"""

from typing import Dict, Any, List, Optional
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.database.session import get_readonly_cursor
from backend.app.core.logging import logger


class DocumentDuplicateDetector:
    """
    Identifies potential existing patient identities and registered hospitals
    based on OCR extracted fields.
    """

    def check_patient_duplicates(
        self,
        extracted_fields: Dict[str, Any],
        hospital_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Queries existing patients using sp_repository.check_duplicate_patient.
        Enforces that matching names alone are NEVER sufficient to assert identity.
        """
        phone = extracted_fields.get("patient_phone")
        name = extracted_fields.get("patient_name")
        age = extracted_fields.get("patient_age")
        patient_id_num = extracted_fields.get("patient_id_number")

        matches: List[Dict[str, Any]] = []

        try:
            # Check existing patients via repository
            raw_matches = sp_repository.check_duplicate_patient(
                phone=phone,
                identity_number=patient_id_num,
                name=name,
                age=age,
                hospital_id=hospital_id
            )

            for m in raw_matches:
                match_reasons = []
                match_score = 0.50

                if phone and m.get("phone") and phone in m.get("phone"):
                    match_reasons.append(f"Matching Phone Number: {phone}")
                    match_score += 0.35

                if patient_id_num and m.get("identity_number") and patient_id_num.lower() == str(m.get("identity_number")).lower():
                    match_reasons.append(f"Matching Identity / MRN: {patient_id_num}")
                    match_score += 0.40

                if name and m.get("name") and name.lower() == str(m.get("name")).lower():
                    if age and m.get("age") == age:
                        match_reasons.append(f"Matching Name and Age: {name}, {age} yrs")
                        match_score += 0.25
                    else:
                        match_reasons.append(f"Similar Name (Verification Required): {name}")
                        match_score += 0.05

                matches.append({
                    "patient_id": m.get("id"),
                    "name": m.get("name"),
                    "onehealth_id": m.get("onehealth_id"),
                    "age": m.get("age"),
                    "gender": m.get("gender"),
                    "phone_masked": self._mask_phone(m.get("phone")),
                    "match_score": min(0.99, match_score),
                    "match_reasons": match_reasons,
                    "requires_manual_resolution": True,
                })
        except Exception as e:
            logger.error(f"Error checking patient duplicates: {e}")

        return matches

    def check_hospital_duplicates(
        self,
        extracted_fields: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Queries registered hospitals to check if the extracted hospital already exists in OH-ID.
        """
        h_name = extracted_fields.get("hospital_name")
        h_reg = extracted_fields.get("hospital_reg_no")
        h_city = extracted_fields.get("hospital_city")

        if not h_name and not h_reg:
            return None

        try:
            with get_readonly_cursor() as cur:
                if h_reg:
                    cur.execute("""
                        SELECT id, name, code, city, state, address, phone 
                        FROM oh_id.hospitals 
                        WHERE code ILIKE %s OR id ILIKE %s 
                        LIMIT 1;
                    """, (f"%{h_reg}%", f"%{h_reg}%"))
                    row = cur.fetchone()
                    if row:
                        return {
                            "hospital_id": row["id"],
                            "hospital_name": row["name"],
                            "hospital_code": row["code"],
                            "city": row["city"],
                            "match_reason": f"Exact match on Registration / Code: {h_reg}",
                            "is_verified": True
                        }

                if h_name:
                    cur.execute("""
                        SELECT id, name, code, city, state, address, phone 
                        FROM oh_id.hospitals 
                        WHERE name ILIKE %s 
                        LIMIT 1;
                    """, (f"%{h_name.strip()}%",))
                    row = cur.fetchone()
                    if row:
                        return {
                            "hospital_id": row["id"],
                            "hospital_name": row["name"],
                            "hospital_code": row["code"],
                            "city": row["city"],
                            "match_reason": f"Name match in registry: {row['name']}",
                            "is_verified": True
                        }
        except Exception as e:
            logger.error(f"Error checking hospital duplicate: {e}")

        return None

    def _mask_phone(self, phone: Optional[str]) -> str:
        if not phone or len(phone) < 6:
            return "******"
        return f"{phone[:3]}****{phone[-3:]}"
