/**
 * ONEHEALTH ID (OH-ID) Mobile — Role Selection & Registration
 * 
 * Account Creation & Onboarding Gateway:
 * - Role Category Selector (Patient, Doctor, Hospital / Organisation, Staff).
 * - Patient: Native self-registration using POST /auth/register with unified OH-ID pass creation.
 * - Doctor: Credential verification guidance (MCI/NMC registration) and onboarding routing.
 * - Hospital / Organisation: Healthcare facility onboarding and administrative approval portal.
 * - Reception / Staff: Informational gate explaining hospital administrator provisioning.
 * - Super Admin: Public registration is strictly disallowed.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../src/theme";
import { Card } from "../../src/components/common/Card";
import { authApi } from "../../src/services/api/auth";
import {
  User,
  HeartPulse,
  Stethoscope,
  Building2,
  Users,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react-native";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_ICON = require("../../assets/icon.png");

type RoleChoice = "SELECT" | "PATIENT" | "DOCTOR" | "HOSPITAL" | "STAFF";

export default function RegisterScreen() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<RoleChoice>("SELECT");

  // Patient Registration Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consentGiven, setConsentGiven] = useState(true);

  // Status & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    onehealth_id: string;
    message: string;
  } | null>(null);

  // Format mobile number to 10 digits
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setPhone(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  // Submit Patient Registration
  const handlePatientSubmit = async () => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMessage("Please enter your full name (minimum 2 characters).");
      return;
    }

    const cleanPhone = phone.trim();
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 125) {
      setErrorMessage("Please enter a valid age between 0 and 125.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    if (!consentGiven) {
      setErrorMessage("Consent to establish your OneHealth ID pass is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await authApi.register({
        name: cleanName,
        phone: cleanPhone,
        password: password,
        age: parsedAge,
        gender: gender,
        email: email.trim().toLowerCase() || undefined,
        consent_given: true,
      });

      setSuccessResult({
        onehealth_id: res.onehealth_id,
        message: res.message || "Registration successful! Your OneHealth ID pass has been created.",
      });
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to complete registration.";
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand Section */}
          <View style={styles.brandHeader}>
            <Image source={APP_ICON} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.appName}>OneHealth ID</Text>
            <Text style={styles.appSubtitle}>
              {selectedRole === "SELECT"
                ? "Select your role to get started"
                : "Complete Account Registration"}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <Card style={styles.errorBanner} testID="register-error-banner">
              <View style={styles.bannerRow}>
                <AlertCircle size={18} color={COLORS.danger[700]} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            </Card>
          )}

          {/* 1. ROLE SELECTION VIEW */}
          {selectedRole === "SELECT" && (
            <View>
              <Text style={styles.sectionHeading}>Choose Account Type</Text>

              {/* Patient Option */}
              <TouchableOpacity
                testID="role-patient-card"
                style={styles.roleCardTouchable}
                activeOpacity={0.8}
                onPress={() => setSelectedRole("PATIENT")}
              >
                <Card style={styles.roleCard}>
                  <View style={[styles.roleIconBadge, { backgroundColor: COLORS.primary[50] }]}>
                    <HeartPulse size={24} color={COLORS.primary[600]} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <View style={styles.roleTitleRow}>
                      <Text style={styles.roleTitle}>Patient / Citizen</Text>
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>Instant</Text>
                      </View>
                    </View>
                    <Text style={styles.roleDescription}>
                      Universal Health Pass. Access OPD appointments, lab reports, and lifelong clinical timeline.
                    </Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textMuted} />
                </Card>
              </TouchableOpacity>

              {/* Doctor Option */}
              <TouchableOpacity
                testID="role-doctor-card"
                style={styles.roleCardTouchable}
                activeOpacity={0.8}
                onPress={() => setSelectedRole("DOCTOR")}
              >
                <Card style={styles.roleCard}>
                  <View style={[styles.roleIconBadge, { backgroundColor: COLORS.success[50] }]}>
                    <Stethoscope size={24} color={COLORS.success[600]} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>Doctor / Practitioner</Text>
                    <Text style={styles.roleDescription}>
                      Clinical workstation, E-Prescriptions (E-Rx), and cross-hospital consultation rounds.
                    </Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textMuted} />
                </Card>
              </TouchableOpacity>

              {/* Hospital / Facility Option */}
              <TouchableOpacity
                testID="role-hospital-card"
                style={styles.roleCardTouchable}
                activeOpacity={0.8}
                onPress={() => setSelectedRole("HOSPITAL")}
              >
                <Card style={styles.roleCard}>
                  <View style={[styles.roleIconBadge, { backgroundColor: COLORS.warning[50] }]}>
                    <Building2 size={24} color={COLORS.warning[600]} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>Hospital / Organisation</Text>
                    <Text style={styles.roleDescription}>
                      Register a hospital, clinic, diagnostic laboratory, or pharmacy facility on OH-ID.
                    </Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textMuted} />
                </Card>
              </TouchableOpacity>

              {/* Staff Option */}
              <TouchableOpacity
                testID="role-staff-card"
                style={styles.roleCardTouchable}
                activeOpacity={0.8}
                onPress={() => setSelectedRole("STAFF")}
              >
                <Card style={styles.roleCard}>
                  <View style={[styles.roleIconBadge, { backgroundColor: COLORS.neutral[100] }]}>
                    <Users size={24} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>Reception & Clinical Staff</Text>
                    <Text style={styles.roleDescription}>
                      Receptionists, nurses, cashiers, and administrative department staff.
                    </Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textMuted} />
                </Card>
              </TouchableOpacity>

              {/* Security Note on Super Admin Exclusion */}
              <View style={styles.adminExclusionBox}>
                <ShieldAlert size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.adminExclusionText}>
                  Super Admin and Platform Governance accounts cannot be registered publicly. Access is provisioned strictly through internal security controls.
                </Text>
              </View>
            </View>
          )}

          {/* 2. PATIENT REGISTRATION FORM */}
          {selectedRole === "PATIENT" && !successResult && (
            <Card style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <TouchableOpacity
                  testID="back-to-role-select"
                  onPress={() => setSelectedRole("SELECT")}
                  style={styles.backButton}
                >
                  <ArrowLeft size={20} color={COLORS.primary[700]} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formHeading}>Patient Registration</Text>
                  <Text style={styles.formSubheading}>
                    Establish your digital health identity and lifelong OneHealth ID pass.
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Full Legal Name *</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                <TextInput
                  testID="patient-name-input"
                  style={styles.textInput}
                  placeholder="e.g. Ramesh Patel"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!isSubmitting}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Mobile Number *</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <View style={styles.phoneInputWrapper}>
                  <Phone size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                  <TextInput
                    testID="patient-phone-input"
                    style={styles.textInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <View style={styles.rowTwoFields}>
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Age *</Text>
                  <View style={styles.inputWrapper}>
                    <Calendar size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                    <TextInput
                      testID="patient-age-input"
                      style={styles.textInput}
                      placeholder="e.g. 28"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      maxLength={3}
                      value={age}
                      onChangeText={(val) => {
                        setAge(val.replace(/[^0-9]/g, ""));
                        if (errorMessage) setErrorMessage(null);
                      }}
                      editable={!isSubmitting}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Gender *</Text>
                  <View style={styles.genderRow}>
                    {["Male", "Female", "Other"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        testID={`gender-${g.toLowerCase()}`}
                        style={[
                          styles.genderPill,
                          gender === g && styles.genderPillActive,
                        ]}
                        onPress={() => setGender(g)}
                      >
                        <Text
                          style={[
                            styles.genderPillText,
                            gender === g && styles.genderPillTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Email Address (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                <TextInput
                  testID="patient-email-input"
                  style={styles.textInput}
                  placeholder="name@domain.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!isSubmitting}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Account Password *</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                <TextInput
                  testID="patient-password-input"
                  style={styles.textInput}
                  placeholder="Min 8 characters"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!isSubmitting}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  testID="toggle-password"
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? <EyeOff size={18} color={COLORS.textMuted} /> : <Eye size={18} color={COLORS.textMuted} />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Confirm Password *</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                <TextInput
                  testID="patient-confirm-password-input"
                  style={styles.textInput}
                  placeholder="Re-enter password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!isSubmitting}
                  autoCapitalize="none"
                />
              </View>

              {/* Mandatory Consent Checkbox */}
              <TouchableOpacity
                testID="patient-consent-checkbox"
                style={styles.consentRow}
                onPress={() => setConsentGiven(!consentGiven)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, consentGiven && styles.checkboxActive]}>
                  {consentGiven && <Check size={14} color={COLORS.neutral.white} />}
                </View>
                <Text style={styles.consentText}>
                  I consent to establish a digital health identity (OneHealth ID) and agree to the{" "}
                  <Text style={styles.consentLink} onPress={() => Linking.openURL("https://ohid.online/terms")}>
                    Terms & Privacy Policy
                  </Text>.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="submit-patient-register"
                style={[
                  styles.primaryButton,
                  (!name.trim() || phone.length !== 10 || password.length < 8 || isSubmitting) && styles.buttonDisabled,
                ]}
                disabled={!name.trim() || phone.length !== 10 || password.length < 8 || isSubmitting}
                onPress={handlePatientSubmit}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.neutral.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create My OneHealth ID Pass</Text>
                )}
              </TouchableOpacity>
            </Card>
          )}

          {/* 3. PATIENT SUCCESS VIEW */}
          {selectedRole === "PATIENT" && successResult && (
            <Card style={styles.formCard}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 size={48} color={COLORS.success[600]} />
              </View>
              <Text style={styles.successHeading}>Welcome to OneHealth ID!</Text>
              <Text style={styles.successSubheading}>
                Your universal patient pass has been generated.
              </Text>

              <View style={styles.oneHealthPassBox}>
                <Text style={styles.oneHealthPassLabel}>YOUR ONEHEALTH ID</Text>
                <Text style={styles.oneHealthPassNumber} testID="generated-onehealth-id">
                  {successResult.onehealth_id}
                </Text>
                <Text style={styles.oneHealthPassSub}>
                  Keep this ID safe. You can use it across all participating hospital OPDs.
                </Text>
              </View>

              <TouchableOpacity
                testID="go-to-patient-portal"
                style={styles.primaryButton}
                onPress={() => router.replace("/(patient)")}
              >
                <Text style={styles.primaryButtonText}>Proceed to Patient Portal</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* 4. DOCTOR ONBOARDING GUIDANCE */}
          {selectedRole === "DOCTOR" && (
            <Card style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <TouchableOpacity onPress={() => setSelectedRole("SELECT")} style={styles.backButton}>
                  <ArrowLeft size={20} color={COLORS.primary[700]} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formHeading}>Doctor Registration</Text>
                  <Text style={styles.formSubheading}>Professional verification requirements</Text>
                </View>
              </View>

              <View style={styles.noticeBox}>
                <ShieldCheck size={24} color={COLORS.primary[700]} style={{ marginBottom: SPACING.xs }} />
                <Text style={styles.noticeTitle}>Clinical Verification Mandatory</Text>
                <Text style={styles.noticeBody}>
                  Under clinical governance standards, medical practitioners must be verified with:
                </Text>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>Valid National Medical Commission (NMC) or State Medical Council Registration Number</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>Recognized Medical Degree Qualification (MBBS, MD, MS, DNB)</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>Hospital or Clinical Practice Affiliation</Text>
                </View>
              </View>

              <Text style={styles.guidancePrompt}>
                If you are joining an onboarded hospital, your Hospital Administrator can provision your account directly.
              </Text>

              <TouchableOpacity
                testID="doctor-web-onboard-button"
                style={styles.externalButton}
                onPress={() => Linking.openURL("https://ohid.online/register")}
              >
                <Text style={styles.externalButtonText}>Open Doctor Verification Portal</Text>
                <ExternalLink size={16} color={COLORS.primary[700]} style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setSelectedRole("SELECT")}
              >
                <Text style={styles.secondaryButtonText}>Back to Account Types</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* 5. HOSPITAL / FACILITY ONBOARDING */}
          {selectedRole === "HOSPITAL" && (
            <Card style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <TouchableOpacity onPress={() => setSelectedRole("SELECT")} style={styles.backButton}>
                  <ArrowLeft size={20} color={COLORS.primary[700]} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formHeading}>Healthcare Organisation</Text>
                  <Text style={styles.formSubheading}>Facility licensing & onboarding</Text>
                </View>
              </View>

              <View style={[styles.noticeBox, { backgroundColor: COLORS.warning[50], borderColor: COLORS.warning[200] }]}>
                <Building2 size={24} color={COLORS.warning[700]} style={{ marginBottom: SPACING.xs }} />
                <Text style={[styles.noticeTitle, { color: COLORS.warning[900] }]}>Administrative Approval Workflow</Text>
                <Text style={[styles.noticeBody, { color: COLORS.warning[900] }]}>
                  Hospital and clinic facilities must submit clinical establishment licenses and undergo review by the Super Admin governance committee.
                </Text>
              </View>

              <TouchableOpacity
                testID="hospital-portal-button"
                style={styles.primaryButton}
                onPress={() => Linking.openURL("https://ohid.online/register/facility")}
              >
                <Text style={styles.primaryButtonText}>Open Facility Onboarding Portal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="track-hospital-app-button"
                style={styles.secondaryButton}
                onPress={() => Linking.openURL("https://ohid.online/register/facility?tab=track")}
              >
                <Text style={styles.secondaryButtonText}>Track Existing Application Status</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* 6. STAFF GATED NOTICE */}
          {selectedRole === "STAFF" && (
            <Card style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <TouchableOpacity onPress={() => setSelectedRole("SELECT")} style={styles.backButton}>
                  <ArrowLeft size={20} color={COLORS.primary[700]} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formHeading}>Hospital Staff Access</Text>
                  <Text style={styles.formSubheading}>Administrative provisioning required</Text>
                </View>
              </View>

              <View style={[styles.noticeBox, { backgroundColor: COLORS.danger[50], borderColor: COLORS.danger[200] }]}>
                <ShieldAlert size={28} color={COLORS.danger[700]} style={{ marginBottom: SPACING.xs }} />
                <Text style={[styles.noticeTitle, { color: COLORS.danger[900] }]}>Access Must Be Provisioned</Text>
                <Text style={[styles.noticeBody, { color: COLORS.danger[900] }]}>
                  Reception, nursing, cashier, and department staff accounts cannot be registered publicly.
                </Text>
                <Text style={[styles.noticeBody, { color: COLORS.danger[900], marginTop: SPACING.xs }]}>
                  Your facility's authorized Hospital Administrator must provision your access and assign your department duties. If you received an invitation link, please open it in your browser.
                </Text>
              </View>

              <TouchableOpacity
                testID="staff-back-to-login"
                style={styles.primaryButton}
                onPress={() => router.replace("/(auth)/login")}
              >
                <Text style={styles.primaryButtonText}>Return to Sign In</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Bottom Link to Sign In */}
          <TouchableOpacity
            testID="register-bottom-login-link"
            style={styles.bottomLoginLink}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.bottomLoginText}>
              Already have an account? <Text style={styles.bottomLoginAction}>Sign In</Text>
            </Text>
          </TouchableOpacity>

          {/* Public Legal Footer */}
          <View style={styles.footerContainer}>
            <View style={styles.footerLinksRow}>
              <TouchableOpacity onPress={() => Linking.openURL("https://ohid.online/privacy")}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL("https://ohid.online/terms")}>
                <Text style={styles.legalLink}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL("https://ohid.online/support")}>
                <Text style={styles.legalLink}>Help & Support</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.copyrightText}>
              OneHealth ID (OH-ID) • Unified Digital Healthcare Pass
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  logoImage: {
    width: 60,
    height: 60,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  appName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[900],
    letterSpacing: -0.5,
  },
  appSubtitle: {
    ...TYPOGRAPHY.callout,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  sectionHeading: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  errorBanner: {
    backgroundColor: COLORS.danger[50],
    borderColor: COLORS.danger[200],
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorBannerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger[900],
    marginLeft: SPACING.sm,
    flex: 1,
  },
  roleCardTouchable: {
    marginBottom: SPACING.sm,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.neutral.white,
  },
  roleIconBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  roleTextContainer: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  roleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  popularBadge: {
    backgroundColor: COLORS.primary[100],
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.xs,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary[800],
  },
  roleDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  adminExclusionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.neutral[100],
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  adminExclusionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  formCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.neutral.white,
    borderColor: COLORS.border,
    shadowColor: COLORS.neutral[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  formHeading: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  formSubheading: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral[50],
    paddingHorizontal: SPACING.sm,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryCodeBadge: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.xs,
  },
  countryCodeText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary[800],
  },
  phoneInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral[50],
    paddingHorizontal: SPACING.sm,
  },
  fieldIcon: {
    marginRight: SPACING.xs,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    height: "100%",
  },
  rowTwoFields: {
    flexDirection: "row",
    alignItems: "center",
  },
  genderRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
  },
  genderPill: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    backgroundColor: COLORS.neutral[50],
  },
  genderPillActive: {
    backgroundColor: COLORS.primary[100],
    borderColor: COLORS.primary[600],
  },
  genderPillText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  genderPillTextActive: {
    color: COLORS.primary[800],
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  consentText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  consentLink: {
    color: COLORS.primary[700],
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: COLORS.primary[600],
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  buttonDisabled: {
    backgroundColor: COLORS.neutral[300],
  },
  primaryButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
  },
  secondaryButton: {
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  externalButton: {
    flexDirection: "row",
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary[300],
    backgroundColor: COLORS.primary[50],
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  externalButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary[700],
  },
  successIconWrapper: {
    alignItems: "center",
    marginVertical: SPACING.md,
  },
  successHeading: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  successSubheading: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  oneHealthPassBox: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  oneHealthPassLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[800],
    letterSpacing: 1,
  },
  oneHealthPassNumber: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[900],
    letterSpacing: 2,
    marginVertical: SPACING.xs,
  },
  oneHealthPassSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[700],
    textAlign: "center",
  },
  noticeBox: {
    padding: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  noticeTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary[900],
    marginBottom: 4,
  },
  noticeBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[800],
    lineHeight: 18,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  bulletDot: {
    color: COLORS.primary[700],
    marginRight: 6,
    fontSize: 14,
  },
  bulletText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[800],
    flex: 1,
    lineHeight: 16,
  },
  guidancePrompt: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginVertical: SPACING.xs,
  },
  bottomLoginLink: {
    marginTop: SPACING.lg,
    alignItems: "center",
  },
  bottomLoginText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  bottomLoginAction: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary[700],
  },
  footerContainer: {
    alignItems: "center",
    marginTop: SPACING.xxl,
    paddingTop: SPACING.lg,
  },
  footerLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  legalLink: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[700],
    textDecorationLine: "underline",
  },
  footerDot: {
    marginHorizontal: SPACING.sm,
    color: COLORS.textMuted,
  },
  copyrightText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
});
