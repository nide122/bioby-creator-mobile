import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { type AppLocale, readDeviceLocale } from '@/src/i18n';
import { syncTenantPreferredLocale } from '@/src/lib/sync-tenant-locale';

/** `system` follows the device / OS language. */
export type LanguagePreference = 'system' | AppLocale;

export function resolveLanguagePreference(pref: LanguagePreference): AppLocale {
  if (pref === 'system') return readDeviceLocale();
  return pref;
}

type LocaleState = {
  languagePreference: LanguagePreference;
  /** After first persist round-trip; also set when the user changes language in settings. */
  localeDefaultsMigrated: boolean;
  /** True after the user picks a language in account settings (welcome bootstrap does not set this). */
  hasManualLanguagePreference: boolean;
  /** Match device locale on welcome when the user has not chosen a language in settings. */
  applyWelcomeSystemLanguage: () => Promise<void>;
  setLanguagePreference: (next: LanguagePreference) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      languagePreference: 'en',
      localeDefaultsMigrated: false,
      hasManualLanguagePreference: false,
      applyWelcomeSystemLanguage: async () => {
        if (get().hasManualLanguagePreference) {
          return;
        }
        const deviceLocale = readDeviceLocale();
        await i18n.changeLanguage(deviceLocale);
        set({ languagePreference: deviceLocale, localeDefaultsMigrated: true });
        await syncTenantPreferredLocale();
      },
      setLanguagePreference: (next) => {
        void (async () => {
          await i18n.changeLanguage(resolveLanguagePreference(next));
          set({
            languagePreference: next,
            localeDefaultsMigrated: true,
            hasManualLanguagePreference: true,
          });
          await syncTenantPreferredLocale();
        })();
      },
    }),
    {
      name: 'bioby-locale-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        languagePreference: s.languagePreference,
        localeDefaultsMigrated: s.localeDefaultsMigrated,
        hasManualLanguagePreference: s.hasManualLanguagePreference,
      }),
      merge: (persistedState, currentState) => {
        const p = persistedState as
          | {
              locale?: AppLocale;
              languagePreference?: LanguagePreference;
              localeDefaultsMigrated?: boolean;
              hasManualLanguagePreference?: boolean;
            }
          | undefined;

        let languagePreference = currentState.languagePreference;
        if (
          p?.languagePreference === 'system' ||
          p?.languagePreference === 'zh' ||
          p?.languagePreference === 'en'
        ) {
          languagePreference = p.languagePreference;
        } else if (p?.locale === 'zh' || p?.locale === 'en') {
          languagePreference = p.locale;
        }

        let hasManualLanguagePreference = p?.hasManualLanguagePreference ?? false;
        if (!hasManualLanguagePreference && p?.localeDefaultsMigrated) {
          if (languagePreference === 'zh' || languagePreference === 'system') {
            hasManualLanguagePreference = true;
          }
        }

        return {
          ...currentState,
          languagePreference,
          localeDefaultsMigrated: true,
          hasManualLanguagePreference,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.languagePreference != null) {
          void i18n.changeLanguage(resolveLanguagePreference(state.languagePreference));
        }
      },
    }
  )
);

/** Run after AsyncStorage rehydrate so welcome bootstrap respects persisted manual choice. */
export function runAfterLocaleHydration(run: () => void): () => void {
  const persistApi = useLocaleStore.persist;
  if (persistApi.hasHydrated()) {
    run();
    return () => {};
  }
  return persistApi.onFinishHydration(run);
}
