import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../engine/discovery.crawler";

test.describe("12. ABDM, FHIR & Connected Healthcare Network E2E Journey", () => {
  test("Connected Network, Consent Manager & Interoperability Gateway", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Login as Platform Super Admin
    const token = await loginAsPersona(page, PERSONAS.SUPER_ADMIN);
    expect(token).toBeTruthy();

    // 2. Global Network Routes
    const networkRoutes = [
      "/network",
      "/global",
    ];

    for (const route of networkRoutes) {
      await page.goto(route);
      await assertPageHealth(page, route);
      await page.waitForTimeout(300);
    }

    // 3. Logout
    await logoutUser(page);
  });
});
