import type { ComponentProps, PropsWithChildren, ReactNode, RefObject } from 'react';
import { type Href, useRouter } from 'expo-router';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { HubListRow } from '@/components/product/HubList';
import { SettingsGroup } from '@/components/product/SettingsGroup';
import { TextField } from '@/components/product/TextField';
import { InlineCountBadge } from './InlineCountBadge';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';

type IconName = ComponentProps<typeof Ionicons>['name'];

type HubScreenProps = PropsWithChildren<{
  /** Small caps label above the title (e.g. tab name) */
  eyebrow?: string;
  title?: string;
  lead?: string;
  testID?: string;
  /** Replaces default title block (profile hero, etc.) */
  header?: ReactNode;
  /** Sticky-adjacent controls under the header (segmented, metrics, search) */
  toolbar?: ReactNode;
  /** Scrolls with content (sign out, legal links) */
  footer?: ReactNode;
  /** Pinned below the scroll area (thread CTAs, etc.) */
  fixedFooter?: ReactNode;
  /** Extra scroll padding when `fixedFooter` is set */
  scrollBottomInset?: number;
  /** Pull-to-refresh (main tabs) */
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollRef?: RefObject<ScrollView | null>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange?: (width: number, height: number) => void;
  onBodyLayout?: (event: LayoutChangeEvent) => void;
}>;

/** Standard scroll shell for main tabs and stack detail screens. */
export function HubScreen({
  eyebrow,
  title,
  lead,
  testID,
  header,
  toolbar,
  footer,
  fixedFooter,
  scrollBottomInset,
  refreshing,
  onRefresh,
  scrollRef,
  onScroll,
  onContentSizeChange,
  onBodyLayout,
  children,
}: HubScreenProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const scroll = (
    <ScrollView
      ref={scrollRef}
      testID={fixedFooter ? undefined : testID}
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[
        hubStyles.scroll,
        onRefresh ? hubStyles.scrollRefreshable : null,
        scrollBottomInset ? { paddingBottom: scrollBottomInset } : null,
      ]}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={!!onRefresh}
      overScrollMode={onRefresh ? 'always' : undefined}
      onScroll={onScroll}
      onContentSizeChange={onContentSizeChange}
      scrollEventThrottle={onScroll ? 16 : undefined}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={theme.primary} />
        ) : undefined
      }>
      {header ?? (
        <View style={hubStyles.header} className={webClassName(corporateCleanClass.animateIn)}>
          {eyebrow ? (
            <Text style={[hubStyles.eyebrow, { color: theme.foregroundEyebrow }]}>{eyebrow}</Text>
          ) : null}
          {title ? (
            <Text
              className={webClassName(corporateCleanClass.gradientText)}
              style={[hubStyles.title, { color: theme.foreground }]}>
              {title}
            </Text>
          ) : null}
          {lead ? <Text style={[hubStyles.lead, { color: theme.mutedForeground }]}>{lead}</Text> : null}
        </View>
      )}
      {toolbar ? <View style={hubStyles.toolbar}>{toolbar}</View> : null}
      {children ? <View style={hubStyles.body} onLayout={onBodyLayout}>{children}</View> : null}
      {footer ? <View style={hubStyles.footer}>{footer}</View> : null}
    </ScrollView>
  );

  if (fixedFooter) {
    return (
      <View
        testID={testID}
        className={webClassName(corporateCleanClass.screen)}
        style={{ flex: 1, backgroundColor: theme.background }}>
        {scroll}
        {fixedFooter}
      </View>
    );
  }

  return scroll;
}

export function HubMetrics({ children }: PropsWithChildren) {
  return <View style={hubStyles.metricsRow}>{children}</View>;
}

export function HubMetric({
  value,
  label,
  hint,
  accent,
}: {
  value: string;
  label: string;
  hint?: string;
  accent?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[hubStyles.metricTile, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[hubStyles.metricValue, { color: accent ? theme.primary : theme.foreground }]}>{value}</Text>
      <Text style={[hubStyles.metricLabel, { color: theme.foreground }]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={[hubStyles.metricHint, { color: theme.mutedForeground }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export type HubLinkItem = {
  label: string;
  href?: Href;
  onPress?: () => void;
  hint?: string;
  icon?: IconName;
  detail?: string;
  detailAccent?: boolean;
};

export function HubLinkGroup({ title, links }: { title?: string; links: HubLinkItem[] }) {
  const router = useRouter();

  return (
    <SettingsGroup title={title}>
      {links.map((item) => (
        <HubListRow
          key={item.label}
          icon={item.icon}
          title={item.label}
          subtitle={item.hint}
          detail={item.detail}
          detailAccent={item.detailAccent}
          onPress={() => {
            if (item.onPress) {
              item.onPress();
              return;
            }
            if (item.href) router.push(item.href);
          }}
        />
      ))}
    </SettingsGroup>
  );
}

export function HubCallout({ title, body }: { title?: string; body: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[hubStyles.callout, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Ionicons name="information-circle-outline" size={18} color={theme.foregroundEyebrow} />
      <View style={hubStyles.calloutText}>
        {title ? <Text style={[hubStyles.calloutTitle, { color: theme.foreground }]}>{title}</Text> : null}
        <Text style={[hubStyles.calloutBody, { color: theme.mutedForeground }]}>{body}</Text>
      </View>
    </View>
  );
}

/** Single-line toolbar notice (undo, transient status). */
export function HubNoticeStrip({
  testID,
  message,
  actionLabel,
  onAction,
}: {
  testID?: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View
      testID={testID}
      style={[hubStyles.noticeStrip, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[hubStyles.noticeMessage, { color: theme.foreground }]} numberOfLines={2}>
        {message}
      </Text>
      <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
        <Text style={[hubStyles.noticeAction, { color: theme.primary }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

/** Compact inline notice (connect inbox, etc.) */
export function HubBanner({
  testID,
  tone = 'warning',
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryTestID,
}: {
  testID?: string;
  tone?: 'warning' | 'info';
  title: string;
  body?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryTestID?: string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const accent = tone === 'warning' ? '#F59E0B' : theme.primary;
  const bg = tone === 'warning' ? '#F59E0B12' : theme.primary + '12';

  return (
    <View
      testID={testID}
      style={[hubStyles.banner, { borderColor: accent + '55', backgroundColor: bg }]}>
      <View style={hubStyles.bannerCopy}>
        <Text style={[hubStyles.bannerTitle, { color: theme.foreground }]}>{title}</Text>
        {body ? <Text style={[hubStyles.bannerBody, { color: theme.mutedForeground }]}>{body}</Text> : null}
      </View>
      <View style={hubStyles.bannerActions}>
        <Pressable
          testID={primaryTestID}
          accessibilityRole="button"
          onPress={onPrimary}
          style={[hubStyles.bannerPrimary, { backgroundColor: theme.primary }]}>
          <Text style={[hubStyles.bannerPrimaryLabel, { color: theme.primaryForeground }]}>{primaryLabel}</Text>
        </Pressable>
        {secondaryLabel && onSecondary ? (
          <Pressable accessibilityRole="button" onPress={onSecondary}>
            <Text style={[hubStyles.bannerSecondary, { color: theme.mutedForeground }]}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Primary promo row (media kit, featured action) */
export function HubPromoRow({
  testID,
  icon,
  title,
  subtitle,
  onPress,
}: {
  testID?: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        hubStyles.promo,
        { borderColor: theme.border, backgroundColor: theme.card },
        pressed && { opacity: 0.88 },
      ]}>
      <View style={[hubStyles.promoIcon, { backgroundColor: theme.muted }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={hubStyles.promoText}>
        <Text style={[hubStyles.promoTitle, { color: theme.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[hubStyles.promoSubtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.foregroundEyebrow} />
    </Pressable>
  );
}

export function HubSearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  resultCount,
  onClear,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  resultCount?: number;
  onClear?: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const hasQuery = value.trim().length > 0;

  return (
    <View style={[hubStyles.searchField, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Ionicons name="search-outline" size={16} color={theme.foregroundEyebrow} />
      <TextField
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={hubStyles.searchInput}
      />
      {hasQuery && onClear ? (
        <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8} style={hubStyles.searchClear}>
          <Ionicons name="close-circle" size={16} color={theme.foregroundEyebrow} />
        </Pressable>
      ) : null}
      {hasQuery && resultCount !== undefined ? (
        <Text style={[hubStyles.searchCount, { color: theme.mutedForeground }]}>{resultCount}</Text>
      ) : null}
    </View>
  );
}

export function FilterChipRow<T extends string>({
  items,
  value,
  onChange,
  testIdForItem,
}: {
  items: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  testIdForItem?: (id: T) => string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={hubStyles.filterRowScroll}
      contentContainerStyle={hubStyles.filterRow}>
      {items.map((item) => {
        const active = value === item.id;
        return (
          <Pressable
            key={item.id}
            testID={testIdForItem?.(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.id)}
            style={[
              hubStyles.filterChip,
              {
                borderColor: active ? theme.primary + '80' : theme.border,
                backgroundColor: active ? theme.primary + '14' : theme.card,
              },
            ]}>
            <Text style={[hubStyles.filterLabel, { color: active ? theme.primary : theme.mutedForeground }]}>
              {item.label}
            </Text>
            {item.count !== undefined ? (
              <InlineCountBadge
                count={item.count}
                backgroundColor={active ? theme.primary + '28' : theme.secondary}
                color={active ? theme.primary : theme.foreground}
              />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const hubStyles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.tabScreenPaddingX,
    paddingTop: layout.tabScreenPaddingTop,
    paddingBottom: layout.tabBarScrollInset,
    gap: layout.tabScreenSectionGap,
  },
  /** Short lists still pull-to-refresh when content is shorter than the viewport. */
  scrollRefreshable: {
    flexGrow: 1,
  },
  header: { gap: spacing.xs },
  eyebrow: {
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  searchField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    minHeight: layout.touchMin - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 36,
  },
  searchClear: { padding: spacing.xs },
  searchCount: { fontSize: fontSize.caption, fontWeight: '800', fontVariant: ['tabular-nums'] },
  lead: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  toolbar: { gap: spacing.md },
  body: { gap: layout.tabScreenSectionGap },
  footer: { marginTop: spacing.sm },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  metricTile: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 2,
    minHeight: 68,
  },
  metricValue: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: fontSize.caption, fontWeight: '700' },
  metricHint: { fontSize: 11, lineHeight: 14 },
  callout: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  calloutText: { flex: 1, gap: spacing.xs },
  calloutTitle: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  calloutBody: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  bannerCopy: { gap: spacing.xs },
  bannerTitle: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  bannerBody: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  bannerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bannerPrimary: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  bannerPrimaryLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  bannerSecondary: { fontSize: fontSize.caption, fontWeight: '600' },
  noticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 44,
  },
  noticeMessage: { flex: 1, fontSize: fontSize.bodySmall, fontWeight: '500', lineHeight: lineHeight.body },
  noticeAction: { fontSize: fontSize.caption, fontWeight: '700' },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  promoIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoText: { flex: 1, gap: 2 },
  promoTitle: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  promoSubtitle: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  filterRowScroll: { flexGrow: 0 },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.xs },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  filterLabel: { fontSize: fontSize.caption, fontWeight: '700' },
});
