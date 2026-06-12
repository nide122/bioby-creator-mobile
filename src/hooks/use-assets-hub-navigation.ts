import { useCallback } from 'react';
import { type Href, usePathname, useRouter } from 'expo-router';

import {
  hrefForAssetsIntent,
  resolveAssetsHrefAction,
  resolveAssetsRouteAction,
  type AssetsRouteIntent,
} from '@/src/lib/assets-hub-navigation';

export function useAssetsHubNavigation() {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const navigateIntent = useCallback(
    (intent: AssetsRouteIntent) => {
      const href = hrefForAssetsIntent(intent);
      const action = resolveAssetsRouteAction(pathname, intent);
      if (action === 'noop') return;
      if (action === 'dismissTo') {
        router.dismissTo(href);
        return;
      }
      router.push(href);
    },
    [pathname, router],
  );

  const navigateHref = useCallback(
    (href: Href) => {
      const action = resolveAssetsHrefAction(pathname, href);
      if (action === 'noop') return;
      if (action === 'dismissTo') {
        router.dismissTo(href);
        return;
      }
      router.push(href);
    },
    [pathname, router],
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  return {
    openMediaKit: () => navigateIntent('openHub'),
    openMediaKitEdit: () => navigateIntent('openEdit'),
    openMediaKitPublic: () => navigateIntent('openPublic'),
    openPricing: () => navigateIntent('openPricing'),
    openBattleReportsList: () => navigateIntent('openBattleReportsList'),
    navigateHref,
    goBack,
  };
}
