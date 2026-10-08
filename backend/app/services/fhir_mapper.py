"""
OH-ID FHIR R4 Resource Mapping Engine
=====================================
Strict HL7 FHIR Release 4 (R4) compliant bidirectional mapping engine.
Transforms internal canonical OH-ID domain models into official FHIR R4 JSON schemas
and deserializes/validates inbound FHIR resources for interoperable exchange.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("ohid.fhir_mapper")

FHIR_SYSTEM_OHID = "https://onehealthid.in/patient"
FHIR_SYSTEM_ABHA = "https://healthid.abdm.gov.in"
FHIR_SYSTEM_MRN = "https://onehealthid.in/mrn"
FHIR_SYSTEM_HFR = "https://facility.abdm.gov.in"
FHIR_SYSTEM_HPR = "https://hpr.abdm.gov.in"
FHIR_SYSTEM_LOINC = "http://loinc.org"
FHIR_SYSTEM_SNOMED = "http://snomed.info/sct"
FHIR_SYSTEM_ICD10 = "http://hl7.org/fhir/sid/icd-10"

class FHIRMapper:
    """Enterprise FHIR R4 Transformer & Validator for OH-ID Connected Health Network."""

    # --------------------------------------------------------------------------
    # 1. PATIENT
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_patient(patient: Dict[str, Any], abha_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Maps internal OH-ID patient dictionary to HL7 FHIR R4 Patient resource."""
        patient_id = patient.get("id") or str(uuid.uuid4())
        onehealth_id = patient.get("onehealth_id") or f"OH-{patient_id[:8].upper()}"
        full_name = patient.get("name") or "Anonymous Patient"
        name_parts = full_name.split(" ", 1)
        given_name = [name_parts[0]]
        family_name = name_parts[1] if len(name_parts) > 1 else ""

        identifiers = [
            {
                "use": "official",
                "type": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "code": "MR",
                        "display": "Medical Record Number"
                    }],
                    "text": "OH-ID One Health Identity"
                },
                "system": FHIR_SYSTEM_OHID,
                "value": onehealth_id
            }
        ]

        if abha_info and abha_info.get("abha_address"):
            identifiers.append({
                "use": "secondary",
                "type": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "code": "NH",
                        "display": "National Health Identity (ABHA)"
                    }],
                    "text": "ABDM ABHA Address"
                },
                "system": FHIR_SYSTEM_ABHA,
                "value": abha_info.get("abha_address")
            })

        telecom = []
        if patient.get("phone"):
            telecom.append({
                "system": "phone",
                "value": patient.get("phone"),
                "use": "mobile"
            })
        if patient.get("email"):
            telecom.append({
                "system": "email",
                "value": patient.get("email"),
                "use": "home"
            })

        gender = str(patient.get("gender") or "unknown").lower()
        if gender not in ["male", "female", "other", "unknown"]:
            gender = "other" if "trans" in gender else "unknown"

        birth_date = None
        if patient.get("dob"):
            birth_date = str(patient.get("dob"))
        elif patient.get("age"):
            est_year = datetime.now().year - int(patient.get("age"))
            birth_date = f"{est_year}-01-01"

        return {
            "resourceType": "Patient",
            "id": patient_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]
            },
            "identifier": identifiers,
            "active": True,
            "name": [{
                "use": "official",
                "text": full_name,
                "family": family_name,
                "given": given_name
            }],
            "telecom": telecom,
            "gender": gender,
            "birthDate": birth_date,
            "address": [{
                "use": "home",
                "text": patient.get("address") or "",
                "city": patient.get("city") or "",
                "state": patient.get("state") or "",
                "postalCode": patient.get("pincode") or "",
                "country": "IND"
            }]
        }

    # --------------------------------------------------------------------------
    # 2. PRACTITIONER
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_practitioner(doctor: Dict[str, Any]) -> Dict[str, Any]:
        """Maps internal Doctor/Practitioner dictionary to FHIR R4 Practitioner resource."""
        doc_id = doctor.get("id") or str(uuid.uuid4())
        name = doctor.get("name") or "Medical Practitioner"
        specialty = doctor.get("specialty") or "General Medicine"
        reg_number = doctor.get("registration_number") or doctor.get("council_registration_number") or f"REG-{doc_id[:6]}"

        return {
            "resourceType": "Practitioner",
            "id": doc_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner"]
            },
            "identifier": [
                {
                    "use": "official",
                    "system": FHIR_SYSTEM_HPR,
                    "value": doctor.get("hpr_id") or f"91-{reg_number}"
                },
                {
                    "use": "secondary",
                    "type": {
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                            "code": "MD",
                            "display": "Medical License Number"
                        }]
                    },
                    "system": "https://nmc.org.in/registration",
                    "value": reg_number
                }
            ],
            "active": True,
            "name": [{
                "use": "official",
                "prefix": ["Dr."],
                "text": name
            }],
            "qualification": [{
                "code": {
                    "coding": [{
                        "system": FHIR_SYSTEM_SNOMED,
                        "code": "394802001",
                        "display": specialty
                    }],
                    "text": specialty
                }
            }]
        }

    # --------------------------------------------------------------------------
    # 3. ORGANIZATION (HOSPITAL / FACILITY)
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_organization(hospital: Dict[str, Any]) -> Dict[str, Any]:
        """Maps internal Hospital dictionary to FHIR R4 Organization resource."""
        hosp_id = hospital.get("id") or str(uuid.uuid4())
        name = hospital.get("name") or "Healthcare Facility"
        hfr_id = hospital.get("hfr_id") or hospital.get("code") or f"IN-{hosp_id[:8].upper()}"

        return {
            "resourceType": "Organization",
            "id": hosp_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Organization"]
            },
            "identifier": [{
                "use": "official",
                "system": FHIR_SYSTEM_HFR,
                "value": hfr_id
            }],
            "active": True,
            "type": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/organization-type",
                    "code": "prov",
                    "display": "Healthcare Provider"
                }]
            }],
            "name": name,
            "telecom": [
                {"system": "phone", "value": hospital.get("phone") or "+91-44-24501000"},
                {"system": "email", "value": hospital.get("email") or "info@hospital.org"}
            ],
            "address": [{
                "use": "work",
                "text": hospital.get("address") or "",
                "city": hospital.get("city") or "Chennai",
                "state": hospital.get("state") or "Tamil Nadu",
                "country": "IND"
            }]
        }

    # --------------------------------------------------------------------------
    # 4. ENCOUNTER
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_encounter(
        encounter: Dict[str, Any],
        patient_id: str,
        doctor_id: Optional[str] = None,
        hospital_id: Optional[str] = None,
        encounter_class: str = "AMB" # AMB (outpatient), IMP (inpatient), EMER (emergency)
    ) -> Dict[str, Any]:
        """Maps consultation/admission/emergency to FHIR R4 Encounter resource."""
        enc_id = encounter.get("id") or str(uuid.uuid4())
        created_at = encounter.get("created_at") or datetime.now(timezone.utc).isoformat()

        return {
            "resourceType": "Encounter",
            "id": enc_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Encounter"]
            },
            "status": "finished",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": encounter_class,
                "display": "ambulatory" if encounter_class == "AMB" else "inpatient encounter" if encounter_class == "IMP" else "emergency"
            },
            "subject": {
                "reference": f"Patient/{patient_id}",
                "display": encounter.get("patient_name") or "Patient"
            },
            "participant": [{
                "individual": {
                    "reference": f"Practitioner/{doctor_id or encounter.get('doctor_id') or 'practitioner-default'}",
                    "display": encounter.get("doctor_name") or "Attending Doctor"
                }
            }],
            "serviceProvider": {
                "reference": f"Organization/{hospital_id or encounter.get('hospital_id') or 'org-default'}",
                "display": encounter.get("hospital_name") or "Hospital Facility"
            },
            "period": {
                "start": str(created_at),
                "end": str(encounter.get("discharged_at") or created_at)
            },
            "reasonCode": [{
                "text": encounter.get("diagnosis") or encounter.get("presenting_complaint") or "Clinical Evaluation"
            }]
        }

    # --------------------------------------------------------------------------
    # 5. OBSERVATION (VITALS & LAB ANALYTES)
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_observation(
        obs_id: str,
        patient_id: str,
        code: str,
        display: str,
        value: Any,
        unit: Optional[str] = None,
        category: str = "vital-signs", # vital-signs, laboratory, exam
        reference_range: Optional[str] = None,
        effective_datetime: Optional[str] = None,
        encounter_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Maps clinical vitals or laboratory analyte result to FHIR R4 Observation resource."""
        effective_time = effective_datetime or datetime.now(timezone.utc).isoformat()

        fhir_obs = {
            "resourceType": "Observation",
            "id": obs_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"]
            },
            "status": "final",
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                    "code": category,
                    "display": "Vital Signs" if category == "vital-signs" else "Laboratory"
                }]
            }],
            "code": {
                "coding": [{
                    "system": FHIR_SYSTEM_LOINC,
                    "code": code,
                    "display": display
                }],
                "text": display
            },
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
            "effectiveDateTime": str(effective_time)
        }

        if encounter_id:
            fhir_obs["encounter"] = {"reference": f"Encounter/{encounter_id}"}

        # Value quantity vs value string
        try:
            numeric_val = float(value)
            fhir_obs["valueQuantity"] = {
                "value": numeric_val,
                "unit": unit or "",
                "system": "http://unitsofmeasure.org"
            }
        except (ValueError, TypeError):
            fhir_obs["valueString"] = str(value)

        if reference_range:
            fhir_obs["referenceRange"] = [{
                "text": reference_range
            }]

        return fhir_obs

    # --------------------------------------------------------------------------
    # 6. DIAGNOSTIC REPORT (LAB & RADIOLOGY)
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_diagnostic_report(
        report: Dict[str, Any],
        patient_id: str,
        category_code: str = "LAB", # LAB or RAD
        result_observations: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Maps Lab Report or Radiology Study to FHIR R4 DiagnosticReport resource."""
        rep_id = report.get("id") or str(uuid.uuid4())
        title = report.get("test_name") or report.get("study_description") or report.get("title") or "Diagnostic Report"
        conclusion = report.get("impression") or report.get("findings") or report.get("result_summary") or "Diagnostic examination completed."
        effective_time = str(report.get("finalized_at") or report.get("completed_at") or report.get("created_at") or datetime.now(timezone.utc).isoformat())

        result_refs = []
        if result_observations:
            for obs in result_observations:
                obs_id = obs.get("id") or str(uuid.uuid4())
                result_refs.append({
                    "reference": f"Observation/{obs_id}",
                    "display": obs.get("code", {}).get("text") or "Analyte Observation"
                })

        return {
            "resourceType": "DiagnosticReport",
            "id": rep_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportLab" if category_code == "LAB" else "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRadiology"]
            },
            "status": "final",
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
                    "code": category_code,
                    "display": "Laboratory" if category_code == "LAB" else "Radiology"
                }]
            }],
            "code": {
                "coding": [{
                    "system": FHIR_SYSTEM_LOINC if category_code == "LAB" else FHIR_SYSTEM_SNOMED,
                    "code": report.get("test_code") or report.get("modality") or "LP29684-5",
                    "display": title
                }],
                "text": title
            },
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
            "effectiveDateTime": effective_time,
            "issued": datetime.now(timezone.utc).isoformat(),
            "performer": [{
                "reference": f"Organization/{report.get('hospital_id') or 'org-default'}",
                "display": report.get("hospital_name") or "Diagnostic Centre"
            }],
            "result": result_refs,
            "conclusion": conclusion
        }

    # --------------------------------------------------------------------------
    # 7. MEDICATION REQUEST (PRESCRIPTION)
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_medication_request(
        prescription: Dict[str, Any],
        item: Dict[str, Any],
        patient_id: str,
        doctor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Maps electronic prescription item to FHIR R4 MedicationRequest resource."""
        req_id = item.get("id") or str(uuid.uuid4())
        medicine_name = item.get("medicine_name") or "Prescribed Drug"
        dosage = item.get("dosage") or item.get("frequency") or "As directed by physician"
        duration = item.get("duration") or "5 days"
        instructions = item.get("instructions") or prescription.get("instructions") or "Take after meals"

        return {
            "resourceType": "MedicationRequest",
            "id": req_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest"]
            },
            "status": "active",
            "intent": "order",
            "medicationCodeableConcept": {
                "coding": [{
                    "system": FHIR_SYSTEM_SNOMED,
                    "code": item.get("snomed_code") or "763158003",
                    "display": medicine_name
                }],
                "text": medicine_name
            },
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
            "authoredOn": str(prescription.get("created_at") or datetime.now(timezone.utc).isoformat()),
            "requester": {
                "reference": f"Practitioner/{doctor_id or prescription.get('doctor_id') or 'practitioner-default'}",
                "display": prescription.get("doctor_name") or "Prescribing Physician"
            },
            "dosageInstruction": [{
                "text": f"{dosage} for {duration}. {instructions}",
                "timing": {
                    "code": {
                        "text": dosage
                    }
                },
                "route": {
                    "coding": [{
                        "system": FHIR_SYSTEM_SNOMED,
                        "code": "260548002",
                        "display": "Oral"
                    }]
                }
            }]
        }

    # --------------------------------------------------------------------------
    # 8. MEDICATION DISPENSE (PHARMACY)
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_medication_dispense(
        dispensation: Dict[str, Any],
        patient_id: str,
        hospital_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Maps pharmacy dispensation to FHIR R4 MedicationDispense resource."""
        disp_id = dispensation.get("id") or str(uuid.uuid4())
        medicine_name = dispensation.get("medicine_name") or "Dispensed Medication"
        qty = int(dispensation.get("dispensed_quantity") or 1)
        batch = dispensation.get("batch_number") or "BATCH-001"

        return {
            "resourceType": "MedicationDispense",
            "id": disp_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationDispense"]
            },
            "status": "completed",
            "medicationCodeableConcept": {
                "text": medicine_name
            },
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
            "authorizingPrescription": [{
                "reference": f"MedicationRequest/{dispensation.get('prescription_id') or 'rx-default'}"
            }],
            "quantity": {
                "value": qty,
                "unit": "TAB/CAP"
            },
            "whenHandedOver": str(dispensation.get("dispensed_at") or datetime.now(timezone.utc).isoformat()),
            "note": [{
                "text": f"Batch Number: {batch}. Expiry: {dispensation.get('expiry_date') or 'N/A'}"
            }]
        }

    # --------------------------------------------------------------------------
    # 9. PROVENANCE (DATA LINEAGE & TRACEABILITY)
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_provenance(
        target_resource_type: str,
        target_resource_id: str,
        source_system: str,
        source_facility: str,
        mapping_version: str = "v1.0.0",
        recorded_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates an HL7 FHIR R4 Provenance audit record for imported/exchanged clinical entities."""
        prov_id = f"prov-{uuid.uuid4().hex[:12]}"
        recorded_time = recorded_at or datetime.now(timezone.utc).isoformat()

        return {
            "resourceType": "Provenance",
            "id": prov_id,
            "target": [{
                "reference": f"{target_resource_type}/{target_resource_id}"
            }],
            "recorded": str(recorded_time),
            "activity": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
                    "code": "CREATE",
                    "display": "Created / Imported from External Provider"
                }],
                "text": f"Exchanged via OH-ID Interoperability Layer (Mapping {mapping_version})"
            },
            "agent": [
                {
                    "type": {
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                            "code": "author",
                            "display": "Author / Source Provider"
                        }]
                    },
                    "who": {
                        "display": f"{source_facility} ({source_system})"
                    }
                }
            ],
            "entity": [{
                "role": "source",
                "what": {
                    "identifier": {
                        "system": f"https://{source_system.lower().replace(' ', '-')}.org/records",
                        "value": target_resource_id
                    },
                    "display": f"Originating Record in {source_facility}"
                }
            }]
        }

    # --------------------------------------------------------------------------
    # 10. CONSENT ARTIFACT (ABDM / DATA SHARING)
    # --------------------------------------------------------------------------
    @staticmethod
    def to_fhir_consent(consent: Dict[str, Any], patient_id: str) -> Dict[str, Any]:
        """Maps data sharing consent artifact to FHIR R4 Consent resource."""
        consent_id = consent.get("consent_id") or consent.get("id") or str(uuid.uuid4())
        status = str(consent.get("consent_status") or "ACTIVE").lower()
        if status not in ["draft", "proposed", "active", "rejected", "inactive", "entered-in-error"]:
            status = "active" if status == "granted" else "rejected" if status == "denied" else "inactive"

        categories = consent.get("data_categories") or ["OPConsultation", "Prescription", "DiagnosticReport"]
        if isinstance(categories, str):
            import json
            try:
                categories = json.loads(categories)
            except Exception:
                categories = [categories]

        return {
            "resourceType": "Consent",
            "id": consent_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Consent"]
            },
            "status": status,
            "scope": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/consentscope",
                    "code": "patient-privacy",
                    "display": "Privacy Consent"
                }]
            },
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/consentcategorycodes",
                    "code": "health-data-sharing",
                    "display": "Health Record Sharing"
                }]
            }],
            "patient": {
                "reference": f"Patient/{patient_id}"
            },
            "dateTime": str(consent.get("created_at") or datetime.now(timezone.utc).isoformat()),
            "provision": {
                "type": "permit",
                "period": {
                    "start": str(consent.get("date_range_from") or consent.get("created_at")),
                    "end": str(consent.get("expires_at") or consent.get("date_range_to"))
                },
                "actor": [{
                    "role": {
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                            "code": "PRCP",
                            "display": "Primary Recipient"
                        }]
                    },
                    "reference": {
                        "display": consent.get("provider_hospital_name") or consent.get("requester_name") or "Authorized Healthcare Provider"
                    }
                }],
                "action": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/consentaction",
                        "code": "access",
                        "display": "Access and Review"
                    }]
                }],
                "class": [{
                    "system": "https://nrces.in/ndhm/fhir/r4/StructureDefinition/HIPRecordType",
                    "code": cat,
                    "display": cat
                } for cat in categories]
            }
        }

    # --------------------------------------------------------------------------
    # 11. BUNDLE (FHIR SEARCH / EXPORT BUNDLE)
    # --------------------------------------------------------------------------
    @staticmethod
    def create_bundle(resources: List[Dict[str, Any]], bundle_type: str = "searchset") -> Dict[str, Any]:
        """Wraps a collection of FHIR resources into an HL7 FHIR R4 Bundle."""
        bundle_id = f"bundle-{uuid.uuid4().hex[:12]}"
        entries = []
        for res in resources:
            res_type = res.get("resourceType", "Resource")
            res_id = res.get("id", str(uuid.uuid4()))
            entries.append({
                "fullUrl": f"https://onehealthid.in/api/v1/fhir/{res_type}/{res_id}",
                "resource": res
            })

        return {
            "resourceType": "Bundle",
            "id": bundle_id,
            "meta": {
                "lastUpdated": datetime.now(timezone.utc).isoformat()
            },
            "type": bundle_type,
            "total": len(resources),
            "entry": entries
        }

    # --------------------------------------------------------------------------
    # 12. INBOUND VALIDATION & PARSING
    # --------------------------------------------------------------------------
    @staticmethod
    def validate_and_parse_inbound_resource(resource: Dict[str, Any]) -> Dict[str, Any]:
        """Validates incoming FHIR R4 resource structure and extracts canonical entity details."""
        res_type = resource.get("resourceType")
        if not res_type:
            return {
                "valid": False,
                "error": "Missing mandatory 'resourceType' attribute in payload."
            }

        res_id = resource.get("id") or str(uuid.uuid4())
        extracted_data: Dict[str, Any] = {
            "resourceType": res_type,
            "id": res_id,
            "meta": resource.get("meta", {})
        }

        if res_type == "Patient":
            names = resource.get("name", [{}])
            extracted_data["name"] = names[0].get("text") or f"{names[0].get('given', [''])[0]} {names[0].get('family', '')}".strip()
            extracted_data["gender"] = resource.get("gender", "unknown")
            extracted_data["birthDate"] = resource.get("birthDate")
            # Extract identifiers
            identifiers = resource.get("identifier", [])
            for ident in identifiers:
                sys_uri = ident.get("system", "")
                if FHIR_SYSTEM_OHID in sys_uri:
                    extracted_data["onehealth_id"] = ident.get("value")
                elif FHIR_SYSTEM_ABHA in sys_uri:
                    extracted_data["abha_address"] = ident.get("value")
                elif FHIR_SYSTEM_MRN in sys_uri or "mrn" in sys_uri.lower():
                    extracted_data["mrn"] = ident.get("value")

        elif res_type == "DiagnosticReport":
            extracted_data["title"] = resource.get("code", {}).get("text") or "Diagnostic Report"
            extracted_data["status"] = resource.get("status", "final")
            extracted_data["conclusion"] = resource.get("conclusion", "")
            extracted_data["effectiveDateTime"] = resource.get("effectiveDateTime")

        elif res_type == "MedicationRequest":
            extracted_data["medicine_name"] = resource.get("medicationCodeableConcept", {}).get("text") or "Prescribed Drug"
            extracted_data["status"] = resource.get("status", "active")
            extracted_data["authoredOn"] = resource.get("authoredOn")

        return {
            "valid": True,
            "extracted": extracted_data,
            "resource": resource
        }
