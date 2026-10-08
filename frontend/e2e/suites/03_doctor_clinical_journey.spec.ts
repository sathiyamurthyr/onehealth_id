import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../engine/discovery.crawler";

test.describe("03. Doctor Clinical Journey & Consultation Workspace", () => {
  test("Doctor Login, Today's Queue, Consultations & Prescriptions Flow", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Login as Senior Doctor
    const token = await loginAsPersona(page, PERSONAS.DOCTOR_SENTHIL);
    expect(token).toBeTruthy();

    // 2. Doctor Dashboard & Queue
    await page.goto("/doctor");
    await assertPageHealth(page, "/doctor");

    // 3. Navigate through Doctor Clinical Routes
    const doctorRoutes = [
      "/doctor",
      "/doctor/appointments",
      "/doctor/patients",
      "/doctor/prescriptions",
      "/queue",
    ];

    for (const route of doctorRoutes) {
      await page.goto(route);
      await assertPageHealth(page, route);
      await page.waitForTimeout(300);
    }

    // 4. Logout
    await logoutUser(page);
  });
});
