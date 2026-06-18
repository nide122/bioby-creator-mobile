import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useTranslation } from 'react-i18next';

import { ClassificationStrictnessPicker } from '@/components/product/ClassificationStrictnessPicker';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { updateTenantSettings } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useOnboardingRouteGuard } from '@/src/hooks/use-onboarding-route-guard';
import { alertAction } from '@/src/lib/app-dialog';
import { type ClassificationStrictness, useSessionStore } from '@/src/stores/session-store';

export default function OnboardingInboxFilterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const authReady = useOnboardingRouteGuard('inbox-filter');
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const complianceAcceptedAt = useSessionStore((s) => s.complianceAcceptedAt);
  const storedStrictness = useSessionStore((s) => s.classificationStrictness);
  const completeInboxFilterStep = useSessionStore((s) => s.completeInboxFilterStep);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const [strictness, setStrictness] = useState<ClassificationStrictness>(() => storedStrictness ?? 'standard');

  useEffect(() => {
    if (storedStrictness) setStrictness(storedStrictness);
  }, [storedStrictness]);

  const onContinue = () => {
    if (!isAuthenticated) {
      router.replace('/welcome' as Href);
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
    completeInboxFilterStep(strictness);
    if (shouldUseBackendApi()) {
      void updateTenantSettings({ classificationStrictness: strictness }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : t('onboardingSync.inboxFilterFallback');
        void alertAction(t('onboardingSync.inboxFilterTitle'), message);
      });
    }
    router.push('/onboarding/email' as Href);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      {!authReady ? (
        <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
      ) : (
        <>
          <Text style={[styles.kicker, { color: theme.foregroundEyebrow }]}>
            {t('onboardingInboxFilterScreen.stepLabel')}
          </Text>
          <Text style={[styles.title, { color: theme.foreground }]}>{t('onboardingInboxFilterScreen.title')}</Text>

          <OnboardingProgress current="inbox-filter" />

          <ClassificationStrictnessPicker
            value={strictness}
            onChange={setStrictness}
            copy={{
              relaxed: {
                title: t('onboardingInboxFilterScreen.relaxedTitle'),
                subtitle: t('onboardingInboxFilterScreen.relaxedSubtitle'),
              },
              standard: {
                title: t('onboardingInboxFilterScreen.standardTitle'),
                subtitle: t('onboardingInboxFilterScreen.standardSubtitle'),
              },
              strict: {
                title: t('onboardingInboxFilterScreen.strictTitle'),
                subtitle: t('onboardingInboxFilterScreen.strictSubtitle'),
              },
            }}
            hintTitle={t('onboardingInboxFilterScreen.hintTitle')}
            hintBody={t('onboardingInboxFilterScreen.hintBody')}
          />

          <Pressable
            testID="onboarding-inbox-filter-continue"
            accessibilityRole="button"
            onPress={onContinue}
            style={[styles.primary, { backgroundColor: theme.primary }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t('onboardingInboxFilterScreen.continueEmail')}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sectionY,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  kicker: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1.2, lineHeight: 40 },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
});
