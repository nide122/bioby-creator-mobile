import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PlatformIcon } from '@/components/PlatformIcon';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, radii, spacing } from '@/constants/tokens';
import { PRESET_PLATFORM_KEYS, PRESET_PLATFORM_LABELS, type PresetPlatformKey } from '@/src/types/creator-profile';

type Props = {
  value: PresetPlatformKey;
  connectedPlatforms: PresetPlatformKey[];
  onChange: (platform: PresetPlatformKey) => void;
};

export function PlatformProfileTabs({ value, connectedPlatforms, onChange }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.track, { backgroundColor: theme.muted }]}>
      {PRESET_PLATFORM_KEYS.map((platform) => {
        const active = value === platform;
        const connected = connectedPlatforms.includes(platform);

        return (
          <Pressable
            key={platform}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={`platform-tab-${platform}`}
            onPress={() => {
              if (!active) onChange(platform);
            }}
            android_ripple={{ color: `${theme.primary}22`, borderless: false }}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: theme.card, borderColor: theme.outline },
              pressed && !active && styles.segmentPressed,
            ]}>
            <PlatformIcon platform={PRESET_PLATFORM_LABELS[platform]} size={14} />
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? theme.foreground : theme.mutedForeground },
              ]}
              numberOfLines={1}>
              {t(`creatorProfileEditor.platformTabs.${platform}`, {
                defaultValue: PRESET_PLATFORM_LABELS[platform],
              })}
            </Text>
            {connected ? (
              <View
                style={[styles.connectedDot, { backgroundColor: theme.primary }]}
                accessibilityLabel={t('creatorProfileEditor.platformConnected')}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md - 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentPressed: { opacity: 0.75 },
  segmentLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    flexShrink: 1,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
