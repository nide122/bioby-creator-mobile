import { QueryClient } from '@tanstack/react-query';

jest.mock('@/src/api/should-use-backend-api', () => ({
  shouldUseBackendApi: () => true,
}));

import type { MailboxSyncStatus } from '@/src/api/mailbox-api';
import {
  applyMailboxLastSyncToCache,
  isMailboxPipelineActive,
  resolveMailboxLastSyncAtISO,
} from '@/src/lib/mailbox-sync-display';

describe('mailbox-sync-display', () => {
  it('prefers connection last sync, then recent sync response, then sync run', () => {
    expect(
      resolveMailboxLastSyncAtISO({
        connectionLastSyncAtISO: '2026-06-01T10:00:00Z',
        recentSyncEndedAtISO: '2026-06-02T10:00:00Z',
        syncRunEndedAtISO: '2026-06-03T10:00:00Z',
      })
    ).toBe('2026-06-01T10:00:00Z');

    expect(
      resolveMailboxLastSyncAtISO({
        recentSyncEndedAtISO: '2026-06-02T10:00:00Z',
        syncRunEndedAtISO: '2026-06-03T10:00:00Z',
      })
    ).toBe('2026-06-02T10:00:00Z');
  });

  it('patches mailbox sync-status cache with endedAtISO', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['mailbox', 'sync-status', { api: true }], {
      connection: { emailAddress: 'a@b.com', status: 'CONNECTED' },
      active: false,
    } satisfies Partial<MailboxSyncStatus>);

    applyMailboxLastSyncToCache(queryClient, '2026-06-17T12:00:00Z');

    const updated = queryClient.getQueryData<MailboxSyncStatus>(['mailbox', 'sync-status', { api: true }]);
    expect(updated?.connection.lastSyncAtISO).toBe('2026-06-17T12:00:00Z');
  });

  it('detects mailbox pipeline activity from processing counters', () => {
    expect(isMailboxPipelineActive(null)).toBe(false);
    expect(
      isMailboxPipelineActive({
        active: false,
        mailProcessing: { total: 1, pending: 1, processing: 0, completed: 0, failed: 0, skipped: 0 },
        briefExtraction: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 },
      } as MailboxSyncStatus)
    ).toBe(true);
  });
});
