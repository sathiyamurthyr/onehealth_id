"""
End-to-End Automated Test Suite for Organization Onboarding & Super Admin Approval Workflow.

Validates:
1. Dual OTP Verification (WhatsApp + Email) with cryptographic HMAC-SHA256 hashing.
2. 60-second cooldown rate limiting & 5-attempt brute-force protection.
3. Verification invalidation upon contact detail modification.
4. Registration submission gating (strictly blocked until both channels independently verified).
5. Tracking ID Generation with standard pattern: OHID-ORG-2026-XXXXXXXX.
6. Transactional notification outbox (oh_id.notification_outbox) for all lifecycle events.
7. Super Admin Decision Workflow:
   - ON_HOLD with mandatory reviewer reason & status updates.
   - REJECTED with outbox alert.
   - APPROVED with HOSPITAL_ADMIN user provisioning, role mapping, and 72-hour single-use activation invitation.
8. Account activation via single-use invite token.
9. Security verification: Zero plaintext OTPs or passwords in outbox payloads or databases.
"""

import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import re
import uuid
import random
import pytest
from datetime import datetime, timezone, timedelta

from backend.app.database.session import get_db_cursor
from backend.app.repositories.enterprise_iam_repository import enterprise_iam_repo
from backend.app.services.whatsapp_service import whatsapp_service
from backend.app.services.email_service import email_service


def make_test_contacts():
    suffix = uuid.uuid4().hex[:8]
    mobile = f"98{random.randint(10000000, 99999999)}"
    email = f"test.admin.{suffix}@example.org"
    return suffix, mobile, email


@pytest.fixture(autouse=True)
def clean_test_data():
    """Cleanup fixture for test records."""
    whatsapp_service.clear_test_inbox()
    email_service.clear_test_inbox()
    yield
    whatsapp_service.clear_test_inbox()
    email_service.clear_test_inbox()
    with get_db_cursor() as cur:
        # Delete invitations created during test
        cur.execute("DELETE FROM oh_id.user_invitations WHERE email LIKE 'test.admin.%@example.org';")
        # Delete user roles
        cur.execute("DELETE FROM oh_id.user_roles WHERE user_id IN (SELECT id FROM oh_id.users WHERE email LIKE 'test.admin.%@example.org');")
        # Delete memberships
        cur.execute("""
            DELETE FROM oh_id.hospital_staff_memberships 
            WHERE hospital_id IN (SELECT id FROM oh_id.hospitals WHERE registration_number LIKE 'TEST-REG-%')
               OR user_id IN (SELECT id FROM oh_id.users WHERE email LIKE 'test.admin.%@example.org');
        """)
        # Delete test users referencing the hospitals or created by test
        cur.execute("""
            DELETE FROM oh_id.users 
            WHERE email LIKE 'test.admin.%@example.org' 
               OR hospital_id IN (SELECT id FROM oh_id.hospitals WHERE registration_number LIKE 'TEST-REG-%');
        """)
        # Delete verifications
        cur.execute("DELETE FROM oh_id.hospital_verifications WHERE hospital_id IN (SELECT id FROM oh_id.hospitals WHERE registration_number LIKE 'TEST-REG-%');")
        # Delete hospitals
        cur.execute("DELETE FROM oh_id.hospitals WHERE registration_number LIKE 'TEST-REG-%';")
        # Delete outbox logs for test recipients
        cur.execute("DELETE FROM oh_id.notification_outbox WHERE recipient LIKE '%example.org' OR recipient LIKE '%98%';")
        # Delete onboarding sessions
        cur.execute("DELETE FROM oh_id.organization_onboarding_sessions WHERE email_address LIKE 'test.admin.%@example.org';")


def test_onboarding_session_creation():
    """Verify session is created with correct initial state."""
    unique_suffix, mobile, email = make_test_contacts()
    
    session = enterprise_iam_repo.create_or_get_onboarding_session(
        mobile_number=mobile,
        email_address=email,
        ip_address="127.0.0.1",
        user_agent="PyTest-Runner"
    )
    
    assert session is not None
    assert "session_id" in session
    assert session["mobile_verified"] is False
    assert session["email_verified"] is False
    assert session["mobile_number"].endswith(mobile[-4:])


def test_otp_rate_limiting_and_attempt_limits():
    """Verify 60s cooldown and 5-attempt lockout on OTP verification."""
    unique_suffix, mobile, email = make_test_contacts()
    
    session = enterprise_iam_repo.create_or_get_onboarding_session(
        mobile_number=mobile,
        email_address=email
    )
    session_id = session["session_id"]
    
    # 1. First mobile OTP request should succeed
    res1 = enterprise_iam_repo.request_onboarding_mobile_otp(
        session_id=session_id,
        mobile_number=mobile
    )
    assert res1["success"] is True
    assert res1["cooldown_seconds"] == 60
    
    # 2. Immediate second request should be blocked by 60s cooldown
    with pytest.raises(ValueError, match="Please wait.*before requesting a new.*code"):
        enterprise_iam_repo.request_onboarding_mobile_otp(
            session_id=session_id,
            mobile_number=mobile
        )
        
    # 3. Test attempt limits (5 invalid attempts should lock out on 6th)
    for attempt in range(5):
        with pytest.raises(ValueError, match="Invalid verification code"):
            enterprise_iam_repo.verify_onboarding_mobile_otp(
                session_id=session_id,
                otp_code="000000"
            )
            
    # 6th failed attempt should trigger max attempts exceeded
    with pytest.raises(ValueError, match="Maximum verification attempts exceeded"):
        enterprise_iam_repo.verify_onboarding_mobile_otp(
            session_id=session_id,
            otp_code="000000"
        )


def test_dual_otp_verification_flow():
    """Verify independent verification of Mobile OTP and Email OTP using stored HMAC hashes."""
    unique_suffix, mobile, email = make_test_contacts()
    
    session = enterprise_iam_repo.create_or_get_onboarding_session(
        mobile_number=mobile,
        email_address=email
    )
    session_id = session["session_id"]
    
    # Request mobile OTP
    enterprise_iam_repo.request_onboarding_mobile_otp(session_id=session_id, mobile_number=mobile)
    
    # Retrieve the active OTP directly from testing log
    mobile_logs = [log for log in whatsapp_service._delivery_log if mobile in log.get("recipient", "") or mobile in log.get("phone_number", "")]
    assert len(mobile_logs) > 0, "WhatsApp delivery log should record dispatched message"
    mobile_msg = mobile_logs[-1]["message"]
    mobile_otp_match = re.search(r"\b(\d{6})\b", mobile_msg)
    assert mobile_otp_match, "Should find 6-digit OTP in WhatsApp dispatch"
    mobile_otp = mobile_otp_match.group(1)
    
    # Verify mobile OTP
    v_mob = enterprise_iam_repo.verify_onboarding_mobile_otp(session_id=session_id, otp_code=mobile_otp)
    assert v_mob["success"] is True
    
    # Check session status: mobile verified, email NOT yet verified
    status1 = enterprise_iam_repo.get_onboarding_session_status(session_id)
    assert status1["mobile_verified"] is True
    assert status1["email_verified"] is False
    
    # Request email OTP
    enterprise_iam_repo.request_onboarding_email_otp(
        session_id=session_id,
        email_address=email,
        org_name="Test Healthcare"
    )
    
    email_logs = [log for log in email_service._outbox_log if log["to_email"] == email]
    assert len(email_logs) > 0, "Email service should log dispatched message"
    email_body = email_logs[-1]["body"]
    email_otp_match = re.search(r"\b(\d{6})\b", email_body)
    assert email_otp_match, "Should find 6-digit OTP in Email dispatch"
    email_otp = email_otp_match.group(1)
    
    # Verify email OTP
    v_email = enterprise_iam_repo.verify_onboarding_email_otp(session_id=session_id, otp_code=email_otp)
    assert v_email["success"] is True
    
    # Check session status: BOTH verified
    status2 = enterprise_iam_repo.get_onboarding_session_status(session_id)
    assert status2["mobile_verified"] is True
    assert status2["email_verified"] is True


def test_contact_change_invalidates_verification():
    """Verify modifying mobile or email resets verified status."""
    unique_suffix, mobile, email = make_test_contacts()
    
    session = enterprise_iam_repo.create_or_get_onboarding_session(
        mobile_number=mobile,
        email_address=email
    )
    session_id = session["session_id"]
    
    # Verify mobile
    enterprise_iam_repo.request_onboarding_mobile_otp(session_id=session_id, mobile_number=mobile)
    mobile_logs = [log for log in whatsapp_service._delivery_log if mobile in log.get("recipient", "") or mobile in log.get("phone_number", "")]
    otp = re.search(r"\b(\d{6})\b", mobile_logs[-1]["message"]).group(1)
    enterprise_iam_repo.verify_onboarding_mobile_otp(session_id=session_id, otp_code=otp)
    
    st_before = enterprise_iam_repo.get_onboarding_session_status(session_id)
    assert st_before["mobile_verified"] is True
    
    # Request OTP with DIFFERENT phone number -> resets mobile_verified
    new_mobile = f"97{random.randint(10000000, 99999999)}"
    enterprise_iam_repo.request_onboarding_mobile_otp(session_id=session_id, mobile_number=new_mobile)
    
    st_after = enterprise_iam_repo.get_onboarding_session_status(session_id)
    assert st_after["mobile_verified"] is False, "Changing phone must invalidate verification"


def test_registration_blocked_until_dual_verification():
    """Verify application submission is strictly blocked until mobile and email are verified."""
    unique_suffix, mobile, email = make_test_contacts()
    reg_num = f"TEST-REG-{unique_suffix}"
    
    session = enterprise_iam_repo.create_or_get_onboarding_session(
        mobile_number=mobile,
        email_address=email
    )
    session_id = session["session_id"]
    
    payload = {
        "name": f"Test Hospital {unique_suffix}",
        "facility_type": "HOSPITAL",
        "registration_number": reg_num,
        "address": "123 Healthcare Ave",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pin_code": "600001",
        "phone": mobile,
        "email": email,
        "rep_name": "Dr. Test Signatory",
        "rep_email": email,
        "rep_phone": mobile,
        "session_id": session_id
    }
    
    # Attempt 1: Completely unverified -> must raise mobile verification required
    with pytest.raises(ValueError, match="Mobile number verification via WhatsApp OTP is required"):
        enterprise_iam_repo.register_facility_application(payload)
        
    # Verify mobile only
    enterprise_iam_repo.request_onboarding_mobile_otp(session_id=session_id, mobile_number=mobile)
    mobile_logs = [log for log in whatsapp_service._delivery_log if mobile in log.get("recipient", "") or mobile in log.get("phone_number", "")]
    otp_mob = re.search(r"\b(\d{6})\b", mobile_logs[-1]["message"]).group(1)
    enterprise_iam_repo.verify_onboarding_mobile_otp(session_id=session_id, otp_code=otp_mob)
    
    # Attempt 2: Only mobile verified -> must raise email verification required
    with pytest.raises(ValueError, match="Official email verification via OTP is required"):
        enterprise_iam_repo.register_facility_application(payload)
        
    # Verify email
    enterprise_iam_repo.request_onboarding_email_otp(session_id=session_id, email_address=email)
    email_logs = [log for log in email_service._outbox_log if log["to_email"] == email]
    otp_email = re.search(r"\b(\d{6})\b", email_logs[-1]["body"]).group(1)
    enterprise_iam_repo.verify_onboarding_email_otp(session_id=session_id, otp_code=otp_email)
    
    # Attempt 3: Both verified -> submission must succeed!
    result = enterprise_iam_repo.register_facility_application(payload)
    assert result["status"] == "SUBMITTED"
    assert "tracking_id" in result
    
    # Verify tracking ID follows pattern OHID-ORG-2026-XXXXXXXX
    tracking_id = result["tracking_id"]
    assert re.match(r"^OHID-ORG-2026-[A-F0-9]{8}$", tracking_id), f"Tracking ID {tracking_id} does not match expected format"
    
    # Verify outbox has application submitted notification
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT event_type, recipient, masked_recipient, payload 
            FROM oh_id.notification_outbox 
            WHERE event_type = 'APPLICATION_SUBMITTED' AND recipient = %s;
        """, (email,))
        outbox_row = cur.fetchone()
        assert outbox_row is not None, "Submission must create outbox entry"
        payload = outbox_row["payload"] if isinstance(outbox_row["payload"], dict) else json.loads(outbox_row["payload"])
        assert payload["tracking_id"] == tracking_id


def test_admin_decision_workflow_hold_update_reject():
    """Verify Admin can put application ON_HOLD with reason, facility can update, and Admin can reject."""
    unique_suffix, mobile, email = make_test_contacts()
    reg_num = f"TEST-REG-{unique_suffix}"
    
    # Create and verify session
    session = enterprise_iam_repo.create_or_get_onboarding_session(mobile_number=mobile, email_address=email)
    session_id = session["session_id"]
    
    enterprise_iam_repo.request_onboarding_mobile_otp(session_id=session_id, mobile_number=mobile)
    mob_otp = re.search(r"\b(\d{6})\b", [l for l in whatsapp_service._delivery_log if mobile in l.get("recipient", "") or mobile in l.get("phone_number", "")][-1]["message"]).group(1)
    enterprise_iam_repo.verify_onboarding_mobile_otp(session_id=session_id, otp_code=mob_otp)
    
    enterprise_iam_repo.request_onboarding_email_otp(session_id=session_id, email_address=email)
    em_otp = re.search(r"\b(\d{6})\b", [l for l in email_service._outbox_log if l["to_email"] == email][-1]["body"]).group(1)
    enterprise_iam_repo.verify_onboarding_email_otp(session_id=session_id, otp_code=em_otp)
    
    # Submit application
    payload = {
        "name": f"Test Clinic {unique_suffix}",
        "facility_type": "CLINIC",
        "registration_number": reg_num,
        "address": "456 Cross Rd",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pin_code": "560001",
        "phone": mobile,
        "email": email,
        "rep_name": "Dr. Hold Signatory",
        "rep_email": email,
        "rep_phone": mobile,
        "session_id": session_id
    }
    app = enterprise_iam_repo.register_facility_application(payload)
    hospital_id = app["hospital_id"]
    tracking_id = app["tracking_id"]
    
    # 1. Super Admin puts on hold
    hold_reason = "Missing clinical establishment certificate for 2026."
    admin_id = str(uuid.uuid4())
    hold_res = enterprise_iam_repo.hold_facility_application_super_admin(
        hospital_id=hospital_id,
        admin_id=admin_id,
        reason=hold_reason
    )
    assert hold_res["status"] == "ON_HOLD"
    assert hold_res["reviewer_notes"] == hold_reason
    
    # Verify secure status retrieval
    app_status = enterprise_iam_repo.get_facility_application_by_ref(
        application_ref=tracking_id,
        verify_contact=email
    )
    assert app_status["lifecycle_status"] == "ON_HOLD"
    assert app_status["reviewer_notes"] == hold_reason
    
    # 2. Facility updates information
    update_res = enterprise_iam_repo.update_facility_application_by_ref(
        application_ref=tracking_id,
        updates={"address": "456 Cross Rd, Suite 200"},
        verify_contact=email
    )
    assert update_res["lifecycle_status"] == "SUBMITTED", "Updating on-hold application must return status to SUBMITTED"
    
    # 3. Super Admin rejects application
    reject_reason = "Statutory documents could not be verified with directorate."
    reject_res = enterprise_iam_repo.reject_facility_application_super_admin(
        hospital_id=hospital_id,
        admin_id=admin_id,
        reason=reject_reason
    )
    assert reject_res["status"] == "REJECTED"
    
    # Verify outbox logged rejection notification
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT event_type, payload 
            FROM oh_id.notification_outbox 
            WHERE event_type = 'APPLICATION_REJECTED' AND recipient = %s;
        """, (email,))
        rej_outbox = cur.fetchone()
        assert rej_outbox is not None
        payload = rej_outbox["payload"] if isinstance(rej_outbox["payload"], dict) else json.loads(rej_outbox["payload"])
        assert payload["reason"] == reject_reason


def test_admin_approval_and_account_activation_flow():
    """
    Verify complete approval lifecycle:
    - Status set to APPROVED.
    - Initial HOSPITAL_ADMIN user provisioned.
    - Single-use 72-hour invitation token created in oh_id.user_invitations.
    - Outbox dispatches activation link.
    - Token resolution activates account.
    """
    unique_suffix, mobile, email = make_test_contacts()
    reg_num = f"TEST-REG-{unique_suffix}"
    
    # Complete onboarding session
    session = enterprise_iam_repo.create_or_get_onboarding_session(mobile_number=mobile, email_address=email)
    session_id = session["session_id"]
    
    enterprise_iam_repo.request_onboarding_mobile_otp(session_id=session_id, mobile_number=mobile)
    mob_otp = re.search(r"\b(\d{6})\b", [l for l in whatsapp_service._delivery_log if mobile in l.get("recipient", "") or mobile in l.get("phone_number", "")][-1]["message"]).group(1)
    enterprise_iam_repo.verify_onboarding_mobile_otp(session_id=session_id, otp_code=mob_otp)
    
    enterprise_iam_repo.request_onboarding_email_otp(session_id=session_id, email_address=email)
    em_otp = re.search(r"\b(\d{6})\b", [l for l in email_service._outbox_log if l["to_email"] == email][-1]["body"]).group(1)
    enterprise_iam_repo.verify_onboarding_email_otp(session_id=session_id, otp_code=em_otp)
    
    # Submit application
    payload = {
        "name": f"City Multi-Specialty {unique_suffix}",
        "facility_type": "HOSPITAL",
        "registration_number": reg_num,
        "address": "789 Medical Enclave",
        "city": "Hyderabad",
        "state": "Telangana",
        "pin_code": "500001",
        "phone": mobile,
        "email": email,
        "rep_name": "Dr. Approved Admin",
        "rep_email": email,
        "rep_phone": mobile,
        "session_id": session_id
    }
    app = enterprise_iam_repo.register_facility_application(payload)
    hospital_id = app["hospital_id"]
    
    # Super Admin Approves
    admin_id = str(uuid.uuid4())
    approval_res = enterprise_iam_repo.approve_facility_application_super_admin(
        hospital_id=hospital_id,
        admin_id=admin_id,
        notes="All regulatory documents and facility inspections verified."
    )
    
    assert approval_res["status"] == "APPROVED"
    assert approval_res["hospital_id"] == hospital_id
    assert "invitation_token" in approval_res
    assert "activation_url" in approval_res
    invite_token = approval_res["invitation_token"]
    assert len(invite_token) >= 32
    
    # Verify User Provisioning in Database
    with get_db_cursor() as cur:
        # Check oh_id.users (unactivated state)
        cur.execute("SELECT id, email, is_active, is_verified, must_change_password FROM oh_id.users WHERE email = %s;", (email,))
        user_row = cur.fetchone()
        assert user_row is not None, "Initial admin user must be created in oh_id.users"
        assert user_row["is_verified"] is False, "User must remain unverified until password is established"
        assert user_row["must_change_password"] is True, "User must be flagged to establish password"
        user_id = user_row["id"]
        
        # Check oh_id.hospital_staff_memberships
        cur.execute("""
            SELECT role_code, is_active FROM oh_id.hospital_staff_memberships 
            WHERE hospital_id = %s AND user_id = %s;
        """, (hospital_id, user_id))
        membership = cur.fetchone()
        assert membership is not None
        assert membership["role_code"] == "HOSPITAL_ADMIN"
        assert membership["is_active"] is True
        
        # Check oh_id.user_invitations
        cur.execute("""
            SELECT token, expires_at, is_used, role_code 
            FROM oh_id.user_invitations 
            WHERE token = %s;
        """, (invite_token,))
        invitation = cur.fetchone()
        assert invitation is not None
        assert invitation["is_used"] is False, "Token must be initially unused"
        assert invitation["role_code"] == "HOSPITAL_ADMIN"
        
        # Verify 72-hour expiration window (+/- 2 minutes tolerance)
        expected_expiry = datetime.now(timezone.utc) + timedelta(hours=72)
        diff = abs((invitation["expires_at"] - expected_expiry).total_seconds())
        assert diff < 120, f"Expiry should be approx 72 hours from now, diff: {diff}s"
        
        # Check oh_id.notification_outbox for approval notification
        cur.execute("""
            SELECT event_type, channel, recipient, payload 
            FROM oh_id.notification_outbox 
            WHERE event_type = 'APPLICATION_APPROVED' AND recipient = %s;
        """, (email,))
        approval_outbox = cur.fetchall()
        assert len(approval_outbox) >= 1, "Approval notification must be enqueued in outbox"
        payload = approval_outbox[0]["payload"] if isinstance(approval_outbox[0]["payload"], dict) else json.loads(approval_outbox[0]["payload"])
        assert "/invite?token=" in payload["activation_url"]

    # 4. Account Activation: Admin clicks /invite link and sets password
    activation_res = enterprise_iam_repo.accept_invitation_token(
        token=invite_token,
        password_hash="$2b$12$K8y4Z7f1e7u8k9e0w1q2u3e4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k",
        mfa_enabled=False
    )
    assert activation_res["success"] is True

    # Verify User is now verified and invitation is marked used
    with get_db_cursor() as cur:
        cur.execute("SELECT is_active, is_verified, must_change_password FROM oh_id.users WHERE email = %s;", (email,))
        user_activated = cur.fetchone()
        assert user_activated["is_active"] is True
        assert user_activated["is_verified"] is True
        assert user_activated["must_change_password"] is False

        cur.execute("SELECT is_used, status FROM oh_id.user_invitations WHERE token = %s;", (invite_token,))
        inv_activated = cur.fetchone()
        assert inv_activated["is_used"] is True
        assert inv_activated["status"] == "ACCEPTED"


def test_security_audit_zero_plaintext_otps_or_passwords():
    """
    Security Audit:
    - Verify oh_id.organization_onboarding_sessions only stores SHA-256 HMAC hashes, never plaintext 6-digit OTPs.
    - Verify oh_id.notification_outbox has no passwords or secrets.
    """
    with get_db_cursor() as cur:
        # Check OTP storage in organization_onboarding_sessions
        cur.execute("""
            SELECT mobile_otp_hash, email_otp_hash 
            FROM oh_id.organization_onboarding_sessions 
            WHERE mobile_otp_hash IS NOT NULL OR email_otp_hash IS NOT NULL 
            LIMIT 10;
        """)
        sessions = cur.fetchall()
        for s in sessions:
            if s.get("mobile_otp_hash"):
                assert len(s["mobile_otp_hash"]) == 64, "Mobile OTP must be stored as 64-character SHA-256 hex digest"
                assert not s["mobile_otp_hash"].isdigit(), "Mobile OTP hash cannot be plain numeric digits"
            if s.get("email_otp_hash"):
                assert len(s["email_otp_hash"]) == 64, "Email OTP must be stored as 64-character SHA-256 hex digest"
                assert not s["email_otp_hash"].isdigit(), "Email OTP hash cannot be plain numeric digits"
                
        # Check outbox payload
        cur.execute("SELECT payload FROM oh_id.notification_outbox LIMIT 20;")
        outbox_rows = cur.fetchall()
        for row in outbox_rows:
            payload_str = str(row["payload"]).lower()
            assert "otp_code" not in payload_str, "Outbox payload must not leak otp_code"
            assert "password" not in payload_str, "Outbox payload must not leak password"
