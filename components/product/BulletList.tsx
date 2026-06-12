import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, spacing } from '@/constants/tokens';

type Props = { items: string[] };

export function BulletList({ items }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={styles.list}>
      {items.map((line) => (
        <View key={line} style={styles.row}>
          <Text style={[styles.bullet, { color: theme.primary }]}>•</Text>
          <Text style={[styles.text, { color: theme.mutedForeground }]}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed, marginTop: 1 },
  text: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
