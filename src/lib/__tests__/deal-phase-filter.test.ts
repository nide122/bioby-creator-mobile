import { countDealsByPhase, filterDeals, matchesDealPhaseFilter, sortDealsForDisplay } from '@/src/lib/deal-phase-filter';
import type { DealSummary } from '@/src/types/domain';

function deal(id: string, phase: DealSummary['escrowPhase']): DealSummary {
  return {
    id,
    brandPlaceholder: 'Brand',
    title: `Deal ${id}`,
    escrowPhase: phase,
    source: 'self',
  };
}

describe('deal-phase-filter', () => {
  it('matches all or a specific escrow phase', () => {
    const row = deal('1', 'in_execution');
    expect(matchesDealPhaseFilter(row, 'all')).toBe(true);
    expect(matchesDealPhaseFilter(row, 'in_execution')).toBe(true);
    expect(matchesDealPhaseFilter(row, 'settled')).toBe(false);
  });

  it('filters and counts deals by phase', () => {
    const rows = [deal('1', 'awaiting_prepay'), deal('2', 'in_execution'), deal('3', 'in_execution')];
    expect(filterDeals(rows, 'in_execution')).toHaveLength(2);
    expect(countDealsByPhase(rows).in_execution).toBe(2);
    expect(countDealsByPhase(rows).awaiting_prepay).toBe(1);
  });

  it('sorts settled deals to the end of the default list', () => {
    const rows = [
      deal('1', 'settled'),
      deal('2', 'pending_verification'),
      deal('3', 'in_execution'),
      deal('4', 'settled'),
    ];
    expect(sortDealsForDisplay(rows).map((row) => row.id)).toEqual(['2', '3', '1', '4']);
    expect(filterDeals(rows, 'all').map((row) => row.escrowPhase).at(-1)).toBe('settled');
  });
});
