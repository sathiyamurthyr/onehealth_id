/**
 * ONEHEALTH ID (OH-ID) Mobile — Account Recovery & Password Reset
 * 
 * Secure, anti-enumeration credential recovery flow:
 * - Step 1 (IDENTIFY): Registered email input with anti-enumeration response.
 * - Step 2 (VERIFY_OTP): 6-digit verification code with 60s cooldown and 5-attempt limit.
 * - Step 3 (NEW_PASSWORD): Strong password creation and single-use token consumption.
 * - Step 4 (ASSISTANCE): Support ticket generation (REQ-2026-XXXXXX) for recovery issues.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import React, { useState, useEffect } from "react";
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
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Headphones,
  Check,
  Phone,
} from "lucide-react-native";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_ICON = require("../../assets/icon.png");

type RecoveryStep = "IDENTIFY" | "VERIFY_OTP" | "NEW_PASSWORD" | "SUCCESS" | "ASSISTANCE";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<RecoveryStep>("IDENTIFY");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Assistance ticket state
  const [contactPhone, setContactPhone] = useState("");
  const [assistanceDesc, setAssistanceDesc] = useState("");
  const [ticketRef, setTicketRef] = useState<string | null>(null);

  // Interaction & Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Mask email for display
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => `${a}${"•".repeat(Math.min(b.length, 5))}${c}`)
    : "";

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Please enter a valid registered email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await authApi.forgotPassword(cleanEmail);
      setInfoMessage(
        res.message ||
        "If an active account is associated with this email, a verification code has been dispatched."
      );
      setResendCooldown(60);
      setStep("VERIFY_OTP");
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to initiate password reset.";
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await authApi.verifyResetOtp(email.trim().toLowerCase(), cleanOtp);
      setResetToken(res.reset_token);
      setInfoMessage("Code confirmed. Please set your new password.");
      setStep("NEW_PASSWORD");
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Invalid or expired verification code.";
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authApi.resendResetOtp(email.trim().toLowerCase());
      setResendCooldown(60);
      setInfoMessage("A new verification code has been dispatched to your email.");
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to resend code.";
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Confirm Password Reset
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumberOrSymbol = /[\d\W]/.test(newPassword);
    if (!hasLetter || !hasNumberOrSymbol) {
      setErrorMessage("Password must contain both letters and numbers or symbols.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep("SUCCESS");
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to reset password.";
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: Submit Assistance Request
  const handleSubmitAssistance = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address for contact.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await authApi.requestAssistance({
        email: cleanEmail,
        category: "ACCOUNT_RECOVERY",
        description: assistanceDesc.trim() || "User requested account recovery assistance from mobile app.",
        contact_phone: contactPhone.trim() || undefined,
      });
      setTicketRef(res.reference_number);
      setInfoMessage(res.message);
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to submit assistance request.";
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password checklist checks
  const isLengthValid = newPassword.length >= 8;
  const isComplexityValid = /[a-zA-Z]/.test(newPassword) && /[\d\W]/.test(newPassword);
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

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
            <Text style={styles.appSubtitle}>Account Recovery & Security Verification</Text>
          </View>

          {/* Feedback Notices */}
          {errorMessage && (
            <Card style={styles.errorBanner} testID="error-banner">
              <View style={styles.bannerRow}>
                <AlertCircle size={18} color={COLORS.danger[700]} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            </Card>
          )}

          {infoMessage && (
            <Card style={styles.infoBanner} testID="info-banner">
              <View style={styles.bannerRow}>
                <CheckCircle2 size={18} color={COLORS.primary[700]} />
                <Text style={styles.infoBannerText}>{infoMessage}</Text>
              </View>
            </Card>
          )}

          {/* Step 1: Identify Account */}
          {step === "IDENTIFY" && (
            <Card style={styles.cardContainer}>
              <View style={styles.cardTitleRow}>
                <KeyRound size={22} color={COLORS.primary[600]} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeading}>Forgot Password?</Text>
                  <Text style={styles.cardSubheading}>
                    Enter your registered email address to receive a 6-digit verification code.
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Registered Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                <TextInput
                  testID="recovery-email-input"
                  style={styles.textInput}
                  placeholder="name@domain.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!isSubmitting}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                testID="send-code-button"
                style={[styles.primaryButton, (!email.trim() || isSubmitting) && styles.buttonDisabled]}
                disabled={!email.trim() || isSubmitting}
                onPress={handleRequestOtp}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.neutral.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>

              <View style={styles.assistanceDivider} />

              <TouchableOpacity
                testID="open-assistance-button"
                style={styles.assistanceLinkButton}
                onPress={() => {
                  setStep("ASSISTANCE");
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
              >
                <Headphones size={16} color={COLORS.primary[700]} style={{ marginRight: 6 }} />
                <Text style={styles.assistanceLinkText}>Having trouble? Request Support Help</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Step 2: Verify OTP */}
          {step === "VERIFY_OTP" && (
            <Card style={styles.cardContainer}>
              <View style={styles.headerBackRow}>
                <TouchableOpacity
                  testID="back-to-identify"
                  onPress={() => {
                    setStep("IDENTIFY");
                    setErrorMessage(null);
                  }}
                  style={styles.backButton}
                >
                  <ArrowLeft size={20} color={COLORS.primary[700]} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeading}>Enter Verification Code</Text>
                  <Text style={styles.cardSubheading}>
                    Enter the 6-digit code dispatched to {maskedEmail}
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>6-Digit Security Code</Text>
              <View style={styles.inputWrapper}>
                <ShieldAlert size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                <TextInput
                  testID="recovery-otp-input"
                  style={[styles.textInput, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val.replace(/[^0-9]/g, ""));
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!isSubmitting}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                testID="verify-code-button"
                style={[styles.primaryButton, (otp.length !== 6 || isSubmitting) && styles.buttonDisabled]}
                disabled={otp.length !== 6 || isSubmitting}
                onPress={handleVerifyOtp}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.neutral.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify Code & Continue</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <View style={styles.countdownBadge}>
                    <RotateCcw size={14} color={COLORS.textMuted} />
                    <Text style={styles.countdownText}>Resend code in {resendCooldown}s</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    testID="resend-code-button"
                    onPress={handleResendOtp}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.resendActionText}>Resend verification code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          )}

          {/* Step 3: Set New Password */}
          {step === "NEW_PASSWORD" && (
            <Card style={styles.cardContainer}>
              <View style={styles.cardTitleRow}>
                <Lock size={22} color={COLORS.primary[600]} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeading}>Set New Password</Text>
                  <Text style={styles.cardSubheading}>
                    Choose a secure, strong password for your OneHealth ID.
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                <TextInput
                  testID="new-password-input"
                  style={styles.textInput}
                  placeholder="At least 8 characters"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!isSubmitting}
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity
                  testID="toggle-new-password"
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? <EyeOff size={18} color={COLORS.textMuted} /> : <Eye size={18} color={COLORS.textMuted} />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                <TextInput
                  testID="confirm-password-input"
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

              {/* Password Checklist */}
              <View style={styles.checklistContainer}>
                <View style={styles.checkItem}>
                  <Check size={14} color={isLengthValid ? COLORS.success[600] : COLORS.neutral[400]} />
                  <Text style={[styles.checkText, isLengthValid && styles.checkTextActive]}>
                    Minimum 8 characters
                  </Text>
                </View>
                <View style={styles.checkItem}>
                  <Check size={14} color={isComplexityValid ? COLORS.success[600] : COLORS.neutral[400]} />
                  <Text style={[styles.checkText, isComplexityValid && styles.checkTextActive]}>
                    Letters and numbers or symbols
                  </Text>
                </View>
                <View style={styles.checkItem}>
                  <Check size={14} color={isMatchValid ? COLORS.success[600] : COLORS.neutral[400]} />
                  <Text style={[styles.checkText, isMatchValid && styles.checkTextActive]}>
                    Passwords match
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                testID="reset-password-button"
                style={[
                  styles.primaryButton,
                  (!isLengthValid || !isComplexityValid || !isMatchValid || isSubmitting) && styles.buttonDisabled,
                ]}
                disabled={!isLengthValid || !isComplexityValid || !isMatchValid || isSubmitting}
                onPress={handleResetPassword}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.neutral.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Update Password & Sign In</Text>
                )}
              </TouchableOpacity>
            </Card>
          )}

          {/* Step 4: Success Confirmation */}
          {step === "SUCCESS" && (
            <Card style={styles.cardContainer}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 size={48} color={COLORS.success[600]} />
              </View>
              <Text style={styles.successHeading}>Password Reset Complete</Text>
              <Text style={styles.successSubheading}>
                Your password has been successfully updated. All active mobile and web sessions have been refreshed.
              </Text>
              <TouchableOpacity
                testID="back-to-login-success"
                style={styles.primaryButton}
                onPress={() => router.replace("/(auth)/login")}
              >
                <Text style={styles.primaryButtonText}>Sign In with New Password</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Assistance Form */}
          {step === "ASSISTANCE" && (
            <Card style={styles.cardContainer}>
              <View style={styles.headerBackRow}>
                <TouchableOpacity
                  testID="back-to-identify-from-assistance"
                  onPress={() => {
                    setStep("IDENTIFY");
                    setErrorMessage(null);
                  }}
                  style={styles.backButton}
                >
                  <ArrowLeft size={20} color={COLORS.primary[700]} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeading}>Support Assistance</Text>
                  <Text style={styles.cardSubheading}>
                    Submit an account recovery ticket to our security support team.
                  </Text>
                </View>
              </View>

              {ticketRef ? (
                <View style={styles.ticketResultContainer}>
                  <Text style={styles.ticketLabel}>Support Reference Number</Text>
                  <Text style={styles.ticketNumber} testID="ticket-ref-text">{ticketRef}</Text>
                  <Text style={styles.ticketNote}>
                    Please preserve this reference number. Our support team will review your account ownership.
                  </Text>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace("/(auth)/login")}
                  >
                    <Text style={styles.primaryButtonText}>Return to Login</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Account Email</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                    <TextInput
                      testID="assistance-email-input"
                      style={styles.textInput}
                      placeholder="name@domain.com"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Contact Phone (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                    <TextInput
                      testID="assistance-phone-input"
                      style={styles.textInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={contactPhone}
                      onChangeText={(val) => setContactPhone(val.replace(/[^0-9]/g, ""))}
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Issue Description</Text>
                  <View style={[styles.inputWrapper, { height: 80, alignItems: "flex-start", paddingTop: SPACING.sm }]}>
                    <TextInput
                      testID="assistance-desc-input"
                      style={[styles.textInput, { height: 60 }]}
                      placeholder="Describe the issue you are experiencing with your account..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      value={assistanceDesc}
                      onChangeText={setAssistanceDesc}
                    />
                  </View>

                  <TouchableOpacity
                    testID="submit-assistance-button"
                    style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                    disabled={isSubmitting}
                    onPress={handleSubmitAssistance}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={COLORS.neutral.white} size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Submit Assistance Request</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </Card>
          )}

          {/* Footer Back to Login Link */}
          {step !== "SUCCESS" && (
            <TouchableOpacity
              testID="return-to-login"
              style={styles.bottomLoginLink}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={styles.bottomLoginText}>
                Remember your password? <Text style={styles.bottomLoginAction}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}

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
  errorBanner: {
    backgroundColor: COLORS.danger[50],
    borderColor: COLORS.danger[200],
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoBanner: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
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
  infoBannerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[900],
    marginLeft: SPACING.sm,
    flex: 1,
  },
  cardContainer: {
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
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  headerBackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  cardHeading: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  cardSubheading: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
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
  fieldIcon: {
    marginRight: SPACING.xs,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    height: "100%",
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  eyeIcon: {
    padding: SPACING.xs,
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
  resendRow: {
    alignItems: "center",
    marginTop: SPACING.md,
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  countdownText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  resendActionText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[700],
  },
  checklistContainer: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.sm,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  checkText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  checkTextActive: {
    color: COLORS.success[700],
    fontWeight: "600",
  },
  assistanceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  assistanceLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  assistanceLinkText: {
    ...TYPOGRAPHY.captionBold,
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
    lineHeight: 22,
  },
  ticketResultContainer: {
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  ticketLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  ticketNumber: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[700],
    marginVertical: SPACING.sm,
    letterSpacing: 1,
  },
  ticketNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 18,
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
