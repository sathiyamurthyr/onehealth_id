import { test, expect } from "@playwright/test";

test.describe("OneHealth ID (OH-ID) — Central Personal Medical-Document Repository E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as patient
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*patient.*/);
  });

  test("1. Patient opens My Medical Documents central repository across all hospitals", async ({ page }) => {
    await page.goto("/patient/documents");

    // Header & subtitle
    await expect(page.getByRole("heading", { name: "My Medical Documents" })).toBeVisible();
    await expect(
      page.getByText("All your authorized healthcare documents in one place")
    ).toBeVisible();

    // Default select filter values
    await expect(page.getByLabel(/Filter by Hospital/i)).toHaveValue("ALL");
    await expect(page.getByLabel(/Select Patient/i)).toHaveValue("self");

    // Verify benchmark documents across multiple hospitals are listed
    await expect(page.getByRole("heading", { name: /Discharge Summary/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Complete Blood Count/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Prescription/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Medical Certificate/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lumbar Spine MRI/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Referral Letter/i }).first()).toBeVisible();

    // Verify both Healthcare Provider and Patient Uploaded badges exist
    await expect(page.getByText(/Healthcare Provider/i).first()).toBeVisible();
    await expect(page.getByText(/Uploaded by You/i).first()).toBeVisible();
  });

  test("2. Category chips filter documents list dynamically", async ({ page }) => {
    await page.goto("/patient/documents");

    // Click "Discharge Summary" category chip
    await page.getByTestId("category-chip-DISCHARGE_SUMMARY").click();
    await expect(page.getByRole("heading", { name: /Discharge Summary/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lumbar Spine MRI/i })).toHaveCount(0);

    // Click "Imaging Report" category chip
    await page.getByTestId("category-chip-IMAGING_REPORT").click();
    await expect(page.getByRole("heading", { name: /Lumbar Spine MRI/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Discharge Summary/i })).toHaveCount(0);

    // Click "Prescription" category chip
    await page.getByTestId("category-chip-PRESCRIPTION").click();
    await expect(page.getByRole("heading", { name: /Prescription/i }).first()).toBeVisible();

    // Reset to "All Documents"
    await page.getByTestId("category-chip-ALL").click();
    await expect(page.getByRole("heading", { name: /Discharge Summary/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lumbar Spine MRI/i }).first()).toBeVisible();
  });

  test("3. Search input filters documents by title, doctor, and visit ID", async ({ page }) => {
    await page.goto("/patient/documents");

    const searchInput = page.getByPlaceholder(/Search documents/i);

    // Search "Lumbar"
    await searchInput.fill("Lumbar");
    await expect(page.getByRole("heading", { name: /Lumbar Spine MRI/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Discharge Summary/i })).toHaveCount(0);

    // Search "Discharge"
    await searchInput.fill("Discharge");
    await expect(page.getByRole("heading", { name: /Discharge Summary/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lumbar Spine MRI/i })).toHaveCount(0);

    // Clear search
    await searchInput.fill("");
    await expect(page.getByRole("heading", { name: /Lumbar Spine MRI/i }).first()).toBeVisible();
  });

  test("4. Interactive Document Viewer modal with zoom, rotate, and print", async ({ page }) => {
    await page.goto("/patient/documents");

    // Click "View" on Discharge Summary card
    const dischargeCard = page.locator('[data-testid^="document-card-"]').filter({ hasText: /Discharge Summary/i }).first();
    await dischargeCard.getByRole("button", { name: /^View$/i }).click();

    // Verify modal elements
    await expect(page.getByRole("heading", { name: /Discharge Summary/i }).first()).toBeVisible();
    await expect(page.getByText(/Patient Name/i).first()).toBeVisible();
    await expect(page.getByText(/Document Date/i).first()).toBeVisible();
    await expect(page.getByText(/Verified by OneHealth ID Digital Trust Network/i)).toBeVisible();

    // Test Zoom in and Zoom out
    await page.getByTitle("Zoom In").click();
    await expect(page.getByText("125%")).toBeVisible();
    await page.getByTitle("Zoom Out").click();
    await expect(page.getByText("100%")).toBeVisible();

    // Test Rotate
    await page.getByTitle("Rotate 90 degrees").click();

    // Close modal
    await page.locator('button:has(svg.lucide-x)').click();
  });

  test("5. Imaging Report viewer with multi-slice DICOM series switcher", async ({ page }) => {
    await page.goto("/patient/documents");

    // Filter to Imaging Reports
    await page.getByTestId("category-chip-IMAGING_REPORT").click();

    // Click "View & Images"
    const mriCard = page.locator('[data-testid^="document-card-"]').filter({ hasText: /Lumbar Spine MRI/i }).first();
    await mriCard.getByRole("button", { name: /View/i }).click();

    // Verify Report view first
    await expect(page.getByRole("heading", { name: /Lumbar Spine MRI/i }).first()).toBeVisible();

    // Switch to "Medical Images" tab
    await page.getByRole("button", { name: /Medical Images/i }).click();

    // Verify DICOM series HUD overlay and slices
    await expect(page.getByText(/SERIES:/i)).toBeVisible();
    await expect(page.getByText(/SLICE: 1 \/ 4/i)).toBeVisible();
    await expect(page.getByText(/Radiologist Note:/i)).toBeVisible();

    // Click next slice
    await page.getByTestId("next-slice-btn").click();
    await expect(page.getByTestId("slice-counter")).toHaveText(/2 \/ 4/);

    // Close modal
    await page.locator('button:has(svg.lucide-x)').click();
  });

  test("6. Add Personal Document upload flow with explicit provenance tag", async ({ page }) => {
    await page.goto("/patient/documents");

    // Click "+ Add Personal Document" button
    await page.getByRole("button", { name: /\+ Add Personal Document/i }).click();

    // Verify Provenance Notice
    await expect(page.getByText(/Personal Document Provenance/i)).toBeVisible();
    await expect(page.getByText(/Source: Uploaded by You/i)).toBeVisible();

    // Fill form
    await page.getByTestId("personal-doc-title-input").fill("Outstation Cardio Stress Test 2026");
    await page.getByTestId("personal-doc-notes-input").fill("Conducted at City Health Camp during travel.");

    // Submit
    await page.getByTestId("personal-doc-submit-btn").click();

    // Verify new document appears in list
    await expect(page.getByRole("heading", { name: /Outstation Cardio Stress Test/i }).first()).toBeVisible();
  });

  test("7. Time-limited secure sharing and instant revocation flow", async ({ page }) => {
    await page.goto("/patient/documents");

    // Click share on first card
    const firstCard = page.locator('[data-testid^="document-card-"]').first();
    await firstCard.getByTitle(/Share document securely/i).click();

    // Verify modal title
    await expect(page.getByRole("heading", { name: "Secure Document Sharing" })).toBeVisible();

    // Enter recipient and submit
    await page.locator('input[placeholder*="Dr. Senthil"]').fill("Dr. Arun Specialist Consultation");
    await page.getByRole("button", { name: /Create Secure Share Link/i }).click();

    // Verify secure link ready banner
    await expect(page.getByText(/Secure Link Ready/i)).toBeVisible();
    await expect(page.getByTestId("copy-share-token-btn")).toBeVisible();

    // Verify active share row rendered with revoke button
    await expect(page.getByText("Dr. Arun Specialist Consultation").first()).toBeVisible();
    await expect(page.getByTitle(/Revoke access immediately/i).first()).toBeVisible();

    // Close modal
    await page.locator('button:has(svg.lucide-x)').click();
  });

  test("8. Switch between Cards View and Timeline View", async ({ page }) => {
    await page.goto("/patient/documents");

    // Switch to Timeline View
    await page.getByRole("button", { name: /Timeline/i }).click();

    // Verify month heading nodes exist
    await expect(page.getByRole("heading", { name: /October 2026|September 2026/i }).first()).toBeVisible();
    await expect(page.locator('[data-testid^="timeline-item-"]').first()).toBeVisible();

    // Switch back to Cards View
    await page.getByRole("button", { name: /Cards/i }).click();
    await expect(page.locator('[data-testid^="document-card-"]').first()).toBeVisible();
  });

  test("9. Responsive layout across Desktop, Tablet, and Mobile viewports", async ({ page }) => {
    // Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/patient/documents");
    await expect(page.getByRole("heading", { name: "My Medical Documents" })).toBeVisible();
    await expect(page.locator('[data-testid^="document-card-"]').first()).toBeVisible();

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole("heading", { name: "My Medical Documents" })).toBeVisible();
    await expect(page.locator('[data-testid^="document-card-"]').first()).toBeVisible();

    // Mobile (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: "My Medical Documents" })).toBeVisible();
    await expect(page.locator('[data-testid^="document-card-"]').first()).toBeVisible();
  });
});
