import { useQuery } from '@tanstack/react-query';

import { fetchMockInboxThreadDetail } from '@/src/api/mock-inbox';
import { applyInboxDetailCorrection, useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';

export function useMockInboxThreadDetail(threadId: string | undefined) {
  const corrections = useInboxCorrectionStore((s) => s.classificationByThreadId);
  const query = useQuery({
    queryKey: ['inbox', 'thread', threadId],
    queryFn: () => fetchMockInboxThreadDetail(threadId as string),
    enabled: !!threadId,
  });

  return {
    ...query,
    data: query.data ? applyInboxDetailCorrection(query.data, corrections) : query.data,
  };
}
