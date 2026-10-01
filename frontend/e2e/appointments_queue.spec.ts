import { test, expect } from "@playwright/test";

test.describe("OneHealth ID - Appointments & Live OPD Queue E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test("should view appointment roster and open booking modal", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.getByText("Appointments & Scheduling")).toBeVisible();
    await expect(page.getByText("OPD Scheduler")).toBeVisible();

    // Click book new appointment
    await page.getByRole("button", { name: "Book New Appointment" }).click();

    // Modal should be visible
    await expect(page.getByText("Book Outpatient Consultation")).toBeVisible();
    await expect(page.getByText("Select Patient")).toBeVisible();
    await expect(page.getByText("Select Attending Specialist")).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  });

  test("should orchestrate live OPD Queue with real-time status and action triggers", async ({ page }) => {
    await page.goto("/queue");
    await expect(page.getByText("Live OPD Queue Orchestrator")).toBeVisible();
    await expect(page.getByText("Real-Time Synced")).toBeVisible();

    // Check if live queue orchestrator is rendered
    const isQueueReady = await page.getByText("Live OPD Queue Orchestrator").isVisible();
    expect(isQueueReady).toBeTruthy();
  });
});
