import type { TFunction } from 'i18next';

import type { InboxMessageStats } from '@/src/types/domain';

export function formatInboxMessageStats(
  stats: InboxMessageStats | undefined,
  fallbackCount: number | undefined,
  t: TFunction,
): string {
  if (stats) {
    const parts = [
      t('inboxScreen.messageStatsReceived', { count: stats.received }),
      t('inboxScreen.messageStatsSent', { count: stats.sent }),
    ];
    if (stats.unread > 0) {
      parts.push(t('inboxScreen.messageStatsUnread', { count: stats.unread }));
    }
    return parts.join(' · ');
  }
  return t('inboxScreen.threadMessageCount', { count: Math.max(1, fallbackCount ?? 1) });
}

export function formatThreadToggleLabel(
  stats: InboxMessageStats | undefined,
  messageCount: number,
  t: TFunction,
): string {
  if (stats) {
    const parts = [
      t('inboxThreadDetail.threadStatsReceived', { count: stats.received }),
      t('inboxThreadDetail.threadStatsSent', { count: stats.sent }),
    ];
    if (stats.unread > 0) {
      parts.push(t('inboxThreadDetail.threadStatsUnread', { count: stats.unread }));
    }
    return parts.join(' · ');
  }
  return t('inboxThreadDetail.threadToggle', { count: messageCount });
}

export function hasUnreadMessages(stats: InboxMessageStats | undefined): boolean {
  return (stats?.unreadReceived ?? stats?.unread ?? 0) > 0;
}
