import { useQuery } from '@tanstack/react-query';
import { fetchMockInboxThreads, fetchMockAiDailySummary } from '@/src/api/mock-inbox';
import { applyInboxClassificationCorrection, useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';

export function useMockInboxThreads(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  const corrections = useInboxCorrectionStore((s) => s.classificationByThreadId);
  const query = useQuery({
    queryKey: ['inbox', 'threads', { empty }],
    queryFn: () => fetchMockInboxThreads({ empty }),
  });

  return {
    ...query,
    data: query.data?.map((thread) => applyInboxClassificationCorrection(thread, corrections)),
  };
}

export function useAiDailySummary() {
  return useQuery({
    queryKey: ['inbox', 'ai-daily-summary'],
    queryFn: fetchMockAiDailySummary,
    staleTime: 5 * 60 * 1000,
  });
}
