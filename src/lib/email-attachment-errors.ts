import type { TFunction } from 'i18next';

import { ApiError } from '@/src/api/api-client';

const MAILBOX_CONNECTION_ERROR_CODES = new Set([
  'MAILBOX_DISCONNECTED',
  'MAILBOX_NOT_CONNECTED',
  'TOKEN_DECRYPT_FAILED',
  'MAILBOX_IMAP_AUTH_FAILED',
  'MAILBOX_IMAP_CONNECT_FAILED',
  'MAILBOX_ACCESS_TOKEN_MISSING',
  'MAILBOX_RECONSENT_REQUIRED',
]);

export type AttachmentMailboxAction = 'preview' | 'download' | 'parse';

export function isAttachmentMailboxConnectionError(error: unknown): boolean {
  return error instanceof ApiError && MAILBOX_CONNECTION_ERROR_CODES.has(error.code);
}

export function attachmentMailboxReconnectMessage(
  t: TFunction,
  action: AttachmentMailboxAction,
  mailboxEmailAddress?: string | null,
): string {
  const email = mailboxEmailAddress?.trim() || t('emailAttachments.mailboxEmailFallback');
  const key =
    action === 'download'
      ? 'emailAttachments.downloadFailed'
      : action === 'parse'
        ? 'emailAttachments.parseFailed'
        : 'emailAttachments.previewFailed';
  return t(key, { email });
}

export function resolveAttachmentParseErrorMessage(
  t: TFunction,
  mailboxEmailAddress: string | null | undefined,
  error: unknown,
): string {
  if (error instanceof ApiError && error.code === 'REQUEST_TIMEOUT') {
    return t('contractSummary.timeoutFailed');
  }
  if (isAttachmentMailboxConnectionError(error)) {
    return attachmentMailboxReconnectMessage(t, 'parse', mailboxEmailAddress);
  }
  if (error instanceof ApiError && error.status === 0) {
    return t('contractSummary.networkFailed');
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return t('contractSummary.failed');
}
