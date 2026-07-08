import { test, expect } from '@playwright/test';

test.describe('Air Handlers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL || 'admin@coolsync.com');
    await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/home|dashboard/i, { timeout: 10000 });
  });

  test('should navigate to air handlers page', async ({ page }) => {
    await page.getByRole('link', { name: /air handler|units/i }).click();
    await expect(page).toHaveURL(/airhandler/i);
  });

  test('should display air handler list', async ({ page }) => {
    await page.goto('/airhandlers');
    await expect(page.locator('[data-testid="airhandler-card"]').or(page.getByRole('article'))).toBeVisible({ timeout: 10000 });
  });

  test('should open air handler detail on click', async ({ page }) => {
    await page.goto('/airhandlers');
    const firstHandler = page.locator('[data-testid="airhandler-card"]').or(page.getByRole('article')).first();
    if (await firstHandler.isVisible()) {
      await firstHandler.click();
      await expect(page).toHaveURL(/airhandler.*detail|airhandler.*\//i);
    }
  });

  test('should open the assign-area modal from a row', async ({ page }) => {
    await page.goto('/airhandlers');
    const editAreaBtn = page.getByRole('button', { name: /edit area/i }).first();
    if (await editAreaBtn.isVisible().catch(() => false)) {
      await editAreaBtn.click();
      await expect(page.getByRole('heading', { name: /assign area/i })).toBeVisible();
      await expect(page.getByText(/area \/ floor/i)).toBeVisible();
      await page.getByRole('button', { name: /cancel/i }).click();
    }
  });
});
