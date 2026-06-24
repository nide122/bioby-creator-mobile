import type { Href } from 'expo-router';

import { isApiConfigured } from '@/src/api/api-config';
import { useSessionStore } from '@/src/stores/session-store';

export function getOnboardingResumeRoute(): Href {
  const state = useSessionStore.getState();
  if (!state.profileBasics) return '/onboarding/profile';
  if (!state.complianceAcceptedAt) return '/onboarding/consent';
  if (!state.emailWizardFinished) return '/onboarding/email';
  if (!state.rateCardStepFinished) return '/onboarding/pricing-setup';
  return '/onboarding/complete';
}

export function getPostAuthRoute(): '/inbox' | Href {
  if (!isApiConfigured()) return '/onboarding';
  return useSessionStore.getState().onboardingComplete ? '/inbox' : getOnboardingResumeRoute();
}

/** Prefer a safe in-app redirect target when provided (e.g. team invite deep link). */
export function resolvePostAuthRoute(redirect?: string | string[] | null): Href {
  const raw = Array.isArray(redirect) ? redirect[0] : redirect;
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw as Href;
  }
  return getPostAuthRoute();
}
