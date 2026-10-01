"""
ONEHEALTH ID (OH-ID) — Integration Registry & Factory
"""

import os
from backend.integrations.base import HospitalSystemAdapter
from backend.integrations.mock_his import MockHospitalSystemAdapter

_current_adapter: HospitalSystemAdapter = None

def get_hospital_system_adapter() -> HospitalSystemAdapter:
    """
    Returns the configured HIS adapter. Defaults to MockHospitalSystemAdapter in testing/pilot mode
    until Kedar Hospital confirms their vendor-specific HIS connection details.
    """
    global _current_adapter
    if _current_adapter is None:
        adapter_type = os.getenv("HIS_ADAPTER_TYPE", "MOCK")
        if adapter_type == "MOCK":
            _current_adapter = MockHospitalSystemAdapter()
        else:
            # Future real adapters (e.g. MedSys, KareXpert, HL7 FHIR)
            _current_adapter = MockHospitalSystemAdapter()
    return _current_adapter
