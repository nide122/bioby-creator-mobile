import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { useOnboardingRouteGuard } from '@/src/hooks/use-onboarding-route-guard';

/** Legacy route — inbox filter step removed; redirect to email setup. */
export default function OnboardingInboxFilterScreen() {
  const router = useRouter();
  const authReady = useOnboardingRouteGuard('email', { skipPrerequisites: true });
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  useEffect(() => {
    if (!authReady) return;
    router.replace('/onboarding/email' as Href);
  }, [authReady, router]);

  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
