import { useQuery } from '@tanstack/react-query';
import { fetchMockDrafts } from '@/src/api/mock-draft';

export function useMockDrafts(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  return useQuery({
    queryKey: ['drafts', { empty }],
    queryFn: () => fetchMockDrafts({ empty }),
  });
}
