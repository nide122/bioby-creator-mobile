import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';

export type BadgeTone = 'neutral' | 'primary' | 'mint' | 'warning' | 'danger';

type Props = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral' }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const bg =
    tone === 'primary'
      ? theme.primary
      : tone === 'mint'
        ? theme.accentMintSoft
        : tone === 'warning'
          ? colorScheme === 'dark'
            ? '#422006'
            : '#fef3c7'
          : tone === 'danger'
            ? colorScheme === 'dark'
              ? '#450a0a'
              : '#fee2e2'
            : theme.secondary;

  const fg =
    tone === 'primary'
      ? theme.primaryForeground
      : tone === 'mint'
        ? theme.accentMintStrong
        : tone === 'warning'
          ? colorScheme === 'dark'
            ? '#fbbf24'
            : '#b45309'
          : tone === 'danger'
            ? colorScheme === 'dark'
              ? '#fca5a5'
              : '#b91c1c'
            : theme.foregroundSubtitle;

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    maxWidth: '100%',
    minHeight: layout.touchMin / 2,
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});
