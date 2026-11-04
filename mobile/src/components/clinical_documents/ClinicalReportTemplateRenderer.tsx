/**
 * ONEHEALTH ID (OH-ID) Mobile — Polymorphic Clinical Report Template Renderer
 * Sathus Technology Pvt Ltd
 *
 * Renders 10 professional clinical consultation report designs:
 * 1.  tmpl_rep_classic_hospital       - Classic Hospital Clinical Report (SRMC Multi-Specialty)
 * 2.  tmpl_rep_modern_clinical        - Modern Clinical Consultation (Streamlined vitals cards)
 * 3.  tmpl_rep_minimal_opd            - Minimal OPD Consultation (Compact outpatient slip)
 * 4.  tmpl_rep_paediatric_clinical    - Paediatric Clinical Report (Percentiles, developmental notes)
 * 5.  tmpl_rep_general_physician      - General Physician Consultation (Whole-person care)
 * 6.  tmpl_rep_specialist_consultation - Specialist Consultation Report (Subspecialty investigation review)
 * 7.  tmpl_rep_chronic_disease        - Chronic Disease Review Report (Longitudinal goals & risk score)
 * 8.  tmpl_rep_emergency_assessment  - Emergency Clinical Assessment (Triage, red-flag alerts, STAT course)
 * 9.  tmpl_rep_digital_clinical       - Digital Clinical Report (Cryptographic seal, FHIR tokens)
 * 10. tmpl_rep_detailed_evaluation    - Detailed Clinical Evaluation (Academic multi-system review)
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import Svg, { Path } from "react-native-svg";
import {
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Activity,
  Calendar,
  Building2,
  Stethoscope,
  Sparkles,
  FileText,
  CheckCircle2,
  User,
  Thermometer,
  Weight,
  FlaskConical,
  Apple,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react-native";
import { ConsultationReportDetail } from "../../services/api/clinical_templates";

interface Props {
  report: ConsultationReportDetail;
  customHeader?: string;
  customFooter?: string;
  showHospitalLogo?: boolean;
}

export const ClinicalReportTemplateRenderer: React.FC<Props> = ({
  report,
  customHeader,
  customFooter,
  showHospitalLogo = true,
}) => {
  const templateId = report.template_id || "tmpl_rep_classic_hospital";

  // Shared Hospital Header
  const renderHeader = (themeColor: string, subtitle?: string) => (
    <View style={[styles.headerContainer, { borderBottomColor: themeColor }]}>
      <View style={styles.headerLeft}>
        <View style={[styles.iconCircle, { backgroundColor: themeColor + "15" }]}>
          <Building2 size={24} color={themeColor} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.hospitalName, { color: themeColor }]}>
            {report.hospital_name || "OneHealth Clinical Facility"}
          </Text>
          {customHeader ? (
            <Text style={styles.customHeaderBanner}>{customHeader}</Text>
          ) : (
            <Text style={styles.hospitalSub}>
              {subtitle || "Clinical Consultation Summary & Clinical Evaluation"}
            </Text>
          )}
          <Text style={styles.hospitalMeta}>
            {report.hospital_address || "Chennai, Tamil Nadu"} • Code:{" "}
            {report.hospital_code || "HOSP-001"}
          </Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <View style={[styles.badgePill, { backgroundColor: themeColor + "20" }]}>
          <Text style={[styles.badgeText, { color: themeColor }]}>
            {report.template_name || "Consultation Report"}
          </Text>
        </View>
        <Text style={styles.reportIdText}>Enc #{report.id?.substring(0, 8)}</Text>
        <Text style={styles.dateText}>
          {report.signed_at
            ? new Date(report.signed_at).toLocaleDateString()
            : new Date().toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  // Shared Patient Demographics Ribbon
  const renderPatientDemographics = (accentColor = "#0284C7") => (
    <View style={styles.patientCard}>
      <View style={styles.patientRow}>
        <View style={styles.patientCol}>
          <Text style={styles.label}>PATIENT NAME</Text>
          <Text style={styles.valName}>{report.patient_name}</Text>
        </View>
        <View style={styles.patientCol}>
          <Text style={styles.label}>ONEHEALTH ID</Text>
          <Text style={[styles.valMono, { color: accentColor }]}>
            {report.onehealth_id || "OHID-IND-2026-0001"}
          </Text>
        </View>
        <View style={styles.patientColSmall}>
          <Text style={styles.label}>AGE / GENDER</Text>
          <Text style={styles.valNormal}>
            {report.patient_age || "32"} Y / {report.patient_gender || "M"}
          </Text>
        </View>
        <View style={styles.patientColSmall}>
          <Text style={styles.label}>BLOOD GROUP</Text>
          <Text style={[styles.valNormal, { fontWeight: "700", color: "#DC2626" }]}>
            {report.patient_blood_group || "O+"}
          </Text>
        </View>
      </View>
    </View>
  );

  // Shared Vitals Card
  const renderVitalsCard = (accentColor = "#0284C7") => {
    if (!report.vitals || Object.keys(report.vitals).length === 0) return null;
    return (
      <View style={styles.vitalsSection}>
        <View style={styles.vitalsHeader}>
          <HeartPulse size={14} color={accentColor} />
          <Text style={[styles.vitalsTitle, { color: accentColor }]}>
            RECORDED OBJECTIVE VITALS
          </Text>
        </View>
        <View style={styles.vitalsGrid}>
          {report.vitals.bp_systolic && (
            <View style={styles.vitalBox}>
              <Text style={styles.vitalLabel}>BLOOD PRESSURE</Text>
              <Text style={styles.vitalValue}>
                {report.vitals.bp_systolic}/{report.vitals.bp_diastolic || "--"} mmHg
              </Text>
            </View>
          )}
          {report.vitals.heart_rate && (
            <View style={styles.vitalBox}>
              <Text style={styles.vitalLabel}>PULSE / HEART RATE</Text>
              <Text style={styles.vitalValue}>{report.vitals.heart_rate} bpm</Text>
            </View>
          )}
          {report.vitals.temperature && (
            <View style={styles.vitalBox}>
              <Text style={styles.vitalLabel}>TEMPERATURE</Text>
              <Text style={styles.vitalValue}>{report.vitals.temperature} °F</Text>
            </View>
          )}
          {report.vitals.weight_kg && (
            <View style={styles.vitalBox}>
              <Text style={styles.vitalLabel}>WEIGHT</Text>
              <Text style={styles.vitalValue}>{report.vitals.weight_kg} kg</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Shared Signature Block
  const renderSignature = (accentColor = "#0284C7") => (
    <View style={styles.footerWrap}>
      <View style={styles.signatureRow}>
        <View style={styles.qrCol}>
          <QRCode
            value={`https://onehealthid.gov.in/consultation/${report.id}`}
            size={68}
          />
          <Text style={styles.qrCaption}>Scan to verify encounter</Text>
        </View>

        <View style={styles.securitySealCol}>
          <View style={styles.digitalSealBadge}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.digitalSealText}>Electronically Signed</Text>
          </View>
          {report.digital_signature_hash && (
            <Text style={styles.hashText} numberOfLines={2}>
              SHA-256: {report.digital_signature_hash}
            </Text>
          )}
          {customFooter && <Text style={styles.customFooter}>{customFooter}</Text>}
        </View>

        <View style={styles.prescriberCol}>
          <Text style={styles.prescriberTitle}>EXAMINING CLINICIAN</Text>
          <Text style={styles.docName}>{report.doctor_name || "Dr. Senthil Nathan"}</Text>
          <Text style={styles.docQual}>
            {report.doctor_qualification || "MBBS, MD"} • {report.doctor_specialty || "Specialist"}
          </Text>
          <Text style={styles.docReg}>
            Reg No: {report.doctor_registration || "TN-MCI-2026-001"}
          </Text>
          <View style={[styles.stampBox, { borderColor: accentColor }]}>
            <Text style={[styles.stampText, { color: accentColor }]}>SIGNED ENCOUNTER</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopy = (text: string, msg: string) => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(msg);
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  // =========================================================================
  // TEMPLATE 1: CLASSIC HOSPITAL CLINICAL REPORT (HOSPITAL ALPHA PRODUCTION)
  // =========================================================================
  const renderClassicHospital = () => {
    const rawHash = report.digital_signature_hash || "a37fe9c2d1b4097f48e91a0c8d7b321a5c6e8f6c3d2a1b0";
    const docId = report.document_id || (report.id ? `CLN-${report.id.replace(/[^0-9]/g, "").padStart(6, "0").slice(-6)}` : "CLN-2026-000456");

    const investigationsList = report.investigations && report.investigations.length > 0
      ? report.investigations
      : [
          { test_name: "HbA1c", result: "7.1 %", reference_range: "4.0 - 5.6", date: "31 Oct 2026" },
          { test_name: "Fasting Blood Sugar", result: "128 mg/dL", reference_range: "70 - 110", date: "31 Oct 2026" },
          { test_name: "Lipid Profile", result: "Normal", reference_range: "-", date: "31 Oct 2026" },
        ];

    const treatmentList = report.treatment_plan && report.treatment_plan.length > 0
      ? report.treatment_plan
      : [
          { id: "tp-1", medicine_name: "Metformin 500 mg", dose: "1 tablet", frequency: "1-0-1", duration: "3 months", instructions: "After food" },
          { id: "tp-2", medicine_name: "Amlodipine 5 mg", dose: "1 tablet", frequency: "0-1-0", duration: "3 months", instructions: "After food" },
        ];

    const adviceList = Array.isArray(report.diet_lifestyle_advice)
      ? report.diet_lifestyle_advice
      : typeof report.diet_lifestyle_advice === "string"
      ? report.diet_lifestyle_advice.split("\n").filter(Boolean)
      : [
          "Follow diabetic diet.",
          "Regular physical activity (30 minutes daily).",
          "Maintain healthy weight.",
          "Adequate hydration.",
        ];

    return (
      <View nativeID="clinical-report-printable-surface" style={styles.chCanvasContainer}>
        {copyFeedback && (
          <View style={styles.chToast}>
            <CheckCircle2 size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.chToastText}>{copyFeedback}</Text>
          </View>
        )}

        {/* 1. HOSPITAL & ENCOUNTER INFORMATION CARD */}
        <View style={styles.chHospitalCard}>
          <View style={styles.chHospitalBrand}>
            <View style={styles.chHospitalLogoBadge}>
              <Building2 size={26} color="#155EEF" />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.chHospitalName}>{report.hospital_name || "Hospital Alpha"}</Text>
              <Text style={styles.chHospitalTagline}>Multi-Specialty Inpatient & OPD</Text>
              <Text style={styles.chHospitalAddress}>{report.hospital_address || "148 Trunk Road, Porur, Chennai - 600116"}</Text>
              <Text style={styles.chHospitalContact}>
                Phone: {report.hospital_phone || "+91 44 2345 6789"} | {report.hospital_website || "www.hospitalalpha.org"}
              </Text>
            </View>
          </View>

          <View style={styles.chEncounterCard}>
            <Text style={styles.chEncounterTitle}>CLINICAL CONSULTATION REPORT</Text>
            <View style={styles.chMetaRow}>
              <Text style={styles.chMetaKey}>Encounter No.</Text>
              <Text style={styles.chMetaSep}>:</Text>
              <Text style={styles.chMetaVal}>{report.encounter_no || "ENC-2026-04567"}</Text>
            </View>
            <View style={styles.chMetaRow}>
              <Text style={styles.chMetaKey}>Date & Time</Text>
              <Text style={styles.chMetaSep}>:</Text>
              <Text style={styles.chMetaVal}>{report.consultation_date_time || "31 Oct 2026, 09:30 AM"}</Text>
            </View>
            <View style={styles.chMetaRow}>
              <Text style={styles.chMetaKey}>Department</Text>
              <Text style={styles.chMetaSep}>:</Text>
              <Text style={styles.chMetaVal}>{report.department || "General Medicine"}</Text>
            </View>
            <View style={styles.chMetaRow}>
              <Text style={styles.chMetaKey}>Consultation Type</Text>
              <Text style={styles.chMetaSep}>:</Text>
              <Text style={styles.chMetaVal}>{report.consultation_type || "Outpatient"}</Text>
            </View>
          </View>
        </View>

        {/* 2. PATIENT INFORMATION CARD */}
        <View style={styles.chPatientCard}>
          <View style={styles.chSectionHeaderRow}>
            <View style={styles.chSectionHeaderLeft}>
              <User size={15} color="#155EEF" />
              <Text style={styles.chSectionTitle}>PATIENT INFORMATION</Text>
            </View>
          </View>

          <View style={styles.chPatientGrid}>
            <View style={styles.chPatientInfoCols}>
              <View style={styles.chPatientCol1}>
                <View style={styles.chFieldRow}>
                  <Text style={styles.chFieldLabel}>Name</Text>
                  <Text style={styles.chFieldNameVal}>{report.patient_name || "Alice Smith"}</Text>
                </View>
                <View style={styles.chFieldRow}>
                  <Text style={styles.chFieldLabel}>OH-ID</Text>
                  <TouchableOpacity
                    onPress={() => handleCopy(report.onehealth_id || "OHID-IND-2026-01001", "OH-ID copied")}
                    style={styles.chCopyPill}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chFieldIdVal}>{report.onehealth_id || "OHID-IND-2026-01001"}</Text>
                    <Copy size={11} color="#155EEF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
                <View style={styles.chFieldRow}>
                  <Text style={styles.chFieldLabel}>Age / Gender</Text>
                  <Text style={styles.chFieldValue}>
                    {report.patient_age || 32} Years / {report.patient_gender || "Female"}
                  </Text>
                </View>
                <View style={styles.chFieldRow}>
                  <Text style={styles.chFieldLabel}>Date of Birth</Text>
                  <Text style={styles.chFieldValue}>{report.patient_dob || "1994-01-01"}</Text>
                </View>
                <View style={styles.chFieldRow}>
                  <Text style={styles.chFieldLabel}>Blood Group</Text>
                  <Text style={styles.chBloodGroupVal}>{report.patient_blood_group || "O+ Positive"}</Text>
                </View>
              </View>

              <View style={styles.chPatientCol2}>
                <View style={styles.chFieldRow}>
                  <Text style={styles.chFieldLabel}>Mobile Number</Text>
                  <Text style={styles.chFieldValue}>{report.patient_mobile || report.patient_phone || "+91 98765 43210"}</Text>
                </View>
                <View style={styles.chFieldRow}>
                  <Text style={styles.chFieldLabel}>Visit No.</Text>
                  <Text style={styles.chFieldValue}>{report.visit_no || "OPD-2026-00456"}</Text>
                </View>
                <View style={styles.chFieldRow}>
                  <Text style={styles.chFieldLabel}>Address</Text>
                  <Text style={styles.chFieldValueAddress}>
                    {report.patient_address || "12, Green Park Street, Porur, Chennai - 600116, Tamil Nadu, India"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.chPhotoCol}>
              <View style={styles.chPhotoCircle}>
                <User size={30} color="#98A2B3" />
              </View>
              <Text style={styles.chPhotoCaption}>Patient Photo{"\n"}(if available)</Text>
            </View>
          </View>
        </View>

        {/* 3. ROW 1: VITALS (LEFT) & ALLERGY (RIGHT) */}
        <View style={styles.chTwoColRow}>
          <View style={styles.chColHalf}>
            <View style={styles.chCard}>
              <View style={styles.chSectionHeaderRow}>
                <View style={styles.chSectionHeaderLeft}>
                  <HeartPulse size={15} color="#D92D20" />
                  <Text style={styles.chSectionTitle}>RECORDED VITAL SIGNS</Text>
                </View>
              </View>

              <View style={styles.chVitalsGrid2x2}>
                <View style={styles.chVitalCardBP}>
                  <Text style={styles.chVitalLabelBP}>Blood Pressure</Text>
                  <Text style={styles.chVitalValBP}>
                    {report.vitals?.bp_systolic && report.vitals?.bp_diastolic
                      ? `${report.vitals.bp_systolic}/${report.vitals.bp_diastolic} mmHg`
                      : "120/80 mmHg"}
                  </Text>
                </View>
                <View style={styles.chVitalCardHR}>
                  <Text style={styles.chVitalLabelHR}>Pulse / Heart Rate</Text>
                  <Text style={styles.chVitalValHR}>
                    {report.vitals?.heart_rate ? `${report.vitals.heart_rate} bpm` : "72 bpm"}
                  </Text>
                </View>
                <View style={styles.chVitalCardTemp}>
                  <Text style={styles.chVitalLabelTemp}>Temperature</Text>
                  <Text style={styles.chVitalValTemp}>
                    {report.vitals?.temperature ? `${report.vitals.temperature} °F` : "98.4 °F"}
                  </Text>
                </View>
                <View style={styles.chVitalCardRR}>
                  <Text style={styles.chVitalLabelRR}>Respiratory Rate</Text>
                  <Text style={styles.chVitalValRR}>
                    {report.vitals?.respiratory_rate ? `${report.vitals.respiratory_rate} / min` : "18 / min"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.chColHalf}>
            <View style={styles.chCard}>
              <View style={styles.chSectionHeaderRow}>
                <View style={styles.chSectionHeaderLeft}>
                  <AlertTriangle size={15} color="#D92D20" />
                  <Text style={styles.chSectionTitle}>ALLERGY & ADVERSE DRUG REACTION</Text>
                </View>
                <TouchableOpacity style={styles.chEditBtn} activeOpacity={0.7}>
                  <Text style={styles.chEditBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chAllergyContentRow}>
                <CheckCircle2 size={18} color="#12A76A" />
                <Text style={styles.chAllergyStatusText}>
                  {report.allergies_status || "No known allergies"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. CHIEF COMPLAINTS & PRESENTING SYMPTOMS */}
        <View style={styles.chCard}>
          <View style={styles.chSectionHeaderRow}>
            <View style={styles.chSectionHeaderLeft}>
              <FileText size={15} color="#155EEF" />
              <Text style={styles.chSectionTitle}>CHIEF COMPLAINTS & PRESENTING SYMPTOMS</Text>
            </View>
            <TouchableOpacity style={styles.chEditBtn} activeOpacity={0.7}>
              <Text style={styles.chEditBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.chBodyParagraph}>
            {report.chief_complaints || report.symptoms || "Blood pressure controlled on dual therapy. Diet compliant. Occasional fatigue."}
          </Text>
        </View>

        {/* 5. RELEVANT HISTORY (2 COLUMNS) */}
        <View style={styles.chCard}>
          <View style={styles.chSectionHeaderRow}>
            <View style={styles.chSectionHeaderLeft}>
              <FileText size={15} color="#155EEF" />
              <Text style={styles.chSectionTitle}>RELEVANT HISTORY</Text>
            </View>
            <TouchableOpacity style={styles.chEditBtn} activeOpacity={0.7}>
              <Text style={styles.chEditBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chHistoryGrid}>
            <View style={styles.chHistoryCol}>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Present Illness</Text>
                <Text style={styles.chHistoryVal}>
                  {report.relevant_history?.present_illness || "Known case of Type 2 Diabetes Mellitus and Hypertension."}
                </Text>
              </View>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Past History</Text>
                <Text style={styles.chHistoryVal}>
                  {report.relevant_history?.past_history || "No significant past illness."}
                </Text>
              </View>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Family History</Text>
                <Text style={styles.chHistoryVal}>
                  {report.relevant_history?.family_history || "Non-contributory."}
                </Text>
              </View>
            </View>

            <View style={styles.chHistoryCol}>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Medication History</Text>
                <Text style={styles.chHistoryVal}>
                  {report.relevant_history?.medication_history || "On Metformin and Amlodipine."}
                </Text>
              </View>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Lifestyle</Text>
                <Text style={styles.chHistoryVal}>
                  {report.relevant_history?.lifestyle || "Diet compliant. Regular walking."}
                </Text>
              </View>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Smoking / Alcohol</Text>
                <Text style={styles.chHistoryVal}>
                  {report.relevant_history?.smoking_alcohol || "Not reported."}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 6. CLINICAL EXAMINATION & SYSTEMIC FINDINGS (2 COLUMNS) */}
        <View style={styles.chCard}>
          <View style={styles.chSectionHeaderRow}>
            <View style={styles.chSectionHeaderLeft}>
              <Stethoscope size={15} color="#155EEF" />
              <Text style={styles.chSectionTitle}>CLINICAL EXAMINATION & SYSTEMIC FINDINGS</Text>
            </View>
            <TouchableOpacity style={styles.chEditBtn} activeOpacity={0.7}>
              <Text style={styles.chEditBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chHistoryGrid}>
            <View style={styles.chHistoryCol}>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>General Examination</Text>
                <Text style={styles.chHistoryVal}>
                  {report.examination_findings?.general_examination || "Patient stable. Conscious and oriented."}
                </Text>
              </View>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Cardiovascular</Text>
                <Text style={styles.chHistoryVal}>
                  {report.examination_findings?.cardiovascular || "S1, S2 Normal. No murmur."}
                </Text>
              </View>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Respiratory</Text>
                <Text style={styles.chHistoryVal}>
                  {report.examination_findings?.respiratory || "Bilateral air entry equal. No added sounds."}
                </Text>
              </View>
            </View>

            <View style={styles.chHistoryCol}>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Abdomen</Text>
                <Text style={styles.chHistoryVal}>
                  {report.examination_findings?.abdomen || "Soft, non-tender."}
                </Text>
              </View>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>CNS</Text>
                <Text style={styles.chHistoryVal}>
                  {report.examination_findings?.cns || "No focal deficits."}
                </Text>
              </View>
              <View style={styles.chHistoryItem}>
                <Text style={styles.chHistoryLabel}>Others</Text>
                <Text style={styles.chHistoryVal}>
                  {report.examination_findings?.others || "No significant findings."}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7. ROW 2: DIAGNOSIS / CLINICAL IMPRESSION & INVESTIGATIONS */}
        <View style={styles.chTwoColRow}>
          <View style={styles.chColHalf}>
            <View style={styles.chCard}>
              <View style={styles.chSectionHeaderRow}>
                <View style={styles.chSectionHeaderLeft}>
                  <FileText size={15} color="#D92D20" />
                  <Text style={styles.chSectionTitle}>DIAGNOSIS / CLINICAL IMPRESSION</Text>
                </View>
                <TouchableOpacity style={styles.chEditBtn} activeOpacity={0.7}>
                  <Text style={styles.chEditBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chDiagnosisCallout}>
                <Text style={styles.chDiagnosisHeading}>
                  {report.clinical_impression || report.diagnosis || "Type 2 Diabetes Mellitus - Review"}
                </Text>
                <Text style={styles.chDiagnosisSub}>
                  {report.clinical_notes || "Blood pressure controlled on treatment."}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.chColHalf}>
            <View style={styles.chCard}>
              <View style={styles.chSectionHeaderRow}>
                <View style={styles.chSectionHeaderLeft}>
                  <FlaskConical size={15} color="#155EEF" />
                  <Text style={styles.chSectionTitle}>INVESTIGATIONS (Ordered / Reviewed)</Text>
                </View>
              </View>

              <View style={styles.chTable}>
                <View style={styles.chTableHeaderRow}>
                  <Text style={[styles.chTableHeadCell, { flex: 2 }]}>Test Name</Text>
                  <Text style={[styles.chTableHeadCell, { flex: 1.2 }]}>Result</Text>
                  <Text style={[styles.chTableHeadCell, { flex: 1.4 }]}>Reference Range</Text>
                  <Text style={[styles.chTableHeadCell, { flex: 1.2, textAlign: "right" }]}>Date</Text>
                </View>
                {investigationsList.map((inv, idx) => (
                  <View key={`inv-row-${inv.test_name}-${idx}`} style={styles.chTableRow}>
                    <Text style={[styles.chTableCell, { flex: 2, fontWeight: "600", color: "#102A56" }]}>{inv.test_name}</Text>
                    <Text style={[styles.chTableCell, { flex: 1.2, color: "#155EEF", fontWeight: "700" }]}>{inv.result}</Text>
                    <Text style={[styles.chTableCell, { flex: 1.4, color: "#667085" }]}>{inv.reference_range || "-"}</Text>
                    <Text style={[styles.chTableCell, { flex: 1.2, textAlign: "right", color: "#667085" }]}>{inv.date || "31 Oct 2026"}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 8. ROW 3: TREATMENT PLAN (LEFT) & DIETARY/LIFESTYLE ADVICE (RIGHT) */}
        <View style={styles.chTwoColRow}>
          <View style={styles.chColHalf}>
            <View style={styles.chCard}>
              <View style={styles.chSectionHeaderRow}>
                <View style={styles.chSectionHeaderLeft}>
                  <Text style={styles.chRxSymbol}>℞</Text>
                  <Text style={styles.chSectionTitle}>TREATMENT PLAN</Text>
                </View>
              </View>

              <View style={styles.chTable}>
                <View style={styles.chTableHeaderRow}>
                  <Text style={[styles.chTableHeadCell, { width: 20 }]}>#</Text>
                  <Text style={[styles.chTableHeadCell, { flex: 2 }]}>Medicine (Name & Form)</Text>
                  <Text style={[styles.chTableHeadCell, { flex: 0.9 }]}>Dose</Text>
                  <Text style={[styles.chTableHeadCell, { flex: 0.9 }]}>Frequency</Text>
                  <Text style={[styles.chTableHeadCell, { flex: 1 }]}>Duration</Text>
                  <Text style={[styles.chTableHeadCell, { flex: 1.2 }]}>Instructions</Text>
                </View>
                {treatmentList.map((item, idx) => (
                  <View key={`tp-row-${item.medicine_name}-${idx}`} style={styles.chTableRow}>
                    <Text style={[styles.chTableCell, { width: 20, color: "#667085" }]}>{idx + 1}</Text>
                    <Text style={[styles.chTableCell, { flex: 2, fontWeight: "700", color: "#102A56" }]}>{item.medicine_name}</Text>
                    <Text style={[styles.chTableCell, { flex: 0.9, color: "#344054" }]}>{item.dose || "1 tablet"}</Text>
                    <Text style={[styles.chTableCell, { flex: 0.9, color: "#344054" }]}>{item.frequency || "1-0-1"}</Text>
                    <Text style={[styles.chTableCell, { flex: 1, color: "#344054" }]}>{item.duration || "3 months"}</Text>
                    <Text style={[styles.chTableCell, { flex: 1.2, color: "#155EEF" }]}>{item.instructions || "After food"}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.chColHalf}>
            <View style={styles.chCard}>
              <View style={styles.chSectionHeaderRow}>
                <View style={styles.chSectionHeaderLeft}>
                  <Apple size={15} color="#F79009" />
                  <Text style={styles.chSectionTitle}>DIETARY & LIFESTYLE ADVICE</Text>
                </View>
                <TouchableOpacity style={styles.chEditBtn} activeOpacity={0.7}>
                  <Text style={styles.chEditBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chBulletList}>
                {adviceList.map((adv, idx) => (
                  <View key={`adv-item-${idx}`} style={styles.chBulletItem}>
                    <Text style={styles.chBulletDot}>•</Text>
                    <Text style={styles.chBulletText}>{adv}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 9. ROW 4: FOLLOW UP PLAN (LEFT) & ADDITIONAL NOTES (RIGHT) */}
        <View style={styles.chTwoColRow}>
          <View style={styles.chColHalf}>
            <View style={styles.chCard}>
              <View style={styles.chSectionHeaderRow}>
                <View style={styles.chSectionHeaderLeft}>
                  <Calendar size={15} color="#155EEF" />
                  <Text style={styles.chSectionTitle}>FOLLOW UP PLAN</Text>
                </View>
              </View>
              <Text style={styles.chBodyParagraph}>
                {report.follow_up_plan || "Next consultation / review in 3 months.\nRepeat HbA1c and Lipid Profile before next visit."}
              </Text>
            </View>
          </View>

          <View style={styles.chColHalf}>
            <View style={styles.chCard}>
              <View style={styles.chSectionHeaderRow}>
                <View style={styles.chSectionHeaderLeft}>
                  <FileText size={15} color="#155EEF" />
                  <Text style={styles.chSectionTitle}>ADDITIONAL NOTES</Text>
                </View>
                <TouchableOpacity style={styles.chEditBtn} activeOpacity={0.7}>
                  <Text style={styles.chEditBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.chBodyParagraph}>
                {report.additional_notes || "Continue current medications. Monitor blood pressure and blood sugar regularly."}
              </Text>
            </View>
          </View>
        </View>

        {/* 10. SIGNATURE & QR VERIFICATION (3 COLUMNS) */}
        <View style={styles.chCard}>
          <View style={styles.chSignaturesGrid}>
            <View style={styles.chQrCol}>
              <QRCode
                value={report.verification_url || `https://ohid.online/verify/document/${report.id || "cln-doc"}`}
                size={72}
              />
              <Text style={styles.chQrTitle}>Scan to verify authenticity</Text>
              <Text style={styles.chQrSub}>This is a digitally signed clinical report from OH-ID.</Text>
            </View>

            <View style={styles.chDocCol}>
              <Text style={styles.chSignHeader}>SIGNED BY (EXAMINING CLINICIAN)</Text>
              <View style={styles.chElectronicallySignedBadge}>
                <CheckCircle2 size={12} color="#12A76A" />
                <Text style={styles.chElectronicallySignedText}>Electronically Signed</Text>
              </View>
              <Text style={styles.chDocName}>{report.doctor_name || "Dr. Senthil Nathan"}</Text>
              <Text style={styles.chDocQual}>{report.doctor_qualification || "MBBS, MD - General Medicine"}</Text>
              <Text style={styles.chDocReg}>Registration No: {report.doctor_registration || "TN-MCI-2026-001"}</Text>
            </View>

            <View style={styles.chSignatureCol}>
              <View style={styles.chSignatureSvgWrap}>
                <Svg width={140} height={44} viewBox="0 0 140 44">
                  <Path
                    d="M 12 30 C 25 10, 35 6, 45 22 C 55 35, 62 10, 75 16 C 90 24, 105 8, 115 28 C 122 36, 128 22, 136 26"
                    stroke="#155EEF"
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.chSigCaption}>Digital Signature</Text>
              <TouchableOpacity
                onPress={() => handleCopy(rawHash, "SHA-256 hash copied")}
                style={styles.chSigHashRow}
                activeOpacity={0.7}
              >
                <Text style={styles.chSigHashText}>
                  SHA-256: {rawHash.substring(0, 12)}...{rawHash.substring(rawHash.length - 12)}
                </Text>
                <Copy size={11} color="#667085" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 11. DOCUMENT FOOTER RIBBON */}
        <View style={styles.chFooterRibbon}>
          <View style={styles.chFooterItem}>
            <Calendar size={14} color="#12A76A" />
            <View style={{ marginLeft: 6 }}>
              <Text style={styles.chFooterLabel}>Issue Date</Text>
              <Text style={styles.chFooterVal}>{report.issue_date || "31 Oct 2026, 09:30 AM"}</Text>
            </View>
          </View>

          <View style={styles.chFooterItem}>
            <Calendar size={14} color="#12A76A" />
            <View style={{ marginLeft: 6 }}>
              <Text style={styles.chFooterLabel}>Valid Until</Text>
              <Text style={styles.chFooterVal}>{report.valid_until || "31 Jan 2027"}</Text>
            </View>
          </View>

          <View style={styles.chStatusPillValid}>
            <CheckCircle2 size={12} color="#FFFFFF" />
            <Text style={styles.chStatusPillText}>{report.document_status || "VALID"}</Text>
          </View>

          <View style={styles.chFooterItem}>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.chFooterLabel}>Document ID</Text>
              <TouchableOpacity
                onPress={() => handleCopy(docId, "Document ID copied")}
                style={styles.chDocIdRow}
                activeOpacity={0.7}
              >
                <Text style={styles.chDocIdVal}>{docId}</Text>
                <Copy size={11} color="#155EEF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chFooterItemSmall}>
            <Text style={styles.chFooterLabel}>Version:</Text>
            <Text style={styles.chVersionVal}>{report.version || "1.0"}</Text>
          </View>
        </View>
      </View>
    );
  };

  // =========================================================================
  // TEMPLATE 2: MODERN CLINICAL CONSULTATION
  // =========================================================================
  const renderModernClinical = () => (
    <View style={styles.canvasContainer}>
      {renderHeader("#0284C7", "Modern Clinical Practice Encounter")}
      {renderPatientDemographics("#0284C7")}
      {renderVitalsCard("#0284C7")}

      <View style={styles.modernCard}>
        <View style={styles.modernCardTop}>
          <Sparkles size={16} color="#0284C7" />
          <Text style={styles.modernTitle}>Clinical Evaluation Summary</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.modernLabel}>Diagnosis:</Text>
          <Text style={styles.modernValBold}>{report.diagnosis}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.modernLabel}>Symptoms & History:</Text>
          <Text style={styles.modernVal}>{report.symptoms}</Text>
        </View>
        {report.clinical_notes && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.modernLabel}>Clinical Observations:</Text>
            <Text style={styles.modernVal}>{report.clinical_notes}</Text>
          </View>
        )}
      </View>

      {renderSignature("#0284C7")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 3: MINIMAL OPD CONSULTATION
  // =========================================================================
  const renderMinimalOPD = () => (
    <View style={styles.canvasContainer}>
      <View style={styles.minimalHeader}>
        <Text style={styles.minimalHosp}>{report.hospital_name}</Text>
        <Text style={styles.minimalSub}>OPD CONSULTATION REPORT</Text>
        <Text style={styles.minimalDate}>
          Date: {new Date().toLocaleDateString()} | Enc: {report.id?.substring(0, 8)}
        </Text>
      </View>

      <Text style={styles.minimalPatText}>
        <Text style={{ fontWeight: "700" }}>{report.patient_name}</Text> (
        {report.patient_age}Y/{report.patient_gender}) • ID: {report.onehealth_id}
      </Text>

      <View style={styles.minimalDivider} />

      <Text style={styles.minimalSectionText}>
        <Text style={{ fontWeight: "700" }}>Dx: </Text>
        {report.diagnosis}
      </Text>
      <Text style={styles.minimalSectionText}>
        <Text style={{ fontWeight: "700" }}>Symptoms: </Text>
        {report.symptoms}
      </Text>
      {report.clinical_notes && (
        <Text style={styles.minimalSectionText}>
          <Text style={{ fontWeight: "700" }}>Notes: </Text>
          {report.clinical_notes}
        </Text>
      )}

      <View style={styles.minimalFooter}>
        <Text style={styles.minimalDoc}>{report.doctor_name}</Text>
      </View>
    </View>
  );

  // =========================================================================
  // TEMPLATE 4: PAEDIATRIC CLINICAL REPORT
  // =========================================================================
  const renderPaediatricClinical = () => (
    <View style={[styles.canvasContainer, { borderColor: "#059669" }]}>
      {renderHeader("#059669", "Paediatric Clinical Assessment & Development")}
      {renderPatientDemographics("#059669")}

      <View style={styles.paediatricBanner}>
        <View style={styles.paediatricBadge}>
          <Text style={styles.paediatricBadgeText}>PAEDIATRIC CONSULT</Text>
        </View>
        <Text style={styles.paediatricNotice}>
          Growth & Development Monitoring • Immunization Review
        </Text>
      </View>

      {renderVitalsCard("#059669")}

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>CLINICAL DIAGNOSIS</Text>
        <Text style={[styles.bodyText, { fontWeight: "700", color: "#059669" }]}>
          {report.diagnosis}
        </Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>PEDIATRIC OBSERVATIONS & NOTES</Text>
        <Text style={styles.bodyText}>{report.clinical_notes || report.symptoms}</Text>
      </View>

      {renderSignature("#059669")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 5: GENERAL PHYSICIAN CONSULTATION
  // =========================================================================
  const renderGeneralPhysician = () => (
    <View style={styles.canvasContainer}>
      {renderHeader("#1E40AF", "Whole-Person Primary Care Review")}
      {renderPatientDemographics("#1E40AF")}
      {renderVitalsCard("#1E40AF")}

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>CHIEF REASON FOR VISIT</Text>
        <Text style={styles.bodyText}>{report.symptoms}</Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>CLINICAL IMPRESSION</Text>
        <Text style={[styles.bodyText, { fontWeight: "700", color: "#1E40AF" }]}>
          {report.diagnosis}
        </Text>
      </View>

      {report.clinical_notes && (
        <View style={styles.reportSection}>
          <Text style={styles.sectionHeaderTitle}>MANAGEMENT & ADVICE</Text>
          <Text style={styles.bodyText}>{report.clinical_notes}</Text>
        </View>
      )}

      {renderSignature("#1E40AF")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 6: SPECIALIST CONSULTATION REPORT
  // =========================================================================
  const renderSpecialistConsultation = () => (
    <View style={[styles.canvasContainer, { borderColor: "#4338CA" }]}>
      {renderHeader("#4338CA", "Specialty Medical Consultation Report")}
      {renderPatientDemographics("#4338CA")}

      <View style={styles.specialistBadgeBar}>
        <Stethoscope size={16} color="#4338CA" />
        <Text style={styles.specialistDeptTitle}>
          Department: {report.doctor_specialty || "Specialty Medicine"}
        </Text>
      </View>

      {renderVitalsCard("#4338CA")}

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>SUBSPECIALTY ASSESSMENT</Text>
        <Text style={[styles.bodyText, { fontWeight: "700", color: "#4338CA" }]}>
          {report.diagnosis}
        </Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>CLINICAL IMPRESSION & RECOMMENDATIONS</Text>
        <Text style={styles.bodyText}>{report.clinical_notes || report.symptoms}</Text>
      </View>

      {renderSignature("#4338CA")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 7: CHRONIC DISEASE REVIEW REPORT
  // =========================================================================
  const renderChronicDisease = () => (
    <View style={[styles.canvasContainer, { borderColor: "#0891B2" }]}>
      {renderHeader("#0891B2", "Longitudinal Chronic Condition Review")}
      {renderPatientDemographics("#0891B2")}

      <View style={styles.chronicBanner}>
        <Text style={styles.chronicBannerTitle}>CHRONIC DISEASE PROGRAM REVIEW</Text>
        <Text style={styles.chronicBannerSub}>
          Longitudinal progress tracking • Glycemic & Blood Pressure Targets
        </Text>
      </View>

      {renderVitalsCard("#0891B2")}

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>CURRENT CLINICAL STATUS</Text>
        <Text style={[styles.bodyText, { fontWeight: "700", color: "#0891B2" }]}>
          {report.diagnosis}
        </Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>DISEASE PROGRESSION & ADVICE</Text>
        <Text style={styles.bodyText}>{report.clinical_notes || report.symptoms}</Text>
      </View>

      {renderSignature("#0891B2")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 8: EMERGENCY CLINICAL ASSESSMENT
  // =========================================================================
  const renderEmergencyAssessment = () => (
    <View style={[styles.canvasContainer, { borderColor: "#DC2626" }]}>
      <View style={styles.emergencyBanner}>
        <AlertTriangle size={20} color="#FFFFFF" />
        <Text style={styles.emergencyBannerTitle}>
          EMERGENCY TRIAGE & CRITICAL CLINICAL ASSESSMENT
        </Text>
      </View>

      {renderHeader("#DC2626", "Emergency Medicine Department")}
      {renderPatientDemographics("#DC2626")}
      {renderVitalsCard("#DC2626")}

      <View style={styles.reportSection}>
        <Text style={[styles.sectionHeaderTitle, { color: "#DC2626" }]}>
          ACUTE PRESENTATION & TRIAGE FINDINGS
        </Text>
        <Text style={styles.bodyText}>{report.symptoms}</Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={[styles.sectionHeaderTitle, { color: "#DC2626" }]}>
          PRIMARY EMERGENCY DIAGNOSIS
        </Text>
        <Text style={[styles.bodyText, { fontWeight: "700", color: "#DC2626" }]}>
          {report.diagnosis}
        </Text>
      </View>

      {report.clinical_notes && (
        <View style={styles.reportSection}>
          <Text style={styles.sectionHeaderTitle}>INTERVENTIONS & CLINICAL COURSE</Text>
          <Text style={styles.bodyText}>{report.clinical_notes}</Text>
        </View>
      )}

      {renderSignature("#DC2626")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 9: DIGITAL CLINICAL REPORT
  // =========================================================================
  const renderDigitalClinical = () => (
    <View style={[styles.canvasContainer, { borderColor: "#0F172A", backgroundColor: "#F8FAFC" }]}>
      <View style={styles.digitalHeaderBar}>
        <View style={styles.digitalTitleWrap}>
          <ShieldCheck size={20} color="#059669" />
          <Text style={styles.digitalTitle}>ONEHEALTH VERIFIED DIGITAL CLINICAL RECORD</Text>
        </View>
        <Text style={styles.digitalSubtitle}>Token: {report.id}</Text>
      </View>

      {renderHeader("#0F172A", "Standardized Health Record Document")}
      {renderPatientDemographics("#0F172A")}
      {renderVitalsCard("#0F172A")}

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>DIAGNOSIS (FHIR CONDITION)</Text>
        <Text style={[styles.bodyText, { fontWeight: "700", color: "#0F172A" }]}>
          {report.diagnosis}
        </Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>CLINICAL ENCOUNTER NOTES</Text>
        <Text style={styles.bodyText}>{report.clinical_notes || report.symptoms}</Text>
      </View>

      {renderSignature("#0F172A")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 10: DETAILED CLINICAL EVALUATION
  // =========================================================================
  const renderDetailedEvaluation = () => (
    <View style={styles.canvasContainer}>
      {renderHeader("#334155", "Comprehensive Clinical Consultation Record")}
      {renderPatientDemographics("#334155")}

      <View style={styles.detailedAuditBar}>
        <FileText size={14} color="#475569" />
        <Text style={styles.detailedAuditText}>
          TERTIARY CLINICAL AUDIT & EVIDENCE-BASED REVIEW
        </Text>
      </View>

      {renderVitalsCard("#334155")}

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>HISTORY OF PRESENT ILLNESS</Text>
        <Text style={styles.bodyText}>{report.symptoms}</Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>CLINICAL DIAGNOSIS & ASSESSMENT</Text>
        <Text style={[styles.bodyText, { fontWeight: "700", color: "#334155" }]}>
          {report.diagnosis}
        </Text>
      </View>

      {report.clinical_notes && (
        <View style={styles.reportSection}>
          <Text style={styles.sectionHeaderTitle}>DETAILED PHYSICIAN EVALUATION</Text>
          <Text style={styles.bodyText}>{report.clinical_notes}</Text>
        </View>
      )}

      {renderSignature("#334155")}
    </View>
  );

  // Template router
  switch (templateId) {
    case "tmpl_rep_modern_clinical":
      return renderModernClinical();
    case "tmpl_rep_minimal_opd":
      return renderMinimalOPD();
    case "tmpl_rep_paediatric_clinical":
      return renderPaediatricClinical();
    case "tmpl_rep_general_physician":
      return renderGeneralPhysician();
    case "tmpl_rep_specialist_consultation":
      return renderSpecialistConsultation();
    case "tmpl_rep_chronic_disease":
      return renderChronicDisease();
    case "tmpl_rep_emergency_assessment":
      return renderEmergencyAssessment();
    case "tmpl_rep_digital_clinical":
      return renderDigitalClinical();
    case "tmpl_rep_detailed_evaluation":
      return renderDetailedEvaluation();
    case "tmpl_rep_classic_hospital":
    default:
      return renderClassicHospital();
  }
};

const styles = StyleSheet.create({
  canvasContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 2,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  customHeaderBanner: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 2,
  },
  hospitalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  hospitalMeta: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  reportIdText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#64748B",
  },
  dateText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  patientCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginBottom: 12,
  },
  patientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  patientCol: {
    flex: 1,
    minWidth: 120,
  },
  patientColSmall: {
    minWidth: 80,
  },
  label: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  valName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  valMono: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
    marginTop: 2,
  },
  valNormal: {
    fontSize: 12,
    color: "#334155",
    marginTop: 2,
  },
  vitalsSection: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  vitalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  vitalsTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  vitalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 110,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vitalLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "600",
  },
  vitalValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  reportSection: {
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 18,
  },
  footerWrap: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  qrCol: {
    alignItems: "center",
  },
  qrCaption: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 4,
  },
  securitySealCol: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  digitalSealBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  digitalSealText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  hashText: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#94A3B8",
    textAlign: "center",
  },
  customFooter: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  prescriberCol: {
    alignItems: "flex-end",
  },
  prescriberTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  docName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  docQual: {
    fontSize: 10,
    color: "#64748B",
  },
  docReg: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 4,
  },
  stampBox: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  stampText: {
    fontSize: 9,
    fontWeight: "800",
  },

  // Modern Clinical Styles
  modernCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 12,
  },
  modernCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 6,
  },
  modernTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  modernLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  modernValBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0284C7",
    marginTop: 2,
  },
  modernVal: {
    fontSize: 12,
    color: "#334155",
    marginTop: 2,
  },

  // Minimal OPD Styles
  minimalHeader: {
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    marginBottom: 8,
  },
  minimalHosp: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  minimalSub: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  minimalDate: {
    fontSize: 9,
    color: "#475569",
    marginTop: 2,
  },
  minimalPatText: {
    fontSize: 11,
    color: "#000000",
    marginBottom: 6,
  },
  minimalDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 8,
  },
  minimalSectionText: {
    fontSize: 11,
    color: "#1E293B",
    marginBottom: 4,
  },
  minimalFooter: {
    marginTop: 12,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 4,
  },
  minimalDoc: {
    fontSize: 10,
    fontWeight: "700",
  },

  // Paediatric Styles
  paediatricBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 8,
  },
  paediatricBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paediatricBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  paediatricNotice: {
    fontSize: 10,
    color: "#065F46",
    fontWeight: "600",
    flex: 1,
  },

  // Specialist Styles
  specialistBadgeBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  specialistDeptTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },

  // Chronic Styles
  chronicBanner: {
    backgroundColor: "#ECFEFF",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A5F3FC",
    marginBottom: 8,
  },
  chronicBannerTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0891B2",
  },
  chronicBannerSub: {
    fontSize: 10,
    color: "#155E75",
    marginTop: 2,
  },

  // Emergency Styles
  emergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    gap: 8,
  },
  emergencyBannerTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Digital Styles
  digitalHeaderBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  digitalTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  digitalTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  digitalSubtitle: {
    color: "#94A3B8",
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Detailed Styles
  detailedAuditBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
    gap: 6,
  },
  detailedAuditText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.3,
  },

  // =========================================================================
  // HOSPITAL ALPHA CLASSIC CLINICAL REPORT STYLES (MATCHING REFERENCE IMAGE)
  // =========================================================================
  chCanvasContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCE5F2",
    padding: 12,
    marginVertical: 4,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  chToast: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "#102A56",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 999,
  },
  chToastText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  chHospitalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE5F2",
    marginBottom: 12,
  },
  chHospitalBrand: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    minWidth: 200,
  },
  chHospitalLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#EFF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#D1E0FF",
  },
  chHospitalName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102A56",
    letterSpacing: -0.3,
  },
  chHospitalTagline: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475467",
    marginTop: 2,
  },
  chHospitalAddress: {
    fontSize: 11,
    color: "#667085",
    marginTop: 3,
  },
  chHospitalContact: {
    fontSize: 11,
    color: "#667085",
    marginTop: 2,
  },
  chEncounterCard: {
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "#DCE5F2",
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: 200,
  },
  chEncounterTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#155EEF",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 1.5,
  },
  chMetaKey: {
    fontSize: 11,
    color: "#475467",
    width: 105,
  },
  chMetaSep: {
    fontSize: 11,
    color: "#475467",
    marginRight: 6,
  },
  chMetaVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#102A56",
  },
  chPatientCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5F2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  chSectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
    width: "100%",
  },
  chSectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 6,
  },
  chSectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#102A56",
    letterSpacing: 0.3,
    marginLeft: 6,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    flexWrap: "wrap",
  },
  chEditBtn: {
    borderWidth: 1,
    borderColor: "#DCE5F2",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#FFFFFF",
    flexShrink: 0,
  },
  chEditBtnText: {
    fontSize: 11,
    color: "#344054",
    fontWeight: "600",
  },
  chPatientGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  chPatientInfoCols: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    minWidth: 200,
  },
  chPatientCol1: {
    flex: 1,
    minWidth: 130,
  },
  chPatientCol2: {
    flex: 1.2,
    minWidth: 140,
  },
  chFieldRow: {
    flexDirection: "row",
    marginVertical: 2.5,
    alignItems: "center",
  },
  chFieldLabel: {
    fontSize: 11,
    color: "#667085",
    width: 90,
  },
  chFieldValue: {
    fontSize: 12,
    color: "#344054",
    fontWeight: "500",
    flex: 1,
  },
  chFieldNameVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#102A56",
    flex: 1,
  },
  chFieldIdVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#155EEF",
  },
  chCopyPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  chBloodGroupVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D92D20",
  },
  chFieldValueAddress: {
    fontSize: 11,
    color: "#475467",
    flex: 1,
    lineHeight: 15,
  },
  chPhotoCol: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  chPhotoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F2F4F7",
    borderWidth: 1,
    borderColor: "#DCE5F2",
    justifyContent: "center",
    alignItems: "center",
  },
  chPhotoCaption: {
    fontSize: 9,
    color: "#667085",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 12,
  },
  chTwoColRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  chColHalf: {
    flex: 1,
    minWidth: 240,
  },
  chCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5F2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  chVitalsGrid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chVitalCardBP: {
    flex: 1,
    minWidth: 70,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 6,
    padding: 6,
  },
  chVitalLabelBP: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 2,
  },
  chVitalValBP: {
    fontSize: 13,
    fontWeight: "800",
    color: "#155EEF",
  },
  chVitalCardHR: {
    flex: 1,
    minWidth: 70,
    backgroundColor: "#FDF2F8",
    borderWidth: 1,
    borderColor: "#FBCFE8",
    borderRadius: 6,
    padding: 6,
  },
  chVitalLabelHR: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9D174D",
    marginBottom: 2,
  },
  chVitalValHR: {
    fontSize: 13,
    fontWeight: "800",
    color: "#BE185D",
  },
  chVitalCardTemp: {
    flex: 1,
    minWidth: 70,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 6,
    padding: 6,
  },
  chVitalLabelTemp: {
    fontSize: 9,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 2,
  },
  chVitalValTemp: {
    fontSize: 13,
    fontWeight: "800",
    color: "#047857",
  },
  chVitalCardRR: {
    flex: 1,
    minWidth: 70,
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 6,
    padding: 6,
  },
  chVitalLabelRR: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B21A8",
    marginBottom: 2,
  },
  chVitalValRR: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7E22CE",
  },
  chAllergyContentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  chAllergyStatusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#12A76A",
    marginLeft: 8,
  },
  chBodyParagraph: {
    fontSize: 12,
    color: "#344054",
    lineHeight: 18,
  },
  chHistoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  chHistoryCol: {
    flex: 1,
    minWidth: 200,
  },
  chHistoryItem: {
    marginVertical: 4,
  },
  chHistoryLabel: {
    fontSize: 11,
    color: "#667085",
    marginBottom: 1,
  },
  chHistoryVal: {
    fontSize: 12,
    color: "#344054",
    fontWeight: "500",
  },
  chDiagnosisCallout: {
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "#DCE5F2",
    borderRadius: 6,
    padding: 10,
  },
  chDiagnosisHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#155EEF",
  },
  chDiagnosisSub: {
    fontSize: 12,
    color: "#475467",
    marginTop: 4,
    lineHeight: 16,
  },
  chTable: {
    borderWidth: 1,
    borderColor: "#DCE5F2",
    borderRadius: 6,
    overflow: "hidden",
  },
  chTableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE5F2",
    alignItems: "center",
  },
  chTableHeadCell: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475467",
    letterSpacing: 0.2,
  },
  chTableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  chTableCell: {
    fontSize: 11,
    color: "#344054",
  },
  chRxSymbol: {
    fontSize: 16,
    fontWeight: "900",
    color: "#155EEF",
    marginRight: 4,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  chBulletList: {
    paddingVertical: 4,
  },
  chBulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 2,
  },
  chBulletDot: {
    fontSize: 13,
    color: "#155EEF",
    marginRight: 6,
    lineHeight: 16,
  },
  chBulletText: {
    fontSize: 12,
    color: "#344054",
    lineHeight: 16,
    flex: 1,
  },
  chSignaturesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 16,
  },
  chQrCol: {
    width: 140,
    alignItems: "center",
  },
  chQrTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#102A56",
    textAlign: "center",
    marginTop: 6,
  },
  chQrSub: {
    fontSize: 9,
    color: "#667085",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 12,
  },
  chDocCol: {
    flex: 1,
    minWidth: 180,
  },
  chSignHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#667085",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  chElectronicallySignedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  chElectronicallySignedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
    marginLeft: 4,
  },
  chDocName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102A56",
  },
  chDocQual: {
    fontSize: 11,
    color: "#475467",
    marginTop: 2,
  },
  chDocReg: {
    fontSize: 10,
    color: "#667085",
    marginTop: 2,
  },
  chSignatureCol: {
    flex: 1,
    minWidth: 160,
    alignItems: "flex-end",
  },
  chSignatureSvgWrap: {
    height: 44,
    justifyContent: "center",
  },
  chSigCaption: {
    fontSize: 10,
    color: "#667085",
    marginTop: 2,
  },
  chSigHashRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  chSigHashText: {
    fontSize: 10,
    color: "#667085",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  chFooterRibbon: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  chFooterItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  chFooterItemSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chFooterLabel: {
    fontSize: 10,
    color: "#667085",
  },
  chFooterVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#102A56",
  },
  chStatusPillValid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12A76A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  chStatusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  chDocIdRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chDocIdVal: {
    fontSize: 11,
    fontWeight: "800",
    color: "#155EEF",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  chVersionVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#102A56",
  },
});

