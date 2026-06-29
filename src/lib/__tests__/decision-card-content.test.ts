import {
  decisionCardBrandLabel,
  formatDecisionQueuePreviewLines,
  formatDecisionQueuePreviewSubtitle,
  parseDecisionSourceHint,
  resolveDecisionCardDisplay,
  resolveDecisionPrimaryAction,
  resolveDecisionUrgencyLabel,
} from '@/src/lib/decision-card-content';
import type { DecisionCard } from '@/src/types/domain';

const payoutCard: DecisionCard = {
  id: 'payout',
  category: 'payout',
  entityName: 'TrailPeak Gear',
  headline: 'Release $3,200',
  aiNote: 'Upload publish proof to release escrow.',
  amountLabel: '$3,200',
  sourceHint: 'Deal · Camping light unboxing',
  actions: [{ id: 'upload', label: 'Upload proof', style: 'primary' }],
};

const opportunityCard: DecisionCard = {
  id: 'opp',
  category: 'opportunity',
  entityName: 'ClearSkin Lab',
  headline: 'Decide on ClearSkin Lab pitch',
  aiNote: 'High-value brief with claims review window.',
  urgencyNote: 'Needs attention today',
  interruptReason: 'Confirm budget before quoting.',
  sourceHint: 'Inbox · 2 short videos | Claims need pre-review',
  actions: [{ id: 'open', label: 'Open thread', style: 'primary' }],
};

describe('decision-card-content', () => {
  it('parses source hints into prefix and detail', () => {
    expect(parseDecisionSourceHint('Deal · Camping light unboxing')).toEqual({
      prefix: 'Deal',
      detail: 'Camping light unboxing',
    });
  });

  it('decisionCardBrandLabel mirrors inbox claimedBrandName for opportunities', () => {
    expect(
      decisionCardBrandLabel({
        category: 'opportunity',
        claimedBrandName: '某护肤品牌',
      }),
    ).toBe('某护肤品牌');
    expect(
      decisionCardBrandLabel({
        category: 'payout',
        claimedBrandName: '某护肤品牌',
      }),
    ).toBeNull();
  });

  it('surfaces brand, subject, and primary action for opportunities', () => {
    const display = resolveDecisionCardDisplay(opportunityCard);
    expect(display.brand).toBe('ClearSkin Lab');
    expect(display.subject).toBe('2 short videos | Claims need pre-review');
    expect(display.actionSummary).toBeUndefined();
    expect(display.primaryAction?.label).toBe('Open thread');
    expect(display.urgencyLabel).toBe('Needs attention today');
  });

  it('keeps payout headline as action summary when source has deal title', () => {
    const display = resolveDecisionCardDisplay(payoutCard);
    expect(display.subject).toBe('Camping light unboxing');
    expect(display.actionSummary).toBe('Release $3,200');
    expect(resolveDecisionPrimaryAction(payoutCard)?.label).toBe('Upload proof');
  });

  it('prefers urgencyNote over interruptReason', () => {
    expect(resolveDecisionUrgencyLabel(opportunityCard)).toBe('Needs attention today');
    expect(
      resolveDecisionUrgencyLabel({
        ...opportunityCard,
        urgencyNote: undefined,
      })
    ).toBe('Confirm budget before quoting.');
  });

  it('builds queue preview subtitles with brand, subject, and next step', () => {
    expect(formatDecisionQueuePreviewSubtitle(opportunityCard, 'Open thread')).toBe(
      'ClearSkin Lab · 2 short videos | Claims need pre-review · Open thread'
    );
    expect(formatDecisionQueuePreviewLines(opportunityCard)).toEqual({
      title: 'ClearSkin Lab',
      subtitle: '2 short videos | Claims need pre-review · Open thread · Needs attention today',
    });
  });

  it('suppresses generic draft review headlines from action summary', () => {
    const draftCard: DecisionCard = {
      id: 'draft',
      category: 'approval',
      entityName: 'Glow Recipe',
      headline: 'Review reply draft',
      aiNote: 'Needs approval.',
      sourceHint: 'Draft · TikTok · Watermelon serum launch',
      actions: [{ id: 'review', label: 'Review draft', style: 'primary' }],
    };
    const display = resolveDecisionCardDisplay(draftCard);
    expect(display.brand).toBe('Glow Recipe');
    expect(display.subject).toBe('TikTok · Watermelon serum launch');
    expect(display.actionSummary).toBeUndefined();
  });
});
