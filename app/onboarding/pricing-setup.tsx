import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { Badge, SectionCard } from '@/components/product';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { useRateCardPackages } from '@/src/hooks/use-growth';
import { useOnboardingRouteGuard } from '@/src/hooks/use-onboarding-route-guard';
import { useSessionStore } from '@/src/stores/session-store';

export default function OnboardingPricingSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const authReady = useOnboardingRouteGuard('pricing-setup');
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const complianceAcceptedAt = useSessionStore((s) => s.complianceAcceptedAt);
  const emailWizardFinished = useSessionStore((s) => s.emailWizardFinished);
  const completeRateCardStep = useSessionStore((s) => s.completeRateCardStep);
  const skipRateCardStep = useSessionStore((s) => s.skipRateCardStep);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const rateCard = useRateCardPackages();
  const hasPackages = (rateCard.data?.length ?? 0) > 0;

  const goToComplete = () => {
    router.push('/onboarding/complete' as Href);
  };

  const onContinue = () => {
    if (!isAuthenticated) {
      router.replace('/home' as Href);
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
    completeRateCardStep();
    goToComplete();
  };

  const onSkip = () => {
    if (!isAuthenticated) {
      router.replace('/home' as Href);
      return;
    }
    skipRateCardStep();
    goToComplete();
  };

  const onSetUp = () => {
    router.push('/pricing-edit?new=1' as Href);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      {!authReady ? (
        <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
      ) : (
        <>
          <Text style={[styles.kicker, { color: theme.foregroundEyebrow }]}>
            {t('onboardingPricingSetupScreen.stepLabel')}
          </Text>
          <Text style={[styles.title, { color: theme.foreground }]}>{t('onboardingPricingSetupScreen.title')}</Text>

          <OnboardingProgress current="pricing-setup" />

          <SectionCard title={t('onboardingPricingSetupScreen.whyTitle')} emphasis>
            <Text style={[styles.body, { color: theme.foreground }]}>
              {t('onboardingPricingSetupScreen.whyBody')}
            </Text>
            <Text style={[styles.hint, { color: theme.mutedForeground }]}>
              {t('onboardingPricingSetupScreen.whyHint')}
            </Text>
          </SectionCard>

          {hasPackages ? (
            <View style={[styles.configuredRow, { borderColor: '#34D39955', backgroundColor: '#34D39912' }]}>
              <Badge tone="mint" label={t('onboardingPricingSetupScreen.configuredBadge')} />
              <Text style={[styles.body, { color: theme.foreground, flex: 1 }]}>
                {t('onboardingPricingSetupScreen.configuredBody')}
              </Text>
            </View>
          ) : null}

          <Pressable
            testID="onboarding-pricing-setup-cta"
            accessibilityRole="button"
            onPress={hasPackages ? onContinue : onSetUp}
            style={[styles.primary, { backgroundColor: theme.primary }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {hasPackages
                ? t('onboardingPricingSetupScreen.continue')
                : t('onboardingPricingSetupScreen.ctaSetUp')}
            </Text>
          </Pressable>

          {!hasPackages ? (
            <Pressable
              testID="onboarding-pricing-setup-skip"
              accessibilityRole="button"
              onPress={onSkip}
              style={[styles.secondary, { borderColor: theme.border }]}>
              <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                {t('onboardingPricingSetupScreen.ctaSkip')}
              </Text>
            </Pressable>
          ) : null}

          {!hasPackages ? (
            <Text style={[styles.skipHint, { color: theme.mutedForeground }]}>
              {t('onboardingPricingSetupScreen.skipHint')}
            </Text>
          ) : null}
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
  body: { fontSize: fontSize.bodySmall, lineHeight: 22 },
  hint: { fontSize: fontSize.caption, lineHeight: 20 },
  configuredRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  skipHint: { fontSize: fontSize.caption, lineHeight: 20, textAlign: 'center' },
});
