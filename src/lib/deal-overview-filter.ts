import { dealPhaseSortIndex, sortDealsForDisplay } from '@/src/lib/deal-phase-filter';
import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';

/** KOL-facing buckets for the deals tab overview. */
export type DealOverviewFilter =
  | 'all_active'
  | 'in_progress'
  | 'awaiting_payment'
  | 'pending_review'
  | 'settled';

/** Primary chip row on the deals tab. */
export const DEAL_OVERVIEW_CHIP_ORDER: DealOverviewFilter[] = [
  'all_active',
  'in_progress',
  'awaiting_payment',
  'pending_review',
  'settled',
];

const ALL_OVERVIEW_FILTERS: DealOverviewFilter[] = DEAL_OVERVIEW_CHIP_ORDER;

const IN_PROGRESS_PHASES: EscrowLifecyclePhase[] = [
  'escrowed',
  'in_execution',
  'remediation',
  'disputed',
];

export function isActiveDealPhase(phase: EscrowLifecyclePhase): boolean {
  return phase !== 'settled';
}

export function isActiveDeal(deal: DealSummary): boolean {
  return isActiveDealPhase(deal.escrowPhase);
}

export function matchesDealOverviewFilter(deal: DealSummary, filter: DealOverviewFilter): boolean {
  if (filter === 'settled') {
    return deal.escrowPhase === 'settled';
  }
  if (!isActiveDeal(deal)) return false;
  switch (filter) {
    case 'all_active':
      return true;
    case 'awaiting_payment':
      return deal.escrowPhase === 'awaiting_prepay';
    case 'pending_review':
      return deal.escrowPhase === 'pending_verification';
    case 'in_progress':
      return IN_PROGRESS_PHASES.includes(deal.escrowPhase);
    default:
      return false;
  }
}

export function countDealsByOverviewFilter(
  deals: DealSummary[]
): Record<DealOverviewFilter, number> {
  const counts: Record<DealOverviewFilter, number> = {
    all_active: 0,
    in_progress: 0,
    awaiting_payment: 0,
    pending_review: 0,
    settled: 0,
  };
  for (const deal of deals) {
    for (const filter of ALL_OVERVIEW_FILTERS) {
      if (matchesDealOverviewFilter(deal, filter)) {
        counts[filter] += 1;
      }
    }
  }
  return counts;
}

export function filterDealsForOverview(deals: DealSummary[], filter: DealOverviewFilter): DealSummary[] {
  const rows = deals.filter((deal) => matchesDealOverviewFilter(deal, filter));
  return sortDealsForOverview(rows);
}

/** Recommended opportunities surface first; then phase priority; then title. */
export function sortDealsForOverview(deals: DealSummary[]): DealSummary[] {
  return [...deals].sort((a, b) => {
    const recommendedDelta = Number(b.source === 'recommended') - Number(a.source === 'recommended');
    if (recommendedDelta !== 0) return recommendedDelta;
    const phaseDelta = dealPhaseSortIndex(a.escrowPhase) - dealPhaseSortIndex(b.escrowPhase);
    if (phaseDelta !== 0) return phaseDelta;
    return a.title.localeCompare(b.title);
  });
}

export function activeDeals(deals: DealSummary[]): DealSummary[] {
  return sortDealsForDisplay(deals.filter(isActiveDeal));
}
