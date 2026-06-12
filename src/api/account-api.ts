import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { SubscriptionUsageSnapshot, TeamRoleCard } from '@/src/types/domain';
import type { AgentSendMode, CreatorFocusMode, CreatorProfileBasics } from '@/src/stores/session-store';

export async function upsertCreatorProfile(profile: CreatorProfileBasics): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest('/api/v1/account/creator-profile', {
    method: 'PUT',
    body: {
      displayName: profile.displayName,
      bio: profile.bio ?? '',
      profileUrl: profile.profileUrl ?? '',
      platform: profile.platform ?? 'other',
      nicheTags: profile.nicheTags ?? [],
      platforms: profile.platforms ?? [],
    },
  });
}

export async function updateTenantSettings(input: {
  agentSendMode?: AgentSendMode;
  creatorFocusMode?: CreatorFocusMode;
  onboardingCompletedAt?: string;
  inboxSetupSkipped?: boolean;
}): Promise<void> {
  if (!shouldUseBackendApi()) return;
  const body: Record<string, string | boolean> = {};
  if (input.agentSendMode) body.agentSendMode = input.agentSendMode;
  if (input.creatorFocusMode) body.creatorFocusMode = input.creatorFocusMode;
  if (input.onboardingCompletedAt) body.onboardingCompletedAt = input.onboardingCompletedAt;
  if (input.inboxSetupSkipped !== undefined) body.inboxSetupSkipped = input.inboxSetupSkipped;
  if (Object.keys(body).length === 0) return;
  await apiRequest('/api/v1/account/settings', { method: 'PATCH', body });
}

export async function markOnboardingCompleted(input: {
  agentSendMode: AgentSendMode;
  creatorFocusMode?: CreatorFocusMode;
}): Promise<void> {
  await updateTenantSettings({
    agentSendMode: input.agentSendMode,
    creatorFocusMode: input.creatorFocusMode ?? 'quiet',
    onboardingCompletedAt: new Date().toISOString(),
  });
}

export async function markInboxSetupSkipped(input?: {
  agentSendMode?: AgentSendMode;
  creatorFocusMode?: CreatorFocusMode;
}): Promise<void> {
  await updateTenantSettings({
    inboxSetupSkipped: true,
    ...(input?.agentSendMode ? { agentSendMode: input.agentSendMode } : {}),
    ...(input?.creatorFocusMode ? { creatorFocusMode: input.creatorFocusMode } : {}),
  });
}

export async function updateAgentSendMode(mode: AgentSendMode): Promise<void> {
  await updateTenantSettings({ agentSendMode: mode });
}

type CreatorProfileResponse = {
  displayName: string;
  bio?: string | null;
  profileUrl?: string | null;
  platform?: string | null;
  nicheTags?: string[];
  platforms?: string[];
};

export type AccountOverviewResponse = {
  profile: CreatorProfileResponse | null;
  subscription: SubscriptionUsageSnapshot;
  mailbox: {
    connected: boolean;
    emailAddress: string | null;
    provider: string | null;
    status: string | null;
    lastSyncAtISO?: string | null;
  };
  tenantDisplayName: string;
  tenantType: string;
  agentSendMode: AgentSendMode;
  creatorFocusMode: CreatorFocusMode;
  onboardingCompletedAt?: string | null;
  inboxSetupSkipped?: boolean;
};

export async function fetchAccountOverview(): Promise<AccountOverviewResponse | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<AccountOverviewResponse>('/api/v1/account/overview');
}

export async function fetchCreatorProfile(): Promise<CreatorProfileBasics | null> {
  if (!shouldUseBackendApi()) return null;
  try {
    const view = await apiRequest<CreatorProfileResponse>('/api/v1/account/creator-profile');
    return {
      displayName: view.displayName,
      niche: (view.nicheTags ?? []).join(' / ') || view.bio || '',
      platforms: view.platforms ?? [],
      profileUrl: view.profileUrl ?? undefined,
      platform: (view.platform as CreatorProfileBasics['platform']) ?? 'other',
      platformLabel: view.platform ?? 'Other',
      bio: view.bio ?? undefined,
      nicheTags: view.nicheTags ?? [],
    };
  } catch {
    return null;
  }
}

export type MailboxConnectionResponse = {
  emailAddress: string;
  provider?: string;
  status: string;
  lastSyncAtISO?: string | null;
};

export async function fetchMailboxConnection(): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  try {
    return await apiRequest<MailboxConnectionResponse>('/api/v1/mailbox/connection');
  } catch {
    return null;
  }
}

export async function fetchTeamRoles(): Promise<TeamRoleCard[]> {
  if (!shouldUseBackendApi()) {
    const { fetchMockTeamRoles } = await import('@/src/api/mock-account');
    return fetchMockTeamRoles();
  }
  return apiRequest<TeamRoleCard[]>('/api/v1/account/team-roles');
}

export async function fetchSubscriptionUsage(): Promise<SubscriptionUsageSnapshot> {
  if (!shouldUseBackendApi()) {
    const { fetchMockSubscriptionUsage } = await import('@/src/api/mock-account');
    return fetchMockSubscriptionUsage();
  }
  return apiRequest<SubscriptionUsageSnapshot>('/api/v1/account/subscription');
}

export async function connectMailboxGoogleOAuth(input: {
  accessToken: string;
  refreshToken?: string | null;
}): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest('/api/v1/mailbox/connect/oauth/google', {
    method: 'POST',
    body: {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? undefined,
    },
  });
}

export async function connectMailboxMicrosoftOAuth(input: {
  accessToken: string;
  refreshToken?: string | null;
}): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest('/api/v1/mailbox/connect/oauth/microsoft', {
    method: 'POST',
    body: {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? undefined,
    },
  });
}

/** Web flow: sends the authorization code to the backend for server-side exchange with client_secret. */
export async function connectMailboxMicrosoftOAuthCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest('/api/v1/mailbox/connect/oauth/microsoft', {
    method: 'POST',
    body: {
      code: input.code,
      redirectUri: input.redirectUri,
      codeVerifier: input.codeVerifier,
    },
  });
}

export async function connectMailboxFromOnboarding(input: {
  emailAddress: string;
  password: string;
  preset?: 'gmail' | 'outlook' | 'qq';
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}): Promise<void> {
  if (!shouldUseBackendApi()) return;
  const preset =
    input.preset === 'gmail'
      ? 'GMAIL'
      : input.preset === 'outlook'
        ? 'OUTLOOK'
        : input.preset === 'qq'
          ? 'QQ'
          : undefined;
  await apiRequest('/api/v1/mailbox/connect', {
    method: 'POST',
    body: {
      emailAddress: input.emailAddress,
      password: input.password,
      preset,
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
    },
  });
}
