import type { ThemePalette } from '@/constants/tokens';
import { leadValueBandAccent, type LeadValueBandAccent } from '@/src/lib/lead-value-band-visuals';
import type { DecisionCard } from '@/src/types/domain';

export function resolveDecisionCardBandAccent(
  card: Pick<DecisionCard, 'category' | 'leadValueBand'>,
  theme: ThemePalette
): LeadValueBandAccent | null {
  if (card.category !== 'opportunity' || !card.leadValueBand || card.leadValueBand === 'archived') {
    return null;
  }
  return leadValueBandAccent(card.leadValueBand, theme);
}

export function resolveDecisionCardBorderAccent(
  card: Pick<DecisionCard, 'category' | 'leadValueBand'>,
  categoryColor: string,
  theme: ThemePalette
): string {
  return resolveDecisionCardBandAccent(card, theme)?.dot ?? categoryColor;
}
