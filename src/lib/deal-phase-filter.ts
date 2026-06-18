import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';

export type DealPhaseFilter = 'all' | EscrowLifecyclePhase;

/** Display order for deal list phase filters. */
export const DEAL_PHASE_FILTER_ORDER: EscrowLifecyclePhase[] = [
  'awaiting_prepay',
  'escrowed',
  'in_execution',
  'pending_verification',
  'remediation',
  'disputed',
  'settled',
];

export function matchesDealPhaseFilter(deal: DealSummary, filter: DealPhaseFilter): boolean {
  if (filter === 'all') return true;
  return deal.escrowPhase === filter;
}

export function countDealsByPhase(deals: DealSummary[]): Record<EscrowLifecyclePhase, number> {
  const counts: Record<EscrowLifecyclePhase, number> = {
    awaiting_prepay: 0,
    escrowed: 0,
    in_execution: 0,
    pending_verification: 0,
    settled: 0,
    remediation: 0,
    disputed: 0,
  };
  for (const deal of deals) {
    counts[deal.escrowPhase] += 1;
  }
  return counts;
}

export function filterDeals(deals: DealSummary[], filter: DealPhaseFilter): DealSummary[] {
  const rows = deals.filter((deal) => matchesDealPhaseFilter(deal, filter));
  return filter === 'all' ? sortDealsForDisplay(rows) : rows;
}

export function dealPhaseSortIndex(phase: EscrowLifecyclePhase): number {
  const index = DEAL_PHASE_FILTER_ORDER.indexOf(phase);
  return index === -1 ? DEAL_PHASE_FILTER_ORDER.length : index;
}

/** Active deals first; settled deals last when showing the full list. */
export function sortDealsForDisplay(deals: DealSummary[]): DealSummary[] {
  return [...deals].sort(
    (a, b) => dealPhaseSortIndex(a.escrowPhase) - dealPhaseSortIndex(b.escrowPhase)
  );
}
