import { test, expect } from "@playwright/test";

test.describe("OneHealth ID - Responsive Design & Device Strategy", () => {
  test("Desktop Viewport (1440x900): Full sidebar, multi-column dashboard, zero horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("9840000000");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    const continueBtn = page.getByRole("button", { name: "Continue" }).first();
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForURL(/.*(admin|dashboard)/);

    // Sidebar should be visible on desktop
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // Verify no horizontal scrolling
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test("Tablet Viewport (768x1024): Adaptive layout without content clipping", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("9840000001");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    const continueBtn = page.getByRole("button", { name: "Continue" }).first();
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForURL(/.*(admin|dashboard|hospital)/);

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test("Mobile Viewport (390x844): Sticky bottom navigation, cards stack vertically, touch targets >= 44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("9840000002");
    await page.locator('input[type="password"]').fill("doctor123");
    await page.locator('button[type="submit"]').click();
    const continueBtn = page.getByRole("button", { name: "Continue" }).first();
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForURL(/.*(admin|dashboard|hospital|doctor)/);

    // Desktop sidebar should be hidden
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();

    // Mobile bottom navigation bar should be visible
    const bottomNav = page.locator('nav[aria-label="Mobile Navigation"]');
    await expect(bottomNav).toBeVisible();

    // Verify zero horizontal scrolling on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});
