import type { Href } from 'expo-router';

export const MEDIA_KIT_HUB = '/media-kit' as Href;
export const MEDIA_KIT_EDIT = '/media-kit-edit' as Href;
export const MEDIA_KIT_PUBLIC = '/media-kit-public' as Href;
export const PRICING_ROUTE = '/pricing' as Href;
export const PRICING_EDIT_ROUTE = '/pricing-edit' as Href;
export const BATTLE_REPORTS_ROUTE = '/battle-reports' as Href;

export type AssetsRouteIntent =
  | 'openHub'
  | 'openEdit'
  | 'openPublic'
  | 'openPricing'
  | 'openBattleReportsList';

/** Routes in the creator assets / media-kit domain (excluding external tab entry points). */
export function isMediaKitSubtreePath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === '/media-kit' || pathname.startsWith('/media-kit-')) return true;
  if (pathname === '/trust-passport' || pathname === '/pricing' || pathname === '/pricing-edit') return true;
  if (pathname === '/settings/profile') return true;
  if (pathname.startsWith('/battle-reports')) return true;
  if (pathname.startsWith('/proposal/')) return true;
  return false;
}

export function isBattleReportDetailPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === 'battle-reports' && parts.length >= 2;
}

export function hrefPath(href: Href): string {
  if (typeof href === 'string') return href.split('?')[0] ?? href;
  if ('pathname' in href && typeof href.pathname === 'string') {
    return href.pathname.split('?')[0] ?? href.pathname;
  }
  return String(href);
}

export function hrefForAssetsIntent(intent: AssetsRouteIntent): Href {
  switch (intent) {
    case 'openHub':
      return MEDIA_KIT_HUB;
    case 'openEdit':
      return MEDIA_KIT_EDIT;
    case 'openPublic':
      return MEDIA_KIT_PUBLIC;
    case 'openPricing':
      return PRICING_ROUTE;
    case 'openBattleReportsList':
      return BATTLE_REPORTS_ROUTE;
  }
}

export type AssetsNavigationAction = 'push' | 'dismissTo' | 'noop';

export function resolveAssetsRouteAction(
  currentPathname: string,
  intent: AssetsRouteIntent,
): AssetsNavigationAction {
  switch (intent) {
    case 'openHub':
      if (currentPathname === '/media-kit') return 'noop';
      if (isMediaKitSubtreePath(currentPathname)) return 'dismissTo';
      return 'push';
    case 'openEdit':
      if (currentPathname === '/media-kit-edit') return 'noop';
      if (isMediaKitSubtreePath(currentPathname)) return 'dismissTo';
      return 'push';
    case 'openPublic':
      if (currentPathname === '/media-kit-public') return 'noop';
      return 'push';
    case 'openPricing':
      if (currentPathname === '/pricing') return 'noop';
      return 'push';
    case 'openBattleReportsList':
      if (currentPathname === '/battle-reports') return 'noop';
      if (isBattleReportDetailPath(currentPathname)) return 'dismissTo';
      return 'push';
    default:
      return 'push';
  }
}

/** Resolve navigation for known cross-links inside the assets domain. */
export function resolveAssetsHrefAction(currentPathname: string, href: Href): AssetsNavigationAction {
  const target = hrefPath(href);

  if (target === '/media-kit') {
    return resolveAssetsRouteAction(currentPathname, 'openHub');
  }
  if (target === '/media-kit-edit') {
    return resolveAssetsRouteAction(currentPathname, 'openEdit');
  }
  if (target === '/battle-reports') {
    return resolveAssetsRouteAction(currentPathname, 'openBattleReportsList');
  }

  return 'push';
}
