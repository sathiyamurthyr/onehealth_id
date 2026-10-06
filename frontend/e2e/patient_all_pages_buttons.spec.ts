import { test, expect } from "@playwright/test";

test.describe("OH-ID Patient Complete Workspace: All Pages, Navigation & Button Events", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log("[BROWSER PAGE ERROR]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[BROWSER CONSOLE ERROR]", msg.text());
    });
    // Start with a clean slate
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Log in as patient Alice Smith
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/, { timeout: 15000 });
  });

  test("1. Patient Dashboard (/patient): Metrics, Quick Links & Family Switcher", async ({ page }) => {
    await expect(page.locator("main").locator("text=Verified Citizen Healthcare Identity").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Upcoming").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Prescriptions").first()).toBeVisible();
    await expect(page.locator("main").locator("text=Lab Reports").first()).toBeVisible();

    // Family Switcher dropdown interaction
    const switcher = page.locator("#family-switcher-btn").filter({ visible: true });
    await expect(switcher).toBeVisible();
    await switcher.click();
    await expect(page.locator("#family-switcher-dropdown")).toBeVisible();
    await expect(page.locator("#family-member-option-self")).toBeVisible();

    // Close switcher by selecting self
    await page.locator("#family-member-option-self").click();
    await expect(page.locator("#family-switcher-dropdown")).not.toBeVisible();
  });

  test("2. Personal Health Profile (/patient/profile): Demographics & Edit Form Events", async ({ page }) => {
    await page.goto("/patient/profile");
    await expect(page.locator("h1:has-text('Personal Health Profile')")).toBeVisible();
    await expect(page.locator("text=Demographics & Contact").first()).toBeVisible();
    await expect(page.locator("text=Clinical Profile & Emergency").first()).toBeVisible();

    // Click "Edit Contact Info" button
    const editBtn = page.locator("button:has-text('Edit Contact Info')");
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Edit form inputs
    const cityInput = page.locator("input[value='Chennai'], input").filter({ hasText: "" }).nth(3);
    await expect(page.locator("button:has-text('Save Changes')")).toBeVisible();

    // Cancel edit
    await page.locator("button:has-text('Cancel')").click();
    await expect(page.locator("button:has-text('Edit Contact Info')")).toBeVisible();
  });

  test("3. OneHealth ID Hologram Pass (/patient/onehealth-id): Card & Action Buttons", async ({ page }) => {
    await page.goto("/patient/onehealth-id");
    await expect(page.locator("h1:has-text('My OneHealth ID')")).toBeVisible();
    await expect(page.locator("text=Universal Healthcare Identity").first()).toBeVisible();
    await expect(page.locator("text=Zero-Knowledge Pass").first()).toBeVisible();

    // Action buttons
    await expect(page.locator("a:has-text('Enlarge QR')")).toBeVisible();
    await expect(page.locator("button:has-text('Print Card')")).toBeVisible();
    await expect(page.locator("button:has-text('Share / Copy ID')")).toBeVisible();

    // Click Share / Copy ID button
    await page.locator("button:has-text('Share / Copy ID')").click();
  });

  test("4. Zero-Knowledge Health QR Pass (/patient/qr): Live Token & Refresh Events", async ({ page }) => {
    await page.goto("/patient/qr");
    await expect(page.locator("h1:has-text('Zero-Knowledge Health QR')")).toBeVisible();
    await expect(page.locator("text=Live Token").first()).toBeVisible();

    // Refresh Pass / Rotate Token button
    const refreshBtn = page.locator("button:has-text('Refresh Pass')");
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(page.locator("text=Pass Token Refreshed")).toBeVisible({ timeout: 5000 });
  });

  test("5. Appointments (/patient/appointments): Filter Tabs & Hospital Selector", async ({ page }) => {
    await page.goto("/patient/appointments");
    await expect(page.locator("h1")).toContainText(/Appointments/i);

    // Click filter tabs
    await page.locator("button:has-text('Upcoming')").click();
    await page.locator("button:has-text('Completed')").click();
    await page.locator("button:has-text('All Appointments')").or(page.locator("button:has-text('All Appts')")).first().click();

    // Click Refresh button
    await page.locator("button:has-text('Refresh')").click();
  });

  test("6. Visits & History (/patient/visits): Hospital Filter & Details Modal", async ({ page }) => {
    await page.goto("/patient/visits");
    await expect(page.locator("h1:has-text('Visits & Medical History')")).toBeVisible();
    await expect(page.locator('select[aria-label="Filter by Hospital"]')).toBeVisible();

    // Click View Details button on a visit card if available
    const viewDetails = page.locator("button:has-text('View Details')").first();
    if (await viewDetails.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewDetails.click();
      await expect(page.locator("button:has-text('Close Summary')")).toBeVisible();
      await page.locator("button:has-text('Close Summary')").click();
    }
  });

  test("7. Prescriptions (/patient/prescriptions): Status Tabs & Itemized Rx Modal", async ({ page }) => {
    await page.goto("/patient/prescriptions");
    await expect(page.locator("h1:has-text('My Prescriptions')")).toBeVisible();

    // Status filter tabs
    await page.locator("button:has-text('Currently Valid')").first().click();
    await page.locator("button:has-text('Completed')").first().click();
    await page.locator("button:has-text('All')").first().click();

    // Open prescription modal
    const rxCard = page.locator("text=Dr.").first();
    if (await rxCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rxCard.click();
      await expect(page.locator("text=Prescribed Pharmacotherapy").or(page.locator("text=Prescription Details")).first()).toBeVisible();
      const closeBtn = page.locator("button:has-text('Close Prescription')").or(page.locator('button[aria-label="Close"]')).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("8. Diagnostic Lab Reports (/patient/labs): Tabs & Analysis Modal", async ({ page }) => {
    await page.goto("/patient/labs");
    await expect(page.locator("h1:has-text('My Lab Reports')")).toBeVisible();

    // Filter tabs
    await page.locator("button:has-text('Recent (30 Days)')").first().click();
    await page.locator("button:has-text('Outside Range')").first().click();
    await page.locator("button:has-text('All Reports')").first().click();

    // Open lab report analysis modal
    const labCard = page.locator("text=View Analysis").or(page.locator("text=View Report")).or(page.locator("text=Dr.")).first();
    if (await labCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await labCard.click();
      const closeBtn = page.locator("button:has-text('Close Report')").or(page.locator('button[aria-label="Close"]')).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("9. Medical Documents Vault (/patient/documents): Search, Filters & Preview Modal", async ({ page }) => {
    await page.goto("/patient/documents");
    await expect(page.locator("h1:has-text('My Medical Documents')")).toBeVisible();

    // Search input
    const searchInput = page.locator('input[placeholder*="Search document"]');
    await searchInput.fill("Discharge");
    await searchInput.fill("");

    // Category filter tabs
    const dischargeTab = page.locator("button:has-text('Discharge Summaries')").or(page.locator("button:has-text('DISCHARGE')")).first();
    if (await dischargeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dischargeTab.click();
    }
    const allTab = page.locator("button:has-text('All Documents')").or(page.locator("button:has-text('ALL')")).first();
    if (await allTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allTab.click();
    }

    // Preview button modal
    const previewBtn = page.locator("button:has-text('Preview')").or(page.locator("button:has-text('View')")).first();
    if (await previewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await previewBtn.click();
      const closeBtn = page.locator("button:has-text('Close Preview')").or(page.locator('button[aria-label="Close"]')).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("10. Diagnoses & Clinical Timeline (/patient/diagnoses): Condition Badges", async ({ page }) => {
    await page.goto("/patient/diagnoses");
    await expect(page.locator("h1:has-text('Diagnoses & Procedures')")).toBeVisible();
    await expect(page.locator("text=Diagnosed Medical Conditions").first()).toBeVisible();
  });

  test("11. Complete Health Timeline (/patient/timeline): Multi-Hospital Journey & Filter", async ({ page }) => {
    await page.goto("/patient/timeline");
    await expect(page.locator("h1:has-text('My Health Timeline')")).toBeVisible();
    await expect(page.locator("main").locator("text=All Events").first()).toBeVisible();

    // Filter tabs
    await page.locator("button:has-text('Visits')").first().click();
    await page.locator("button:has-text('Prescriptions')").first().click();
    await page.locator("button:has-text('All Events')").first().click();
  });

  test("12. My Doctors Directory (/patient/doctors): Clinicians List", async ({ page }) => {
    await page.goto("/patient/doctors");
    await expect(page.locator("h1:has-text('My Doctors')")).toBeVisible();
    await expect(page.locator("main").locator("text=Healthcare consultants and specialists").first()).toBeVisible();
  });

  test("13. My Hospitals Network (/patient/hospitals): Facilities Directory", async ({ page }) => {
    await page.goto("/patient/hospitals");
    await expect(page.locator("h1:has-text('My Hospitals & Facilities')")).toBeVisible();
    await expect(page.locator("main").locator("text=Universal Health Network Architecture").first()).toBeVisible();
  });

  test("14. Bills & Payments (/patient/bills): Invoices, Filters & Itemized Bill Modal", async ({ page }) => {
    await page.goto("/patient/bills");
    await expect(page.locator("h1:has-text('Bills & Payments')")).toBeVisible();
    await expect(page.locator("text=Settled & Paid Invoices").first()).toBeVisible();

    // Filter tabs
    await page.locator("button:has-text('Paid')").click();
    await page.locator("button:has-text('Pending Dues')").click();
    await page.locator("button:has-text('All')").first().click();

    // Itemized invoice modal
    const billCard = page.locator("text=View Itemized Bill").first();
    if (await billCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await billCard.click();
      await expect(page.locator("text=Line Items").first()).toBeVisible();
      await page.locator("button:has-text('Close')").click();
    }
  });

  test("15. Health Insurance (/patient/insurance): Policy & Coverage Limits", async ({ page }) => {
    await page.goto("/patient/insurance");
    await expect(page.locator("h1:has-text('My Health Insurance')")).toBeVisible();
    await expect(page.locator("main").locator("text=Verified health insurance policies").first()).toBeVisible();
  });

  test("16. Consent & Privacy (/patient/consent): ABDM Artefacts & Revoke Controls", async ({ page }) => {
    await page.goto("/patient/consent");
    await expect(page.locator("h1:has-text('Consent & Data Privacy')")).toBeVisible();
    await expect(page.locator("text=Patient-Centric Consent Control").first()).toBeVisible();
  });

  test("17. Notifications (/patient/notifications): Tabs & Mark All Read", async ({ page }) => {
    await page.goto("/patient/notifications");
    await expect(page.locator("h1:has-text('Notifications')")).toBeVisible();

    // Filter tabs
    await page.locator("button:has-text('Unread')").click();
    await page.locator("button:has-text('All')").first().click();
  });

  test("18. Family Healthcare Management (/patient/family): Overview, Add Wizard & Audit Log", async ({ page }) => {
    await page.goto("/patient/family");
    await expect(page.getByText("Family Healthcare Management").first()).toBeVisible();
    await expect(page.getByText("OH-ID Family Healthcare Architecture • 1 Person = 1 OH-ID").first()).toBeVisible();

    // Open Audit Log modal
    const auditBtn = page.locator("#btn-open-audit-trail");
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();
    await expect(page.locator("text=Family Access Audit Trail").first()).toBeVisible();

    // Close audit modal
    await page.locator("button:has-text('Close Audit Trail')").click();

    // Open Add Family Member Modal
    const addBtn = page.locator("#btn-open-add-member");
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator("#add-family-wizard-modal")).toBeVisible();

    // Duplicate check lookup interaction
    const checkInput = page.locator("#input-duplicate-search");
    await checkInput.fill("OHID-IND-2026-01002");
    await page.locator("#btn-search-duplicate").click();
    await expect(page.locator("text=Existing Citizen Record Found").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Bob Smith").first()).toBeVisible();

    // Close wizard
    await page.locator("#btn-close-family-wizard").click();
    await expect(page.locator("#add-family-wizard-modal")).not.toBeVisible();
  });

  test("19. Patient Settings (/patient/settings): Checkbox Toggles & Save Preferences", async ({ page }) => {
    await page.goto("/patient/settings");
    await expect(page.locator("h1:has-text('Patient Settings')")).toBeVisible();
    await expect(page.locator("text=Communication & Alert Channels").first()).toBeVisible();

    // Toggle checkboxes
    const checkboxes = page.locator("input[type='checkbox']");
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click();
    }

    // Save preferences button
    const saveBtn = page.locator("button:has-text('Save Preferences')");
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.locator("text=Settings and notification preferences saved successfully.")).toBeVisible({ timeout: 5000 });
  });

  test("20. Patient Sign Out Button: Clean Logout & Redirection", async ({ page }) => {
    await page.goto("/patient");
    const signOutBtn = page.locator("#btn-logout, button[title='Sign Out']").filter({ visible: true });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
    await expect(page.locator("h2:has-text('Sign In to OneHealth OS')")).toBeVisible();
  });
});
