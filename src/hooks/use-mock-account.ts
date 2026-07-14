import { useQuery } from '@tanstack/react-query';

import { fetchMockSubscriptionUsage } from '@/src/api/mock-account';

export function useMockSubscriptionUsage() {
  return useQuery({
    queryKey: ['account', 'subscription-usage'],
    queryFn: fetchMockSubscriptionUsage,
  });
}
