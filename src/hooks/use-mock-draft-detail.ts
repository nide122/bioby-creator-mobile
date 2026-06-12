import { useQuery } from '@tanstack/react-query';

import { fetchMockDraftDetail } from '@/src/api/mock-draft';

export function useMockDraftDetail(draftId: string | undefined) {
  return useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => fetchMockDraftDetail(draftId as string),
    enabled: !!draftId,
  });
}
