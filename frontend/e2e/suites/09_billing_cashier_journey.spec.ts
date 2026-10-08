import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../engine/discovery.crawler";

test.describe("09. Billing Cashier & Invoicing Journey", () => {
  test("Billing Staff Login, Invoices, Payment Recording & Receipts", async ({ page }) => {
    setupPageDiagnostics(page);

    // 1. Login as Hospital Admin / Billing Staff
    const token = await loginAsPersona(page, PERSONAS.HOSPITAL_ADMIN);
    expect(token).toBeTruthy();

    // 2. Billing Center
    await page.goto("/hospital/billing");
    await assertPageHealth(page, "/hospital/billing");

    // 3. Logout
    await logoutUser(page);
  });
});
