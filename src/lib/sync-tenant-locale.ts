import { apiLanguageHeader, default as i18n } from '@/src/i18n';
import { updateTenantSettings } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { resolveLanguagePreference, useLocaleStore } from '@/src/stores/locale-store';
import { useSessionStore } from '@/src/stores/session-store';

function waitForLocaleStoreHydration(): Promise<void> {
  const persistApi = useLocaleStore.persist;
  if (persistApi.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsubscribe = persistApi.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/** Align i18n with persisted preference (or welcome bootstrap) before syncing to the server. */
export async function ensureResolvedAppLanguage(): Promise<void> {
  await waitForLocaleStoreHydration();
  const preference = useLocaleStore.getState().languagePreference;
  await i18n.changeLanguage(resolveLanguagePreference(preference));
}

/** Persist app language to tenant settings so async brief jobs use the same locale. */
export async function syncTenantPreferredLocale(): Promise<void> {
  if (!shouldUseBackendApi() || !useSessionStore.getState().isAuthenticated) {
    return;
  }
  try {
    await updateTenantSettings({ preferredLocale: apiLanguageHeader() });
  } catch {
    // Locale sync is best-effort and should not block the current screen.
  }
}

/**
 * After login or JWT restore: resolve the real UI language, then tell the server.
 * Avoids syncing the default English before AsyncStorage rehydrates.
 */
export async function syncTenantPreferredLocaleAfterAuth(): Promise<void> {
  if (!shouldUseBackendApi() || !useSessionStore.getState().isAuthenticated) {
    return;
  }
  await ensureResolvedAppLanguage();
  await syncTenantPreferredLocale();
}
