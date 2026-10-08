import { test, expect } from "@playwright/test";

test.describe("OH-ID Patient-Only Workspace — Strict Boundary & Multi-Hospital Journey", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[BROWSER ERROR]", msg.text());
    });
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test("1. Patient Login & Overview Dashboard: Clean personal workspace with real metrics and NO hospital ops", async ({ page }) => {
    await page.goto("/login");

    // Login as Patient Alice Smith
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();

    // Authoritative redirect to /patient
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });

    // Verify patient greeting and identity in main viewport
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main").locator("text=Good Day").first()).toBeVisible();
    await expect(page.locator("text=Personal Health Workspace").filter({ visible: true }).first()).toBeVisible();

    // Verify presence of real summary metric cards
    await expect(page.locator("main").locator("text=Upcoming").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Visits").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Prescriptions").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Lab Reports").first()).toBeVisible();

    // CRITICAL BOUNDARY: Ensure hospital admin / operations are completely ABSENT from patient workspace
    await expect(page.locator("text=Register New Patient")).toHaveCount(0);
    await expect(page.locator("text=Manage Patients")).toHaveCount(0);
    await expect(page.locator("text=Hospital Administration")).toHaveCount(0);
    await expect(page.locator("text=Doctors Management")).toHaveCount(0);
    await expect(page.locator("text=Nurse Management")).toHaveCount(0);
    await expect(page.locator("text=Hospital Settings")).toHaveCount(0);
    await expect(page.locator("text=Switch Facility Scope")).toHaveCount(0);
  });

  test("2. Personal Profile Page: Verified demographics, emergency contact and privacy", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible({ timeout: 10000 });

    await page.goto("/patient/profile");
    await expect(page).toHaveURL(/.*patient\/profile/, { timeout: 10000 });
    await expect(page.locator("h1:has-text('Personal Health Profile')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main").locator("text=Demographics & Contact").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Clinical Profile & Emergency").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Edit Contact Info").first()).toBeVisible();
  });

  test("3. OneHealth ID & QR Pass: Holographic ID and Zero-Knowledge pass", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible({ timeout: 10000 });

    // OneHealth ID Card
    await page.goto("/patient/onehealth-id");
    await expect(page.locator("h1:has-text('My OneHealth ID')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main").locator("text=Universal Healthcare Identity").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Zero-Knowledge Pass").first()).toBeVisible();

    // QR Token Pass
    await page.goto("/patient/qr");
    await expect(page.locator("h1:has-text('Zero-Knowledge Health QR')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main").locator("text=Live Token").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Refresh Pass").first()).toBeVisible();
  });

  test("4. Visits & History: Multi-hospital filtering and visit details modal", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible({ timeout: 10000 });

    await page.goto("/patient/visits");
    await expect(page.locator("h1:has-text('Visits & Medical History')")).toBeVisible({ timeout: 10000 });

    // Multi-hospital filter dropdown is present
    await expect(page.locator('select[aria-label="Filter by Hospital"]')).toBeVisible();

    // Click on a visit card to inspect details modal if visits are loaded
    const detailsButton = page.locator("button:has-text('View Details')").first();
    if (await detailsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await detailsButton.click();
      await expect(page.locator("text=Close Summary").first()).toBeVisible();
      await page.locator("text=Close Summary").first().click();
    }
  });

  test("5. Prescriptions & Lab Reports: Active regimens, test parameters and itemized modals", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible({ timeout: 10000 });

    // Prescriptions
    await page.goto("/patient/prescriptions");
    await expect(page.locator("h1:has-text('My Prescriptions')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main").locator("text=Active").first()).toBeVisible();

    // Labs
    await page.goto("/patient/labs");
    await expect(page.locator("h1:has-text('My Lab Reports')")).toBeVisible({ timeout: 10000 });
  });

  test("6. Complete Timeline & Directory: Unified multi-hospital journey", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible({ timeout: 10000 });

    // Timeline
    await page.goto("/patient/timeline");
    await expect(page.locator("h1:has-text('My Health Timeline')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main").locator("text=All Events").first()).toBeVisible();

    // Doctors Directory
    await page.goto("/patient/doctors");
    await expect(page.locator("h1:has-text('My Doctors')")).toBeVisible({ timeout: 10000 });

    // Hospitals Directory
    await page.goto("/patient/hospitals");
    await expect(page.locator("h1:has-text('My Hospitals & Facilities')")).toBeVisible({ timeout: 10000 });
  });

  test("7. Bills, Insurance, Consent & Settings: Financial ledger and ABDM consent", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible({ timeout: 10000 });

    // Bills
    await page.goto("/patient/bills");
    await expect(page.locator("h1:has-text('Bills & Payments')")).toBeVisible({ timeout: 10000 });

    // Receipts
    await page.goto("/patient/receipts");
    await expect(page.locator("h1:has-text('Digital Payment Receipts')")).toBeVisible({ timeout: 10000 });

    // Insurance
    await page.goto("/patient/insurance");
    await expect(page.locator("h1:has-text('My Health Insurance')")).toBeVisible({ timeout: 10000 });

    // Consent
    await page.goto("/patient/consent");
    await expect(page.locator("h1:has-text('Consent & Data Privacy')")).toBeVisible({ timeout: 10000 });

    // Settings
    await page.goto("/patient/settings");
    await expect(page.locator("h1:has-text('Patient Settings')")).toBeVisible({ timeout: 10000 });
  });

  test("8. Security Gates: Patient cannot access hospital admin or doctor consoles", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible({ timeout: 10000 });

    // Attempt /admin
    await page.goto("/admin");
    await expect(page.locator("text=Workspace Access Restricted").first()).toBeVisible({ timeout: 10000 });

    // Attempt /hospital
    await page.goto("/hospital");
    await expect(page.locator("text=Workspace Access Restricted").first()).toBeVisible({ timeout: 10000 });

    // Attempt /doctor
    await page.goto("/doctor");
    await expect(page.locator("text=Workspace Access Restricted").first()).toBeVisible({ timeout: 10000 });
  });
});
