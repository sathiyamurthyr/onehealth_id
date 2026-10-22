import { test, expect } from "@playwright/test";

test.describe("OH-ID Login Portal — Sathus Admin, Sales & Support Contacts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
  });

  test("1. Contact Sathus Technology section renders with proper header and structure", async ({ page }) => {
    const contactSection = page.getByRole("region", { name: "Contact Sathus Technology" });
    await expect(contactSection).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contact Sathus Technology" })).toBeVisible();
    await expect(page.getByText("Official Helpdesk & Sales")).toBeVisible();
  });

  test("2. All three contact categories render with titles, badges, and descriptions", async ({ page }) => {
    const contactSection = page.getByRole("region", { name: "Contact Sathus Technology" });

    // 1. Sathus Admin
    await expect(contactSection.getByText("Sathus Admin", { exact: true })).toBeVisible();
    await expect(contactSection.getByText("Administration", { exact: true })).toBeVisible();
    await expect(contactSection.getByText("Platform administration & account assistance")).toBeVisible();

    // 2. Sales
    await expect(contactSection.getByText("Sales", { exact: true })).toBeVisible();
    await expect(contactSection.getByText("Partnerships", { exact: true })).toBeVisible();
    await expect(contactSection.getByText("Hospital onboarding, demos & partnerships")).toBeVisible();

    // 3. Support
    await expect(contactSection.getByText("Support", { exact: true })).toBeVisible();
    await expect(contactSection.getByText("Helpdesk", { exact: true })).toBeVisible();
    await expect(contactSection.getByText("Login issues, technical & product assistance")).toBeVisible();
  });

  test("3. Configured email addresses are visible and have valid mailto: links", async ({ page }) => {
    const contactSection = page.getByRole("region", { name: "Contact Sathus Technology" });

    // Admin email — aria-label includes "Email Us"
    const adminMail = contactSection.locator('a[href="mailto:admin@sathus.com"]');
    await expect(adminMail).toBeVisible();
    await expect(adminMail).toHaveAttribute("aria-label", /Email Us/i);

    // Sales email
    const salesMail = contactSection.locator('a[href="mailto:sales@sathus.com"]');
    await expect(salesMail).toBeVisible();
    await expect(salesMail).toHaveAttribute("aria-label", /Email Us/i);

    // Support email
    const supportMail = contactSection.locator('a[href="mailto:support@sathus.com"]');
    await expect(supportMail).toBeVisible();
    await expect(supportMail).toHaveAttribute("aria-label", /Email Us/i);
  });

  test("4. Phone rows are removed — no tel: links or telephone numbers visible", async ({ page }) => {
    const contactSection = page.getByRole("region", { name: "Contact Sathus Technology" });

    // No tel: links at all
    const phoneLinks = contactSection.locator('a[href^="tel:"]');
    await expect(phoneLinks).toHaveCount(0);

    // No phone number text visible
    await expect(contactSection.getByText("+91 44 2476 0000")).toHaveCount(0);
  });

  test("5. Privacy Policy & Terms of Service links exist in footer and navigate cleanly", async ({ page }) => {
    const privacyLink = page.getByRole("link", { name: "Privacy Policy" });
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute("href", "/privacy");

    const termsLink = page.getByRole("link", { name: "Terms of Service" });
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute("href", "/terms");

    // Click Privacy Policy and verify page loads
    await privacyLink.click();
    await page.waitForURL("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: /OneHealth ID.*Privacy Policy/i })).toBeVisible();

    // Return to login
    await page.getByRole("link", { name: "Back to Login" }).click();
    await page.waitForURL("/login");

    // Click Terms of Service and verify page loads
    await page.getByRole("link", { name: "Terms of Service" }).click();
    await page.waitForURL("/terms");
    await expect(page.getByRole("heading", { level: 1, name: /OneHealth ID.*Terms of Service/i })).toBeVisible();
  });

  test("6. Login form integrity is preserved (mobile-only, password, no email inputs or labels)", async ({ page }) => {
    // Mobile identifier and password
    await expect(page.locator("input#login-username")).toBeVisible();
    await expect(page.locator("input#login-password")).toBeVisible();

    // Security constraints: no email inputs or email labels
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.locator('label:has-text("Email")')).toHaveCount(0);

    // Form submission button
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText("Sign In to OneHealth OS");
  });

  test("7. Mobile Viewport (390x844): Responsive layout, zero horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    // Contact section is visible and stacked
    const contactSection = page.getByRole("region", { name: "Contact Sathus Technology" });
    await expect(contactSection).toBeVisible();
    await expect(contactSection.getByText("Sathus Admin", { exact: true })).toBeVisible();
    await expect(contactSection.getByText("Sales", { exact: true })).toBeVisible();
    await expect(contactSection.getByText("Support", { exact: true })).toBeVisible();
  });
});
