import {
  contractWarningSeverity,
  isContractRiskLabel,
  primaryContractWarningLabel,
  sortContractWarningFlags,
} from '@/src/lib/contract-warning';
import type { InboxRiskFlag } from '@/src/types/domain';

describe('contract-warning', () => {
  it('detects contract risk labels', () => {
    expect(isContractRiskLabel('High · Spark Ads clause')).toBe(true);
    expect(isContractRiskLabel('Closed')).toBe(false);
  });

  it('sorts danger before warning', () => {
    const flags: InboxRiskFlag[] = [
      { id: 'w', label: 'Warning', severity: 'warning' },
      { id: 'd', label: 'Danger', severity: 'danger' },
    ];
    expect(sortContractWarningFlags(flags).map((flag) => flag.id)).toEqual(['d', 'w']);
    expect(contractWarningSeverity(flags)).toBe('danger');
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
