import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, radii, spacing } from '@/constants/tokens';

type BrandChipProps = {
  label: string;
  onPress?: () => void;
  compact?: boolean;
};

export function BrandChip({ label, onPress, compact = false }: BrandChipProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const content = (
    <>
      <Ionicons name="business-outline" size={compact ? 11 : 12} color={theme.primary} />
      <Text
        style={[
          styles.label,
          compact ? styles.labelCompact : null,
          { color: theme.primary },
        ]}
        numberOfLines={1}>
        {label}
      </Text>
      {onPress ? <Ionicons name="chevron-forward" size={11} color={theme.primary} style={{ opacity: 0.7 }} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="link"
        onPress={(event) => {
          event.stopPropagation?.();
          onPress();
        }}
        style={({ pressed }) => [
          styles.chip,
          compact && styles.chipCompact,
          {
            backgroundColor: theme.primary + '14',
            borderColor: theme.primary + '40',
          },
          pressed && styles.pressed,
        ]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.chip,
        compact && styles.chipCompact,
        {
          backgroundColor: theme.primary + '14',
          borderColor: theme.primary + '40',
        },
      ]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  chipCompact: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  label: {
    flexShrink: 1,
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelCompact: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
  },
  pressed: { opacity: 0.86 },
});
