import type { Href } from 'expo-router';

import type { BattleReportSummary } from '@/src/types/domain';

export function findBattleReportForDeal(
  dealId: string,
  reports: BattleReportSummary[] | undefined
): BattleReportSummary | undefined {
  if (!reports?.length) return undefined;
  return reports.find((report) => report.dealId === dealId);
}

export function battleReportDetailHref(reportId: string): Href {
  return `/battle-reports/${reportId}` as Href;
}

/** Route id alias used before a report row exists for a deal. */
export function battleReportDealAliasId(dealId: string): string {
  return `deal-${dealId}`;
}

export function isBattleReportDealAliasId(routeId: string): boolean {
  return routeId.startsWith('deal-');
}

export function dealIdFromBattleReportAlias(routeId: string): string {
  return routeId.slice('deal-'.length);
}
