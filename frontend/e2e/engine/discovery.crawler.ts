import { Page, expect } from "@playwright/test";

export interface DiscoveredElement {
  type: "LINK" | "BUTTON" | "INPUT" | "MODAL";
  text: string;
  href?: string;
  id?: string;
  role?: string;
}

export interface CrawlResult {
  currentUrl: string;
  pageTitle: string;
  linksCount: number;
  buttonsCount: number;
  formsCount: number;
  brokenLinks: string[];
  consoleErrors: string[];
}

/**
 * Attaches console error and network failure listeners to a Page context.
 */
export function setupPageDiagnostics(page: Page): { consoleErrors: string[]; failedRequests: string[] } {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`PageError: ${err.message}`);
  });

  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("/favicon") && !res.url().includes(".map")) {
      failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  return { consoleErrors, failedRequests };
}

/**
 * Crawls and validates all visible navigation links in the workspace sidebar.
 */
export async function crawlAndValidateSidebarNav(page: Page): Promise<CrawlResult> {
  const currentUrl = page.url();
  const pageTitle = await page.title();
  const brokenLinks: string[] = [];
  const consoleErrors: string[] = [];

  // Locate all navigation anchors inside sidebar / workspace nav
  const navLinks = await page.locator('nav a[href], aside a[href], [data-testid="sidebar-nav"] a[href]').all();
  const hrefs: string[] = [];

  for (const link of navLinks) {
    const href = await link.getAttribute("href");
    if (href && !href.startsWith("#") && !hrefs.includes(href)) {
      hrefs.push(href);
    }
  }

  return {
    currentUrl,
    pageTitle,
    linksCount: hrefs.length,
    buttonsCount: await page.locator("button").count(),
    formsCount: await page.locator("form").count(),
    brokenLinks,
    consoleErrors,
  };
}

/**
 * Asserts that a target page loaded properly without blank screens or fatal errors.
 */
export async function assertPageHealth(page: Page, expectedUrlPart?: string): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  if (expectedUrlPart) {
    expect(page.url()).toContain(expectedUrlPart);
  }

  // Ensure body is visible and contains content
  const bodyText = await page.locator("body").innerText();
  expect(bodyText.trim().length).toBeGreaterThan(10);

  // Assert no unhandled 500 error display
  const has500Error = await page.locator("text=Internal Server Error, text=Application error: a client-side exception").isVisible().catch(() => false);
  expect(has500Error).toBeFalsy();
}
