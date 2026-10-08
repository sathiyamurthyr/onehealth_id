import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../engine/discovery.crawler";

test.describe("02. Hospital Admin Full Browser Journey & Workforce Lifecycle", () => {
  test("Hospital Admin Login, Operations Console & Modules", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Real Login as Hospital Admin
    const token = await loginAsPersona(page, PERSONAS.HOSPITAL_ADMIN);
    expect(token).toBeTruthy();

    // 2. Verify Hospital Dashboard
    await page.goto("/hospital");
    await assertPageHealth(page, "/hospital");
    await expect(page.locator("text=Hospital Administration").first()).toBeVisible({ timeout: 10000 });

    // 3. Test Navigation across Hospital Management Suite
    const hospitalRoutes = [
      "/hospital",
      "/hospital/reports",
      "/hospital/billing",
      "/hospital/integrations",
    ];

    for (const route of hospitalRoutes) {
      await page.goto(route);
      await assertPageHealth(page, route);
      await page.waitForTimeout(300);
    }

    // 4. Clean Logout
    await logoutUser(page);
  });
});
