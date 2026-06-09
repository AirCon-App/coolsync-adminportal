import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('email-input').fill(process.env.TEST_USER_EMAIL || 'admin@coolsync.com');
    await page.getByTestId('password-input').fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.getByTestId('login-button').click();
    await page.waitForURL(/home|dashboard/i, { timeout: 10000 });
  });

  test('should navigate to inventory page', async ({ page }) => {
    await page.getByTestId('nav-inventory').click();
    await expect(page).toHaveURL(/inventory/i);
  });

  test('should display inventory list', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByTestId('inventory-table')).toBeVisible({ timeout: 10000 });
  });

  test('should filter inventory by search', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByTestId('inventory-search').fill('filter');
    await page.waitForTimeout(500);
  });
});
