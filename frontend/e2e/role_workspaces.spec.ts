import { test, expect } from "@playwright/test";

test.describe("OH-ID Enterprise Role Workspaces & Security Gates", () => {
  // Clear localStorage before each test
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test("1. Super Admin: Logs in, resolves /admin workspace, renders platform console and blocks /doctor", async ({ page }) => {
    await page.goto("/login");

    // Login as Super Admin
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();

    // Authoritative redirect to /admin
    await expect(page).toHaveURL(/.*admin/, { timeout: 10000 });
    await expect(page.locator("text=Super Admin Console").filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Platform-wide administration").filter({ visible: true }).first()).toBeVisible();

    // Verify clinical restriction: direct navigation to /doctor should be restricted
    await page.goto("/doctor");
    await expect(page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Return to My Authorized Dashboard").filter({ visible: true }).first()).toBeVisible();
  });

  test("2. Hospital Admin: Logs in, resolves /hospital workspace with operational controls", async ({ page }) => {
    await page.goto("/login");

    // Login as Hospital Admin
    await page.locator('input[type="text"]').fill("hospadmin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();

    // Authoritative redirect to /hospital
    await expect(page).toHaveURL(/.*hospital/, { timeout: 10000 });
    await expect(page.locator("text=Operations Console").filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Hospital Modules & Workflows").filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator("text=Patient Directory & OH-ID").filter({ visible: true }).first()).toBeVisible();
  });

  test("3. Doctor Workspace: Logs in, resolves /doctor workspace, displays clinical queue and blocks /admin", async ({ page }) => {
    await page.goto("/login");

    // Login as Doctor
    await page.locator('input[type="text"]').fill("dr.senthil");
    await page.locator('input[type="password"]').fill("doctor123");
    await page.locator('button[type="submit"]').click();

    // Authoritative redirect to /doctor
    await expect(page).toHaveURL(/.*doctor/, { timeout: 10000 });
    await expect(page.locator("text=Clinical Console").filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Consulting Clinician / Doctor").filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator("text=Outpatient Consultation Desk").filter({ visible: true }).first()).toBeVisible();

    // Verify platform admin restriction: direct navigation to /admin should be restricted
    await page.goto("/admin");
    await expect(page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=DOCTOR").filter({ visible: true }).first()).toBeVisible();
  });

  test("4. Nurse Workspace: Logs in, resolves /nurse, displays vitals intake station and blocks /admin", async ({ page }) => {
    await page.goto("/login");

    // Login as Staff Nurse
    await page.locator('input[type="text"]').fill("nurse");
    await page.locator('input[type="password"]').fill("nurse123");
    await page.locator('button[type="submit"]').click();

    // Authoritative redirect to /nurse
    await expect(page).toHaveURL(/.*nurse/, { timeout: 10000 });
    await expect(page.locator("text=Nursing Station & Triage").filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Nurse / Triage Officer").filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator("text=Clinical Triage & Vitals Intake").filter({ visible: true }).first()).toBeVisible();

    // Direct access to /admin blocked
    await page.goto("/admin");
    await expect(page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
  });

  test("5. Frontdesk / Employee: Logs in, resolves /employee, displays citizen lookup and token check-in", async ({ page }) => {
    await page.goto("/login");

    // Login as Frontdesk Receptionist
    await page.locator('input[type="text"]').fill("receptionist");
    await page.locator('input[type="password"]').fill("rec123");
    await page.locator('button[type="submit"]').click();

    // Authoritative redirect to /employee
    await expect(page).toHaveURL(/.*employee/, { timeout: 10000 });
    await expect(page.locator("text=Frontdesk Operations").filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Enroll New Citizen").filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator("text=Rapid Patient Lookup & OPD Check-In").filter({ visible: true }).first()).toBeVisible();

    // Direct access to /doctor blocked
    await page.goto("/doctor");
    await expect(page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
  });

  test("6. Citizen / Patient: Logs in, resolves /patient, displays digital pass and blocks hospital admin", async ({ page }) => {
    await page.goto("/login");

    // Login as Citizen
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();

    // Authoritative redirect to /patient
    await expect(page).toHaveURL(/.*patient/, { timeout: 10000 });
    await expect(page.locator("text=Verified Citizen Healthcare Identity").filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=My Health Dashboard").filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator("text=Zero-Knowledge Pass").filter({ visible: true }).first()).toBeVisible();

    // Direct access to /hospital or /admin blocked
    await page.goto("/hospital");
    await expect(page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
  });

  test("7. Multi-Hospital Context Switching: Doctor can switch between permitted hospital facilities", async ({ page }, testInfo) => {
    // Only run on desktop viewport where the sidebar switcher is visible
    if (testInfo.project.name !== "Desktop-1440x900") return;

    await page.goto("/login");
    await page.locator('input[type="text"]').fill("dr.senthil");
    await page.locator('input[type="password"]').fill("doctor123");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/.*doctor/, { timeout: 10000 });

    // Open facility switcher dropdown
    const switcherButton = page.locator("button:has-text('Kedar Hospital')").first();
    await expect(switcherButton).toBeVisible();
    await switcherButton.click();

    // Verify Apollo City Hospital option is present in available hospitals
    const apolloOption = page.locator("button:has-text('Apollo City Hospital')").first();
    await expect(apolloOption).toBeVisible();

    // Click to switch hospital context
    await apolloOption.click();

    // Verify switcher now displays Apollo City Hospital
    await expect(page.locator("button:has-text('Apollo City Hospital')").first()).toBeVisible({ timeout: 8000 });
  });
});
