import { apiLanguageHeader } from '@/src/i18n';
import { updateTenantSettings } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useSessionStore } from '@/src/stores/session-store';

/** Persist app language to tenant settings so async brief jobs use the same locale. */
export async function syncTenantPreferredLocale(): Promise<void> {
  if (!shouldUseBackendApi() || !useSessionStore.getState().isAuthenticated) {
    return;
  }
  await updateTenantSettings({ preferredLocale: apiLanguageHeader() });
}
