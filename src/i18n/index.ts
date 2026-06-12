import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';

export const APP_LOCALES = ['en', 'zh'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export function normalizeLocale(tag: string | undefined | null): AppLocale {
  const t = tag?.toLowerCase() ?? 'en';
  if (t.startsWith('zh')) return 'zh';
  return 'en';
}

/** Re-read device locale (e.g. after app resume or system settings change). */
export function readDeviceLocale(): AppLocale {
  return normalizeLocale(Localization.getLocales()[0]?.languageTag);
}

const primaryTag = Localization.getLocales()[0]?.languageTag;
export const deviceLocale: AppLocale = normalizeLocale(primaryTag);

/** BCP 47-ish tag for `Date#toLocaleTimeString` etc. */
export function calendarLocaleTagForLanguage(lang: string): string {
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US';
}

/** BCP 47 tag for API `Accept-Language` (matches backend locale resolution). */
export function apiLanguageHeader(): string {
  return i18n.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  /** Cold start baseline; persisted preference applies after locale store rehydration (default is English). */
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
});

export default i18n;
