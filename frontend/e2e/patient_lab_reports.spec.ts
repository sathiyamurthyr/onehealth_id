import { test, expect } from "@playwright/test";

test.describe("OneHealth ID (OH-ID) — My Lab Reports Module E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as patient
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*patient.*/);
  });

  test("1. Patient opens My Lab Reports list and views benchmark diagnostic reports", async ({ page }) => {
    await page.goto("/patient/labs");

    // Header & title
    await expect(page.getByRole("heading", { name: "My Lab Reports" })).toBeVisible();
    await expect(page.getByText("Your certified laboratory test results from all connected hospitals")).toBeVisible();

    // Verify benchmark reports are listed in card headings
    await expect(page.getByRole("heading", { name: "Complete Blood Count (CBC)" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lipid Profile Comprehensive" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Thyroid Profile (T3, T4, TSH)" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Glycemic Profile (HbA1c + Fasting Blood Glucose)" }).first()).toBeVisible();

    // Verify result count on CBC card
    await expect(page.locator("span", { hasText: "18 results" }).first()).toBeVisible();

    // Verify view report link
    await expect(page.getByRole("link", { name: /View Report/i }).first()).toBeVisible();
  });

  test("2. Status filter tabs dynamically filter lab reports list", async ({ page }) => {
    await page.goto("/patient/labs");

    // Click "Outside Range" filter tab
    await page.getByRole("button", { name: /^Outside Range/i }).click();
    await expect(page.getByRole("heading", { name: "Lipid Profile Comprehensive" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Glycemic Profile (HbA1c + Fasting Blood Glucose)" }).first()).toBeVisible();

    // Click "Processing / Pending" filter tab
    await page.getByRole("button", { name: /Processing \/ Pending/i }).click();
    await expect(page.getByRole("heading", { name: "Renal Function Test & Serum Electrolytes" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Complete Blood Count (CBC)" })).toHaveCount(0);

    // Click "Corrected" filter tab
    await page.getByRole("button", { name: /Corrected Reports/i }).click();
    await expect(page.getByRole("heading", { name: "Thyroid Profile (T3, T4, TSH)" }).first()).toBeVisible();

    // Reset to "All Reports"
    await page.getByRole("button", { name: /^All Reports/i }).click();
    await expect(page.getByRole("heading", { name: "Complete Blood Count (CBC)" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lipid Profile Comprehensive" }).first()).toBeVisible();
  });

  test("3. Search input filters lab reports in real-time", async ({ page }) => {
    await page.goto("/patient/labs");

    // Type "Lipid" in search
    const searchInput = page.getByPlaceholder(/Search lab reports/i);
    await searchInput.fill("Lipid");
    await expect(page.getByRole("heading", { name: "Lipid Profile Comprehensive" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Complete Blood Count (CBC)" })).toHaveCount(0);

    // Clear search
    await searchInput.fill("");
    await expect(page.getByRole("heading", { name: "Complete Blood Count (CBC)" }).first()).toBeVisible();
  });

  test("4. Open Diagnostic Explainer Modal", async ({ page }) => {
    await page.goto("/patient/labs");

    // Click "Reference Ranges Guide"
    await page.getByRole("button", { name: /Reference Ranges Guide/i }).click();

    // Modal should be visible
    await expect(page.getByText("About Your Laboratory Results & Reference Ranges")).toBeVisible();
    await expect(page.getByText("1. Reference Ranges Are Laboratory-Specific")).toBeVisible();
    await expect(page.getByText("2. Outside Reference Range ≠ Standalone Diagnosis")).toBeVisible();
    await expect(page.getByText("The OneHealth ID Three-Layer System")).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: /I Understand/i }).click();
    await expect(page.getByText("About Your Laboratory Results & Reference Ranges")).toBeHidden();
  });

  test("5. Full Document View: Complete Blood Count with 3 layers, visual gauges, and historical trends", async ({ page }) => {
    await page.goto("/patient/labs/LAB-20261002-00125");

    // Wait for document header to render
    await expect(page.getByText("Final Report").first()).toBeVisible();
    await expect(page.getByText("ABC Diagnostics & Kedar Hospital Pathology Wing").first()).toBeVisible();
    await expect(page.getByText("NABL Accredited Medical Testing Laboratory ISO 15189:2022").first()).toBeVisible();
    await expect(page.getByText("LAB-20261002-00125").first()).toBeVisible();

    // Patient Information
    await expect(page.getByText("OHID-IND-2026-01001").first()).toBeVisible();

    // Sample Information
    await expect(page.getByText("Sample Information").first()).toBeVisible();
    await expect(page.getByText("Whole Blood (EDTA)").first()).toBeVisible();

    // Referring Doctor
    await expect(page.getByText("Requested By").first()).toBeVisible();
    await expect(page.getByText("Dr. Senthil Nathan").or(page.getByText("Dr. Arun Kumar")).first()).toBeVisible();

    // Patient-friendly Summary (Layer 3)
    await expect(page.getByText("Patient-Friendly Result Summary (Layer 3)").first()).toBeVisible();
    await expect(page.getByText("All 18 parameters in your Complete Blood Count are within the standard reference ranges").first()).toBeVisible();

    // Structured Results Table & Parameters (Layer 2)
    await expect(page.getByText("Structured Diagnostic Parameters (Layer 2)").first()).toBeVisible();
    await expect(page.getByText("Hemoglobin").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("13.8").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("g/dL").filter({ visible: true }).first()).toBeVisible();

    await expect(page.getByText("Total Leukocyte Count (WBC)").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("7200").or(page.getByText("7,200")).filter({ visible: true }).first()).toBeVisible();

    await expect(page.getByText("Platelet Count").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("250000").or(page.getByText("250,000")).filter({ visible: true }).first()).toBeVisible();

    // Doctor Notes
    await expect(page.getByText("Doctor's Clinical Impression & Notes").first()).toBeVisible();
    await expect(page.getByText("Hematological profile is completely normal").first()).toBeVisible();

    // Original Laboratory Report / Certification (Layer 1)
    await expect(page.getByText("Verified & Authenticated").first()).toBeVisible();
    await expect(page.getByText("Dr. R. Meenakshi Sundaram").first()).toBeVisible();
    await expect(page.getByText("vtok-lab-20261002-00125").first()).toBeVisible();
  });

  test("6. Full Document View: Corrected Report preserves version history", async ({ page }) => {
    await page.goto("/patient/labs/LAB-20260915-00062");

    // Corrected Report Banner
    await expect(page.getByText("Corrected Laboratory Report (Version 2)").first()).toBeVisible();
    await expect(page.getByText("Amended to recalculate total T3 with updated calibration lot values").first()).toBeVisible();
  });

  test("7. Full Document View: Processing / In-Progress Report", async ({ page }) => {
    await page.goto("/patient/labs/LAB-20261003-00140");

    // Processing Status Banner
    await expect(page.getByText("Laboratory Processing In Progress").first()).toBeVisible();
    await expect(page.getByText("Your sample is currently undergoing diagnostic analysis").first()).toBeVisible();
  });

  test("8. Secure Time-Limited Share Flow for Lab Report", async ({ page }) => {
    await page.goto("/patient/labs/LAB-20261002-00125");

    // Wait for document to load
    await expect(page.getByText("Final Report").first()).toBeVisible();

    // Click Share button in action bar
    await page.getByRole("button", { name: "Share" }).first().click();

    // Modal opens
    await expect(page.getByRole("heading", { name: "Create Secure Share Link" })).toBeVisible();

    // Fill Recipient Name
    await page.locator('input[placeholder*="Dr. Arun Kumar"]').fill("Dr. Rajesh Mehta (Cardiology)");

    // Click Create Secure Link
    await page.getByRole("button", { name: "Create Secure Link" }).click();

    // Verify created share in Active list
    await expect(page.getByText("Dr. Rajesh Mehta (Cardiology)").first()).toBeVisible();

    // Test Revoke with Trash button
    const revokeBtn = page.locator('button[title="Revoke access immediately"]').first();
    await expect(revokeBtn).toBeVisible();
    await revokeBtn.click();

    // Share should now be revoked
    await expect(page.getByText("Revoked").first()).toBeVisible();
  });
});

test.describe("OneHealth ID — Public Lab Report Verification Portal E2E", () => {
  test("Public verification page validates authentic diagnostic token without exposing private health data", async ({ page }) => {
    // Direct public access without logging in
    await page.goto("/verify/lab-report/vtok-lab-20261002-00125");

    // Verification portal header
    await expect(page.getByText("Digital Laboratory Report Verification")).toBeVisible();
    await expect(page.getByText("Official Authenticated Laboratory Record")).toBeVisible();

    // Verified Laboratory & Hospital details
    await expect(page.getByText("ABC Diagnostics & Kedar Hospital Pathology Wing").first()).toBeVisible();
    await expect(page.getByText("Complete Blood Count (CBC)").first()).toBeVisible();
    await expect(page.getByText("NABL Accredited Medical Testing Laboratory ISO 15189:2022").first()).toBeVisible();

    // Medical Privacy Notice
    await expect(page.getByText("Zero-Knowledge Privacy Guarantee")).toBeVisible();
    await expect(page.getByText("Individual patient names, confidential numerical values, and private clinical notes are withheld")).toBeVisible();
  });
});
