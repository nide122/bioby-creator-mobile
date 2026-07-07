import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  CreatorProfileEditor,
  type CreatorProfileEditorState,
} from '@/src/components/profile/CreatorProfileEditor';
import { upsertCreatorProfile } from '@/src/api/account-api';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { alertAction } from '@/src/lib/app-dialog';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { useSessionStore } from '@/src/stores/session-store';

export default function ProfileSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const assetsNav = useAssetsHubNavigation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const setProfileBasics = useSessionStore((s) => s.setProfileBasics);

  const [editorState, setEditorState] = useState<CreatorProfileEditorState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditorStateChange = useCallback((state: CreatorProfileEditorState) => {
    setEditorState(state);
  }, []);

  const canSave = editorState?.canSubmit ?? false;

  const onSave = async () => {
    if (!editorState?.canSubmit || isSaving) return;
    setIsSaving(true);
    try {
      setProfileBasics(editorState.payload);
      await upsertCreatorProfile(editorState.payload);
      await invalidateTenantScopedQueries(queryClient);
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('profileSettingsScreen.saveFailedBody');
      void alertAction(t('profileSettingsScreen.saveFailedTitle'), message);
    } finally {
      setIsSaving(false);
    }
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

        <CreatorProfileEditor
          testIdPrefix="profile-settings"
          profileBasics={profileBasics}
          onStateChange={handleEditorStateChange}
        />

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
          disabled={!canSave || isSaving}
          onPress={() => void onSave()}
          android_ripple={{ color: `${theme.primary}33` }}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: canSave ? theme.primary : theme.border },
            pressed && canSave && { opacity: 0.9 },
          ]}>
          <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
            {isSaving ? t('profileSettingsScreen.saving') : t('profileSettingsScreen.save')}
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
