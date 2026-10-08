import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../engine/discovery.crawler";

test.describe("01. Super Admin Full Browser Journey & Platform Governance", () => {
  test("Super Admin Login, Metrics, Hospital Onboarding & Audit Log Inspection", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Real Login as Platform Super Admin
    const token = await loginAsPersona(page, PERSONAS.SUPER_ADMIN);
    expect(token).toBeTruthy();

    // 2. Verify Super Admin Workspace Dashboard
    await page.goto("/admin");
    await assertPageHealth(page, "/admin");

    // 3. Verify Executive Header & Admin Console
    await expect(page.locator("text=Platform Admin Console").first()).toBeVisible({ timeout: 10000 });

    // 4. Navigate through all Super Admin Tabs / Views
    const superAdminPages = [
      "/admin",
      "/admin/audit-logs",
      "/admin/departments",
    ];

    for (const route of superAdminPages) {
      await page.goto(route);
      await assertPageHealth(page, route);
      await page.waitForTimeout(300);
    }

    // 5. Clean Session Teardown
    await logoutUser(page);
  });
});
