import { Pressable, StyleSheet, Text } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { commonCopy } from '@/src/lib/product-copywriting';

import { SectionCard } from './SectionCard';

type Props = {
  /** 错误说明（不含敏感信息） */
  message: string;
  onRetry: () => void;
};

/** Query 失败时的统一重试块（与 SectionCard 视觉对齐） */
export function QueryRetryCard({ message, onRetry }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <SectionCard title={commonCopy.retryTitle} subtitle={commonCopy.retrySubtitle} emphasis>
      <Text style={[styles.msg, { color: theme.mutedForeground }]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.btn, { backgroundColor: theme.primary }]}>
        <Text style={[styles.btnLabel, { color: theme.primaryForeground }]}>{commonCopy.retryAction}</Text>
      </Pressable>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  msg: { fontSize: fontSize.bodySmall, lineHeight: 22 },
  btn: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: { fontWeight: '700', fontSize: fontSize.body },
});
