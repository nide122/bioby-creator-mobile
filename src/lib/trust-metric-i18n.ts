import type { TFunction } from 'i18next';

import type { TrustMetricCard } from '@/src/types/domain';

/** Keep one card per stable metric id when API/seed returns duplicate rows. */
export function dedupeTrustMetrics(metrics: TrustMetricCard[]): TrustMetricCard[] {
  const seen = new Set<string>();
  const rows: TrustMetricCard[] = [];
  for (const metric of metrics) {
    if (seen.has(metric.id)) continue;
    seen.add(metric.id);
    rows.push(metric);
  }
  return rows;
}

/** Map API/mock trust metrics to localized copy keyed by stable metric id. */
export function localizeTrustMetric(metric: TrustMetricCard, t: TFunction): TrustMetricCard {
  const base = `trustMetrics.${metric.id}`;
  return {
    ...metric,
    label: t(`${base}.label`, { defaultValue: metric.label }),
    value: t(`${base}.value`, { defaultValue: metric.value }),
    trendNote: t(`${base}.trendNote`, { defaultValue: metric.trendNote }),
    disclaimer: t(`${base}.disclaimer`, { defaultValue: metric.disclaimer }),
  };
}

export function localizeTrustMetrics(metrics: TrustMetricCard[], t: TFunction): TrustMetricCard[] {
  return metrics.map((metric) => localizeTrustMetric(metric, t));
}
