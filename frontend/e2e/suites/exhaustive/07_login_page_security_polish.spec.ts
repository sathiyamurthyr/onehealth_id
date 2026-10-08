import { test, expect } from "@playwright/test";

test.describe("OH-ID Login Portal — Clean Production UI (No Pilot Test Accounts)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
  });

  test("1. Universal login copy & terminology conformance", async ({ page }) => {
    // 1. Check "One Universal Login Identity" is present in DOM
    const universalIdentity = page.getByText("One Universal Login Identity", { exact: true });
    await expect(universalIdentity).toBeAttached();
    
    // 2. Check subtitle replacement is visible
    await expect(
      page.getByText("Enter your registered mobile number and password. Your authorized workspace and access are determined automatically.")
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Enter clinician credentials.");

    // 3. Check "Backend-enforced RBAC & secure session controls" in DOM
    const rbacNotice = page.getByText("Backend-enforced RBAC & secure session controls");
    await expect(rbacNotice).toBeAttached();
    await expect(page.locator("body")).not.toContainText("zero client role trust");
    await expect(page.locator("body")).not.toContainText("Client Admin");
    await expect(page.locator("body")).not.toContainText("Client Role");

    // 4. Check badge text is visible
    await expect(page.getByText("One Login — Your Authorized Workspace")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Single Universal Portal — Dynamic Role Detection");
  });

  test("2. Mobile-only login field & no email login options", async ({ page }) => {
    // Check mobile field label and identifier badge
    await expect(page.getByText("Registered Mobile Number", { exact: true })).toBeVisible();
    await expect(page.getByText("Primary Login Identifier", { exact: true })).toBeVisible();
    
    const mobileInput = page.locator('input#login-username');
    await expect(mobileInput).toBeVisible();
    await expect(mobileInput).toHaveAttribute("placeholder", "e.g. 9840111222");

    // Ensure no email fields or email login UI are present
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.locator('label:has-text("Email")')).toHaveCount(0);
  });

  test("3. Total removal of Pilot Test Accounts section & demo cards", async ({ page }) => {
    // 1. Ensure no pilot test accounts banner or section exists
    await expect(page.locator("body")).not.toContainText("Pilot test accounts");
    await expect(page.locator("body")).not.toContainText("Pilot Test Accounts");
    await expect(page.locator("body")).not.toContainText("Mobile + Password");
    await expect(page.locator("#quick-fill-section")).toHaveCount(0);

    // 2. Ensure no demo names are present on the page
    await expect(page.locator("body")).not.toContainText("Dr. Senthil Nathan");
    await expect(page.locator("body")).not.toContainText("Dr. Anitha Raman");
    await expect(page.locator("body")).not.toContainText("Staff Nurse Priya");
    await expect(page.locator("body")).not.toContainText("Sarah Jenkins");
    await expect(page.locator("body")).not.toContainText("Facility Admin");
    await expect(page.locator("body")).not.toContainText("Sathus Executive");

    // 3. Ensure no demo mobile numbers or credentials are rendered in body text
    const bodyText = await page.innerText("body");
    expect(bodyText).not.toContain("9840111222");
    expect(bodyText).not.toContain("9840133444");
    expect(bodyText).not.toContain("9840155666");
    expect(bodyText).not.toContain("9840177888");
    expect(bodyText).not.toContain("9840012345");
    expect(bodyText).not.toContain("9840000000");

    // 4. Ensure no passwords in DOM or text
    expect(bodyText).not.toContain("doctor123");
    expect(bodyText).not.toContain("nurse123");
    expect(bodyText).not.toContain("rec123");
    expect(bodyText).not.toContain("admin123");
  });

  test("4. Forgot Password trigger and interactive modal", async ({ page }) => {
    const forgotBtn = page.getByRole("button", { name: /Forgot Password\?/i });
    await expect(forgotBtn).toBeVisible();

    await forgotBtn.click();

    // Verify modal appears
    await expect(page.getByText("Forgot Your Password?")).toBeVisible();
    await expect(page.getByText("Hospital IT Administrator")).toBeVisible();
    await expect(page.getByText("044-2476-0000")).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Got It" }).click();
    await expect(page.getByText("Forgot Your Password?")).not.toBeVisible();
  });

  test("5. Application-level validation — Empty mobile number", async ({ page }) => {
    const mobileInput = page.locator('input#login-username');
    await mobileInput.fill("");
    
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const errorBanner = page.locator("#login-error-banner");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Mobile number is required.");
  });

  test("6. Application-level validation — Invalid 10-digit mobile number", async ({ page }) => {
    const mobileInput = page.locator('input#login-username');
    await mobileInput.fill("12345"); // Not 10 digits
    
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const errorBanner = page.locator("#login-error-banner");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Enter a valid 10-digit registered mobile number.");
  });

  test("7. Application-level validation — Empty password", async ({ page }) => {
    const mobileInput = page.locator('input#login-username');
    const passwordInput = page.locator('input#login-password');
    
    await mobileInput.fill("9840111222");
    await passwordInput.fill("");
    
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const errorBanner = page.locator("#login-error-banner");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Password is required.");
  });

  test("8. Application-level validation — Incorrect credentials handling", async ({ page }) => {
    const mobileInput = page.locator('input#login-username');
    const passwordInput = page.locator('input#login-password');
    
    await mobileInput.fill("9840111222");
    await passwordInput.fill("wrong_password_999");
    
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const errorBanner = page.locator("#login-error-banner");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("The mobile number or password is incorrect.");
    
    // Security check: must not leak whether the mobile number exists
    const errorText = await errorBanner.innerText();
    expect(errorText).not.toContain("User not found");
    expect(errorText).not.toContain("Account does not exist");
  });

  test("9. Successful authenticated login & workspace resolution", async ({ page }) => {
    const mobileInput = page.locator('input#login-username');
    const passwordInput = page.locator('input#login-password');
    
    await mobileInput.fill("9840111222");
    await passwordInput.fill("doctor123");
    
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Redirection to doctor workspace
    await expect(page).toHaveURL(/.*(doctor|queue|dashboard)/, { timeout: 10000 });
  });

  test("10. Sathus Technology branding & Zero-scroll viewport layout", async ({ page }) => {
    // Check "Powered by Sathus Technology Pvt Ltd" branding
    await expect(page.getByText("Powered by Sathus Technology Pvt Ltd").filter({ visible: true }).first()).toBeVisible();

    // Check Kedar Hospital Network branding
    await expect(page.getByText("Kedar Hospital Network").filter({ visible: true }).first()).toBeVisible();

    // Confirm zero vertical scroll
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 5);
  });
});
