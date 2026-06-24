import type { TFunction } from 'i18next';

const NEXT_ACTION_KEYS: Record<string, string> = {
  'inboxPriority.nextAction.replyToday': 'inboxPriority.nextAction.replyToday',
  'inboxPriority.nextAction.reviewContract': 'inboxPriority.nextAction.reviewContract',
  'inboxPriority.nextAction.reviewOpportunity': 'inboxPriority.nextAction.reviewOpportunity',
  'inboxPriority.nextAction.sendQuote': 'inboxPriority.nextAction.sendQuote',
  'inboxPriority.nextAction.clarifyBudget': 'inboxPriority.nextAction.clarifyBudget',
  'inboxPriority.nextAction.reviewWhenFree': 'inboxPriority.nextAction.reviewWhenFree',
};

/** Translate backend nextActionLabel keys; pass through legacy free-text labels. */
export function translateInboxNextAction(t: TFunction, label: string | undefined): string | undefined {
  if (!label?.trim()) return label;
  const trimmed = label.trim();
  const key = NEXT_ACTION_KEYS[trimmed];
  if (key) return t(key);
  return trimmed;
}
