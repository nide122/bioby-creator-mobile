import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, radii, spacing } from '@/constants/tokens';
import { inboxPriorityAccent, inboxPriorityBadgeTone } from '@/src/lib/inbox-priority-visuals';
import type { InboxPriority } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function InboxPrioritySectionHeader({
  priority,
  label,
  count,
}: {
  priority: InboxPriority;
  label: string;
  count: number;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const accent = inboxPriorityAccent(priority, theme);

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionRail, { backgroundColor: accent.dot }]} />
      <View style={styles.sectionHeaderBody}>
        <Badge tone={inboxPriorityBadgeTone(priority)} label={label} />
        <Text style={[styles.sectionCount, { color: theme.foregroundEyebrow }]}>{count}</Text>
      </View>
    </View>
  );
}

export function InboxPriorityIconShell({
  priority,
  icon,
}: {
  priority?: InboxPriority;
  icon: IconName;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const accent = inboxPriorityAccent(priority, theme);

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
    alignItems: 'stretch',
    gap: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionRail: {
    width: 3,
    borderRadius: 999,
    opacity: 0.92,
  },
  sectionHeaderBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionCount: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
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
