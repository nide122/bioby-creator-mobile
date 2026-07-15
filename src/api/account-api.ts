import { apiDownloadBlob, apiRequest } from '@/src/api/api-client';
import {
  mapAccountOverview,
  mapCreatorProfileResponse,
  mapCreatorVerification,
  mapOnboardingStatus,
  mapSubscriptionUsage,
  type AccountOverviewResponse,
  type CreatorVerificationResponse,
  type MailboxConnectionResponse,
  type MailboxOAuthProviderStatusResponse,
} from '@/src/api/account-mappers';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { normalizeOAuthRedirectUri } from '@/src/auth/google-oauth';
import type {
  AccountDeletionRequestView,
  AccountOverviewView,
  CreatorProfileView,
  CreatorVerificationView,
  MailboxConnectionView,
  MailboxOAuthProviderStatusView,
  OnboardingStatusView,
  SubscriptionUsageView,
} from '@/src/types/api';
import type { OnboardingDashboardStatus } from '@/src/lib/onboarding-status';
import type { SubscriptionUsageSnapshot } from '@/src/types/domain';
import type { AgentSendMode, ClassificationStrictness, CreatorFocusMode, CreatorProfileBasics } from '@/src/stores/session-store';

export {
  mapCreatorProfileResponse,
  type AccountOverviewResponse,
  type CreatorVerificationResponse,
  type MailboxConnectionResponse,
  type MailboxOAuthProviderStatusResponse,
} from '@/src/api/account-mappers';

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

/** Clears server onboarding completion and disconnects mailbox so setup can be replayed. */
export async function resetOnboardingOnServer(): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest('/api/v1/account/reset-onboarding', { method: 'POST' });
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

export async function fetchAccountOverview(): Promise<AccountOverviewResponse | null> {
  if (!shouldUseBackendApi()) return null;
  const view = await apiRequest<AccountOverviewView>('/api/v1/account/overview');
  return mapAccountOverview(view);
}

export async function downloadWorkspaceExportJson(): Promise<Blob> {
  return apiDownloadBlob('/api/v1/account/export.json');
}

export type AccountDeletionRequestResponse = {
  deletionRequestedAtISO?: string;
  deletionScheduledAtISO?: string;
  accountDataRetentionDays?: number;
  status?: string;
};

export async function requestAccountDeletion(): Promise<AccountDeletionRequestResponse> {
  const view = await apiRequest<AccountDeletionRequestView>('/api/v1/account/deletion-request', {
    method: 'POST',
  });
  return {
    deletionRequestedAtISO: view.deletionRequestedAtISO ?? undefined,
    deletionScheduledAtISO: view.deletionScheduledAtISO ?? undefined,
    accountDataRetentionDays: view.accountDataRetentionDays ?? undefined,
    status: view.status ?? undefined,
  };
}

export async function fetchOnboardingStatus(): Promise<OnboardingDashboardStatus | null> {
  if (!shouldUseBackendApi()) return null;
  const view = await apiRequest<OnboardingStatusView>(
    '/api/v1/account/onboarding-status',
  );
  return mapOnboardingStatus(view);
}

export async function fetchCreatorVerificationStatus(): Promise<CreatorVerificationResponse | null> {
  if (!shouldUseBackendApi()) return null;
  const view = await apiRequest<CreatorVerificationView>('/api/v1/account/creator-verification');
  return mapCreatorVerification(view);
}

export async function verifyCreatorEmail(): Promise<CreatorVerificationResponse> {
  const view = await apiRequest<CreatorVerificationView>('/api/v1/account/creator-verification/verify-email', {
    method: 'POST',
  });
  return mapCreatorVerification(view);
}

/** Dev-only: skip homepage/mailbox comparison and mark verified. */
export async function forceVerifyCreatorEmailDev(): Promise<CreatorVerificationResponse> {
  const view = await apiRequest<CreatorVerificationView>('/api/v1/account/creator-verification/dev/force-verify', {
    method: 'POST',
  });
  return mapCreatorVerification(view);
}

export async function fetchCreatorProfile(): Promise<CreatorProfileBasics | null> {
  if (!shouldUseBackendApi()) return null;
  try {
    const view = await apiRequest<CreatorProfileView>('/api/v1/account/creator-profile');
    return mapCreatorProfileResponse(view);
  } catch {
    return null;
  }
}

export async function fetchMailboxConnection(): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  try {
    return await apiRequest<MailboxConnectionView>('/api/v1/mailbox/connection');
  } catch {
    return null;
  }
}

export async function fetchGoogleMailboxOAuthStatus(): Promise<MailboxOAuthProviderStatusResponse | null> {
  if (!shouldUseBackendApi()) return null;
  try {
    return await apiRequest<MailboxOAuthProviderStatusView>('/api/v1/mailbox/oauth/google/status');
  } catch {
    return null;
  }
}

export async function fetchSubscriptionUsage(): Promise<SubscriptionUsageSnapshot> {
  if (!shouldUseBackendApi()) {
    const { fetchMockSubscriptionUsage } = await import('@/src/api/mock-account');
    return fetchMockSubscriptionUsage();
  }
  const view = await apiRequest<SubscriptionUsageView>('/api/v1/account/subscription');
  return mapSubscriptionUsage(view);
}

export async function connectMailboxGoogleOAuth(input: {
  accessToken: string;
  refreshToken?: string | null;
  clientId?: string;
  analyticsFlowId?: string;
  analyticsSource?: string;
  analyticsPlatform?: string;
}): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxConnectionView>('/api/v1/mailbox/connect/oauth/google', {
    method: 'POST',
    body: {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? undefined,
      clientId: input.clientId,
      analyticsFlowId: input.analyticsFlowId,
      analyticsSource: input.analyticsSource,
      analyticsPlatform: input.analyticsPlatform,
    },
  });
}

/** Web flow: sends the Gmail mailbox authorization code to the backend for server-side exchange. */
export async function connectMailboxGoogleOAuthCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId?: string;
  analyticsFlowId?: string;
  analyticsSource?: string;
  analyticsPlatform?: string;
}): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxConnectionView>('/api/v1/mailbox/connect/oauth/google', {
    method: 'POST',
    body: {
      code: input.code,
      redirectUri: normalizeOAuthRedirectUri(input.redirectUri),
      codeVerifier: input.codeVerifier,
      clientId: input.clientId,
      analyticsFlowId: input.analyticsFlowId,
      analyticsSource: input.analyticsSource,
      analyticsPlatform: input.analyticsPlatform,
    },
  });
}

export async function connectMailboxMicrosoftOAuth(input: {
  accessToken: string;
  refreshToken?: string | null;
}): Promise<MailboxConnectionResponse | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<MailboxConnectionView>('/api/v1/mailbox/connect/oauth/microsoft', {
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
  return apiRequest<MailboxConnectionView>('/api/v1/mailbox/connect/oauth/microsoft', {
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
