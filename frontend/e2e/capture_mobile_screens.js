const { chromium } = require('@playwright/test');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log('1. Navigating to login screen...');
  await page.goto('http://localhost:8081/(auth)/login');
  await page.waitForTimeout(2500);

  // Fill in mobile number
  console.log('2. Entering mobile number 9884240519...');
  const phoneInput = page.getByTestId('mobile-input');
  await phoneInput.fill('9884240519');
  await page.waitForTimeout(500);

  // Click Continue
  console.log('3. Clicking continue-button...');
  const continueBtn = page.getByTestId('continue-button');
  await continueBtn.click();
  await page.waitForTimeout(2000);

  // Fill in password
  console.log('4. Entering password...');
  const passwordInput = page.getByTestId('password-input');
  await passwordInput.fill('password123');
  await page.waitForTimeout(500);

  // Submit password
  console.log('5. Clicking login-button...');
  const signInBtn = page.getByTestId('login-button');
  await signInBtn.click();

  console.log('Waiting for patient digital card QR to render...');
  await page.waitForSelector('[data-testid="qr-code-svg"]', { timeout: 15000 });
  await page.waitForTimeout(1000);

  console.log('6. Capturing Patient Home Dashboard...');
  await page.screenshot({
    path: 'C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c/verified_patient_dashboard_v7.png',
    fullPage: false,
  });
  console.log('Saved verified_patient_dashboard_v7.png');

  console.log('7. Navigating to Health Timeline via bottom tab...');
  const timelineTab = page.getByRole('tab', { name: /Health Records/i });
  await timelineTab.click();
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: 'C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c/verified_patient_timeline_v7.png',
    fullPage: false,
  });
  console.log('Saved verified_patient_timeline_v7.png');

  console.log('8. Navigating to Patient Profile via bottom tab...');
  const profileTab = page.getByRole('tab', { name: /Profile/i });
  await profileTab.click();
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: 'C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c/verified_patient_profile_v7.png',
    fullPage: false,
  });
  console.log('Saved verified_patient_profile_v7.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
