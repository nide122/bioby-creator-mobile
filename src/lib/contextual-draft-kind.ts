import type { DraftKind, InboxThread } from '@/src/types/domain';
import { isUnclearBudgetLabel } from '@/src/lib/inbox-detail-labels';

export type ContextualDraftKind = Extract<
  DraftKind,
  'clarify_budget' | 'counter_offer' | 'ack_and_schedule'
>;

function hasReason(
  reasons: InboxThread['actionReasons'],
  code: string
): boolean {
  return reasons?.some((reason) => reason.code === code) ?? false;
}

/** Mirrors backend ContextualDraftComposer.suggestedKind. */
export function suggestedContextualDraftKind(thread: Pick<
  InboxThread,
  'actionReasons' | 'leadValueBand' | 'budgetLabel'
>): ContextualDraftKind {
  if (
    hasReason(thread.actionReasons, 'MISSING_BUDGET') ||
    isUnclearBudgetLabel(thread.budgetLabel)
  ) {
    return 'clarify_budget';
  }
  if (
    hasReason(thread.actionReasons, 'BELOW_FLOOR_RATE') ||
    hasReason(thread.actionReasons, 'NEAR_FLOOR_RATE') ||
    thread.leadValueBand === 'needs_negotiation'
  ) {
    return 'counter_offer';
  }
  return 'ack_and_schedule';
}

export function contextualDraftCtaI18nKey(kind: ContextualDraftKind): string {
  return `inboxThreadDetail.cta${kind
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;
}

export function contextualDraftIcon(kind: ContextualDraftKind): keyof typeof import('@expo/vector-icons/Ionicons').default.glyphMap {
  switch (kind) {
    case 'clarify_budget':
      return 'help-circle-outline';
    case 'counter_offer':
      return 'swap-horizontal-outline';
    case 'ack_and_schedule':
      return 'calendar-outline';
  }
}
