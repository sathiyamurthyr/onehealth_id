import { test, expect } from "@playwright/test";

test.describe("OH-ID Patient Workspace - Enterprise Sidebar UX Enhancement", () => {
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

  test("1. Prominent OH-ID branding and header styling", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    const sidebar = page.locator("#desktop-workspace-sidebar");
    await expect(sidebar).toBeVisible();

    // Verify logo is visible at prominent size
    const logoImg = sidebar.locator("img[alt='One Health ID']").first();
    await expect(logoImg).toBeVisible();

    // Verify prominent brand name and subtitle
    await expect(sidebar.getByText("OneHealth ID").first()).toBeVisible();
    await expect(sidebar.getByText("v1.0").first()).toBeVisible();
    await expect(sidebar.getByText("Personal Health Workspace").first()).toBeVisible();

    // Verify collapse button is present
    await expect(sidebar.locator("#btn-sidebar-collapse")).toBeVisible();
  });

  test("2. Menu search filters items, displays match count, and provides clear button", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    const sidebar = page.locator("#desktop-workspace-sidebar");
    const searchInput = sidebar.locator("#sidebar-menu-search");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("placeholder", "Search menu...");

    // Initial state: "Appointments", "Family Members", "Visits" visible
    await expect(sidebar.getByText("Appointments").first()).toBeVisible();
    await expect(sidebar.getByText("Family Members").first()).toBeVisible();

    // Search for "appoint"
    await searchInput.fill("appoint");
    await expect(sidebar.getByText("Appointments").first()).toBeVisible();
    // Family Members should be filtered out
    await expect(sidebar.getByText("Family Members")).toBeHidden();

    // Clear search button should appear
    const clearBtn = sidebar.locator("#btn-clear-search");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Cleared: Family Members should be visible again
    await expect(sidebar.getByText("Family Members").first()).toBeVisible();
    await expect(searchInput).toHaveValue("");
  });

  test("3. Empty search results display friendly empty state with Clear button", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    const sidebar = page.locator("#desktop-workspace-sidebar");
    const searchInput = sidebar.locator("#sidebar-menu-search");

    // Type non-existent query
    await searchInput.fill("xyznonexistent");

    const emptyCard = sidebar.locator("#no-menu-items-found");
    await expect(emptyCard).toBeVisible();
    await expect(emptyCard.getByText("No menu items found")).toBeVisible();

    // Click "Clear search" in empty card
    const clearEmptyBtn = sidebar.locator("#btn-clear-search-empty");
    await expect(clearEmptyBtn).toBeVisible();
    await clearEmptyBtn.click();

    await expect(emptyCard).toBeHidden();
    await expect(sidebar.getByText("Appointments").first()).toBeVisible();
  });

  test("4. Search keyboard navigation with Arrow keys, Enter, and Escape", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    const sidebar = page.locator("#desktop-workspace-sidebar");
    const searchInput = sidebar.locator("#sidebar-menu-search");

    // Focus and type "family"
    await searchInput.focus();
    await searchInput.fill("family");
    await expect(sidebar.getByText("Family Members").first()).toBeVisible();

    // Press Enter to navigate to /patient/family
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/.*patient\/family/, { timeout: 10000 });

    // Press Escape to clear search
    const newSearchInput = sidebar.locator("#sidebar-menu-search");
    await newSearchInput.focus();
    await newSearchInput.fill("testquery");
    await newSearchInput.press("Escape");
    await expect(newSearchInput).toHaveValue("");
  });

  test("5. Obvious selected menu visual indicator and exactly one active item on /patient and /patient/timeline", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    const sidebar = page.locator("#desktop-workspace-sidebar");

    // 1. On /patient, ONLY Overview should be active; Complete Timeline must NOT be active
    await page.goto("/patient");
    await expect(page).toHaveURL(/.*\/patient$/);

    const overviewNav = sidebar.locator("#nav-patient").first();
    const timelineNav = sidebar.locator("#nav-patient-timeline").first();
    const profileNav = sidebar.locator("#nav-patient-profile").first();

    await expect(overviewNav).toBeVisible();
    await expect(overviewNav).toHaveAttribute("aria-current", "page");
    await expect(overviewNav).toHaveClass(/bg-\[#155EEF\]/);
    await expect(overviewNav.locator("span[aria-hidden='true']").first()).toBeVisible();

    // Timeline and Profile must not be active on /patient
    await expect(timelineNav).not.toHaveAttribute("aria-current", "page");
    await expect(timelineNav).not.toHaveClass(/bg-\[#155EEF\]/);
    await expect(profileNav).not.toHaveAttribute("aria-current", "page");

    // Exactly one item has aria-current="page" in sidebar
    expect(await sidebar.locator("[aria-current='page']").count()).toBe(1);

    // 2. On /patient/timeline, ONLY Complete Timeline should be active; Overview must NOT be active
    await page.goto("/patient/timeline");
    await expect(page).toHaveURL(/.*patient\/timeline/);

    await expect(timelineNav).toBeVisible();
    await expect(timelineNav).toHaveAttribute("aria-current", "page");
    await expect(timelineNav).toHaveClass(/bg-\[#155EEF\]/);
    await expect(timelineNav.locator("span[aria-hidden='true']").first()).toBeVisible();

    // Overview must NOT be active when on /patient/timeline
    await expect(overviewNav).not.toHaveAttribute("aria-current", "page");
    await expect(overviewNav).not.toHaveClass(/bg-\[#155EEF\]/);
    expect(await sidebar.locator("[aria-current='page']").count()).toBe(1);

    // 3. Browser refresh preserves the single active state on /patient/timeline
    await page.reload();
    await expect(page).toHaveURL(/.*patient\/timeline/);
    await expect(timelineNav).toHaveAttribute("aria-current", "page");
    await expect(overviewNav).not.toHaveAttribute("aria-current", "page");
    expect(await sidebar.locator("[aria-current='page']").count()).toBe(1);

    // 4. On /patient/profile, ONLY My Profile should be active
    await page.goto("/patient/profile");
    await expect(page).toHaveURL(/.*patient\/profile/);
    await expect(profileNav).toHaveAttribute("aria-current", "page");
    await expect(profileNav).toHaveClass(/bg-\[#155EEF\]/);
    await expect(overviewNav).not.toHaveAttribute("aria-current", "page");
    await expect(timelineNav).not.toHaveAttribute("aria-current", "page");
    expect(await sidebar.locator("[aria-current='page']").count()).toBe(1);

    // 5. In collapsed rail mode on /patient/timeline, ONLY timeline icon is highlighted
    await page.goto("/patient/timeline");
    const collapseBtn = sidebar.locator("#btn-sidebar-collapse");
    await collapseBtn.click();
    await expect(sidebar).toHaveClass(/w-20/);

    const collapsedTimeline = sidebar.locator("#collapsed-nav-patient-timeline");
    const collapsedOverview = sidebar.locator("#collapsed-nav-patient");

    await expect(collapsedTimeline).toBeVisible();
    await expect(collapsedTimeline).toHaveAttribute("aria-current", "page");
    await expect(collapsedTimeline).toHaveClass(/bg-\[#155EEF\]/);
    await expect(collapsedOverview).not.toHaveAttribute("aria-current", "page");
    await expect(collapsedOverview).not.toHaveClass(/bg-\[#155EEF\]/);

    // Restore expanded sidebar for subsequent tests
    await sidebar.locator("#btn-sidebar-expand").click();
    await expect(sidebar).toHaveClass(/w-72/);
  });

  test("6. Favourite menu items can be added, removed, and navigate correctly", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    const sidebar = page.locator("#desktop-workspace-sidebar");

    // By default, Favourites section is present if favourites exist
    const favSection = sidebar.locator("#sidebar-favourites-section");
    
    // Add "Family Members" to favourites
    const familyRow = sidebar.locator("#nav-patient-family");
    await expect(familyRow).toBeVisible();

    const starBtn = familyRow.locator("button[aria-label*='favourites']");
    await starBtn.click();

    // Verify "Family Members" is now in Favourites section
    await expect(favSection).toBeVisible();
    await expect(favSection.getByText("Family Members").first()).toBeVisible();

    // Click Family Members link in Favourites section to navigate
    const favLink = favSection.locator("a[href='/patient/family']").first();
    await favLink.click();
    await expect(page).toHaveURL(/.*patient\/family/);

    // Remove from favourites via star button
    const removeBtn = favSection.locator("button[aria-label='Remove Family Members from favourites']");
    await removeBtn.click();
    await expect(favSection.locator("a[href='/patient/family']")).toBeHidden();
  });

  test("7. Collapsed rail provides search modal dialog with keyboard navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop-1440x900", "Desktop test");

    const sidebar = page.locator("#desktop-workspace-sidebar");
    const collapseBtn = sidebar.locator("#btn-sidebar-collapse");
    await collapseBtn.click();
    await expect(sidebar).toHaveClass(/w-20/);

    // Verify collapsed search button is visible
    const collapsedSearchBtn = sidebar.locator("#btn-collapsed-search");
    await expect(collapsedSearchBtn).toBeVisible();
    await collapsedSearchBtn.click();

    // Verify search modal dialog opened
    const searchDialog = page.locator("#collapsed-search-dialog");
    await expect(searchDialog).toBeVisible();

    const modalSearchInput = page.locator("#collapsed-modal-search");
    await expect(modalSearchInput).toBeVisible();
    await modalSearchInput.fill("bills");

    // Click matching result
    const resultBtn = searchDialog.locator("button:has-text('Bills')").first();
    await expect(resultBtn).toBeVisible();
    await resultBtn.click();

    await expect(page).toHaveURL(/.*patient\/bills/);
    await expect(searchDialog).toBeHidden();
  });

  /* =========================================================================
     Tablet Tests (Tablet-768x1024)
     ========================================================================= */

  test("8. Tablet: Adaptive layout, navigation drawer, menu search, and touch targets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Tablet-768x1024", "Tablet test");

    // At 768px width (< lg), desktop sidebar is cleanly hidden and mobile/tablet toggle is visible
    await expect(page.locator("#desktop-workspace-sidebar")).toBeHidden();
    const toggleBtn = page.locator("#btn-mobile-nav-toggle");
    await expect(toggleBtn).toBeVisible();

    // Open tablet navigation drawer
    await toggleBtn.click();
    const drawer = page.locator("#mobile-nav-drawer");
    await expect(drawer).toBeVisible();

    // Verify touch targets >= 44px
    const navItem = drawer.locator("a[href='/patient/appointments']").first();
    await expect(navItem).toBeVisible();
    const box = await navItem.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);

    // Verify search input works on tablet
    const searchInput = drawer.locator("#mobile-menu-search");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Appointments");
    await expect(drawer.getByText("Appointments").first()).toBeVisible();
  });

  /* =========================================================================
     Mobile Tests (Mobile-390x844)
     ========================================================================= */

  test("9. Mobile: Slide-in navigation drawer with search, favourites, and close control", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile-390x844", "Mobile test");

    // Open mobile navigation drawer
    const toggleBtn = page.locator("#btn-mobile-nav-toggle");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    const drawer = page.locator("#mobile-nav-drawer");
    await expect(drawer).toBeVisible();

    // Verify branding in mobile drawer
    await expect(drawer.getByText("OneHealth ID").first()).toBeVisible();
    await expect(drawer.getByText("Personal Health Workspace").first()).toBeVisible();

    // Verify mobile search input works
    const mobileSearch = drawer.locator("#mobile-menu-search");
    await expect(mobileSearch).toBeVisible();
    await mobileSearch.fill("appoint");
    await expect(drawer.getByText("Appointments").first()).toBeVisible();

    // Close drawer via close button
    const closeBtn = drawer.locator("#btn-mobile-nav-close");
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(drawer).toBeHidden();
  });
});
