import { Children, type PropsWithChildren, type ReactElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { HUB_LIST_ICON_SIZE } from '@/components/product/HubList';
import { fontSize, layout, lineHeight, palette, radii, spacing, elevation } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';

type Props = PropsWithChildren<{
  title?: string;
  /** Inset dividers under the icon column (default for HubListRow groups). */
  insetDividers?: boolean;
}>;

export function SettingsGroup({ title, children, insetDividers = true }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const items = Children.toArray(children).filter(Boolean) as ReactElement[];

  return (
    <View style={styles.wrap}>
      {title ? (
        <Text style={[styles.title, { color: theme.foregroundEyebrow }]}>{title}</Text>
      ) : null}
      <View
        className={webClassName(corporateCleanClass.card)}
        style={[
          styles.card,
          elevation.surface,
          { borderColor: theme.border, backgroundColor: theme.card },
        ]}>
        {items.map((child, index) => (
          <View key={child.key ?? index}>
            {index > 0 ? (
              <View
                style={[
                  styles.divider,
                  insetDividers && styles.dividerInset,
                  { backgroundColor: theme.border },
                ]}
              />
            ) : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

type RowProps = PropsWithChildren<{
  label?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  testID?: string;
  /** Extra vertical padding for hero / control blocks */
  spacious?: boolean;
}>;

export function SettingsBlock({ label, children, spacious }: Pick<RowProps, 'label' | 'children' | 'spacious'>) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.block, spacious && styles.blockSpacious]}>
      {label ? <Text style={[styles.blockLabel, { color: theme.foregroundEyebrow }]}>{label}</Text> : null}
      {children}
    </View>
  );
}

export function SettingsRow({ label, onPress, trailing, children, spacious, testID }: RowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const body = (
    <View style={[styles.row, spacious && styles.rowSpacious]}>
      {label ? (
        <Text style={[styles.rowLabel, { color: theme.foreground }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {children}
      {trailing}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        android_ripple={{ color: `${theme.primary}18`, borderless: false }}
        style={({ pressed }) => [pressed && styles.rowPressed]}>
        {body}
      </Pressable>
    );
  }

  return body;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: {
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: spacing.xs,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth },
  dividerInset: { marginLeft: spacing.lg + HUB_LIST_ICON_SIZE + spacing.md },
  block: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  blockSpacious: { paddingVertical: spacing.lg },
  blockLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  rowSpacious: { minHeight: 56 },
  rowPressed: { opacity: 0.72 },
  rowLabel: { flex: 1, fontSize: fontSize.body, fontWeight: '600' },
});
