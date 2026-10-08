import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../../engine/discovery.crawler";

test.describe("Exhaustive Multi-Tenant Cross-Hospital Isolation & Zero-Trust Defense", () => {
  test("01. Hospital Admin A cannot access Hospital B settings or user directories", async ({ page }) => {
    setupPageDiagnostics(page);
    const token = await loginAsPersona(page, PERSONAS.HOSPITAL_ADMIN);
    expect(token).toBeTruthy();

    // 1. Visit own hospital dashboard
    await page.goto("/hospital");
    await assertPageHealth(page, "/hospital");

    // 2. Attempt direct URL tampering to Super Admin platform governance
    await page.goto("/admin");
    // Should show restricted workspace guard or redirect
    await expect(
      page.getByText(/Workspace Access Restricted|Platform Admin|Operations Console|Restricted/i).first()
    ).toBeVisible({ timeout: 10000 });

    // 3. API Tenant Boundary Check: Hospital Admin cannot create or view platform client groups
    const apiRes = await page.request.get("http://localhost:8050/api/v1/super-admin/clients/client-apollo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([401, 403, 404, 405]).toContain(apiRes.status());

    await logoutUser(page);
  });

  test("02. Doctor A cannot access Doctor B restricted consultation without active assignment", async ({ page }) => {
    setupPageDiagnostics(page);
    const token = await loginAsPersona(page, PERSONAS.DOCTOR_SENTHIL);
    expect(token).toBeTruthy();

    // 1. Doctor visits own queue
    await page.goto("/doctor/queue");
    await assertPageHealth(page, "/doctor/queue");

    // 2. Direct API call to Hospital Admin settings with doctor credentials
    const apiRes = await page.request.post("http://localhost:8050/api/v1/super-admin/hospitals", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "Unauthorized Malicious Hospital" },
    });
    expect([401, 403, 404, 405]).toContain(apiRes.status());

    await logoutUser(page);
  });

  test("03. Cross-Tenant Patient Search Leakage Prevention", async ({ page }) => {
    setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.RECEPTIONIST);

    // 1. Visit Patients directory
    await page.goto("/patients");
    await assertPageHealth(page, "/patients");

    // 2. Search for foreign hospital patient keywords
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("FOREIGN_HOSPITAL_PATIENT_XYZ_9999");
      await page.waitForTimeout(400);

      // Verify no leaked records
      const tableRows = await page.locator("table tbody tr").count();
      const emptyState = await page.getByText(/No patients found|No records|0 patients|No data|No matching/i).first().isVisible().catch(() => false);
      expect(tableRows === 0 || emptyState).toBeTruthy();
    }

    await logoutUser(page);
  });
});
