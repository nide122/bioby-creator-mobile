import i18n from '@/src/i18n';

import { localizeDealSummaryCopy, localizePacketTermLabel, localizePayoutHint } from '@/src/lib/deal-copy-i18n';
import type { DealSummary } from '@/src/types/domain';

function deal(overrides: Partial<DealSummary> & Pick<DealSummary, 'id' | 'escrowPhase'>): DealSummary {
  return {
    brandPlaceholder: 'Brand',
    title: 'Deal',
    source: 'self',
    ...overrides,
  };
}

describe('deal-copy-i18n', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('localizes backend milestone copy by fingerprint', () => {
    const row = deal({
      id: '1',
      escrowPhase: 'awaiting_prepay',
      nextMilestone: 'Collect prepay before production starts.',
    });
    expect(localizeDealSummaryCopy(row, i18n.t.bind(i18n)).nextMilestone).toBe('开拍前先收取预付款。');
  });

  it('falls back to phase milestone when text is unknown', () => {
    const row = deal({
      id: '1',
      escrowPhase: 'in_execution',
      nextMilestone: 'Some unknown API milestone',
    });
    expect(localizeDealSummaryCopy(row, i18n.t.bind(i18n)).nextMilestone).toBe('按合同包继续交付。');
  });

  it('localizes packet term labels from backend English', () => {
    expect(localizePacketTermLabel('Deliverables', i18n.t.bind(i18n))).toBe('交付物');
    expect(localizePacketTermLabel('Usage rights', i18n.t.bind(i18n))).toBe('使用权');
  });

  it('localizes payout hints with budget template', () => {
    expect(
      localizePayoutHint('Remaining balance releases after verification. Budget signal: $3,500.', i18n.t.bind(i18n))
    ).toBe('验收通过后释放尾款。预算参考：$3,500。');
  });
});
