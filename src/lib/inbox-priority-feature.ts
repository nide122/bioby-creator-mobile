import type { InboxThread } from '@/src/types/domain';

/** When true, Priority tab uses P0–P2 sections instead of legacy value bands. */
export function isInboxPriorityUiEnabled(threads: Pick<InboxThread, 'priorityScore'>[]): boolean {
  const raw = process.env.EXPO_PUBLIC_INBOX_PRIORITY_ENABLED?.trim().toLowerCase();
  if (raw === 'false' || raw === '0') return false;
  if (raw === 'true' || raw === '1') return true;
  return threads.length === 0 || threads.some((thread) => thread.priorityScore != null);
}
