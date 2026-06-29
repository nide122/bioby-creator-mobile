import en from '@/src/i18n/locales/en.json';
import zh from '@/src/i18n/locales/zh.json';
import { normalizeLocale } from '@/src/i18n';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe('i18n locales', () => {
  it('maps system language to supported app locales', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh');
    expect(normalizeLocale('zh-Hans')).toBe('zh');
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
  });

  it('keeps en and zh translation keys in sync', () => {
    const enKeys = new Set(flattenKeys(en as Record<string, unknown>));
    const zhKeys = new Set(flattenKeys(zh as Record<string, unknown>));

    const missingInZh = [...enKeys].filter((k) => !zhKeys.has(k));
    const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));

    expect(missingInZh).toEqual([]);
    expect(missingInEn).toEqual([]);
  });
});
