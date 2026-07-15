import { Platform } from 'react-native';

import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';

export type GmailOAuthAnalyticsEventType =
  | 'GMAIL_CONNECT_VIEWED'
  | 'GMAIL_OAUTH_STARTED'
  | 'GMAIL_OAUTH_CALLBACK_RECEIVED'
  | 'GMAIL_OAUTH_CANCELLED'
  | 'GMAIL_OAUTH_FAILED'
  | 'GMAIL_CONNECT_SKIPPED';

export type MailboxOAuthAnalyticsContext = {
  flowId: string;
  source: string;
  platform: string;
};

export function createMailboxOAuthFlowId(): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${random}`;
}

export function mailboxOAuthPlatform(): string {
  return Platform.OS;
}

export async function trackGmailOAuthEvent(input: {
  eventType: GmailOAuthAnalyticsEventType;
  flowId?: string;
  source: string;
  failureCode?: string;
  durationMs?: number;
}): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest<void>('/api/v1/mailbox/oauth/events', {
    method: 'POST',
    body: {
      ...input,
      platform: mailboxOAuthPlatform(),
    },
    suppressSessionExpiry: true,
  });
}

export function normalizeGmailOAuthFailureCode(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9._:-]+/g, '_').slice(0, 128);
  if (normalized.includes('ACCESS_DENIED') || normalized.includes('PERMISSION_DENIED')) {
    return 'GOOGLE_ACCESS_DENIED';
  }
  if (normalized.includes('CANCEL') || normalized.includes('DISMISS')) {
    return 'GOOGLE_USER_CANCELLED';
  }
  if (/^GOOGLE_[A-Z0-9_]+$/.test(normalized)) {
    return normalized;
  }
  return 'GOOGLE_OAUTH_ERROR';
}
