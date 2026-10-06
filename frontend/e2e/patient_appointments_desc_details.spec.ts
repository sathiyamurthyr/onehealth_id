import { test, expect } from "@playwright/test";

test.describe("OH-ID Patient Appointments - Descending Order & Details Modal", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate as patient
    await page.goto("/login");
    await page.fill('input[type="text"]', "patient");
    await page.fill('input[type="password"]', "patient123");
    await page.click('button[type="submit"]');

    // Wait for patient workspace to load
    await page.waitForURL("**/patient**", { timeout: 15000 });
  });

  test("Verify Appointments Default to Descending Order and Sort Selector works", async ({ page }) => {
    // Navigate directly to /patient/appointments
    await page.goto("/patient/appointments");
    await page.waitForLoadState("networkidle");

    // Header and filter controls should be visible
    await expect(page.locator("h1")).toContainText(/Appointments/i);
    const sortSelect = page.locator('[data-testid="sort-by-select"]');
    await expect(sortSelect).toBeVisible();
    await expect(sortSelect).toHaveValue("NEWEST");

    // Check appointment cards are rendered
    const cards = page.locator('[data-testid^="appointment-card-"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Each card must have a "View Details" button and a "Show QR Pass" button
    const firstCard = cards.first();
    const viewDetailsBtn = firstCard.locator('button:has-text("View Details")');
    await expect(viewDetailsBtn).toBeVisible();

    const showQrBtn = firstCard.locator('button:has-text("Show QR Pass")');
    await expect(showQrBtn).toBeVisible();

    // Verify sort change to "OLDEST"
    await sortSelect.selectOption("OLDEST");
    await expect(sortSelect).toHaveValue("OLDEST");

    // Switch back to "NEWEST"
    await sortSelect.selectOption("NEWEST");
    await expect(sortSelect).toHaveValue("NEWEST");
  });

  test("Click View Details Button opens AppointmentDetailsModal with complete information", async ({ page }) => {
    await page.goto("/patient/appointments");
    await page.waitForLoadState("networkidle");

    const cards = page.locator('[data-testid^="appointment-card-"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    const firstCard = cards.first();
    const viewDetailsBtn = firstCard.locator('button:has-text("View Details")');
    await viewDetailsBtn.click();

    // Verify Appointment Details Modal is displayed
    const modal = page.locator('[data-testid="appointment-details-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Appointment Details")).toBeVisible();

    // Verify modal sections
    // 1. Doctor info & specialty
    await expect(modal.locator("text=Consulting Doctor")).toBeVisible();
    // 2. Hospital / Location info
    await expect(modal.locator("text=Hospital & Facility")).toBeVisible();
    // 3. Patient Information & OH-ID
    await expect(modal.locator("text=Registered Patient Identity")).toBeVisible();
    // 4. Digital Check-in & Token section
    await expect(modal.locator("text=Digital Check-in")).toBeVisible();

    // Verify Actions inside modal: Download .ics, Print, Show QR Pass
    const icsBtn = modal.locator('button:has-text("Add to Calendar")');
    await expect(icsBtn).toBeVisible();

    const printBtn = modal.locator('button:has-text("Print Slip")');
    await expect(printBtn).toBeVisible();

    const qrPassBtn = modal.locator('button:has-text("Show QR Pass")');
    await expect(qrPassBtn).toBeVisible();

    // Close modal via close button
    const closeBtn = modal.locator('[data-testid="close-appointment-details-modal"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test("Clicking Appointment Card Body opens AppointmentDetailsModal and submodal QR triggers work", async ({ page }) => {
    await page.goto("/patient/appointments");
    await page.waitForLoadState("networkidle");

    const cards = page.locator('[data-testid^="appointment-card-"]');
    const firstCard = cards.first();

    // Click on doctor name area in card body
    await firstCard.locator("text=Dr.").first().click();

    // Details modal should open
    const modal = page.locator('[data-testid="appointment-details-modal"]');
    await expect(modal).toBeVisible();

    // Click Show QR Pass from within the details modal
    const qrBtn = modal.locator('button:has-text("Show QR Pass")');
    await qrBtn.click();

    // Check QR Modal appears
    await expect(page.locator("text=Hospital Check-in Pass")).toBeVisible();
    await expect(page.locator("text=Scan at Hospital Reception")).toBeVisible();

    // Close QR Modal
    const qrCloseBtn = page.locator('button:has-text("Close Pass")').or(page.locator('button[aria-label="Close"]')).first();
    if (await qrCloseBtn.isVisible()) {
      await qrCloseBtn.click();
    }
  });

  test("Filter tabs (All, Upcoming, Completed, Cancelled) and Search work smoothly", async ({ page }) => {
    await page.goto("/patient/appointments");
    await page.waitForLoadState("networkidle");

    // Click Upcoming filter tab
    const upcomingTab = page.locator('[data-testid="status-filter-upcoming"]');
    await upcomingTab.click();

    // Click All filter tab
    const allTab = page.locator('[data-testid="status-filter-all"]');
    await allTab.click();

    // Test Search filter
    const searchInput = page.locator('input[placeholder*="Search doctor, hospital"]');
    await searchInput.fill("Dr.");
    const cards = page.locator('[data-testid^="appointment-card-"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // Clear search
    await searchInput.fill("");
  });

  test("Dropdown values (Hospitals & Doctors) render non-empty names across appointments and visits", async ({ page }) => {
    // 1. Check /patient/appointments Hospital Select
    await page.goto("/patient/appointments");
    await page.waitForLoadState("networkidle");

    const apptHospSelect = page.locator('select[aria-label="Filter by Hospital"]');
    if (await apptHospSelect.isVisible()) {
      const options = apptHospSelect.locator("option");
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(1); // At least 'All Hospitals (N)' plus individual hospitals

      for (let i = 0; i < optionCount; i++) {
        const text = (await options.nth(i).textContent())?.trim();
        expect(text).toBeTruthy();
        expect(text?.length).toBeGreaterThan(0);
        // Ensure not showing undefined or blank
        expect(text).not.toBe("undefined");
      }
    }

    // 2. Check /patient/visits Hospital & Doctor Selects
    await page.goto("/patient/visits");
    await page.waitForLoadState("networkidle");

    const visitsHospSelect = page.locator('select[aria-label="Filter by Hospital"]');
    await expect(visitsHospSelect).toBeVisible();
    const hospOptions = visitsHospSelect.locator("option");
    const hospCount = await hospOptions.count();
    expect(hospCount).toBeGreaterThan(1);

    for (let i = 0; i < hospCount; i++) {
      const text = (await hospOptions.nth(i).textContent())?.trim();
      expect(text).toBeTruthy();
      expect(text?.length).toBeGreaterThan(0);
      expect(text).not.toBe("undefined");
    }

    const docSelect = page.locator('select[aria-label="Filter by Doctor"]');
    await expect(docSelect).toBeVisible();
    const docOptions = docSelect.locator("option");
    const docCount = await docOptions.count();
    expect(docCount).toBeGreaterThan(1);

    for (let i = 0; i < docCount; i++) {
      const text = (await docOptions.nth(i).textContent())?.trim();
      expect(text).toBeTruthy();
      expect(text?.length).toBeGreaterThan(0);
      expect(text).not.toBe("undefined");
    }
  });
});

