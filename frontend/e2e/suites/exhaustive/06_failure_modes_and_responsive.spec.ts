import { test, expect } from "@playwright/test";
import { setupPageDiagnostics, assertPageHealth } from "../../engine/discovery.crawler";

test.describe("Exhaustive Failure Mode, Boundary Validation & Responsive Layout Tests", () => {
  test("01. Login Failure Handling: Invalid Username and Bad Password", async ({ page }) => {
    setupPageDiagnostics(page);
    await page.goto("/login");
    await assertPageHealth(page, "/login");

    // Attempt invalid credentials
    await page.locator('input#login-username, input[type="text"]').first().fill("9999999999");
    await page.locator('input#login-password, input[type="password"]').first().fill("wrong_password_xyz");
    await page.locator('button[type="submit"]').first().click();

    // Verify error banner is displayed
    await expect(
      page.locator(".text-rose-700, .bg-rose-50").first()
    ).toBeVisible({ timeout: 8000 });

    // Ensure user remains on login page (no auth bypass)
    expect(page.url()).toContain("/login");
  });

  test("02. Form Boundary & XSS Sanitization Defense", async ({ page }) => {
    setupPageDiagnostics(page);
    await page.goto("/login");

    // Test XSS payload in login input
    const xssPayload = '<script>alert("xss")</script>';
    await page.locator('input#login-username, input[type="text"]').first().fill(xssPayload);
    await page.locator('button[type="submit"]').first().click();

    // Verify script does not execute into an unhandled window alert
    expect(page.url()).toContain("/login");
  });

  test("03. Public Verification Route Graceful Handling of Invalid / Expired Token", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Invalid prescription verification token
    await page.goto("/verify/prescription/invalid-tampered-token-123");
    await assertPageHealth(page);
    const bodyRx = await page.locator("body").innerText();
    expect(bodyRx.length).toBeGreaterThan(10);

    // 2. Invalid lab report verification token
    await page.goto("/verify/lab-report/invalid-tampered-token-456");
    await assertPageHealth(page);
    const bodyLab = await page.locator("body").innerText();
    expect(bodyLab.length).toBeGreaterThan(10);
  });

  test("04. Design System Component Showcase Responsive Rendering", async ({ page }) => {
    setupPageDiagnostics(page);
    await page.goto("/design-system");
    await assertPageHealth(page, "/design-system");

    // Verify design system components are rendered cleanly
    const headings = await page.locator("h1, h2, h3").count();
    expect(headings).toBeGreaterThan(0);
  });
});
