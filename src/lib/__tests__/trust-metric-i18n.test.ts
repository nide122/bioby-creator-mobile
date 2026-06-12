import { dedupeTrustMetrics } from '@/src/lib/trust-metric-i18n';
import type { TrustMetricCard } from '@/src/types/domain';

describe('trust-metric-i18n', () => {
  it('dedupes trust metrics by stable id', () => {
    const metric: TrustMetricCard = {
      id: 'tm-punctual',
      label: 'On-time publish',
      value: '96%',
      trendNote: 'Rolling 90 days',
      disclaimer: 'Demo only.',
    };
    const metrics: TrustMetricCard[] = [metric, { ...metric, label: 'Duplicate row' }];

    expect(dedupeTrustMetrics(metrics)).toHaveLength(1);
    expect(dedupeTrustMetrics(metrics)[0].label).toBe('On-time publish');
  });
});
