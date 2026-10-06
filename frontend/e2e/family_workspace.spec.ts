import { test, expect } from "@playwright/test";

test.describe("OH-ID Family Healthcare Architecture & Multi-Person Workspace E2E", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate as Patient (Alice Smith)
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();

    // Verify patient workspace lands on /patient
    await page.waitForURL("**/patient", { timeout: 10000 });
    await expect(page.getByText(/Good Day, Alice Smith|Viewing Health Record/i)).toBeVisible();
  });

  test("1. Patient Overview displays Primary Identity and Family Switcher", async ({ page }) => {
    // Verify Primary Patient OH-ID
    await expect(page.locator("main").getByText("OHID-IND-2026-01001").first()).toBeVisible();
    await expect(page.locator("main").getByText("Alice Smith").first()).toBeVisible();

    // Verify Family Switcher is present
    const familySwitcher = page.locator("#family-switcher-btn").filter({ visible: true });
    await expect(familySwitcher).toBeVisible();
    await expect(familySwitcher).toContainText("Self");

    // Open Family Switcher dropdown
    await familySwitcher.click();
    const dropdown = page.locator("#family-switcher-dropdown").filter({ visible: true });
    await expect(dropdown).toBeVisible();

    // Verify family members appear with unique OH-IDs
    await expect(dropdown.locator("#family-member-option-self")).toContainText("Alice Smith");
    await expect(dropdown.locator("#family-member-option-p-102")).toBeVisible();
    await expect(dropdown.locator("text=OHID-IND-2026-01002").first()).toBeVisible();
    await expect(dropdown.locator("#family-member-option-p-103")).toBeVisible();
    await expect(dropdown.locator("text=OHID-IND-2026-01003").first()).toBeVisible();
    await expect(dropdown.locator("#family-member-option-p-104")).toBeVisible();
    await expect(dropdown.locator("text=OHID-IND-2026-01004").first()).toBeVisible();
  });

  test("2. Family Member Switching & Clinical Data Isolation (Charlie - Minor Child)", async ({ page }) => {
    // Open Family Switcher and select Charlie Smith (Son, Minor)
    await page.locator("#family-switcher-btn").filter({ visible: true }).click();
    await page.locator("#family-member-option-p-103").filter({ visible: true }).click();

    // Verify FamilyContextBanner appears prominently
    const banner = page.locator("#family-context-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Charlie Smith");
    await expect(banner).toContainText(/SON|Son/i);
    await expect(banner).toContainText("OHID-IND-2026-01003");
    await expect(banner).toContainText("Authorized Guardian Access");

    // Navigate to Prescriptions for Charlie
    await page.goto("/patient/prescriptions");
    await expect(page.getByRole("heading", { name: /Charlie Smith's Prescriptions/i })).toBeVisible();
    await expect(page.locator("main").getByText("OHID-IND-2026-01003").first()).toBeVisible();

    // Verify Charlie's Pediatric prescription is displayed
    await expect(page.locator("text=Dr. Ananya Swaminathan").first()).toBeVisible();
    await expect(page.locator("text=Children's Specialty Clinic").first()).toBeVisible();

    // STRICT CLINICAL DATA ISOLATION: Bob's hypertension prescription must NOT appear in Charlie's view
    await expect(page.locator("text=Dr. S. Ramanathan")).not.toBeVisible();

    // Navigate to Lab Reports for Charlie
    await page.goto("/patient/labs");
    await expect(page.getByRole("heading", { name: /Charlie Smith's Lab Reports/i })).toBeVisible();
    await expect(page.locator("text=Pediatric Serum IgE").first()).toBeVisible();

    // STRICT CLINICAL DATA ISOLATION: Dorothy's DEXA Scan must NOT appear in Charlie's view
    await expect(page.locator("text=DEXA Bone Mineral Density")).not.toBeVisible();

    // Click "Switch to My Health"
    await page.locator("#switch-to-self-btn").click();
    await expect(page.locator("#family-context-banner")).not.toBeVisible();
    await expect(page.locator("#family-switcher-btn").filter({ visible: true })).toContainText("Self");
  });

  test("3. Family Management Page shows multi-hospital coverage and upcoming schedule", async ({ page }) => {
    await page.goto("/patient/family");

    // Header & Stats
    await expect(page.getByText("Family Healthcare Management").first()).toBeVisible();
    await expect(page.getByText("OH-ID Family Healthcare Architecture • 1 Person = 1 OH-ID").first()).toBeVisible();
    await expect(page.getByText("Linked Family Members").first()).toBeVisible();

    // Upcoming Family Schedule card across hospitals
    await expect(page.getByText("Upcoming Family Schedule").first()).toBeVisible();
    await expect(page.getByText("Multi-Hospital View").first()).toBeVisible();

    // Wait for family member cards to load
    await page.waitForSelector("#family-card-p-102", { timeout: 10000 });

    // Alice (Self)
    await expect(page.locator("main").getByText("Alice Smith").first()).toBeVisible();
    await expect(page.locator("main").getByText("OHID-IND-2026-01001").first()).toBeVisible();

    // Bob Smith (Spouse)
    const bobCard = page.locator("#family-card-p-102");
    await expect(bobCard).toBeVisible();
    await expect(bobCard).toContainText("Bob Smith");
    await expect(bobCard).toContainText("SPOUSE");
    await expect(bobCard).toContainText("OHID-IND-2026-01002");

    // Charlie Smith (Son - Minor)
    const charlieCard = page.locator("#family-card-p-103");
    await expect(charlieCard).toBeVisible();
    await expect(charlieCard).toContainText("Charlie Smith");
    await expect(charlieCard).toContainText("SON");
    await expect(charlieCard).toContainText("Minor");
    await expect(charlieCard).toContainText("Guardian");

    // Dorothy Smith (Mother)
    const dorothyCard = page.locator("#family-card-p-104");
    await expect(dorothyCard).toBeVisible();
    await expect(dorothyCard).toContainText("Dorothy Smith");
    await expect(dorothyCard).toContainText("MOTHER");
  });

  test("4. Duplicate Patient Prevention Lookup in Add Member Wizard", async ({ page }) => {
    await page.goto("/patient/family");

    // Open Add Family Member modal
    await page.locator("#btn-open-add-member").filter({ visible: true }).click();
    await expect(page.getByText("Step 1 of 3").first()).toBeVisible();
    await expect(page.getByText("Duplicate Check & Identity Lookup").first()).toBeVisible();

    // Search for existing OH-ID
    await page.locator("#input-duplicate-search").fill("OHID-IND-2026-01002");
    await page.locator("#btn-search-duplicate").click();

    // Verify existing record is found
    await expect(page.getByText("Existing Citizen Record Found (Avoids Duplicate OH-ID):").first()).toBeVisible();
    await expect(page.getByText("Bob Smith").first()).toBeVisible();
    await expect(page.locator("text=OHID-IND-2026-01002").first()).toBeVisible();

    // Cancel modal
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("5. Access Audit Trail Log inspection", async ({ page }) => {
    await page.goto("/patient/family");

    // Open Audit Trail
    await page.locator("#btn-open-audit-trail").filter({ visible: true }).click();
    await expect(page.getByText("Family Access Audit Trail").first()).toBeVisible();
    await expect(page.getByText("Security & Consent Log").first()).toBeVisible();

    // Close Audit Trail
    await page.getByRole("button", { name: "Close Audit Trail" }).click();
    await expect(page.getByText("Family Access Audit Trail")).not.toBeVisible();
  });
});
