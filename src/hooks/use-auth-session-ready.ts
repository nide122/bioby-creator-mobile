import { isApiConfigured } from '@/src/api/api-config';
import { useSessionHydrated } from '@/src/hooks/use-session-hydrated';
import { useSessionStore } from '@/src/stores/session-store';

/** True once zustand (web) and JWT bootstrap (API) have finished — safe to read auth/onboarding flags. */
export function useAuthSessionReady(): boolean {
  const sessionHydrated = useSessionHydrated();
  const authBootstrapReady = useSessionStore((s) => s.authBootstrapReady);
  if (!isApiConfigured()) return sessionHydrated;
  return sessionHydrated && authBootstrapReady;
}
