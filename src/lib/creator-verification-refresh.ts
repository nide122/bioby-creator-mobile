import type { QueryClient } from '@tanstack/react-query';

import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { refreshInboxQueries } from '@/src/lib/mailbox-sync-display';

/** Refetch inbox + pipeline state after creator email verification. */
export async function refreshAfterCreatorVerification(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    invalidateTenantScopedQueries(queryClient),
    queryClient.invalidateQueries({ queryKey: ['mailbox', 'sync-status'] }),
    queryClient.invalidateQueries({ queryKey: ['mailbox', 'messages'] }),
    queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
    refreshInboxQueries(queryClient),
  ]);
}
