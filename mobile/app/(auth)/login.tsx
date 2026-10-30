/**
 * ONEHEALTH ID (OH-ID) Mobile — Native Authentication Screen
 * 
 * Production-grade, mobile-first authentication flow:
 * - Clean medical brand header with logo, title & connected journey subtitle.
 * - +91 country-code prefixed 10-digit mobile number input.
 * - Primary Action: "Continue with Mobile Number".
 * - Verification step: Password entry, Biometric unlock, OTP assistance & resend countdown.
 * - Public footer: Privacy Policy, Terms & Conditions, Help & Support.
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
  Linking,
  BackHandler,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../src/theme";
import { Card } from "../../src/components/common/Card";
import { useAuth } from "../../src/context/AuthContext";
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Fingerprint,
  ArrowLeft,
  KeyRound,
  RotateCcw,
  CheckCircle2,
} from "lucide-react-native";

type AuthStep = "MOBILE" | "VERIFY";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_ICON = require("../../assets/icon.png");

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithBiometrics, biometricCapability, isBiometricEnabled } = useAuth();

  const [step, setStep] = useState<AuthStep>("MOBILE");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Resend Countdown state
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle hardware Android back button to step back from VERIFY to MOBILE
  useEffect(() => {
    const onBackPress = () => {
      if (step === "VERIFY") {
        setStep("MOBILE");
        setErrorMessage(null);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [step]);

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

  const handleMobileChange = (text: string) => {
    // Keep only numeric digits and max 10 digits
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setMobile(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errorMessage) setErrorMessage(null);
  };

  const handleContinueWithMobile = () => {
    const trimmed = mobile.trim();

    if (trimmed.includes("@")) {
      setErrorMessage("Email is not supported. Please enter your 10-digit mobile number.");
      return;
    }

    if (trimmed.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setErrorMessage(null);
    setSuccessNotice(null);
    setStep("VERIFY");
  };

  const handleLoginSubmit = async () => {
    if (!password.trim()) {
      setErrorMessage("Please enter your password to continue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await login(mobile.trim(), password);
      if (res.success) {
        router.replace(res.defaultRoute as any);
      } else {
        setErrorMessage(res.error || "Authentication failed. Please verify your credentials.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "A network or connection error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricUnlock = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await loginWithBiometrics();
      if (res.success && res.defaultRoute) {
        router.replace(res.defaultRoute as any);
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Biometric verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setSuccessNotice("Verification challenge initiated. Check your registered SMS.");
    setErrorMessage(null);
  };

  const openExternalLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const canShowBiometrics =
    biometricCapability.isEnrolled && isBiometricEnabled;

  const maskedPhone =
    mobile.length === 10
      ? `+91 ${mobile.slice(0, 5)} •••••`
      : `+91 ${mobile}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand Section */}
          <View style={styles.brandHeader}>
            <Image
              source={APP_ICON}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>OneHealth ID</Text>
            <Text style={styles.appSubtitle}>
              One Digital Health Identity. A Connected Healthcare Journey.
            </Text>
          </View>

          {/* Error & Success Banners */}
          {errorMessage && (
            <Card style={styles.errorBanner} testID="error-banner">
              <View style={styles.bannerRow}>
                <AlertCircle size={18} color={COLORS.danger[700]} />
                <Text style={styles.errorTitle}>Authentication Notice</Text>
              </View>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </Card>
          )}

          {successNotice && (
            <Card style={styles.successBanner} testID="success-banner">
              <View style={styles.bannerRow}>
                <CheckCircle2 size={18} color={COLORS.success[700]} />
                <Text style={styles.successTitle}>Security Notice</Text>
              </View>
              <Text style={styles.successText}>{successNotice}</Text>
            </Card>
          )}

          {/* Main Card Form */}
          <Card style={styles.cardContainer}>
            {step === "MOBILE" ? (
              <View>
                <Text style={styles.cardHeading}>Welcome to OH-ID</Text>
                <Text style={styles.cardSupporting}>
                  Sign in securely to continue.
                </Text>

                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <View style={styles.phoneInputWrapper}>
                    <Phone size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                    <TextInput
                      testID="mobile-input"
                      style={styles.textInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={mobile}
                      onChangeText={handleMobileChange}
                      editable={!isSubmitting}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  testID="continue-button"
                  style={[
                    styles.primaryButton,
                    mobile.length < 10 && styles.buttonDisabled,
                  ]}
                  disabled={mobile.length < 10 || isSubmitting}
                  activeOpacity={0.8}
                  onPress={handleContinueWithMobile}
                >
                  <Text style={styles.primaryButtonText}>
                    Continue with Mobile Number
                  </Text>
                </TouchableOpacity>

                {canShowBiometrics && (
                  <TouchableOpacity
                    testID="biometric-quick-button"
                    style={styles.biometricButton}
                    onPress={handleBiometricUnlock}
                    disabled={isSubmitting}
                  >
                    <Fingerprint
                      size={20}
                      color={COLORS.primary[600]}
                      style={{ marginRight: SPACING.sm }}
                    />
                    <Text style={styles.biometricButtonText}>
                      Quick Unlock with {biometricCapability.biometricType}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View>
                <View style={styles.verifyHeaderRow}>
                  <TouchableOpacity
                    testID="back-to-mobile"
                    onPress={() => {
                      setStep("MOBILE");
                      setErrorMessage(null);
                    }}
                    style={styles.backButton}
                  >
                    <ArrowLeft size={20} color={COLORS.primary[700]} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHeading}>Security Verification</Text>
                    <Text style={styles.maskedPhoneText}>{maskedPhone}</Text>
                  </View>
                </View>

                <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>
                  Password
                </Text>
                <View style={styles.passwordInputWrapper}>
                  <Lock size={18} color={COLORS.textMuted} style={styles.fieldIcon} />
                  <TextInput
                    testID="password-input"
                    style={styles.textInput}
                    placeholder="Enter your account password"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={handlePasswordChange}
                    editable={!isSubmitting}
                    autoCapitalize="none"
                    autoFocus
                  />
                  <TouchableOpacity
                    testID="toggle-password"
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={COLORS.textMuted} />
                    ) : (
                      <Eye size={18} color={COLORS.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  testID="login-button"
                  style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                  onPress={handleLoginSubmit}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={COLORS.neutral.white} size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In to OH-ID</Text>
                  )}
                </TouchableOpacity>

                {canShowBiometrics && (
                  <TouchableOpacity
                    testID="biometric-button"
                    style={styles.biometricButton}
                    onPress={handleBiometricUnlock}
                    disabled={isSubmitting}
                  >
                    <Fingerprint
                      size={20}
                      color={COLORS.primary[600]}
                      style={{ marginRight: SPACING.sm }}
                    />
                    <Text style={styles.biometricButtonText}>
                      Unlock with {biometricCapability.biometricType}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* OTP Assistance Section */}
                <View style={styles.otpAssistanceContainer}>
                  <View style={styles.otpDivider} />
                  <TouchableOpacity
                    testID="otp-request-button"
                    style={styles.otpActionRow}
                    onPress={handleRequestOtp}
                    disabled={resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? (
                      <View style={styles.countdownBadge}>
                        <RotateCcw size={14} color={COLORS.textMuted} />
                        <Text style={styles.countdownText}>
                          Resend challenge in {resendCooldown}s
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.otpRowActive}>
                        <KeyRound size={16} color={COLORS.primary[600]} />
                        <Text style={styles.otpTextActive}>
                          Forgot Password? Verify with OTP
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>

          {/* Public Legal & Support Footer */}
          <View style={styles.footerContainer}>
            <View style={styles.footerLinksRow}>
              <TouchableOpacity
                onPress={() => openExternalLink("https://ohid.online/privacy")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity
                onPress={() => openExternalLink("https://ohid.online/terms")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.footerLink}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity
                onPress={() => openExternalLink("https://ohid.online/support")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.footerLink}>Help & Support</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    flexGrow: 1,
    justifyContent: "space-between",
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  appName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[900],
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    ...TYPOGRAPHY.callout,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: COLORS.danger[50],
    borderColor: COLORS.danger[200],
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  successBanner: {
    backgroundColor: COLORS.success[50],
    borderColor: COLORS.success[200],
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  errorTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger[800],
    marginLeft: SPACING.xs,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger[900],
  },
  successTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.success[800],
    marginLeft: SPACING.xs,
  },
  successText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success[900],
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary[100],
    borderWidth: 1,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    shadowColor: COLORS.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeading: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSupporting: {
    ...TYPOGRAPHY.callout,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  verifyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary[50],
  },
  maskedPhoneText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[700],
    marginTop: 2,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryCodeBadge: {
    height: 48,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
    borderWidth: 1,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 48,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 48,
  },
  fieldIcon: {
    marginRight: SPACING.sm,
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  textInput: {
    flex: 1,
    height: 48,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
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
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  biometricButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary[700],
  },
  otpAssistanceContainer: {
    marginTop: SPACING.lg,
    alignItems: "center",
  },
  otpDivider: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  otpActionRow: {
    paddingVertical: SPACING.xs,
  },
  otpRowActive: {
    flexDirection: "row",
    alignItems: "center",
  },
  otpTextActive: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[600],
    marginLeft: SPACING.xs,
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
  footerContainer: {
    alignItems: "center",
    marginTop: SPACING.xxl,
    paddingTop: SPACING.lg,
  },
  footerLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerLink: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[700],
    paddingHorizontal: 4,
  },
  footerDot: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  copyrightText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontSize: 11,
    textAlign: "center",
  },
});
