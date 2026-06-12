import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';

export type EmptyStateAction = {
  label: string;
  onPress: () => void;
};

type Props = PropsWithChildren<{
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}>;

/** 列表 / 查询空状态（与设计系统 SectionCard 边框节奏一致） */
export function EmptyStateCard({
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: theme.card,
        },
      ]}>
      <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
      <Text style={[styles.desc, { color: theme.mutedForeground }]}>{description}</Text>
      {children ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {primaryAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={primaryAction.onPress}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                {primaryAction.label}
              </Text>
            </Pressable>
          ) : null}
          {secondaryAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={secondaryAction.onPress}
              style={[styles.secondaryBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                {secondaryAction.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  desc: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  primaryBtn: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '700', fontSize: fontSize.body },
  secondaryBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin - 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontWeight: '700', fontSize: fontSize.bodySmall },
});
