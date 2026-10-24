import { test, expect } from "@playwright/test";

test("Capture Visual Screenshots of Patient Sidebar Enhancement", async ({ page }) => {
  // 1. Authenticate as patient
  await page.goto("http://localhost:3050/login");
  await page.evaluate(() => localStorage.clear());
  await page.locator('input[type="text"]').fill("patient");
  await page.locator('input[type="password"]').fill("patient123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/.*patient/, { timeout: 15000 });

  // 2. Desktop Expanded Viewport (1440x900)
  await page.setViewportSize({ width: 1440, height: 900 });
  const sidebar = page.locator("#desktop-workspace-sidebar");
  await expect(sidebar).toBeVisible({ timeout: 15000 });
  await expect(sidebar.getByText("Alice Smith")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(600);

  await page.screenshot({
    path: "C:/Users/Sathyamoorthy/.gemini/antigravity-ide/brain/f562c55b-2196-4a11-a7ba-1fd7da6bf873/sidebar_expanded_desktop.png",
    fullPage: false,
  });

  // 3. Desktop Collapsed Viewport
  const collapseBtn = sidebar.locator("#btn-sidebar-collapse");
  await collapseBtn.click();
  await expect(sidebar).toHaveClass(/w-20/, { timeout: 5000 });
  await page.waitForTimeout(600); // Wait for transition
  await page.screenshot({
    path: "C:/Users/Sathyamoorthy/.gemini/antigravity-ide/brain/f562c55b-2196-4a11-a7ba-1fd7da6bf873/sidebar_collapsed_desktop.png",
    fullPage: false,
  });

  // 4. Mobile Drawer Viewport (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const mobileToggle = page.locator("#btn-mobile-nav-toggle");
  await expect(mobileToggle).toBeVisible({ timeout: 5000 });
  await mobileToggle.click();
  const drawer = page.locator("#mobile-nav-drawer");
  await expect(drawer).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: "C:/Users/Sathyamoorthy/.gemini/antigravity-ide/brain/f562c55b-2196-4a11-a7ba-1fd7da6bf873/sidebar_mobile_drawer.png",
    fullPage: false,
  });
});
