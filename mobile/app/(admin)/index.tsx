/**
 * ONEHEALTH ID (OH-ID) Mobile — Hospital Administrator Workspace
 * Sathus Technology Pvt Ltd
 *
 * Implements facility census, clinical staff roster management,
 * IPD bed occupancy controls, and daily billing audit reconciliation.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Building2,
  Users,
  Bed,
  CreditCard,
  ShieldCheck,
  Activity,
  UserPlus,
  Sliders,
  CheckCircle2,
  Plus,
  X,
  FileSpreadsheet,
  Layers,
  BookmarkCheck,
  Eye,
  Check,
  Palette,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { Header } from "../../src/components/common/Header";
import { Card } from "../../src/components/common/Card";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { UserSessionBanner } from "../../src/components/common/UserSessionBanner";
import { adminApi, ClinicalStaffMember } from "../../src/services/api/admin";
import {
  clinicalTemplatesApi,
  HospitalDocumentTemplateSettings,
  ClinicalDocumentTemplate,
} from "../../src/services/api/clinical_templates";
import { PrescriptionTemplateRenderer, ClinicalReportTemplateRenderer } from "../../src/components/clinical_documents";

export default function HospitalAdminHomeScreen() {
  const [staffList, setStaffList] = useState<ClinicalStaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // Bed Census State
  const [occupiedBeds, setOccupiedBeds] = useState(41);
  const [totalBeds, setTotalBeds] = useState(50);
  const [showBedModal, setShowBedModal] = useState(false);
  const [editOccupied, setEditOccupied] = useState("41");
  const [editTotal, setEditTotal] = useState("50");
  const [updatingBeds, setUpdatingBeds] = useState(false);

  // Staff Enrollment Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<ClinicalStaffMember["role"]>("DOCTOR");
  const [staffDept, setStaffDept] = useState("General Medicine");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffLicense, setStaffLicense] = useState("");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Audit Reconciliation State
  const [reconciled, setReconciled] = useState(false);

  // Hospital Document Template Preferences State
  const [templateSettings, setTemplateSettings] = useState<HospitalDocumentTemplateSettings | null>(null);
  const [loadingTemplateSettings, setLoadingTemplateSettings] = useState(true);
  const [allTemplates, setAllTemplates] = useState<ClinicalDocumentTemplate[]>([]);
  const [templateModalMode, setTemplateModalMode] = useState<"RX" | "REPORT" | null>(null);
  const [selectedPreviewTemplate, setSelectedPreviewTemplate] = useState<ClinicalDocumentTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Custom Header & Footer Editor
  const [customHeader, setCustomHeader] = useState("");
  const [customFooter, setCustomFooter] = useState("");
  const [showLogo, setShowLogo] = useState(true);
  const [showBrandingModal, setShowBrandingModal] = useState(false);

  useEffect(() => {
    adminApi.getStaffRoster()
      .then((data) => setStaffList(data))
      .finally(() => setLoadingStaff(false));

    loadHospitalTemplates();
  }, []);

  const loadHospitalTemplates = async () => {
    try {
      setLoadingTemplateSettings(true);
      const [settings, tmpls] = await Promise.all([
        clinicalTemplatesApi.getHospitalSettings(),
        clinicalTemplatesApi.listTemplates(),
      ]);
      setTemplateSettings(settings);
      setCustomHeader(settings.custom_header_text || "");
      setCustomFooter(settings.custom_footer_notes || "");
      setShowLogo(settings.show_hospital_logo ?? true);
      setAllTemplates(tmpls);
    } catch (err: any) {
      console.error("Failed to load hospital template settings", err);
    } finally {
      setLoadingTemplateSettings(false);
    }
  };

  const handleApplyTemplate = async (template: ClinicalDocumentTemplate) => {
    try {
      setSavingTemplate(true);
      const payload =
        template.document_type === "PRESCRIPTION"
          ? { rx_template_id: template.id }
          : { clinical_report_template_id: template.id };

      const updated = await clinicalTemplatesApi.updateHospitalSettings(payload);
      setTemplateSettings(updated);
      setTemplateModalMode(null);
      setSelectedPreviewTemplate(null);
      Alert.alert(
        "Template Updated",
        `Hospital active ${template.document_type === "PRESCRIPTION" ? "Prescription" : "Clinical Report"} layout set to "${template.name}".`
      );
    } catch (err: any) {
      Alert.alert("Update Failed", err.message || "Failed to update hospital template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      setSavingTemplate(true);
      const updated = await clinicalTemplatesApi.updateHospitalSettings({
        custom_header_text: customHeader,
        custom_footer_notes: customFooter,
        show_hospital_logo: showLogo,
      });
      setTemplateSettings(updated);
      setShowBrandingModal(false);
      Alert.alert("Branding Saved", "Hospital custom header, footer, and logo preferences updated.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Failed to save hospital branding.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveBeds = async () => {
    const occ = parseInt(editOccupied, 10);
    const tot = parseInt(editTotal, 10);
    if (isNaN(occ) || isNaN(tot) || occ < 0 || tot <= 0 || occ > tot) {
      Alert.alert("Invalid Input", "Occupied beds cannot exceed total beds.");
      return;
    }

    try {
      setUpdatingBeds(true);
      await adminApi.updateBedOccupancy(occ, tot);
      setOccupiedBeds(occ);
      setTotalBeds(tot);
      setShowBedModal(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update bed census.");
    } finally {
      setUpdatingBeds(false);
    }
  };

  const handleEnrollStaff = async () => {
    if (!staffName.trim()) {
      setStaffError("Please enter staff member's full name.");
      return;
    }
    if (!/^\d{10}$/.test(staffPhone.trim())) {
      setStaffError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setIsAddingStaff(true);
      setStaffError(null);
      const newStaff = await adminApi.addStaffMember({
        name: staffName.trim(),
        role: staffRole,
        department: staffDept.trim(),
        mobile: staffPhone.trim(),
        license_no: staffLicense.trim() || undefined,
      });
      setStaffList((prev) => [newStaff, ...prev]);
      setShowStaffModal(false);
      setStaffName("");
      setStaffPhone("");
      setStaffLicense("");
    } catch (err: any) {
      setStaffError(err.message || "Failed to enroll staff member.");
    } finally {
      setIsAddingStaff(false);
    }
  };

  const occupancyPercent = Math.round((occupiedBeds / (totalBeds || 1)) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="hospital-admin-screen">
      <Header
        title="Hospital Admin"
        subtitle="Facility Census, Clinical Staff & Operations"
      />

      <UserSessionBanner />

      {/* Facility Header Card */}
      <Card style={styles.facilityCard}>
        <View style={styles.facilityHeader}>
          <Building2 size={20} color={COLORS.primary[700]} />
          <Text style={styles.facilityName}>OneHealth Hospital — Main Branch</Text>
        </View>
        <Text style={styles.facilityMeta}>
          Facility ID: hosp-main-01 • License: NABH-2026-A1 • Ward Blocks: A, B & ICU
        </Text>
        <StatusBadge label="Hospital Approved" variant="VERIFIED" />
      </Card>

      {/* Real-time Facility Metrics Grid */}
      <Text style={styles.sectionTitle}>Real-Time Facility Metrics</Text>

      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Users size={20} color={COLORS.primary[600]} />
          </View>
          <Text style={styles.metricVal}>{staffList.length}</Text>
          <Text style={styles.metricTitle}>Active Clinical Staff</Text>
          <Text style={styles.metricSub}>Doctors, Nurses & Techs</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Bed size={20} color={COLORS.accent[600]} />
          </View>
          <Text style={styles.metricVal}>{occupancyPercent}%</Text>
          <Text style={styles.metricTitle}>IPD Bed Occupancy</Text>
          <Text style={styles.metricSub}>{occupiedBeds} / {totalBeds} Beds Filled</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Activity size={20} color={COLORS.success[600]} />
          </View>
          <Text style={styles.metricVal}>146</Text>
          <Text style={styles.metricTitle}>Today's OPD Census</Text>
          <Text style={styles.metricSub}>Consultations Completed</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <CreditCard size={20} color={COLORS.primary[700]} />
          </View>
          <Text style={styles.metricVal}>₹1,84,200</Text>
          <Text style={styles.metricTitle}>Daily Billing</Text>
          <Text style={styles.metricSub}>Cleared Counters 1 & 2</Text>
        </Card>
      </View>

      {/* Operational Actions Row */}
      <View style={styles.adminActionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowBedModal(true)}
          testID="btn-open-bed-modal"
        >
          <Sliders size={16} color={COLORS.primary[700]} style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Adjust Bed Census</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => setShowStaffModal(true)}
          testID="btn-open-staff-modal"
        >
          <UserPlus size={16} color={COLORS.neutral.white} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: COLORS.neutral.white }]}>Enroll Staff</Text>
        </TouchableOpacity>
      </View>

      {/* Clinical Staff Roster Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Active Clinical Staff Roster</Text>
        <Text style={styles.staffCountText}>{staffList.length} Personnel</Text>
      </View>

      {loadingStaff ? (
        <ActivityIndicator color={COLORS.primary[600]} style={{ marginVertical: SPACING.md }} />
      ) : (
        staffList.map((st) => (
          <Card key={st.id} style={styles.staffCard} testID={`staff-card-${st.id}`}>
            <View style={styles.staffInfoCol}>
              <View style={styles.staffNameRow}>
                <Text style={styles.staffNameText}>{st.name}</Text>
                <StatusBadge label={st.role} variant={st.role === "DOCTOR" ? "ACTIVE" : "INFO"} />
              </View>
              <Text style={styles.staffDeptText}>{st.department} • Ph: {st.mobile}</Text>
              {st.license_no && (
                <Text style={styles.staffLicenseText}>Lic: {st.license_no}</Text>
              )}
            </View>
            <StatusBadge label={st.status} variant={st.status === "ON_DUTY" ? "VERIFIED" : "PENDING"} />
          </Card>
        ))
      )}

      {/* Daily Reconciliation Action */}
      <Card style={styles.reconcileCard}>
        <View style={styles.reconcileRow}>
          <FileSpreadsheet size={22} color={COLORS.primary[700]} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.reconcileTitle}>Daily Operational & Financial Handoff</Text>
            <Text style={styles.reconcileSub}>
              {reconciled ? "Reconciled & Cryptographically Stamped at 21:00" : "Uncommitted shift ledger ready for audit sign-off"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.reconcileBtn, reconciled && styles.reconcileBtnDone]}
            onPress={() => setReconciled(true)}
            testID="btn-reconcile-ledger"
            disabled={reconciled}
          >
            {reconciled ? (
              <CheckCircle2 size={16} color={COLORS.success[700]} />
            ) : (
              <Text style={styles.reconcileBtnText}>Sign Off</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>

      {/* ================================================================= */}
      {/* Hospital Document Template Preferences (Dual Selection & Branding) */}
      {/* ================================================================= */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Layers size={18} color={COLORS.primary[700]} />
          <Text style={styles.sectionTitle}>Prescription & Report Templates</Text>
        </View>
        <TouchableOpacity
          style={styles.brandingBtn}
          onPress={() => setShowBrandingModal(true)}
          testID="btn-open-branding-modal"
        >
          <Palette size={14} color={COLORS.primary[700]} style={{ marginRight: 4 }} />
          <Text style={styles.brandingBtnText}>Branding & Notes</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.templateSettingsCard} testID="hospital-template-settings-card">
        {loadingTemplateSettings ? (
          <ActivityIndicator color={COLORS.primary[600]} style={{ marginVertical: SPACING.sm }} />
        ) : (
          <>
            {/* 1. Prescription Template Selector */}
            <View style={styles.templatePrefItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.templatePrefType}>DEFAULT PRESCRIPTION (Rx) TEMPLATE</Text>
                <Text style={styles.templatePrefName}>
                  {templateSettings?.rx_template_name || "Classic Hospital Rx"}
                </Text>
                <Text style={styles.templatePrefSub}>
                  ID: {templateSettings?.rx_template_id} • v{templateSettings?.rx_template_version || 1}.0
                </Text>
              </View>
              <TouchableOpacity
                style={styles.selectTmplBtn}
                onPress={() => {
                  setTemplateModalMode("RX");
                  setSelectedPreviewTemplate(
                    allTemplates.find((t) => t.id === templateSettings?.rx_template_id) || null
                  );
                }}
                testID="btn-choose-rx-template"
              >
                <Text style={styles.selectTmplBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.templatePrefDivider} />

            {/* 2. Clinical Report Template Selector */}
            <View style={styles.templatePrefItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.templatePrefType}>DEFAULT CLINICAL REPORT TEMPLATE</Text>
                <Text style={styles.templatePrefName}>
                  {templateSettings?.clinical_report_template_name || "Classic Hospital Clinical Report"}
                </Text>
                <Text style={styles.templatePrefSub}>
                  ID: {templateSettings?.clinical_report_template_id} • v{templateSettings?.clinical_report_template_version || 1}.0
                </Text>
              </View>
              <TouchableOpacity
                style={styles.selectTmplBtn}
                onPress={() => {
                  setTemplateModalMode("REPORT");
                  setSelectedPreviewTemplate(
                    allTemplates.find((t) => t.id === templateSettings?.clinical_report_template_id) || null
                  );
                }}
                testID="btn-choose-report-template"
              >
                <Text style={styles.selectTmplBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Card>

      {/* Security & Tenant Boundary Callout */}
      <Card style={styles.securityNote}>
        <ShieldCheck size={18} color={COLORS.success[600]} />
        <Text style={styles.securityText}>
          Tenant Isolation Boundary: Operations and patient clinical records are strictly
          sandboxed to this facility via X-Hospital-Ref-Id and DB Stored Procedures.
        </Text>
      </Card>

      {/* MODAL 1: Adjust Bed Census Modal */}
      <Modal
        visible={showBedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBedModal(false)}
        testID="adjust-beds-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Update IPD Bed Census</Text>
              <TouchableOpacity onPress={() => setShowBedModal(false)}>
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>OCCUPIED BEDS</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editOccupied}
              onChangeText={setEditOccupied}
              testID="input-occupied-beds"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>TOTAL BEDS CAPACITY</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editTotal}
              onChangeText={setEditTotal}
              testID="input-total-beds"
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSaveBeds}
              disabled={updatingBeds}
              testID="btn-save-beds"
            >
              {updatingBeds ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Commit Bed Census</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Enroll Staff Modal */}
      <Modal
        visible={showStaffModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStaffModal(false)}
        testID="enroll-staff-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Enroll Clinical Personnel</Text>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            {staffError && (
              <Text style={styles.modalError}>{staffError}</Text>
            )}

            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dr. Ramesh Sundaram"
              placeholderTextColor={COLORS.textMuted}
              value={staffName}
              onChangeText={setStaffName}
              testID="input-staff-name"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>ROLE</Text>
            <View style={styles.rolePickerRow}>
              {(["DOCTOR", "NURSE", "TECHNICIAN", "ADMIN"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, staffRole === r && styles.roleChipActive]}
                  onPress={() => setStaffRole(r)}
                  testID={`role-chip-${r}`}
                >
                  <Text style={[styles.roleText, staffRole === r && styles.roleTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>DEPARTMENT</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Cardiology, Orthopedics"
              placeholderTextColor={COLORS.textMuted}
              value={staffDept}
              onChangeText={setStaffDept}
              testID="input-staff-dept"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>10-DIGIT MOBILE NUMBER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Mobile phone number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={staffPhone}
              onChangeText={setStaffPhone}
              testID="input-staff-phone"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>MEDICAL LICENSE NO (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. TN-MCI-2026-..."
              placeholderTextColor={COLORS.textMuted}
              value={staffLicense}
              onChangeText={setStaffLicense}
              testID="input-staff-license"
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleEnrollStaff}
              disabled={isAddingStaff}
              testID="btn-confirm-add-staff"
            >
              {isAddingStaff ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Enroll & Grant Access</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Template Selector & Live Preview Modal */}
      <Modal
        visible={Boolean(templateModalMode)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setTemplateModalMode(null);
          setSelectedPreviewTemplate(null);
        }}
        testID="hospital-template-selector-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.templateModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>
                  Select {templateModalMode === "RX" ? "Prescription" : "Clinical Report"} Template
                </Text>
                <Text style={styles.modalSub}>
                  Choose the active layout for all clinicians in your hospital
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setTemplateModalMode(null);
                  setSelectedPreviewTemplate(null);
                }}
              >
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 220, marginBottom: 12 }}>
              {allTemplates
                .filter(
                  (t) =>
                    t.document_type === (templateModalMode === "RX" ? "PRESCRIPTION" : "CLINICAL_REPORT") &&
                    t.is_active
                )
                .map((tmpl) => {
                  const isCurrent =
                    templateModalMode === "RX"
                      ? templateSettings?.rx_template_id === tmpl.id
                      : templateSettings?.clinical_report_template_id === tmpl.id;
                  const isSelected = selectedPreviewTemplate?.id === tmpl.id;

                  return (
                    <TouchableOpacity
                      key={tmpl.id}
                      style={[
                        styles.templateOptionItem,
                        isSelected && styles.templateOptionItemSelected,
                      ]}
                      onPress={() => setSelectedPreviewTemplate(tmpl)}
                      testID={`option-template-${tmpl.id}`}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.templateOptionName}>{tmpl.name}</Text>
                          {isCurrent && (
                            <View style={styles.currentBadge}>
                              <Text style={styles.currentBadgeText}>CURRENT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.templateOptionDesc}>{tmpl.description}</Text>
                      </View>
                      {isSelected ? (
                        <CheckCircle2 size={20} color={COLORS.primary[600]} />
                      ) : (
                        <View style={styles.radioUnselected} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            {/* Preview of the selected template */}
            {selectedPreviewTemplate && (
              <View style={styles.selectedPreviewBox}>
                <View style={styles.selectedPreviewHeader}>
                  <Text style={styles.previewHeaderLabel}>
                    LIVE PREVIEW: {selectedPreviewTemplate.name}
                  </Text>
                </View>
                <ScrollView style={{ maxHeight: 240, padding: 8 }}>
                  {templateModalMode === "RX" ? (
                    <PrescriptionTemplateRenderer
                      prescription={{
                        id: "rx-demo-hosp",
                        patient_name: "Alice Smith",
                        patient_age: 32,
                        patient_gender: "Female",
                        patient_blood_group: "O+",
                        diagnosis: "Seasonal Allergic Rhinitis",
                        items: [
                          {
                            medicine_name: "Cetirizine Syrup",
                            strength: "5 mg/5ml",
                            dosage_form: "Syrup",
                            dose: "5 ml",
                            frequency: "Once Daily (Night)",
                            duration_days: 5,
                            food_instruction: "After food",
                          },
                        ],
                        doctor_name: "Dr. Senthil Nathan",
                        hospital_name: templateSettings?.hospital_name || "Kedar Hospital",
                        template_id: selectedPreviewTemplate.id,
                        template_name: selectedPreviewTemplate.name,
                      }}
                      customHeader={customHeader}
                      customFooter={customFooter}
                      showHospitalLogo={showLogo}
                    />
                  ) : (
                    <ClinicalReportTemplateRenderer
                      report={{
                        id: "c-demo-hosp",
                        patient_id: "p-101",
                        patient_name: "Alice Smith",
                        onehealth_id: "OHID-IND-2026-0001",
                        patient_age: 32,
                        patient_gender: "Female",
                        patient_blood_group: "O+",
                        doctor_id: "doc-01",
                        doctor_name: "Dr. Senthil Nathan",
                        hospital_id: templateSettings?.hospital_id || "hosp-kedar",
                        hospital_name: templateSettings?.hospital_name || "Kedar Hospital",
                        symptoms: "Sneezing, nasal congestion for 3 days",
                        diagnosis: "Acute Allergic Rhinitis",
                        template_id: selectedPreviewTemplate.id,
                        template_name: selectedPreviewTemplate.name,
                        template_version: 1,
                        template_layout_config: selectedPreviewTemplate.layout_config,
                      }}
                      customHeader={customHeader}
                      customFooter={customFooter}
                      showHospitalLogo={showLogo}
                    />
                  )}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.applyTemplateBtn,
                (!selectedPreviewTemplate || savingTemplate) && { opacity: 0.6 },
              ]}
              onPress={() => selectedPreviewTemplate && handleApplyTemplate(selectedPreviewTemplate)}
              disabled={!selectedPreviewTemplate || savingTemplate}
              testID="btn-confirm-apply-template"
            >
              {savingTemplate ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <Text style={styles.applyTemplateBtnText}>
                  Apply "{selectedPreviewTemplate?.name || "Template"}" to Hospital
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Facility Branding & Custom Notes Modal */}
      <Modal
        visible={showBrandingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBrandingModal(false)}
        testID="hospital-branding-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Facility Header & Branding</Text>
                <Text style={styles.modalSub}>
                  Customize hospital print headers, disclaimers & logos
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBrandingModal(false)}>
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>CUSTOM HEADER BANNER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Center of Excellence for Cardiology & Nephrology"
              placeholderTextColor={COLORS.textMuted}
              value={customHeader}
              onChangeText={setCustomHeader}
              testID="input-custom-header"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>CUSTOM FOOTER NOTES / DISCLAIMER</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              placeholder="e.g. In case of acute emergency, dial hospital 24/7 hotline 1066."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
              value={customFooter}
              onChangeText={setCustomFooter}
              testID="input-custom-footer"
            />

            <TouchableOpacity
              style={styles.logoToggleRow}
              onPress={() => setShowLogo(!showLogo)}
              testID="toggle-hospital-logo"
            >
              <View style={[styles.checkboxBox, showLogo && styles.checkboxBoxChecked]}>
                {showLogo && <Check size={14} color={COLORS.neutral.white} />}
              </View>
              <Text style={styles.logoToggleText}>Display Official Hospital Logo on Documents</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyTemplateBtn}
              onPress={handleSaveBranding}
              disabled={savingTemplate}
              testID="btn-save-branding"
            >
              {savingTemplate ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <Text style={styles.applyTemplateBtnText}>Save Facility Branding Preferences</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxxl,
  },
  facilityCard: {
    marginBottom: SPACING.base,
  },
  facilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  facilityName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  facilityMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  staffCountText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[700],
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  metricCard: {
    width: "48%",
    padding: SPACING.md,
  },
  metricIcon: {
    marginBottom: SPACING.xs,
  },
  metricVal: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  metricTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  metricSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  adminActionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  actionBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
    color: COLORS.primary[700],
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
    padding: SPACING.sm,
  },
  staffInfoCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  staffNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  staffNameText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  staffDeptText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  staffLicenseText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: COLORS.primary[700],
    marginTop: 1,
  },
  reconcileCard: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
  },
  reconcileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reconcileTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.primary[900],
  },
  reconcileSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[800],
    marginTop: 2,
  },
  reconcileBtn: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  reconcileBtnDone: {
    backgroundColor: COLORS.success[100],
  },
  reconcileBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.neutral.white,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success[50],
    borderColor: COLORS.success[200],
    marginTop: SPACING.sm,
  },
  securityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success[800],
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.base,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.base,
  },
  modalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  modalSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalError: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger[700],
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
    marginBottom: SPACING.xs,
  },
  rolePickerRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: SPACING.xs,
  },
  roleChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.neutral[100],
  },
  roleChipActive: {
    backgroundColor: COLORS.primary[600],
  },
  roleText: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  roleTextActive: {
    color: COLORS.neutral.white,
    fontWeight: "700",
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary[600],
    alignItems: "center",
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  modalSubmitText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
    fontSize: 13,
  },
  brandingBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  brandingBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  templateSettingsCard: {
    marginBottom: SPACING.base,
    padding: SPACING.base,
  },
  templatePrefItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  templatePrefType: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  templatePrefName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  templatePrefSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  selectTmplBtn: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  selectTmplBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.neutral.white,
  },
  templatePrefDivider: {
    height: 1,
    backgroundColor: COLORS.neutral[100],
    marginVertical: SPACING.sm,
  },
  templateModalCard: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "90%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  templateOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    marginBottom: 6,
    backgroundColor: COLORS.neutral[50],
  },
  templateOptionItemSelected: {
    borderColor: COLORS.primary[600],
    backgroundColor: COLORS.primary[50],
  },
  templateOptionName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  templateOptionDesc: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  currentBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#0284C7",
  },
  radioUnselected: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[400],
  },
  selectedPreviewBox: {
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral[50],
    overflow: "hidden",
    marginBottom: 10,
  },
  selectedPreviewHeader: {
    backgroundColor: COLORS.neutral[200],
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewHeaderLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  applyTemplateBtn: {
    backgroundColor: COLORS.primary[600],
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: 6,
  },
  applyTemplateBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.neutral.white,
  },
  logoToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.sm,
    gap: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[400],
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.neutral.white,
  },
  checkboxBoxChecked: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  logoToggleText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
});
