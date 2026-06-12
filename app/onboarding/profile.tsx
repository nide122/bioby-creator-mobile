import { type Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import { Badge, getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import {
  resolveCreatorProfileFromUrl,
  type CreatorProfileResolved,
} from '@/src/api/mock-creator-profile';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import { syncProfileToBackend } from '@/src/auth/sync-onboarding';
import { useOnboardingRouteGuard } from '@/src/hooks/use-onboarding-route-guard';
import { alertAction } from '@/src/lib/app-dialog';
import type { CreatorProfileBasics } from '@/src/stores/session-store';
import { useSessionStore } from '@/src/stores/session-store';

function resolvedFromProfileBasics(basics: CreatorProfileBasics): CreatorProfileResolved | null {
  if (!basics.handle) return null;
  const profileUrl = basics.profileUrl ?? '';
  return {
    platform: basics.platform ?? 'other',
    platformLabel: basics.platformLabel ?? 'Other platform',
    rawInputUrl: profileUrl,
    canonicalUrl: profileUrl,
    handle: basics.handle,
    displayName: basics.displayName,
    bio: basics.bio ?? '',
    followerCountLabel: basics.followerCountLabel ?? '',
    nicheTags: basics.nicheTags ?? [],
    confidence: basics.confidence ?? 'high',
    fetchedAtISO: new Date().toISOString(),
  };
}

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

  const [profileUrl, setProfileUrl] = useState(() => profileBasics?.profileUrl ?? '');
  const [resolved, setResolved] = useState<CreatorProfileResolved | null>(() =>
    profileBasics ? resolvedFromProfileBasics(profileBasics) : null,
  );
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(
    () => profileBasics?.displayName ?? pendingDisplayName ?? '',
  );
  const [bio, setBio] = useState(() => profileBasics?.bio ?? '');
  const [nicheTagsText, setNicheTagsText] = useState(() => profileBasics?.nicheTags?.join(', ') ?? '');
  const [manualMode, setManualMode] = useState(() => Boolean(profileBasics && !profileBasics.handle));

  const canContinue = useMemo(
    () =>
      profileUrl.trim().length >= 6 &&
      displayName.trim().length >= 2 &&
      (!!resolved || bio.trim().length >= 6 || nicheTagsText.trim().length >= 2 || !!profileBasics),
    [bio, displayName, nicheTagsText, profileBasics, profileUrl, resolved],
  );

  const canResolve = profileUrl.trim().length >= 6 && !resolving;

  useEffect(() => {
    if (!profileBasics) return;
    setProfileUrl(profileBasics.profileUrl ?? '');
    setDisplayName(profileBasics.displayName);
    setBio(profileBasics.bio ?? '');
    setNicheTagsText(profileBasics.nicheTags?.join(', ') ?? '');
    const snapshot = resolvedFromProfileBasics(profileBasics);
    if (snapshot) {
      setResolved(snapshot);
      setManualMode(false);
    } else {
      setResolved(null);
      setManualMode(true);
    }
  }, [profileBasics]);

  const syncEditableFields = (snapshot: CreatorProfileResolved) => {
    setDisplayName(snapshot.displayName);
    setBio(snapshot.bio);
    setNicheTagsText(snapshot.nicheTags.join(', '));
  };

  const onResolve = async () => {
    if (!isAuthenticated) {
      router.replace('/welcome' as Href);
      return;
    }
    if (!canResolve) return;
    setResolving(true);
    setError(null);
    setResolved(null);
    try {
      const snapshot = await resolveCreatorProfileFromUrl(profileUrl);
      setResolved(snapshot);
      setManualMode(false);
      syncEditableFields(snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not read this profile yet.');
    } finally {
      setResolving(false);
    }
  };

  const switchAccount = async () => {
    await signOut();
    router.replace('/welcome' as Href);
  };

  const onContinue = () => {
    if (!isAuthenticated) {
      router.replace('/welcome' as Href);
      return;
    }
    if (!canContinue) return;
    const nicheTags = nicheTagsText
      .split(/[，,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const basics = {
      displayName: displayName.trim(),
      niche: nicheTags.length ? nicheTags.join(' / ') : bio.trim(),
      platforms: [resolved?.platformLabel ?? 'Other platform'],
      profileUrl: profileUrl.trim(),
      platform: resolved?.platform ?? 'other',
      platformLabel: resolved?.platformLabel ?? 'Other platform',
      handle: resolved?.handle,
      bio: bio.trim(),
      nicheTags,
      followerCountLabel: resolved?.followerCountLabel,
      confidence: resolved?.confidence ?? 'low',
    };
    setProfileBasics(basics);
    void (async () => {
      const result = await syncProfileToBackend(basics);
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
        <Text style={[styles.kicker, { color: theme.foregroundEyebrow }]}>{t('onboardingProfileScreen.stepLabel')}</Text>
        <Text style={[styles.title, { color: theme.foreground }]}>{t('onboardingProfileScreen.title')}</Text>

        <OnboardingProgress current="profile" />

        <SectionCard title={t('onboardingProfileScreen.whyProfileTitle')} subtitle={t('onboardingProfileScreen.whyProfileSubtitle')} emphasis>
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

        <SectionCard title={t('onboardingProfileScreen.profileLinkTitle')}>
          <TextInput
            testID="onboarding-profile-url"
            value={profileUrl}
            onChangeText={(value) => {
              setProfileUrl(value);
              setResolved(null);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={t('onboardingProfileScreen.placeholderProfileUrl')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />

          <Pressable
            testID="onboarding-profile-resolve"
            accessibilityRole="button"
            disabled={!canResolve}
            onPress={onResolve}
            style={[
              styles.resolveButton,
              { backgroundColor: canResolve ? theme.primary : theme.secondary },
            ]}>
            {resolving ? (
              <ActivityIndicator color={canResolve ? theme.primaryForeground : theme.mutedForeground} />
            ) : (
              <Text
                style={[
                  styles.resolveLabel,
                  { color: canResolve ? theme.primaryForeground : theme.mutedForeground },
                ]}>
                {t('onboardingProfileScreen.resolveLookup')}
              </Text>
            )}
          </Pressable>

          {error ? <Text style={[styles.error, { color: '#B91C1C' }]}>{error}</Text> : null}
          {!resolved ? (
            <Pressable
              testID="onboarding-profile-manual"
              accessibilityRole="button"
              onPress={() => {
                setManualMode(true);
                setError(null);
              }}
              style={[styles.manualButton, { borderColor: theme.border }]}>
              <Text style={[styles.manualLabel, { color: theme.foreground }]}>
                {t('onboardingProfileScreen.manualAdd')}
              </Text>
            </Pressable>
          ) : null}
        </SectionCard>

        {resolved ? (
          <SectionCard title={t('onboardingProfileScreen.foundProfileTitle')} emphasis>
            <View style={[styles.preview, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Text style={[styles.previewTitle, { color: theme.foreground }]}>
                {resolved.displayName}
              </Text>
              <Text style={[styles.previewMeta, { color: theme.foregroundSubtitle }]}>
                {resolved.platformLabel} · @{resolved.handle} · {resolved.followerCountLabel}
              </Text>
              <Text style={[styles.previewBio, { color: theme.mutedForeground }]}>{resolved.bio}</Text>
            </View>
          </SectionCard>
        ) : null}

        {(error || manualMode) && !resolved ? (
          <SectionCard title={t('onboardingProfileScreen.manualSectionTitle')}>
            <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
              {t('onboardingProfileScreen.labelDisplayName')}
            </Text>
            <TextInput
              testID="onboarding-profile-display-name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('onboardingProfileScreen.placeholderDisplayName')}
              {...getTextInputProps(theme)}
              style={getTextInputStyle(theme)}
            />

            <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
              {t('onboardingProfileScreen.labelBio')}
            </Text>
            <TextInput
              testID="onboarding-profile-bio"
              value={bio}
              onChangeText={setBio}
              placeholder={t('onboardingProfileScreen.placeholderBio')}
              {...getTextInputProps(theme)}
              style={[getTextInputStyle(theme, { multiline: true }), styles.multiline]}
              multiline
            />

            <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
              {t('onboardingProfileScreen.labelTags')}
            </Text>
            <TextInput
              testID="onboarding-profile-tags"
              value={nicheTagsText}
              onChangeText={setNicheTagsText}
              placeholder={t('onboardingProfileScreen.placeholderTags')}
              {...getTextInputProps(theme)}
              style={getTextInputStyle(theme)}
            />
          </SectionCard>
        ) : null}

        <Pressable
          testID="onboarding-profile-continue"
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={onContinue}
          style={[
            styles.primary,
            { backgroundColor: canContinue ? theme.primary : theme.border },
          ]}>
          <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
            {t('onboardingProfileScreen.continueAiBoundaries')}
          </Text>
        </Pressable>

        <View style={[styles.accountCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.accountLabel, { color: theme.mutedForeground }]}>
            {t('welcome.signedInAs')}
          </Text>
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
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  resolveButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveLabel: { fontWeight: '700', fontSize: fontSize.body },
  error: { fontSize: fontSize.bodySmall, lineHeight: 20, marginTop: spacing.sm },
  manualButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: layout.touchMin - 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  preview: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  previewTitle: { fontSize: fontSize.cardTitle, fontWeight: '700' },
  previewMeta: { fontSize: fontSize.bodySmall },
  previewBio: { fontSize: fontSize.bodySmall, lineHeight: 20 },
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
