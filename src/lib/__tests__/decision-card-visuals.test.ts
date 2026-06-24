import { palette } from '@/constants/tokens';
import {
  resolveDecisionCardBandAccent,
  resolveDecisionCardBorderAccent,
} from '@/src/lib/decision-card-visuals';
import type { DecisionCard } from '@/src/types/domain';

const theme = palette.dark;

const highValueOpportunity: DecisionCard = {
  id: '1',
  category: 'opportunity',
  entityName: 'Brand',
  headline: 'Pitch',
  aiNote: 'Note',
  leadValueBand: 'high_value',
  actions: [],
};

const negotiationOpportunity: DecisionCard = {
  ...highValueOpportunity,
  id: '2',
  leadValueBand: 'needs_negotiation',
};

const payoutCard: DecisionCard = {
  id: '3',
  category: 'payout',
  entityName: 'Brand',
  headline: 'Release',
  aiNote: 'Note',
  leadValueBand: 'high_value',
  actions: [],
};

describe('decision-card-visuals', () => {
  it('uses mint accents for high-value opportunity cards', () => {
    const accent = resolveDecisionCardBandAccent(highValueOpportunity, theme);
    expect(accent?.iconColor).toBe(theme.accentMintStrong);
    expect(resolveDecisionCardBorderAccent(highValueOpportunity, '#5FD9FF', theme)).toBe(theme.accentMintStrong);
  });

  it('uses amber accents for negotiation opportunity cards', () => {
    const accent = resolveDecisionCardBandAccent(negotiationOpportunity, theme);
    expect(accent?.iconColor).toBe('#FACC15');
  });

  it('ignores leadValueBand on non-opportunity cards', () => {
    expect(resolveDecisionCardBandAccent(payoutCard, theme)).toBeNull();
    expect(resolveDecisionCardBorderAccent(payoutCard, '#F59E0B', theme)).toBe('#F59E0B');
  });
});
