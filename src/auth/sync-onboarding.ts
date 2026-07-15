import {
  connectMailboxFromOnboarding,
  connectMailboxGoogleOAuthCode,
  connectMailboxGoogleOAuth,
  connectMailboxMicrosoftOAuth,
  updateAgentSendMode,
  upsertCreatorProfile,
} from '@/src/api/account-api';
import { ApiError } from '@/src/api/api-client';
import { enqueueMailboxSync, type MailboxSyncEnqueueResult } from '@/src/api/mailbox-api';
import type { MailboxOAuthAnalyticsContext } from '@/src/api/mailbox-oauth-analytics-api';
import type { CreatorProfileBasics, AgentSendMode } from '@/src/stores/session-store';

import { normalizeOAuthRedirectUri } from '@/src/auth/google-oauth';

export type SyncResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; status?: number };

export type MailboxInitialSyncEnqueue = MailboxSyncEnqueueResult | null;

const FIRST_CONNECT_SYNC_LOOKBACK = 'ONE_MONTH' as const;

const inFlightGoogleCodeExchanges = new Set<string>();

function syncError(err: unknown, fallback: string): SyncResult<never> {
  if (err instanceof ApiError) {
    return { ok: false, error: err.message, code: err.code, status: err.status };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

async function enqueueFirstConnectMailboxSync(
  analytics?: MailboxOAuthAnalyticsContext,
): Promise<MailboxInitialSyncEnqueue> {
  return enqueueMailboxSync({ lookback: FIRST_CONNECT_SYNC_LOOKBACK, analytics });
}

export async function syncProfileToBackend(profile: CreatorProfileBasics): Promise<SyncResult> {
  try {
    await upsertCreatorProfile(profile);
    return { ok: true, data: undefined };
  } catch (err) {
    return syncError(err, 'Profile sync failed');
  }
}

export async function syncAgentSendModeToBackend(mode: AgentSendMode): Promise<SyncResult> {
  try {
    await updateAgentSendMode(mode);
    return { ok: true, data: undefined };
  } catch (err) {
    return syncError(err, 'AI settings sync failed');
  }
}

export async function syncMailboxOAuthToBackend(input: {
  provider: 'google' | 'microsoft';
  accessToken: string;
  refreshToken?: string | null;
  clientId?: string;
  analytics?: MailboxOAuthAnalyticsContext;
}): Promise<SyncResult<MailboxInitialSyncEnqueue>> {
  try {
    if (input.provider === 'google') {
      await connectMailboxGoogleOAuth({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        clientId: input.clientId,
        analyticsFlowId: input.analytics?.flowId,
        analyticsSource: input.analytics?.source,
        analyticsPlatform: input.analytics?.platform,
      });
    } else {
      await connectMailboxMicrosoftOAuth({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
      });
    }
    const enqueueResult = await enqueueFirstConnectMailboxSync(input.analytics);
    return { ok: true, data: enqueueResult };
  } catch (err) {
    return syncError(err, 'Mailbox OAuth sync failed');
  }
}

export async function syncMailboxGoogleOAuthCodeToBackend(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId?: string;
  analytics?: MailboxOAuthAnalyticsContext;
}): Promise<
  SyncResult<{ emailAddress?: string | null; enqueueResult: MailboxInitialSyncEnqueue }>
> {
  const normalizedRedirectUri = normalizeOAuthRedirectUri(input.redirectUri);
  const dedupeKey = `${input.code}:${normalizedRedirectUri}`;
  if (inFlightGoogleCodeExchanges.has(dedupeKey)) {
    return {
      ok: false,
      error: 'Gmail authorization is already being processed. Please wait.',
      code: 'GOOGLE_AUTH_CODE_IN_FLIGHT',
    };
  }
  inFlightGoogleCodeExchanges.add(dedupeKey);
  try {
    const connection = await connectMailboxGoogleOAuthCode({
      ...input,
      redirectUri: normalizedRedirectUri,
      analyticsFlowId: input.analytics?.flowId,
      analyticsSource: input.analytics?.source,
      analyticsPlatform: input.analytics?.platform,
    });
    const enqueueResult = await enqueueFirstConnectMailboxSync(input.analytics);
    return { ok: true, data: { emailAddress: connection?.emailAddress, enqueueResult } };
  } catch (err) {
    return syncError(err, 'Gmail mailbox OAuth code sync failed');
  } finally {
    inFlightGoogleCodeExchanges.delete(dedupeKey);
  }
}

export async function syncMailboxToBackend(input: {
  emailAddress: string;
  password: string;
  preset?: 'gmail' | 'outlook' | 'qq';
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}): Promise<SyncResult<MailboxInitialSyncEnqueue>> {
  try {
    await connectMailboxFromOnboarding(input);
    const enqueueResult = await enqueueFirstConnectMailboxSync();
    return { ok: true, data: enqueueResult };
  } catch (err) {
    return syncError(err, 'Mailbox sync failed');
  }
}
