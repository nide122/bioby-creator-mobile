import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchMockDecisions } from '@/src/api/mock-decisions';
import { asLeadValueBand, asInboxPriority, parseRiskFlags } from '@/src/api/opportunity-mappers';
import type { DecisionActionView, DecisionCardView, TodayDecisionsResponse } from '@/src/types/api';
import type { DecisionAction, DecisionCard, DecisionCategory } from '@/src/types/domain';

const CATEGORIES: DecisionCategory[] = [
  'payout',
  'opportunity',
  'approval',
  'delivery',
  'verification',
];

function asCategory(value: string | undefined): DecisionCategory {
  return value && CATEGORIES.includes(value as DecisionCategory) ? (value as DecisionCategory) : 'approval';
}

function mapCard(dto: DecisionCardView): DecisionCard {
  return {
    id: dto.id ?? '',
    estimatedMinutes: dto.estimatedMinutes ?? undefined,
    category: asCategory(dto.category),
    entityName: dto.entityName ?? '',
    claimedBrandName: dto.claimedBrandName ?? undefined,
    headline: dto.headline ?? '',
    aiNote: dto.aiNote ?? '',
    urgencyNote: dto.urgencyNote ?? undefined,
    interruptReason: dto.interruptReason ?? undefined,
    amountLabel: dto.amountLabel ?? undefined,
    sourceHint: dto.sourceHint ?? undefined,
    sourceHref: dto.sourceHref ?? undefined,
    leadValueBand: asLeadValueBand(dto.leadValueBand),
    inboxPriority: asInboxPriority(dto.inboxPriority ?? undefined),
    contractRiskFlags: parseRiskFlags(dto.contractRiskFlags),
    actions: (dto.actions ?? []).map(
      (a: DecisionActionView): DecisionAction => ({
        id: a.id ?? '',
        label: a.label ?? '',
        style: (a.style as DecisionAction['style']) ?? 'ghost',
        href: a.href ?? undefined,
      }),
    ),
  };
}

export async function fetchTodayDecisions(): Promise<{
  cards: DecisionCard[];
  totalEstimatedMinutes: number;
  hiddenOpportunityCount: number;
}> {
  if (!shouldUseBackendApi()) {
    const cards = await fetchMockDecisions();
    return {
      cards,
      totalEstimatedMinutes: cards.reduce((sum, card) => sum + (card.estimatedMinutes ?? 0), 0),
      hiddenOpportunityCount: 0,
    };
  }
  const res = await apiRequest<TodayDecisionsResponse>('/api/v1/decisions/today');
  return {
    cards: (res.items ?? []).map(mapCard),
    totalEstimatedMinutes: res.totalEstimatedMinutes ?? 0,
    hiddenOpportunityCount: res.hiddenOpportunityCount ?? 0,
  };
}

export function isServerDecisionId(id: string): boolean {
  return /^\d+$/.test(id);
}

export async function completeDecision(id: string): Promise<void> {
  if (!shouldUseBackendApi() || !isServerDecisionId(id)) return;
  await apiRequest(`/api/v1/decisions/${id}/complete`, { method: 'POST' });
}

export async function snoozeDecision(id: string, days = 1): Promise<void> {
  if (!shouldUseBackendApi() || !isServerDecisionId(id)) return;
  await apiRequest(`/api/v1/decisions/${id}/snooze`, {
    method: 'POST',
    body: { days },
  });
}
