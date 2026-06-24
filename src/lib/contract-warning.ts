import { localizedVisibleRiskLabel } from '@/src/lib/inbox-detail-labels';
import type { InboxRiskFlag, InboxRiskSeverity, InboxThread } from '@/src/types/domain';
import type { TFunction } from 'i18next';

const RISK_LABEL_PATTERN =
  /\b(high|medium|danger|risky|spark|claims|usage|exclusive|broad|floor|deadline)\b|高风险|条款风险|授权|独家|预算不清楚/i;

export function isContractRiskLabel(label?: string | null): boolean {
  if (!label?.trim()) return false;
  return RISK_LABEL_PATTERN.test(label.trim());
}

export function contractRiskLabelSeverity(label?: string | null): InboxRiskSeverity | null {
  if (!isContractRiskLabel(label)) return null;
  const normalized = label!.trim().toLowerCase();
  if (/\b(high|danger)\b|高风险|条款风险较高/.test(normalized)) return 'danger';
  if (/\b(medium|warning)\b|中等|需审/.test(normalized)) return 'warning';
  return 'warning';
}

export function contractWarningSeverity(flags: InboxRiskFlag[]): InboxRiskSeverity | null {
  if (flags.length === 0) return null;
  if (flags.some((flag) => flag.severity === 'danger')) return 'danger';
  if (flags.some((flag) => flag.severity === 'warning')) return 'warning';
  if (flags.some((flag) => flag.severity === 'info')) return 'info';
  return null;
}

export function sortContractWarningFlags(flags: InboxRiskFlag[]): InboxRiskFlag[] {
  const rank: Record<InboxRiskSeverity, number> = { danger: 0, warning: 1, info: 2 };
  return [...flags].sort((left, right) => rank[left.severity] - rank[right.severity]);
}

export function primaryContractWarningLabel(flags: InboxRiskFlag[]): string | null {
  const sorted = sortContractWarningFlags(flags);
  const primary = sorted[0];
  if (!primary) return null;
  return primary.hint?.trim() || primary.label.trim() || null;
}

export function listContractWarningFlags(
  thread: Pick<InboxThread, 'contractRiskPreview' | 'riskLabel' | 'budgetLabel'>,
  t: TFunction
): InboxRiskFlag[] {
  if (thread.contractRiskPreview) {
    return [thread.contractRiskPreview];
  }
  const visibleRisk = localizedVisibleRiskLabel(t, thread.riskLabel, thread.budgetLabel);
  if (!visibleRisk || !isContractRiskLabel(visibleRisk)) {
    return [];
  }
  return [
    {
      id: `list-risk-${visibleRisk}`,
      label: visibleRisk,
      severity: contractRiskLabelSeverity(visibleRisk) ?? 'warning',
    },
  ];
}
