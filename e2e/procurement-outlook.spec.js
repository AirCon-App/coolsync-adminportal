import { test, expect } from '@playwright/test';

// Cross-building Procurement Outlook (ADR-011), now a standalone SuperAdmin-only
// page at /portfolio reached via the sidebar's "Portfolio" nav group. These run
// against a SuperAdmin login. Set TEST_SUPERADMIN_EMAIL / _PASSWORD for a
// SuperAdmin account; falls back to the standard admin test credentials.
test.describe('Procurement Outlook (SuperAdmin portfolio page)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('email-input').fill(process.env.TEST_SUPERADMIN_EMAIL || process.env.TEST_USER_EMAIL || 'admin@coolsync.com');
    await page.getByTestId('password-input').fill(process.env.TEST_SUPERADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.getByTestId('login-button').click();
    await page.waitForURL(/home|dashboard/i, { timeout: 10000 });
  });

  const openPortfolio = async (page) => {
    await page.getByTestId('nav-all-buildings').click();
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.getByTestId('procurement-outlook')).toBeVisible({ timeout: 10000 });
  };

  test('shows the Portfolio nav group for super admins', async ({ page }) => {
    await expect(page.getByTestId('nav-all-buildings')).toBeVisible({ timeout: 10000 });
  });

  test('opens the portfolio page and loads the outlook', async ({ page }) => {
    await openPortfolio(page);
    // The plain-language verdict always renders once data loads.
    await expect(page.getByTestId('procurement-verdict')).toBeVisible({ timeout: 10000 });
    // Either filter rows OR the no-inventory state must render — never an empty panel.
    const rows = page.getByTestId('procurement-line-row');
    const allClear = page.getByTestId('procurement-allclear');
    await expect(rows.first().or(allClear)).toBeVisible({ timeout: 10000 });
  });

  test('tier cards filter the table and toggle back off', async ({ page }) => {
    await openPortfolio(page);
    await expect(page.getByTestId('procurement-tier-ordernow')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('procurement-tier-ordernow').click();
    await expect(page.getByTestId('procurement-tier-ordernow')).toHaveAttribute('aria-pressed', 'true');
    // Every visible row in the Order-now tier carries the Order now badge.
    const rows = page.getByTestId('procurement-line-row');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).getByText('Order now')).toBeVisible();
    }
    // Clicking the active card clears the filter.
    await page.getByTestId('procurement-tier-ordernow').click();
    await expect(page.getByTestId('procurement-tier-ordernow')).toHaveAttribute('aria-pressed', 'false');
  });

  test('drilling into a building scopes the view and returns to complete view', async ({ page }) => {
    await openPortfolio(page);

    const links = page.getByTestId('procurement-building-link');
    const linkCount = await links.count();
    test.skip(linkCount === 0, 'No tracked inventory lines in this environment');

    const buildingName = ((await links.first().textContent()) || '').trim();
    test.skip(!buildingName, 'Building link rendered without a name');
    await links.first().click();

    // Scope banner appears with the building name and an order summary line.
    const bar = page.getByTestId('procurement-building-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(buildingName);
    // Every visible row belongs to the drilled building (names render as plain text now).
    const rows = page.getByTestId('procurement-line-row');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i)).toContainText(buildingName);
    }
    await expect(page.getByTestId('procurement-building-link')).toHaveCount(0);

    // Back to the complete cross-building view.
    await page.getByTestId('procurement-building-clear').click();
    await expect(bar).toHaveCount(0);
    await expect(page.getByTestId('procurement-verdict')).toBeVisible();
  });

  test('navigating to the dashboard leaves the portfolio view', async ({ page }) => {
    await openPortfolio(page);
    await page.getByTestId('nav-dashboard').click();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByTestId('procurement-outlook')).toHaveCount(0);
  });

  test('non-superadmins are redirected away from /portfolio', async ({ page }) => {
    // Only meaningful when a non-superadmin credential is configured.
    test.skip(!process.env.TEST_BUILDINGADMIN_EMAIL, 'No building-admin test credential configured');
    await page.getByTestId('logout-button').click();
    await page.waitForURL('/', { timeout: 10000 });
    await page.getByTestId('email-input').fill(process.env.TEST_BUILDINGADMIN_EMAIL);
    await page.getByTestId('password-input').fill(process.env.TEST_BUILDINGADMIN_PASSWORD || '');
    await page.getByTestId('login-button').click();
    await page.waitForURL(/home|dashboard/i, { timeout: 10000 });
    // No Portfolio nav group, and deep-linking bounces back to the dashboard.
    await expect(page.getByTestId('nav-all-buildings')).toHaveCount(0);
    await page.goto('/portfolio');
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });
});
