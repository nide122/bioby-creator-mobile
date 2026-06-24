import { apiRequest, apiDownloadBlob } from '@/src/api/api-client';
import { mapContractSummary } from '@/src/api/contract-summary-api';
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
  endedAtISO?: string | null;
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

export type AiProcessingCapabilities = {
  classificationMode: 'llm' | 'rules';
  briefExtractionMode: 'llm' | 'rules';
  classificationLlmConfigured: boolean;
  briefLlmConfigured: boolean;
  rulesFallbackEnabled: boolean;
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
  writeback: {
    total: number;
    pending: number;
    processing: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    lastErrorMessage?: string | null;
  };
  subscription: {
    active: number;
    renewalDue: number;
    expired: number;
    error: number;
    disabled: number;
    nextExpiresAtISO?: string | null;
    lastRenewedAtISO?: string | null;
    pushRegistrationConfigured?: boolean;
    pushRegistrationMissingReason?: string | null;
    pushSetupRequired?: boolean;
  };
  aiProcessing?: AiProcessingCapabilities | null;
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

export type MailboxSubscriptionRow = {
  id: number;
  provider: string;
  resource: string;
  remoteSubscriptionId?: string | null;
  status: string;
  notificationUrl?: string | null;
  expiresAtISO?: string | null;
  lastRenewedAtISO?: string | null;
  updatedAtISO?: string | null;
};

export async function fetchMailboxSubscriptions(): Promise<MailboxSubscriptionRow[] | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxSubscriptionRow[]>('/api/v1/mailbox/subscriptions');
}

export async function registerMailboxSubscription(): Promise<MailboxSubscriptionRow[] | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxSubscriptionRow[]>('/api/v1/mailbox/subscription/register', {
    method: 'POST',
  });
}

export async function renewMailboxSubscription(): Promise<MailboxSubscriptionRow[] | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxSubscriptionRow[]>('/api/v1/mailbox/subscription/renew', {
    method: 'POST',
  });
}

export async function cancelMailboxSubscription(): Promise<MailboxSubscriptionRow[] | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxSubscriptionRow[]>('/api/v1/mailbox/subscription/cancel', {
    method: 'POST',
  });
}

export type MailboxSyncCursorRow = {
  id: number;
  mailboxConnectionId: number;
  provider: string;
  resource: string;
  cursorType: string;
  cursorPreview?: string | null;
  cursorLength: number;
  lastFullSyncAtISO?: string | null;
  updatedAtISO?: string | null;
};

export async function fetchMailboxSyncCursors(): Promise<MailboxSyncCursorRow[] | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxSyncCursorRow[]>('/api/v1/mailbox/sync-cursors');
}

export type MailboxWritebackJob = {
  id: number;
  emailMessageId?: number | null;
  provider: string;
  operation: string;
  status: string;
  attemptCount: number;
  errorMessage?: string | null;
  createdAtISO?: string | null;
  updatedAtISO?: string | null;
};

export type MailboxWritebackRetryResult = {
  retried: number;
  jobs: MailboxWritebackJob[];
};

export async function fetchMailboxWritebackJobs(options?: {
  status?: string;
  limit?: number;
}): Promise<MailboxWritebackJob[] | null> {
  if (!shouldUseBackendApi()) return null;
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  return apiRequest<MailboxWritebackJob[]>(`/api/v1/mailbox/writeback-jobs${query ? `?${query}` : ''}`);
}

export async function retryMailboxWritebackJob(jobId: number): Promise<MailboxWritebackJob | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxWritebackJob>(`/api/v1/mailbox/writeback-jobs/${jobId}/retry`, {
    method: 'POST',
  });
}

export async function cancelMailboxWritebackJob(jobId: number): Promise<MailboxWritebackJob | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxWritebackJob>(`/api/v1/mailbox/writeback-jobs/${jobId}/cancel`, {
    method: 'POST',
  });
}

export async function retryFailedMailboxWritebackJobs(limit?: number): Promise<MailboxWritebackRetryResult | null> {
  if (!shouldUseBackendApi()) return null;
  const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest<MailboxWritebackRetryResult>(`/api/v1/mailbox/writeback-jobs/retry-failed${query}`, {
    method: 'POST',
  });
}

export type EmailAttachment = {
  id: string;
  filename: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  inline?: boolean;
};

export type EmailMessageDetail = {
  id: string;
  subject: string;
  fromAddress: string;
  fromLabel?: string;
  direction?: 'inbound' | 'outbound';
  snippet: string;
  bodyText: string;
  bodyHtml: string;
  sentAtISO?: string | null;
  receivedAtISO?: string | null;
  attachments?: EmailAttachment[];
  documentSummary?: import('@/src/api/contract-summary-api').ContractSummary | null;
};

export async function fetchEmailMessage(messageId: string): Promise<EmailMessageDetail> {
  const result = await apiRequest<EmailMessageDetail>(`/api/v1/mailbox/messages/${messageId}`);
  return {
    ...result,
    documentSummary: result.documentSummary ? mapContractSummary(result.documentSummary) : null,
  };
}

export async function downloadEmailAttachment(messageId: string, attachmentId: string): Promise<Blob> {
  return apiDownloadBlob(`/api/v1/mailbox/messages/${messageId}/attachments/${attachmentId}`);
}

export type MailboxLabelWritebackInput = {
  addLabels?: string[];
  removeLabels?: string[];
  markRead?: boolean;
};

export type MailboxLabelWritebackResult = {
  jobId: number;
  emailMessageId: number;
  provider: string;
  success: boolean;
  providerLabels: string[];
  providerCategories: string[];
  read?: boolean | null;
  errorMessage?: string | null;
};

export async function writebackMailboxLabels(
  messageId: string,
  input: MailboxLabelWritebackInput,
): Promise<MailboxLabelWritebackResult> {
  return apiRequest<MailboxLabelWritebackResult>(`/api/v1/mailbox/messages/${messageId}/labels`, {
    method: 'POST',
    body: input,
  });
}
