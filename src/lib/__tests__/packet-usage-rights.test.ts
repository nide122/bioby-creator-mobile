import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/src/i18n/locales/en.json';
import zh from '@/src/i18n/locales/zh.json';
import {
  isUsageRightsConfirmed,
  isUsageRightsTermLabel,
  usageRightsValuesFromDeliverables,
} from '@/src/lib/packet-usage-rights';

void i18n.use(initReactI18next).init({
  lng: 'zh',
  resources: { en: { translation: en }, zh: { translation: zh } },
});

describe('packet-usage-rights', () => {
  it('detects usage rights rows by API or localized label', () => {
    const t = i18n.t.bind(i18n);
    expect(isUsageRightsTermLabel('Usage rights', t)).toBe(true);
    expect(isUsageRightsTermLabel('使用权', t)).toBe(true);
    expect(isUsageRightsTermLabel('Deliverable', t)).toBe(false);
  });

  it('collects usage rights values from deliverable rows', () => {
    const t = i18n.t.bind(i18n);
    const values = usageRightsValuesFromDeliverables(
      [
        { label: 'Deliverable', value: '1 video' },
        { label: 'Usage rights', value: 'Organic · 90 days' },
        { label: '使用权', value: '品牌自有渠道 · 90 天' },
      ],
      t,
    );
    expect(values).toEqual(['Organic · 90 days', '品牌自有渠道 · 90 天']);
  });

  it('treats confirmed timestamp as confirmed state', () => {
    expect(isUsageRightsConfirmed(undefined)).toBe(false);
    expect(isUsageRightsConfirmed('   ')).toBe(false);
    expect(isUsageRightsConfirmed('2026-06-17T08:00:00.000Z')).toBe(true);
  });
});
