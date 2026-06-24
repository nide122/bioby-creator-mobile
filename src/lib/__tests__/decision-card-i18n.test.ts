import i18n from '@/src/i18n';

import {
  formatLocalizedDecisionQueuePreviewLines,
  getLocalizedDecisionPresentation,
  localizeDecisionCard,
  localizeDecisionHeadline,
  localizeDecisionSourceHint,
} from '@/src/lib/decision-card-i18n';
import type { DecisionCard } from '@/src/types/domain';

const opportunityCard: DecisionCard = {
  id: 'opp',
  category: 'opportunity',
  entityName: 'ClearSkin Lab',
  headline: 'Decide on ClearSkin Lab pitch',
  aiNote: 'Broad usage or remix terms detected',
  urgencyNote: 'Needs attention today',
  interruptReason: 'Long-term use + remix edits',
  sourceHint: 'Inbox · 2 short videos | Claims need pre-review',
  actions: [
    { id: 'open', label: 'Open thread', style: 'primary' },
    { id: 'later', label: 'Snooze', style: 'ghost' },
  ],
};

const payoutCard: DecisionCard = {
  id: 'payout',
  category: 'payout',
  entityName: 'TrailPeak Gear',
  headline: 'Release $3,200',
  aiNote: 'Upload publish proof to release escrow.',
  urgencyNote: 'Payout blocked until proof',
  amountLabel: '$3,200',
  sourceHint: 'Deal · Camping light unboxing',
  actions: [
    { id: 'upload', label: 'Upload proof', style: 'primary' },
    { id: 'later', label: 'Snooze', style: 'ghost' },
  ],
};

describe('decision-card-i18n', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('localizes backend opportunity headlines and action labels', () => {
    const localized = localizeDecisionCard(opportunityCard, i18n.t.bind(i18n));
    expect(localized.headline).toBe('决定 ClearSkin Lab 的商机');
    expect(localized.aiNote).toBe('检测到宽泛授权或二次剪辑条款');
    expect(localized.urgencyNote).toBe('今天需要处理');
    expect(localized.actions[0].label).toBe('打开邮件');
    expect(localized.actions[1].label).toBe('推迟');
  });

  it('localizes payout card copy and source prefix', () => {
    expect(localizeDecisionHeadline(payoutCard.headline, payoutCard, i18n.t.bind(i18n))).toBe('释放 $3,200');
    expect(localizeDecisionSourceHint(payoutCard.sourceHint, i18n.t.bind(i18n))).toBe('合作 · Camping light unboxing');
    const localized = localizeDecisionCard(payoutCard, i18n.t.bind(i18n));
    expect(localized.aiNote).toBe('上传发布证明以释放托管款。');
    expect(localized.actions[0].label).toBe('上传证明');
  });

  it('localizes queue preview lines from English API payloads', () => {
    const preview = formatLocalizedDecisionQueuePreviewLines(opportunityCard, i18n.t.bind(i18n));
    expect(preview.title).toBe('2 short videos | Claims need pre-review');
    expect(preview.subtitle).toBe('ClearSkin Lab · 打开邮件 · 今天需要处理');
  });

  it('localizes presentation urgency without breaking subject extraction', () => {
    const { display } = getLocalizedDecisionPresentation(opportunityCard, i18n.t.bind(i18n));
    expect(display.subject).toBe('2 short videos | Claims need pre-review');
    expect(display.urgencyLabel).toBe('今天需要处理');
    expect(display.primaryAction?.label).toBe('打开邮件');
  });
});
