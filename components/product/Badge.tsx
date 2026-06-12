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
            ? '#2A1A09'
            : '#2A1A09'
          : tone === 'danger'
            ? colorScheme === 'dark'
              ? '#2A1012'
              : '#2A1012'
            : theme.secondary;

  const fg =
    tone === 'primary'
      ? theme.primaryForeground
      : tone === 'mint'
        ? theme.accentMintStrong
        : tone === 'warning'
          ? colorScheme === 'dark'
            ? '#FACC15'
            : '#FACC15'
          : tone === 'danger'
            ? colorScheme === 'dark'
              ? '#FDA4AF'
              : '#FDA4AF'
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
