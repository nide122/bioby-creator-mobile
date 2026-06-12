import { useQuery } from '@tanstack/react-query';
import { fetchMockDealList } from '@/src/api/mock-deals';

export function useMockDealList(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  return useQuery({
    queryKey: ['deals', 'list', { empty }],
    queryFn: () => fetchMockDealList({ empty }),
  });
}
