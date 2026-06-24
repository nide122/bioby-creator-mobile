import { useQuery } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchOpportunityThreadDetail } from '@/src/api/opportunities-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';
import { applyInboxDetailCorrection, useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';

export function useInboxThreadDetail(threadId: string | undefined) {
  const corrections = useInboxCorrectionStore((s) => s.classificationByThreadId);
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('inbox', 'thread', threadId, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  const query = useQuery({
    queryKey,
    queryFn: () => fetchOpportunityThreadDetail(threadId as string),
    enabled: enabled && !!threadId,
    refetchInterval: (current) => {
      if (!apiMode) return false;
      const briefPending = current.state.data?.extractionStatus === 'PENDING';
      const contractPending = current.state.data?.contractSummary?.status === 'PENDING';
      return briefPending || contractPending ? 2500 : false;
    },
  });

  return {
    ...query,
    data: query.data
      ? apiMode
        ? query.data
        : applyInboxDetailCorrection(query.data, corrections)
      : query.data,
  };
}

/** @deprecated use useInboxThreadDetail */
export const useMockInboxThreadDetail = useInboxThreadDetail;
