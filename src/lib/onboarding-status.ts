import {
  isSummaryComplete,
  listConnectedPresetPlatformKeys,
  migrateLegacyProfileBasics,
} from '@/src/lib/creator-profile-aggregate';
import { isCreatorAiInboxEnabled } from '@/src/lib/creator-verification';
import type { AccountOverviewResponse } from '@/src/api/account-mappers';
import type { CreatorProfileBasics } from '@/src/stores/session-store';

export type OnboardingDashboardStepKey = 'profile' | 'email' | 'verification';

export type OnboardingDashboardStep = {
  key: OnboardingDashboardStepKey;
  completed: boolean;
  completedAtISO?: string | null;
};

export type OnboardingDashboardStatus = {
  allComplete: boolean;
  steps: OnboardingDashboardStep[];
};

export const ONBOARDING_DASHBOARD_STEP_ORDER: OnboardingDashboardStepKey[] = [
  'profile',
  'email',
  'verification',
];

export function isProfileStepComplete(profile: CreatorProfileBasics | null | undefined): boolean {
  if (!profile) return false;
  const { summary, platformProfiles } = migrateLegacyProfileBasics(profile);
  const hasLinkedPlatform =
    listConnectedPresetPlatformKeys(platformProfiles).length > 0 ||
    Boolean(profile.profileUrl?.trim());
  return hasLinkedPlatform || isSummaryComplete(summary);
}

export function isEmailStepComplete(input: { mailboxConnected?: boolean }): boolean {
  return Boolean(input.mailboxConnected);
}

export function isVerificationStepComplete(status: string | null | undefined): boolean {
  return isCreatorAiInboxEnabled(status);
}

export function buildOnboardingDashboardStatus(input: {
  profile?: CreatorProfileBasics | null;
  mailboxConnected?: boolean;
  creatorVerificationStatus?: string | null;
  profileCompletedAtISO?: string | null;
  emailCompletedAtISO?: string | null;
  verificationCompletedAtISO?: string | null;
}): OnboardingDashboardStatus {
  const profileComplete = isProfileStepComplete(input.profile);
  const emailComplete = isEmailStepComplete(input);
  const verificationComplete = isVerificationStepComplete(input.creatorVerificationStatus);

  const steps: OnboardingDashboardStep[] = [
    {
      key: 'profile',
      completed: profileComplete,
      completedAtISO: profileComplete ? input.profileCompletedAtISO ?? null : null,
    },
    {
      key: 'email',
      completed: emailComplete,
      completedAtISO: emailComplete ? input.emailCompletedAtISO ?? null : null,
    },
    {
      key: 'verification',
      completed: verificationComplete,
      completedAtISO: verificationComplete ? input.verificationCompletedAtISO ?? null : null,
    },
  ];

  return {
    allComplete: steps.every((step) => step.completed),
    steps,
  };
}

export function buildOnboardingDashboardFromOverview(
  overview: AccountOverviewResponse,
): OnboardingDashboardStatus {
  const profile = overview.profile
    ? {
        displayName: overview.profile.displayName ?? '',
        bio: overview.profile.bio ?? '',
        nicheTags: overview.profile.nicheTags ?? [],
        platformProfiles: overview.profile.platformProfiles ?? undefined,
      }
    : null;

  return buildOnboardingDashboardStatus({
    profile: profile as CreatorProfileBasics | null,
    mailboxConnected: overview.mailbox?.connected,
    creatorVerificationStatus: overview.creatorVerified
      ? 'verified'
      : overview.creatorVerificationStatus,
    emailCompletedAtISO: overview.mailbox?.lastSyncAtISO ?? null,
  });
}

export function onboardingDashboardRouteForStep(key: OnboardingDashboardStepKey): string {
  switch (key) {
    case 'profile':
      return '/settings/profile';
    case 'email':
      return '/onboarding/email?source=account';
    case 'verification':
      return '/(tabs)/inbox';
    default:
      return '/(tabs)/account';
  }
}
