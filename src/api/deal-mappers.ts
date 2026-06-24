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

export type DealListItemDto = {
  id: string;
  brandId?: string | null;
  brandPlaceholder: string;
  title: string;
  opportunityId?: string | null;
  opportunityThreadId?: string | null;
  escrowPhase: string;
  paymentStatusLabel?: string | null;
  nextMilestone?: string | null;
  outcomeSummary?: string | null;
  source: string;
  recommendBadge?: string | null;
  recommendReasons?: string[] | null;
  recommendPayoutNote?: string | null;
  recommendRiskNote?: string | null;
};

function asEscrowPhase(value: string): EscrowLifecyclePhase {
  return ESCROW_PHASES.includes(value as EscrowLifecyclePhase)
    ? (value as EscrowLifecyclePhase)
    : 'in_execution';
}

export function mapDealDto(item: DealListItemDto): DealSummary {
  return {
    id: item.id,
    brandId: item.brandId ?? undefined,
    brandPlaceholder: item.brandPlaceholder,
    title: item.title,
    opportunityThreadId: item.opportunityId ?? item.opportunityThreadId ?? undefined,
    escrowPhase: asEscrowPhase(item.escrowPhase),
    paymentStatusLabel: item.paymentStatusLabel ?? undefined,
    nextMilestone: item.nextMilestone ?? undefined,
    outcomeSummary: item.outcomeSummary ?? undefined,
    source: item.source === 'recommended' ? 'recommended' : 'self',
    recommendBadge: item.recommendBadge ?? undefined,
    recommendReasons: item.recommendReasons ?? undefined,
    recommendPayoutNote: item.recommendPayoutNote ?? undefined,
    recommendRiskNote: item.recommendRiskNote ?? undefined,
  };
}
