import {
  buildCreatorProfileBasics,
  migrateLegacyProfileBasics,
} from '@/src/lib/creator-profile-aggregate';
import type {
  AccountOverviewView,
  CreatorProfileView,
  CreatorVerificationView,
  MailboxConnectionView,
  MailboxOAuthProviderStatusView,
  OnboardingStatusView,
  SubscriptionUsageView,
} from '@/src/types/api';
import type { SubscriptionUsageSnapshot } from '@/src/types/domain';
import type { AgentSendMode, ClassificationStrictness, CreatorFocusMode, CreatorProfileBasics } from '@/src/stores/session-store';
import type { CreatorVerificationStatus } from '@/src/lib/creator-verification';
import type { OnboardingDashboardStatus } from '@/src/lib/onboarding-status';

/** Session-facing overview shape (narrowed from AccountOverviewView). */
export type AccountOverviewResponse = {
  profile: CreatorProfileView | null;
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
  sale?: never;
  classificationStrictness?: ClassificationStrictness;
  inboxFilterConfigured?: boolean;
  onboardingCompletedAt?: string | null;
  inboxSetupSkipped?: boolean;
  creatorVerificationStatus?: CreatorVerificationStatus | string;
  creatorVerified?: boolean;
  deletionRequestedAtISO?: string;
  deletionScheduledAtISO?: string;
  accountDataRetentionDays?: number;
  deletionStatus?: string;
};

export type CreatorVerificationResponse = {
  status: CreatorVerificationStatus | string;
  creatorVerified: boolean;
  verifiedAtISO?: string | null;
  homepageEmail?: string | null;
  boundMailboxEmail?: string | null;
  inboxBackfillEnqueued?: number;
};

export type MailboxConnectionResponse = MailboxConnectionView;

export type MailboxOAuthProviderStatusResponse = MailboxOAuthProviderStatusView;

export function mapSubscriptionUsage(view?: SubscriptionUsageView): SubscriptionUsageSnapshot {
  return {
    planName: view?.planName ?? '',
    billingCycleLabel: view?.billingCycleLabel ?? '',
    brandPitchesUsed: view?.brandPitchesUsed ?? 0,
    brandPitchesLimit: view?.brandPitchesLimit ?? 0,
    draftConcurrentUsed: view?.draftConcurrentUsed ?? 0,
    draftConcurrentLimit: view?.draftConcurrentLimit ?? 0,
    renewalHint: view?.renewalHint ?? '',
  };
}

export function mapCreatorProfileResponse(view: CreatorProfileView): CreatorProfileBasics {
  const partial: CreatorProfileBasics = {
    displayName: view.displayName ?? '',
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

export function mapCreatorVerification(view: CreatorVerificationView): CreatorVerificationResponse {
  return {
    status: view.status ?? 'unverified',
    creatorVerified: view.creatorVerified ?? false,
    verifiedAtISO: view.verifiedAtISO ?? undefined,
    homepageEmail: view.homepageEmail ?? undefined,
    boundMailboxEmail: view.boundMailboxEmail ?? undefined,
    inboxBackfillEnqueued: view.inboxBackfillEnqueued ?? undefined,
  };
}

export function mapOnboardingStatus(view: OnboardingStatusView): OnboardingDashboardStatus {
  return {
    allComplete: view.allComplete ?? false,
    steps: (view.steps ?? []).flatMap((step) => {
      const key = step.key;
      if (key !== 'profile' && key !== 'email' && key !== 'verification') {
        return [];
      }
      return [
        {
          key,
          completed: step.completed ?? false,
          completedAtISO: step.completedAtISO ?? null,
        },
      ];
    }),
  };
}

export function mapAccountOverview(view: AccountOverviewView): AccountOverviewResponse {
  const mailbox = view.mailbox;
  return {
    profile: view.profile ?? null,
    subscription: mapSubscriptionUsage(view.subscription),
    mailbox: {
      connected: mailbox?.connected ?? false,
      emailAddress: mailbox?.emailAddress ?? null,
      provider: mailbox?.provider ?? null,
      status: mailbox?.status ?? null,
      lastSyncAtISO: mailbox?.lastSyncAtISO ?? undefined,
    },
    tenantDisplayName: view.tenantDisplayName ?? '',
    tenantType: view.tenantType ?? '',
    agentSendMode: (view.agentSendMode ?? 'review_only') as AgentSendMode,
    creatorFocusMode: (view.creatorFocusMode ?? 'quiet') as CreatorFocusMode,
    classificationStrictness: view.classificationStrictness as ClassificationStrictness | undefined,
    inboxFilterConfigured: view.inboxFilterConfigured,
    onboardingCompletedAt: view.onboardingCompletedAt ?? undefined,
    inboxSetupSkipped: view.inboxSetupSkipped,
    creatorVerificationStatus: view.creatorVerificationStatus,
    creatorVerified: view.creatorVerified,
    deletionRequestedAtISO: view.deletionRequestedAtISO ?? undefined,
    deletionScheduledAtISO: view.deletionScheduledAtISO ?? undefined,
    accountDataRetentionDays: view.accountDataRetentionDays ?? undefined,
    deletionStatus: view.deletionStatus ?? undefined,
  };
}
