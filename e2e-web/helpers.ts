import { expect, type Page } from '@playwright/test';

/** Append `testWorkspace=1` so full page loads re-seed demo session. */
export function withTestWorkspace(path: string): string {
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);
  params.set('testWorkspace', '1');
  const qs = params.toString();
  return `${pathname}?${qs}`;
}

async function waitForDemoSession(page: Page) {
  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem('bioby-session-dev-v1');
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as { state?: { isAuthenticated?: boolean } };
      return parsed.state?.isAuthenticated === true;
    } catch {
      return false;
    }
  }, { timeout: 30_000 });
}

async function waitForDevNavigator(page: Page) {
  await page.waitForFunction(() => typeof window.__BIOBY_DEV_NAVIGATE__ === 'function', {
    timeout: 30_000,
  });
}

/** Client-side route change (keeps sessionStorage + avoids RN Web deep-link quirks). */
async function devNavigate(page: Page, path: string) {
  await waitForDevNavigator(page);
  await page.evaluate((target) => window.__BIOBY_DEV_NAVIGATE__?.(target), path);
}

/** Seed demo workspace via DevTestSeed (?testWorkspace=1). */
export async function enterDemoWorkspace(page: Page) {
  await page.goto(withTestWorkspace('/home'));
  await expect(page.getByTestId('screen-today')).toBeVisible({ timeout: 90_000 });
  await waitForDemoSession(page);
}

/** Navigate to a protected route without losing the demo session. */
export async function gotoProtected(page: Page, path: string) {
  const pathOnly = path.split('?')[0] || '/';

  const hasSession = await page.evaluate(() => {
    const raw = sessionStorage.getItem('bioby-session-dev-v1');
    if (!raw) return false;
    try {
      return JSON.parse(raw).state?.isAuthenticated === true;
    } catch {
      return false;
    }
  });

  if (!hasSession) {
    await enterDemoWorkspace(page);
  } else {
    await waitForDevNavigator(page);
  }

  const tabByPath: Record<string, { tab: string; screen: string }> = {
    '/': { tab: 'tab-today', screen: 'screen-today' },
    '/inbox': { tab: 'tab-inbox', screen: 'screen-inbox' },
    '/deals': { tab: 'tab-deals', screen: 'screen-deals' },
  };
  const tabRoute = tabByPath[pathOnly];
  if (tabRoute) {
    if (pathOnly !== '/') {
      await page.getByTestId(tabRoute.tab).click();
    }
    await expect(page.getByTestId(tabRoute.screen)).toBeVisible({ timeout: 30_000 });
    return;
  }

  if (pathOnly.startsWith('/inbox/') && pathOnly !== '/inbox') {
    const threadId = pathOnly.slice('/inbox/'.length);
    const priorityChipByThread: Record<string, string> = {
      'thread-skincare': 'inbox-priority-chip-p1',
      'thread-hardware': 'inbox-priority-chip-p0',
    };
    await page.getByTestId('tab-inbox').click();
    await expect(page.getByTestId('screen-inbox')).toBeVisible({ timeout: 30_000 });
    const priorityChip = priorityChipByThread[threadId];
    if (priorityChip) {
      await page.getByTestId(priorityChip).click();
    }
    await page.getByTestId(`inbox-thread-${threadId}`).click({ force: true });
    await expect(page.getByTestId('screen-inbox-thread-detail')).toBeVisible({ timeout: 30_000 });
    return;
  }

  const dealDetailMatch = pathOnly.match(/^\/deal\/([^/]+)$/);
  if (dealDetailMatch) {
    const dealId = dealDetailMatch[1];
    await page.getByTestId('tab-deals').click();
    await expect(page.getByTestId('screen-deals')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId(`deal-card-${dealId}`).click({ force: true });
    await expect(page.getByTestId('screen-deal-detail')).toBeVisible({ timeout: 30_000 });
    return;
  }

  await devNavigate(page, pathOnly);
  const escaped = pathOnly.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(page).toHaveURL(new RegExp(`${escaped}(\\?|$)`), { timeout: 30_000 });
}

/** Fresh context with no demo session. */
export async function expectUnauthenticated(page: Page) {
  await page.goto('/inbox');
  await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
}
