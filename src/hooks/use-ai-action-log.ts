import { useQuery } from '@tanstack/react-query';

import { fetchAiActionLog } from '@/src/api/home-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { buildMockAiActionLog } from '@/src/api/mock-ai-actions';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';
import { useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';

export function useAiActionLog() {
  const corrections = useInboxCorrectionStore((s) => s.classificationByThreadId);
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('home', 'action-log', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!apiMode) {
        return buildMockAiActionLog(corrections);
      }
      const server = await fetchAiActionLog();
      const local = buildMockAiActionLog(corrections).filter((e) => e.kind === 'corrected');
      return [...local, ...server];
    },
    enabled,
    staleTime: 60 * 1000,
  });

  return query.data ?? [];
}
