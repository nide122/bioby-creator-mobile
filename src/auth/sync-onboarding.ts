import {
  connectMailboxFromOnboarding,
  connectMailboxGoogleOAuth,
  connectMailboxMicrosoftOAuth,
  updateAgentSendMode,
  upsertCreatorProfile,
} from '@/src/api/account-api';
import { ApiError } from '@/src/api/api-client';
import { triggerMailboxSync } from '@/src/api/opportunities-api';
import type { MailSyncResult } from '@/src/api/opportunities-api';
import type { CreatorProfileBasics, AgentSendMode } from '@/src/stores/session-store';

export type SyncResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; status?: number };

function syncError(err: unknown, fallback: string): SyncResult<never> {
  if (err instanceof ApiError) {
    return { ok: false, error: err.message, code: err.code, status: err.status };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
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
}): Promise<SyncResult<MailSyncResult | null>> {
  try {
    if (input.provider === 'google') {
      await connectMailboxGoogleOAuth({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
      });
    } else {
      await connectMailboxMicrosoftOAuth({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
      });
    }
    const syncResult = await triggerMailboxSync();
    return { ok: true, data: syncResult };
  } catch (err) {
    return syncError(err, 'Mailbox OAuth sync failed');
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
}): Promise<SyncResult<MailSyncResult | null>> {
  try {
    await connectMailboxFromOnboarding(input);
    const syncResult = await triggerMailboxSync();
    return { ok: true, data: syncResult };
  } catch (err) {
    return syncError(err, 'Mailbox sync failed');
  }
}
