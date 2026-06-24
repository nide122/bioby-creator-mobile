import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { InlineCountBadge } from '@/components/product/InlineCountBadge';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { leadValueBandAccent } from '@/src/lib/lead-value-band-visuals';
import type { LeadValueBand } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function LeadValueBandSectionHeader({
  band,
  label,
  count,
}: {
  band: LeadValueBand;
  label: string;
  count: number;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const accent = leadValueBandAccent(band, theme);

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionRail, { backgroundColor: accent.dot }]} />
      <View style={styles.sectionHeaderBody}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>{label}</Text>
        <InlineCountBadge count={count} backgroundColor={accent.iconBg} color={accent.iconColor} size="md" />
      </View>
    </View>
  );
}

export function LeadValueBandIconShell({
  band,
  icon,
}: {
  band?: LeadValueBand;
  icon: IconName;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const accent = leadValueBandAccent(band, theme);

  return (
    <View
      style={[
        styles.iconShell,
        {
          backgroundColor: accent.iconBg,
          borderColor: accent.iconBorder,
        },
      ]}>
      <Ionicons name={icon} size={17} color={accent.iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionRail: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 999,
    opacity: 0.92,
  },
  sectionHeaderBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  iconShell: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
