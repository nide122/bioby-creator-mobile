import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';

type Props = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  /** 薄荷强调条（合规提示、下一步摘要） */
  emphasis?: boolean;
}>;

export function SectionCard({ title, subtitle, emphasis, children }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: emphasis ? theme.secondary : theme.card,
          borderColor: theme.border,
        },
      ]}>
      {emphasis ? <View style={[styles.accent, { backgroundColor: theme.primary }]} /> : null}
      {title ? (
        <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
      ) : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.65,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  subtitle: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  body: { gap: spacing.sm, marginTop: spacing.xs },
});
