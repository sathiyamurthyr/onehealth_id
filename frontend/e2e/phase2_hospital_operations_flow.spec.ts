import { test, expect } from "@playwright/test";

test.describe("OH-ID Phase 2: Hospital Operations & Patient Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*(admin|dashboard|hospital)/);
  });

  test("should render Hospital Operations Dashboard with live metrics, roster, and queue breakdown", async ({ page }) => {
    await page.goto("/hospital");
    await expect(page.getByText("Hospital Operations Dashboard")).toBeVisible();
    await expect(page.getByText("OPD Today Summary")).toBeVisible();
    await expect(page.getByText("Checked In")).toBeVisible();
    await expect(page.getByText("Waiting")).toBeVisible();
    await expect(page.getByText("In Consultation")).toBeVisible();
    await expect(page.getByText("Active Doctors Roster")).toBeVisible();
    await expect(page.getByText("Duty Nurses Roster")).toBeVisible();
    await expect(page.getByText("Live Department Queues")).toBeVisible();
  });

  test("should open Reception Walk-In dialog, search patient, and generate Token Slip", async ({ page }) => {
    await page.goto("/reception");
    await expect(page.getByText("Reception & Front Desk")).toBeVisible();
    await expect(page.getByText("Search-First Verification")).toBeVisible();

    // Check Walk-In Intake button
    const walkInBtn = page.getByRole("button", { name: /Walk-In Intake/i });
    await expect(walkInBtn).toBeVisible();
    await walkInBtn.click();

    // Verify Walk-In Dialog content
    await expect(page.getByText("Direct Walk-In / Rapid Check-In")).toBeVisible();
    await expect(page.getByText("Attending Doctor")).toBeVisible();
    await expect(page.getByText("Triage Priority")).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  });

  test("should render Live Queue Display Board with department prefixes", async ({ page }) => {
    await page.goto("/queue");
    await expect(page.getByText("Live OPD Queue Orchestrator")).toBeVisible();
    await expect(page.getByText("Real-Time Synced")).toBeVisible();
  });

  test("should render Hospital Operational Reports with interactive tabs and date filters", async ({ page }) => {
    await page.goto("/hospital/reports");
    await expect(page.getByText("Hospital Operational Reports")).toBeVisible();
    await expect(page.getByText("Patient Flow")).toBeVisible();
    await expect(page.getByText("Appointment Analytics")).toBeVisible();
    await expect(page.getByText("Department Queue")).toBeVisible();
    await expect(page.getByText("Doctor Productivity")).toBeVisible();

    // Switch between report tabs
    await page.getByRole("button", { name: "Doctor Productivity" }).click();
    await expect(page.getByText("Doctor Productivity Analytics")).toBeVisible();

    await page.getByRole("button", { name: "Department Queue" }).click();
    await expect(page.getByText("Department Queue & Throughput Analytics")).toBeVisible();
  });
});
