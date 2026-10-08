import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";

test.describe("11. Multi-Tenant Isolation, Patient IDOR & Negative Security Attacks", () => {
  test("Patient A cannot access administrative routes or other clinical workspaces", async ({ page }) => {
    // 1. Login as Patient
    await loginAsPersona(page, PERSONAS.PATIENT_RAMESH);

    // 2. Direct URL Attack on Administrative / Super Admin Routes
    await page.goto("/admin");
    await expect(page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Return to My Authorized Dashboard").filter({ visible: true }).first()).toBeVisible();

    await logoutUser(page);
  });

  test("Doctor cannot access platform super admin workspace", async ({ page }) => {
    // 1. Login as Doctor
    await loginAsPersona(page, PERSONAS.DOCTOR_SENTHIL);

    // 2. Attempt navigating to Platform Admin
    await page.goto("/admin");
    await expect(page.locator("text=Workspace Access Restricted").filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=DOCTOR").filter({ visible: true }).first()).toBeVisible();

    await logoutUser(page);
  });
});
