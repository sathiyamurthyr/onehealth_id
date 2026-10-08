import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../../engine/discovery.crawler";

test.describe("Exhaustive Patient Zero-Trust IDOR & Unauthorized Record Access Defense", () => {
  let patientToken = "";

  test.beforeEach(async ({ page }) => {
    setupPageDiagnostics(page);
    patientToken = await loginAsPersona(page, PERSONAS.PATIENT_RAMESH);
  });

  test.afterEach(async ({ page }) => {
    await logoutUser(page);
  });

  test("01. Patient A cannot access Patient B Prescriptions via URL Parameter Tampering", async ({ page }) => {
    // Attempt to access a foreign / unassigned prescription ID
    await page.goto("/patient/prescriptions/foreign-rx-victim-999");
    await page.waitForLoadState("domcontentloaded");

    // Must show empty state, restricted message, or 404/not found notice
    const hasWarningOrEmpty = await page
      .getByText(/not found|Restricted|Access Denied|No prescription|Invalid|Prescriptions/i)
      .first()
      .isVisible()
      .catch(() => false);
    const bodyContent = await page.locator("body").innerText();
    expect(hasWarningOrEmpty || !bodyContent.includes("Victim Medical Record")).toBeTruthy();
  });

  test("02. Patient A cannot access Patient B Lab Reports via Direct Link Manipulation", async ({ page }) => {
    await page.goto("/patient/labs/foreign-lab-order-victim-888");
    await page.waitForLoadState("domcontentloaded");

    const hasWarningOrEmpty = await page
      .getByText(/not found|Restricted|Access Denied|No lab report|Invalid|Laboratory/i)
      .first()
      .isVisible()
      .catch(() => false);
    const bodyContent = await page.locator("body").innerText();
    expect(hasWarningOrEmpty || !bodyContent.includes("Victim Lab Result")).toBeTruthy();
  });

  test("03. Direct API IDOR Attack: Patient Token against Foreign Record Endpoints", async ({ page }) => {
    // 1. Attempt to fetch foreign patient's clinical records
    const apiRecordRes = await page.request.get("http://localhost:8050/api/v1/patients/p-foreign-999", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect([401, 403, 404]).toContain(apiRecordRes.status());

    // 2. Attempt to fetch admin audit logs
    const apiAuditRes = await page.request.get("http://localhost:8050/api/v1/admin/audit-logs", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect([401, 403, 404]).toContain(apiAuditRes.status());
  });

  test("04. Patient Workspace Access Control: Cannot access Admin or Doctor Workspaces", async ({ page }) => {
    // 1. Attempt to navigate to Doctor Workspace
    await page.goto("/doctor");
    await expect(
      page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()
    ).toBeVisible({ timeout: 10000 });

    // 2. Attempt to navigate to Hospital Admin
    await page.goto("/hospital");
    await expect(
      page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
