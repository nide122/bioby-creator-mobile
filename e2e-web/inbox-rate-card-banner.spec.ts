import { expect, test } from '@playwright/test';

import { enterDemoWorkspace, gotoProtected } from './helpers';

const SAMPLE_PACKAGE = {
  id: 'e2e-package',
  name: 'E2E package',
  tagline: 'Test floor',
  priceLabel: '$2k–$3k',
  deliverables: ['1 short video'],
  revisionRounds: '1 round',
  usageRights: 'Organic 60 days',
  prepayLabel: '50% prepay',
  addOnHint: '',
  highlights: [],
  recommended: true,
};

test.describe('Inbox rate-card banner', () => {
  test.beforeEach(async ({ page }) => {
    await enterDemoWorkspace(page);
  });

  test('shows when rate card is empty and hides after packages are added', async ({ page }) => {
    await page.evaluate(async () => {
      await window.__BIOBY_DEV_SET_RATE_CARDS__?.([]);
    });

    await gotoProtected(page, '/inbox');
    const banner = page.getByTestId('inbox-rate-card-banner');
    await expect(banner).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('inbox-rate-card-banner-cta').click();
    await expect(page).toHaveURL(/pricing-edit/, { timeout: 30_000 });

    await page.evaluate(async (pkg) => {
      await window.__BIOBY_DEV_SET_RATE_CARDS__?.([pkg]);
    }, SAMPLE_PACKAGE);

    await gotoProtected(page, '/inbox');
    await expect(page.getByTestId('inbox-rate-card-banner')).toHaveCount(0, { timeout: 30_000 });
  });
});
