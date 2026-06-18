import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { PlatformIcon } from '@/src/components/PlatformIcon';
import { PRESET_PLATFORM_LABELS, type PresetPlatformKey } from '@/src/types/creator-profile';

type Props = {
  platforms: PresetPlatformKey[];
  size?: number;
};

export function ConnectedPlatformIcons({ platforms, size = 16 }: Props) {
  if (!platforms.length) return null;

  return (
    <View style={styles.row}>
      {platforms.map((key) => (
        <PlatformIcon key={key} platform={PRESET_PLATFORM_LABELS[key]} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
});
