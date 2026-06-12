import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { Badge, SectionCard } from '@/components/product';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { markOnboardingCompleted } from '@/src/api/account-api';
import { ApiError } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useOnboardingRouteGuard } from '@/src/hooks/use-onboarding-route-guard';
import { alertAction } from '@/src/lib/app-dialog';
import { useSessionStore } from '@/src/stores/session-store';

export default function OnboardingCompleteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const authReady = useOnboardingRouteGuard('complete');
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const finalizeOnboarding = useSessionStore((s) => s.finalizeOnboarding);
  const profile = useSessionStore((s) => s.profileBasics);
  const emailSkipped = useSessionStore((s) => s.emailSkipped);
  const complianceAcceptedAt = useSessionStore((s) => s.complianceAcceptedAt);
  const emailWizardFinished = useSessionStore((s) => s.emailWizardFinished);
  const agentSendMode = useSessionStore((s) => s.agentSendMode);
  const creatorFocusMode = useSessionStore((s) => s.creatorFocusMode);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const enterWorkspace = () => {
    if (!isAuthenticated) {
      router.replace('/welcome' as Href);
      return;
    }
    if (!profile) {
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
    finalizeOnboarding();
    if (shouldUseBackendApi()) {
      void markOnboardingCompleted({
        agentSendMode: agentSendMode ?? 'agent_assist',
        creatorFocusMode,
      }).catch((err: unknown) => {
        const message =
          err instanceof ApiError ? err.message : t('onboardingSync.completeFallback');
        void alertAction(t('onboardingSync.completeTitle'), message);
      });
    }
    router.replace('/inbox' as Href);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.safe}
      keyboardShouldPersistTaps="handled">
      {!authReady ? (
        <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
      ) : (
        <>
      <Text style={[styles.kicker, { color: theme.foregroundEyebrow }]}>
        {t('onboardingCompleteScreen.readyLabel')}
      </Text>
      <Text style={[styles.title, { color: theme.foreground }]}>{t('onboardingCompleteScreen.title')}</Text>

      <OnboardingProgress current="complete" />

      <SectionCard title={t('onboardingCompleteScreen.freeTierTitle')} emphasis>
        <Text style={[styles.meta, { color: theme.foreground }]}>
          {t('onboardingCompleteScreen.freeTierLine1')}
        </Text>
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>
          {t('onboardingCompleteScreen.freeTierLine2')}
        </Text>
      </SectionCard>

      <SectionCard title={t('onboardingCompleteScreen.aiReachTitle')}>
        <View style={{ gap: spacing.sm }}>
          <Badge
            tone={agentSendMode === 'review_only' ? 'warning' : 'mint'}
            label={
              agentSendMode === 'review_only'
                ? t('onboardingCompleteScreen.badgeReviewEvery')
                : t('onboardingCompleteScreen.badgeAssistLowRisk')
            }
          />
          <Text style={[styles.meta, { color: theme.foreground }]}>
            {agentSendMode === 'review_only'
              ? t('onboardingCompleteScreen.aiReachReviewCopy')
              : t('onboardingCompleteScreen.aiReachAssistCopy')}
          </Text>
        </View>
      </SectionCard>

      {profile ? (
        <SectionCard title={t('onboardingCompleteScreen.brandEvidenceTitle')}>
          <Text style={[styles.meta, { color: theme.foreground }]}>
            {profile.platformLabel ?? profile.platforms[0] ?? t('onboardingCompleteScreen.profileFallbackSocial')}
            {profile.handle ? ` · @${profile.handle}` : ''}
            {profile.followerCountLabel ? ` · ${profile.followerCountLabel}` : ''}
          </Text>
          {profile.bio ? (
            <Text style={[styles.meta, { color: theme.mutedForeground }]}>{profile.bio}</Text>
          ) : null}
          {profile.nicheTags?.length ? (
            <Text style={[styles.meta, { color: theme.foregroundSubtitle }]}>
              {profile.nicheTags.join(' / ')}
            </Text>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title={
          emailSkipped
            ? t('onboardingCompleteScreen.emailSkippedTitle')
            : t('onboardingCompleteScreen.emailConnectedTitle')
        }
        emphasis>
        <Text style={[styles.meta, { color: theme.foreground }]}>
          {emailSkipped
            ? t('onboardingCompleteScreen.emailSkippedPrimary')
            : t('onboardingCompleteScreen.emailConnectedPrimary')}
        </Text>
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>
          {emailSkipped
            ? t('onboardingCompleteScreen.emailSkippedSecondary')
            : t('onboardingCompleteScreen.emailConnectedSecondary')}
        </Text>
      </SectionCard>

      <Pressable
        testID="onboarding-complete-enter"
        accessibilityRole="button"
        onPress={enterWorkspace}
        style={[styles.primary, { backgroundColor: theme.primary }]}>
        <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
          {t('onboardingCompleteScreen.enterToday')}
        </Text>
      </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sectionY,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  kicker: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: { fontSize: 40, fontWeight: '900', letterSpacing: -1.3, lineHeight: 44 },
  meta: { fontSize: fontSize.bodySmall, lineHeight: 22 },
  primary: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
});
