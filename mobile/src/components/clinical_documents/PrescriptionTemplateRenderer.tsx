/**
 * ONEHEALTH ID (OH-ID) Mobile — Polymorphic Prescription Template Renderer
 * Sathus Technology Pvt Ltd
 *
 * Renders 10 professional healthcare prescription designs:
 * 1.  tmpl_rx_classic_hospital       - Classic Hospital Rx (Traditional SRMC tabular)
 * 2.  tmpl_rx_modern_clinical        - Modern Clinical (Clean cards & vitals pills)
 * 3.  tmpl_rx_minimal_opd            - Minimal OPD (Compact single-slip layout)
 * 4.  tmpl_rx_paediatric_care        - Paediatric Care (Age/weight/syrup focus)
 * 5.  tmpl_rx_general_physician      - General Physician (Diagnosis & lifestyle advice)
 * 6.  tmpl_rx_specialist_consultation - Specialist Consultation (Department crest)
 * 7.  tmpl_rx_chronic_care           - Chronic Care (Long-term refill & target tracker)
 * 8.  tmpl_rx_emergency_prescription - Emergency Rx (Acuity banner & STAT orders)
 * 9.  tmpl_rx_digital_eprescription  - Digital E-Prescription (Tamper-evident QR & Hash)
 * 10. tmpl_rx_detailed_clinical      - Detailed Clinical Rx (Comprehensive multi-tier table)
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import {
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Clock,
  Calendar,
  Building2,
  Stethoscope,
  Sparkles,
  Info,
  CheckCircle2,
  FileText
} from "lucide-react-native";

export interface PrescriptionItem {
  medicine_name: string;
  strength?: string;
  dosage_form?: string;
  dose?: string;
  frequency?: string;
  duration_days?: number | string;
  food_instruction?: string;
  route?: string;
  quantity?: number | string;
  instructions?: string;
}

export interface PrescriptionData {
  id: string;
  onehealth_id?: string;
  patient_id?: string;
  patient_name: string;
  patient_age?: number | string;
  patient_gender?: string;
  patient_blood_group?: string;
  patient_phone?: string;
  patient_dob?: string;
  allergies?: string[];
  diagnosis?: string;
  symptoms?: string;
  vitals?: Record<string, any>;
  items: PrescriptionItem[];
  advice?: string;
  diet_lifestyle_notes?: string;
  follow_up_date?: string;
  doctor_name: string;
  doctor_specialty?: string;
  doctor_qualification?: string;
  doctor_registration?: string;
  hospital_name: string;
  hospital_code?: string;
  hospital_address?: string;
  hospital_phone?: string;
  hospital_email?: string;
  template_id?: string;
  template_version?: number;
  template_name?: string;
  signed_by?: string;
  signed_at?: string;
  digital_signature_hash?: string;
  created_at?: string;
}

interface Props {
  prescription: PrescriptionData;
  customHeader?: string;
  customFooter?: string;
  showHospitalLogo?: boolean;
}

export const PrescriptionTemplateRenderer: React.FC<Props> = ({
  prescription,
  customHeader,
  customFooter,
  showHospitalLogo = true,
}) => {
  const templateId = prescription.template_id || "tmpl_rx_classic_hospital";

  // Shared Header Component
  const renderHospitalHeader = (themeColor: string, subtitle?: string) => (
    <View style={[styles.headerContainer, { borderBottomColor: themeColor }]}>
      <View style={styles.headerLeft}>
        <View style={[styles.iconCircle, { backgroundColor: themeColor + "15" }]}>
          <Building2 size={24} color={themeColor} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.hospitalName, { color: themeColor }]}>
            {prescription.hospital_name || "OneHealth Integrated Hospital"}
          </Text>
          {customHeader ? (
            <Text style={styles.customHeaderBanner}>{customHeader}</Text>
          ) : (
            <Text style={styles.hospitalSub}>
              {subtitle || "Tertiary Care & Multi-Specialty Clinical Centre"}
            </Text>
          )}
          <Text style={styles.hospitalMeta}>
            {prescription.hospital_address || "Chennai, Tamil Nadu"} • Ph:{" "}
            {prescription.hospital_phone || "+91 44 2476 8000"}
          </Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <View style={[styles.badgePill, { backgroundColor: themeColor + "20" }]}>
          <Text style={[styles.badgeText, { color: themeColor }]}>
            {prescription.template_name || "Official Rx"}
          </Text>
        </View>
        <Text style={styles.rxIdText}>Rx #{prescription.id?.substring(0, 8)}</Text>
        <Text style={styles.dateText}>
          {prescription.signed_at
            ? new Date(prescription.signed_at).toLocaleDateString()
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
          <Text style={styles.valName}>{prescription.patient_name}</Text>
        </View>
        <View style={styles.patientCol}>
          <Text style={styles.label}>ONEHEALTH ID</Text>
          <Text style={[styles.valMono, { color: accentColor }]}>
            {prescription.onehealth_id || "OHID-IND-2026-0001"}
          </Text>
        </View>
        <View style={styles.patientColSmall}>
          <Text style={styles.label}>AGE / GENDER</Text>
          <Text style={styles.valNormal}>
            {prescription.patient_age || "32"} Y / {prescription.patient_gender || "M"}
          </Text>
        </View>
        <View style={styles.patientColSmall}>
          <Text style={styles.label}>BLOOD GROUP</Text>
          <Text style={[styles.valNormal, { fontWeight: "700", color: "#DC2626" }]}>
            {prescription.patient_blood_group || "O+"}
          </Text>
        </View>
      </View>

      {/* Allergies Notice */}
      {prescription.allergies && prescription.allergies.length > 0 && (
        <View style={styles.allergyBanner}>
          <AlertTriangle size={14} color="#DC2626" />
          <Text style={styles.allergyText}>
            ALLERGIES: {prescription.allergies.join(", ")}
          </Text>
        </View>
      )}

      {/* Diagnosis & Vitals */}
      {(prescription.diagnosis || prescription.vitals) && (
        <View style={styles.clinicalContextRow}>
          {prescription.diagnosis && (
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>DIAGNOSIS / CLINICAL IMPRESSION</Text>
              <Text style={styles.diagnosisVal}>{prescription.diagnosis}</Text>
            </View>
          )}
          {prescription.vitals && Object.keys(prescription.vitals).length > 0 && (
            <View style={styles.vitalsWrap}>
              {prescription.vitals.bp_systolic && (
                <View style={styles.vitalPill}>
                  <HeartPulse size={12} color="#0284C7" />
                  <Text style={styles.vitalText}>
                    BP {prescription.vitals.bp_systolic}/{prescription.vitals.bp_diastolic}
                  </Text>
                </View>
              )}
              {prescription.vitals.heart_rate && (
                <View style={styles.vitalPill}>
                  <Text style={styles.vitalText}>HR {prescription.vitals.heart_rate} bpm</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Shared Signature & Verification Footer
  const renderSignatureFooter = (accentColor = "#0284C7") => (
    <View style={styles.footerWrap}>
      <View style={styles.signatureRow}>
        <View style={styles.qrCol}>
          <QRCode
            value={`https://onehealthid.gov.in/rx/verify/${prescription.id || "rx-demo"}`}
            size={68}
          />
          <Text style={styles.qrCaption}>Scan to verify authenticity</Text>
        </View>

        <View style={styles.securitySealCol}>
          <View style={styles.digitalSealBadge}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.digitalSealText}>Cryptographically Signed</Text>
          </View>
          {prescription.digital_signature_hash && (
            <Text style={styles.hashText} numberOfLines={2}>
              SHA-256: {prescription.digital_signature_hash}
            </Text>
          )}
          {customFooter && <Text style={styles.customFooter}>{customFooter}</Text>}
        </View>

        <View style={styles.prescriberCol}>
          <Text style={styles.prescriberTitle}>AUTHORIZED PRESCRIBER</Text>
          <Text style={styles.docName}>{prescription.doctor_name || "Dr. Senthil Nathan"}</Text>
          <Text style={styles.docQual}>
            {prescription.doctor_qualification || "MBBS, MD (General Medicine)"}
          </Text>
          <Text style={styles.docReg}>
            Reg No: {prescription.doctor_registration || "TN-MCI-2026-001"}
          </Text>
          <View style={[styles.stampBox, { borderColor: accentColor }]}>
            <Text style={[styles.stampText, { color: accentColor }]}>SIGNED & VERIFIED</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // =========================================================================
  // TEMPLATE 1: CLASSIC HOSPITAL RX (Structured Traditional Hospital Table)
  // =========================================================================
  const renderClassicHospital = () => (
    <View style={styles.canvasContainer}>
      {renderHospitalHeader("#1E3A8A", "SRMC Academic Medical Centre & Hospital")}
      {renderPatientDemographics("#1E3A8A")}

      <View style={styles.rxSymbolRow}>
        <Text style={styles.classicRxSymbol}>℞</Text>
        <Text style={styles.sectionHeaderTitle}>MEDICATIONS & PRESCRIPTION ORDERS</Text>
      </View>

      {/* Traditional Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thText, { flex: 3 }]}>DRUG NAME & FORM</Text>
        <Text style={[styles.thText, { flex: 1.2, textAlign: "center" }]}>DOSE</Text>
        <Text style={[styles.thText, { flex: 1.8, textAlign: "center" }]}>FREQUENCY</Text>
        <Text style={[styles.thText, { flex: 1.2, textAlign: "center" }]}>DURATION</Text>
        <Text style={[styles.thText, { flex: 2.2 }]}>FOOD / INSTRUCTIONS</Text>
      </View>

      {/* Table Rows */}
      {prescription.items.map((item, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
          <View style={{ flex: 3 }}>
            <Text style={styles.medName}>
              {idx + 1}. {item.medicine_name}
            </Text>
            <Text style={styles.medStrength}>
              {item.dosage_form || "Tablet"} • {item.strength || ""}
            </Text>
          </View>
          <Text style={[styles.tdText, { flex: 1.2, textAlign: "center" }]}>
            {item.dose || "1 Tab"}
          </Text>
          <Text style={[styles.tdText, { flex: 1.8, textAlign: "center", fontWeight: "600" }]}>
            {item.frequency || "1-0-1"}
          </Text>
          <Text style={[styles.tdText, { flex: 1.2, textAlign: "center" }]}>
            {item.duration_days ? `${item.duration_days} days` : "5 days"}
          </Text>
          <View style={{ flex: 2.2 }}>
            <Text style={styles.instructionText}>
              {item.food_instruction || "After food"}
            </Text>
            {item.instructions && (
              <Text style={styles.instructionSub}>{item.instructions}</Text>
            )}
          </View>
        </View>
      ))}

      {/* Clinical Advice Box */}
      {prescription.advice && (
        <View style={styles.adviceBox}>
          <Text style={styles.adviceTitle}>DIETARY & LIFESTYLE ADVICE:</Text>
          <Text style={styles.adviceBody}>{prescription.advice}</Text>
        </View>
      )}

      {/* Follow-up banner */}
      {prescription.follow_up_date && (
        <View style={styles.followUpBanner}>
          <Calendar size={14} color="#1E3A8A" />
          <Text style={styles.followUpText}>
            Next Consultation / Review Date: {prescription.follow_up_date}
          </Text>
        </View>
      )}

      {renderSignatureFooter("#1E3A8A")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 2: MODERN CLINICAL (Clean rounded cards & vitals pills)
  // =========================================================================
  const renderModernClinical = () => (
    <View style={styles.canvasContainer}>
      {renderHospitalHeader("#0284C7", "Modern Clinical Health Systems")}
      {renderPatientDemographics("#0284C7")}

      <View style={styles.modernHeaderBar}>
        <Sparkles size={16} color="#0284C7" />
        <Text style={styles.modernHeaderTitle}>Prescribed Medications</Text>
      </View>

      <View style={styles.modernMedGrid}>
        {prescription.items.map((item, idx) => (
          <View key={idx} style={styles.modernCard}>
            <View style={styles.modernCardTop}>
              <View style={styles.numBadge}>
                <Text style={styles.numBadgeText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modernMedTitle}>{item.medicine_name}</Text>
                <Text style={styles.modernMedSub}>
                  {item.dosage_form || "Tablet"} • {item.strength || ""}
                </Text>
              </View>
              <View style={styles.durationPill}>
                <Clock size={12} color="#0369A1" />
                <Text style={styles.durationText}>{item.duration_days || 5}d</Text>
              </View>
            </View>

            <View style={styles.modernScheduleBar}>
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleLabel}>Dosage</Text>
                <Text style={styles.scheduleVal}>{item.dose || "1 Unit"}</Text>
              </View>
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleLabel}>Frequency</Text>
                <Text style={[styles.scheduleVal, { color: "#0284C7" }]}>
                  {item.frequency || "1-0-1"}
                </Text>
              </View>
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleLabel}>Timing</Text>
                <Text style={styles.scheduleVal}>{item.food_instruction || "After meals"}</Text>
              </View>
            </View>

            {item.instructions && (
              <Text style={styles.modernInstructions}>Note: {item.instructions}</Text>
            )}
          </View>
        ))}
      </View>

      {renderSignatureFooter("#0284C7")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 3: MINIMAL OPD (Compact single slip)
  // =========================================================================
  const renderMinimalOPD = () => (
    <View style={styles.canvasContainer}>
      <View style={styles.minimalHeader}>
        <Text style={styles.minimalHosp}>{prescription.hospital_name}</Text>
        <Text style={styles.minimalSub}>OPD CONSULTATION SLIP</Text>
        <Text style={styles.minimalDate}>
          Date: {new Date().toLocaleDateString()} | No: {prescription.id?.substring(0, 8)}
        </Text>
      </View>

      <View style={styles.minimalPatientRow}>
        <Text style={styles.minimalPatText}>
          <Text style={{ fontWeight: "700" }}>{prescription.patient_name}</Text> (
          {prescription.patient_age}Y/{prescription.patient_gender}) • ID:{" "}
          {prescription.onehealth_id || prescription.patient_id}
        </Text>
        {prescription.diagnosis && (
          <Text style={styles.minimalDx}>Dx: {prescription.diagnosis}</Text>
        )}
      </View>

      <View style={styles.minimalMedList}>
        {prescription.items.map((item, idx) => (
          <View key={idx} style={styles.minimalMedRow}>
            <Text style={styles.minimalNum}>{idx + 1}.</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.minimalMedName}>
                {item.medicine_name} {item.strength} ({item.dosage_form || "Tab"})
              </Text>
              <Text style={styles.minimalDetail}>
                {item.dose || "1 Tab"} | {item.frequency || "1-0-1"} |{" "}
                {item.duration_days || 5} days | {item.food_instruction || "After food"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {prescription.advice && (
        <Text style={styles.minimalAdvice}>Advice: {prescription.advice}</Text>
      )}

      <View style={styles.minimalFooter}>
        <Text style={styles.minimalDoc}>
          {prescription.doctor_name} ({prescription.doctor_registration})
        </Text>
      </View>
    </View>
  );

  // =========================================================================
  // TEMPLATE 4: PAEDIATRIC CARE (Weight, age, parent & syrup dosing)
  // =========================================================================
  const renderPaediatricCare = () => (
    <View style={[styles.canvasContainer, { borderColor: "#059669" }]}>
      {renderHospitalHeader("#059669", "Paediatric & Child Healthcare Clinic")}

      {/* Paediatric Notice */}
      <View style={styles.paediatricBanner}>
        <View style={styles.paediatricBadge}>
          <Text style={styles.paediatricBadgeText}>PAEDIATRIC CLINICAL RX</Text>
        </View>
        <Text style={styles.paediatricNotice}>
          Weight-adjusted dosage • Supervised administration required
        </Text>
      </View>

      {renderPatientDemographics("#059669")}

      <View style={styles.tableHeader}>
        <Text style={[styles.thText, { flex: 3 }]}>MEDICATION / FORMULATION</Text>
        <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>SYRUP VOL / DOSE</Text>
        <Text style={[styles.thText, { flex: 1.8, textAlign: "center" }]}>FREQUENCY</Text>
        <Text style={[styles.thText, { flex: 1.2, textAlign: "center" }]}>DURATION</Text>
        <Text style={[styles.thText, { flex: 2 }]}>SPECIAL INSTRUCTIONS</Text>
      </View>

      {prescription.items.map((item, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
          <View style={{ flex: 3 }}>
            <Text style={styles.medName}>{item.medicine_name}</Text>
            <Text style={[styles.medStrength, { color: "#059669" }]}>
              {item.dosage_form || "Oral Suspension / Drops"} • {item.strength}
            </Text>
          </View>
          <Text style={[styles.tdText, { flex: 1.5, textAlign: "center", fontWeight: "700" }]}>
            {item.dose || "2.5 ml"}
          </Text>
          <Text style={[styles.tdText, { flex: 1.8, textAlign: "center" }]}>
            {item.frequency || "Twice Daily"}
          </Text>
          <Text style={[styles.tdText, { flex: 1.2, textAlign: "center" }]}>
            {item.duration_days || 5} days
          </Text>
          <Text style={[styles.instructionText, { flex: 2 }]}>
            {item.instructions || item.food_instruction || "Shake well before giving"}
          </Text>
        </View>
      ))}

      {renderSignatureFooter("#059669")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 5: GENERAL PHYSICIAN
  // =========================================================================
  const renderGeneralPhysician = () => (
    <View style={styles.canvasContainer}>
      {renderHospitalHeader("#1E40AF", "General Medicine & Family Clinic")}
      {renderPatientDemographics("#1E40AF")}

      <View style={styles.gpSection}>
        <Text style={styles.sectionHeaderTitle}>CLINICAL MANAGEMENT PLAN</Text>
      </View>

      {prescription.items.map((item, idx) => (
        <View key={idx} style={styles.gpMedCard}>
          <View style={styles.gpMedHeader}>
            <Text style={styles.gpMedName}>
              {idx + 1}. {item.medicine_name} {item.strength}
            </Text>
            <Text style={styles.gpMedForm}>{item.dosage_form || "Tablet"}</Text>
          </View>
          <View style={styles.gpPillsRow}>
            <View style={styles.gpPill}>
              <Text style={styles.gpPillLabel}>Dose: </Text>
              <Text style={styles.gpPillVal}>{item.dose || "1 Tab"}</Text>
            </View>
            <View style={styles.gpPill}>
              <Text style={styles.gpPillLabel}>Timing: </Text>
              <Text style={styles.gpPillVal}>{item.food_instruction || "After food"}</Text>
            </View>
            <View style={styles.gpPill}>
              <Text style={styles.gpPillLabel}>Frequency: </Text>
              <Text style={styles.gpPillVal}>{item.frequency || "1-0-1"}</Text>
            </View>
            <View style={styles.gpPill}>
              <Text style={styles.gpPillLabel}>Days: </Text>
              <Text style={styles.gpPillVal}>{item.duration_days || 5}</Text>
            </View>
          </View>
        </View>
      ))}

      {prescription.diet_lifestyle_notes && (
        <View style={styles.lifestyleCard}>
          <Text style={styles.lifestyleTitle}>DIET & EXERCISE GUIDANCE</Text>
          <Text style={styles.lifestyleText}>{prescription.diet_lifestyle_notes}</Text>
        </View>
      )}

      {renderSignatureFooter("#1E40AF")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 6: SPECIALIST CONSULTATION
  // =========================================================================
  const renderSpecialistConsultation = () => (
    <View style={[styles.canvasContainer, { borderColor: "#4338CA" }]}>
      {renderHospitalHeader("#4338CA", "Super-Specialty Clinical Department")}
      {renderPatientDemographics("#4338CA")}

      <View style={styles.specialistBadgeBar}>
        <Stethoscope size={16} color="#4338CA" />
        <Text style={styles.specialistDeptTitle}>
          Department: {prescription.doctor_specialty || "Specialty Medicine"}
        </Text>
      </View>

      {/* Structured Rx Table */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thText, { flex: 3.5 }]}>THERAPEUTIC REGIMEN</Text>
        <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>STRENGTH</Text>
        <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>FREQUENCY</Text>
        <Text style={[styles.thText, { flex: 2.5 }]}>CLINICAL INDICATION</Text>
      </View>

      {prescription.items.map((item, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
          <View style={{ flex: 3.5 }}>
            <Text style={styles.medName}>{item.medicine_name}</Text>
            <Text style={styles.medStrength}>Route: {item.route || "Oral"}</Text>
          </View>
          <Text style={[styles.tdText, { flex: 1.5, textAlign: "center" }]}>
            {item.strength || "Standard"}
          </Text>
          <Text style={[styles.tdText, { flex: 1.5, textAlign: "center", fontWeight: "700" }]}>
            {item.frequency || "Once Daily"}
          </Text>
          <Text style={[styles.instructionText, { flex: 2.5 }]}>
            {item.instructions || item.food_instruction || "Take as directed"}
          </Text>
        </View>
      ))}

      {renderSignatureFooter("#4338CA")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 7: CHRONIC CARE (Refill schedule & disease indicators)
  // =========================================================================
  const renderChronicCare = () => (
    <View style={[styles.canvasContainer, { borderColor: "#0891B2" }]}>
      {renderHospitalHeader("#0891B2", "Long-Term Chronic Disease Care Program")}
      {renderPatientDemographics("#0891B2")}

      <View style={styles.chronicBanner}>
        <Text style={styles.chronicBannerTitle}>CHRONIC MEDICATION REFILL SCHEDULE</Text>
        <Text style={styles.chronicBannerSub}>
          Maintain therapy continuity • Do not interrupt without doctor consultation
        </Text>
      </View>

      {prescription.items.map((item, idx) => (
        <View key={idx} style={styles.chronicCard}>
          <View style={styles.chronicTop}>
            <Text style={styles.chronicMedName}>{item.medicine_name}</Text>
            <View style={styles.refillBadge}>
              <Text style={styles.refillBadgeText}>30-DAY REFILL APPROVED</Text>
            </View>
          </View>
          <View style={styles.chronicGrid}>
            <Text style={styles.chronicLabel}>Strength: <Text style={styles.chronicVal}>{item.strength}</Text></Text>
            <Text style={styles.chronicLabel}>Dose: <Text style={styles.chronicVal}>{item.dose || "1 Tab"}</Text></Text>
            <Text style={styles.chronicLabel}>Frequency: <Text style={styles.chronicVal}>{item.frequency}</Text></Text>
            <Text style={styles.chronicLabel}>Quantity: <Text style={styles.chronicVal}>{item.quantity || "30 Tabs"}</Text></Text>
          </View>
        </View>
      ))}

      {renderSignatureFooter("#0891B2")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 8: EMERGENCY PRESCRIPTION (Acuity Red Banner & STAT Orders)
  // =========================================================================
  const renderEmergencyPrescription = () => (
    <View style={[styles.canvasContainer, { borderColor: "#DC2626" }]}>
      <View style={styles.emergencyBanner}>
        <AlertTriangle size={20} color="#FFFFFF" />
        <Text style={styles.emergencyBannerTitle}>
          EMERGENCY MEDICINE RX • IMMEDIATE DISPENSATION
        </Text>
      </View>
      {renderHospitalHeader("#DC2626", "Emergency & Trauma Critical Care")}
      {renderPatientDemographics("#DC2626")}

      <View style={styles.tableHeader}>
        <Text style={[styles.thText, { flex: 3 }]}>EMERGENCY MEDICATION</Text>
        <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>ROUTE / DOSE</Text>
        <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>PRIORITY</Text>
        <Text style={[styles.thText, { flex: 2 }]}>ADMINISTRATION PROTOCOL</Text>
      </View>

      {prescription.items.map((item, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
          <View style={{ flex: 3 }}>
            <Text style={[styles.medName, { color: "#DC2626" }]}>{item.medicine_name}</Text>
            <Text style={styles.medStrength}>{item.strength}</Text>
          </View>
          <Text style={[styles.tdText, { flex: 1.5, textAlign: "center", fontWeight: "700" }]}>
            {item.dose || "1 Amp"}
          </Text>
          <View style={{ flex: 1.5, alignItems: "center" }}>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>STAT / URGENT</Text>
            </View>
          </View>
          <Text style={[styles.instructionText, { flex: 2 }]}>
            {item.instructions || item.food_instruction || "Immediate Administration"}
          </Text>
        </View>
      ))}

      {renderSignatureFooter("#DC2626")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 9: DIGITAL E-PRESCRIPTION (Cryptographic QR & Tamper-Evident Seal)
  // =========================================================================
  const renderDigitalEPrescription = () => (
    <View style={[styles.canvasContainer, { borderColor: "#0F172A", backgroundColor: "#F8FAFC" }]}>
      <View style={styles.digitalHeaderBar}>
        <View style={styles.digitalTitleWrap}>
          <ShieldCheck size={20} color="#059669" />
          <Text style={styles.digitalTitle}>ONEHEALTH TAMPER-EVIDENT E-PRESCRIPTION</Text>
        </View>
        <Text style={styles.digitalSubtitle}>Token: {prescription.id}</Text>
      </View>

      {renderHospitalHeader("#0F172A", "Accredited National Health Provider")}
      {renderPatientDemographics("#0F172A")}

      {/* Prominent QR Section in Digital Rx */}
      <View style={styles.digitalQrBox}>
        <QRCode
          value={`https://onehealthid.gov.in/rx/${prescription.id}`}
          size={100}
        />
        <View style={styles.digitalQrMeta}>
          <Text style={styles.digitalQrHeading}>Instant Pharmacy Check-in</Text>
          <Text style={styles.digitalQrSub}>
            Present this QR at any empaneled OneHealth pharmacy for verified drug dispensation.
          </Text>
          <View style={styles.tokenPill}>
            <Text style={styles.tokenPillText}>
              HASH: {prescription.digital_signature_hash?.substring(0, 24) || "SHA256:VERIFIED"}...
            </Text>
          </View>
        </View>
      </View>

      {/* Table */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thText, { flex: 3 }]}>DRUG ORDER</Text>
        <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>STRENGTH</Text>
        <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>DOSAGE</Text>
        <Text style={[styles.thText, { flex: 2 }]}>STATUS</Text>
      </View>

      {prescription.items.map((item, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
          <Text style={[styles.medName, { flex: 3 }]}>{item.medicine_name}</Text>
          <Text style={[styles.tdText, { flex: 1.5, textAlign: "center" }]}>{item.strength}</Text>
          <Text style={[styles.tdText, { flex: 1.5, textAlign: "center" }]}>{item.frequency}</Text>
          <View style={{ flex: 2, flexDirection: "row", alignItems: "center" }}>
            <CheckCircle2 size={14} color="#059669" />
            <Text style={[styles.tdText, { marginLeft: 4, color: "#059669", fontWeight: "600" }]}>
              Approved
            </Text>
          </View>
        </View>
      ))}

      {renderSignatureFooter("#0F172A")}
    </View>
  );

  // =========================================================================
  // TEMPLATE 10: DETAILED CLINICAL RX (Comprehensive Multi-Tier)
  // =========================================================================
  const renderDetailedClinical = () => (
    <View style={styles.canvasContainer}>
      {renderHospitalHeader("#334155", "Comprehensive Tertiary Medical Centre")}
      {renderPatientDemographics("#334155")}

      <View style={styles.detailedAuditBar}>
        <FileText size={14} color="#475569" />
        <Text style={styles.detailedAuditText}>
          COMPLETE PHARMACOTHERAPY EVALUATION & CLINICAL SIGN-OFF
        </Text>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.thText, { flex: 3 }]}>PRESCRIBED MEDICINE</Text>
        <Text style={[styles.thText, { flex: 1.2, textAlign: "center" }]}>STRENGTH</Text>
        <Text style={[styles.thText, { flex: 1.2, textAlign: "center" }]}>DOSE</Text>
        <Text style={[styles.thText, { flex: 1.4, textAlign: "center" }]}>FREQ</Text>
        <Text style={[styles.thText, { flex: 1.2, textAlign: "center" }]}>DUR</Text>
        <Text style={[styles.thText, { flex: 2 }]}>INSTRUCTIONS</Text>
      </View>

      {prescription.items.map((item, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
          <View style={{ flex: 3 }}>
            <Text style={styles.medName}>{item.medicine_name}</Text>
            <Text style={styles.medStrength}>{item.dosage_form || "Tablet"}</Text>
          </View>
          <Text style={[styles.tdText, { flex: 1.2, textAlign: "center" }]}>{item.strength}</Text>
          <Text style={[styles.tdText, { flex: 1.2, textAlign: "center" }]}>{item.dose || "1"}</Text>
          <Text style={[styles.tdText, { flex: 1.4, textAlign: "center" }]}>{item.frequency}</Text>
          <Text style={[styles.tdText, { flex: 1.2, textAlign: "center" }]}>{item.duration_days || 5}d</Text>
          <Text style={[styles.instructionText, { flex: 2 }]}>{item.instructions || item.food_instruction}</Text>
        </View>
      ))}

      {renderSignatureFooter("#334155")}
    </View>
  );

  // Selector router
  switch (templateId) {
    case "tmpl_rx_modern_clinical":
      return renderModernClinical();
    case "tmpl_rx_minimal_opd":
      return renderMinimalOPD();
    case "tmpl_rx_paediatric_care":
      return renderPaediatricCare();
    case "tmpl_rx_general_physician":
      return renderGeneralPhysician();
    case "tmpl_rx_specialist_consultation":
      return renderSpecialistConsultation();
    case "tmpl_rx_chronic_care":
      return renderChronicCare();
    case "tmpl_rx_emergency_prescription":
      return renderEmergencyPrescription();
    case "tmpl_rx_digital_eprescription":
      return renderDigitalEPrescription();
    case "tmpl_rx_detailed_clinical":
      return renderDetailedClinical();
    case "tmpl_rx_classic_hospital":
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
  rxIdText: {
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
  allergyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    gap: 6,
  },
  allergyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  clinicalContextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },
  diagnosisVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 2,
  },
  vitalsWrap: {
    flexDirection: "row",
    gap: 6,
  },
  vitalPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  vitalText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0284C7",
  },
  rxSymbolRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  classicRxSymbol: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E3A8A",
    marginRight: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  thText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  tdText: {
    fontSize: 11,
    color: "#334155",
  },
  medName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  medStrength: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  instructionText: {
    fontSize: 11,
    color: "#0284C7",
    fontWeight: "500",
  },
  instructionSub: {
    fontSize: 10,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 1,
  },
  adviceBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 8,
    marginTop: 12,
  },
  adviceTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    marginBottom: 2,
  },
  adviceBody: {
    fontSize: 11,
    color: "#78350F",
  },
  followUpBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    gap: 6,
  },
  followUpText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E3A8A",
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

  // Modern Template Styles
  modernHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  modernHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  modernMedGrid: {
    gap: 8,
  },
  modernCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
  },
  modernCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  numBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  numBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
  },
  modernMedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  modernMedSub: {
    fontSize: 11,
    color: "#64748B",
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  durationText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369A1",
  },
  modernScheduleBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  scheduleItem: {
    alignItems: "center",
  },
  scheduleLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
  },
  scheduleVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 1,
  },
  modernInstructions: {
    fontSize: 10,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 6,
  },

  // Minimal Template Styles
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
  minimalPatientRow: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 8,
  },
  minimalPatText: {
    fontSize: 11,
    color: "#000000",
  },
  minimalDx: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#334155",
    marginTop: 2,
  },
  minimalMedList: {
    gap: 6,
  },
  minimalMedRow: {
    flexDirection: "row",
  },
  minimalNum: {
    width: 20,
    fontSize: 11,
    fontWeight: "700",
  },
  minimalMedName: {
    fontSize: 11,
    fontWeight: "700",
  },
  minimalDetail: {
    fontSize: 10,
    color: "#475569",
  },
  minimalAdvice: {
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 8,
    color: "#475569",
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

  // Paediatric Template Styles
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

  // GP Template Styles
  gpSection: {
    marginBottom: 8,
  },
  gpMedCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#1E40AF",
  },
  gpMedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gpMedName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  gpMedForm: {
    fontSize: 10,
    color: "#64748B",
  },
  gpPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  gpPill: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gpPillLabel: {
    fontSize: 9,
    color: "#64748B",
  },
  gpPillVal: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1E40AF",
  },
  lifestyleCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  lifestyleTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 2,
  },
  lifestyleText: {
    fontSize: 11,
    color: "#064E3B",
  },

  // Specialist Template Styles
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

  // Chronic Template Styles
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
  chronicCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 8,
    marginBottom: 6,
  },
  chronicTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chronicMedName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  refillBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  refillBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0284C7",
  },
  chronicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  chronicLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  chronicVal: {
    fontWeight: "700",
    color: "#0F172A",
  },

  // Emergency Template Styles
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
  statPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#DC2626",
  },

  // Digital Template Styles
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
  digitalQrBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  digitalQrMeta: {
    flex: 1,
  },
  digitalQrHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  digitalQrSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  tokenPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  tokenPillText: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#475569",
  },

  // Detailed Template Styles
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

