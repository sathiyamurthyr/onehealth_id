"""
OH-ID Enterprise WhatsApp Notification & OTP Service
Handles transactional WhatsApp OTP delivery for organization onboarding,
application status alerts, and multi-channel outbox dispatches.
Strictly protects credentials and never logs plaintext OTPs.
"""
import logging
import uuid
import threading
import urllib.request
import urllib.error
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from backend.app.core.config import settings

logger = logging.getLogger("ohid.whatsapp_service")

class WhatsAppService:
    """
    Centralized WhatsApp Business messaging service supporting Meta Cloud API /
    Webhook providers, delivery status tracking, masked logging, and an
    isolated test backend for automated test suites.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._delivery_log: List[Dict[str, Any]] = []

    def clear_test_inbox(self):
        """Clears recorded test transmissions."""
        with self._lock:
            self._delivery_log.clear()

    def get_test_inbox(self) -> List[Dict[str, Any]]:
        """Returns copies of all recorded WhatsApp messages in testing mode."""
        with self._lock:
            return list(self._delivery_log)

    def get_delivery_by_correlation_id(self, correlation_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for item in self._delivery_log:
                if item.get("correlation_id") == correlation_id:
                    return dict(item)
            return None

    def send_onboarding_otp(
        self,
        recipient_phone: str,
        otp_code: str,
        expires_in_minutes: int = 10,
        correlation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches 6-digit WhatsApp OTP to verified mobile number for organization onboarding.
        """
        corr_id = correlation_id or f"corr-wa-{uuid.uuid4().hex[:12]}"
        masked_phone = self._mask_phone(recipient_phone)

        message_text = (
            f"*OneHealth ID (OH-ID) Security*\n\n"
            f"Your organization onboarding verification code is: *{otp_code}*\n\n"
            f"This code will expire in {expires_in_minutes} minutes.\n"
            f"Do not share this code with anyone. OneHealth staff will never ask for your verification code.\n\n"
            f"Ref: {corr_id}"
        )

        return self._dispatch(
            to_phone=recipient_phone,
            message_text=message_text,
            correlation_id=corr_id,
            meta={"category": "ONBOARDING_MOBILE_OTP", "masked_phone": masked_phone}
        )

    def send_application_submitted_alert(
        self,
        recipient_phone: str,
        org_name: str,
        tracking_id: str,
        status_url: str
    ) -> Dict[str, Any]:
        """Sends WhatsApp confirmation when an organization application is submitted."""
        corr_id = f"corr-wa-{uuid.uuid4().hex[:12]}"
        message_text = (
            f"*OneHealth ID — Application Submitted*\n\n"
            f"Dear Representative,\n"
            f"Your organization registration for *{org_name}* has been submitted successfully.\n\n"
            f"📋 *Tracking ID:* {tracking_id}\n"
            f"Status: *Submitted — Pending Super Admin Review*\n\n"
            f"You can track review progress securely here:\n{status_url}\n\n"
            f"OneHealth Network Security"
        )
        return self._dispatch(
            to_phone=recipient_phone,
            message_text=message_text,
            correlation_id=corr_id,
            meta={"category": "APPLICATION_SUBMITTED", "tracking_id": tracking_id}
        )

    def send_application_on_hold_alert(
        self,
        recipient_phone: str,
        org_name: str,
        tracking_id: str,
        reason: str,
        status_url: str
    ) -> Dict[str, Any]:
        """Sends WhatsApp alert when application is placed on hold."""
        corr_id = f"corr-wa-{uuid.uuid4().hex[:12]}"
        message_text = (
            f"*OneHealth ID — Action Required on Application*\n\n"
            f"Application for *{org_name}* (Tracking ID: *{tracking_id}*) has been placed *ON HOLD* by Super Admin.\n\n"
            f"📝 *Reviewer Remarks:* {reason}\n\n"
            f"Please visit the tracking portal to supply the requested information:\n{status_url}\n\n"
            f"OneHealth Network Security"
        )
        return self._dispatch(
            to_phone=recipient_phone,
            message_text=message_text,
            correlation_id=corr_id,
            meta={"category": "APPLICATION_ON_HOLD", "tracking_id": tracking_id}
        )

    def send_application_rejected_alert(
        self,
        recipient_phone: str,
        org_name: str,
        tracking_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """Sends WhatsApp alert when application is rejected."""
        corr_id = f"corr-wa-{uuid.uuid4().hex[:12]}"
        message_text = (
            f"*OneHealth ID — Application Status Update*\n\n"
            f"Registration for *{org_name}* (Tracking ID: *{tracking_id}*) was reviewed and *NOT APPROVED*.\n\n"
            f"Reason: {reason}\n\n"
            f"For further questions or appeals, please contact security-support@ohid.online."
        )
        return self._dispatch(
            to_phone=recipient_phone,
            message_text=message_text,
            correlation_id=corr_id,
            meta={"category": "APPLICATION_REJECTED", "tracking_id": tracking_id}
        )

    def send_application_approved_alert(
        self,
        recipient_phone: str,
        org_name: str,
        tracking_id: str,
        activation_url: str
    ) -> Dict[str, Any]:
        """Sends WhatsApp alert when application is approved with activation instructions."""
        corr_id = f"corr-wa-{uuid.uuid4().hex[:12]}"
        message_text = (
            f"*OneHealth ID — Organization Approved! 🎉*\n\n"
            f"Congratulations! The healthcare organization application for *{org_name}* (Tracking ID: *{tracking_id}*) has been officially *APPROVED*.\n\n"
            f"An account activation link has been dispatched to your verified email.\n"
            f"You may also activate directly here:\n{activation_url}\n\n"
            f"This single-use link will expire in 72 hours.\n"
            f"OneHealth ID Security"
        )
        return self._dispatch(
            to_phone=recipient_phone,
            message_text=message_text,
            correlation_id=corr_id,
            meta={"category": "APPLICATION_APPROVED", "tracking_id": tracking_id}
        )

    def _dispatch(
        self,
        to_phone: str,
        message_text: str,
        correlation_id: str,
        meta: Dict[str, Any]
    ) -> Dict[str, Any]:
        timestamp = datetime.now(timezone.utc)
        masked_phone = self._mask_phone(to_phone)

        use_test_backend = (
            settings.TESTING_WHATSAPP_BACKEND 
            or not settings.WHATSAPP_API_TOKEN 
            or not settings.WHATSAPP_API_URL
        )

        if use_test_backend:
            record = {
                "correlation_id": correlation_id,
                "recipient": to_phone,
                "phone_number": to_phone,
                "masked_recipient": masked_phone,
                "message": message_text,
                "message_snippet": message_text[:120],
                "status": "DELIVERED",
                "backend": "TEST_ISOLATED",
                "timestamp": timestamp,
                "meta": meta
            }
            with self._lock:
                self._delivery_log.append(record)
            logger.info("Dispatched WhatsApp message via test backend to %s (Correlation: %s)", masked_phone, correlation_id)
            return {"status": "DELIVERED", "correlation_id": correlation_id, "backend": "TEST_ISOLATED"}

        # Live Meta Cloud API / HTTP Webhook Dispatch
        try:
            url = settings.WHATSAPP_API_URL
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
                "Content-Type": "application/json"
            }
            body = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_phone.replace("+", "").replace(" ", "").replace("-", ""),
                "type": "text",
                "text": {"preview_url": False, "body": message_text}
            }
            data = json.dumps(body).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as response:
                status_code = response.getcode()
                if 200 <= status_code < 300:
                    record = {
                        "correlation_id": correlation_id,
                        "recipient": to_phone,
                        "masked_recipient": masked_phone,
                        "status": "DELIVERED",
                        "backend": "WHATSAPP_LIVE",
                        "timestamp": timestamp,
                        "meta": meta
                    }
                    with self._lock:
                        self._delivery_log.append(record)
                    logger.info("Dispatched WhatsApp message via live provider to %s", masked_phone)
                    return {"status": "DELIVERED", "correlation_id": correlation_id, "backend": "WHATSAPP_LIVE"}
                else:
                    raise RuntimeError(f"WhatsApp provider returned non-200 status code: {status_code}")
        except Exception as e:
            logger.error("Failed to transmit WhatsApp message to %s: %s", masked_phone, e)
            record = {
                "correlation_id": correlation_id,
                "recipient": to_phone,
                "masked_recipient": masked_phone,
                "status": "FAILED",
                "error": str(e),
                "timestamp": timestamp,
                "meta": meta
            }
            with self._lock:
                self._delivery_log.append(record)
            return {"status": "FAILED", "correlation_id": correlation_id, "error": str(e)}

    @staticmethod
    def _mask_phone(phone: str) -> str:
        if not phone:
            return "***"
        clean = phone.strip()
        if len(clean) <= 4:
            return "****"
        return clean[:3] + ("*" * (len(clean) - 6)) + clean[-3:]

# Singleton instance
whatsapp_service = WhatsAppService()
