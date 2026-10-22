import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("1. Logging in as patient...");
  await page.goto("http://localhost:3050/login", { waitUntil: "networkidle" });
  await page.locator('input[type="text"]').fill("patient");
  await page.locator('input[type="password"]').fill("patient123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/.*patient.*/, { timeout: 10000 });

  console.log("2. Navigating to prescription details RX-20261003-00124...");
  await page.goto("http://localhost:3050/patient/prescriptions/RX-20261003-00124", { waitUntil: "networkidle" });
  await page.waitForSelector(".prescription-document-sheet", { timeout: 10000 });

  const artifactsDir = path.resolve(process.cwd(), "../artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  console.log("3. Capturing details page screenshot...");
  await page.screenshot({
    path: path.join(artifactsDir, "prescription_details_page.png"),
    fullPage: false,
  });

  console.log("4. Emulating print media and generating PDF...");
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: path.join(artifactsDir, "prescription_RX-20261003-00124.pdf"),
    format: "A4",
    printBackground: true,
    margin: {
      top: "8mm",
      bottom: "8mm",
      left: "10mm",
      right: "10mm",
    },
  });

  console.log("5. Logging out and logging in as doctor to verify doctor details view...");
  const pageDoctor = await context.newPage();
  await pageDoctor.goto("http://localhost:3050/login", { waitUntil: "networkidle" });
  await pageDoctor.locator('input[type="text"]').fill("doctor");
  await pageDoctor.locator('input[type="password"]').fill("doctor123");
  await pageDoctor.locator('button[type="submit"]').click();
  await pageDoctor.waitForURL(/.*doctor.*/, { timeout: 10000 });

  await pageDoctor.goto("http://localhost:3050/doctor/prescriptions/RX-20261003-00124", { waitUntil: "networkidle" });
  await pageDoctor.waitForSelector(".prescription-document-sheet", { timeout: 10000 });
  await pageDoctor.screenshot({
    path: path.join(artifactsDir, "doctor_prescription_details_page.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Visual capture completed successfully!");
}

main().catch((err) => {
  console.error("Error capturing visuals:", err);
  process.exit(1);
});
