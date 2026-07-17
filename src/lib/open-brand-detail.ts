import type { Href, Router } from 'expo-router';

const BRAND_PATH_RE = /^\/brand\/([^/]+)$/;

export type CrossScreenLink = {
  returnTo?: string | null;
  parentReturnTo?: string | null;
  /** Message back skips thread and goes straight to returnTo (brand timeline shortcut). */
  directReturn?: boolean;
  /** Message was opened from the thread's original-message list. */
  returnToMessages?: boolean;
};

export function brandReturnTarget(brandId: string): string {
  return `/brand/${brandId}`;
}

export function brandDetailHref(brandId: string, returnTo?: string | null): Href {
  if (!returnTo) {
    return `/brand/${brandId}` as Href;
  }
  return {
    pathname: '/brand/[brandId]',
    params: { brandId, returnTo },
  } as Href;
}

/** Resolve a return target, re-attaching parent context when returning to brand detail. */
export function resolveReturnTarget(returnTo: string, parentReturnTo?: string | null): Href {
  const brandMatch = returnTo.match(BRAND_PATH_RE);
  if (brandMatch?.[1] && parentReturnTo) {
    return brandDetailHref(brandMatch[1], parentReturnTo);
  }
  return returnTo as Href;
}

function hrefPathname(target: Href | string): string {
  if (typeof target === 'string') {
    return target.split('?')[0] || '/';
  }
  if (target && typeof target === 'object' && 'pathname' in target && typeof target.pathname === 'string') {
    return target.pathname.split('?')[0] || '/';
  }
  return '';
}

/**
 * Tab roots (Today `/`, Inbox, Deals, Account) live in a sibling navigator.
 * `dismissTo` only walks the current stack, so returning to Today from an inbox
 * thread would no-op and leave the header back button dead.
 */
export function isTabRootReturnTarget(target: Href | string): boolean {
  const path = hrefPathname(target).replace(/\/$/, '') || '/';
  return (
    path === '/' ||
    path === '/inbox' ||
    path === '/deals' ||
    path === '/account' ||
    path === '/(tabs)' ||
    path === '/(tabs)/index'
  );
}

export function isTodayHomeReturnTarget(target: Href | string): boolean {
  const path = hrefPathname(target).replace(/\/$/, '') || '/';
  return path === '/' || path === '/(tabs)' || path === '/(tabs)/index';
}

function isInboxSubtreePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/inbox' || pathname.startsWith('/inbox/');
}

/** Clear leftover inbox detail so the Inbox tab reopens on the list. */
function resetInboxTabStack(router: Pick<Router, 'replace'>) {
  // Prefer replace over dismissTo: dismiss/pop can re-enter beforeRemove handlers
  // that intercept GO_BACK/POP while returnTo is still set on the thread screen.
  router.replace('/inbox' as Href);
}

export function navigateReturnTo(
  router: Pick<Router, 'replace' | 'dismissTo' | 'canDismiss' | 'navigate'>,
  returnTo: string,
  parentReturnTo?: string | null,
  fromPathname?: string | null,
) {
  const target = resolveReturnTarget(returnTo, parentReturnTo);
  // Today is a sibling tab. Leaving an inbox thread via navigate('/') keeps the
  // thread mounted on the Inbox tab — reset that stack first, then switch tabs.
  if (isTodayHomeReturnTarget(target)) {
    if (isInboxSubtreePath(fromPathname)) {
      resetInboxTabStack(router);
    }
    router.navigate('/' as Href);
    return;
  }
  // Other tab roots: navigate so Expo Router can switch tabs.
  if (isTabRootReturnTarget(target)) {
    router.navigate(target);
    return;
  }
  if (typeof router.canDismiss === 'function' && router.canDismiss()) {
    router.dismissTo(target);
    return;
  }
  router.replace(target);
}

export function hrefWithReturnTo(path: string, returnTo: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

function crossLinkParams(link: CrossScreenLink): Record<string, string> {
  const params: Record<string, string> = {};
  if (link.returnTo) params.returnTo = link.returnTo;
  if (link.parentReturnTo) params.parentReturnTo = link.parentReturnTo;
  if (link.directReturn) params.directReturn = '1';
  if (link.returnToMessages) params.returnToMessages = '1';
  return params;
}

function normalizeCrossLink(link?: string | CrossScreenLink | null): CrossScreenLink | null {
  if (!link) return null;
  if (typeof link === 'string') return { returnTo: link };
  return link;
}

export function inboxThreadHref(threadId: string, link?: string | CrossScreenLink | null): Href {
  const normalized = normalizeCrossLink(link);
  if (!normalized?.returnTo && !normalized?.parentReturnTo) {
    return `/inbox/${threadId}` as Href;
  }
  return {
    pathname: '/inbox/[threadId]',
    params: { threadId, ...crossLinkParams({ returnTo: normalized.returnTo, parentReturnTo: normalized.parentReturnTo }) },
  } as Href;
}

export function inboxThreadMessagesHref(
  threadId: string,
  link?: string | CrossScreenLink | null,
): Href {
  const normalized = normalizeCrossLink(link);
  if (!normalized?.returnTo && !normalized?.parentReturnTo) {
    return `/inbox/${threadId}/messages` as Href;
  }
  return {
    pathname: '/inbox/[threadId]/messages',
    params: { threadId, ...crossLinkParams({ returnTo: normalized.returnTo, parentReturnTo: normalized.parentReturnTo }) },
  } as Href;
}

export function inboxMessageHref(
  messageId: string,
  threadId: string,
  link?: string | CrossScreenLink | null,
): Href {
  const normalized = normalizeCrossLink(link);
  let href = `/inbox/message/${messageId}?threadId=${encodeURIComponent(threadId)}`;
  if (normalized?.returnTo) {
    href += `&returnTo=${encodeURIComponent(normalized.returnTo)}`;
  }
  if (normalized?.parentReturnTo) {
    href += `&parentReturnTo=${encodeURIComponent(normalized.parentReturnTo)}`;
  }
  if (normalized?.directReturn) {
    href += '&directReturn=1';
  }
  if (normalized?.returnToMessages) {
    href += '&returnToMessages=1';
  }
  return href as Href;
}

export function dealHref(dealId: string, returnTo?: string | null): Href {
  const base = `/deal/${dealId}`;
  return (returnTo ? hrefWithReturnTo(base, returnTo) : base) as Href;
}

export function openBrandDetail(
  router: Pick<Router, 'push'>,
  brandId?: string | null,
  returnTo?: string | null,
) {
  if (!brandId) return;
  router.push(brandDetailHref(brandId, returnTo));
}

export function resolveInboxReturnTo(pathname: string | null | undefined): string {
  if (!pathname) return '/inbox';
  if (pathname.startsWith('/inbox/') && pathname !== '/inbox') return pathname;
  return '/inbox';
}
