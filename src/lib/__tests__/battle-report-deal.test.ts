import {
  battleReportDealAliasId,
  battleReportDetailHref,
  dealIdFromBattleReportAlias,
  findBattleReportForDeal,
  isBattleReportDealAliasId,
} from '@/src/lib/battle-report-deal';
import type { BattleReportSummary } from '@/src/types/domain';

const reports: BattleReportSummary[] = [
  {
    id: 'report-a',
    dealId: 'mock-deal-nordstrom',
    title: 'Nordstrom recap',
    metrics: ['+10%'],
    lesson: 'Lesson',
    shareableToMediaKit: true,
  },
];

describe('battle-report-deal', () => {
  it('finds a report linked to a deal', () => {
    expect(findBattleReportForDeal('mock-deal-nordstrom', reports)?.id).toBe('report-a');
    expect(findBattleReportForDeal('mock-deal-harbor', reports)).toBeUndefined();
  });

  it('builds detail href and deal alias ids', () => {
    expect(battleReportDetailHref('report-a')).toBe('/battle-reports/report-a');
    expect(battleReportDealAliasId('mock-deal-harbor')).toBe('deal-mock-deal-harbor');
    expect(isBattleReportDealAliasId('deal-mock-deal-harbor')).toBe(true);
    expect(dealIdFromBattleReportAlias('deal-mock-deal-harbor')).toBe('mock-deal-harbor');
  });
});
