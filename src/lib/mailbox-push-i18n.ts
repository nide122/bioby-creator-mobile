import type { TFunction } from 'i18next';

import { ApiError } from '@/src/api/api-client';

const MAILBOX_PUSH_MISSING_REASON_PREFIX = 'inboxScreen.mailboxPushMissingReason.';

export function resolveMailboxPushMissingReason(
  reason: string | null | undefined,
  t: TFunction,
): string {
  if (!reason) return t('inboxScreen.mailboxPushConfigMissing');
  const key = `${MAILBOX_PUSH_MISSING_REASON_PREFIX}${reason}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return t('inboxScreen.mailboxPushConfigMissing');
}

export function resolveMailboxRepairError(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    if (error.code === 'MAILBOX_WEBHOOK_CONFIG_MISSING') {
      return resolveMailboxPushMissingReason(error.message, t);
    }
    if (error.code === 'MAILBOX_PUSH_NOT_SUPPORTED') {
      return resolveMailboxPushMissingReason('PUSH_NOT_SUPPORTED', t);
    }
    if (error.code === 'MAILBOX_RECONSENT_REQUIRED') {
      return resolveMailboxPushMissingReason('RECONSENT_REQUIRED', t);
    }
  }
  return error instanceof Error ? error.message : t('inboxScreen.mailboxRepairFailed');
}
