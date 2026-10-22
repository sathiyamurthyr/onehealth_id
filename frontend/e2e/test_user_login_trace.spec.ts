import { test, expect } from "@playwright/test";

test.describe("Real User 9176669426 Login & Workspace Deep Investigation", () => {
  test("Trace complete login, workspace selection, and dashboard navigation", async ({ page }) => {
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    const networkRequests: { url: string; method: string; status?: number; error?: string }[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === "error") {
        consoleErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(`[PAGE ERROR] ${err.message}\n${err.stack}`);
    });

    page.on("requestfailed", (req) => {
      networkRequests.push({
        url: req.url(),
        method: req.method(),
        error: req.failure()?.errorText || "FAILED",
      });
    });

    page.on("response", (res) => {
      networkRequests.push({
        url: res.url(),
        method: res.request().method(),
        status: res.status(),
      });
    });

    console.log("Step 1: Navigating to /login...");
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    console.log("Step 2: Filling credentials for 9176669426...");
    await page.locator('input[type="text"]').fill("9176669426");
    await page.locator('input[type="password"]').fill("Asdfg!23");

    console.log("Step 3: Submitting login form...");
    await page.locator('button[type="submit"]').click();

    // Wait 4 seconds to observe state
    await page.waitForTimeout(4000);

    const currentUrl = page.url();
    console.log("Current URL after submit:", currentUrl);

    // Check if error banner is present
    const errorBanner = page.locator("#login-error-banner");
    if (await errorBanner.isVisible()) {
      const errorText = await errorBanner.innerText();
      console.log("LOGIN ERROR BANNER VISIBLE:", errorText);
    }

    console.log("Waiting for 'Select Your Workspace' modal to appear...");
    const modalHeading = page.getByRole("heading", { name: "Select Your Workspace" });
    await expect(modalHeading).toBeVisible({ timeout: 15000 });
    console.log("Modal is now visible!");

    const continueButtons = page.getByRole("button", { name: "Continue" });
    const count = await continueButtons.count();
    console.log(`Found ${count} Continue buttons in modal.`);

    console.log("Step 5: Clicking Continue on first choice (Hospital Executive Admin)...");
    await continueButtons.first().click();

    // Wait for URL to change away from /login
    console.log("Waiting for navigation away from /login...");
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("Successfully navigated to:", page.url());

    // Wait 5 seconds on dashboard to capture all dashboard API requests and console errors
    await page.waitForTimeout(5000);

    console.log("\n=== ALL NETWORK REQUESTS ON DASHBOARD ===");
    networkRequests.forEach((r) => console.log(`  ${r.method} ${r.url} -> ${r.status || r.error}`));

    console.log("\n=== ALL CONSOLE LOGS ON DASHBOARD ===");
    consoleLogs.forEach((l) => console.log("  LOG:", l));

    console.log("\n=== ALL CONSOLE ERRORS ON DASHBOARD ===");
    consoleErrors.forEach((e) => console.log("  ERROR:", e));

    expect(page.url()).not.toContain("/login");
  });
});
