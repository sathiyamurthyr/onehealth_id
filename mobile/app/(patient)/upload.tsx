/**
 * ONEHEALTH ID (OH-ID) Mobile — Document Upload & Validation Screen
 * 
 * Provides an enterprise-grade document upload interface with client-side
 * pre-flight checks, category selection, animated multi-stage validation progress,
 * OCR inspection, and explicit rejection outcomes with actionable remedies.
 * Sathus Technology Pvt Ltd - Enterprise Mobile Architecture
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Eye,
  Info,
} from "lucide-react-native";

import {
  documentsApi,
  DocumentCategory,
  SUPPORTED_DOCUMENT_CATEGORIES,
  SelectedFile,
  DocumentValidationResponse,
  ValidationOutcome,
} from "../../src/services/api/documents";
import { Header } from "../../src/components/common/Header";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../src/theme";

export default function DocumentUploadScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("LAB_REPORT");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationStage, setValidationStage] = useState<string>("");
  const [validationResult, setValidationResult] = useState<DocumentValidationResponse | null>(null);
  const [clientError, setClientError] = useState<{ error: string; remedy?: string } | null>(null);

  const activeCategoryConfig =
    SUPPORTED_DOCUMENT_CATEGORIES.find((c) => c.key === selectedCategory) ||
    SUPPORTED_DOCUMENT_CATEGORIES[0];

  const handlePickDocument = async () => {
    try {
      setClientError(null);
      setValidationResult(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileObj: SelectedFile = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
        };

        // Client-side pre-flight check
        const check = documentsApi.validateFileClientSide(fileObj, selectedCategory);
        if (!check.valid) {
          setClientError({ error: check.error || "Invalid file", remedy: check.remedy });
          setSelectedFile(null);
          return;
        }

        setSelectedFile(fileObj);
      }
    } catch (err: any) {
      console.warn("Error picking document:", err);
      Alert.alert("File Selection Failed", "Unable to open document picker on this device.");
    }
  };

  const handleSelectSample = (sampleType: "valid_lab" | "irrelevant_bill" | "corrupted") => {
    setClientError(null);
    setValidationResult(null);

    if (sampleType === "valid_lab") {
      setSelectedCategory("LAB_REPORT");
      setSelectedFile({
        uri: "file:///mock/clinical_lab_report.pdf",
        name: "cbc_pathology_report_2026.pdf",
        type: "application/pdf",
        size: 245 * 1024,
      });
    } else if (sampleType === "irrelevant_bill") {
      setSelectedCategory("PRESCRIPTION");
      setSelectedFile({
        uri: "file:///mock/utility_electricity_bill.pdf",
        name: "electricity_power_bill_may2026.pdf",
        type: "application/pdf",
        size: 180 * 1024,
      });
    } else {
      setSelectedFile({
        uri: "file:///mock/malformed_empty.pdf",
        name: "corrupted_zero_length.pdf",
        type: "application/pdf",
        size: 0,
      });
    }
  };

  const handleSubmitUpload = async () => {
    if (!selectedFile || isValidating) return;

    // Check client-side again
    const check = documentsApi.validateFileClientSide(selectedFile, selectedCategory);
    if (!check.valid) {
      setClientError({ error: check.error || "Invalid file", remedy: check.remedy });
      return;
    }

    try {
      setIsValidating(true);
      setClientError(null);
      setValidationResult(null);

      // Multi-stage progress indicators
      setValidationStage("Stage 1/4: File integrity & anti-malware inspection...");
      await new Promise((r) => setTimeout(r, 400));

      setValidationStage("Stage 2/4: OCR text extraction & readability analysis...");
      await new Promise((r) => setTimeout(r, 400));

      setValidationStage("Stage 3/4: Healthcare domain relevance verification...");
      await new Promise((r) => setTimeout(r, 400));

      setValidationStage("Stage 4/4: Medical category classification & validation...");

      const response = await documentsApi.uploadAndValidateDocument(
        selectedFile,
        selectedCategory
      );

      setValidationResult(response);
    } catch (err: any) {
      console.error("Document upload failed:", err);
      const detail = err?.data?.detail || err?.message || "Failed to process document validation.";
      let parsedDecision: ValidationOutcome = "PROCESSING_FAILED";
      const errorReason = typeof detail === "string" ? detail : detail?.error || "Upload rejected.";
      const remedy = typeof detail === "object" ? detail?.actionable_remedy : "Please check your document and retry.";

      if (typeof detail === "object" && detail?.decision) {
        parsedDecision = detail.decision as ValidationOutcome;
      } else if (errorReason.includes("Unsupported format")) {
        parsedDecision = "REJECTED_UNSUPPORTED_TYPE";
      } else if (errorReason.includes("exceeds maximum allowed size")) {
        parsedDecision = "REJECTED_TOO_LARGE";
      } else if (errorReason.includes("Malicious payload") || errorReason.includes("Security scan")) {
        parsedDecision = "REJECTED_MALWARE";
      } else if (errorReason.includes("signature") || errorReason.includes("corrupted") || errorReason.includes("empty")) {
        parsedDecision = "REJECTED_INVALID_FILE";
      }

      setValidationResult({
        id: "err-upload",
        status: parsedDecision,
        validation_decision: parsedDecision,
        file_name: selectedFile.name,
        document_category: selectedCategory,
        file_size_bytes: selectedFile.size || 0,
        rejection_reason: errorReason,
        actionable_remedy: remedy,
      });
    } finally {
      setIsValidating(false);
      setValidationStage("");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setClientError(null);
    setValidationStage("");
  };

  const renderOutcomeCard = (result: DocumentValidationResponse) => {
    const status = result.status;
    const isAccepted = status === "ACCEPTED";
    const isReview = status === "REVIEW_REQUIRED";

    if (isAccepted) {
      return (
        <View style={styles.outcomeCardSuccess} testID="validation-outcome-accepted">
          <View style={styles.outcomeHeaderRow}>
            <CheckCircle2 color={COLORS.success[600]} size={28} />
            <View style={styles.outcomeTitleWrap}>
              <Text style={styles.outcomeTitleSuccess}>Document Accepted</Text>
              <Text style={styles.outcomeSubtitle}>
                Passed all security, OCR, and medical relevance checks.
              </Text>
            </View>
          </View>

          {result.extracted_fields && (
            <View style={styles.extractedFieldsBox}>
              <Text style={styles.extractedFieldsTitle}>Extracted Clinical Entities</Text>
              {result.extracted_fields.hospital_name && (
                <Text style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Facility: </Text>
                  {result.extracted_fields.hospital_name}
                </Text>
              )}
              {result.extracted_fields.doctor_name && (
                <Text style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Physician: </Text>
                  {result.extracted_fields.doctor_name}
                </Text>
              )}
              {result.extracted_fields.document_date && (
                <Text style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Date: </Text>
                  {result.extracted_fields.document_date}
                </Text>
              )}
              {result.extracted_fields.document_type && (
                <Text style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Type: </Text>
                  {result.extracted_fields.document_type}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.primaryActionButton} onPress={handleReset}>
            <Text style={styles.primaryActionText}>Upload Another Record</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isReview) {
      return (
        <View style={styles.outcomeCardWarning} testID="validation-outcome-review">
          <View style={styles.outcomeHeaderRow}>
            <AlertTriangle color={COLORS.warning[600]} size={28} />
            <View style={styles.outcomeTitleWrap}>
              <Text style={styles.outcomeTitleWarning}>Review Required</Text>
              <Text style={styles.outcomeSubtitle}>
                Medical content verified, but layout requires authorized clinical staff confirmation.
              </Text>
            </View>
          </View>

          <View style={styles.remedyBox}>
            <Text style={styles.remedyLabel}>Status Note</Text>
            <Text style={styles.remedyText}>
              {result.rejection_reason || "Document quarantined awaiting reviewer sign-off."}
            </Text>
            {result.actionable_remedy && (
              <Text style={styles.remedySubtext}>{result.actionable_remedy}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.primaryActionButton} onPress={handleReset}>
            <Text style={styles.primaryActionText}>Upload A Clearer Scan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // All REJECTED_* outcomes
    const isMalware = status === "REJECTED_MALWARE";
    const isLowOcr = status === "REJECTED_LOW_OCR_CONFIDENCE";
    const isIrrelevant = status === "REJECTED_IRRELEVANT";

    return (
      <View style={styles.outcomeCardError} testID="validation-outcome-rejected">
        <View style={styles.outcomeHeaderRow}>
          {isMalware ? (
            <ShieldAlert color={COLORS.danger[600]} size={28} />
          ) : (
            <XCircle color={COLORS.danger[600]} size={28} />
          )}
          <View style={styles.outcomeTitleWrap}>
            <Text style={styles.outcomeTitleError}>
              {isMalware
                ? "Security Threat Blocked"
                : isLowOcr
                  ? "Unreadable Document"
                  : isIrrelevant
                    ? "Irrelevant Content Blocked"
                    : "Upload Rejected"}
            </Text>
            <Text style={styles.outcomeSubtitle}>
              {result.rejection_reason || "The uploaded file does not satisfy OH-ID validation rules."}
            </Text>
          </View>
        </View>

        {result.actionable_remedy && (
          <View style={styles.remedyBox}>
            <Text style={styles.remedyLabel}>Actionable Remedy</Text>
            <Text style={styles.remedyText}>{result.actionable_remedy}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.errorActionButton} onPress={handleReset}>
          <RefreshCw color="#ffffff" size={16} />
          <Text style={styles.errorActionText}>Choose Different Document</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          testID="upload-back-btn"
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft color={COLORS.textPrimary} size={20} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <Header
        title="Upload Medical Document"
        subtitle="Enterprise Clinical Validation & Verification"
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step 1: Select Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Medical Document Category</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the expected category to enforce clinical classification rules.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {SUPPORTED_DOCUMENT_CATEGORIES.map((cat) => {
              const isSelected = cat.key === selectedCategory;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => {
                    setSelectedCategory(cat.key);
                    setClientError(null);
                  }}
                  testID={`category-pill-${cat.key}`}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Category Description */}
          <View style={styles.categoryInfoBox}>
            <Text style={styles.categoryInfoDesc}>{activeCategoryConfig.description}</Text>
            <Text style={styles.categoryInfoLimit}>
              Max File Size: {activeCategoryConfig.maxSizeMb} MB
            </Text>
          </View>
        </View>

        {/* Step 2: Validation Guidelines & Security Policy */}
        <View style={styles.guidelinesBox}>
          <View style={styles.guidelinesHeader}>
            <Info color={COLORS.primary[600]} size={18} />
            <Text style={styles.guidelinesTitle}>Upload & Security Policy</Text>
          </View>
          <Text style={styles.guidelineItem}>• Supported formats: PDF, JPG, PNG, WEBP, DOCX.</Text>
          <Text style={styles.guidelineItem}>• Automatic antivirus, malware, and archive bomb scanning.</Text>
          <Text style={styles.guidelineItem}>• Healthcare domain verification: Commercial invoices, utility bills, and non-medical files are blocked.</Text>
          <Text style={styles.guidelineItem}>• Documents are envelope-encrypted at rest using hardware AES-256-GCM.</Text>
        </View>

        {/* Step 3: Pick File */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Select Document File</Text>

          {selectedFile ? (
            <View style={styles.selectedFileCard} testID="selected-file-card">
              <View style={styles.selectedFileHeader}>
                <FileText color={COLORS.primary[600]} size={24} />
                <View style={styles.selectedFileInfo}>
                  <Text style={styles.selectedFileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.selectedFileSize}>
                    {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(0)} KB` : "Document ready"} •{" "}
                    {selectedFile.type || "Document"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.changeFileButton} onPress={handlePickDocument}>
                <Text style={styles.changeFileText}>Change File</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickFileButton}
              onPress={handlePickDocument}
              testID="pick-document-button"
            >
              <Upload color={COLORS.primary[600]} size={32} />
              <Text style={styles.pickFileTitle}>Select Document from Device</Text>
              <Text style={styles.pickFileSubtitle}>
                Tap to browse files, camera scans, or digital reports
              </Text>
            </TouchableOpacity>
          )}

          {/* Quick Synthetic Test Buttons */}
          <View style={styles.sampleRow}>
            <Text style={styles.sampleLabel}>Or test synthetic record:</Text>
            <TouchableOpacity
              style={styles.sampleButton}
              onPress={() => handleSelectSample("valid_lab")}
              testID="sample-valid-lab-btn"
            >
              <Text style={styles.sampleButtonText}>Valid Lab Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sampleButton}
              onPress={() => handleSelectSample("irrelevant_bill")}
              testID="sample-irrelevant-btn"
            >
              <Text style={styles.sampleButtonText}>Electricity Bill</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Client Error Card */}
        {clientError && (
          <View style={styles.clientErrorCard} testID="client-error-card">
            <AlertTriangle color={COLORS.danger[600]} size={20} />
            <View style={styles.clientErrorTextWrap}>
              <Text style={styles.clientErrorTitle}>{clientError.error}</Text>
              {clientError.remedy && (
                <Text style={styles.clientErrorRemedy}>{clientError.remedy}</Text>
              )}
            </View>
          </View>
        )}

        {/* Validation Progress */}
        {isValidating && (
          <View style={styles.progressCard} testID="validation-progress-card">
            <ActivityIndicator size="large" color={COLORS.primary[600]} />
            <Text style={styles.progressStageText}>{validationStage}</Text>
            <Text style={styles.progressNoteText}>
              Verifying file signatures, running antivirus scan, and analyzing clinical terminology...
            </Text>
          </View>
        )}

        {/* Validation Result Outcome */}
        {validationResult && !isValidating && renderOutcomeCard(validationResult)}

        {/* Submit Action Button */}
        {!validationResult && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedFile || isValidating) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitUpload}
            disabled={!selectedFile || isValidating}
            testID="submit-validation-button"
          >
            {isValidating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Validate & Upload Document</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  backButtonText: {
    ...TYPOGRAPHY.callout,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
    fontWeight: "600",
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillSelected: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  categoryLabelSelected: {
    color: COLORS.neutral.white,
    fontWeight: "700",
  },
  categoryInfoBox: {
    backgroundColor: COLORS.neutral[50],
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[600],
  },
  categoryInfoDesc: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  categoryInfoLimit: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  guidelinesBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary[600],
    marginLeft: 6,
  },
  guidelineItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  pickFileButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.neutral[300],
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  pickFileTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  pickFileSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  selectedFileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary[600],
  },
  selectedFileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedFileInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  selectedFileSize: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  changeFileButton: {
    alignSelf: "flex-end",
    marginTop: SPACING.xs,
  },
  changeFileText: {
    fontSize: 12,
    color: COLORS.primary[600],
    fontWeight: "700",
  },
  sampleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },
  sampleLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  sampleButton: {
    backgroundColor: COLORS.neutral[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginRight: 6,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sampleButtonText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  clientErrorCard: {
    flexDirection: "row",
    backgroundColor: COLORS.danger[50],
    borderColor: COLORS.danger[200],
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: "flex-start",
  },
  clientErrorTextWrap: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  clientErrorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.danger[600],
  },
  clientErrorRemedy: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressStageText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary[600],
    marginTop: SPACING.md,
    textAlign: "center",
  },
  progressNoteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  outcomeCardSuccess: {
    backgroundColor: COLORS.success[50],
    borderWidth: 1,
    borderColor: COLORS.success[200],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  outcomeCardWarning: {
    backgroundColor: COLORS.warning[50],
    borderWidth: 1,
    borderColor: COLORS.warning[200],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  outcomeCardError: {
    backgroundColor: COLORS.danger[50],
    borderWidth: 1,
    borderColor: COLORS.danger[200],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  outcomeHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  outcomeTitleWrap: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  outcomeTitleSuccess: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.success[600],
  },
  outcomeTitleWarning: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.warning[600],
  },
  outcomeTitleError: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.danger[600],
  },
  outcomeSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  extractedFieldsBox: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.success[200],
  },
  extractedFieldsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.success[600],
    marginBottom: 4,
  },
  fieldRow: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  fieldLabel: {
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  remedyBox: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning[200],
  },
  remedyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.warning[600],
    marginBottom: 2,
  },
  remedyText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  remedySubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  primaryActionButton: {
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  primaryActionText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: "700",
  },
  errorActionButton: {
    backgroundColor: COLORS.danger[600],
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  errorActionText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  submitButton: {
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.neutral.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
