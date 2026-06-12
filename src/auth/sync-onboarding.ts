import {
  connectMailboxFromOnboarding,
  connectMailboxGoogleOAuth,
  connectMailboxMicrosoftOAuth,
  updateAgentSendMode,
  upsertCreatorProfile,
} from '@/src/api/account-api';
import { ApiError } from '@/src/api/api-client';
import { triggerMailboxSync } from '@/src/api/opportunities-api';
import type { CreatorProfileBasics, AgentSendMode } from '@/src/stores/session-store';

export type SyncResult = { ok: true } | { ok: false; error: string };

function syncError(err: unknown, fallback: string): SyncResult {
  const message = err instanceof ApiError ? err.message : fallback;
  return { ok: false, error: message };
}

export async function syncProfileToBackend(profile: CreatorProfileBasics): Promise<SyncResult> {
  try {
    await upsertCreatorProfile(profile);
    return { ok: true };
  } catch (err) {
    return syncError(err, 'Profile sync failed');
  }
}

export async function syncAgentSendModeToBackend(mode: AgentSendMode): Promise<SyncResult> {
  try {
    await updateAgentSendMode(mode);
    return { ok: true };
  } catch (err) {
    return syncError(err, 'AI settings sync failed');
  }
}

export async function syncMailboxOAuthToBackend(input: {
  provider: 'google' | 'microsoft';
  accessToken: string;
  refreshToken?: string | null;
}): Promise<SyncResult> {
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
    await triggerMailboxSync();
    return { ok: true };
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
}): Promise<SyncResult> {
  try {
    await connectMailboxFromOnboarding(input);
    await triggerMailboxSync();
    return { ok: true };
  } catch (err) {
    return syncError(err, 'Mailbox sync failed');
  }
}
