"""
OH-ID Enterprise Email & Notification Service
Handles transactional password reset OTP delivery, failure tracking,
and Super Admin assistance alerts.
"""
import smtplib
import ssl
import logging
import uuid
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import threading

from backend.app.core.config import settings

logger = logging.getLogger("ohid.email_service")

class EmailService:
    """
    Centralized email delivery engine supporting secure SMTP transmission,
    delivery failure detection, and isolated testing inbox mode.
    Never logs or persists plaintext OTPs or sensitive passwords.
    """
    def __init__(self):
        self._lock = threading.Lock()
        # In-memory delivery history for test assertions and monitoring (correlation_id -> delivery metadata)
        self._delivery_log: List[Dict[str, Any]] = []
        self._outbox_log = self._delivery_log

    def clear_test_inbox(self):
        """Resets the testing delivery history (useful in automated tests)."""
        with self._lock:
            self._delivery_log.clear()

    def get_test_inbox(self) -> List[Dict[str, Any]]:
        """Returns copies of all recorded deliveries in testing mode."""
        with self._lock:
            return list(self._delivery_log)

    def get_delivery_by_correlation_id(self, correlation_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for item in self._delivery_log:
                if item.get("correlation_id") == correlation_id:
                    return dict(item)
            return None

    def send_password_reset_otp(
        self,
        recipient_email: str,
        otp_code: str,
        expires_in_minutes: int = 5,
        correlation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transmits password reset OTP to verified registered email address.
        Catches transport errors safely without crashing calling flow.
        """
        corr_id = correlation_id or f"corr-{uuid.uuid4().hex[:12]}"
        masked_email = self._mask_email(recipient_email)
        subject = "OneHealth ID (OH-ID) — Password Reset Verification Code"

        # Build email content
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
                .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
                .header {{ background: linear-gradient(135deg, #155EEF 0%, #123B75 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
                .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }}
                .content {{ padding: 32px 24px; }}
                .otp-box {{ background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
                .otp-code {{ font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #155eef; font-family: monospace; }}
                .footer {{ padding: 20px 24px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>OneHealth ID Security</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your OneHealth ID account. Use the verification code below to proceed:</p>
                    <div class="otp-box">
                        <div class="otp-code">{otp_code}</div>
                    </div>
                    <p><strong>This code will expire in {expires_in_minutes} minutes.</strong></p>
                    <p>If you did not initiate this request, your account may be secure, but you should review your settings or contact support immediately. Do not share this code with anyone.</p>
                </div>
                <div class="footer">
                    <p>OneHealth Network Security • Reference: {corr_id}</p>
                </div>
            </div>
        </body>
        </html>
        """
        plain_text = (
            f"OneHealth ID (OH-ID) Password Reset Code\n\n"
            f"Your verification code is: {otp_code}\n\n"
            f"This code will expire in {expires_in_minutes} minutes.\n"
            f"If you did not request this, please contact support.\n"
            f"Correlation ID: {corr_id}\n"
        )

        delivery_result = self._dispatch(
            to_email=recipient_email,
            subject=subject,
            plain_text=plain_text,
            html_body=html_body,
            correlation_id=corr_id,
            meta={"category": "PASSWORD_RESET_OTP", "masked_email": masked_email}
        )
        return delivery_result

    def send_super_admin_assistance_alert(
        self,
        ticket_number: str,
        category: str,
        masked_email: str,
        user_role: Optional[str] = None,
        client_ip: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Notifies Super Admin support channel of a password reset or OTP delivery issue.
        Contains minimal necessary data without sensitive tokens or passwords.
        """
        support_email = settings.SUPER_ADMIN_SUPPORT_EMAIL
        subject = f"[SUPPORT ASSISTANCE] {category} Request — Reference: {ticket_number}"
        corr_id = f"corr-sup-{uuid.uuid4().hex[:8]}"

        plain_text = (
            f"OH-ID Platform Support Request: Password Reset Assistance\n\n"
            f"Reference Number: {ticket_number}\n"
            f"Category: {category}\n"
            f"Account Email: {masked_email}\n"
            f"Account Role: {user_role or 'Unspecified'}\n"
            f"Client IP: {client_ip or 'Unknown'}\n"
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n"
            f"Notes: {notes or 'No additional notes provided.'}\n\n"
            f"Super Admins can review this in the Admin Console under Platform Support."
        )

        return self._dispatch(
            to_email=support_email,
            subject=subject,
            plain_text=plain_text,
            html_body=None,
            correlation_id=corr_id,
            meta={"category": "SUPER_ADMIN_ALERT", "ticket_number": ticket_number}
        )

    def send_organization_onboarding_otp(
        self,
        recipient_email: str,
        org_name: str,
        otp_code: str,
        expires_in_minutes: int = 10,
        correlation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Transmits 6-digit email OTP for organization registration verification."""
        corr_id = correlation_id or f"corr-em-{uuid.uuid4().hex[:12]}"
        masked_email = self._mask_email(recipient_email)
        subject = f"OneHealth ID (OH-ID) — Official Email Verification Code ({otp_code})"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #155EEF 0%, #123B75 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700;">OneHealth ID Organization Registration</h1>
                </div>
                <div style="padding: 28px 24px;">
                    <p>Dear Representative of <strong>{org_name or 'Healthcare Facility'}</strong>,</p>
                    <p>Please use the official email verification code below to complete your organization onboarding:</p>
                    <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #155eef; font-family: monospace;">{otp_code}</span>
                    </div>
                    <p><strong>This code will expire in {expires_in_minutes} minutes.</strong></p>
                    <p style="font-size: 13px; color: #64748b;">If you did not initiate this organization onboarding request, please ignore this email or notify security-support@ohid.online.</p>
                </div>
                <div style="padding: 16px 24px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
                    OneHealth ID Security • Ref: {corr_id}
                </div>
            </div>
        </body>
        </html>
        """
        plain_text = (
            f"OneHealth ID (OH-ID) Organization Email Verification\n\n"
            f"Organization: {org_name}\n"
            f"Your verification code is: {otp_code}\n"
            f"This code will expire in {expires_in_minutes} minutes.\n\n"
            f"Correlation ID: {corr_id}\n"
        )
        return self._dispatch(
            to_email=recipient_email,
            subject=subject,
            plain_text=plain_text,
            html_body=html_body,
            correlation_id=corr_id,
            meta={"category": "ONBOARDING_EMAIL_OTP", "masked_email": masked_email}
        )

    def send_application_submitted_notification(
        self,
        recipient_email: str,
        org_name: str,
        tracking_id: str,
        status_url: str
    ) -> Dict[str, Any]:
        """Notifies applicant that registration has been successfully submitted."""
        corr_id = f"corr-sub-{uuid.uuid4().hex[:12]}"
        masked_email = self._mask_email(recipient_email)
        subject = f"OneHealth ID — Application Submitted ({tracking_id})"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #155EEF 0%, #123B75 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Registration Submitted Successfully</h1>
                </div>
                <div style="padding: 28px 24px;">
                    <p>Dear Authorized Representative,</p>
                    <p>Your registration application for <strong>{org_name}</strong> has been received and entered the <strong>SUBMITTED</strong> stage.</p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Application Tracking Identifier</p>
                        <p style="margin: 0; font-size: 20px; font-family: monospace; font-weight: 800; color: #155eef;">{tracking_id}</p>
                    </div>
                    <p><strong>Status:</strong> Submitted — Awaiting Super Admin Review</p>
                    <p>You can check the status of your application anytime using your tracking identifier and verified credentials at:</p>
                    <p><a href="{status_url}" style="color: #155eef; font-weight: 600;">{status_url}</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        plain_text = (
            f"OneHealth ID Application Submitted\n\n"
            f"Organization: {org_name}\n"
            f"Tracking ID: {tracking_id}\n"
            f"Status: Submitted — Pending Super Admin Review\n"
            f"Status Portal: {status_url}\n"
        )
        return self._dispatch(
            to_email=recipient_email,
            subject=subject,
            plain_text=plain_text,
            html_body=html_body,
            correlation_id=corr_id,
            meta={"category": "APPLICATION_SUBMITTED", "tracking_id": tracking_id}
        )

    def send_application_on_hold_notification(
        self,
        recipient_email: str,
        org_name: str,
        tracking_id: str,
        reason: str,
        status_url: str
    ) -> Dict[str, Any]:
        """Notifies applicant that their application has been placed on hold."""
        corr_id = f"corr-hld-{uuid.uuid4().hex[:12]}"
        masked_email = self._mask_email(recipient_email)
        subject = f"OneHealth ID — Action Required: Application On Hold ({tracking_id})"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Action Required: Application On Hold</h1>
                </div>
                <div style="padding: 28px 24px;">
                    <p>Dear Authorized Representative,</p>
                    <p>During regulatory verification of <strong>{org_name}</strong> (Tracking ID: <strong>{tracking_id}</strong>), the reviewing Super Admin requested additional details:</p>
                    <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #d97706; padding: 14px; margin: 16px 0; border-radius: 6px;">
                        <strong>Review Remarks:</strong><br/>
                        {reason}
                    </div>
                    <p>Please visit the tracking portal to upload the requested certificates or update your details:</p>
                    <p><a href="{status_url}" style="color: #155eef; font-weight: 600;">{status_url}</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        plain_text = (
            f"OneHealth ID Application On Hold\n\n"
            f"Organization: {org_name}\n"
            f"Tracking ID: {tracking_id}\n"
            f"Review Remarks: {reason}\n"
            f"Track & Update URL: {status_url}\n"
        )
        return self._dispatch(
            to_email=recipient_email,
            subject=subject,
            plain_text=plain_text,
            html_body=html_body,
            correlation_id=corr_id,
            meta={"category": "APPLICATION_ON_HOLD", "tracking_id": tracking_id}
        )

    def send_application_rejected_notification(
        self,
        recipient_email: str,
        org_name: str,
        tracking_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """Notifies applicant that application was rejected."""
        corr_id = f"corr-rej-{uuid.uuid4().hex[:12]}"
        masked_email = self._mask_email(recipient_email)
        subject = f"OneHealth ID — Application Decision ({tracking_id})"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Application Review Decision</h1>
                </div>
                <div style="padding: 28px 24px;">
                    <p>Dear Authorized Representative,</p>
                    <p>The registration application for <strong>{org_name}</strong> (Tracking ID: <strong>{tracking_id}</strong>) has been reviewed and <strong>not approved</strong>.</p>
                    <div style="background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #dc2626; padding: 14px; margin: 16px 0; border-radius: 6px;">
                        <strong>Decision Reason:</strong><br/>
                        {reason}
                    </div>
                    <p style="font-size: 13px; color: #64748b;">If you believe this decision was made in error or would like to submit an appeal, please contact security-support@ohid.online.</p>
                </div>
            </div>
        </body>
        </html>
        """
        plain_text = (
            f"OneHealth ID Application Rejected\n\n"
            f"Organization: {org_name}\n"
            f"Tracking ID: {tracking_id}\n"
            f"Reason: {reason}\n"
        )
        return self._dispatch(
            to_email=recipient_email,
            subject=subject,
            plain_text=plain_text,
            html_body=html_body,
            correlation_id=corr_id,
            meta={"category": "APPLICATION_REJECTED", "tracking_id": tracking_id}
        )

    def send_application_approved_notification(
        self,
        recipient_email: str,
        org_name: str,
        tracking_id: str,
        activation_url: str,
        login_url: str
    ) -> Dict[str, Any]:
        """Notifies applicant of approval and provides single-use secure activation link."""
        corr_id = f"corr-app-{uuid.uuid4().hex[:12]}"
        masked_email = self._mask_email(recipient_email)
        subject = f"OneHealth ID — Organization Approved: Complete Account Activation ({tracking_id})"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Congratulations! Organization Approved</h1>
                </div>
                <div style="padding: 28px 24px;">
                    <p>Dear Authorized Representative,</p>
                    <p>We are pleased to inform you that <strong>{org_name}</strong> (Tracking ID: <strong>{tracking_id}</strong>) has been officially <strong>APPROVED</strong> by Super Admin after regulatory review.</p>
                    <p>To initialize your organization administrator credentials, please complete your single-use account activation:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="{activation_url}" style="display: inline-block; background: #059669; color: #ffffff; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 14px;">Complete Account Activation</a>
                    </div>
                    <p style="font-size: 12px; color: #64748b;">This secure activation link will expire in 72 hours and can be used once. After setting your password, you will be redirected to the OneHealth ID Login Portal ({login_url}).</p>
                </div>
                <div style="padding: 16px 24px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
                    OneHealth ID Security • Ref: {corr_id}
                </div>
            </div>
        </body>
        </html>
        """
        plain_text = (
            f"OneHealth ID Organization Approved!\n\n"
            f"Organization: {org_name}\n"
            f"Tracking ID: {tracking_id}\n\n"
            f"Please complete your administrator account activation here:\n{activation_url}\n\n"
            f"This link expires in 72 hours.\n"
            f"Login URL: {login_url}\n"
        )
        return self._dispatch(
            to_email=recipient_email,
            subject=subject,
            plain_text=plain_text,
            html_body=html_body,
            correlation_id=corr_id,
            meta={"category": "APPLICATION_APPROVED", "tracking_id": tracking_id}
        )

    def _dispatch(
        self,
        to_email: str,
        subject: str,
        plain_text: str,
        html_body: Optional[str],
        correlation_id: str,
        meta: Dict[str, Any]
    ) -> Dict[str, Any]:
        timestamp = datetime.now(timezone.utc)
        masked_recipient = self._mask_email(to_email)

        # Check if running in testing mode or missing live SMTP credentials
        use_test_backend = settings.TESTING_EMAIL_BACKEND or not settings.SMTP_HOST

        if use_test_backend:
            record = {
                "correlation_id": correlation_id,
                "recipient": to_email,
                "to_email": to_email,
                "masked_recipient": masked_recipient,
                "subject": subject,
                "body": plain_text,
                "body_snippet": plain_text[:80],
                "status": "DELIVERED",
                "backend": "TEST_ISOLATED",
                "timestamp": timestamp,
                "meta": meta
            }
            with self._lock:
                self._delivery_log.append(record)
            logger.info("Dispatched email via test backend to %s (Correlation: %s)", masked_recipient, correlation_id)
            return {"status": "DELIVERED", "correlation_id": correlation_id, "backend": "TEST_ISOLATED"}

        # Live SMTP delivery
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email
            msg["X-Correlation-ID"] = correlation_id

            msg.attach(MIMEText(plain_text, "plain"))
            if html_body:
                msg.attach(MIMEText(html_body, "html"))

            if settings.SMTP_TLS:
                context = ssl.create_default_context()
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    server.starttls(context=context)
                    if settings.SMTP_USER and settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    if settings.SMTP_USER and settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())

            record = {
                "correlation_id": correlation_id,
                "recipient": to_email,
                "masked_recipient": masked_recipient,
                "subject": subject,
                "status": "DELIVERED",
                "backend": "SMTP_LIVE",
                "timestamp": timestamp,
                "meta": meta
            }
            with self._lock:
                self._delivery_log.append(record)
            logger.info("Dispatched email via SMTP to %s (Correlation: %s)", masked_recipient, correlation_id)
            return {"status": "DELIVERED", "correlation_id": correlation_id, "backend": "SMTP_LIVE"}

        except Exception as e:
            logger.error("Failed to transmit email to %s: %s", masked_recipient, e)
            record = {
                "correlation_id": correlation_id,
                "recipient": to_email,
                "masked_recipient": masked_recipient,
                "subject": subject,
                "status": "FAILED",
                "error": str(e),
                "timestamp": timestamp,
                "meta": meta
            }
            with self._lock:
                self._delivery_log.append(record)
            return {"status": "FAILED", "correlation_id": correlation_id, "error": str(e)}

    @staticmethod
    def _mask_email(email: str) -> str:
        if not email or "@" not in email:
            return "***"
        parts = email.split("@")
        local = parts[0]
        domain = parts[1]
        if len(local) <= 2:
            masked_local = local[0] + "*"
        else:
            masked_local = local[0] + ("*" * (len(local) - 2)) + local[-1]
        return f"{masked_local}@{domain}"

# Singleton instance
email_service = EmailService()
