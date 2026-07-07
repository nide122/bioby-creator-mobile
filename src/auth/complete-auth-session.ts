import type { AuthSession } from '@/src/api/auth-types';
import { hydrateSessionFromBackend } from '@/src/hooks/use-account-overview';
import { syncTenantPreferredLocaleAfterAuth } from '@/src/lib/sync-tenant-locale';
import { useSessionStore } from '@/src/stores/session-store';

/** Apply JWT session then restore onboarding progress from the backend. */
export async function completeAuthSession(session: AuthSession): Promise<void> {
  useSessionStore.getState().applyAuthSession(session);
  try {
    await hydrateSessionFromBackend();
  } catch {
    // Keep JWT auth; overview can retry later without sending the user back to welcome.
  }
  try {
    await syncTenantPreferredLocaleAfterAuth();
  } catch {
    // Locale sync is best-effort; inbox jobs can retry on next language change.
  }
}
