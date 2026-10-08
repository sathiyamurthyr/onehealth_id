const { chromium } = require('@playwright/test');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3050/login');
  await page.waitForLoadState('networkidle');

  // Screenshot 1: Clean Production Login Page (No Pilot Accounts / Quick Fill)
  await page.screenshot({ 
    path: 'C:/Users/Sathyamoorthy/.gemini/antigravity-ide/brain/a5a148d2-2ce1-42e1-8967-17d4e0137445/login_page_clean_production.png',
    fullPage: false 
  });
  console.log('Saved login_page_clean_production.png');

  // Screenshot 2: Forgot Password Modal
  const forgotBtn = page.getByRole('button', { name: /Forgot Password\?/i });
  await forgotBtn.click();
  await page.waitForTimeout(300);

  await page.screenshot({ 
    path: 'C:/Users/Sathyamoorthy/.gemini/antigravity-ide/brain/a5a148d2-2ce1-42e1-8967-17d4e0137445/login_forgot_password_modal.png',
    fullPage: false 
  });
  console.log('Saved login_forgot_password_modal.png');

  // Close modal
  await page.getByRole('button', { name: 'Got It' }).click();
  await page.waitForTimeout(300);

  // Screenshot 3: Validation Error on Empty Submission
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(300);

  await page.screenshot({ 
    path: 'C:/Users/Sathyamoorthy/.gemini/antigravity-ide/brain/a5a148d2-2ce1-42e1-8967-17d4e0137445/login_validation_error.png',
    fullPage: false 
  });
  console.log('Saved login_validation_error.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
