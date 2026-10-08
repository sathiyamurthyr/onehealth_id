import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../engine/discovery.crawler";

test.describe("05. Frontdesk Reception & Queue Management Journey", () => {
  test("Receptionist Login, Patient Check-in & OPD Queue Movement", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Login as Front Desk Receptionist
    const token = await loginAsPersona(page, PERSONAS.RECEPTIONIST);
    expect(token).toBeTruthy();

    // 2. Reception & OPD Queue
    await page.goto("/reception");
    await assertPageHealth(page, "/reception");

    const receptionRoutes = ["/reception", "/queue"];
    for (const route of receptionRoutes) {
      await page.goto(route);
      await assertPageHealth(page, route);
      await page.waitForTimeout(300);
    }

    // 3. Logout
    await logoutUser(page);
  });
});
