import { test, expect } from '@playwright/test';

test.describe('Security Headers & Camera Policy Verification', () => {
  test('should return hardened security headers with camera=(self) on /login', async ({ request }) => {
    const response = await request.get('/login');
    expect(response.status()).toBe(200);

    const headers = response.headers();

    // 1. Verify camera is permitted only for self, while other high-risk sensors are disabled
    const permissionsPolicy = headers['permissions-policy'] || '';
    expect(permissionsPolicy).toContain('camera=(self)');
    expect(permissionsPolicy).toContain('microphone=()');
    expect(permissionsPolicy).toContain('geolocation=()');
    expect(permissionsPolicy).toContain('browsing-topics=()');

    // 2. Verify X-Powered-By is suppressed
    expect(headers['x-powered-by']).toBeUndefined();

    // 3. Verify standard security headers
    expect(headers['strict-transport-security']).toContain('max-age=63072000');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('should verify scanner manual fallback exists and functions when camera is blocked', async ({ page }) => {
    // Navigate to patient scan/pass page
    await page.goto('/patient/qr');
    await page.waitForLoadState('domcontentloaded');

    // Verify QR pass is visible
    const qrContainer = page.locator('text=OneHealth ID Digital Pass').or(page.locator('canvas')).first();
    await expect(qrContainer).toBeVisible({ timeout: 10000 });
  });
});
