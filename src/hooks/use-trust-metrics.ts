import { useQuery } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchPublicProofCatalog, fetchTrustMetrics } from '@/src/api/trust-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';

export function useTrustMetrics() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('trust', 'metrics', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchTrustMetrics,
    enabled,
  });
}

export function usePublicProofCatalog() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('trust', 'public-proof-catalog', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchPublicProofCatalog,
    enabled,
  });
}

/** @deprecated use useTrustMetrics */
export const useMockTrustMetrics = useTrustMetrics;
