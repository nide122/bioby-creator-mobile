import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchMailboxMessages, type MailboxMessageListItem } from '@/src/api/mailbox-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';

const PAGE_SIZE = 30;

export function useMailboxMessages(options?: { folder?: string; enabled?: boolean }) {
  const apiMode = shouldUseBackendApi();
  const tenantQueryEnabled = useTenantScopedQueryEnabled();
  const folder = options?.folder ?? 'INBOX';
  const enabled = (options?.enabled ?? true) && apiMode && tenantQueryEnabled;
  const queryKey = useTenantQueryKey('mailbox', 'messages', { folder, api: apiMode });

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchMailboxMessages({ folder, page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled,
  });

  const messages: MailboxMessageListItem[] = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    ...query,
    data: messages,
  };
}
