from fastapi import APIRouter, HTTPException, Depends, status, Query, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_permission,
    require_any_permission,
    get_current_user_context,
    validate_hospital_tenant_scope,
)
from backend.app.core.logging import logger, log_security_event

router = APIRouter(tags=["Unified Clinical Document Template Management"])

# --------------------------------------------------------------------------
# Request Schemas
# --------------------------------------------------------------------------

class UpdateHospitalDocumentSettingsRequest(BaseModel):
    rx_template_id: Optional[str] = None
    clinical_report_template_id: Optional[str] = None
    custom_header_text: Optional[str] = None
    custom_footer_notes: Optional[str] = None
    show_hospital_logo: Optional[bool] = True

class TemplateStatusUpdateRequest(BaseModel):
    is_active: bool = Field(..., description="Activate or deactivate template")

# --------------------------------------------------------------------------
# 1. SUPER ADMIN WORKSPACE: TEMPLATE CATALOGUE MANAGEMENT
# --------------------------------------------------------------------------

@router.get(
    "/super-admin/clinical-templates",
    response_model=Dict[str, Any],
    dependencies=[Depends(require_permission("system.manage"))]
)
def super_admin_list_templates(
    document_type: Optional[str] = Query(None, description="PRESCRIPTION or CLINICAL_REPORT"),
    is_active: Optional[bool] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Super Admin view of the 20-template catalogue across both libraries:
    Prescriptions (10) and Clinical Consultation Reports (10).
    Includes hospital adoption statistics.
    """
    templates = sp_repository.list_clinical_document_templates(
        document_type=document_type,
        is_active=is_active
    )
    usage_stats = sp_repository.get_hospital_template_usage_stats()

    # Partition by library
    rx_templates = [t for t in templates if t.get("document_type") == "PRESCRIPTION"]
    rep_templates = [t for t in templates if t.get("document_type") == "CLINICAL_REPORT"]

    return {
        "total_templates": len(templates),
        "prescription_templates_count": len(rx_templates),
        "clinical_report_templates_count": len(rep_templates),
        "templates": templates,
        "prescription_templates": rx_templates,
        "clinical_report_templates": rep_templates,
        "usage_stats": usage_stats
    }

@router.get(
    "/super-admin/clinical-templates/{template_id}",
    response_model=Dict[str, Any],
    dependencies=[Depends(require_permission("system.manage"))]
)
def super_admin_get_template(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Retrieves full template layout configuration and metadata."""
    tmpl = sp_repository.get_clinical_document_template_by_id(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")
    return tmpl

@router.post(
    "/super-admin/clinical-templates/{template_id}/status",
    response_model=Dict[str, Any],
    dependencies=[Depends(require_permission("system.manage"))]
)
def super_admin_toggle_template_status(
    template_id: str,
    payload: TemplateStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Activates or deactivates a template in the global catalogue."""
    try:
        actor_name = current_user.get("name") or current_user.get("username") or "super_admin"
        updated = sp_repository.update_template_status(
            template_id=template_id,
            is_active=payload.is_active,
            updated_by=actor_name
        )
        log_security_event(
            "TEMPLATE_STATUS_UPDATED",
            actor_id=current_user.get("username"),
            resource=f"template:{template_id}",
            status="SUCCESS",
            details={"is_active": payload.is_active}
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update template status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update template status.")

@router.post(
    "/super-admin/clinical-templates/{template_id}/set-default",
    response_model=Dict[str, Any],
    dependencies=[Depends(require_permission("system.manage"))]
)
def super_admin_set_default_template(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Sets a template as the platform default for its respective document type."""
    try:
        actor_name = current_user.get("name") or current_user.get("username") or "super_admin"
        updated = sp_repository.set_default_template(
            template_id=template_id,
            updated_by=actor_name
        )
        log_security_event(
            "TEMPLATE_SET_AS_DEFAULT",
            actor_id=current_user.get("username"),
            resource=f"template:{template_id}",
            status="SUCCESS",
            details={"template_id": template_id, "document_type": updated.get("document_type")}
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to set default template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to set default template.")

@router.post(
    "/super-admin/clinical-templates/{template_id}/version",
    response_model=Dict[str, Any],
    dependencies=[Depends(require_permission("system.manage"))]
)
def super_admin_publish_new_version(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Publishes a new version of the template safely without mutating historical documents."""
    try:
        actor_name = current_user.get("name") or current_user.get("username") or "super_admin"
        updated = sp_repository.publish_template_version(
            template_id=template_id,
            updated_by=actor_name
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to publish template version: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to publish template version.")

# --------------------------------------------------------------------------
# 2. HOSPITAL ADMIN WORKSPACE: FACILITY-LEVEL SELECTION
# --------------------------------------------------------------------------

@router.get(
    "/hospital/document-template-settings",
    response_model=Dict[str, Any]
)
def hospital_get_document_template_settings(
    hospital_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "hospital.update", "hospital.manage", "system.manage"))
):
    """
    Returns the hospital's active selections for both Prescription Template and
    Clinical Consultation Report Template, plus all approved active templates.
    """
    target_hosp = hospital_id or current_user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(current_user, target_hosp)

    settings = sp_repository.get_hospital_document_template_settings(target_hosp)
    active_templates = sp_repository.list_clinical_document_templates(is_active=True)

    rx_options = [t for t in active_templates if t.get("document_type") == "PRESCRIPTION"]
    rep_options = [t for t in active_templates if t.get("document_type") == "CLINICAL_REPORT"]

    return {
        "settings": settings,
        "available_prescription_templates": rx_options,
        "available_clinical_report_templates": rep_options
    }

@router.put(
    "/hospital/document-template-settings",
    response_model=Dict[str, Any]
)
def hospital_update_document_template_settings(
    payload: UpdateHospitalDocumentSettingsRequest,
    hospital_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "hospital.manage", "system.manage"))
):
    """
    Hospital Admin independently selects the preferred Prescription Template and
    Clinical Report Template for their facility.
    Enforces hospital tenant isolation.
    """
    target_hosp = hospital_id or current_user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(current_user, target_hosp)

    actor_name = current_user.get("name") or current_user.get("username") or "hospital_admin"
    try:
        updated = sp_repository.update_hospital_document_template_settings(
            hospital_id=target_hosp,
            rx_template_id=payload.rx_template_id,
            clinical_report_template_id=payload.clinical_report_template_id,
            custom_header_text=payload.custom_header_text,
            custom_footer_notes=payload.custom_footer_notes,
            show_hospital_logo=payload.show_hospital_logo,
            updated_by=actor_name
        )
        log_security_event(
            "HOSPITAL_TEMPLATES_SELECTED",
            actor_id=current_user.get("username"),
            resource=f"hospital:{target_hosp}",
            status="SUCCESS",
            details={
                "rx_template_id": payload.rx_template_id,
                "clinical_report_template_id": payload.clinical_report_template_id
            }
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update hospital template settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update hospital document template settings.")

# --------------------------------------------------------------------------
# 3. DOCTOR WORKSPACE: HYDRATION ENDPOINT
# --------------------------------------------------------------------------

@router.get(
    "/doctor/hospital-document-templates",
    response_model=Dict[str, Any]
)
def doctor_get_hospital_templates(
    hospital_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns active hospital's selected Rx and Clinical Report templates for clinical authoring."""
    target_hosp = hospital_id or current_user.get("hospital_ref_id") or "hosp-kedar"
    settings = sp_repository.get_hospital_document_template_settings(target_hosp)
    return settings

# --------------------------------------------------------------------------
# 4. PATIENT WORKSPACE & REPORT VIEW ENDPOINTS
# --------------------------------------------------------------------------

@router.get(
    "/consultations/{consultation_id}/report",
    response_model=Dict[str, Any]
)
def get_consultation_report(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns full finalized Clinical Consultation Report rendered with its original
    assigned template layout. Enforces patient ownership and hospital scoping.
    """
    report = sp_repository.get_consultation_report_detail(consultation_id)
    if not report:
        raise HTTPException(status_code=404, detail="Clinical consultation report not found.")

    user_perms = current_user.get("permissions") or []
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = current_user.get("user_ref_id") or current_user.get("id")
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, current_user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if report.get("patient_id") != effective_patient_id and report.get("patient_id") != user_ref_id:
            log_security_event("BOLA_ATTEMPT", actor_id=current_user.get("username"), resource=f"consultation:{consultation_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You can only view your own clinical reports.")
    else:
        validate_hospital_tenant_scope(current_user, report.get("hospital_id"))

    return report

@router.get(
    "/consultations/{consultation_id}/print",
    response_model=Dict[str, Any]
)
def get_consultation_print_layout(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns canonical print layout metadata for Clinical Consultation Report."""
    report = sp_repository.get_consultation_report_detail(consultation_id)
    if not report:
        raise HTTPException(status_code=404, detail="Clinical consultation report not found.")
    return {
        "layout": "A4_PORTRAIT",
        "document_type": "CLINICAL_REPORT",
        "report": report
    }

