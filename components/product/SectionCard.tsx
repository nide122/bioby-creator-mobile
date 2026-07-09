import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';

type Props = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  /** 薄荷强调条（合规提示、下一步摘要） */
  emphasis?: boolean;
  /** 顶部强调色条；默认随 emphasis 显示，可单独关闭 */
  accentBar?: boolean;
}>;

export function SectionCard({ title, subtitle, emphasis, accentBar, children }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View
      className={webClassName(corporateCleanClass.card)}
      style={[
        styles.card,
        {
          backgroundColor: emphasis ? theme.secondary : theme.card,
          borderColor: theme.border,
        },
      ]}>
      {emphasis && accentBar !== false ? <View style={[styles.accent, { backgroundColor: theme.primary }]} /> : null}
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
