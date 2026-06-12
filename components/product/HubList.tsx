import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Icon column width — keep in sync with SettingsGroup divider inset when using icon rows. */
export const HUB_LIST_ICON_SIZE = 32;

export const hubListStyles = StyleSheet.create({
  pressablePressed: { opacity: 0.72 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: layout.touchMin - 4,
  },
  rowTall: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md + 2,
  },
  icon: {
    width: HUB_LIST_ICON_SIZE,
    height: HUB_LIST_ICON_SIZE,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: '600',
    lineHeight: lineHeight.body,
  },
  subtitle: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
    maxWidth: '40%',
  },
  trailingTall: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  trailingTextBlock: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 1,
    minWidth: 0,
  },
  trailingTextBlockTall: {
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  detail: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailFooter: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
});

type RowProps = {
  title: string;
  subtitle?: ReactNode;
  detail?: string;
  detailAccent?: boolean;
  detailFooter?: string;
  detailFooterAccent?: boolean;
  onPress?: () => void;
  testID?: string;
};

function HubRowBase({
  icon,
  title,
  subtitle,
  detail,
  detailAccent,
  detailFooter,
  detailFooterAccent,
  onPress,
  testID,
}: RowProps & { icon?: IconName }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const tall = !!subtitle;

  const content = (
    <View style={[hubListStyles.row, tall && hubListStyles.rowTall]}>
      {icon ? (
        <View style={[hubListStyles.icon, { backgroundColor: theme.muted }]}>
          <Ionicons name={icon} size={17} color={theme.primary} />
        </View>
      ) : null}
      <View style={hubListStyles.body}>
        <Text style={[hubListStyles.title, { color: theme.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[hubListStyles.subtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[hubListStyles.trailing, tall && detailFooter && hubListStyles.trailingTall]}>
        {detail || detailFooter ? (
          <View style={[hubListStyles.trailingTextBlock, tall && detailFooter && hubListStyles.trailingTextBlockTall]}>
            {detail ? (
              <Text
                style={[hubListStyles.detail, { color: detailAccent ? theme.primary : theme.mutedForeground }]}
                numberOfLines={1}>
                {detail}
              </Text>
            ) : null}
            {detailFooter ? (
              <Text
                style={[
                  hubListStyles.detailFooter,
                  { color: detailFooterAccent ? theme.primary : theme.foregroundEyebrow },
                ]}
                numberOfLines={1}>
                {detailFooter}
              </Text>
            ) : null}
          </View>
        ) : null}
        {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.foregroundEyebrow} /> : null}
      </View>
    </View>
  );

  if (!onPress) {
    return <View testID={testID}>{content}</View>;
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: `${theme.primary}18`, borderless: false }}
      style={({ pressed }) => [pressed && hubListStyles.pressablePressed]}>
      {content}
    </Pressable>
  );
}

/** Primary navigable list row (inbox, deals, assets, settings links). */
export function HubListRow(props: RowProps & { icon?: IconName; onPress: () => void }) {
  return <HubRowBase {...props} />;
}

/** Settings-style row without icon (account nav, static metadata). */
export function HubNavRow(props: RowProps & { onPress: () => void }) {
  return <HubRowBase {...props} />;
}

/** Non-interactive row inside a group (labels, learning log). */
export function HubStaticRow(props: Omit<RowProps, 'onPress'> & { icon?: IconName }) {
  return <HubRowBase {...props} />;
}
