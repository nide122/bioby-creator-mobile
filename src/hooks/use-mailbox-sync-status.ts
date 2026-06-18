import { useQuery } from '@tanstack/react-query';

import { fetchMailboxSyncStatus } from '@/src/api/mailbox-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { isMailboxPipelineActive } from '@/src/lib/mailbox-sync-display';

export function useMailboxSyncStatus() {
  const apiMode = shouldUseBackendApi();
  return useQuery({
    queryKey: ['mailbox', 'sync-status', { api: apiMode }],
    queryFn: fetchMailboxSyncStatus,
    enabled: apiMode,
    refetchInterval: (current) => (isMailboxPipelineActive(current.state.data) ? 2500 : false),
  });
}
