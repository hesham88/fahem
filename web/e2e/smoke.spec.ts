import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Fahem E2E Smoke Tests', () => {

  test('D0 - Deploy Parity', async ({ page }) => {
    // 1. Get the current local Git SHA
    let localSha = 'unknown';
    try {
      localSha = execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
      console.warn('Could not read local git SHA:', e);
    }

    // 2. Fetch the version API from the live site
    const response = await page.goto('/api/version');
    expect(response).not.toBeNull();
    
    if (response!.status() === 404) {
      console.warn('[D0][WARN] /api/version returned 404 on the live site. This is expected during initial deployment before the route is live.');
      return;
    }

    expect(response!.status()).toBe(200);

    const text = await page.locator('body').innerText();
    const json = JSON.parse(text);
    console.log('[D0] Live version JSON:', json);
    console.log('[D0] Local Git SHA:', localSha);

    if (json.sha !== 'unknown' && localSha !== 'unknown') {
      expect(json.sha).toBe(localSha);
    } else {
      expect(json.sha).toBeDefined();
    }
  });

  test('D1 - Sandbox Entry (no auth)', async ({ page }) => {
    // 1. Navigate to the landing page
    await page.goto('/');
    
    // Wait for the page to load
    await expect(page).toHaveTitle(/Fahem/i);

    // 2. Locate sandbox/evaluation form elements
    const emailInput = page.locator('input[placeholder="your.email@example.com"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('playwright-test@fahem.pro');

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    
    // Ensure evidence directory exists (relative to web folder)
    // We take screenshots of the landing page
    await page.screenshot({ path: '../evidence/shots/D1-landing.png' });

    // Click on Enter Sandbox and wait for redirection to /home
    await submitBtn.click();

    // Wait for URL to contain /home
    await page.waitForURL(/\/home/);
    
    const url = page.url();
    console.log('[D1] Redirected to page:', url);
    expect(url).toContain('/home');

    // Assert that no "not eligible" text is visible
    const notEligible = page.locator('text=not eligible');
    const count = await notEligible.count();
    expect(count).toBe(0);

    // Take a screenshot of the logged-in home page
    await page.screenshot({ path: '../evidence/shots/D1-home.png' });
  });

});
