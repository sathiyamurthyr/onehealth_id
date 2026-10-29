/**
 * ONEHEALTH ID (OH-ID) Mobile — Phase G Release Readiness & Security Audit Test Suite
 * Sathus Technology Pvt Ltd
 *
 * Validates manifest permissions, EAS build profiles, app icon assets,
 * hardware keystore compliance, and cryptographic assurance prior to Google Play release.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
declare const __dirname: string;
const fs = require("fs");
const path = require("path");
import { payloadCrypto, isRouteExcluded } from "../src/crypto/payload_encryption";
import { secureStorage } from "../src/services/storage/secure_store";

describe("Phase G: Release Readiness & DevSecOps Validation", () => {
  const rootDir = path.resolve(__dirname, "..");

  describe("Application Manifest & Permissions (app.json)", () => {
    const appJsonPath = path.join(rootDir, "app.json");
    let appJson: any;

    beforeAll(() => {
      expect(fs.existsSync(appJsonPath)).toBe(true);
      const raw = fs.readFileSync(appJsonPath, "utf-8");
      appJson = JSON.parse(raw);
    });

    test("verifies package identifier conforms to com.ohid.health", () => {
      expect(appJson.expo.android.package).toBe("com.ohid.health");
      expect(appJson.expo.ios.bundleIdentifier).toBe("com.ohid.health");
      expect(appJson.expo.scheme).toBe("ohid");
    });

    test("verifies camera and biometric permissions are declared in Android and iOS", () => {
      // Android Permissions
      const permissions = appJson.expo.android.permissions;
      expect(permissions).toContain("android.permission.CAMERA");
      expect(permissions).toContain("android.permission.USE_BIOMETRIC");
      expect(permissions).toContain("android.permission.USE_FINGERPRINT");

      // iOS InfoPlist strings
      const infoPlist = appJson.expo.ios.infoPlist;
      expect(infoPlist.NSCameraUsageDescription).toMatch(/camera access to scan patient/i);
      expect(infoPlist.NSFaceIDUsageDescription).toMatch(/biometric authentication/i);
    });

    test("verifies app icon, splash, and adaptive icon configurations", () => {
      expect(appJson.expo.icon).toBe("./assets/icon.png");
      expect(fs.existsSync(path.join(rootDir, "assets", "splash.png"))).toBe(true);
      expect(appJson.expo.android.adaptiveIcon.foregroundImage).toBe("./assets/adaptive-icon.png");
    });
  });

  describe("Physical Assets Verification (mobile/assets/)", () => {
    const assetsDir = path.join(rootDir, "assets");

    test("verifies required production image binaries exist on disk", () => {
      expect(fs.existsSync(assetsDir)).toBe(true);
      expect(fs.existsSync(path.join(assetsDir, "icon.png"))).toBe(true);
      expect(fs.existsSync(path.join(assetsDir, "adaptive-icon.png"))).toBe(true);
      expect(fs.existsSync(path.join(assetsDir, "splash.png"))).toBe(true);
      expect(fs.existsSync(path.join(assetsDir, "favicon.png"))).toBe(true);

      const iconStats = fs.statSync(path.join(assetsDir, "icon.png"));
      expect(iconStats.size).toBeGreaterThan(1000); // Non-empty image asset
    });
  });

  describe("EAS Build Configuration (eas.json)", () => {
    const easJsonPath = path.join(rootDir, "eas.json");
    let easJson: any;

    beforeAll(() => {
      expect(fs.existsSync(easJsonPath)).toBe(true);
      easJson = JSON.parse(fs.readFileSync(easJsonPath, "utf-8"));
    });

    test("verifies development, preview APK, and production app-bundle build profiles", () => {
      expect(easJson.build.development).toBeDefined();
      expect(easJson.build.preview.android.buildType).toBe("apk");
      expect(easJson.build.production.android.buildType).toBe("app-bundle");
    });
  });

  describe("Zero Unencrypted PHI Persistence Audit", () => {
    test("confirms clinical diagnoses and records are excluded from persistent storage", async () => {
      await secureStorage.clearSession();

      // Only tokens and active session user identity are permissible in SecureStore
      await secureStorage.setAccessToken("test-jwt");
      await secureStorage.setActiveHospitalId("hosp-main");

      const token = await secureStorage.getAccessToken();
      const hospitalId = await secureStorage.getActiveHospitalId();

      expect(token).toBe("test-jwt");
      expect(hospitalId).toBe("hosp-main");

      // Verify no patient medical records exist in store
      expect(await secureStorage.getItem("patient_diagnoses")).toBeNull();
      expect(await secureStorage.getItem("patient_prescriptions")).toBeNull();
      expect(await secureStorage.getItem("patient_clinical_notes")).toBeNull();
    });

    test("confirms session wipe empties hardware keystore on logout", async () => {
      await secureStorage.setAccessToken("temp-token");
      await secureStorage.setActiveUser({
        username: "9876543210",
        name: "Test Doctor",
        role: "DOCTOR",
        email: "doctor@example.com",
      });

      await secureStorage.clearSession();

      expect(await secureStorage.getAccessToken()).toBeNull();
      expect(await secureStorage.getActiveHospitalId()).toBeNull();
      expect(await secureStorage.getActiveUser()).toBeNull();
    });
  });

  describe("Cryptographic Algorithm & Route Exclusion Rules", () => {
    test("verifies sensitive clinical endpoints are NEVER excluded from payload encryption", () => {
      expect(isRouteExcluded("/api/v1/doctor/consultations")).toBe(false);
      expect(isRouteExcluded("/api/v1/doctor/queue")).toBe(false);
      expect(isRouteExcluded("/api/v1/patients/timeline")).toBe(false);
      expect(isRouteExcluded("/api/v1/hospital/census")).toBe(false);
      expect(isRouteExcluded("/api/v1/reception/tokens")).toBe(false);
    });

    test("verifies only unauthenticated telemetry and handshake routes are excluded", () => {
      expect(isRouteExcluded("/health")).toBe(true);
      expect(isRouteExcluded("/api/v1/crypto/handshake")).toBe(true);
      expect(isRouteExcluded("/docs")).toBe(true);
    });

    test("verifies memory zeroing of active cryptographic key material", () => {
      const dummyKey = new Uint8Array(32).fill(7);
      payloadCrypto.setSessionKey("temp-test-key", dummyKey, 60);

      expect(payloadCrypto.getActiveKeyId()).toBe("temp-test-key");

      payloadCrypto.clearSession();

      expect(payloadCrypto.getActiveKeyId()).toBeNull();
      // Verifies in-memory buffer was wiped with zeros
      expect(dummyKey.every((byte) => byte === 0)).toBe(true);
    });
  });
});
