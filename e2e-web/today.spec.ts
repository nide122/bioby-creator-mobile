import { expect, test } from '@playwright/test';

import { enterDemoWorkspace } from './helpers';

test.describe('Today decision queue', () => {
  test.beforeEach(async ({ page }) => {
    await enterDemoWorkspace(page);
    await page.getByTestId('tab-today').click();
    await expect(page.getByTestId('screen-today')).toBeVisible({ timeout: 30_000 });
  });

  test('shows payout decision card', async ({ page }) => {
    await expect(page.getByTestId('today-decision-card-dec-payout-beta')).toBeVisible();
  });

  test('snooze then undo restores the card', async ({ page }) => {
    await page.getByTestId('today-action-dec-payout-beta-later').click();
    await expect(page.getByTestId('today-undo')).toBeVisible();
    await page.getByTestId('today-undo').click();
    await expect(page.getByTestId('today-decision-card-dec-payout-beta')).toBeVisible();
  });

  test('primary action navigates to verification', async ({ page }) => {
    await page.getByTestId('today-action-dec-payout-beta-upload').click();
    await expect(page).toHaveURL(/\/deal\/mock-deal-beta\/verification/, { timeout: 30_000 });
  });
});
