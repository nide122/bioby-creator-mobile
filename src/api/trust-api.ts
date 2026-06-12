import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchMockTrustMetrics } from '@/src/api/mock-trust';
import { dedupePublicProofCatalog, trustMetricToPublicProofItem } from '@/src/lib/public-proof';
import { dedupeTrustMetrics } from '@/src/lib/trust-metric-i18n';
import type { PublicProofItem, TrustMetricCard } from '@/src/types/domain';

type TrustMetricDto = {
  id: string;
  label: string;
  value: string;
  trendNote: string;
  disclaimer: string;
};

export async function fetchTrustMetrics(): Promise<TrustMetricCard[]> {
  let metrics: TrustMetricCard[];
  if (!shouldUseBackendApi()) {
    metrics = await fetchMockTrustMetrics();
  } else {
    const items = await apiRequest<TrustMetricDto[]>('/api/v1/trust/metrics');
    metrics = items.map((m) => ({
      id: m.id,
      label: m.label,
      value: m.value,
      trendNote: m.trendNote,
      disclaimer: m.disclaimer,
    }));
  }
  return dedupeTrustMetrics(metrics);
}

export async function fetchPublicProofCatalog(): Promise<PublicProofItem[]> {
  const metrics = await fetchTrustMetrics();
  return dedupePublicProofCatalog(metrics.map(trustMetricToPublicProofItem));
}
