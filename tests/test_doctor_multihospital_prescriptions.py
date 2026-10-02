import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def dr_kumar_auth():
    """Logs in Dr. Kumar using single identity credentials."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "dr.kumar", "password": "doctor123"}
    )
    assert resp.status_code == 200, f"Dr. Kumar login failed: {resp.text}"
    data = resp.json()
    token = data["access_token"]
    user = data["user"]
    return {
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "user": user
    }

def test_single_doctor_login_identity(dr_kumar_auth):
    """Verify Dr. Kumar has ONE user account / login identity linked to his doctor profile."""
    headers = dr_kumar_auth["headers"]
    me_resp = client.get("/api/v1/me", headers=headers)
    assert me_resp.status_code == 200
    me = me_resp.json()
    assert me["username"] == "dr.kumar"
    assert me["role"] == "DOCTOR"
    assert me["name"] == "Dr. Rajesh Kumar"
    assert me.get("doctor") is not None
    assert me["doctor"]["id"] == "doc-k-kumar"
    assert me["doctor"]["specialty"] == "Orthopedics & Trauma"

def test_authorized_hospitals_list(dr_kumar_auth):
    """Verify Dr. Kumar can retrieve only his authorized hospital and branch memberships."""
    headers = dr_kumar_auth["headers"]
    hosp_resp = client.get("/api/v1/me/hospitals", headers=headers)
    assert hosp_resp.status_code == 200
    hospitals = hosp_resp.json()
    assert len(hospitals) == 2, f"Expected 2 authorized Kedar memberships, got {len(hospitals)}"
    
    hosp_ids = {h["hospital_ref_id"] for h in hospitals}
    assert "hosp-kedar" in hosp_ids, "Mugalivakkam missing"
    assert "hosp-kedar-iyp" in hosp_ids, "Iyyappanthangal missing"



def test_hospital_context_switching_valid(dr_kumar_auth):
    """Verify switching to an authorized branch updates the JWT token and active hospital context."""
    headers = dr_kumar_auth["headers"]
    switch_resp = client.post(
        "/api/v1/me/hospital-context",
        json={"hospital_id": "hosp-kedar-iyp"},
        headers=headers
    )
    assert switch_resp.status_code == 200
    data = switch_resp.json()
    assert data["active_hospital_id"] == "hosp-kedar-iyp"
    assert "access_token" in data

def test_hospital_context_switching_unauthorized_denied(dr_kumar_auth):
    """Verify attempting to switch to an unauthorized hospital is rejected with 403 Forbidden."""
    headers = dr_kumar_auth["headers"]
    switch_resp = client.post(
        "/api/v1/me/hospital-context",
        json={"hospital_id": "hosp-unauthorized-999"},
        headers=headers
    )
    assert switch_resp.status_code == 403
    assert "not authorized" in switch_resp.json()["detail"].lower()

def test_doctor_appointments_scoped_and_all_views(dr_kumar_auth):
    """Verify appointments are scoped to active hospital context and show all when requested."""
    headers = dr_kumar_auth["headers"]
    
    # 1. Scoped to default (hosp-kedar Mugalivakkam)
    appts_resp = client.get("/api/v1/doctors/me/appointments", headers=headers)
    assert appts_resp.status_code == 200
    scoped_appts = appts_resp.json()
    assert len(scoped_appts) == 4
    for a in scoped_appts:
        assert a["hospital_id"] == "hosp-kedar"

    # 2. Aggregated all hospitals view
    all_appts_resp = client.get("/api/v1/doctors/me/appointments?all_hospitals=true", headers=headers)
    assert all_appts_resp.status_code == 200
    all_appts = all_appts_resp.json()
    assert len(all_appts) == 6

def test_create_prescription_standard_no_pin_required(dr_kumar_auth):
    """Verify prescription creation flow without PIN requirement creates finalized immutable record."""
    headers = dr_kumar_auth["headers"]
    rx_payload = {
        "patient_id": "p-101",
        "hospital_id": "hosp-kedar",
        "diagnosis": "Acute Lumbar Sprain",
        "doctor_notes": "Avoid heavy lifting, core stabilization exercises.",
        "follow_up_days": 7,
        "requires_pin": False,
        "items": [
            {
                "medicine_name": "Paracetamol 650 mg",
                "strength": "650 mg",
                "dosage_form": "Tablet",
                "dose": "1",
                "frequency": "Thrice daily (1-1-1)",
                "duration_days": 5,
                "route": "Oral",
                "food_instruction": "After food",
                "quantity": 15,
                "specific_instructions": "Take after meals"
            },
            {
                "medicine_name": "Thiocolchicoside 4 mg",
                "strength": "4 mg",
                "dosage_form": "Capsule",
                "dose": "1",
                "frequency": "Twice daily (1-0-1)",
                "duration_days": 5,
                "route": "Oral",
                "food_instruction": "After food",
                "quantity": 10
            }
        ]
    }
    
    create_resp = client.post("/api/v1/prescriptions", json=rx_payload, headers=headers)
    assert create_resp.status_code == 201, f"Failed: {create_resp.text}"
    rx = create_resp.json()
    assert rx["id"].startswith("RX-2026-")
    assert rx["status"] == "SIGNED"
    assert rx["patient_id"] == "p-101"
    assert rx["doctor_name"] == "Dr. Rajesh Kumar"
    assert rx["requires_pin"] is False
    assert rx["verification_token"].startswith("vtok_")
    assert rx["digital_signature_hash"].startswith("SHA256:")
    assert len(rx["items"]) == 2

    # Get details
    get_resp = client.get(f"/api/v1/prescriptions/{rx['id']}", headers=headers)
    assert get_resp.status_code == 200
    rx_details = get_resp.json()
    assert rx_details["id"] == rx["id"]
    assert len(rx_details["items"]) == 2

    # Verify public QR endpoint
    ver_resp = client.post(
        f"/api/v1/prescriptions/{rx['id']}/verify",
        json={"verification_token": rx["verification_token"]}
    )
    assert ver_resp.status_code == 200
    assert ver_resp.json()["verified"] is True
    assert ver_resp.json()["doctor_name"] == "Dr. Rajesh Kumar"

def test_create_prescription_pin_required_workflow(dr_kumar_auth):
    """Verify PIN verification is enforced ONLY when requires_pin=True."""
    headers = dr_kumar_auth["headers"]
    rx_payload = {
        "patient_id": "p-102",
        "hospital_id": "hosp-kedar",
        "diagnosis": "Post-Fracture Knee Stiffness",
        "requires_pin": True,
        "verification_pin": "wrong-pin",
        "items": [
            {
                "medicine_name": "Aceclofenac + Paracetamol",
                "strength": "100mg/325mg",
                "dosage_form": "Tablet",
                "dose": "1",
                "frequency": "Twice daily (1-0-1)",
                "duration_days": 3,
                "quantity": 6
            }
        ]
    }

    # Wrong PIN fails with 400
    bad_resp = client.post("/api/v1/prescriptions", json=rx_payload, headers=headers)
    assert bad_resp.status_code == 400
    assert "PIN is invalid" in bad_resp.json()["detail"]

    # Correct PIN succeeds with 201
    rx_payload["verification_pin"] = "1234"
    good_resp = client.post("/api/v1/prescriptions", json=rx_payload, headers=headers)
    assert good_resp.status_code == 201
    rx = good_resp.json()
    assert rx["requires_pin"] is True
    assert rx["status"] == "SIGNED"

def test_prescription_print_and_pdf_endpoints(dr_kumar_auth):
    """Verify print layout structure and PDF download metadata."""
    headers = dr_kumar_auth["headers"]
    
    # Create simple prescription to test print & PDF
    create_resp = client.post("/api/v1/prescriptions", json={
        "patient_id": "p-101",
        "diagnosis": "Cervical Spondylosis",
        "requires_pin": False,
        "items": [{"medicine_name": "Pregabalin 75mg", "duration_days": 10, "quantity": 10}]
    }, headers=headers)
    rx_id = create_resp.json()["id"]

    # Print layout
    print_resp = client.get(f"/api/v1/prescriptions/{rx_id}/print", headers=headers)
    assert print_resp.status_code == 200
    print_data = print_resp.json()
    assert print_data["layout"] == "A4_PORTRAIT"
    assert "hospital_name" in print_data["header"]
    assert print_data["prescription"]["id"] == rx_id

    # PDF layout
    pdf_resp = client.get(f"/api/v1/prescriptions/{rx_id}/pdf", headers=headers)
    assert pdf_resp.status_code == 200
    pdf_data = pdf_resp.json()
    assert "download_url" in pdf_data
    assert pdf_data["filename"].endswith(".pdf")

def test_doctor_search_directory_for_referrals(dr_kumar_auth):
    """Verify other doctors are discoverable only via authorized search for clinical referrals."""
    headers = dr_kumar_auth["headers"]
    search_resp = client.get("/api/v1/doctors/search", headers=headers)
    assert search_resp.status_code == 200
    docs = search_resp.json()
    assert len(docs) > 0
    doc_names = [d["name"] for d in docs]
    assert any("Senthil" in n or "Anitha" in n or "House" in n for n in doc_names)
