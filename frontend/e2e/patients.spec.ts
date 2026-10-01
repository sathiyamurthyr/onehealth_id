import { test, expect } from "@playwright/test";

test.describe("OneHealth ID - Patient Registry & QR Generation E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test("should list patients from database view vw_patient_registry", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.getByText("Patient Management")).toBeVisible();
    await expect(page.getByText("OneHealth Registry")).toBeVisible();

    // Verify search input is present and functional
    const searchInput = page.getByPlaceholder("Search by name, OneHealth ID, diagnosis, or phone number...");
    await expect(searchInput).toBeVisible();
  });

  test("should register a new patient, generate OneHealth ID & Zero-Knowledge QR Card", async ({ page }) => {
    await page.goto("/patients/register");
    await expect(page.getByText("New Patient Registration")).toBeVisible();

    const timestamp = Date.now().toString().slice(-4);
    const testName = `Priya Ramanathan ${timestamp}`;

    // Fill form
    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[name="age"]').fill("28");
    await page.locator('select[name="gender"]').selectOption("Female");
    await page.locator('input[name="phone"]').fill(`98401${timestamp}0`);
    await page.locator('select[name="blood_group"]').selectOption("O+");
    await page.locator('input[name="diagnosis"]').fill("Preventive Health Screening");
    await page.locator('input[name="address"]').fill("Besant Nagar, Chennai, Tamil Nadu");

    // Submit form (triggers sp_register_patient)
    await page.getByRole("button", { name: "Complete Registration" }).click();

    // Verify success screen
    await expect(page.getByText("Patient Successfully Registered!")).toBeVisible();
    await expect(page.getByText("OneHealth ID generated and enrolled")).toBeVisible();

    // Verify OneHealth ID badge is rendered
    await expect(page.locator("text=OHID-IND-2026-").first()).toBeVisible();

    // Verify Zero-Knowledge QR component is rendered
    await expect(page.getByText("OneHealth Network Identity")).toBeVisible();
    await expect(page.getByText("Verified Citizen")).toBeVisible();
  });
});
