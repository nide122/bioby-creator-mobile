import type { TFunction } from 'i18next';

import { ApiError } from '@/src/api/api-client';

const ERROR_PREFIX = 'draftDetail.mailboxDraftErrors.';

export function resolveMailboxDraftError(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    const key = `${ERROR_PREFIX}${error.code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  const message = error instanceof Error ? error.message : '';
  return normalizeMailboxDraftProviderError(message, t);
}

export function normalizeMailboxDraftProviderError(message: string, t: TFunction): string {
  if (
    message.includes('Requested entity was not found')
    || message.includes('"reason": "notFound"')
    || message.includes('"status": "NOT_FOUND"')
  ) {
    const key = `${ERROR_PREFIX}REMOTE_DRAFT_STALE`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return message.trim() || t('draftDetail.nativeDraftErrorBody');
}

export function mailboxCanWriteNativeDrafts(capabilities: string[] | undefined | null): boolean {
  return (capabilities ?? []).includes('NATIVE_DRAFTS');
}

export function mailboxCanSend(capabilities: string[] | undefined | null): boolean {
  return (capabilities ?? []).includes('SEND');
}

export function mailboxDraftFlowReady(
  capabilities: string[] | undefined | null,
  reconsentRequired?: boolean,
): boolean {
  if (reconsentRequired) return false;
  return mailboxCanWriteNativeDrafts(capabilities);
}

export function mailboxSendFlowReady(
  capabilities: string[] | undefined | null,
  reconsentRequired?: boolean,
): boolean {
  if (reconsentRequired) return false;
  return mailboxCanWriteNativeDrafts(capabilities) && mailboxCanSend(capabilities);
}
