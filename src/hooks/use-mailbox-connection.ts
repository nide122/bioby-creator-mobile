import { useQuery } from '@tanstack/react-query';

import { fetchMailboxConnection, type MailboxConnectionResponse } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useTenantApiQueryEnabled, useTenantQueryKey } from '@/src/lib/tenant-query';

export function useMailboxConnection() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('mailbox', 'connection', { api: apiMode });
  const enabled = useTenantApiQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: async (): Promise<MailboxConnectionResponse | null> => fetchMailboxConnection(),
    enabled,
  });
}
