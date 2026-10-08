import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../engine/discovery.crawler";

test.describe("10. Patient Citizen Full Browser Journey & Health Records", () => {
  test("Patient Login, Appointments, Prescriptions, Lab Reports & Consent", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Login as Citizen Patient
    const token = await loginAsPersona(page, PERSONAS.PATIENT_RAMESH);
    expect(token).toBeTruthy();

    // 2. Patient Dashboard
    await page.goto("/patient");
    await assertPageHealth(page, "/patient");

    // 3. Traversal across all Citizen Health Record Pages
    const patientPages = [
      "/patient",
      "/patient/appointments",
      "/patient/prescriptions",
      "/patient/lab-reports",
      "/patient/medical-documents",
      "/patient/family",
      "/patient/receipts",
      "/patient/consent",
      "/patient/health-timeline",
    ];

    for (const route of patientPages) {
      await page.goto(route);
      await assertPageHealth(page, route);
      await page.waitForTimeout(300);
    }

    // 4. Logout
    await logoutUser(page);
  });
});
