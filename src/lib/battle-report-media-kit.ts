import type { BattleReportSummary, MediaKitCaseCard } from '@/src/types/domain';

export function battleReportOutcome(report: BattleReportSummary): string {
  if (report.metrics.length) return report.metrics[0];
  return report.lesson;
}

export function battleReportToCaseCard(
  report: BattleReportSummary,
  industryLabel: string
): MediaKitCaseCard {
  const outcome = battleReportOutcome(report);
  return {
    id: report.id,
    title: report.title,
    industry: industryLabel,
    outcomeNote: report.lesson.trim() || outcome,
    resultSummary: report.metrics[0]?.trim() || undefined,
  };
}
