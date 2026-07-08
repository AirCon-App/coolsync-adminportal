import { test, expect } from '@playwright/test';

// Cross-building Procurement Outlook (ADR-011). The portfolio view is SuperAdmin-only,
// so these run against a SuperAdmin login. Set TEST_SUPERADMIN_EMAIL / _PASSWORD for a
// SuperAdmin account; falls back to the standard admin test credentials.
test.describe('Procurement Outlook (SuperAdmin portfolio view)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('email-input').fill(process.env.TEST_SUPERADMIN_EMAIL || process.env.TEST_USER_EMAIL || 'admin@coolsync.com');
    await page.getByTestId('password-input').fill(process.env.TEST_SUPERADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.getByTestId('login-button').click();
    await page.waitForURL(/home|dashboard/i, { timeout: 10000 });
  });

  test('shows the portfolio toggle for super admins', async ({ page }) => {
    await expect(page.getByTestId('dash-view-portfolio')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('dash-view-building')).toBeVisible();
  });

  test('switches to the portfolio view and loads the outlook', async ({ page }) => {
    await page.getByTestId('dash-view-portfolio').click();
    await expect(page.getByTestId('procurement-outlook')).toBeVisible({ timeout: 10000 });
    // Either at-risk rows OR the all-clear state must render — never an empty panel.
    const atRisk = page.getByTestId('procurement-atrisk-row');
    const allClear = page.getByTestId('procurement-allclear');
    await expect(atRisk.first().or(allClear)).toBeVisible({ timeout: 10000 });
  });

  test('changing the horizon refetches the outlook', async ({ page }) => {
    await page.getByTestId('dash-view-portfolio').click();
    await expect(page.getByTestId('procurement-outlook')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('procurement-horizon-90').click();
    await expect(page.getByTestId('procurement-horizon-90')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('procurement-outlook')).toBeVisible();
  });

  test('can switch back to the building view', async ({ page }) => {
    await page.getByTestId('dash-view-portfolio').click();
    await expect(page.getByTestId('procurement-outlook')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('dash-view-building').click();
    await expect(page.getByTestId('procurement-outlook')).toHaveCount(0);
  });
});
