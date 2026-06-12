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

import { getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  resolveCreatorProfileFromUrl,
  type CreatorProfileResolved,
} from '@/src/api/mock-creator-profile';
import { upsertCreatorProfile } from '@/src/api/account-api';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import type { CreatorProfileBasics } from '@/src/stores/session-store';
import { useSessionStore } from '@/src/stores/session-store';

export default function ProfileSettingsScreen() {
  const { t } = useTranslation();
  const assetsNav = useAssetsHubNavigation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const setProfileBasics = useSessionStore((s) => s.setProfileBasics);

  const [profileUrl, setProfileUrl] = useState(profileBasics?.profileUrl ?? '');
  const [resolved, setResolved] = useState<CreatorProfileResolved | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(profileBasics?.displayName ?? '');
  const [bio, setBio] = useState(profileBasics?.bio ?? '');
  const [nicheTagsText, setNicheTagsText] = useState(profileBasics?.nicheTags?.join(', ') ?? '');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!profileBasics) return;
    setProfileUrl(profileBasics.profileUrl ?? '');
    setDisplayName(profileBasics.displayName);
    setBio(profileBasics.bio ?? '');
    setNicheTagsText(profileBasics.nicheTags?.join(', ') ?? '');
  }, [profileBasics]);

  const canSave = useMemo(
    () =>
      profileUrl.trim().length >= 6 &&
      displayName.trim().length >= 2 &&
      (bio.trim().length >= 6 || nicheTagsText.trim().length >= 2 || !!resolved || !!profileBasics),
    [bio, displayName, nicheTagsText, profileBasics, profileUrl, resolved]
  );

  const canResolve = profileUrl.trim().length >= 6 && !resolving;

  const buildPayload = (): CreatorProfileBasics => {
    const nicheTags = nicheTagsText
      .split(/[，,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      displayName: displayName.trim(),
      niche: nicheTags.length ? nicheTags.join(' / ') : bio.trim(),
      platforms: [resolved?.platformLabel ?? profileBasics?.platformLabel ?? 'Other platform'],
      profileUrl: profileUrl.trim(),
      platform: resolved?.platform ?? profileBasics?.platform ?? 'other',
      platformLabel: resolved?.platformLabel ?? profileBasics?.platformLabel ?? 'Other platform',
      handle: resolved?.handle ?? profileBasics?.handle,
      bio: bio.trim(),
      nicheTags,
      followerCountLabel: resolved?.followerCountLabel ?? profileBasics?.followerCountLabel,
      confidence: resolved?.confidence ?? profileBasics?.confidence ?? 'low',
    };
  };

  const onResolve = async () => {
    if (!canResolve) return;
    setResolving(true);
    setError(null);
    setResolved(null);
    try {
      const snapshot = await resolveCreatorProfileFromUrl(profileUrl);
      setResolved(snapshot);
      setDisplayName(snapshot.displayName);
      setBio(snapshot.bio);
      setNicheTagsText(snapshot.nicheTags.join(', '));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profileSettingsScreen.resolveErrorFallback'));
    } finally {
      setResolving(false);
    }
  };

  const onSave = () => {
    if (!canSave) return;
    const payload = buildPayload();
    setProfileBasics(payload);
    void upsertCreatorProfile(payload);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      enabled={Platform.OS === 'ios'}>
      <ScrollView
        testID="screen-profile-settings"
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('profileSettingsScreen.lead')}</Text>

        <SectionCard title={t('profileSettingsScreen.linkTitle')}>
          <TextInput
            testID="profile-settings-url"
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
            testID="profile-settings-resolve"
            accessibilityRole="button"
            disabled={!canResolve}
            onPress={onResolve}
            android_ripple={{ color: `${theme.primary}22` }}
            style={({ pressed }) => [
              styles.resolveButton,
              { backgroundColor: canResolve ? theme.primary : theme.secondary },
              pressed && canResolve && { opacity: 0.9 },
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
        </SectionCard>

        <SectionCard title={t('profileSettingsScreen.detailsTitle')}>
          <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>
            {t('onboardingProfileScreen.labelDisplayName')}
          </Text>
          <TextInput
            testID="profile-settings-display-name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('onboardingProfileScreen.placeholderDisplayName')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>
            {t('onboardingProfileScreen.labelBio')}
          </Text>
          <TextInput
            testID="profile-settings-bio"
            value={bio}
            onChangeText={setBio}
            placeholder={t('onboardingProfileScreen.placeholderBio')}
            {...getTextInputProps(theme)}
            style={[getTextInputStyle(theme, { multiline: true }), styles.multiline]}
            multiline
          />
          <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>
            {t('onboardingProfileScreen.labelTags')}
          </Text>
          <TextInput
            testID="profile-settings-tags"
            value={nicheTagsText}
            onChangeText={setNicheTagsText}
            placeholder={t('onboardingProfileScreen.placeholderTags')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
        </SectionCard>

        <Pressable
          accessibilityRole="button"
          onPress={() => assetsNav.openMediaKitPublic()}
          android_ripple={{ color: `${theme.primary}18` }}
          style={({ pressed }) => [
            styles.secondaryLink,
            { borderColor: theme.border, backgroundColor: theme.card },
            pressed && { opacity: 0.88 },
          ]}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[styles.secondaryTitle, { color: theme.foreground }]}>
              {t('profileSettingsScreen.mediaKitTitle')}
            </Text>
            <Text style={[styles.secondarySubtitle, { color: theme.mutedForeground }]}>
              {t('profileSettingsScreen.mediaKitSubtitle')}
            </Text>
          </View>
          <Text style={[styles.secondaryAction, { color: theme.primary }]}>{t('profileSettingsScreen.preview')}</Text>
        </Pressable>

        <Pressable
          testID="profile-settings-save"
          accessibilityRole="button"
          disabled={!canSave}
          onPress={onSave}
          android_ripple={{ color: `${theme.primary}33` }}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: canSave ? theme.primary : theme.border },
            pressed && canSave && { opacity: 0.9 },
          ]}>
          <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
            {savedFlash ? t('profileSettingsScreen.saved') : t('profileSettingsScreen.save')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  lead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  resolveButton: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveLabel: { fontWeight: '700', fontSize: fontSize.body },
  error: { fontSize: fontSize.bodySmall, lineHeight: 20, marginTop: spacing.sm },
  secondaryLink: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  secondaryTitle: { fontSize: fontSize.body, fontWeight: '700' },
  secondarySubtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  secondaryAction: { fontSize: fontSize.caption, fontWeight: '700' },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
});
