"""
ONEHEALTH ID (OH-ID) — Integration Boundary
Defines the abstract interface for Hospital Information Systems (HIS / LIS / EHR).
OH-ID acts as a non-invasive Patient Identity and Queue Workflow layer on top of
existing hospital systems, without vendor lock-in or replacing existing systems.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class HospitalSystemAdapter(ABC):
    """
    Abstract boundary for integrating OH-ID with any external Hospital Information System (HIS).
    Implementations translate OH-ID domain events and queries into vendor-specific API/HL7/FHIR calls.
    """

    @abstractmethod
    def find_patient(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for existing patient records in the hospital's existing HIS.
        Criteria may include mobile number, name, DOB, or national identity ref.
        """
        pass

    @abstractmethod
    def create_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Push newly registered patient identity into the existing HIS if sync is enabled.
        """
        pass

    @abstractmethod
    def get_appointment(self, appointment_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch appointment status and schedule details from the external HIS.
        """
        pass

    @abstractmethod
    def create_appointment(self, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync an appointment booked through OH-ID into the external HIS schedule.
        """
        pass

    @abstractmethod
    def update_patient(self, patient_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update demographic or contact changes into the external HIS.
        """
        pass

    @abstractmethod
    def sync_clinical_encounter(self, encounter_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optionally push consultation notes, vitals, or diagnosis summary to HIS EMR.
        """
        pass
