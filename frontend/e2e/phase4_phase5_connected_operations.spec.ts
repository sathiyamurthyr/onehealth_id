import { test, expect } from "@playwright/test";

test.describe("OH-ID Phase 4 & Phase 5: Interoperability, Enterprise Operations, Billing & Insurance E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*(admin|dashboard|hospital)/);
  });

  // =========================================================================
  // PHASE 4: CONNECTED NETWORK & INTEROPERABILITY
  // =========================================================================

  test("should render Integrations & Interoperability Hub with health metrics and connector registry", async ({ page }) => {
    await page.goto("/hospital/integrations");
    await expect(page.getByText("Integrations & Interoperability Hub")).toBeVisible();
    await expect(page.getByText("HL7 FHIR R4 & ABDM Network")).toBeVisible();

    // Verify connectors list
    await expect(page.getByText("Configured Integrations")).toBeVisible();
    await expect(page.getByText("Integration Events & Webhooks")).toBeVisible();
  });

  // =========================================================================
  // PHASE 5: ENTERPRISE BILLING & CHARGES QUEUE
  // =========================================================================

  test("should render Hospital Billing & Invoices operations console with financial KPI summary", async ({ page }) => {
    await page.goto("/hospital/billing");
    await expect(page.getByText("Hospital Patient Billing & Financial Management")).toBeVisible();
    await expect(page.getByText("Phase 5 Enterprise Operational Billing")).toBeVisible();

    // KPI Cards
    await expect(page.getByText("Gross Billed").first()).toBeVisible();
    await expect(page.getByText("Total Collected").first()).toBeVisible();
    await expect(page.getByText("Total Outstanding").first()).toBeVisible();

    // Tabs
    await expect(page.getByRole("button", { name: /Invoices/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Charges Queue/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Payment Transactions/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Refunds/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Adjustments/i })).toBeVisible();

    // Switch to Charges Queue
    await page.getByRole("button", { name: /Charges Queue/i }).click();
    await expect(page.getByText("Select posted clinical charges to consolidate")).toBeVisible();
  });

  test("should render Hospital Service Tariff Catalogue, Tiered Price Schedules & Packages", async ({ page }) => {
    await page.goto("/hospital/billing/services");
    await expect(page.getByText("Services, Price Lists & Packages")).toBeVisible();
    await expect(page.getByText("Hospital Tariff & Master Catalogue")).toBeVisible();

    // Tabs
    await expect(page.getByRole("button", { name: /Service Catalogue/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Price Lists/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Medical Packages/i })).toBeVisible();

    // Switch to Price Lists
    await page.getByRole("button", { name: /Price Lists/i }).click();
    await expect(page.getByText("Configured price schedules")).toBeVisible();

    // Switch to Packages
    await page.getByRole("button", { name: /Medical Packages/i }).click();
    await expect(page.getByText("Bundled healthcare packages")).toBeVisible();
  });

  test("should render Insurance, Preauthorizations & Claims Adjudication Hub", async ({ page }) => {
    await page.goto("/hospital/insurance");
    await expect(page.getByText("Insurance, Preauthorizations & Claims")).toBeVisible();
    await expect(page.getByText("Phase 5 Insurance & Payer Framework")).toBeVisible();

    // Tabs
    await expect(page.getByRole("button", { name: /Insurance Claims/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Preauthorizations/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Patient Policies/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Payers & TPAs/i })).toBeVisible();
  });

  test("should render Hospital Executive Operations & Revenue Intelligence Dashboard", async ({ page }) => {
    await page.goto("/hospital/executive-dashboard");
    await expect(page.getByText("Executive Operations & Revenue Intelligence")).toBeVisible();
    await expect(page.getByText("Hospital Operational Intelligence & Analytics")).toBeVisible();

    // Metric Badges
    await expect(page.getByText("Total Collections").first()).toBeVisible();
    await expect(page.getByText("IPD Bed Occupancy").first()).toBeVisible();
    await expect(page.getByText("Patient Care Volume").first()).toBeVisible();
    await expect(page.getByText("Avg OPD Waiting Time").first()).toBeVisible();

    // Department Performance Matrix
    await expect(page.getByText("Department Performance & Workload Matrix")).toBeVisible();
  });
});
