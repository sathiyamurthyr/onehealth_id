import { test, expect } from "@playwright/test";

test.describe("OH-ID Upload Medical Document Automatic Storage Verification", () => {
  test.use({
    viewport: { width: 540, height: 1100 },
    deviceScaleFactor: 2,
  });

  test("verifies automatic document storage without hospital clinical approval", async ({ page }) => {
    const artifactDir = "C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c";

    // 1. Navigate to Login Screen
    console.log("Navigating to login screen...");
    await page.goto("http://localhost:8081/(auth)/login");
    await page.waitForTimeout(2000);

    // 2. Login as Patient Alice Smith
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
        await passInput.fill("Password@123");
        await page.waitForTimeout(300);

        const loginBtn = page.getByTestId("login-button");
        await loginBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // 3. Navigate directly to Document Upload Screen
    console.log("Navigating to upload document screen...");
    await page.goto("http://localhost:8081/(patient)/upload");
    await page.waitForTimeout(3000);

    // If redirected to login, re-authenticate with Password@123
    const mobileInputRetry = page.getByTestId("mobile-input");
    if (await mobileInputRetry.isVisible().catch(() => false)) {
      console.log("Redirected to login, re-entering credentials...");
      await mobileInputRetry.fill("9884240519");
      await page.getByTestId("continue-button").click();
      await page.waitForTimeout(1000);
      await page.getByTestId("password-input").fill("Password@123");
      await page.getByTestId("login-button").click();
      await page.waitForTimeout(3000);
      await page.goto("http://localhost:8081/(patient)/upload");
      await page.waitForTimeout(3000);
    }

    // 4. Verify Header Elements
    await expect(page.getByText("Upload Medical Document")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Automatic OCR & Secure Vault/)).toBeVisible();

    // 5. Verify Categories
    await expect(page.getByText("Select Medical Document Category")).toBeVisible();
    await expect(page.getByTestId("category-pill-LAB_REPORT")).toBeVisible();
    await expect(page.getByTestId("category-pill-PRESCRIPTION")).toBeVisible();

    // 6. Test Valid Lab Report Upload
    console.log("Testing valid medical document upload...");
    await page.getByTestId("sample-valid-lab-btn").click();
    await page.waitForTimeout(500);
    await page.getByTestId("submit-validation-button").click();
    await page.waitForTimeout(3500);

    // 7. Verify Auto-Accepted Outcome Card
    const outcomeAccepted = page.getByTestId("validation-outcome-accepted");
    await expect(outcomeAccepted).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("DOCUMENT UPLOADED SUCCESSFULLY")).toBeVisible();
    await expect(page.getByText("Document Accepted")).toBeVisible();
    await expect(page.getByText("Security validation")).toBeVisible();
    await expect(page.getByText("Medical classification")).toBeVisible();
    await expect(page.getByText("OCR extraction")).toBeVisible();
    await expect(page.getByText("Encrypted storage")).toBeVisible();

    // Ensure NO "Upload Rejected" or "routed to clinical staff" or "hospital verification" exists
    const pageText = await page.content();
    expect(pageText).not.toContain("Upload Rejected");
    expect(pageText).not.toContain("routed to authorized clinical staff");
    expect(pageText).not.toContain("submitted for hospital verification");

    // Capture screenshot of the verified successful outcome
    console.log("Capturing accepted upload outcome screenshot...");
    await page.screenshot({
      path: `${artifactDir}/mobile_upload_auto_stored_success.png`,
    });

    // 8. Test Document Preview Modal
    console.log("Opening Document Preview Modal...");
    const previewBtn = page.getByTestId("btn-preview-document");
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();
    await page.waitForTimeout(2000);

    const previewCard = page.getByTestId("document-preview-card");
    await expect(previewCard).toBeVisible();
    await expect(page.getByText("Vault Stored")).toBeVisible();

    // Capture screenshot of interactive preview modal
    console.log("Capturing preview modal screenshot...");
    await page.screenshot({
      path: `${artifactDir}/mobile_upload_preview_modal_verified.png`,
    });

    // Close preview modal
    await page.getByTestId("btn-close-document-preview").click();
    await page.waitForTimeout(1000);

    console.log("ALL DOCUMENT UPLOAD & PREVIEW VERIFICATIONS PASSED!");
  });
});
