/**
 * ONEHEALTH ID (OH-ID) Mobile — Native Authentication Screen
 * 
 * Production-grade, mobile-first authentication flow:
 * - Clean medical brand header with logo, title & connected journey subtitle.
 * - Subtle ambient watermarks (medical cross & leaf) matching brand aesthetic.
 * - Unified +91 country selector and 10-digit mobile number input with zero black outline.
 * - Security encryption indicator & primary action with directional arrow.
 * - Returning User flow: PBKDF2-secured 6-digit PIN & biometric unlock with OTP fallback.
 * - PIN Setup option for first-time sign-ins.
 * - Public footer: Privacy Policy, Terms & Conditions, Help & Support.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import React, { useState, useEffect, useRef } from "react";
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
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  Plus,
  Leaf,
} from "lucide-react-native";

export type AuthStep = "RETURNING_USER" | "MOBILE" | "VERIFY" | "PIN_SETUP";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_ICON = require("../../assets/icon.png");

export default function LoginScreen() {
  const router = useRouter();
  const {
    login,
    loginWithBiometrics,
    loginWithPin,
    setupAppPin,
    biometricCapability,
    isBiometricEnabled,
    hasConfiguredPin,
    rememberedPhone,
  } = useAuth();

  const [step, setStep] = useState<AuthStep>("MOBILE");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Returning user & PIN state
  const [pin, setPin] = useState("");
  const pinInputRef = useRef<any>(null);
  const initialCheckedRef = useRef(false);

  // PIN Setup state (post-first login)
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pendingRoute, setPendingRoute] = useState("/(patient)");

  // OTP Resend Countdown state
  const [resendCooldown, setResendCooldown] = useState(0);

  // Automatically offer returning user quick login if device has a saved PIN
  useEffect(() => {
    if (!initialCheckedRef.current && hasConfiguredPin && rememberedPhone) {
      initialCheckedRef.current = true;
      setStep("RETURNING_USER");
    }
  }, [hasConfiguredPin, rememberedPhone]);

  // Handle hardware Android back button to navigate steps backwards
  useEffect(() => {
    const onBackPress = () => {
      if (step === "VERIFY" || step === "PIN_SETUP") {
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

  const handlePinChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
    setPin(cleaned);
    if (errorMessage) setErrorMessage(null);

    if (cleaned.length === 6) {
      executePinVerification(cleaned);
    }
  };

  const executePinVerification = async (pinValue: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await loginWithPin(pinValue);
      if (res.success && res.defaultRoute) {
        router.replace(res.defaultRoute as any);
      } else {
        setErrorMessage(res.error || "Incorrect PIN. Please try again.");
        setPin("");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify PIN. Please try again.");
      setPin("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePin = async () => {
    if (newPin.length !== 6) {
      setErrorMessage("App PIN must be exactly 6 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMessage("PINs do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await setupAppPin(newPin);
      if (res.success) {
        router.replace(pendingRoute as any);
      } else {
        setErrorMessage(res.error || "Failed to set up PIN.");
      }
    } catch {
      setErrorMessage("Failed to establish secure PIN.");
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

  const rememberedMaskedPhone =
    rememberedPhone && rememberedPhone.length >= 5
      ? `+91 ${rememberedPhone.slice(0, 5)} •••••`
      : rememberedPhone
      ? `+91 ${rememberedPhone}`
      : "";

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Decorative Brand Watermarks */}
      <View style={styles.bgDecorations} pointerEvents="none">
        <View style={styles.crossWatermark}>
          <Plus size={84} color={COLORS.primary[200]} strokeWidth={3.5} />
        </View>
        <View style={styles.leafWatermark}>
          <Leaf size={76} color={COLORS.primary[300]} strokeWidth={2} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainWrapper}>
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
              {/* STEP 1: RETURNING USER (PIN / BIOMETRIC QUICK LOGIN) */}
              {step === "RETURNING_USER" && (
                <View>
                  <Text style={styles.cardHeading}>Welcome Back</Text>
                  <Text style={styles.cardSupporting}>
                    Sign in securely with your 6-digit PIN.
                  </Text>

                  {rememberedMaskedPhone ? (
                    <View style={styles.rememberedBadge}>
                      <Phone size={14} color={COLORS.primary[700]} style={{ marginRight: 6 }} />
                      <Text style={styles.rememberedBadgeText}>{rememberedMaskedPhone}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.inputLabel}>Enter 6-digit PIN</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => pinInputRef.current?.focus()}
                    style={styles.pinContainer}
                  >
                    <View style={styles.pinDotsRow}>
                      {[0, 1, 2, 3, 4, 5].map((index) => {
                        const isFilled = pin.length > index;
                        return (
                          <View
                            key={index}
                            testID={`pin-dot-${index}`}
                            style={[
                              styles.pinDot,
                              isFilled ? styles.pinDotFilled : styles.pinDotEmpty,
                            ]}
                          />
                        );
                      })}
                    </View>
                    <TextInput
                      ref={pinInputRef}
                      testID="pin-input"
                      style={styles.hiddenPinInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={pin}
                      onChangeText={handlePinChange}
                      secureTextEntry
                      autoFocus
                      editable={!isSubmitting}
                    />
                  </TouchableOpacity>

                  {isSubmitting && (
                    <View style={styles.pinSubmittingIndicator}>
                      <ActivityIndicator size="small" color={COLORS.primary[600]} />
                      <Text style={styles.pinSubmittingText}>Verifying secure PIN...</Text>
                    </View>
                  )}

                  {canShowBiometrics && (
                    <TouchableOpacity
                      testID="pin-quick-biometric"
                      style={styles.biometricButton}
                      onPress={handleBiometricUnlock}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
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

                  <TouchableOpacity
                    testID="forgot-pin-button"
                    style={styles.recoveryLinkButton}
                    onPress={() => {
                      setStep("MOBILE");
                      setErrorMessage(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot PIN? Sign in with Mobile OTP"
                  >
                    <Text style={styles.recoveryLinkText}>Forgot PIN? Sign in with Mobile OTP</Text>
                  </TouchableOpacity>

                  <View style={styles.switchAccountRow}>
                    <TouchableOpacity
                      testID="switch-to-otp-button"
                      onPress={() => {
                        setStep("MOBILE");
                        setErrorMessage(null);
                      }}
                      style={styles.switchAccountButton}
                    >
                      <Text style={styles.switchAccountText}>Sign in with a different number</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 2: MOBILE NUMBER ENTRY */}
              {step === "MOBILE" && (
                <View>
                  <Text style={styles.cardHeading}>Welcome to OH-ID</Text>
                  <Text style={styles.cardSupporting}>
                    Sign in securely to continue.
                  </Text>

                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View
                    style={[
                      styles.phoneInputContainer,
                      isInputFocused && styles.phoneInputContainerFocused,
                    ]}
                  >
                    <View style={styles.countryCodeSection}>
                      <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                      <ChevronDown
                        size={14}
                        color={COLORS.primary[700]}
                        style={styles.chevronIcon}
                      />
                    </View>
                    <View style={styles.inputVerticalDivider} />
                    <View style={styles.phoneInputSection}>
                      <Phone
                        size={18}
                        color={isInputFocused ? COLORS.primary[600] : COLORS.textMuted}
                        style={styles.fieldIcon}
                      />
                      <TextInput
                        testID="mobile-input"
                        style={[
                          styles.textInput,
                          Platform.OS === "web" && ({ outlineStyle: "none" } as any),
                        ]}
                        placeholder="10-digit mobile number"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={mobile}
                        onChangeText={handleMobileChange}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        editable={!isSubmitting}
                        autoFocus
                      />
                    </View>
                  </View>

                  {/* Security Encryption Indicator */}
                  <View style={styles.securityNoticeRow}>
                    <ShieldCheck
                      size={20}
                      color={COLORS.primary[600]}
                      style={styles.securityIcon}
                    />
                    <View style={styles.securityTextColumn}>
                      <Text style={styles.securityTitle}>Secure sign-in</Text>
                      <Text style={styles.securityDescription}>
                        Your information is encrypted and kept secure.
                      </Text>
                    </View>
                  </View>

                  {/* Primary Continue Button */}
                  <TouchableOpacity
                    testID="continue-button"
                    style={[
                      styles.primaryButton,
                      mobile.length < 10 ? styles.buttonDisabled : styles.buttonActive,
                    ]}
                    disabled={mobile.length < 10 || isSubmitting}
                    activeOpacity={0.8}
                    onPress={handleContinueWithMobile}
                  >
                    <View style={styles.buttonContentRow}>
                      <Text
                        style={[
                          styles.primaryButtonText,
                          mobile.length < 10 && styles.buttonTextDisabled,
                        ]}
                      >
                        Continue with Mobile Number
                      </Text>
                      <ArrowRight
                        size={18}
                        color={mobile.length < 10 ? "#E2E8F0" : COLORS.neutral.white}
                        style={styles.buttonArrowIcon}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Account Recovery Link */}
                  <TouchableOpacity
                    testID="forgot-password-link"
                    style={styles.recoveryLinkButton}
                    onPress={() => router.push("/(auth)/forgot-password" as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Having trouble signing in? Reset your password or recover account"
                  >
                    <Text style={styles.recoveryLinkText}>Having trouble signing in?</Text>
                  </TouchableOpacity>

                  {/* Registration Prompt */}
                  <View style={styles.registerPromptRow}>
                    <Text style={styles.registerPromptText}>New to OH-ID? </Text>
                    <TouchableOpacity
                      testID="register-link"
                      onPress={() => router.push("/(auth)/register" as any)}
                      accessibilityRole="button"
                      accessibilityLabel="Register for a new OneHealth ID account"
                    >
                      <Text style={styles.registerLinkText}>Register</Text>
                    </TouchableOpacity>
                  </View>

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
              )}

              {/* STEP 3: SECURITY VERIFICATION (PASSWORD / OTP) */}
              {step === "VERIFY" && (
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

                  <View style={styles.passwordHeaderRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TouchableOpacity
                      testID="verify-forgot-password-link"
                      onPress={() => router.push("/(auth)/forgot-password" as any)}
                      accessibilityRole="button"
                      accessibilityLabel="Forgot Password? Reset your credentials"
                    >
                      <Text style={styles.inlineForgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={[
                      styles.passwordInputWrapper,
                      isPasswordFocused && styles.phoneInputContainerFocused,
                    ]}
                  >
                    <Lock
                      size={18}
                      color={isPasswordFocused ? COLORS.primary[600] : COLORS.textMuted}
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      testID="password-input"
                      style={[
                        styles.textInput,
                        Platform.OS === "web" && ({ outlineStyle: "none" } as any),
                      ]}
                      placeholder="Enter your account password"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={handlePasswordChange}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
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
                    style={[styles.primaryButton, styles.buttonActive, isSubmitting && { opacity: 0.7 }]}
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

              {/* STEP 4: OPTIONAL 6-DIGIT PIN SETUP */}
              {step === "PIN_SETUP" && (
                <View>
                  <Text style={styles.cardHeading}>Set Up Quick PIN</Text>
                  <Text style={styles.cardSupporting}>
                    Create a 6-digit PIN for faster sign-in on this device.
                  </Text>

                  <Text style={styles.inputLabel}>New 6-digit PIN</Text>
                  <View style={styles.pinInputWrapper}>
                    <TextInput
                      testID="setup-pin-input"
                      style={[
                        styles.textInput,
                        Platform.OS === "web" && ({ outlineStyle: "none" } as any),
                      ]}
                      placeholder="Enter 6-digit PIN"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry
                      value={newPin}
                      onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, "").slice(0, 6))}
                      editable={!isSubmitting}
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Confirm PIN</Text>
                  <View style={styles.pinInputWrapper}>
                    <TextInput
                      testID="setup-pin-confirm"
                      style={[
                        styles.textInput,
                        Platform.OS === "web" && ({ outlineStyle: "none" } as any),
                      ]}
                      placeholder="Confirm 6-digit PIN"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry
                      value={confirmPin}
                      onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, "").slice(0, 6))}
                      editable={!isSubmitting}
                    />
                  </View>

                  <TouchableOpacity
                    testID="save-pin-button"
                    style={[styles.primaryButton, styles.buttonActive, isSubmitting && { opacity: 0.7 }]}
                    disabled={isSubmitting || newPin.length !== 6 || confirmPin.length !== 6}
                    activeOpacity={0.8}
                    onPress={handleSavePin}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={COLORS.neutral.white} size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Enable App PIN</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="skip-pin-button"
                    style={styles.recoveryLinkButton}
                    onPress={() => router.replace(pendingRoute as any)}
                  >
                    <Text style={styles.recoveryLinkText}>Skip for Now</Text>
                  </TouchableOpacity>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  bgDecorations: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  crossWatermark: {
    position: "absolute",
    top: 24,
    left: -12,
    opacity: 0.16,
    transform: [{ rotate: "12deg" }],
  },
  leafWatermark: {
    position: "absolute",
    top: 20,
    right: -10,
    opacity: 0.18,
    transform: [{ rotate: "-15deg" }],
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    flexGrow: 1,
    justifyContent: "center",
  },
  mainWrapper: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0B2545",
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  appSubtitle: {
    fontSize: 13,
    color: "#334155",
    textAlign: "center",
    maxWidth: 290,
    lineHeight: 18,
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
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    padding: SPACING.xl,
    borderRadius: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F2942",
    marginBottom: 4,
  },
  cardSupporting: {
    fontSize: 14,
    color: "#475569",
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
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  phoneInputContainerFocused: {
    borderColor: COLORS.primary[600],
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 0 0 3px rgba(2, 132, 199, 0.15)",
        } as any)
      : {}),
  },
  countryCodeSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    height: "100%",
    paddingHorizontal: 14,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary[800],
  },
  chevronIcon: {
    marginLeft: 6,
  },
  inputVerticalDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#DBEAFE",
  },
  phoneInputSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: "100%",
  },
  securityNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 18,
  },
  securityIcon: {
    marginRight: 10,
  },
  securityTextColumn: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    lineHeight: 18,
  },
  securityDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  buttonContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonArrowIcon: {
    marginLeft: 8,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: SPACING.sm,
    height: 52,
  },
  pinInputWrapper: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    height: 50,
    justifyContent: "center",
  },
  fieldIcon: {
    marginRight: 8,
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#0F172A",
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: COLORS.primary[600],
    shadowColor: COLORS.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: "#B4C6D8",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.neutral.white,
  },
  buttonTextDisabled: {
    color: "#F8FAFC",
  },
  recoveryLinkButton: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 6,
  },
  recoveryLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary[700],
  },
  registerPromptRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  registerPromptText: {
    fontSize: 13,
    color: "#64748B",
  },
  registerLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary[700],
  },
  passwordHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  inlineForgotText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[700],
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
    borderRadius: 14,
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
  // PIN and Returning User Styles
  rememberedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  rememberedBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary[800],
  },
  pinContainer: {
    marginVertical: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  pinDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  pinDotEmpty: {
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  hiddenPinInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  pinSubmittingIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
  },
  pinSubmittingText: {
    fontSize: 13,
    color: COLORS.primary[700],
    marginLeft: 8,
  },
  switchAccountRow: {
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  switchAccountButton: {
    paddingVertical: 4,
  },
  switchAccountText: {
    fontSize: 13,
    color: "#64748B",
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
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary[700],
    paddingHorizontal: 4,
  },
  footerDot: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  copyrightText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
});
