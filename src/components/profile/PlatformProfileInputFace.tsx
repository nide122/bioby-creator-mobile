import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getTextInputProps, getTextInputStyle } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { PRESET_PLATFORM_LABELS, type PresetPlatformKey } from '@/src/types/creator-profile';

type Props = {
  platform: PresetPlatformKey;
  profileUrl: string;
  resolving: boolean;
  error: string | null;
  canResolve: boolean;
  testIdPrefix: string;
  onChangeUrl: (value: string) => void;
  onResolve: () => void;
};

export function PlatformProfileInputFace({
  platform,
  profileUrl,
  resolving,
  error,
  canResolve,
  testIdPrefix,
  onChangeUrl,
  onResolve,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const platformLabel = PRESET_PLATFORM_LABELS[platform];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: theme.mutedForeground }]}>
        {t('creatorProfileEditor.inputHint', {
          platform: platformLabel,
          defaultValue: `Paste your ${platformLabel} profile URL`,
        })}
      </Text>
      <TextInput
        testID={`${testIdPrefix}-url-${platform}`}
        value={profileUrl}
        onChangeText={onChangeUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder={t('onboardingProfileScreen.placeholderProfileUrl')}
        {...getTextInputProps(theme)}
        style={getTextInputStyle(theme)}
      />
      <Pressable
        testID={`${testIdPrefix}-resolve-${platform}`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hint: { fontSize: fontSize.bodySmall, lineHeight: 20 },
  resolveButton: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveLabel: { fontWeight: '700', fontSize: fontSize.body },
  error: { fontSize: fontSize.bodySmall, lineHeight: 20 },
});
