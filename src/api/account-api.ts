import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { normalizeOAuthRedirectUri } from '@/src/auth/google-oauth';
import {
  buildCreatorProfileBasics,
  migrateLegacyProfileBasics,
} from '@/src/lib/creator-profile-aggregate';
import type { SubscriptionUsageSnapshot, TeamRoleCard } from '@/src/types/domain';
import type { CreatorPlatformProfile, PresetPlatformKey } from '@/src/types/creator-profile';
import type { AgentSendMode, ClassificationStrictness, CreatorFocusMode, CreatorProfileBasics } from '@/src/stores/session-store';

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
      platformProfiles: profile.platformProfiles ?? null,
    },
  });
}

export async function updateTenantSettings(input: {
  agentSendMode?: AgentSendMode;
  creatorFocusMode?: CreatorFocusMode;
  classificationStrictness?: ClassificationStrictness;
  onboardingCompletedAt?: string;
  inboxSetupSkipped?: boolean;
  preferredLocale?: 'en' | 'zh';
}): Promise<void> {
  if (!shouldUseBackendApi()) return;
  const body: Record<string, string | boolean> = {};
  if (input.agentSendMode) body.agentSendMode = input.agentSendMode;
  if (input.creatorFocusMode) body.creatorFocusMode = input.creatorFocusMode;
  if (input.classificationStrictness) body.classificationStrictness = input.classificationStrictness;
  if (input.onboardingCompletedAt) body.onboardingCompletedAt = input.onboardingCompletedAt;
  if (input.inboxSetupSkipped !== undefined) body.inboxSetupSkipped = input.inboxSetupSkipped;
  if (input.preferredLocale) body.preferredLocale = input.preferredLocale;
  if (Object.keys(body).length === 0) return;
  await apiRequest('/api/v1/account/settings', { method: 'PATCH', body });
}

export async function markOnboardingCompleted(input: {
  agentSendMode: AgentSendMode;
  creatorFocusMode?: CreatorFocusMode;
  classificationStrictness?: ClassificationStrictness;
}): Promise<void> {
  await updateTenantSettings({
    agentSendMode: input.agentSendMode,
    creatorFocusMode: input.creatorFocusMode ?? 'quiet',
    classificationStrictness: input.classificationStrictness ?? 'standard',
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
  platformProfiles?: Partial<Record<PresetPlatformKey, CreatorPlatformProfile>>;
};

export function mapCreatorProfileResponse(view: CreatorProfileResponse): CreatorProfileBasics {
  const partial: CreatorProfileBasics = {
    displayName: view.displayName,
    niche: (view.nicheTags ?? []).join(' / ') || view.bio || '',
    platforms: view.platforms ?? [],
    profileUrl: view.profileUrl ?? undefined,
    platform: (view.platform as CreatorProfileBasics['platform']) ?? 'other',
    platformLabel: view.platform ?? 'Other',
    bio: view.bio ?? undefined,
    nicheTags: view.nicheTags ?? [],
    platformProfiles: view.platformProfiles as CreatorProfileBasics['platformProfiles'],
  };
  const migrated = migrateLegacyProfileBasics(partial);
  return buildCreatorProfileBasics({
    summary: migrated.summary,
    platformProfiles: migrated.platformProfiles,
  });
}

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
  classificationStrictness?: ClassificationStrictness;
  inboxFilterConfigured?: boolean;
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
    return mapCreatorProfileResponse(view);
  } catch {
    return null;
  }
}

export type MailboxConnectionResponse = {
  emailAddress: string;
  provider?: string;
  status: string;
  lastSyncAtISO?: string | null;
  syncCursor?: string | null;
  providerAccountId?: string | null;
  grantedScopes?: string[];
  capabilities?: string[];
  reconsentRequired?: boolean;
  watchExpiresAtISO?: string | null;
  imapHost?: string | null;
  imapPort?: number | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
};

export async function fetchMailboxConnection(): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  try {
    return await apiRequest<MailboxConnectionResponse>('/api/v1/mailbox/connection');
  } catch {
    return null;
  }
}

export type MailboxOAuthProviderStatusResponse = {
  provider: string;
  clientConfigured: boolean;
  codeExchangeEnabled: boolean;
  refreshTokenSupported: boolean;
  scopes: string[];
};

export async function fetchGoogleMailboxOAuthStatus(): Promise<MailboxOAuthProviderStatusResponse | null> {
  if (!shouldUseBackendApi()) return null;
  try {
    return await apiRequest<MailboxOAuthProviderStatusResponse>('/api/v1/mailbox/oauth/google/status');
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
  clientId?: string;
}): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxConnectionResponse>('/api/v1/mailbox/connect/oauth/google', {
    method: 'POST',
    body: {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? undefined,
      clientId: input.clientId,
    },
  });
}

/** Web flow: sends the Gmail mailbox authorization code to the backend for server-side exchange. */
export async function connectMailboxGoogleOAuthCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId?: string;
}): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxConnectionResponse>('/api/v1/mailbox/connect/oauth/google', {
    method: 'POST',
    body: {
      code: input.code,
      redirectUri: normalizeOAuthRedirectUri(input.redirectUri),
      codeVerifier: input.codeVerifier,
      clientId: input.clientId,
    },
  });
}

export async function connectMailboxMicrosoftOAuth(input: {
  accessToken: string;
  refreshToken?: string | null;
}): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxConnectionResponse>('/api/v1/mailbox/connect/oauth/microsoft', {
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
}): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxConnectionResponse>('/api/v1/mailbox/connect/oauth/microsoft', {
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
