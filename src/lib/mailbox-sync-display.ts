import type { QueryClient } from '@tanstack/react-query';

import type { MailboxConnectionResponse } from '@/src/api/account-api';
import type { MailboxSyncStatus } from '@/src/api/mailbox-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { getActiveTenantPublicId, isTenantScopedQueryKey, tenantQueryKey } from '@/src/lib/tenant-query';
import type { AccountOverviewResponse } from '@/src/api/account-api';

export function isMailboxPipelineActive(status: MailboxSyncStatus | null | undefined): boolean {
  if (!status) return false;
  if (status.active) return true;
  const syncJob = status.activeSyncJob;
  if (syncJob?.status === 'PENDING' || syncJob?.status === 'PROCESSING') {
    return true;
  }
  return (
    status.mailProcessing.pending > 0 ||
    status.mailProcessing.processing > 0 ||
    status.briefExtraction.pending > 0 ||
    status.briefExtraction.processing > 0
  );
}

/** Refetch inbox list + AI summary after sync/classification progress. */
export async function refreshInboxQueries(queryClient: QueryClient): Promise<void> {
  const tenantId = getActiveTenantPublicId();
  await queryClient.refetchQueries({
    predicate: (query) => {
      if (!isTenantScopedQueryKey(query.queryKey)) return false;
      if (query.queryKey[1] !== tenantId) return false;
      const segment = query.queryKey[2];
      return segment === 'inbox';
    },
    type: 'active',
  });
}

export function resolveMailboxLastSyncAtISO(options: {
  connectionLastSyncAtISO?: string | null;
  recentSyncEndedAtISO?: string | null;
  syncRunEndedAtISO?: string | null;
  syncRunStartedAtISO?: string | null;
}): string | null {
  return (
    options.connectionLastSyncAtISO ??
    options.recentSyncEndedAtISO ??
    options.syncRunEndedAtISO ??
    options.syncRunStartedAtISO ??
    null
  );
}

/** Keep mailbox last-sync labels accurate immediately after a successful sync response. */
export function applyMailboxLastSyncToCache(queryClient: QueryClient, endedAtISO: string): void {
  if (!endedAtISO.trim()) return;
  const apiMode = shouldUseBackendApi();
  const tenantId = getActiveTenantPublicId();

  queryClient.setQueriesData<MailboxSyncStatus | null>(
    { queryKey: ['mailbox', 'sync-status'] },
    (old) => {
      if (!old?.connection) return old;
      return {
        ...old,
        connection: { ...old.connection, lastSyncAtISO: endedAtISO },
      };
    },
  );

  queryClient.setQueryData(
    tenantQueryKey(tenantId, 'mailbox', 'connection', { api: apiMode }),
    (old: MailboxConnectionResponse | null | undefined) =>
      old ? { ...old, lastSyncAtISO: endedAtISO } : old,
  );

  queryClient.setQueryData(
    tenantQueryKey(tenantId, 'account', 'overview', { api: apiMode }),
    (old: AccountOverviewResponse | null | undefined) => {
      if (!old?.mailbox?.connected) return old;
      return {
        ...old,
        mailbox: { ...old.mailbox, lastSyncAtISO: endedAtISO },
      };
    },
  );
}
