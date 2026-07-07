import {
  contractWarningSeverity,
  isContractRiskFlag,
  isContractRiskLabel,
  partitionRiskFlags,
  primaryContractWarningLabel,
  resolveThreadRiskPartitions,
  sortContractWarningFlags,
} from '@/src/lib/contract-warning';
import type { InboxRiskFlag } from '@/src/types/domain';

describe('contract-warning', () => {
  it('detects contract risk labels but not attention gaps', () => {
    expect(isContractRiskLabel('High · Spark Ads clause')).toBe(true);
    expect(isContractRiskLabel('Budget unclear')).toBe(false);
    expect(isContractRiskLabel('初次合作 · 先核对条款')).toBe(false);
    expect(isContractRiskLabel('Closed')).toBe(false);
  });

  it('partitions clause risks from reply attention items', () => {
    const flags: InboxRiskFlag[] = [
      { id: 'rf-broad_usage', code: 'BROAD_USAGE', label: 'Broad usage', severity: 'warning' },
      { id: 'rf-missing_budget', code: 'MISSING_BUDGET', label: 'Budget unclear', severity: 'warning' },
      { id: 'rf-early_collab_review', code: 'EARLY_COLLAB_REVIEW', label: 'Early collab', severity: 'warning' },
      { id: 'crf-exclusive', label: 'Exclusive clause', severity: 'warning' },
    ];
    const { contractRisks, attentionFlags } = partitionRiskFlags(flags, {
      budgetDisplay: '$4,000',
    });
    expect(contractRisks.map((flag) => flag.id)).toEqual(['rf-broad_usage', 'crf-exclusive']);
    expect(attentionFlags.map((flag) => flag.id)).toEqual(['rf-early_collab_review']);
  });

  it('auto-clears attention flags when opportunity fields are filled', () => {
    const flags: InboxRiskFlag[] = [
      { id: 'rf-usage_scope', code: 'USAGE_SCOPE', label: 'Usage scope unclear', severity: 'warning' },
      { id: 'rf-multiple_packages', code: 'MULTIPLE_PACKAGES', label: 'Multiple packages', severity: 'warning' },
    ];
    const { attentionFlags } = partitionRiskFlags(flags, {
      usageRights: ['Organic only'],
      deliverables: ['1 short-form video'],
      leadStage: 'quoted',
    });
    expect(attentionFlags).toEqual([]);
  });

  it('treats danger flags without attention codes as contract risks', () => {
    const flag: InboxRiskFlag = {
      id: 'rf-spark',
      label: 'AI Alert: 30 days free Spark Ads usage',
      severity: 'danger',
    };
    expect(isContractRiskFlag(flag)).toBe(true);
  });

  it('sorts danger before warning', () => {
    const flags: InboxRiskFlag[] = [
      { id: 'w', label: 'Warning', severity: 'warning' },
      { id: 'd', label: 'Danger', severity: 'danger' },
    ];
    expect(sortContractWarningFlags(flags).map((flag) => flag.id)).toEqual(['d', 'w']);
    expect(contractWarningSeverity(flags)).toBe('danger');
  });

  it('prefers API-resolved buckets when present', () => {
    const detail = {
      riskFlags: [
        { id: 'rf-broad_usage', label: 'Broad usage', severity: 'warning' as const },
        { id: 'rf-missing_budget', label: 'Budget unclear', severity: 'warning' as const },
      ],
      contractRiskFlags: [{ id: 'rf-broad_usage', label: 'Broad usage', severity: 'warning' as const }],
      attentionFlags: [],
      leadStage: 'needs_reply' as const,
    };
    expect(resolveThreadRiskPartitions(detail)).toEqual({
      contractRisks: detail.contractRiskFlags,
      attentionFlags: [],
    });
  });

  it('prefers hint for compact headline', () => {
    const flags: InboxRiskFlag[] = [
      {
        id: 'rf-spark',
        label: 'AI Alert: 30 days free Spark Ads usage',
        severity: 'danger',
        hint: 'Quote paid social usage separately unless included in fee.',
      },
    ];
    expect(primaryContractWarningLabel(flags)).toBe(
      'Quote paid social usage separately unless included in fee.'
    );
  });
});
