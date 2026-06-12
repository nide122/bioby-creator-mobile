import { useQuery } from '@tanstack/react-query';

import { fetchMailboxSyncStatus } from '@/src/api/mailbox-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';

export function useMailboxSyncStatus() {
  const apiMode = shouldUseBackendApi();
  return useQuery({
    queryKey: ['mailbox', 'sync-status', { api: apiMode }],
    queryFn: fetchMailboxSyncStatus,
    enabled: apiMode,
    refetchInterval: (current) => {
      const active = current.state.data?.active;
      return active ? 2500 : false;
    },
  });
}
