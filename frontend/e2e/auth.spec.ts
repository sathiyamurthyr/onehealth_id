import { test, expect } from "@playwright/test";

test.describe("OneHealth ID - Authentication & Dashboard E2E", () => {
  test("should display login portal and brand details", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sign In to OneHealth OS" })).toBeVisible();
    await expect(page.locator("text=ONEHEALTH").filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should authenticate successfully with admin credentials and navigate to dynamic dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();

    // Should redirect to authorized workspace
    await expect(page).toHaveURL(/.*(admin|dashboard)/);

    // Verify workspace loaded
    await expect(page.getByText("Super Admin Console").first()).toBeVisible();
    await expect(page.getByText("Platform-wide administration").first()).toBeVisible();
  });
});
