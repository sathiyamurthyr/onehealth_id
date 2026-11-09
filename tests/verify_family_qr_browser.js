const { chromium } = require('./frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.resolve("C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c/screenshots");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ----------------------------------------------------
  // 1. Patient Alice Smith logs in to view family member pass
  // ----------------------------------------------------
  console.log("1. Launching Alice Smith patient session...");
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 20000 });
  const usernameInput = await page.waitForSelector('input[type="text"]', { timeout: 8000 });
  await usernameInput.fill('9884240519');

  const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 8000 });
  await passwordInput.fill('Password@123');

  const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
  await submitBtn.click();

  try {
    await Promise.race([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 6000 }),
      page.waitForSelector('button:has-text("Continue")', { timeout: 6000 }),
    ]);
  } catch {}

  const continueBtn = await page.$('button:has-text("Continue")');
  if (continueBtn) {
    console.log('  -> Multi-role modal detected, clicking Continue...');
    await continueBtn.click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  }

  await page.waitForTimeout(2000);
  console.log("Landed on:", page.url());

  // Navigate to Family Workspace
  console.log("2. Navigating to /patient/family...");
  await page.goto('http://localhost:3000/patient/family', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2500);

  const familyListScreenshot = path.join(outDir, "family_01_member_list.png");
  await page.screenshot({ path: familyListScreenshot, fullPage: false });
  console.log("  -> Saved family list screenshot:", familyListScreenshot);

  // Click on Bob Smith's View QR Token button
  console.log("3. Opening Bob Smith's Zero-Knowledge Healthcare Pass...");
  const qrButtons = await page.$$('button[title="View QR Token"]');
  console.log(`  -> Found ${qrButtons.length} 'View QR Token' buttons.`);
  if (qrButtons.length > 0) {
    await qrButtons[0].click();
    await page.waitForTimeout(2000);

    const bobPassScreenshot = path.join(outDir, "family_02_bob_smith_zk_qr_pass.png");
    await page.screenshot({ path: bobPassScreenshot });
    console.log("  -> Saved Bob Smith Zero-Knowledge QR Pass screenshot:", bobPassScreenshot);

    // Verify SVG is present
    const qrSvg = await page.$('div.bg-slate-900 svg');
    console.log("  -> Genuine machine-readable QR SVG detected:", Boolean(qrSvg));

    // Test Rotate Pass
    const rotateBtn = await page.$('button:has-text("Rotate Pass")');
    if (rotateBtn) {
      console.log("  -> Clicking Rotate Pass button...");
      await rotateBtn.click();
      await page.waitForTimeout(2500);

      const bobRotatedScreenshot = path.join(outDir, "family_03_bob_smith_qr_rotated.png");
      await page.screenshot({ path: bobRotatedScreenshot });
      console.log("  -> Saved Bob Smith Rotated QR screenshot:", bobRotatedScreenshot);
    }

    // Close Pass
    const closeBtn = await page.$('button:has-text("Close Pass")');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(1000);
  }

  // ----------------------------------------------------
  // 2. Receptionist logs in to scan/resolve Bob Smith's QR
  // ----------------------------------------------------
  console.log("\n4. Launching Hospital Reception Desk session...");
  const recContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const recPage = await recContext.newPage();

  await recPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 20000 });
  const recUserInput = await recPage.waitForSelector('input[type="text"]', { timeout: 8000 });
  await recUserInput.fill('receptionist');

  const recPassInput = await recPage.waitForSelector('input[type="password"]', { timeout: 8000 });
  await recPassInput.fill('rec123');

  const recSubmitBtn = await recPage.waitForSelector('button[type="submit"]', { timeout: 5000 });
  await recSubmitBtn.click();

  try {
    await Promise.race([
      recPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 6000 }),
      recPage.waitForSelector('button:has-text("Continue")', { timeout: 6000 }),
    ]);
  } catch {}

  const recContinueBtn = await recPage.$('button:has-text("Continue")');
  if (recContinueBtn) {
    console.log('  -> Multi-role modal detected on reception, clicking Continue...');
    await recContinueBtn.click();
    await recPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  }

  await recPage.waitForTimeout(2000);
  console.log("Landed on:", recPage.url());

  // Navigate to Universal QR Scanner page
  console.log("5. Navigating to Universal QR Scanner (/scan)...");
  await recPage.goto('http://localhost:3000/scan', { waitUntil: 'networkidle', timeout: 15000 });
  await recPage.waitForTimeout(2000);

  // Switch to Manual Lookup Tab
  console.log("  -> Switching to Manual Lookup tab...");
  const manualTab = await recPage.waitForSelector('button:has-text("Manual Lookup")', { timeout: 8000 });
  await manualTab.click();
  await recPage.waitForTimeout(600);

  console.log("  -> Entering Bob Smith's OneHealth ID: OHID-IND-2026-01002...");
  const idInput = await recPage.waitForSelector('input[placeholder*="OHID"]', { timeout: 5000 });
  await idInput.fill('OHID-IND-2026-01002');

  const resolveBtn = await recPage.waitForSelector('button:has-text("Resolve Patient Identity")', { timeout: 5000 });
  await resolveBtn.click();

  // Wait for resolved screen with family link badge
  console.log("  -> Waiting for resolved identity screen...");
  await recPage.waitForSelector('h4:has-text("Bob Smith")', { timeout: 10000 });
  await recPage.waitForSelector('[data-testid="scanned-family-link-badge"]', { timeout: 10000 });

  const recScanScreenshot = path.join(outDir, "family_04_reception_bob_smith_resolved.png");
  await recPage.screenshot({ path: recScanScreenshot });
  console.log("  -> Saved Reception Bob Smith resolved screenshot:", recScanScreenshot);

  // Issue OPD walk-in queue token to verify check-in end to end
  const issueTokenBtn = await recPage.$('button:has-text("Issue OPD Queue Token")');
  if (issueTokenBtn) {
    console.log("  -> Issuing OPD Queue Token for Bob Smith...");
    await issueTokenBtn.click();
    await recPage.waitForTimeout(3000);
    const checkedInScreenshot = path.join(outDir, "family_05_reception_token_issued.png");
    await recPage.screenshot({ path: checkedInScreenshot });
    console.log("  -> Saved Token Issued screenshot:", checkedInScreenshot);
  }

  await browser.close();
  console.log("\nAll browser verification steps completed successfully!");
}

main().catch((err) => {
  console.error("Browser verification error:", err);
  process.exit(1);
});
