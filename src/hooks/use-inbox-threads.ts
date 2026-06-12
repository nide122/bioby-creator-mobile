import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchInboxSummary } from '@/src/api/home-api';
import { fetchOpportunityThreadPage, type OpportunityListFilters } from '@/src/api/opportunities-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';
import { applyInboxClassificationCorrection, useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';
import type { InboxEmailCategory } from '@/src/types/domain';

const INBOX_THREAD_PAGE_SIZE = 20;
const EMPTY_CATEGORY_COUNTS: Record<InboxEmailCategory, number> = {
  commercial: 0,
  pr_sample: 0,
  media: 0,
  personal: 0,
  other: 0,
};

export function useInboxThreads(options?: { empty?: boolean; filters?: OpportunityListFilters }) {
  const empty = options?.empty ?? false;
  const filters = options?.filters;
  const corrections = useInboxCorrectionStore((s) => s.classificationByThreadId);
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('inbox', 'threads', { empty, api: apiMode, filters });
  const enabled = useTenantScopedQueryEnabled();
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      empty
        ? Promise.resolve({
            items: [],
            page: pageParam,
            size: INBOX_THREAD_PAGE_SIZE,
            hasMore: false,
            categoryCounts: EMPTY_CATEGORY_COUNTS,
          })
        : fetchOpportunityThreadPage(filters, { page: pageParam, size: INBOX_THREAD_PAGE_SIZE }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled,
    placeholderData: keepPreviousData,
  });

  const threads = query.data?.pages.flatMap((page) => page.items) ?? [];
  const categoryCounts = query.data?.pages[0]?.categoryCounts ?? EMPTY_CATEGORY_COUNTS;
  return {
    ...query,
    categoryCounts,
    data: threads.map((thread) =>
      apiMode ? thread : applyInboxClassificationCorrection(thread, corrections)
    ),
  };
}

/** @deprecated use useInboxThreads */
export const useMockInboxThreads = useInboxThreads;

export function useAiDailySummary() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('inbox', 'ai-daily-summary', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchInboxSummary,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
