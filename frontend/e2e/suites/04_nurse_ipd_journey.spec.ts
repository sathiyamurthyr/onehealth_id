import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../engine/discovery.crawler";

test.describe("04. Nurse & IPD Inpatient Browser Journey", () => {
  test("Nurse Login, Triage Intake, Wards & Inpatient Station", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Login as Staff Nurse
    const token = await loginAsPersona(page, PERSONAS.NURSE_PRIYA);
    expect(token).toBeTruthy();

    // 2. Nurse Dashboard
    await page.goto("/nurse");
    await assertPageHealth(page, "/nurse");

    // 3. Nurse Inpatient & Triage Pages
    const nurseRoutes = ["/nurse", "/ipd", "/queue"];
    for (const route of nurseRoutes) {
      await page.goto(route);
      await assertPageHealth(page, route);
      await page.waitForTimeout(300);
    }

    // 4. Logout
    await logoutUser(page);
  });
});
