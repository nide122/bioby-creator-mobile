import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/src/i18n/locales/en.json';
import zh from '@/src/i18n/locales/zh.json';
import { buildPlainPriorityExplain } from '@/src/lib/priority-breakdown';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: 'zh',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const t = i18n.t.bind(i18n);

describe('buildPlainPriorityExplain', () => {
  it('covers value, match dimensions, and order without duplicate prose', () => {
    const explain = buildPlainPriorityExplain({
      t,
      inboxPriority: 'p1',
      leadValueBand: 'high_value',
      dealEconomics: {
        quoteUsd: 3800,
        expectedFloorUsd: 2000,
        expectedTargetUsd: 3000,
        economicMarginUsd: 1800,
        unitCount: 1,
        budgetCertainty: 'firm',
        rateCardMatched: true,
      },
      breakdown: {
        brandFit: 82,
        budgetValue: 70,
        timelineUrgency: 75,
        relationshipValue: 72,
        effort: 20,
        risk: 30,
      },
    });

    expect(explain?.tierLabel).toBe('高价值合作');
    expect(explain?.sections.map((section) => section.title)).toEqual(['报价', '匹配与风险', '同档排序']);

    const value = explain?.sections[0].lines[0] ?? '';
    expect(value).toContain('$3,800');
    expect(value).toContain('$3,000');
    expect(value).toContain('$800');
    expect(value).not.toContain('$1,800');

    const match = explain?.sections[1].lines ?? [];
    expect(match).toHaveLength(4);
    expect(match[0]).toContain('较合拍');
    expect(match[1]).toContain('较紧');
    expect(match[2]).toContain('往来');
    expect(match[3]).toContain('较低');

    expect(explain?.sections[2].lines[0]).toContain('$1,800');
    expect(explain?.sections[2].lines[0]).toContain('匹配与风险');
  });

  it('says above target even when priority is still P2', () => {
    const explain = buildPlainPriorityExplain({
      t,
      inboxPriority: 'p2',
      leadValueBand: 'needs_negotiation',
      dealEconomics: {
        quoteUsd: 2500,
        expectedFloorUsd: 1500,
        expectedTargetUsd: 2250,
        economicMarginUsd: 1000,
        unitCount: 1,
        budgetCertainty: 'firm',
        rateCardMatched: true,
      },
      breakdown: {
        brandFit: 55,
        budgetValue: 60,
        timelineUrgency: 40,
        relationshipValue: 45,
        effort: 10,
        risk: 20,
      },
    });

    const value = explain?.sections[0].lines[0] ?? '';
    expect(value).toContain('$2,500');
    expect(value).toContain('$2,250');
    expect(value).toContain('高于');
    expect(value).not.toContain('之间');
  });

  it('shows urgency section for P0', () => {
    const explain = buildPlainPriorityExplain({
      t,
      inboxPriority: 'p0',
      assessment: {
        urgencySummaryParams: { deadlineHint: '周五前回复', hoursRemaining: 24 },
      },
      breakdown: {
        brandFit: 50,
        budgetValue: 50,
        timelineUrgency: 90,
        relationshipValue: 20,
        effort: 10,
        risk: 10,
      },
    });

    expect(explain?.sections[0].title).toBe('紧急程度');
    expect(explain?.sections[0].lines[0]).toContain('周五前回复');
    expect(explain?.sections.some((section) => section.title === '匹配与风险')).toBe(true);
  });
});
