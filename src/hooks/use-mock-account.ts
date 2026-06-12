import { useQuery } from '@tanstack/react-query';

import { fetchMockSubscriptionUsage, fetchMockTeamRoles } from '@/src/api/mock-account';

export function useMockTeamRoles() {
  return useQuery({
    queryKey: ['account', 'team-roles'],
    queryFn: fetchMockTeamRoles,
  });
}

export function useMockSubscriptionUsage() {
  return useQuery({
    queryKey: ['account', 'subscription-usage'],
    queryFn: fetchMockSubscriptionUsage,
  });
}
