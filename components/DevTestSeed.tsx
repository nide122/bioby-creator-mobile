import { type Href, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { enterDemoWorkspace } from '@/src/auth/enter-demo-workspace';
import { setMockRateCardPackagesForTest } from '@/src/api/mock-growth';
import { queryClient } from '@/src/lib/query-client';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import type { RateCardPackage } from '@/src/types/domain';

declare global {
  interface Window {
    /** Web dev / Playwright: client-side navigation without full reload. */
    __BIOBY_DEV_NAVIGATE__?: (path: string) => void;
    /** Web dev / Playwright: seed mock rate-card packages and refresh queries. */
    __BIOBY_DEV_SET_RATE_CARDS__?: (packages: RateCardPackage[]) => Promise<void>;
  }
}

function isAuthEntryPath(pathname: string): boolean {
  return (
    pathname === '/welcome' ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/login')
  );
}

function isTestWorkspaceEnabled(flag: string | string[] | undefined): boolean {
  if (flag === '1' || flag === 'true') return true;
  if (Array.isArray(flag) && (flag[0] === '1' || flag[0] === 'true')) return true;
  if (typeof window !== 'undefined') {
    const qs = new URL(window.location.href).searchParams.get('testWorkspace');
    return qs === '1' || qs === 'true';
  }
  return false;
}

/**
 * Web E2E helper: `?testWorkspace=1` seeds demo session without relying on Pressable clicks.
 * Only active in __DEV__ on web.
 */
export function DevTestSeed() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ testWorkspace?: string | string[] }>();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return;

    window.__BIOBY_DEV_NAVIGATE__ = (path: string) => {
      router.push(path as Href);
    };

    window.__BIOBY_DEV_SET_RATE_CARDS__ = async (packages) => {
      setMockRateCardPackagesForTest(packages);
      await invalidateTenantScopedQueries(queryClient);
    };

    return () => {
      delete window.__BIOBY_DEV_NAVIGATE__;
      delete window.__BIOBY_DEV_SET_RATE_CARDS__;
    };
  }, [router]);

  useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'web') return;
    if (appliedRef.current) return;
    if (!isTestWorkspaceEnabled(params.testWorkspace)) return;

    appliedRef.current = true;
    void enterDemoWorkspace().then(() => {
      if (!isAuthEntryPath(pathname ?? '')) return;
      requestAnimationFrame(() => {
        router.replace('/inbox' as Href);
      });
    });
  }, [params.testWorkspace, pathname, router]);

  return null;
}
