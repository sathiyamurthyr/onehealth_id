"""
ONEHEALTH ID (OH-ID) — Mock HIS Adapter for Automated Testing & Staging
This adapter is activated ONLY in development/testing environments when an external HIS is not connected.
It implements the HospitalSystemAdapter boundary without faking real production data.
"""

from typing import Dict, Any, List, Optional
from backend.integrations.base import HospitalSystemAdapter


class MockHospitalSystemAdapter(HospitalSystemAdapter):
    """
    Mock HIS implementation for unit, integration, and E2E testing environments.
    """

    def __init__(self):
        self._patients: List[Dict[str, Any]] = []
        self._appointments: List[Dict[str, Any]] = []
        self._encounters: List[Dict[str, Any]] = []

    def find_patient(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        phone = criteria.get("phone")
        email = criteria.get("email")
        name = criteria.get("name")
        results = []
        for p in self._patients:
            if phone and p.get("phone") == phone:
                results.append(p)
            elif email and p.get("email") == email:
                results.append(p)
            elif name and name.lower() in p.get("name", "").lower():
                results.append(p)
        return results

    def create_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        his_record = {
            "his_patient_id": f"HIS-EXT-{len(self._patients) + 1:04d}",
            "sync_status": "SYNCHRONIZED",
            **patient_data
        }
        self._patients.append(his_record)
        return his_record

    def get_appointment(self, appointment_id: str) -> Optional[Dict[str, Any]]:
        for a in self._appointments:
            if a.get("id") == appointment_id:
                return a
        return None

    def create_appointment(self, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        his_appt = {
            "his_appointment_id": f"HIS-APPT-{len(self._appointments) + 1:04d}",
            "sync_status": "SYNCHRONIZED",
            **appointment_data
        }
        self._appointments.append(his_appt)
        return his_appt

    def update_patient(self, patient_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        for p in self._patients:
            if p.get("id") == patient_id or p.get("his_patient_id") == patient_id:
                p.update(update_data)
                return p
        return {"status": "NOT_FOUND", "patient_id": patient_id}

    def sync_clinical_encounter(self, encounter_data: Dict[str, Any]) -> Dict[str, Any]:
        record = {
            "his_encounter_id": f"HIS-ENC-{len(self._encounters) + 1:04d}",
            "synced_at": "2026-10-01T00:00:00Z",
            **encounter_data
        }
        self._encounters.append(record)
        return record
