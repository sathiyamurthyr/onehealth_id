import { test, expect } from "@playwright/test";

test.describe("OH-ID Patient Workspace - Sidebar Header & Collapse/Expand", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and login as patient
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
  });

  /* =========================================================================
     Desktop Tests (Desktop-1440x900)
     ========================================================================= */

  test("Desktop: Distinct healthcare-blue header, visible branding, and patient card", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop sidebar tests only run on Desktop project");

    const sidebar = page.locator("#desktop-workspace-sidebar");
    await expect(sidebar).toBeVisible();

    // Verify header branding elements
    await expect(sidebar.locator("img[alt='One Health ID']").first()).toBeVisible();
    await expect(sidebar.getByText("OneHealth ID").first()).toBeVisible();
    await expect(sidebar.getByText("v1.0").first()).toBeVisible();
    await expect(sidebar.getByText("Personal Health Workspace").first()).toBeVisible();

    // Verify patient identity card (SELF badge, patient name, OH-ID)
    const familyBtn = sidebar.locator("#family-switcher-btn");
    await expect(familyBtn).toBeVisible();
    await expect(familyBtn.getByText("SELF")).toBeVisible();
    await expect(familyBtn.getByText("Alice Smith")).toBeVisible();

    // Verify collapse toggle button exists
    const collapseBtn = sidebar.locator("#btn-sidebar-collapse");
    await expect(collapseBtn).toBeVisible();
    await expect(collapseBtn).toHaveAttribute("aria-label", "Collapse sidebar");
  });

  test("Desktop: Collapse to icon rail, tooltips, expand restoration, and localStorage persistence", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop collapse tests only run on Desktop project");

    const sidebar = page.locator("#desktop-workspace-sidebar");
    const collapseBtn = sidebar.locator("#btn-sidebar-collapse");
    await expect(collapseBtn).toBeVisible();

    // Initial expanded state width ~ 288px (w-72)
    await expect(sidebar).toHaveClass(/w-72/);
    const initialBox = await sidebar.boundingBox();
    expect(initialBox?.width).toBeGreaterThanOrEqual(280);

    // Trigger Collapse
    await collapseBtn.click();

    // Wait for transition to narrow rail w-20 (~80px)
    await expect(sidebar).toHaveClass(/w-20/, { timeout: 5000 });
    await page.waitForTimeout(400); // Wait for transition
    const collapsedBox = await sidebar.boundingBox();
    expect(collapsedBox?.width).toBeLessThanOrEqual(90);

    // Verify text labels and section headings are hidden in collapsed rail
    await expect(sidebar.getByText("Personal Health Workspace")).toBeHidden();
    await expect(sidebar.getByText("My Health Journey")).toBeHidden();

    // Verify logo and expand button remain visible
    await expect(sidebar.locator("img[alt='One Health ID']").first()).toBeVisible();
    const expandBtn = sidebar.locator("#btn-sidebar-expand");
    await expect(expandBtn).toBeVisible();
    await expect(expandBtn).toHaveAttribute("aria-label", "Expand sidebar");

    // Verify tooltips on hover over collapsed icons
    const firstNavLink = sidebar.locator("a[title='Overview']").first();
    await expect(firstNavLink).toBeVisible();
    await firstNavLink.hover();
    const tooltip = sidebar.locator("[role='tooltip']").first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText("Overview");

    // Verify persistence in localStorage
    const savedState = await page.evaluate(() => localStorage.getItem("oh_sidebar_collapsed"));
    expect(savedState).toBe("true");

    // Trigger Expand
    await expandBtn.click();
    await expect(sidebar).toHaveClass(/w-72/, { timeout: 5000 });
    await page.waitForTimeout(400); // Wait for transition
    const expandedBox = await sidebar.boundingBox();
    expect(expandedBox?.width).toBeGreaterThanOrEqual(280);

    // Verify full branding and labels restored
    await expect(sidebar.getByText("Personal Health Workspace").first()).toBeVisible();
    const restoredState = await page.evaluate(() => localStorage.getItem("oh_sidebar_collapsed"));
    expect(restoredState).toBe("false");
  });

  test("Desktop: Navigation from collapsed rail preserves active highlight and routing", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop navigation tests only run on Desktop project");

    const sidebar = page.locator("#desktop-workspace-sidebar");
    await sidebar.locator("#btn-sidebar-collapse").click();
    await expect(sidebar).toHaveClass(/w-20/, { timeout: 5000 });

    // Click Prescriptions link in collapsed rail
    const rxLink = sidebar.locator("a[title='Prescriptions']").first();
    await expect(rxLink).toBeVisible();
    await rxLink.click();

    // Verify navigation occurred
    await expect(page).toHaveURL(/.*patient\/prescriptions/, { timeout: 10000 });

    // Verify active highlight on prescriptions icon
    await expect(rxLink).toHaveClass(/bg-\[#155EEF\]/);
  });

  /* =========================================================================
     Tablet Tests (Tablet-768x1024)
     ========================================================================= */

  test("Tablet: Adaptive layout, zero horizontal overflow, and accessible touch targets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Tablet-768x1024", "Tablet tests only run on Tablet project");

    // Desktop sidebar is hidden below lg breakpoint (1024px)
    await expect(page.locator("#desktop-workspace-sidebar")).toBeHidden();

    // Verify zero horizontal scrolling
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    // Mobile bottom navigation bar is visible
    const mobileNav = page.locator("nav[aria-label='Mobile Navigation']");
    await expect(mobileNav).toBeVisible();

    // Hamburger button is visible in top header
    const toggleBtn = page.locator("#btn-mobile-nav-toggle");
    await expect(toggleBtn).toBeVisible();
  });

  /* =========================================================================
     Mobile Tests (Mobile-390x844)
     ========================================================================= */

  test("Mobile: Slide-in navigation drawer, backdrop, close control, Escape key, and auto-close", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile-390x844", "Mobile tests only run on Mobile project");

    // Desktop sidebar must be hidden
    await expect(page.locator("#desktop-workspace-sidebar")).toBeHidden();

    // Mobile header toggle button
    const mobileToggle = page.locator("#btn-mobile-nav-toggle");
    await expect(mobileToggle).toBeVisible();

    // Drawer should initially not be open
    await expect(page.locator("#mobile-nav-drawer")).toHaveCount(0);

    // Open mobile drawer
    await mobileToggle.click();
    const drawer = page.locator("#mobile-nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(page.locator("#mobile-nav-backdrop")).toBeVisible();

    // Verify mobile drawer header styling and logo
    await expect(drawer.locator("img[alt='One Health ID']").first()).toBeVisible();
    await expect(drawer.getByText("OneHealth ID").first()).toBeVisible();
    await expect(drawer.getByText("Personal Health Workspace").first()).toBeVisible();

    // Verify drawer close button
    const closeBtn = page.locator("#btn-mobile-nav-close");
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator("#mobile-nav-drawer")).toHaveCount(0);

    // Re-open and verify Escape key closes drawer
    await mobileToggle.click();
    await expect(page.locator("#mobile-nav-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-nav-drawer")).toHaveCount(0);

    // Re-open and navigate via link -> drawer auto-closes
    await mobileToggle.click();
    await expect(page.locator("#mobile-nav-drawer")).toBeVisible();
    const profileLink = page.locator("#mobile-nav-drawer a[href='/patient/profile']").first();
    await profileLink.click();

    // Expect navigation and drawer closed
    await expect(page).toHaveURL(/.*patient\/profile/, { timeout: 10000 });
    await expect(page.locator("#mobile-nav-drawer")).toHaveCount(0);

    // Verify zero horizontal scroll on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});
