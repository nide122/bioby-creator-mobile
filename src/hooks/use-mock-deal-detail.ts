import { useQuery } from '@tanstack/react-query';

import { fetchMockDealById } from '@/src/api/mock-deals';

export function useMockDealDetail(dealId: string | undefined) {
  return useQuery({
    queryKey: ['deal', 'detail', dealId],
    queryFn: () => fetchMockDealById(dealId as string),
    enabled: !!dealId,
  });
}
