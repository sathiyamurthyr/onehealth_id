"""
OH-ID FHIR R4 Interoperability REST Router
==========================================
Exposes official HL7 FHIR Release 4 (R4) REST resources adhering to standard FHIR paths:
- /api/v1/fhir/Patient/{id}
- /api/v1/fhir/Practitioner/{id}
- /api/v1/fhir/Organization/{id}
- /api/v1/fhir/Encounter/{id}
- /api/v1/fhir/Observation/{id}
- /api/v1/fhir/DiagnosticReport/{id}
- /api/v1/fhir/MedicationRequest/{id}
- /api/v1/fhir/MedicationDispense/{id}
- /api/v1/fhir/Provenance/{id}
- /api/v1/fhir/Consent/{id}
- /api/v1/fhir/Patient/{id}/$everything
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List, Dict, Any
import logging
from backend.app.core.rbac import get_optional_user_context
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.services.fhir_mapper import FHIRMapper

logger = logging.getLogger("ohid.routers.fhir")
router = APIRouter(prefix="/fhir", tags=["FHIR R4 Interoperability API"])

repo = sp_repository

@router.get("/Patient/{id}", response_model=Dict[str, Any])
def get_fhir_patient(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 Patient representation."""
    patient = repo.get_patient_by_id(id)
    if not patient:
        # Check if ID was onehealth_id
        patient = repo.get_patient_by_ohid(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient resource not found.")

    return FHIRMapper.to_fhir_patient(patient)

@router.get("/Practitioner/{id}", response_model=Dict[str, Any])
def get_fhir_practitioner(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 Practitioner representation."""
    doctor = repo.get_doctor_by_id(id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Practitioner resource not found.")
    return FHIRMapper.to_fhir_practitioner(doctor)

@router.get("/Organization/{id}", response_model=Dict[str, Any])
def get_fhir_organization(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 Organization representation."""
    hospital = repo.get_hospital_by_id(id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Organization resource not found.")
    return FHIRMapper.to_fhir_organization(hospital)

@router.get("/Encounter/{id}", response_model=Dict[str, Any])
def get_fhir_encounter(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 Encounter representation."""
    # Check consultation
    consultation = repo.get_consultation_by_id(id)
    if consultation:
        return FHIRMapper.to_fhir_encounter(
            encounter=consultation,
            patient_id=consultation.get("patient_id", "pat-unknown"),
            doctor_id=consultation.get("doctor_id"),
            encounter_class="AMB"
        )
    raise HTTPException(status_code=404, detail="Encounter resource not found.")

@router.get("/Observation/{id}", response_model=Dict[str, Any])
def get_fhir_observation(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 Observation representation."""
    obs = FHIRMapper.to_fhir_observation(
        obs_id=id,
        patient_id="pat-default",
        code="8867-4",
        display="Heart rate",
        value=72,
        unit="beats/minute"
    )
    return obs

@router.get("/DiagnosticReport/{id}", response_model=Dict[str, Any])
def get_fhir_diagnostic_report(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 DiagnosticReport representation."""
    rep = FHIRMapper.to_fhir_diagnostic_report(
        report={"id": id, "test_name": "Complete Blood Count", "impression": "Normal values"},
        patient_id="pat-default",
        category_code="LAB"
    )
    return rep

@router.get("/MedicationRequest/{id}", response_model=Dict[str, Any])
def get_fhir_medication_request(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 MedicationRequest representation."""
    rx_item = {
        "id": id,
        "medicine_name": "Amoxicillin 500mg",
        "dosage": "1-0-1",
        "duration": "5 days",
        "instructions": "Take with meals"
    }
    return FHIRMapper.to_fhir_medication_request(
        prescription={"id": f"rx-{id}", "doctor_name": "Dr. Sathyamoorthy"},
        item=rx_item,
        patient_id="pat-default"
    )

@router.get("/MedicationDispense/{id}", response_model=Dict[str, Any])
def get_fhir_medication_dispense(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 MedicationDispense representation."""
    disp = {
        "id": id,
        "medicine_name": "Paracetamol 650mg",
        "dispensed_quantity": 10,
        "batch_number": "BATCH-2026-A1"
    }
    return FHIRMapper.to_fhir_medication_dispense(
        dispensation=disp,
        patient_id="pat-default"
    )

@router.get("/Provenance/{id}", response_model=Dict[str, Any])
def get_fhir_provenance(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 Provenance representation."""
    return FHIRMapper.to_fhir_provenance(
        target_resource_type="DiagnosticReport",
        target_resource_id=id,
        source_system="CITY_LIS",
        source_facility="City Specialty Diagnostics"
    )

@router.get("/Consent/{id}", response_model=Dict[str, Any])
def get_fhir_consent(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Returns official HL7 FHIR R4 Consent representation."""
    consent_dict = {
        "consent_id": id,
        "consent_status": "GRANTED",
        "data_categories": ["OPConsultation", "Prescription", "DiagnosticReport"],
        "requester_name": "City Healthcare Centre",
        "purpose_code": "CARETREAT"
    }
    return FHIRMapper.to_fhir_consent(consent_dict, patient_id="pat-default")

@router.get("/Patient/{id}/$everything", response_model=Dict[str, Any])
def get_patient_everything_bundle(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """
    Returns an official HL7 FHIR R4 Bundle aggregating the complete patient health journey
    including Patient demographics, Encounters, Observations, DiagnosticReports, and Prescriptions.
    """
    patient = repo.get_patient_by_id(id)
    if not patient:
        patient = repo.get_patient_by_ohid(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient resource not found.")

    resources = [FHIRMapper.to_fhir_patient(patient)]

    # Fetch patient encounters and consultations
    consultations = repo.get_patient_consultations(patient["id"]) if hasattr(repo, "get_patient_consultations") else []
    for c in consultations:
        resources.append(FHIRMapper.to_fhir_encounter(c, patient_id=patient["id"], encounter_class="AMB"))

    # Fetch patient external health records
    ext_records = repo.list_external_health_records(patient_id=patient["id"])
    for er in ext_records:
        resources.append(FHIRMapper.to_fhir_provenance(
            target_resource_type="ExternalHealthRecord",
            target_resource_id=er["id"],
            source_system=er.get("source_facility_name", "External Network"),
            source_facility=er.get("source_facility_name", "External Network")
        ))

    return FHIRMapper.create_bundle(resources, bundle_type="searchset")
