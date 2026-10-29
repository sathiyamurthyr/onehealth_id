import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../src/theme";
import { Header } from "../../src/components/common/Header";
import { Card } from "../../src/components/common/Card";
import { useAuth } from "../../src/context/AuthContext";
import {
  Lock,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Fingerprint,
} from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithBiometrics, biometricCapability, isBiometricEnabled } = useAuth();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMobileChange = (text: string) => {
    setMobile(text);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errorMessage) setErrorMessage(null);
  };

  const handleLogin = async () => {
    const trimmed = mobile.trim();

    // 1. Conformance with backend: Reject email identifiers
    if (trimmed.includes("@")) {
      setErrorMessage(
        "Email is not a login identifier. Please enter your 10-digit Registered Mobile Number."
      );
      return;
    }

    // 2. Validate 10-digit Indian mobile number
    if (!/^\d{10}$/.test(trimmed)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    // 3. Validate password presence
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await login(trimmed, password);
      if (res.success) {
        router.replace(res.defaultRoute as any);
      } else {
        setErrorMessage(res.error || "Authentication failed. Please verify credentials.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "A network or encryption error occurred. Please try again.");
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
      setErrorMessage(err.message || "Biometric authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canShowBiometrics =
    biometricCapability.isEnrolled && isBiometricEnabled;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Header
        title="Account Access"
        subtitle="Sign in with your Registered Mobile Number"
      />

      {errorMessage && (
        <Card style={styles.errorBanner} testID="error-banner">
          <View style={styles.bannerRow}>
            <AlertCircle size={18} color={COLORS.danger[700]} />
            <Text style={styles.errorTitle}>Authentication Error</Text>
          </View>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </Card>
      )}

      <Card style={styles.formCard}>
        <Text style={styles.inputLabel}>Registered Mobile Number</Text>
        <View style={styles.inputWrapper}>
          <Phone size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            testID="mobile-input"
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={handleMobileChange}
            editable={!isSubmitting}
            autoCapitalize="none"
          />
        </View>

        <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>
          Password
        </Text>
        <View style={styles.inputWrapper}>
          <Lock size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            testID="password-input"
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={handlePasswordChange}
            editable={!isSubmitting}
            autoCapitalize="none"
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
          style={[styles.loginButton, isSubmitting && { opacity: 0.7 }]}
          disabled={isSubmitting}
          activeOpacity={0.8}
          onPress={handleLogin}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.neutral.white} size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {canShowBiometrics && (
          <TouchableOpacity
            testID="biometric-button"
            style={styles.biometricButton}
            onPress={handleBiometricUnlock}
            disabled={isSubmitting}
          >
            <Fingerprint size={20} color={COLORS.primary[600]} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.biometricButtonText}>
              Unlock with {biometricCapability.biometricType}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.complianceNote}>
          <ShieldCheck size={16} color={COLORS.success[600]} />
          <Text style={styles.complianceText}>
            Protected by Native ECDH P-256 Encryption & Hardware Keystore
          </Text>
        </View>
      </Card>
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
  },
  errorBanner: {
    backgroundColor: COLORS.danger[50],
    borderColor: COLORS.danger[200],
    marginBottom: SPACING.base,
    padding: SPACING.md,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  errorTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.danger[800],
    marginLeft: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.callout,
    color: COLORS.danger[900],
  },
  formCard: {
    padding: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  input: {
    flex: 1,
    height: 48,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  loginButton: {
    backgroundColor: COLORS.primary[600],
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  loginButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
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
  complianceNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.lg,
  },
  complianceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
    textAlign: "center",
  },
});
