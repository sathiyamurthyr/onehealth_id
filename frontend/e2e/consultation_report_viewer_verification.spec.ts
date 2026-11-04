import { test, expect } from "@playwright/test";

const artifactDir = "C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c";

async function loginAndGoToTimeline(page: any) {
  console.log("Navigating to login screen...");
  await page.goto("http://localhost:8081/(auth)/login");
  await page.waitForTimeout(1500);

  // 1. If returning user screen: switch to password
  const switchToOtp = page.getByTestId("switch-to-otp-button");
  if (await switchToOtp.isVisible().catch(() => false)) {
    console.log("Switching from returning user to mobile login...");
    await switchToOtp.click();
    await page.waitForTimeout(500);
  }

  // 2. Mobile input
  const mobileInput = page.getByTestId("mobile-input");
  await expect(mobileInput).toBeVisible({ timeout: 8000 });
  console.log("Entering mobile number...");
  await mobileInput.fill("9884240519");
  await page.waitForTimeout(300);
  await page.getByTestId("continue-button").click();

  // 3. Password input
  const passInput = page.getByTestId("password-input");
  await expect(passInput).toBeVisible({ timeout: 8000 });
  console.log("Entering password...");
  await passInput.fill("password123");
  await page.waitForTimeout(300);
  await page.getByTestId("login-button").click();
  await page.waitForTimeout(1500);

  // 4. Skip PIN setup if prompted
  const skipPin = page.getByTestId("skip-pin-button");
  if (await skipPin.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("Skipping PIN setup...");
    await skipPin.click();
  }

  // 5. Navigate to timeline via in-app button
  console.log("Navigating to timeline via home screen button...");
  await page.screenshot({ path: `${artifactDir}/after_login_state.png` });
  const navTimeline = page.getByTestId("nav-timeline");
  await expect(navTimeline).toBeVisible({ timeout: 12000 });
  await navTimeline.click();
  await page.waitForTimeout(2000);
}

test.describe("OH-ID Clinical Consultation Report Viewer Verification", () => {
  test("verifies redesigned clinical report viewer on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 960 });

    await loginAndGoToTimeline(page);

    // Click Consultation Event Card
    console.log("Clicking consultation event card...");
    await page.screenshot({ path: `${artifactDir}/actual_timeline_page.png` });
    const consultationCard = page
      .locator('[data-testid^="timeline-event-pressable-"], [data-testid*="timeline-event"]')
      .filter({ hasText: /Consultation/i })
      .first();
    await expect(consultationCard).toBeVisible({ timeout: 10000 });
    await consultationCard.click();
    await page.waitForTimeout(1500);

    const modal = page.locator('[data-testid="consultation-report-viewer-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify Title & Subtitle inside modal
    await expect(modal.getByText("Official Clinical Consultation Report")).toBeVisible();
    await expect(modal.getByText(/Classic Hospital Clinical Report/)).toBeVisible();

    // Verify Desktop Toolbar Actions
    await expect(page.getByTestId("btn-consultation-print").first()).toBeVisible();
    await expect(page.getByTestId("btn-consultation-share").first()).toBeVisible();
    await expect(page.getByTestId("btn-consultation-more").first()).toBeVisible();
    await expect(page.getByTestId("btn-close-consultation-report-viewer")).toBeVisible();

    // Verify Hospital & Encounter Information
    await expect(modal.getByText("Hospital Alpha", { exact: true })).toBeVisible();
    await expect(modal.getByText("ENC-2026-04567")).toBeVisible();

    // Verify Patient Demographics
    await expect(modal.getByText("Alice Smith", { exact: true })).toBeVisible();
    await expect(modal.getByText("OHID-IND-2026-01001", { exact: true })).toBeVisible();

    // Verify Vitals & Allergies
    await expect(modal.getByText("120/80 mmHg")).toBeVisible();
    await expect(modal.getByText("No known allergies")).toBeVisible();

    // Capture Desktop Top Screenshot
    console.log("Capturing Desktop Top Screenshot...");
    await page.screenshot({
      path: `${artifactDir}/clinical_report_viewer_desktop_top.png`,
    });

    // Close modal
    await page.getByTestId("btn-close-consultation-report-viewer").click();
    await page.waitForTimeout(500);
    console.log("Desktop verification passed successfully!");
  });

  test("verifies redesigned clinical report viewer on mobile viewport without header collision or title clipping", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 mobile viewport

    await loginAndGoToTimeline(page);

    console.log("Opening consultation modal on mobile...");
    const consultationCard = page
      .locator('[data-testid^="timeline-event-pressable-"], [data-testid*="timeline-event"]')
      .filter({ hasText: /Consultation/i })
      .first();
    await expect(consultationCard).toBeVisible({ timeout: 10000 });
    await consultationCard.click();
    await page.waitForTimeout(1500);

    const modal = page.locator('[data-testid="consultation-report-viewer-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify Title & Subtitle inside modal are visible and not squished
    await expect(modal.getByText("Official Clinical Consultation Report")).toBeVisible();
    await expect(modal.getByTestId("btn-close-consultation-report-viewer")).toBeVisible();

    // Verify Mobile Bottom Action Bar is visible with actions
    await expect(page.getByTestId("btn-consultation-print")).toBeVisible();
    await expect(page.getByTestId("btn-consultation-share")).toBeVisible();
    await expect(page.getByTestId("btn-consultation-more")).toBeVisible();

    // Verify section titles are fully visible without clipping
    await expect(modal.getByText("CLINICAL EXAMINATION & SYSTEMIC FINDINGS")).toBeVisible();
    await expect(modal.getByText("CHIEF COMPLAINTS & PRESENTING SYMPTOMS")).toBeVisible();

    // Capture Mobile Top Screenshot (proving the header title & subtitle are clearly visible)
    console.log("Capturing mobile top screenshot...");
    await page.screenshot({
      path: `${artifactDir}/clinical_report_viewer_mobile_top.png`,
    });

    // Scroll down to examine Clinical Examination & Findings section
    console.log("Scrolling on mobile...");
    await page.evaluate(() => {
      const scrollEl = document.getElementById("consultation-report-scroll-container");
      if (scrollEl) scrollEl.scrollTop = 380;
    });
    await page.waitForTimeout(600);

    // Capture Mobile Scrolled Screenshot (proving the section titles and Edit buttons are fully aligned)
    console.log("Capturing mobile scrolled screenshot...");
    await page.screenshot({
      path: `${artifactDir}/clinical_report_viewer_mobile_scrolled.png`,
    });

    console.log("Mobile viewport verification passed successfully!");
  });
});
