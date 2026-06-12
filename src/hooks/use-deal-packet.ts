import { useQuery } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchDealPacket } from '@/src/api/deals-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';

export function useDealPacket(dealId: string | undefined) {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('deals', 'packet', dealId, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => fetchDealPacket(dealId as string),
    enabled: enabled && !!dealId,
  });
}

/** @deprecated use useDealPacket */
export const useMockDealPacket = useDealPacket;
