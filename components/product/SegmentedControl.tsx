import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, radii, spacing } from '@/constants/tokens';

export type SegmentOption<T extends string> = {
  id: T;
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.track, { backgroundColor: theme.muted }]}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) onChange(option.id);
            }}
            android_ripple={{ color: `${theme.primary}22`, borderless: false }}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: theme.card, borderColor: theme.outline },
              pressed && !active && styles.segmentPressed,
            ]}>
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={14}
                color={active ? theme.primary : theme.foregroundEyebrow}
              />
            ) : null}
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? theme.foreground : theme.mutedForeground },
              ]}
              numberOfLines={1}>
              {option.label}
            </Text>
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
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md - 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentPressed: { opacity: 0.75 },
  segmentLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
});
