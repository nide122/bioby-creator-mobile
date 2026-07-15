import type { BattleReportSummary } from '@/src/types/domain';
import { dealIdFromBattleReportAlias, isBattleReportDealAliasId } from '@/src/lib/battle-report-deal';
import { mockDelay } from '@/src/lib/mock-delay';

const REPORTS: Record<string, BattleReportSummary> = {
  'report-spring-skincare': {
    id: 'report-spring-skincare',
    dealId: 'mock-deal-nordstrom',
    title: 'Spring skincare launch · Deal recap',
    metrics: [
      '+18% rate lift',
      '9.5 hours saved in back-and-forth',
      '29 days from pitch to settlement',
    ],
    lesson: 'Lock claims language and review windows before quoting to reduce verification loops.',
    shareableToMediaKit: true,
  },
  'report-outdoor-lesson': {
    id: 'report-outdoor-lesson',
    title: 'Outdoor product launch · Lessons learned',
    metrics: ['3 scope changes', '1 extra disclosure revision'],
    lesson: 'Do not commit timing before usage rights are confirmed. Price remix rights separately.',
    shareableToMediaKit: true,
  },
};

function cloneReport(report: BattleReportSummary): BattleReportSummary {
  return { ...report, metrics: [...report.metrics] };
}

function findReportByDealId(dealId: string): BattleReportSummary | undefined {
  return Object.values(REPORTS).find((report) => report.dealId === dealId);
}

/** Snapshot for mock growth seed data. */
export const MOCK_BATTLE_REPORTS: BattleReportSummary[] = Object.values(REPORTS).map(cloneReport);

export async function fetchMockBattleReports(): Promise<BattleReportSummary[]> {
  await mockDelay(130);
  return Object.values(REPORTS).map(cloneReport);
}

export async function fetchMockBattleReportById(id: string): Promise<BattleReportSummary> {
  await mockDelay(120);
  if (isBattleReportDealAliasId(id)) {
    const linked = findReportByDealId(dealIdFromBattleReportAlias(id));
    if (linked) return cloneReport(linked);
    throw new Error(`battle_report_not_found:${id}`);
  }
  const row = REPORTS[id];
  if (!row) {
    throw new Error(`battle_report_not_found:${id}`);
  }
  return cloneReport(row);
}

export async function generateMockBattleReport(input: {
  dealId: string;
  title: string;
}): Promise<BattleReportSummary> {
  await mockDelay(150);
  const existing = findReportByDealId(input.dealId);
  if (existing) return cloneReport(existing);

  const id = `report-${input.dealId}`;
  const report: BattleReportSummary = {
    id,
    dealId: input.dealId,
    title: `${input.title} · Deal recap`,
    metrics: ['Settlement complete', 'Deliverables verified'],
    lesson: 'Review scope, usage rights, and review windows before the next quote.',
    shareableToMediaKit: false,
  };
  REPORTS[id] = report;
  return cloneReport(report);
}

export async function updateMockBattleReportShareable(
  id: string,
  shareableToMediaKit: boolean
): Promise<BattleReportSummary> {
  await mockDelay(100);
  const row = REPORTS[id];
  if (!row) {
    throw new Error(`battle_report_not_found:${id}`);
  }
  row.shareableToMediaKit = shareableToMediaKit;
  return cloneReport(row);
}
