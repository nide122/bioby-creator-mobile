import { useQuery } from '@tanstack/react-query';
import { fetchMockDisputes, fetchMockPayments, fetchMockPaymentsOverview } from '@/src/api/mock-money';

export function useMockPayments(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  return useQuery({
    queryKey: ['payments', 'creator', { empty }],
    queryFn: () => fetchMockPayments({ empty }),
  });
}

export function useMockPaymentsOverview(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  return useQuery({
    queryKey: ['payments', 'overview', { empty }],
    queryFn: () => fetchMockPaymentsOverview({ empty }),
  });
}

export function useMockDisputes(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  return useQuery({
    queryKey: ['disputes', 'creator', { empty }],
    queryFn: () => fetchMockDisputes({ empty }),
  });
}
