import type { ThemePalette } from '@/constants/tokens';
import { inboxPriorityAccent, type InboxPriorityAccent } from '@/src/lib/inbox-priority-visuals';
import { leadValueBandAccent, type LeadValueBandAccent } from '@/src/lib/lead-value-band-visuals';
import type { DecisionCard, InboxPriority } from '@/src/types/domain';

export function resolveDecisionCardBandAccent(
  card: Pick<DecisionCard, 'category' | 'leadValueBand' | 'inboxPriority'>,
  theme: ThemePalette
): LeadValueBandAccent | InboxPriorityAccent | null {
  if (card.category !== 'opportunity') {
    return null;
  }
  if (card.inboxPriority && card.inboxPriority !== 'p3') {
    return inboxPriorityAccent(card.inboxPriority, theme);
  }
  if (!card.leadValueBand || card.leadValueBand === 'archived') {
    return null;
  }
  return leadValueBandAccent(card.leadValueBand, theme);
}

export function resolveDecisionCardPriority(
  card: Pick<DecisionCard, 'category' | 'leadValueBand' | 'inboxPriority'>
): InboxPriority | null {
  if (card.category !== 'opportunity') return null;
  if (card.inboxPriority && card.inboxPriority !== 'p3') return card.inboxPriority;
  if (card.leadValueBand === 'high_value') return 'p1';
  if (card.leadValueBand === 'needs_negotiation') return 'p2';
  return null;
}

export function resolveDecisionCardBorderAccent(
  card: Pick<DecisionCard, 'category' | 'leadValueBand'>,
  categoryColor: string,
  theme: ThemePalette
): string {
  return resolveDecisionCardBandAccent(card, theme)?.dot ?? categoryColor;
}
