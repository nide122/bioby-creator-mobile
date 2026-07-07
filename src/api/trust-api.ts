import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchMockTrustMetrics } from '@/src/api/mock-trust';
import { dedupePublicProofCatalog, trustMetricToPublicProofItem } from '@/src/lib/public-proof';
import { dedupeTrustMetrics } from '@/src/lib/trust-metric-i18n';
import type { TrustMetricView } from '@/src/types/api';
import type { PublicProofItem, TrustMetricCard } from '@/src/types/domain';

function mapTrustMetric(view: TrustMetricView): TrustMetricCard {
  return {
    id: view.id ?? '',
    label: view.label ?? '',
    value: view.value ?? '',
    trendNote: view.trendNote ?? '',
    disclaimer: view.disclaimer ?? '',
  };
}

export async function fetchTrustMetrics(): Promise<TrustMetricCard[]> {
  let metrics: TrustMetricCard[];
  if (!shouldUseBackendApi()) {
    metrics = await fetchMockTrustMetrics();
  } else {
    const items = await apiRequest<TrustMetricView[]>('/api/v1/trust/metrics');
    metrics = items.map(mapTrustMetric);
  }
  return dedupeTrustMetrics(metrics);
}

export async function fetchPublicProofCatalog(): Promise<PublicProofItem[]> {
  const metrics = await fetchTrustMetrics();
  return dedupePublicProofCatalog(metrics.map(trustMetricToPublicProofItem));
}
