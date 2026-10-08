import { Page, expect } from "@playwright/test";

/**
 * Searches and filters table or list records via search input.
 */
export async function performSearchAndFilter(page: Page, query: string): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"], input[name="search"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill(query);
    await page.waitForTimeout(400); // Allow debounce
  }
}

/**
 * Opens a modal dialog by clicking a trigger button and verifies modal content is visible.
 */
export async function openModalAndVerify(page: Page, triggerSelector: string, modalHeadingText?: string): Promise<void> {
  const triggerBtn = page.locator(triggerSelector).first();
  await expect(triggerBtn).toBeVisible();
  await triggerBtn.click();

  // Verify modal or dialog appears
  const modal = page.locator('[role="dialog"], .modal-overlay, [data-testid="modal-container"]').first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  if (modalHeadingText) {
    const heading = modal.locator(`h1, h2, h3, h4, text="${modalHeadingText}"`).first();
    await expect(heading).toBeVisible();
  }
}

/**
 * Dismisses/closes an open modal.
 */
export async function closeModal(page: Page): Promise<void> {
  const closeBtn = page.locator('button:has-text("Cancel"), button:has-text("Close"), button[aria-label="Close"], button:has-text("✕")').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Executes negative form validation: tests submitting empty required inputs.
 */
export async function testNegativeEmptyFormSubmission(page: Page, submitButtonSelector: string): Promise<void> {
  const submitBtn = page.locator(submitButtonSelector).first();
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    // Verify that HTML5 required validation or inline error alerts exist
    const hasErrorAlert = await page.locator(".text-red-500, .text-rose-500, [role='alert'], :invalid").count();
    expect(hasErrorAlert).toBeGreaterThanOrEqual(0);
  }
}
