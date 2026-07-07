import {
  isStaleBudgetUnclearRisk,
  isUnclearBudgetDisplay,
  localizedVisibleRiskLabel,
  visibleRiskFlags,
} from '@/src/lib/inbox-detail-labels';
import type {
  InboxDeliverablePackage,
  InboxLeadStage,
  InboxRiskFlag,
  InboxRiskSeverity,
  InboxThread,
  InboxThreadDetail,
} from '@/src/types/domain';
import type { TFunction } from 'i18next';

/** Operational gaps — belong in "回复前建议", not the contract-risk banner. */
export const ATTENTION_RISK_CODES = new Set([
  'MISSING_BUDGET',
  'USAGE_SCOPE',
  'EARLY_COLLAB_REVIEW',
  'MULTIPLE_PACKAGES',
  'TIMELINE_IMPLAUSIBLE',
  'TIMELINE_UNCLEAR',
  'TIMELINE_LAPSED',
  'TIMELINE_PACKAGE_MISMATCH',
]);

/** Clause / compliance / rate risks — belong in "合同风险提示". */
export const CONTRACT_RISK_CODES = new Set([
  'DANGER_TERMS',
  'DANGER_USAGE',
  'BROAD_USAGE',
  'SPARK_ADS_USAGE',
  'CLAIMS_REVIEW',
  'BELOW_FLOOR_RATE',
]);

const CONTRACT_RISK_LABEL_PATTERN =
  /\b(high|medium|danger|risky|spark|claims|usage|exclusive|broad|floor)\b|高风险|条款风险|授权条款|独家/i;

const ATTENTION_RISK_LABEL_PATTERN =
  /budget unclear|usage scope unclear|early collaboration|multiple packages|schedule may|schedule needs|档期|多个报价/i;

export type RiskPartitionContext = {
  budgetDisplay?: string | null;
  usageRights?: string[];
  deliverables?: string[];
  packages?: InboxDeliverablePackage[];
  leadStage?: InboxLeadStage;
};

export function resolveRiskFlagCode(flag: InboxRiskFlag): string | null {
  if (flag.code?.trim()) {
    return flag.code.trim().toUpperCase();
  }
  const id = flag.id?.trim().toLowerCase();
  if (!id) return null;
  if (id.startsWith('crf-')) {
    return id.slice(4).toUpperCase();
  }
  if (id.startsWith('rf-')) {
    return id.slice(3).toUpperCase();
  }
  return null;
}

export function isAttentionRiskFlag(flag: InboxRiskFlag): boolean {
  if (flag.kind === 'attention') return true;
  if (flag.kind === 'contract') return false;
  const code = resolveRiskFlagCode(flag);
  if (code && ATTENTION_RISK_CODES.has(code)) {
    return true;
  }
  if (flag.id?.startsWith('crf-')) {
    return false;
  }
  return ATTENTION_RISK_LABEL_PATTERN.test(flag.label);
}

export function isContractRiskFlag(flag: InboxRiskFlag): boolean {
  if (flag.kind === 'contract') return true;
  if (flag.kind === 'attention') return false;
  if (flag.id?.startsWith('crf-')) {
    return true;
  }
  const code = resolveRiskFlagCode(flag);
  if (code) {
    if (ATTENTION_RISK_CODES.has(code)) return false;
    if (CONTRACT_RISK_CODES.has(code)) return true;
  }
  if (isAttentionRiskFlag(flag)) {
    return false;
  }
  if (flag.severity === 'danger') {
    return true;
  }
  return CONTRACT_RISK_LABEL_PATTERN.test(flag.label);
}

export function isContractRiskLabel(label?: string | null): boolean {
  if (!label?.trim()) return false;
  const trimmed = label.trim();
  if (ATTENTION_RISK_LABEL_PATTERN.test(trimmed)) return false;
  if (isStaleBudgetUnclearRisk(trimmed)) return false;
  return CONTRACT_RISK_LABEL_PATTERN.test(trimmed);
}

export function contractRiskLabelSeverity(label?: string | null): InboxRiskSeverity | null {
  if (!isContractRiskLabel(label)) return null;
  const normalized = label!.trim().toLowerCase();
  if (/\b(high|danger)\b|高风险|条款风险较高/.test(normalized)) return 'danger';
  if (/\b(medium|warning)\b|中等|需审/.test(normalized)) return 'warning';
  return 'warning';
}

function shouldShowAttentionFlag(flag: InboxRiskFlag, context: RiskPartitionContext): boolean {
  const code = resolveRiskFlagCode(flag);
  if (code === 'MISSING_BUDGET' && !isUnclearBudgetDisplay(context.budgetDisplay)) {
    return false;
  }
  if (code === 'USAGE_SCOPE' && (context.usageRights?.length ?? 0) > 0) {
    return false;
  }
  if (
    code === 'EARLY_COLLAB_REVIEW' &&
    context.leadStage &&
    context.leadStage !== 'new' &&
    context.leadStage !== 'needs_reply'
  ) {
    return false;
  }
  if (code === 'MULTIPLE_PACKAGES') {
    const deliverableCount = context.deliverables?.length ?? 0;
    const packageCount = context.packages?.length ?? 0;
    if (deliverableCount <= 1 && packageCount <= 1) {
      return false;
    }
  }
  if (isStaleBudgetUnclearRisk(flag.label) && !isUnclearBudgetDisplay(context.budgetDisplay)) {
    return false;
  }
  return true;
}

export function partitionRiskFlags(
  flags: InboxRiskFlag[],
  context: RiskPartitionContext = {}
): { contractRisks: InboxRiskFlag[]; attentionFlags: InboxRiskFlag[] } {
  const contractRisks: InboxRiskFlag[] = [];
  const attentionFlags: InboxRiskFlag[] = [];

  for (const flag of flags) {
    if (isAttentionRiskFlag(flag)) {
      if (shouldShowAttentionFlag(flag, context)) {
        attentionFlags.push(flag);
      }
      continue;
    }
    if (isContractRiskFlag(flag)) {
      contractRisks.push(flag);
    }
  }

  return { contractRisks, attentionFlags };
}

export function mergeContractRiskFlags(...groups: InboxRiskFlag[][]): InboxRiskFlag[] {
  const seen = new Set<string>();
  const merged: InboxRiskFlag[] = [];
  for (const group of groups) {
    for (const flag of group) {
      if (seen.has(flag.id)) continue;
      seen.add(flag.id);
      merged.push(flag);
    }
  }
  return merged;
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
  thread: Pick<
    InboxThread,
    'contractRiskPreview' | 'riskLabel' | 'budgetDisplay' | 'riskFlags' | 'leadStage' | 'deliverables' | 'packages'
  > & {
    contractRiskFlags?: InboxRiskFlag[];
  },
  t: TFunction
): InboxRiskFlag[] {
  if (thread.contractRiskFlags?.length) {
    return sortContractWarningFlags(thread.contractRiskFlags);
  }
  if (thread.contractRiskPreview && isContractRiskFlag(thread.contractRiskPreview)) {
    return [thread.contractRiskPreview];
  }
  if (thread.riskFlags?.length) {
    const { contractRisks } = partitionRiskFlags(thread.riskFlags, {
      budgetDisplay: thread.budgetDisplay,
      leadStage: thread.leadStage,
      deliverables: thread.deliverables,
      packages: thread.packages,
    });
    if (contractRisks.length > 0) {
      return sortContractWarningFlags(contractRisks);
    }
  }
  const visibleRisk = localizedVisibleRiskLabel(t, thread.riskLabel, thread.budgetDisplay);
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

export type ThreadRiskSource = Pick<
  InboxThreadDetail,
  | 'riskFlags'
  | 'contractRiskFlags'
  | 'attentionFlags'
  | 'budgetDisplay'
  | 'usageRights'
  | 'deliverables'
  | 'packages'
  | 'leadStage'
  | 'contractSummary'
>;

/** Prefer API-resolved buckets; fall back to client partition for mock/legacy payloads. */
export function resolveThreadRiskPartitions(source: ThreadRiskSource): {
  contractRisks: InboxRiskFlag[];
  attentionFlags: InboxRiskFlag[];
} {
  if (source.contractRiskFlags !== undefined || source.attentionFlags !== undefined) {
    return {
      contractRisks: source.contractRiskFlags ?? [],
      attentionFlags: source.attentionFlags ?? [],
    };
  }
  const visible = visibleRiskFlags(source.riskFlags, source.budgetDisplay);
  const { contractRisks, attentionFlags } = partitionRiskFlags(visible, {
    budgetDisplay: source.budgetDisplay,
    usageRights: source.usageRights,
    deliverables: source.deliverables,
    packages: source.packages,
    leadStage: source.leadStage,
  });
  const contractSummaryRisks =
    source.contractSummary?.status === 'COMPLETE' ? (source.contractSummary.riskFlags ?? []) : [];
  return {
    contractRisks: mergeContractRiskFlags(contractRisks, contractSummaryRisks),
    attentionFlags,
  };
}
