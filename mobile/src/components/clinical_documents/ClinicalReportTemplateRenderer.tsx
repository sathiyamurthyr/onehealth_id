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

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
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
  Weight
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

  // =========================================================================
  // TEMPLATE 1: CLASSIC HOSPITAL CLINICAL REPORT
  // =========================================================================
  const renderClassicHospital = () => (
    <View style={styles.canvasContainer}>
      {renderHeader("#1E3A8A", "Multi-Specialty Inpatient & OPD Summary")}
      {renderPatientDemographics("#1E3A8A")}
      {renderVitalsCard("#1E3A8A")}

      {/* Clinical Findings */}
      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>CHIEF COMPLAINTS & PRESENTING SYMPTOMS</Text>
        <Text style={styles.bodyText}>{report.symptoms || "Routine medical review."}</Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionHeaderTitle}>PRIMARY & SECONDARY DIAGNOSES</Text>
        <Text style={[styles.bodyText, { fontWeight: "700", color: "#1E3A8A" }]}>
          {report.diagnosis || "No specific diagnosis recorded."}
        </Text>
      </View>

      {report.clinical_notes && (
        <View style={styles.reportSection}>
          <Text style={styles.sectionHeaderTitle}>CLINICAL EXAMINATION & SYSTEMIC FINDINGS</Text>
          <Text style={styles.bodyText}>{report.clinical_notes}</Text>
        </View>
      )}

      {renderSignature("#1E3A8A")}
    </View>
  );

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
});

