import { test, expect } from "@playwright/test";

test.describe("OneHealth ID (OH-ID) — My Prescriptions Module E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as patient
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*patient.*/);
  });

  test("1. Patient opens My Prescriptions list and views benchmark prescriptions", async ({ page }) => {
    await page.goto("/patient/prescriptions");

    // Header & title
    await expect(page.getByRole("heading", { name: "My Prescriptions" })).toBeVisible();
    await expect(page.getByText("Digital prescriptions, medication instructions")).toBeVisible();

    // Verify benchmark prescriptions are listed
    await expect(page.getByText("RX-20261003-00124").first()).toBeVisible();
    await expect(page.getByText("RX-20260715-00088").first()).toBeVisible();
    await expect(page.getByText("RX-20260901-00045").first()).toBeVisible();

    // Verify card content (hospital & doctor info)
    await expect(page.locator("span", { hasText: "Kedar Hospital" }).first()).toBeVisible();
    await expect(page.locator("span", { hasText: "Dr. Senthil Nathan" }).or(page.locator("span", { hasText: "Dr. Arun Kumar" })).first()).toBeVisible();

    // Verify status badges
    await expect(page.getByRole("button", { name: /Currently Valid/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Expired/i })).toBeVisible();
  });

  test("2. Status filter tabs dynamically filter prescriptions list", async ({ page }) => {
    await page.goto("/patient/prescriptions");

    // Click Active filter
    await page.getByRole("button", { name: /Currently Valid/i }).click();
    await expect(page.getByText("RX-20261003-00124").first()).toBeVisible();
    await expect(page.getByText("RX-20260715-00088")).toBeHidden();

    // Click Expired filter
    await page.getByRole("button", { name: /^Expired/i }).click();
    await expect(page.getByText("RX-20260715-00088").first()).toBeVisible();
    await expect(page.getByText("RX-20261003-00124")).toBeHidden();

    // Click Superseded filter
    await page.getByRole("button", { name: /Replaced \/ Superseded/i }).click();
    await expect(page.getByText("RX-20260901-00045").first()).toBeVisible();

    // Reset to All
    await page.getByRole("button", { name: /^All/i }).first().click();
    await expect(page.getByText("RX-20261003-00124").first()).toBeVisible();
    await expect(page.getByText("RX-20260715-00088").first()).toBeVisible();
  });

  test("3. Open Prescription Validity Explainer Modal", async ({ page }) => {
    await page.goto("/patient/prescriptions");

    // Click "About Prescription Validity"
    await page.getByRole("button", { name: /About Prescription Validity/i }).click();

    // Modal should be visible
    await expect(page.getByText("About Prescription Validity in OH-ID")).toBeVisible();
    await expect(page.getByText("Authoritative Clinical Record")).toBeVisible();
    await expect(page.getByText("Expired — Retained for History")).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Understood" }).click();
    await expect(page.getByText("About Prescription Validity in OH-ID")).toBeHidden();
  });

  test("4. Full Document View: Active Prescription with complete clinical sections", async ({ page }) => {
    await page.goto("/patient/prescriptions/RX-20261003-00124");

    // Document header
    await expect(page.getByText("OH-ID Digital Prescription").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kedar Hospital" })).toBeVisible();

    // Status: Currently Valid
    await expect(page.getByText("● Currently Valid").first()).toBeVisible();
    await expect(page.getByText("RX-20261003-00124").first()).toBeVisible();

    // Patient Details & Vitals
    await expect(page.getByText("OHID-IND-2026-01001").first()).toBeVisible();
    await expect(page.getByText("120/80 mmHg").first()).toBeVisible();
    await expect(page.getByText("74 bpm").first()).toBeVisible();
    await expect(page.getByText("Penicillin").first()).toBeVisible();

    // Doctor Credentials
    await expect(page.getByText("Prescribing Clinician")).toBeVisible();
    await expect(page.getByText("Dr. Senthil Nathan").or(page.getByText("Dr. Arun Kumar")).first()).toBeVisible();

    // Consultation Info
    await expect(page.getByText("Hypertension Stage 1 & Mild Dyslipidemia").first()).toBeVisible();
    await expect(page.getByText("Adopt low-sodium DASH diet").first()).toBeVisible();

    // Prescribed Medicines Table
    await expect(page.getByText("Telmisartan").first()).toBeVisible();
    await expect(page.getByText("Atorvastatin").first()).toBeVisible();
    await expect(page.getByText("Amlodipine").first()).toBeVisible();

    // Medication Schedule Matrix
    await expect(page.getByRole("heading", { name: /Medication Schedule Matrix/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Morning" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Night" })).toBeVisible();

    // Follow-up Section
    await expect(page.getByText("RECOMMENDED FOLLOW-UP").first()).toBeVisible();

    // Digital Verification & QR
    await expect(page.getByText("Verified Digital Prescription").first()).toBeVisible();
    await expect(page.getByText("Token: vtok-rx-20261003-00124").first()).toBeVisible();
  });

  test("5. Full Document View: Expired Prescription renders prominent watermark and warning", async ({ page }) => {
    await page.goto("/patient/prescriptions/RX-20260715-00088");

    // Prominent EXPIRED watermark
    await expect(page.locator(".watermark-stamp", { hasText: "EXPIRED" }).first()).toBeVisible();

    // Expired Alert Box
    await expect(page.getByText("Expired Digital Prescription").first()).toBeVisible();
    await expect(page.getByText("This prescription is no longer valid according to its recorded validity period").first()).toBeVisible();

    // Medicines are still viewable in history
    await expect(page.getByText("Amoxicillin + Clavulanic Acid").first()).toBeVisible();
    await expect(page.getByText("Paracetamol 650mg").first()).toBeVisible();
  });

  test("6. Full Document View: Superseded Prescription with direct replacement navigation", async ({ page }) => {
    await page.goto("/patient/prescriptions/RX-20260901-00045");

    // Superseded Alert Box
    await expect(page.getByText("Superseded Prescription").first()).toBeVisible();
    await expect(page.getByText("This prescription has been replaced by a newer prescription").first()).toBeVisible();

    // Replacement link navigation
    const link = page.getByRole("link", { name: /View Newer Prescription/i });
    await expect(link).toBeVisible();
    await link.click();

    // Navigates to the newer prescription
    await page.waitForURL(/.*RX-20261003-00124.*/);
    await expect(page.getByText("RX-20261003-00124").first()).toBeVisible();
  });

  test("7. Secure Time-Limited Share Flow", async ({ page }) => {
    await page.goto("/patient/prescriptions/RX-20261003-00124");

    // Click Share button in top action bar
    await page.getByRole("button", { name: "Share" }).first().click();

    // Modal opens
    await expect(page.getByText("Share Digital Prescription")).toBeVisible();

    // Fill Recipient Name
    await page.locator('input[placeholder*="Apollo Pharmacy"]').fill("Apollo Pharmacy Mugalivakkam");

    // Click Create Secure Share Link
    await page.getByRole("button", { name: "Create Secure Share Link" }).click();

    // Verify Active Shares list displays newly created share
    await expect(page.getByText("Apollo Pharmacy Mugalivakkam").first()).toBeVisible();
    await expect(page.getByText("Active Share Links").first()).toBeVisible();

    // Test Revoke
    const revokeBtn = page.getByRole("button", { name: /Revoke/i }).first();
    await expect(revokeBtn).toBeVisible();
    await revokeBtn.click();

    // Share should now be revoked
    await expect(page.getByText("Revoked / Expired").first()).toBeVisible();
  });
});

test.describe("OneHealth ID — Public Prescription Verification Portal E2E", () => {
  test("Public verification page validates authentic token without exposing private health data", async ({ page }) => {
    // Direct public access without logging in
    await page.goto("/verify/prescription/vtok-rx-20261003-00124");

    // Verification portal header
    await expect(page.getByText("Prescription Verification Portal")).toBeVisible();
    await expect(page.getByText("✓ Prescription Verified")).toBeVisible();

    // Verified Doctor & Hospital details
    await expect(page.getByText("Dr. Senthil Nathan").or(page.getByText("Dr. Arun Kumar")).first()).toBeVisible();
    await expect(page.getByText("Kedar Hospital").first()).toBeVisible();

    // Medical Privacy Notice
    await expect(page.getByText("Medical Privacy Protection")).toBeVisible();
    await expect(page.getByText("Patient personal health records, diagnoses, and medical notes are protected by law")).toBeVisible();
  });
});
