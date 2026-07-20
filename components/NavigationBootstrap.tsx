import { type Href, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuthBootstrap } from '@/src/hooks/use-auth-bootstrap';
import { useSessionHydrated } from '@/src/hooks/use-session-hydrated';
import { getRouteGuardRedirect, hasWebOAuthCallbackInUrl } from '@/src/lib/route-guard';
import { useSessionStore } from '@/src/stores/session-store';

/**
 * 全局路由守卫（无 API 版本）：
 * - 未登录 → 产品介绍 /intro、登录落地页 /home 与认证路由 /register /login
 * - 已登录未完成入驻 → 强制回到 `/onboarding` 分发器
 * - 已登录已完成入驻 → 误入认证页时送回 Today；允许自愿回访 onboarding 子页完善邮箱
 */
export function NavigationBootstrap() {
  const router = useRouter();
  const pathname = usePathname();
  const hasMountedRef = useRef(false);
  const sessionHydrated = useSessionHydrated();
  const authBootstrapReady = useAuthBootstrap();

  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const onboardingComplete = useSessionStore((s) => s.onboardingComplete);
  const publicDemo = useSessionStore((s) => s.demoWorkspaceKind === 'public');

  useEffect(() => {
    hasMountedRef.current = true;
    return () => {
      hasMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionHydrated || !authBootstrapReady) return;

    const webOAuthCallbackInProgress =
      typeof window !== 'undefined' &&
      hasWebOAuthCallbackInUrl(window.location.search, window.location.hash);

    const redirect = getRouteGuardRedirect({
      pathname: pathname ?? '',
      isAuthenticated,
      onboardingComplete,
      publicDemo,
      webOAuthCallbackInProgress,
    });
    if (!redirect) return;

    requestAnimationFrame(() => {
      if (!hasMountedRef.current) return;
      router.replace(redirect as Href);
    });
  }, [isAuthenticated, onboardingComplete, pathname, publicDemo, router, sessionHydrated, authBootstrapReady]);

  return null;
}
