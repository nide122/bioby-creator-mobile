import type { Href } from 'expo-router';
import type { Router } from 'expo-router';
import type { TFunction } from 'i18next';

import { fetchCreatorVerificationStatus } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';
import {
  resolveCreatorVerificationPreflight,
  type CreatorVerificationPreflight,
} from '@/src/lib/creator-verification-preflight';
import type { CreatorProfileBasics } from '@/src/stores/session-store';

type PressInput = {
  profile: CreatorProfileBasics | null;
  mailboxConnected: boolean;
  creatorVerificationStatus: string | null | undefined;
  mailboxEmail?: string | null;
};

export async function runOnboardingVerificationPress(
  router: Router,
  t: TFunction,
  input: PressInput,
): Promise<void> {
  let homepageEmail: string | null | undefined;
  let boundMailboxEmail: string | null | undefined = input.mailboxEmail;
  let creatorVerificationStatus = input.creatorVerificationStatus;

  if (shouldUseBackendApi()) {
    try {
      const status = await fetchCreatorVerificationStatus();
      if (status) {
        homepageEmail = status.homepageEmail;
        boundMailboxEmail = status.boundMailboxEmail ?? boundMailboxEmail;
        creatorVerificationStatus = status.status;
      }
    } catch {
      // Fall back to session snapshot below.
    }
  }

  const preflight = resolveCreatorVerificationPreflight({
    profile: input.profile,
    mailboxConnected: input.mailboxConnected,
    creatorVerificationStatus,
    homepageEmail,
    boundMailboxEmail,
  });

  await actOnCreatorVerificationPreflight(router, t, preflight);
}

async function actOnCreatorVerificationPreflight(
  router: Router,
  t: TFunction,
  preflight: CreatorVerificationPreflight,
): Promise<void> {
  switch (preflight.kind) {
    case 'verified':
    case 'ready':
      router.push('/(tabs)/inbox' as Href);
      return;
    case 'profile_incomplete': {
      const confirmed = await confirmAction({
        title: t('account.onboardingDashboard.verificationPreflight.profileIncompleteTitle'),
        message: t('account.onboardingDashboard.verificationPreflight.profileIncompleteMessage'),
        confirmLabel: t('account.onboardingDashboard.verificationPreflight.profileIncompleteConfirm'),
        cancelLabel: t('common.cancel'),
      });
      if (confirmed) router.push('/settings/profile' as Href);
      return;
    }
    case 'mailbox_required': {
      const confirmed = await confirmAction({
        title: t('account.onboardingDashboard.verificationPreflight.mailboxRequiredTitle'),
        message: t('account.onboardingDashboard.verificationPreflight.mailboxRequiredMessage'),
        confirmLabel: t('account.onboardingDashboard.verificationPreflight.mailboxRequiredConfirm'),
        cancelLabel: t('common.cancel'),
      });
      if (confirmed) router.push('/onboarding/email?source=account' as Href);
      return;
    }
    case 'homepage_email_missing': {
      const message = preflight.boundMailboxEmail
        ? t('account.onboardingDashboard.verificationPreflight.homepageMissingMessageWithEmail', {
            email: preflight.boundMailboxEmail,
          })
        : t('account.onboardingDashboard.verificationPreflight.homepageMissingMessage');
      const confirmed = await confirmAction({
        title: t('account.onboardingDashboard.verificationPreflight.homepageMissingTitle'),
        message,
        confirmLabel: t('account.onboardingDashboard.verificationPreflight.homepageMissingConfirm'),
        cancelLabel: t('common.cancel'),
      });
      if (confirmed) router.push('/settings/profile' as Href);
      return;
    }
    case 'email_mismatch': {
      const message =
        preflight.boundMailboxEmail && preflight.homepageEmail
          ? t('account.onboardingDashboard.verificationPreflight.emailMismatchMessage', {
              boundEmail: preflight.boundMailboxEmail,
              homepageEmail: preflight.homepageEmail,
            })
          : t('account.onboardingDashboard.verificationPreflight.emailMismatchMessageFallback');
      const confirmed = await confirmAction({
        title: t('account.onboardingDashboard.verificationPreflight.emailMismatchTitle'),
        message,
        confirmLabel: t('account.onboardingDashboard.verificationPreflight.emailMismatchConfirm'),
        cancelLabel: t('common.cancel'),
      });
      if (confirmed) router.push('/settings/profile' as Href);
      return;
    }
    default: {
      const _exhaustive: never = preflight;
      void _exhaustive;
      await alertAction(
        t('creatorVerification.verifyErrorTitle'),
        t('creatorVerification.verifyErrorBody'),
      );
    }
  }
}
