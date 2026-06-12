import { useQuery } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchDealById, fetchDealList } from '@/src/api/deals-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';

export function useDeals(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('deals', 'list', { empty, api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => (empty ? Promise.resolve([]) : fetchDealList()),
    enabled,
  });
}

export function useDealDetail(dealId: string | undefined) {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('deals', 'detail', dealId, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => fetchDealById(dealId as string),
    enabled: enabled && !!dealId,
  });
}

/** @deprecated use useDeals */
export const useMockDeals = useDeals;

/** @deprecated use useDealDetail */
export const useMockDealDetail = useDealDetail;
