import { type Href, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import { Badge, SectionCard } from '@/components/product';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import {
  CreatorProfileEditor,
  type CreatorProfileEditorState,
} from '@/src/components/profile/CreatorProfileEditor';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import { syncProfileToBackend } from '@/src/auth/sync-onboarding';
import { useOnboardingRouteGuard } from '@/src/hooks/use-onboarding-route-guard';
import { alertAction } from '@/src/lib/app-dialog';
import { useSessionStore } from '@/src/stores/session-store';

export default function OnboardingProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const authReady = useOnboardingRouteGuard('profile');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const { signOut } = useAuthActions();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const accountEmail = useSessionStore((s) => s.accountEmail);
  const pendingDisplayName = useSessionStore((s) => s.pendingDisplayName);
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const setProfileBasics = useSessionStore((s) => s.setProfileBasics);

  const [editorState, setEditorState] = useState<CreatorProfileEditorState | null>(null);

  const handleEditorStateChange = useCallback((state: CreatorProfileEditorState) => {
    setEditorState(state);
  }, []);

  const canContinue = editorState?.canSubmit ?? false;

  const switchAccount = async () => {
    await signOut();
    router.replace('/welcome' as Href);
  };

  const onContinue = () => {
    if (!isAuthenticated) {
      router.replace('/welcome' as Href);
      return;
    }
    if (!editorState?.canSubmit) return;

    setProfileBasics(editorState.payload);
    void (async () => {
      const result = await syncProfileToBackend(editorState.payload);
      if (!result.ok) {
        void alertAction(t('onboardingSync.profileTitle'), result.error);
      }
    })();
    router.push('/onboarding/consent' as Href);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      enabled={Platform.OS === 'ios'}>
      {!authReady ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            Platform.OS === 'android' ? { flexGrow: 1, paddingBottom: spacing.sectionY * 2 } : null,
          ]}
          keyboardShouldPersistTaps="handled">
          <Text style={[styles.kicker, { color: theme.foregroundEyebrow }]}>
            {t('onboardingProfileScreen.stepLabel')}
          </Text>
          <Text style={[styles.title, { color: theme.foreground }]}>{t('onboardingProfileScreen.title')}</Text>

          <OnboardingProgress current="profile" />

          <SectionCard
            title={t('onboardingProfileScreen.whyProfileTitle')}
            subtitle={t('onboardingProfileScreen.whyProfileSubtitle')}
            emphasis>
            <View style={styles.signalGrid}>
              <View style={[styles.signalCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <Badge tone="mint" label={t('onboardingProfileScreen.badgeMatch')} />
                <Text style={[styles.signalText, { color: theme.foreground }]}>
                  {t('onboardingProfileScreen.matchHint')}
                </Text>
              </View>
              <View style={[styles.signalCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <Badge tone="warning" label={t('onboardingProfileScreen.badgeControl')} />
                <Text style={[styles.signalText, { color: theme.foreground }]}>
                  {t('onboardingProfileScreen.controlHint')}
                </Text>
              </View>
            </View>
          </SectionCard>

          <CreatorProfileEditor
            testIdPrefix="onboarding-profile"
            profileBasics={profileBasics}
            pendingDisplayName={pendingDisplayName}
            onStateChange={handleEditorStateChange}
          />

          <Pressable
            testID="onboarding-profile-continue"
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={onContinue}
            style={[styles.primary, { backgroundColor: canContinue ? theme.primary : theme.border }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t('onboardingProfileScreen.continueAiBoundaries')}
            </Text>
          </Pressable>

          <View style={[styles.accountCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.accountLabel, { color: theme.mutedForeground }]}>{t('welcome.signedInAs')}</Text>
            <Text style={[styles.accountEmail, { color: theme.foreground }]} numberOfLines={1}>
              {accountEmail ?? t('auth.creatorFallback')}
            </Text>
            <Pressable
              testID="onboarding-profile-switch-account"
              accessibilityRole="button"
              onPress={switchAccount}
              style={({ pressed }) => [styles.switchAccount, pressed && { opacity: 0.88 }]}>
              <Text style={[styles.switchAccountLabel, { color: theme.primary }]}>
                {t('welcome.signOutAndSwitch')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sectionY,
    gap: spacing.lg,
  },
  kicker: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1.2, lineHeight: 40 },
  signalGrid: { flexDirection: 'row', gap: spacing.sm },
  signalCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  signalText: { fontSize: fontSize.caption, lineHeight: 18, fontWeight: '700' },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  accountCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.xxl,
  },
  accountLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  accountEmail: { fontSize: fontSize.body, fontWeight: '700' },
  switchAccount: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  switchAccountLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
});
