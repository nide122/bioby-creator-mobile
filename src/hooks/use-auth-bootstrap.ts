import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { isApiConfigured } from '@/src/api/api-config';
import { hydrateSessionFromBackend } from '@/src/hooks/use-account-overview';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { prefetchMyTenants } from '@/src/hooks/use-tenants';
import { restoreSession } from '@/src/api/auth-api';
import { hasStoredSession, hydrateAuthTokensFromStorage } from '@/src/auth/token-storage';
import { useSessionStore } from '@/src/stores/session-store';

/** Restore JWT session from storage before route guards run. */
export function useAuthBootstrap(): boolean {
  const queryClient = useQueryClient();
  const applyAuthSession = useSessionStore((s) => s.applyAuthSession);
  const clearLocalSession = useSessionStore((s) => s.clearLocalSession);
  const setAuthBootstrapReady = useSessionStore((s) => s.setAuthBootstrapReady);
  const authBootstrapReady = useSessionStore((s) => s.authBootstrapReady);

  useEffect(() => {
    if (!isApiConfigured()) {
      setAuthBootstrapReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await hydrateAuthTokensFromStorage();
        if (!(await hasStoredSession())) {
          const state = useSessionStore.getState();
          if (state.isAuthenticated && !state.isLocalDemoWorkspace) {
            clearLocalSession();
          }
          return;
        }
        const session = await restoreSession();
        if (cancelled) return;

        if (session) {
          applyAuthSession(session);
          try {
            await hydrateSessionFromBackend();
            await invalidateTenantScopedQueries(queryClient);
            await queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] });
            await prefetchMyTenants(queryClient);
          } catch {
            // Keep JWT auth; overview can retry later without logging the user out.
          }
        } else if (!(await hasStoredSession())) {
          clearLocalSession();
        }
      } catch {
        if (!cancelled && !(await hasStoredSession())) {
          clearLocalSession();
        }
      } finally {
        if (!cancelled) {
          setAuthBootstrapReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyAuthSession, clearLocalSession, queryClient, setAuthBootstrapReady]);

  return authBootstrapReady;
}
