import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import get_readonly_cursor

client = TestClient(app)

@pytest.fixture(scope="session")
def test_patient():
    """Fetches an active seeded patient from database."""
    with get_readonly_cursor() as cur:
        cur.execute("SELECT id, onehealth_id, name, phone FROM oh_id.patients LIMIT 1;")
        row = cur.fetchone()
        assert row is not None, "At least one patient must exist in database."
        return dict(row)

def test_01_country_configurations_and_localization():
    """Verify listing, retrieving, and upserting country configurations with regional health schemes."""
    # 1. List active countries
    response = client.get("/api/v1/global/countries")
    assert response.status_code == 200
    countries = response.json()
    assert isinstance(countries, list)
    assert len(countries) >= 5
    
    country_codes = [c["country_code"] for c in countries]
    for code in ["IND", "ARE", "GBR", "SGP", "USA"]:
        assert code in country_codes

    # 2. Get single country details (ARE)
    are_resp = client.get("/api/v1/global/countries/ARE")
    assert are_resp.status_code == 200
    are_data = are_resp.json()
    assert are_data["country_name"] == "United Arab Emirates"
    assert are_data["currency_code"] == "AED"
    assert "Emirates ID" in are_data["national_health_id_name"]

    # 3. Upsert a new country (e.g. Australia - AUS)
    aus_payload = {
        "country_code": "AUS",
        "country_name": "Australia",
        "currency_code": "AUD",
        "currency_symbol": "$",
        "default_timezone": "Australia/Sydney",
        "supported_languages": ["en"],
        "date_format": "DD/MM/YYYY",
        "phone_prefix": "+61",
        "national_health_id_name": "My Health Record / IHI",
        "interop_standard": "FHIR_AU_BASE",
        "data_residency_region": "AUSTRALIA_SOUTHEAST",
        "tax_rate": 10.0,
        "is_active": True
    }
    upsert_resp = client.post("/api/v1/global/countries/upsert", json=aus_payload)
    assert upsert_resp.status_code == 200
    assert upsert_resp.json()["country_code"] == "AUS"

def test_02_global_sovereign_identity_linking_and_lookup(test_patient):
    """Verify linking cross-border international identifiers (Passport, Emirates ID) and looking them up."""
    # 1. Link an Emirates ID
    link_payload = {
        "master_patient_id": test_patient["id"],
        "country_code": "ARE",
        "identifier_type": "EMIRATES_ID",
        "identifier_value": "784-1990-1234567-1",
        "issuing_authority": "Federal Authority for Identity and Citizenship UAE",
        "is_verified": True
    }
    link_resp = client.post("/api/v1/global/identities/link", json=link_payload)
    assert link_resp.status_code == 200
    assert link_resp.json()["identifier_value"] == "784-1990-1234567-1"

    # 2. List identities for patient
    list_resp = client.get(f"/api/v1/global/identities?patient_id={test_patient['id']}")
    assert list_resp.status_code == 200
    identities = list_resp.json()
    assert len(identities) >= 1
    assert any(i["identifier_type"] == "EMIRATES_ID" for i in identities)

    # 3. Lookup patient by global identifier
    lookup_resp = client.get("/api/v1/global/identities/lookup?country_code=ARE&identifier_type=EMIRATES_ID&identifier_value=784-1990-1234567-1")
    assert lookup_resp.status_code == 200
    found = lookup_resp.json()
    assert found["master_patient_id"] == test_patient["id"]
    assert found["patient_name"] == test_patient["name"]

def test_03_developer_apps_and_api_key_lifecycle():
    """Verify registering a developer app, creating hashed API keys, and revocation."""
    # 1. Register a new developer app
    app_payload = {
        "app_name": "HealthPulse AI Assistant",
        "developer_organization": "Pulse Technologies Inc",
        "contact_email": "dev@healthpulse.ai",
        "app_type": "AI_ASSISTANT",
        "allowed_scopes": ["READ_PATIENTS", "READ_CLINICAL", "TELEHEALTH_ACCESS"],
        "sandbox_mode": True,
        "rate_limit_per_minute": 2500,
        "is_active": True
    }
    app_resp = client.post("/api/v1/global/developer/apps/register", json=app_payload)
    assert app_resp.status_code == 200
    app_data = app_resp.json()
    app_id = app_data["id"]
    assert app_data["app_name"] == "HealthPulse AI Assistant"

    # 2. Create an API key
    key_payload = {
        "app_id": app_id,
        "key_name": "Sandbox Primary Key",
        "is_active": True
    }
    key_resp = client.post("/api/v1/global/developer/apps/keys/create", json=key_payload)
    assert key_resp.status_code == 200
    key_data = key_resp.json()
    assert "raw_api_key" in key_data
    assert key_data["key_prefix"].startswith("oh_")
    key_id = key_data["id"]

    # 3. List API keys for the app
    keys_resp = client.get(f"/api/v1/global/developer/apps/{app_id}/keys")
    assert keys_resp.status_code == 200
    keys_list = keys_resp.json()
    assert len(keys_list) >= 1
    assert any(k["id"] == key_id for k in keys_list)

    # 4. Revoke the key
    revoke_resp = client.post(f"/api/v1/global/developer/apps/keys/{key_id}/revoke")
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["is_active"] is False

def test_04_webhook_subscriptions_and_events():
    """Verify subscribing to real-time OH-ID global platform events."""
    payload = {
        "app_id": "app-telemed-pro",
        "target_url": "https://api.telemedpro.global/v1/webhooks/ohid-listener",
        "subscribed_events": ["PATIENT_REGISTERED", "TELEHEALTH_SESSION_STARTED", "RPM_CRITICAL_ALERT"],
        "is_active": True
    }
    sub_resp = client.post("/api/v1/global/developer/webhooks/subscribe", json=payload)
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["target_url"] == "https://api.telemedpro.global/v1/webhooks/ohid-listener"
    assert "RPM_CRITICAL_ALERT" in sub_data["subscribed_events"]

    # List webhooks for app
    list_resp = client.get("/api/v1/global/developer/webhooks?app_id=app-telemed-pro")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

def test_05_telehealth_virtual_consultation_scheduling(test_patient):
    """Verify scheduling a WebRTC video session, generating join links, and updating session status."""
    now = datetime.now(timezone.utc)
    schedule_payload = {
        "patient_id": test_patient["id"],
        "scheduled_start": (now + timedelta(hours=1)).isoformat(),
        "scheduled_end": (now + timedelta(hours=2)).isoformat(),
        "session_status": "SCHEDULED",
        "recording_enabled": True
    }
    sched_resp = client.post("/api/v1/global/telehealth/sessions/schedule", json=schedule_payload)
    assert sched_resp.status_code == 200
    session = sched_resp.json()
    session_id = session["id"]
    assert "room_id" in session
    assert "patient_join_url" in session
    assert "doctor_join_url" in session

    # Update session to IN_PROGRESS
    update_payload = {
        "session_status": "IN_PROGRESS",
        "consultation_notes": "Patient reported mild palpitation during morning walks. Advised continuous ECG monitor."
    }
    update_resp = client.post(f"/api/v1/global/telehealth/sessions/{session_id}/update", json=update_payload)
    assert update_resp.status_code == 200
    updated_session = update_resp.json()
    assert updated_session["session_status"] == "IN_PROGRESS"
    assert "palpitation" in updated_session["consultation_notes"]

def test_06_remote_patient_monitoring_and_wearables(test_patient):
    """Verify ingesting high-frequency IoT wearable metrics and querying telemetry streams."""
    # Ingest Heart Rate observation
    obs_payload = {
        "patient_id": test_patient["id"],
        "device_vendor": "APPLE_HEALTHKIT",
        "device_model": "Apple Watch Series 9",
        "metric_type": "HEART_RATE",
        "metric_value": 118.0,
        "unit": "bpm",
        "is_abnormal": True,
        "critical_alert": False,
        "raw_payload": {"confidence": 0.98, "sensor": "optical_ppg"}
    }
    ingest_resp = client.post("/api/v1/global/wearables/observations/ingest", json=obs_payload)
    assert ingest_resp.status_code == 200
    obs = ingest_resp.json()
    assert obs["metric_type"] == "HEART_RATE"
    assert obs["metric_value"] == 118.0
    assert obs["is_abnormal"] is True

    # List observations
    list_resp = client.get(f"/api/v1/global/wearables/observations/{test_patient['id']}?metric_type=HEART_RATE")
    assert list_resp.status_code == 200
    observations = list_resp.json()
    assert len(observations) >= 1
    assert observations[0]["metric_type"] == "HEART_RATE"

    # Query stream view
    stream_resp = client.get(f"/api/v1/global/wearables/streams?patient_id={test_patient['id']}")
    assert stream_resp.status_code == 200
    streams = stream_resp.json()
    assert isinstance(streams, list)

def test_07_global_payer_network_and_claims_adjudication(test_patient):
    """Verify submitting multi-country insurance claims and performing real-time adjudication."""
    claim_payload = {
        "patient_id": test_patient["id"],
        "country_code": "ARE",
        "payer_identifier": "DAMAN_NATIONAL_HEALTH",
        "policy_number": "DMN-AE-88992211",
        "claim_amount": 1450.00,
        "currency_code": "AED",
        "diagnosis_codes": ["I10", "E11.9"],
        "procedure_codes": ["99214", "80053"],
        "adjudication_status": "SUBMITTED"
    }
    submit_resp = client.post("/api/v1/global/payer/claims/submit", json=claim_payload)
    assert submit_resp.status_code == 200
    claim = submit_resp.json()
    claim_id = claim["id"]
    assert claim["claim_amount"] == 1450.00
    assert claim["currency_code"] == "AED"

    # Adjudicate claim
    adj_payload = {
        "status": "APPROVED",
        "approved_amount": 1380.00,
        "adjudication_notes": "Eligible international specialist consultation and comprehensive metabolic panel approved at agreed tariff."
    }
    adj_resp = client.post(f"/api/v1/global/payer/claims/{claim_id}/adjudicate", json=adj_payload)
    assert adj_resp.status_code == 200
    adjudicated = adj_resp.json()
    assert adjudicated["adjudication_status"] == "APPROVED"
    assert adjudicated["approved_amount"] == 1380.00

def test_08_research_cohorts_and_irb_governance():
    """Verify creating an IRB-approved de-identified research cohort."""
    cohort_payload = {
        "study_title": "Global Longitudinal Diabetes & Cardiovascular Outcomes Trial",
        "lead_institution": "International Medical Research Institute",
        "irb_approval_number": "IRB-GL-2026-8812",
        "inclusion_criteria": {"age_min": 40, "age_max": 75, "diagnosis": ["E11", "I10"]},
        "de_identification_method": "HIPAA_SAFE_HARBOR_K_ANONYMITY",
        "cohort_patient_count": 1250,
        "status": "ACTIVE"
    }
    create_resp = client.post("/api/v1/global/research/cohorts/create", json=cohort_payload)
    assert create_resp.status_code == 200
    cohort = create_resp.json()
    cohort_id = cohort["id"]
    assert cohort["study_title"] == "Global Longitudinal Diabetes & Cardiovascular Outcomes Trial"

    # Get cohort details
    get_resp = client.get(f"/api/v1/global/research/cohorts/{cohort_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["irb_approval_number"] == "IRB-GL-2026-8812"

def test_09_multi_language_localization_dictionaries():
    """Verify localization string retrieval for Tamil, Hindi, Arabic, and upserting strings."""
    # 1. Retrieve Tamil dictionary
    ta_resp = client.get("/api/v1/global/localization/dictionary/ta")
    assert ta_resp.status_code == 200
    ta_dict = ta_resp.json()
    assert "header.network_title" in ta_dict

    # 2. Retrieve Arabic dictionary
    ar_resp = client.get("/api/v1/global/localization/dictionary/ar")
    assert ar_resp.status_code == 200
    ar_dict = ar_resp.json()
    assert "header.network_title" in ar_dict

    # 3. Upsert a French localization string
    fr_payload = {
        "language_code": "fr",
        "resource_key": "header.network_title",
        "resource_value": "Plateforme Mondiale de Santé OneHealth ID",
        "category": "COMMON"
    }
    fr_resp = client.post("/api/v1/global/localization/entries/upsert", json=fr_payload)
    assert fr_resp.status_code == 200
    assert fr_resp.json()["resource_value"] == "Plateforme Mondiale de Santé OneHealth ID"

def test_10_global_platform_master_telemetry():
    """Verify the global telemetry dashboard aggregated metrics."""
    resp = client.get("/api/v1/global/telemetry")
    assert resp.status_code == 200
    telemetry = resp.json()
    assert "active_countries" in telemetry
    assert "connected_apps" in telemetry
    assert "total_wearable_records" in telemetry
    assert "total_claims_submitted" in telemetry
    assert telemetry["active_countries"] >= 5
