import {
  countDealsByOverviewFilter,
  filterDealsForOverview,
  isActiveDeal,
  matchesDealOverviewFilter,
} from '@/src/lib/deal-overview-filter';
import type { DealSummary } from '@/src/types/domain';

function deal(id: string, phase: DealSummary['escrowPhase'], source: DealSummary['source'] = 'self'): DealSummary {
  return {
    id,
    brandPlaceholder: 'Brand',
    title: `Deal ${id}`,
    escrowPhase: phase,
    source,
  };
}

describe('deal-overview-filter', () => {
  const rows = [
    deal('1', 'awaiting_prepay'),
    deal('2', 'in_execution'),
    deal('3', 'pending_verification'),
    deal('4', 'escrowed'),
    deal('5', 'settled'),
    deal('6', 'disputed'),
    deal('7', 'awaiting_prepay', 'recommended'),
  ];

  it('treats settled deals as inactive', () => {
    expect(isActiveDeal(deal('5', 'settled'))).toBe(false);
    expect(matchesDealOverviewFilter(deal('5', 'settled'), 'all_active')).toBe(false);
  });

  it('maps overview buckets to escrow phases', () => {
    expect(matchesDealOverviewFilter(deal('1', 'awaiting_prepay'), 'awaiting_payment')).toBe(true);
    expect(matchesDealOverviewFilter(deal('3', 'pending_verification'), 'pending_review')).toBe(true);
    expect(matchesDealOverviewFilter(deal('1', 'awaiting_prepay'), 'needs_action')).toBe(true);
    expect(matchesDealOverviewFilter(deal('3', 'pending_verification'), 'needs_action')).toBe(true);
    expect(matchesDealOverviewFilter(deal('2', 'in_execution'), 'needs_action')).toBe(false);
    expect(matchesDealOverviewFilter(deal('2', 'in_execution'), 'in_progress')).toBe(true);
    expect(matchesDealOverviewFilter(deal('6', 'disputed'), 'in_progress')).toBe(true);
    expect(matchesDealOverviewFilter(deal('1', 'awaiting_prepay'), 'in_progress')).toBe(false);
  });

  it('counts and filters active deals by bucket', () => {
    const counts = countDealsByOverviewFilter(rows);
    expect(counts.all_active).toBe(6);
    expect(counts.needs_action).toBe(3);
    expect(counts.awaiting_payment).toBe(2);
    expect(counts.pending_review).toBe(1);
    expect(counts.in_progress).toBe(3);
    expect(counts.settled).toBe(1);

    const awaiting = filterDealsForOverview(rows, 'awaiting_payment');
    expect(awaiting.map((row) => row.id)).toEqual(['7', '1']);

    const needsAction = filterDealsForOverview(rows, 'needs_action');
    expect(needsAction.map((row) => row.id)).toEqual(['7', '1', '3']);
  });
});
