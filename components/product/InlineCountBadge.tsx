import { StyleSheet, Text, View } from 'react-native';

import { fontSize, spacing } from '@/constants/tokens';

type Props = {
  count: number;
  backgroundColor: string;
  color: string;
  size?: 'sm' | 'md';
};

export function InlineCountBadge({ count, backgroundColor, color, size = 'sm' }: Props) {
  const compact = count < 10;
  const dimension = size === 'md' ? 22 : 20;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor,
          minWidth: compact ? dimension : undefined,
          minHeight: dimension,
          paddingHorizontal: compact ? 0 : spacing.xs + 2,
        },
      ]}>
      <Text
        style={[
          styles.text,
          {
            color,
            fontSize: size === 'md' ? fontSize.bodySmall : fontSize.caption,
          },
        ]}>
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlign: 'center',
  },
});
