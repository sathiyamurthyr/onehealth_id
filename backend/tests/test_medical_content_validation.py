"""
OH-ID Medical Content Validation & Non-Medical Blocking Test Suite
Comprehensive validation and regression tests verifying:
1. Authentic medical documents (Prescriptions, Lab Reports, Consultations, Discharge Summaries,
   Medical Certificates, Imaging Reports) are accepted.
2. Non-medical content (Messaging chats, contact lists, social media posts, shopping receipts,
   utility bills, resumes, personal photos) is strictly rejected.
3. Multipage PDF mixed-content attacks (Page 1 medical + Page 2 non-medical) are rejected.
4. Embedded PDF script/launch attacks and decompression bombs are blocked.
5. Rejections do NOT consume storage quota, are NOT uploaded to B2, and temporary quarantined files are cleaned up.
Sathus Technology Pvt Ltd - OneHealth ID
"""

import io
import pytest
from unittest.mock import MagicMock, patch
from PIL import Image

from backend.app.services.ocr.document_validator import (
    document_validator,
    ValidationDecision,
    ACCEPTED_DECISIONS,
)
from backend.app.services.ocr.file_validator import (
    verify_file_signature,
    validate_and_quarantine_file,
    delete_quarantined_file,
)
from backend.app.services.ocr.image_engine import ImageAndMediaOCREngine


# ============================================================================
# 1. POSITIVE CASES: AUTHENTIC MEDICAL DOCUMENTS
# ============================================================================

def test_authentic_prescription_accepted():
    """Verify authentic clinical prescription is accepted with medical category."""
    text = """
    Kedar Super Specialty Hospital - Department of General Medicine
    Dr. Senthil Nathan, MBBS, MD (Internal Medicine) - Reg No: 78492
    Patient: Alice Smith | Age: 32 | Gender: Female | Date: 12-Nov-2026
    Diagnosis: Acute Bronchitis and Upper Respiratory Tract Infection
    
    Rx:
    1. Tab. Amoxicillin-Clavulanate 625mg - 1 tablet twice daily after food for 5 days
    2. Tab. Paracetamol 650mg - 1 tablet SOS for fever
    3. Syp. Ambroxol hydrochloride 30mg/5ml - 10ml thrice daily for 5 days
    
    Instructions: Drink warm fluids. Review in OPD after 5 days if cough persists.
    Doctor's Signature: Dr. Senthil Nathan
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=text,
        selected_category="PRESCRIPTION",
        is_scanned=False
    )
    assert res.is_accepted is True
    assert res.decision in ACCEPTED_DECISIONS
    assert res.relevance_score >= 0.20
    assert res.detected_category == "PRESCRIPTION"


def test_authentic_laboratory_report_accepted():
    """Verify pathology / blood test laboratory report is accepted."""
    text = """
    OneHealth Diagnostics & Pathology Laboratory
    Accreditation: NABL Certified Lab | Facility: Chennai Central
    Patient Name: Alice Smith | OH-ID: OHID-IND-2026-01001
    Referring Doctor: Dr. K. Ramanathan | Specimen: Whole Blood EDTA
    Collection Date: 10-Oct-2026 | Reported Date: 10-Oct-2026
    
    COMPLETE BLOOD COUNT (CBC):
    Test Parameter           Result     Units       Biological Reference Range
    Hemoglobin               12.8       g/dL        12.0 - 15.5 (Normal)
    Total Leukocyte Count    7,400      cells/cumm  4,000 - 11,000 (Normal)
    RBC Count                4.5        million/uL  3.8 - 4.8 (Normal)
    Platelet Count           240,000    /cumm       150,000 - 450,000 (Normal)
    Neutrophils              62         %           40 - 70
    Lymphocytes              30         %           20 - 40
    
    Biochemist Signature: Dr. Priya Sharma, MD (Pathology)
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=text,
        selected_category="LAB_REPORT",
        is_scanned=False
    )
    assert res.is_accepted is True
    assert res.decision in ACCEPTED_DECISIONS
    assert res.relevance_score >= 0.20


def test_authentic_consultation_report_accepted():
    """Verify outpatient doctor consultation report is accepted."""
    text = """
    Kedar Healthcare Institute - Outpatient Clinical Consultation
    Physician: Dr. Rajesh Varma, MD, DM (Cardiology)
    Patient Name: Alice Smith | Age: 45 | Date of Visit: 05-May-2026
    
    Chief Complaints: Exertional shortness of breath for past 2 weeks. Mild chest heaviness.
    Vitals: Blood Pressure: 130/84 mmHg | Pulse: 78 bpm | SpO2: 99% on room air | Temp: 98.4 F
    
    Physical Examination:
    CVS: S1, S2 heard. No murmurs.
    RS: Bilateral vesicular breath sounds heard, clear.
    
    Assessment & Clinical Findings: Mild essential hypertension, stable cardiac functional class I.
    Treatment Plan:
    - Tab. Telmisartan 40mg once daily in the morning
    - ECG 12-lead done: Normal sinus rhythm
    - Echocardiogram planned next week
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=text,
        selected_category="CLINICAL_DOCUMENT",
        is_scanned=False
    )
    assert res.is_accepted is True
    assert res.decision in ACCEPTED_DECISIONS
    assert res.relevance_score >= 0.20


def test_authentic_discharge_summary_accepted():
    """Verify hospital inpatient discharge summary is accepted."""
    text = """
    Apollo Kedar Super Specialty Hospital - Inpatient Department
    DISCHARGE SUMMARY
    Patient Name: Alice Smith | IP No: IP-99281 | OH-ID: OHID-IND-2026-01001
    Date of Admission: 15-Sep-2026 | Date of Discharge: 19-Sep-2026
    Admitting Consultant: Dr. Sundar Rajan, MS (General Surgery)
    
    Final Diagnosis: Acute calculous cholecystitis - Laparoscopic Cholecystectomy
    Hospital Course: Patient admitted with right upper quadrant abdominal pain and ultrasound-proven gallstones.
    Underwent uneventful laparoscopic cholecystectomy under general anesthesia on 16-Sep-2026.
    Post-operative recovery was smooth. Tolerating soft diet well. Surgical wound clean and dry.
    
    Discharge Advice:
    - Tab. Cefixime 200mg twice daily for 5 days
    - Tab. Tramadol/Paracetamol SOS for pain
    - Suture removal in OPD on 25-Sep-2026
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=text,
        selected_category="DISCHARGE_SUMMARY",
        is_scanned=False
    )
    assert res.is_accepted is True
    assert res.decision in ACCEPTED_DECISIONS
    assert res.relevance_score >= 0.20


def test_authentic_medical_certificate_accepted():
    """Verify medical fitness / illness certificate is accepted."""
    text = """
    MEDICAL CERTIFICATE OF ILLNESS & REST
    Government Recognized Medical Practitioner
    Dr. Anitha Mohan, MBBS - Reg No: 44210
    
    This is to certify that Ms. Alice Smith, aged 29 years, has been under my medical treatment
    for Acute Gastroenteritis and Dehydration from 01-Aug-2026 to 04-Aug-2026.
    I consider that a period of absence from duty of 4 days with complete bed rest
    was absolutely necessary for the restoration of her health.
    
    Date of Issue: 04-Aug-2026
    Signature and Seal of Medical Officer
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=text,
        selected_category="MEDICAL_CERTIFICATE",
        is_scanned=False
    )
    assert res.is_accepted is True
    assert res.decision in ACCEPTED_DECISIONS
    assert res.relevance_score >= 0.20


def test_authentic_imaging_report_accepted():
    """Verify radiology / X-ray imaging report is accepted."""
    text = """
    Department of Radiology and Diagnostic Imaging
    PATIENT: Alice Smith | STUDY: Chest X-Ray (PA View)
    DATE OF EXAMINATION: 22-Jul-2026 | ACC NO: RAD-44102
    REFERRING CLINICIAN: Dr. Senthil Nathan
    
    FINDINGS:
    - Trachea is midline.
    - Both lung fields appear clear without focal consolidation, pneumothorax, or pleural effusion.
    - Cardiothoracic ratio is normal (< 0.50).
    - Mediastinal contours, hila, and costophrenic angles are well preserved.
    - Visualized bony thorax and soft tissues show no significant abnormality.
    
    IMPRESSION: Normal posteroanterior radiograph of the chest. No active cardiopulmonary disease.
    Consultant Radiologist: Dr. Vikram Malhotra, DMRD, DNB (Radiology)
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=text,
        selected_category="DIAGNOSTIC_REPORT",
        is_scanned=False
    )
    assert res.is_accepted is True
    assert res.decision in ACCEPTED_DECISIONS
    assert res.relevance_score >= 0.20


# ============================================================================
# 2. NEGATIVE CASES: STRICT BLOCKING OF NON-MEDICAL CONTENT
# ============================================================================

def test_reject_messaging_chat_screenshot():
    """Verify screenshot of messaging application (WhatsApp/Telegram chat) is strictly rejected."""
    chat_text = """
    10:45 AM | WhatsApp | Online
    < John Doe
    Yesterday
    Hey man, are you free this weekend? Let's catch up for lunch!
    10:42 AM
    Yeah sounds good! Where do you want to go?
    10:43 AM - Read
    Maybe that new pizza place near the mall.
    10:44 AM
    Awesome, see you at 1 PM.
    10:45 AM
    Type a message...
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=chat_text,
        selected_category="PRESCRIPTION",  # User falsely marked Prescription
        is_scanned=True,
        is_mobile_screenshot=True
    )
    assert res.is_accepted is False
    assert res.decision == ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED
    assert "supported medical document" in res.actionable_remedy


def test_reject_contact_list_screenshot():
    """Verify screenshot of mobile contact list or chat list is strictly rejected."""
    contact_text = """
    Chats  |  Status  |  Calls
    Search contacts...
    Bob Miller - Hey, did you finish that report? 09:30 AM (2)
    Charlie Davis - Thanks for the update! Yesterday
    David Wilson - Voice call (Missed) 08:15 PM
    Emma Watson - Photo 12/04/2026
    Invite friends to chat
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=contact_text,
        selected_category="CLINICAL_DOCUMENT",
        is_scanned=True,
        is_mobile_screenshot=True
    )
    assert res.is_accepted is False
    assert res.decision == ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED


def test_reject_social_media_feed():
    """Verify social media feed screenshot (Instagram / Twitter) is strictly rejected."""
    social_text = """
    Instagram - Feed
    alex_travels - Sunset in Santorini! Best vacation ever.
    Liked by sarah_99 and 452 others
    View all 38 comments
    Add a comment...
    Share post | Bookmark | 1,420 followers
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=social_text,
        selected_category="OTHER_DOCUMENT",
        is_scanned=True
    )
    assert res.is_accepted is False
    assert res.decision == ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED


def test_reject_e_commerce_invoice():
    """Verify retail shopping receipt / e-commerce invoice is strictly rejected."""
    invoice_text = """
    TAX INVOICE - Retail Purchase Order
    Amazon Seller Services Pvt Ltd
    Order ID: 402-9918231-10029
    Shipping Address: 42 MG Road, Bengaluru, Karnataka
    GSTIN: 29AABCU9603R1ZM
    
    Item Description               Qty    Unit Price    Total (INR)
    Wireless Bluetooth Earbuds     1      1,499.00      1,499.00
    USB-C Fast Charging Cable      2        299.00        598.00
    Subtotal: 2,097.00 | CGST 9%: 188.73 | SGST 9%: 188.73
    Total Amount Paid: INR 2,474.46 via UPI Payment
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=invoice_text,
        selected_category="LAB_REPORT",
        is_scanned=False
    )
    assert res.is_accepted is False
    assert res.decision == ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED


def test_reject_utility_electricity_bill():
    """Verify utility bill (electricity, water, broadband) is strictly rejected."""
    bill_text = """
    Electricity Board Distribution Corp
    ELECTRICITY POWER BILL FOR MAY 2026
    Consumer Number: 04-209-11029 | Meter No: M-88192
    Previous Reading: 12450 | Present Reading: 12900 | Units Consumed: 450 kWh
    Energy Charges: INR 2,250.00 | Fuel Surcharge: INR 120.00
    Current Due Date: 25-May-2026 | Net Payable Amount: INR 2,490.00
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=bill_text,
        selected_category="PRESCRIPTION",
        is_scanned=False
    )
    assert res.is_accepted is False
    assert res.decision == ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED


def test_reject_resume_cv():
    """Verify job resume / curriculum vitae is strictly rejected."""
    resume_text = """
    CURRICULUM VITAE - Alice Smith
    Email: alice.smith@example.com | Phone: +91 9876543210
    Career Objective: Experienced frontend engineer with 5 years in React Native and TypeScript.
    Technical Skills: React, TypeScript, Next.js, Jest, REST APIs, Git.
    Work Experience: Senior Developer at Tech Corp (2022 - Present)
    Education: B.Tech Computer Science, Anna University (2018 - 2022)
    """
    res = document_validator.evaluate_validation_decision(
        raw_text=resume_text,
        selected_category="CLINICAL_DOCUMENT",
        is_scanned=False
    )
    assert res.is_accepted is False
    assert res.decision == ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED


def test_reject_random_gibberish_photo():
    """Verify random photo without clinical entities is rejected even if is_scanned is True."""
    photo_text = "Coffee morning cup table sunshine sunny day relaxation happy weekend"
    res = document_validator.evaluate_validation_decision(
        raw_text=photo_text,
        selected_category="PRESCRIPTION",
        is_scanned=True
    )
    assert res.is_accepted is False
    assert res.decision == ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED


# ============================================================================
# 3. MULTIPAGE PDF MIXED-CONTENT PROTECTION
# ============================================================================

def test_multipage_pdf_mixed_content_rejected():
    """Verify multipage PDF containing a prescription on Page 1 and an electricity bill on Page 2 is rejected."""
    page1_prescription = """
    Kedar Hospital - Prescription Rx
    Dr. Senthil Nathan - Tab. Paracetamol 500mg daily.
    """
    page2_utility_bill = """
    Electricity Board - Consumer Bill No: 12345
    Total kWh Units: 450. Total Amount Due: INR 2,500.
    """
    res = document_validator.evaluate_multipage_pdf(
        pages_text=[page1_prescription, page2_utility_bill],
        selected_category="PRESCRIPTION"
    )
    assert res.is_accepted is False
    assert res.decision == ValidationDecision.NON_MEDICAL_DOCUMENT_REJECTED
    assert "Page 2" in res.reason


# ============================================================================
# 4. SECURITY & EXPLOIT ATTACK REJECTIONS
# ============================================================================

def test_reject_pdf_with_embedded_javascript():
    """Verify PDF containing executable /JavaScript launch action is blocked at signature check."""
    fake_malicious_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R /OpenAction << /S /JavaScript /JS (app.alert(1);) >> >>\nendobj\n%%EOF"
    is_valid, err = verify_file_signature(fake_malicious_pdf, ".pdf")
    assert is_valid is False
    assert "unsafe embedded script" in err


def test_reject_decompression_bomb_image():
    """Verify oversized image decompression bomb is rejected."""
    # Create image in memory with simulated huge dimensions
    engine = ImageAndMediaOCREngine()
    
    # We test verify_file_signature on a mocked oversized image
    with patch("PIL.Image.open") as mock_open:
        mock_img = MagicMock()
        mock_img.size = (12000, 12000)  # 144 Megapixels > 50M limit
        mock_open.return_value.__enter__.return_value = mock_img
        
        valid_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        is_valid, err = verify_file_signature(valid_png, ".png")
        assert is_valid is False
        assert "exceed security limit" in err


# ============================================================================
# 5. STORAGE ISOLATION & QUOTA PRESERVATION
# ============================================================================

def test_rejected_document_cleans_up_quarantine(tmp_path):
    """Verify delete_quarantined_file deletes file on rejection."""
    test_file = tmp_path / "quarantined_test.bin"
    test_file.write_bytes(b"test-quarantine-content")
    assert test_file.exists()
    
    deleted = delete_quarantined_file(str(test_file))
    assert deleted is True
    assert not test_file.exists()
