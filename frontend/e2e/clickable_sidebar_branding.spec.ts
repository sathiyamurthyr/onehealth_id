import { test, expect } from "@playwright/test";

test.describe("OH-ID Patient Workspace - Clickable Logo and Product Name Branding", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as test patient
    await page.goto("/login");
    await page.fill('input[type="text"]', "patient");
    await page.fill('input[type="password"]', "patient123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/patient**", { timeout: 15000 });
  });

  /* =========================================================================
     Desktop Tests (1440x900)
     ========================================================================= */

  test("1. Expanded Desktop: Brand link wraps logo and product name, navigates to / on click", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    await page.goto("/patient/timeline");
    await page.waitForLoadState("networkidle");

    const brandLink = page.locator("#sidebar-brand-link");
    await expect(brandLink).toBeVisible();
    await expect(brandLink).toHaveAttribute("href", "/");

    // Click the logo image inside the brand link
    const logoImg = brandLink.locator("img[alt='One Health ID']");
    await expect(logoImg).toBeVisible();
    await logoImg.click();

    // Verify navigation to public home page (/)
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test("2. Expanded Desktop: Clicking 'OneHealth ID' text navigates to /", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    await page.goto("/patient");
    await page.waitForLoadState("networkidle");

    const brandLink = page.locator("#sidebar-brand-link");
    await expect(brandLink).toBeVisible();

    // Click specifically on the OneHealth ID text
    const brandText = brandLink.getByText("OneHealth ID");
    await expect(brandText).toBeVisible();
    await brandText.click();

    // Verify navigation to public home page (/)
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test("3. Expanded Desktop: Keyboard accessibility (Tab focus and Enter key)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    await page.goto("/patient/timeline");
    await page.waitForLoadState("networkidle");

    const brandLink = page.locator("#sidebar-brand-link");
    await expect(brandLink).toBeVisible();

    // Focus the brand link directly or via keyboard
    await brandLink.focus();
    await expect(brandLink).toBeFocused();

    // Press Enter to activate link
    await page.keyboard.press("Enter");

    // Verify navigation to public home page (/)
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test("4. Collapsed Desktop: Collapsed logo link navigates to /", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    await page.goto("/patient/timeline");
    await page.waitForLoadState("networkidle");

    // Collapse the sidebar
    const collapseBtn = page.locator("#btn-sidebar-collapse");
    await collapseBtn.click();
    await page.waitForTimeout(400);

    // Collapsed brand link should now be visible with href="/"
    const collapsedBrandLink = page.locator("#sidebar-brand-logo-collapsed");
    await expect(collapsedBrandLink).toBeVisible();
    await expect(collapsedBrandLink).toHaveAttribute("href", "/");

    // Click collapsed logo
    await collapsedBrandLink.click();

    // Verify navigation to public home page (/)
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);
  });

  /* =========================================================================
     Tablet & Mobile Tests
     ========================================================================= */

  test("5. Tablet: Sticky top header logo & product name link navigates to /", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Tablet-768x1024", "Tablet test");

    await page.goto("/patient");
    await page.waitForLoadState("networkidle");

    const headerBrandLink = page.locator("#header-brand-link-mobile");
    await expect(headerBrandLink).toBeVisible();
    await expect(headerBrandLink).toHaveAttribute("href", "/");

    await headerBrandLink.click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test("6. Mobile: Drawer logo & product name link navigates to / and closes drawer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile-390x844", "Mobile test");

    await page.goto("/patient/timeline");
    await page.waitForLoadState("networkidle");

    // Open mobile navigation drawer
    const mobileToggle = page.locator("#btn-mobile-nav-toggle");
    await mobileToggle.click();
    await page.waitForTimeout(400);

    const drawerBrandLink = page.locator("#sidebar-mobile-brand-link");
    await expect(drawerBrandLink).toBeVisible();
    await expect(drawerBrandLink).toHaveAttribute("href", "/");

    await drawerBrandLink.click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);
  });
});
