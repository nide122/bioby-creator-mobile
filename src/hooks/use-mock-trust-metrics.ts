import { useQuery } from '@tanstack/react-query';

import { fetchMockTrustMetrics } from '@/src/api/mock-trust';

export function useMockTrustMetrics() {
  return useQuery({
    queryKey: ['trust', 'metrics'],
    queryFn: fetchMockTrustMetrics,
  });
}
