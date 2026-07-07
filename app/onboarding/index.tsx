import { type Href, useRootNavigationState, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { useAuthSessionReady } from '@/src/hooks/use-auth-session-ready';
import { useSessionStore } from '@/src/stores/session-store';

/** Linear setup router keeps the onboarding path easy to instrument. */
export default function OnboardingIndexScreen() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const authReady = useAuthSessionReady();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const onboardingComplete = useSessionStore((s) => s.onboardingComplete);
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const complianceAcceptedAt = useSessionStore((s) => s.complianceAcceptedAt);
  const emailWizardFinished = useSessionStore((s) => s.emailWizardFinished);
  const rateCardStepFinished = useSessionStore((s) => s.rateCardStepFinished);

  useEffect(() => {
    if (!rootNavigationState?.key || !authReady) return;
    if (!isAuthenticated) {
      router.replace('/home' as Href);
      return;
    }
    if (onboardingComplete) {
      router.replace('/inbox' as Href);
      return;
    }
    if (!profileBasics) {
      router.replace('/onboarding/profile' as Href);
      return;
    }
    if (!complianceAcceptedAt) {
      router.replace('/onboarding/consent' as Href);
      return;
    }
    if (!emailWizardFinished) {
      router.replace('/onboarding/email' as Href);
      return;
    }
    if (!rateCardStepFinished) {
      router.replace('/onboarding/pricing-setup' as Href);
      return;
    }
    router.replace('/onboarding/complete' as Href);
  }, [
    authReady,
    rootNavigationState?.key,
    isAuthenticated,
    onboardingComplete,
    profileBasics,
    complianceAcceptedAt,
    emailWizardFinished,
    rateCardStepFinished,
    router,
  ]);

  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
