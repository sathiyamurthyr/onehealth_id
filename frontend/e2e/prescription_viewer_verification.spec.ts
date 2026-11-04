import { test, expect } from "@playwright/test";
import path from "path";

test.describe("OH-ID Prescription Viewer Redesign Verification", () => {
  test.use({
    viewport: { width: 393, height: 852 }, // Mobile device viewport matching user screenshot
    deviceScaleFactor: 2,
  });

  test("verifies redesigned prescription viewer, responsive table, and document actions", async ({ page }) => {
    const artifactDir = "C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c";

    // 1. Navigate to Login Screen
    console.log("Navigating to login screen...");
    await page.goto("http://localhost:8081/(auth)/login");
    await page.waitForTimeout(2000);

    // 2. Check if login is needed
    const mobileInput = page.getByTestId("mobile-input");
    if (await mobileInput.isVisible().catch(() => false)) {
      console.log("Entering mobile number...");
      await mobileInput.fill("9884240519");
      await page.waitForTimeout(300);

      const continueBtn = page.getByTestId("continue-button");
      await continueBtn.click();
      await page.waitForTimeout(1500);

      const passInput = page.getByTestId("password-input");
      if (await passInput.isVisible().catch(() => false)) {
        console.log("Entering password...");
        await passInput.fill("password123");
        await page.waitForTimeout(300);

        const loginBtn = page.getByTestId("login-button");
        await loginBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // 3. Navigate to Health Records / Timeline
    console.log("Navigating to timeline...");
    await page.goto("http://localhost:8081/(patient)/timeline");
    await page.waitForTimeout(2000);

    // 4. Click Prescription Event Card
    console.log("Clicking prescription event card...");
    const rxCard = page
      .locator('[data-testid^="timeline-event-pressable-"], [data-testid*="timeline-event"]')
      .filter({ hasText: /Prescription/i })
      .first();
    await expect(rxCard).toBeVisible({ timeout: 8000 });
    await rxCard.click();
    await page.waitForTimeout(1500);

    // 5. Verify Modal is Open
    const modal = page.locator('[data-testid="prescription-viewer-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify Title & Status Badge
    await expect(page.getByText("Official Doctor Prescription")).toBeVisible();
    await expect(page.getByText("VALID").first()).toBeVisible();

    // Verify Patient Demographics
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText("OHID-IND-2026-01001")).toBeVisible();
    await expect(page.getByText("PRIMARY DIAGNOSIS & CLINICAL IMPRESSION")).toBeVisible();

    // Verify Medication Table Columns (Horizontally Scrollable, Never Squeezed)
    await expect(page.getByText("DRUG NAME & FORM")).toBeVisible();
    await expect(page.getByText("DOSE", { exact: true })).toBeVisible();
    await expect(page.getByText("FREQUENCY", { exact: true })).toBeVisible();
    await expect(page.getByText("DURATION", { exact: true })).toBeVisible();
    await expect(page.getByText("FOOD / INSTRUCTIONS")).toBeVisible();

    // Verify Prescriber & Verification Footer
    await expect(page.getByText("AUTHORIZED PRESCRIBER")).toBeVisible();
    await expect(page.getByText("Dr. Senthil Nathan")).toBeVisible();
    await expect(page.getByText("SIGNED & VERIFIED")).toBeVisible();
    await expect(page.getByText(/Cryptographically Signed/i)).toBeVisible();

    // Verify Persistent Bottom Action Bar
    const printBtn = page.locator('[data-testid="btn-rx-action-print"]');
    const shareBtn = page.locator('[data-testid="btn-rx-action-share"]');
    const moreBtn = page.locator('[data-testid="btn-rx-action-more"]');
    await expect(printBtn).toBeVisible();
    await expect(shareBtn).toBeVisible();
    await expect(moreBtn).toBeVisible();

    // Verify NO React key warning banner is visible
    const warningToast = page.locator('text="Each child in a list should have a unique key"');
    await expect(warningToast).toHaveCount(0);

    // Capture Document Surface Screenshot (Clean & Fixed Layout)
    console.log("Capturing redesigned document surface screenshot...");
    await page.screenshot({
      path: path.join(artifactDir, "prescription_viewer_redesign_surface.png"),
      fullPage: false,
    });

    // 6. Test Share Action -> PHI Warning Dialog
    console.log("Testing Share action...");
    await shareBtn.click();
    await page.waitForTimeout(600);
    await expect(page.getByText("Protected Health Information Notice")).toBeVisible();
    await expect(page.getByText("Proceed to Share")).toBeVisible();
    await page.screenshot({
      path: path.join(artifactDir, "prescription_viewer_share_phi_modal.png"),
    });

    // Cancel Share Dialog
    await page.getByText("Cancel").click();
    await page.waitForTimeout(500);

    // 7. Test More Menu -> Action Sheet
    console.log("Testing More actions...");
    await moreBtn.click();
    await page.waitForTimeout(600);
    await expect(page.getByText("Prescription Document Actions")).toBeVisible();
    await expect(page.getByText("Download PDF / Print")).toBeVisible();
    await expect(page.getByText("View Signature Details")).toBeVisible();
    await expect(page.getByText("Document History & Audit Trail")).toBeVisible();
    await page.screenshot({
      path: path.join(artifactDir, "prescription_viewer_more_actions_sheet.png"),
    });

    // 8. Test Signature Details Dialog
    console.log("Testing Signature Details modal...");
    await page.getByText("View Signature Details").click();
    await page.waitForTimeout(600);
    await expect(page.getByText("Cryptographic Signature Details")).toBeVisible();
    await expect(page.getByText(/OneHealth ID Clinical Trust PKI/i)).toBeVisible();
    await expect(page.getByText(/ECDSA-secp256r1/i)).toBeVisible();
    await page.screenshot({
      path: path.join(artifactDir, "prescription_viewer_signature_details_modal.png"),
    });

    // Close signature modal
    await page.getByText("Close Verification Window").click();
    await page.waitForTimeout(500);

    // 9. Close Prescription Viewer
    await page.locator('[data-testid="btn-close-prescription-viewer"]').click();
    await page.waitForTimeout(500);
    await expect(modal).not.toBeVisible();
    console.log("All verifications succeeded successfully!");
  });
});
