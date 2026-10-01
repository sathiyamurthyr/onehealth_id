import { test, expect } from "@playwright/test";

test.describe("OneHealth ID - Unified Healthcare Design System E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*(admin|dashboard)/);
  });

  test("should render Design System gallery with role themes and tokens", async ({ page }) => {
    await page.goto("/design-system");

    // Header & Version
    await expect(page.getByText("OHID Design System (OHDS) v1.0")).toBeVisible();
    await expect(page.getByText("Healthcare Design System & UI Patterns")).toBeVisible();

    // 1. Role Personas
    await expect(page.getByText("1. Multi-Tenant Role Personas & Visual Accents")).toBeVisible();
    await expect(page.getByText("SuperAdmin & Governance").first()).toBeVisible();
    await expect(page.getByText("Doctor & Clinician").first()).toBeVisible();
    await expect(page.getByText("Nurse & Front Desk").first()).toBeVisible();
    await expect(page.getByText("Citizen & Patient").first()).toBeVisible();

    // 2. Universal Clinical Patient Banner
    await expect(page.getByText("2. Universal Clinical Patient Banner")).toBeVisible();
    await expect(page.getByText("Rajesh Sundaram")).toBeVisible();
    await expect(page.getByText("OHID-IND-2026-08821")).toBeVisible();
    await expect(page.getByText("Allergy: Penicillin (Anaphylaxis), Sulfa Drugs")).toBeVisible();

    // 3. Clinical Vitals Telemetry Grid
    await expect(page.getByText("3. Clinical Vitals Telemetry Grid")).toBeVisible();
    await expect(page.getByText("Blood Pressure")).toBeVisible();
    await expect(page.getByText("Pulse / HR")).toBeVisible();
    await expect(page.getByText("Oxygen Sat (SpO2)")).toBeVisible();

    // Toggle out-of-range vitals simulation
    const vitalsToggleBtn = page.getByRole("button", { name: /Normal Healthy Baseline|Critical Out-of-Range/ });
    await vitalsToggleBtn.click();
    await expect(page.getByText("⚠️ Critical Out-of-Range Active")).toBeVisible();
    await expect(page.getByText("Alert").first()).toBeVisible();

    // 4. OPD Queue Token Cards
    await expect(page.getByText("4. OPD Queue Token Orchestration Primitives")).toBeVisible();
    await expect(page.getByText("Ananya Natarajan")).toBeVisible();
    await expect(page.getByText("Vikramaditya Roy")).toBeVisible();

    // 5. KPI Metrics Widgets
    await expect(page.getByText("5. Standardized KPI Metric Widgets")).toBeVisible();
    await expect(page.getByText("Daily Patient Footfall")).toBeVisible();
    await expect(page.getByText("Average Wait Time")).toBeVisible();

    // 6. Accessible Modal Dialog
    const demoModalBtn = page.getByRole("button", { name: "Demo Clinical Modal" });
    await demoModalBtn.click();
    await expect(page.getByText("Zero-Knowledge QR Token Verification")).toBeVisible();
    await expect(page.getByText("Encrypted QR Payload")).toBeVisible();

    // Close Modal via Close button
    await page.locator('button[aria-label="Close"]').click();
    await expect(page.getByText("Encrypted QR Payload")).toBeHidden();
  });

  test("should enforce responsive layout with zero horizontal overflow on Design System route", async ({ page }) => {
    // Test on Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-system");

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});
