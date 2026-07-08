import type { DealListItemView } from '@/src/types/api';
import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';

const ESCROW_PHASES: EscrowLifecyclePhase[] = [
  'awaiting_prepay',
  'escrowed',
  'in_execution',
  'pending_verification',
  'settled',
  'remediation',
  'disputed',
];

/** @deprecated use DealListItemView from @/src/types/api */
export type DealListItemDto = DealListItemView;

function asEscrowPhase(value: string | undefined): EscrowLifecyclePhase {
  return value && ESCROW_PHASES.includes(value as EscrowLifecyclePhase)
    ? (value as EscrowLifecyclePhase)
    : 'in_execution';
}

export function mapDealDto(item: DealListItemView): DealSummary {
  return {
    id: item.id ?? '',
    brandId: item.brandId ?? undefined,
    brandPlaceholder: item.brandPlaceholder ?? '',
    brandName: item.brandName ?? undefined,
    title: item.title ?? '',
    opportunityThreadId: item.opportunityId ?? undefined,
    escrowPhase: asEscrowPhase(item.escrowPhase),
    paymentStatusLabel: item.paymentStatusLabel ?? undefined,
    nextMilestone: item.nextMilestone ?? undefined,
    outcomeSummary: item.outcomeSummary ?? undefined,
    source: item.source === 'recommended' ? 'recommended' : 'self',
    recommendBadge: item.recommendBadge ?? undefined,
    recommendReasons: item.recommendReasons ?? undefined,
    recommendPayoutNote: item.recommendPayoutNote ?? undefined,
    recommendRiskNote: item.recommendRiskNote ?? undefined,
    deadlineAtISO: item.deadlineAtISO ?? undefined,
    deadlineKind: item.deadlineKind ?? undefined,
    deadlineText: item.deadlineText ?? undefined,
  };
}
