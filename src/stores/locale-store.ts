import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { type AppLocale, readDeviceLocale } from '@/src/i18n';

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
  setLanguagePreference: (next: LanguagePreference) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      languagePreference: 'en',
      localeDefaultsMigrated: false,
      setLanguagePreference: (next) => {
        void i18n.changeLanguage(resolveLanguagePreference(next));
        set({ languagePreference: next, localeDefaultsMigrated: true });
      },
    }),
    {
      name: 'bioby-locale-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        languagePreference: s.languagePreference,
        localeDefaultsMigrated: s.localeDefaultsMigrated,
      }),
      merge: (persistedState, currentState) => {
        const p = persistedState as
          | {
              locale?: AppLocale;
              languagePreference?: LanguagePreference;
              localeDefaultsMigrated?: boolean;
            }
          | undefined;

        if (p?.localeDefaultsMigrated) {
          let languagePreference = currentState.languagePreference;
          if (
            p.languagePreference === 'system' ||
            p.languagePreference === 'zh' ||
            p.languagePreference === 'en'
          ) {
            languagePreference = p.languagePreference;
          }
          return { ...currentState, languagePreference, localeDefaultsMigrated: true };
        }

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
        // One-time: legacy "follow system" implied Chinese on zh-CN devices; product default is English (welcome etc.).
        if (languagePreference === 'system') {
          languagePreference = 'en';
        }
        return { ...currentState, languagePreference, localeDefaultsMigrated: true };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.languagePreference != null) {
          void i18n.changeLanguage(resolveLanguagePreference(state.languagePreference));
        }
      },
    }
  )
);
