import { test, expect } from "@playwright/test";

test.describe("OH-ID Landing & Hero Page - Acceptance Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. Hero branding, badge, headlines and supporting copy render correctly", async ({ page }) => {
    await expect(page.getByRole("link", { name: /ONEHEALTH ID/i })).toBeVisible();
    await expect(page.getByText("Unified Healthcare Network").first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /One Digital Health Identity.*A Connected Healthcare Journey/i })).toBeVisible();
    await expect(page.getByText(/Connect patient identity, hospital workflows, appointments, consultations, prescriptions, and authorized health records/i)).toBeVisible();
    await expect(page.getByText("Powered by Sathus Technology Pvt Ltd").first()).toBeVisible();
  });

  test("2. Primary CTA buttons are functional and have proper destinations/icons", async ({ page }) => {
    // Primary CTA: Explore OH-ID
    const exploreBtn = page.getByRole("link", { name: /Explore OH-ID/i });
    await expect(exploreBtn).toBeVisible();
    await expect(exploreBtn).toHaveAttribute("href", "#journey");

    // Secondary CTA: Patient Login
    const patientLoginBtn = page.getByRole("link", { name: /Patient Login/i });
    await expect(patientLoginBtn).toBeVisible();
    await expect(patientLoginBtn).toHaveAttribute("href", /\/login\?redirect=\/patient|\/patient/);

    // Additional CTA: Hospital Console
    const hospitalBtn = page.getByRole("link", { name: /Hospital Console/i });
    await expect(hospitalBtn).toBeVisible();
    await expect(hospitalBtn).toHaveAttribute("href", /\/login\?redirect=\/hospital|\/hospital/);

    // Header Sign In button
    const headerSignIn = page.getByRole("link", { name: "Sign In to Portal" });
    await expect(headerSignIn).toBeVisible();
    await expect(headerSignIn).toHaveAttribute("href", "/login");
  });

  test("2b. Connected Patient Journey Visual renders and allows interactive step exploration", async ({ page }) => {
    const journeySection = page.locator("#journey");
    await expect(journeySection).toBeVisible();
    await expect(journeySection.getByText("INTEROPERABLE PATIENT WORKFLOW BUS")).toBeVisible();
    await expect(journeySection.getByText("Demonstration Clinical Data")).toBeVisible();

    // Verify all 5 steps are present
    await expect(journeySection.getByRole("button", { name: /STEP 01/i })).toBeVisible();
    await expect(journeySection.getByRole("button", { name: /STEP 02/i })).toBeVisible();
    await expect(journeySection.getByRole("button", { name: /STEP 03/i })).toBeVisible();
    await expect(journeySection.getByRole("button", { name: /STEP 04/i })).toBeVisible();
    await expect(journeySection.getByRole("button", { name: /STEP 05/i })).toBeVisible();

    // Default step 1 shows OH-ID token
    await expect(journeySection.getByText("OH-2026-CHE-7712")).toBeVisible();

    // Click step 3: Doctor Consultation
    await journeySection.getByRole("button", { name: /STEP 03/i }).click();
    await expect(journeySection.getByText("Dr. K. Senthil Nathan, MD")).toBeVisible();
    await expect(journeySection.getByText(/ICD-10 J06.9/i)).toBeVisible();

    // Click step 4: Digital Prescription
    await journeySection.getByRole("button", { name: /STEP 04/i }).click();
    await expect(journeySection.getByText("RX-2026-F78996")).toBeVisible();
    await expect(journeySection.getByText(/Paracetamol 650 mg/i)).toBeVisible();
  });

  test("3. Interactive Feature Cards open accessible modal with technical details", async ({ page }) => {
    // Card 1: Zero-Knowledge QR
    const qrCard = page.getByRole("button", { name: /Zero-Knowledge QR/i });
    await expect(qrCard).toBeVisible();
    await qrCard.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Zero-Knowledge QR" })).toBeVisible();
    await expect(modal.getByText("Verification Protocol & Workflow")).toBeVisible();
    await expect(modal.getByText("Encoded Data Payload & Privacy Boundaries")).toBeVisible();

    // Close via close button
    const closeBtn = page.getByRole("button", { name: /Close.*dialog/i });
    await closeBtn.click();
    await expect(modal).toBeHidden();

    // Card 2: Live OPD Queue - Open and close with Escape
    const opdCard = page.getByRole("button", { name: /Live OPD Queue/i });
    await opdCard.click();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Live OPD Queue" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();

    // Card 3: Multi-Tenant Engine
    const tenantCard = page.getByRole("button", { name: /Multi-Tenant Engine/i });
    await tenantCard.click();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Multi-Tenant Engine" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();

    // Card 4: ABDM & GST Ready
    const complianceCard = page.getByRole("button", { name: /ABDM & GST Ready/i });
    await complianceCard.click();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "ABDM & GST Ready" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("4. Healthcare Network visual architecture diagram renders all interconnected nodes", async ({ page }) => {
    const networkSection = page.locator("#network");
    await expect(networkSection).toBeVisible();
    await expect(networkSection.getByRole("button", { name: /Hospital Network/i })).toBeVisible();
    await expect(networkSection.getByRole("button", { name: /Clinical Stations/i })).toBeVisible();
    await expect(networkSection.getByRole("button", { name: /Patient Identity/i })).toBeVisible();
    await expect(networkSection.getByRole("button", { name: /Diagnostics & Pharmacy/i })).toBeVisible();
    await expect(networkSection.getByText("INTEROPERABLE HEALTHCARE NETWORK BUS")).toBeVisible();
  });

  test("5. Stakeholder Audience matrix renders all 4 user groups", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Designed for Every Healthcare Stakeholder" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "For Patients" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "For Doctors" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "For Hospitals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "For Administrators" })).toBeVisible();
  });

  test("6. Responsive test (Mobile Viewport 390x844): zero horizontal overflow and readable text", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    // Modal opens cleanly on mobile
    const qrCard = page.getByRole("button", { name: /Zero-Knowledge QR/i });
    await qrCard.click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: /Close.*dialog/i }).click();
    await expect(modal).toBeHidden();
  });
});
