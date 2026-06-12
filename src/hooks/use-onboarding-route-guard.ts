import { type Href, useRootNavigationState, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuthSessionReady } from '@/src/hooks/use-auth-session-ready';
import { useSessionStore } from '@/src/stores/session-store';

export type OnboardingRouteStep = 'profile' | 'consent' | 'email' | 'complete';

/**
 * Redirects when prerequisites are missing. Waits for JWT / session rehydrate before treating the user as logged out.
 */
export function useOnboardingRouteGuard(
  step: OnboardingRouteStep,
  options?: { skipPrerequisites?: boolean },
): boolean {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const authReady = useAuthSessionReady();

  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const complianceAcceptedAt = useSessionStore((s) => s.complianceAcceptedAt);
  const emailWizardFinished = useSessionStore((s) => s.emailWizardFinished);

  useEffect(() => {
    if (!rootNavigationState?.key || !authReady) return;

    if (!isAuthenticated) {
      router.replace('/welcome' as Href);
      return;
    }

    if (step === 'profile' || options?.skipPrerequisites) return;

    if (!profileBasics) {
      router.replace('/onboarding/profile' as Href);
      return;
    }

    if (step === 'consent') return;

    if (!complianceAcceptedAt) {
      router.replace('/onboarding/consent' as Href);
      return;
    }

    if (step === 'email') return;

    if (!emailWizardFinished) {
      router.replace('/onboarding/email' as Href);
      return;
    }

    if (step === 'complete') return;
  }, [
    authReady,
    complianceAcceptedAt,
    emailWizardFinished,
    isAuthenticated,
    profileBasics,
    rootNavigationState?.key,
    router,
    step,
    options?.skipPrerequisites,
  ]);

  return authReady;
}
