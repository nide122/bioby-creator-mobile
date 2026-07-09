import type { TFunction } from 'i18next';

import type { InboxThread } from '@/src/types/domain';

export function resolveCollaboratorInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function formatInboxRelativeTime(iso: string, locale: string): string {
  const deltaMs = Date.now() - Date.parse(iso);
  const minutes = Math.max(1, Math.round(deltaMs / 60_000));
  if (minutes < 60) {
    return locale.startsWith('zh') ? `${minutes} 分钟前` : `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return locale.startsWith('zh') ? `${hours} 小时前` : `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return locale.startsWith('zh') ? `${days} 天前` : `${days}d ago`;
}

export function resolveInboxCollaborationPresentation(
  thread: InboxThread,
  t: TFunction,
  inboxCategoryLabel: Record<InboxThread['category'], string>,
) {
  const name = thread.brandName?.trim() || thread.subject?.trim() || t('inboxScreen.collaboratorFallback');
  const requestLabel =
    thread.category === 'commercial'
      ? t('inboxScreen.collabRequest')
      : inboxCategoryLabel[thread.category];
  const sourceLabel = t('inboxScreen.sourceEmail');
  const infoLine = `${requestLabel} · ${sourceLabel}`;
  const brandName = thread.claimedBrandName?.trim();
  const brandLine =
    brandName && brandName !== name ? t('inboxScreen.brandLabel', { brand: brandName }) : null;

  return {
    name,
    initials: resolveCollaboratorInitials(name),
    infoLine,
    brandLine,
  };
}
