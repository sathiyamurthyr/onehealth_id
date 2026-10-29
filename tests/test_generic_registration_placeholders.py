"""
OneHealth ID (OH-ID) - Generic Registration & Organization Neutralization Regression Test
========================================================================================
Validates that:
1. Organization Registration (/register/facility) strictly uses neutral placeholders:
   - Organization Display Name: "e.g. City Healthcare Centre"
   - Registered Legal Entity Name: "e.g. City Healthcare Services Pvt. Ltd."
   - Ownership Type: Retains valid options (PRIVATE, TRUST, GOVERNMENT, PARTNERSHIP) and default PRIVATE
   - Official Organization Email: "admin@example.org"
2. Modals and generic onboarding flows use neutral examples (City Healthcare Centre, Sunrise Medical Centre).
3. Zero occurrences of organization-specific names (Apollo, Kedar, Fortis) exist in generic frontend/app and frontend/components.
4. Backend fallback defaults are neutral and do not hardcode third-party enterprise names.
"""

import os
import re
import pytest

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))


def test_facility_registration_page_neutral_placeholders():
    """Verify frontend/app/register/facility/page.tsx has exact required neutral placeholders."""
    page_path = os.path.join(FRONTEND_DIR, "app", "register", "facility", "page.tsx")
    assert os.path.isfile(page_path), f"File not found: {page_path}"

    with open(page_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Organization Display Name placeholder
    assert 'placeholder="e.g. City Healthcare Centre"' in content, (
        "Facility registration Organization Display Name placeholder must be 'e.g. City Healthcare Centre'"
    )

    # 2. Registered Legal Entity Name placeholder
    assert 'placeholder="e.g. City Healthcare Services Pvt. Ltd."' in content, (
        "Facility registration Registered Legal Entity Name placeholder must be 'e.g. City Healthcare Services Pvt. Ltd.'"
    )

    # 3. Official Organization Email placeholder
    assert 'placeholder="admin@example.org"' in content, (
        "Facility registration Official Organization Email placeholder must be 'admin@example.org'"
    )

    # 4. Ownership Type options and default
    assert 'const [ownershipType, setOwnershipType] = useState("PRIVATE");' in content, (
        "Ownership type default state must be 'PRIVATE'"
    )
    assert '<option value="PRIVATE">Private / Corporate</option>' in content
    assert '<option value="TRUST">Trust / Non-Profit</option>' in content
    assert '<option value="GOVERNMENT">Government / Public Health</option>' in content
    assert '<option value="PARTNERSHIP">Partnership / Individual</option>' in content

    # 5. Zero occurrences of Apollo or Kedar in registration form
    assert "apollo" not in content.lower(), (
        "No Apollo reference should exist in facility registration page"
    )
    assert "kedar" not in content.lower(), (
        "No Kedar reference should exist in facility registration page"
    )


def test_modals_and_onboarding_neutral_placeholders():
    """Verify modals and generic flows use neutral placeholders."""
    # DocumentExtractionReviewModal
    review_modal = os.path.join(FRONTEND_DIR, "components", "documents", "DocumentExtractionReviewModal.tsx")
    with open(review_modal, "r", encoding="utf-8") as f:
        review_content = f.read()
    assert 'placeholder: "e.g. City Healthcare Centre"' in review_content
    assert "kedar" not in review_content.lower()

    # DoctorUploadExternalDocumentModal
    upload_modal = os.path.join(FRONTEND_DIR, "components", "documents", "DoctorUploadExternalDocumentModal.tsx")
    with open(upload_modal, "r", encoding="utf-8") as f:
        upload_content = f.read()
    assert 'placeholder="e.g. City Diagnostic Laboratory"' in upload_content
    assert "apollo" not in upload_content.lower()

    # PrescriptionShareModal
    share_modal = os.path.join(FRONTEND_DIR, "components", "prescriptions", "PrescriptionShareModal.tsx")
    with open(share_modal, "r", encoding="utf-8") as f:
        share_content = f.read()
    assert 'placeholder="e.g. City Care Pharmacy, Dr. Sharma"' in share_content
    assert "apollo" not in share_content.lower()

    # ForgotPasswordPage
    forgot_page = os.path.join(FRONTEND_DIR, "app", "forgot-password", "page.tsx")
    with open(forgot_page, "r", encoding="utf-8") as f:
        forgot_content = f.read()
    assert 'placeholder="e.g. physician@example.org or patient@example.com"' in forgot_content
    assert "apollo" not in forgot_content.lower()


def test_zero_unintended_organization_names_in_frontend_app():
    """Scan all frontend/app and frontend/components for forbidden generic hospital names."""
    forbidden_terms = ["apollo", "kedar", "fortis"]
    violating_files = []

    for root_dir in [
        os.path.join(FRONTEND_DIR, "app"),
        os.path.join(FRONTEND_DIR, "components"),
    ]:
        for root, _, files in os.walk(root_dir):
            for file in files:
                if file.endswith((".tsx", ".ts", ".jsx", ".js")):
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8") as f:
                        text = f.read().lower()
                    for term in forbidden_terms:
                        if term in text:
                            violating_files.append((file_path, term))

    assert len(violating_files) == 0, (
        f"Found forbidden organization names in frontend: {violating_files}"
    )


def test_backend_defaults_are_neutral():
    """Verify backend fallback defaults do not hardcode Apollo or Kedar names."""
    # sp_views_repository
    repo_path = os.path.join(BACKEND_DIR, "app", "repositories", "sp_views_repository.py")
    with open(repo_path, "r", encoding="utf-8") as f:
        repo_content = f.read()
    assert "Apollo City Hospital" not in repo_content
    assert 'prov_hosp_name = payload.get("provider_hospital_name", "City Healthcare Centre")' in repo_content

    # fhir router
    fhir_path = os.path.join(BACKEND_DIR, "app", "routers", "fhir.py")
    with open(fhir_path, "r", encoding="utf-8") as f:
        fhir_content = f.read()
    assert "APOLLO_LIS" not in fhir_content
    assert "Apollo Specialty Diagnostics" not in fhir_content
    assert "Apollo Hospitals" not in fhir_content
    assert '"requester_name": "City Healthcare Centre"' in fhir_content
