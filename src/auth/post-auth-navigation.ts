import type { Href } from 'expo-router';

import { isApiConfigured } from '@/src/api/api-config';
import { useSessionStore } from '@/src/stores/session-store';

export function getOnboardingResumeRoute(): Href {
  const state = useSessionStore.getState();
  if (!state.profileBasics) return '/onboarding/profile';
  if (!state.complianceAcceptedAt) return '/onboarding/consent';
  if (!state.emailWizardFinished) return '/onboarding/email';
  return '/onboarding/complete';
}

export function getPostAuthRoute(): '/inbox' | Href {
  if (!isApiConfigured()) return '/onboarding';
  return useSessionStore.getState().onboardingComplete ? '/inbox' : getOnboardingResumeRoute();
}
