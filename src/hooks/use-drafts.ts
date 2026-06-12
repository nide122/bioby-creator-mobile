import { useQuery } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchDraftDetail, fetchDraftList } from '@/src/api/drafts-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';

export function useDrafts(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('drafts', 'list', { empty, api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => (empty ? Promise.resolve([]) : fetchDraftList()),
    enabled,
  });
}

export function useDraftDetail(draftId: string | undefined) {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('drafts', 'detail', draftId, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => fetchDraftDetail(draftId as string),
    enabled: enabled && !!draftId,
  });
}

/** @deprecated use useDrafts */
export const useMockDrafts = useDrafts;

/** @deprecated use useDraftDetail */
export const useMockDraftDetail = useDraftDetail;
