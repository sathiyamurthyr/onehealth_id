/**
 * ONEHEALTH ID (OH-ID) Mobile — Global Auth & Session Context
 * 
 * Manages native authentication lifecycle, biometric gating,
 * hardware keystore persistence, and authoritative role routing.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { UserProfile } from "../types/auth";
import { secureStorage } from "../services/storage/secure_store";
import { authApi } from "../services/api/auth";
import { biometricService, BiometricCapability } from "../services/auth/biometrics";
import { pinService, PinVerificationResult } from "../services/auth/pin_service";

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeRole: string | null;
  availableRoles: string[];
  biometricCapability: BiometricCapability;
  isBiometricEnabled: boolean;
  hasConfiguredPin: boolean;
  rememberedPhone: string | null;
  rememberedName: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; defaultRoute: string; error?: string }>;
  loginWithBiometrics: () => Promise<{ success: boolean; defaultRoute?: string; error?: string }>;
  loginWithPin: (pin: string) => Promise<PinVerificationResult & { defaultRoute?: string }>;
  setupAppPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  clearAppPin: () => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: string) => Promise<string>;
  setBiometricPreference: (enabled: boolean) => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const resolveRoleRoute = (role?: string): string => {
  const normalized = (role || "").toUpperCase().trim();
  switch (normalized) {
    case "PATIENT":
    case "CITIZEN":
      return "/(patient)";
    case "DOCTOR":
    case "PHYSICIAN":
    case "NURSE":
    case "CLINICAL_STAFF":
      return "/(doctor)";
    case "RECEPTIONIST":
    case "FRONT_DESK":
    case "CASHIER":
    case "STAFF":
      return "/(reception)";
    case "HOSPITAL_ADMIN":
    case "ADMIN":
      return "/(admin)";
    case "SUPER_ADMIN":
    case "PLATFORM_ADMIN":
      return "/(super)";
    default:
      return "/(patient)";
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability>({
    hasHardware: false,
    isEnrolled: false,
    biometricType: "None",
  });
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(false);
  const [hasConfiguredPin, setHasConfiguredPin] = useState<boolean>(false);
  const [rememberedPhone, setRememberedPhone] = useState<string | null>(null);
  const [rememberedName, setRememberedName] = useState<string | null>(null);

  // Initialize session state on app bootstrap
  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      try {
        const [storedToken, storedUser, bioCap, bioPref, hasPin, remembered] = await Promise.all([
          secureStorage.getAccessToken(),
          secureStorage.getActiveUser(),
          biometricService.getCapability(),
          biometricService.isBiometricEnabled(),
          pinService.hasConfiguredPin(),
          secureStorage.getRememberedUser(),
        ]);

        if (!isMounted) return;

        setBiometricCapability(bioCap);
        setIsBiometricEnabled(bioPref);
        setHasConfiguredPin(hasPin);
        setRememberedPhone(remembered.phone);
        setRememberedName(remembered.name);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
          setActiveRole(storedUser.role);
          // Non-blocking background verification of active token
          authApi.getMe().then((liveProfile) => {
            if (isMounted && liveProfile) {
              setUser(liveProfile);
              setActiveRole(liveProfile.role);
            }
          }).catch(() => {
            // Silently retain cached session if offline; 401 interceptor handles revocation
          });
        }
      } catch (err) {
        console.warn("Failed to restore mobile auth session:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (
      username: string,
      password: string
    ): Promise<{ success: boolean; defaultRoute: string; error?: string }> => {
      try {
        const res = await authApi.login(username, password);
        const resolvedUser = res.user;
        const accessToken = res.access_token || null;

        setUser(resolvedUser);
        setToken(accessToken);
        setActiveRole(resolvedUser.role);
        setRememberedPhone(resolvedUser.username);
        setRememberedName(resolvedUser.name || resolvedUser.full_name || null);

        // Fetch authoritative workspace route if available
        let targetRoute = resolveRoleRoute(resolvedUser.role);
        try {
          const ws = await authApi.getWorkspace();
          if (ws?.default_route) {
            targetRoute = resolveRoleRoute(ws.role_code || resolvedUser.role);
          }
        } catch {
          // Use default fallback route
        }

        return {
          success: true,
          defaultRoute: targetRoute,
        };
      } catch (err: any) {
        const errorMsg =
          err.message || "Invalid mobile number or credentials. Please verify and try again.";
        return {
          success: false,
          defaultRoute: "/(auth)/login",
          error: errorMsg,
        };
      }
    },
    []
  );

  const loginWithBiometrics = useCallback(async (): Promise<{
    success: boolean;
    defaultRoute?: string;
    error?: string;
  }> => {
    if (!biometricCapability.isEnrolled || !isBiometricEnabled) {
      return { success: false, error: "Biometric authentication is not enabled on this device." };
    }

    const authenticated = await biometricService.authenticate();
    if (!authenticated) {
      return { success: false, error: "Biometric verification failed or was cancelled." };
    }

    const storedToken = await secureStorage.getAccessToken();
    const storedUser = await secureStorage.getActiveUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      setActiveRole(storedUser.role);
      return {
        success: true,
        defaultRoute: resolveRoleRoute(storedUser.role),
      };
    }

    return {
      success: false,
      error: "No active session found. Please log in with your password to enroll.",
    };
  }, [biometricCapability, isBiometricEnabled]);

  const loginWithPin = useCallback(
    async (
      pin: string
    ): Promise<PinVerificationResult & { defaultRoute?: string }> => {
      const pinResult = await pinService.verifyPin(pin);
      if (!pinResult.success) {
        return pinResult;
      }

      const storedToken = await secureStorage.getAccessToken();
      const storedUser = await secureStorage.getActiveUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        setActiveRole(storedUser.role);
        return {
          success: true,
          defaultRoute: resolveRoleRoute(storedUser.role),
        };
      }

      return {
        success: false,
        error: "Session expired or unavailable. Please authenticate with Mobile OTP.",
      };
    },
    []
  );

  const setupAppPin = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      const res = await pinService.setupPin(pin);
      if (res.success) {
        setHasConfiguredPin(true);
      }
      return res;
    },
    []
  );

  const clearAppPin = useCallback(async (): Promise<void> => {
    await pinService.clearPin();
    setHasConfiguredPin(false);
  }, []);

  const switchRole = useCallback(async (newRole: string): Promise<string> => {
    if (!user) throw new Error("No active authenticated session.");
    const validRoles = Array.from(new Set([user.role, ...(user.roles || [])].filter(Boolean)));
    if (!validRoles.includes(newRole)) {
      throw new Error(`Unauthorized role switch to ${newRole}`);
    }
    const updatedUser = { ...user, role: newRole };
    setUser(updatedUser);
    setActiveRole(newRole);
    await secureStorage.setActiveUser(updatedUser);
    return resolveRoleRoute(newRole);
  }, [user]);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setToken(null);
      setActiveRole(null);
      setIsLoading(false);
    }
  }, []);

  const setBiometricPreference = useCallback(async (enabled: boolean): Promise<void> => {
    await biometricService.setBiometricEnabled(enabled);
    setIsBiometricEnabled(enabled);
  }, []);

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const liveUser = await authApi.getMe();
      if (liveUser) {
        setUser(liveUser);
        setActiveRole(liveUser.role);
      }
    } catch {
      // Interceptors handle session revocation
    }
  }, []);

  const availableRoles = user
    ? Array.from(new Set([user.role, ...(user.roles || [])].filter(Boolean)))
    : [];

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    activeRole: activeRole || user?.role || null,
    availableRoles,
    biometricCapability,
    isBiometricEnabled,
    hasConfiguredPin,
    rememberedPhone,
    rememberedName,
    login,
    loginWithBiometrics,
    loginWithPin,
    setupAppPin,
    clearAppPin,
    logout,
    switchRole,
    setBiometricPreference,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
