import { test, expect } from "@playwright/test";

test.describe("OneHealth ID - Clinical Operations & GST Billing E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test("should load billing registry with GST metrics and invoice ledger", async ({ page }) => {
    await page.goto("/billing");
    await expect(page.getByText("Billing & Revenue Operations")).toBeVisible();
    await expect(page.getByText("GST Compliant")).toBeVisible();

    // Verify financial KPI cards
    await expect(page.getByText("Total Billed Tariff")).toBeVisible();
    await expect(page.getByText("Collected Revenue")).toBeVisible();
    await expect(page.getByText("Outstanding Balance")).toBeVisible();

    // Verify search input
    const searchInput = page.getByPlaceholder(/Search by invoice number/);
    await expect(searchInput).toBeVisible();
  });

  test("should navigate and verify Clinical Departments (OPD, IPD, Pharmacy, Lab, Admin)", async ({ page }) => {
    // 1. OPD Consultations
    await page.goto("/opd");
    await expect(page.getByText("Outpatient Department (OPD)").first()).toBeVisible();

    // 2. IPD Admissions
    await page.goto("/ipd");
    await expect(page.getByText("Inpatient Department (IPD)").first()).toBeVisible();

    // 3. Pharmacy Dispensation
    await page.goto("/pharmacy");
    await expect(page.getByText("Pharmacy & Dispensary").first()).toBeVisible();

    // 4. Diagnostic Laboratory
    await page.goto("/laboratory");
    await expect(page.getByText("Diagnostic Laboratory (LIS)").first()).toBeVisible();

    // 5. Admin & Tenant Control
    await page.goto("/admin");
    await expect(page.getByText("Hospital Administration & Governance").first()).toBeVisible();
    await expect(page.getByText("HIPAA & ABDM Audited").first()).toBeVisible();
  });
});
