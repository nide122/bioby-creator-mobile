import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { MailboxConnectionResponse } from '@/src/api/account-api';

export type MailSyncResult = {
  processed: number;
  success: number;
  failed: number;
  newMessageIds: number[];
  cursor?: string | null;
  newCount?: number;
  duplicateCount?: number;
  inboxNewCount?: number;
  nonInboxNewCount?: number;
  upToDate?: boolean;
};

export type MailboxSyncLookback = 'INCREMENTAL' | 'ONE_WEEK' | 'ONE_MONTH' | 'THREE_MONTHS' | 'ALL';

export async function syncMailbox(options?: { lookback?: MailboxSyncLookback }): Promise<MailSyncResult | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailSyncResult>('/api/v1/mailbox/sync', {
    method: 'POST',
    body: options?.lookback ? { lookback: options.lookback } : undefined,
  });
}

export type MailProcessingSummary = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
  currentStage?: string | null;
};

export type MailSyncRun = {
  status: string;
  startedAtISO?: string | null;
  endedAtISO?: string | null;
  processed: number;
  success: number;
  failed: number;
  errorMessage?: string | null;
};

export type MailboxSyncStatus = {
  connection: MailboxConnectionResponse;
  lastSync?: MailSyncRun | null;
  mailProcessing: MailProcessingSummary;
  briefExtraction: MailProcessingSummary;
  active: boolean;
};

export async function fetchMailboxSyncStatus(): Promise<MailboxSyncStatus | null> {
  if (!shouldUseBackendApi()) return null;
  try {
    return await apiRequest<MailboxSyncStatus>('/api/v1/mailbox/sync-status');
  } catch {
    return null;
  }
}

export type EmailMessageDetail = {
  id: string;
  subject: string;
  fromAddress: string;
  snippet: string;
  bodyText: string;
  bodyHtml: string;
  sentAtISO?: string | null;
  receivedAtISO?: string | null;
};

export async function fetchEmailMessage(messageId: string): Promise<EmailMessageDetail> {
  return apiRequest<EmailMessageDetail>(`/api/v1/mailbox/messages/${messageId}`);
}
