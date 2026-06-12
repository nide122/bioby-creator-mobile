import type { BattleReportSummary } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';

const REPORTS: Record<string, BattleReportSummary> = {
  'report-spring-skincare': {
    id: 'report-spring-skincare',
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

export const MOCK_BATTLE_REPORTS: BattleReportSummary[] = Object.values(REPORTS).map((report) => ({
  ...report,
  metrics: [...report.metrics],
}));

export async function fetchMockBattleReports(): Promise<BattleReportSummary[]> {
  await mockDelay(130);
  return MOCK_BATTLE_REPORTS.map((report) => ({
    ...report,
    metrics: [...report.metrics],
  }));
}

export async function fetchMockBattleReportById(id: string): Promise<BattleReportSummary> {
  await mockDelay(120);
  const row = REPORTS[id];
  if (!row) {
    throw new Error(`battle_report_not_found:${id}`);
  }
  return { ...row, metrics: [...row.metrics] };
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
  return { ...row, metrics: [...row.metrics] };
}
