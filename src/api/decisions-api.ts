import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchMockDecisions } from '@/src/api/mock-decisions';
import { asLeadValueBand, asInboxPriority, parseRiskFlags } from '@/src/api/opportunity-mappers';
import type { DecisionAction, DecisionCard, DecisionCategory } from '@/src/types/domain';

type DecisionActionDto = {
  id: string;
  label: string;
  style?: string | null;
  href?: string | null;
};

type DecisionCardDto = {
  id: string;
  category: string;
  entityName: string;
  headline: string;
  aiNote: string;
  urgencyNote?: string | null;
  interruptReason?: string | null;
  amountLabel?: string | null;
  sourceHint?: string | null;
  sourceHref?: string | null;
  /** @deprecated Prefer inboxPriority. Kept for legacy clients. */
  leadValueBand?: string | null;
  inboxPriority?: 'p0' | 'p1' | 'p2' | 'p3' | null;
  contractRiskFlags?: unknown;
  actions: DecisionActionDto[];
};

type TodayDecisionsResponse = {
  items: DecisionCardDto[];
  totalEstimatedMinutes: number;
};

const CATEGORIES: DecisionCategory[] = [
  'payout',
  'opportunity',
  'approval',
  'delivery',
  'verification',
];

function asCategory(value: string): DecisionCategory {
  return CATEGORIES.includes(value as DecisionCategory) ? (value as DecisionCategory) : 'approval';
}

function mapCard(dto: DecisionCardDto): DecisionCard {
  return {
    id: dto.id,
    category: asCategory(dto.category),
    entityName: dto.entityName,
    headline: dto.headline,
    aiNote: dto.aiNote,
    urgencyNote: dto.urgencyNote ?? undefined,
    interruptReason: dto.interruptReason ?? undefined,
    amountLabel: dto.amountLabel ?? undefined,
    sourceHint: dto.sourceHint ?? undefined,
    sourceHref: dto.sourceHref ?? undefined,
    leadValueBand: asLeadValueBand(dto.leadValueBand),
    inboxPriority: asInboxPriority(dto.inboxPriority ?? undefined),
    contractRiskFlags: parseRiskFlags(dto.contractRiskFlags),
    actions: (dto.actions ?? []).map(
      (a): DecisionAction => ({
        id: a.id,
        label: a.label,
        style: (a.style as DecisionAction['style']) ?? 'ghost',
        href: a.href ?? undefined,
      })
    ),
  };
}

export async function fetchTodayDecisions(): Promise<{
  cards: DecisionCard[];
  totalEstimatedMinutes: number;
}> {
  if (!shouldUseBackendApi()) {
    const cards = await fetchMockDecisions();
    return { cards, totalEstimatedMinutes: cards.length * 10 };
  }
  const res = await apiRequest<TodayDecisionsResponse>('/api/v1/decisions/today');
  return {
    cards: res.items.map(mapCard),
    totalEstimatedMinutes: res.totalEstimatedMinutes,
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
