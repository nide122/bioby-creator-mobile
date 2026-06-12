import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, type ComponentProps } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  HubLinkGroup,
  HubListRow,
  HubMetric,
  HubMetrics,
  HubNoticeStrip,
  HubScreen,
  SegmentedControl,
  SettingsGroup,
} from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { useDecisionQueue } from '@/src/hooks/use-decisions';
import { useAiActionLog } from '@/src/hooks/use-ai-action-log';
import { useTabRefresh } from '@/src/hooks/use-tab-refresh';
import { useCreatorFocusMode } from '@/src/hooks/use-creator-focus';
import { useSessionStore } from '@/src/stores/session-store';
import type { AiActionLogEntry, DecisionCard, DecisionCategory } from '@/src/types/domain';

// ─── 常量 ──────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 90;
const SWIPE_OUT_X = 400;

/** One context line for the card — avoids stacked Note + alert + source blocks. */
function decisionCardContext(card: DecisionCard): string | undefined {
  const parts = [card.aiNote, card.sourceHint].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

type CategoryVisual = {
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
};

function useDecisionCategoryLabels(): Record<DecisionCategory, CategoryVisual> {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      payout: { icon: 'cash-outline', color: '#F59E0B', label: t('today.categories.payout') },
      opportunity: { icon: 'sparkles-outline', color: '#5FD9FF', label: t('today.categories.opportunity') },
      approval: { icon: 'checkmark-circle-outline', color: '#A7F3D0', label: t('today.categories.approval') },
      delivery: { icon: 'rocket-outline', color: '#C084FC', label: t('today.categories.delivery') },
      verification: {
        icon: 'shield-checkmark-outline',
        color: '#34D399',
        label: t('today.categories.verification'),
      },
    }),
    [t]
  );
}

// ─── 进度条 ────────────────────────────────────────────────────────────────

// ─── 进度条（绿=已解决 / 黄=已推迟） ────────────────────────────────────

function ProgressBar({
  total,
  resolved,
  deferred,
}: {
  total: number;
  resolved: number;
  deferred: number;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const resolvedRatio = total > 0 ? resolved / total : 0;
  const deferredRatio = total > 0 ? deferred / total : 0;

  const resolvedAnim = useRef(new Animated.Value(resolvedRatio)).current;
  const deferredAnim = useRef(new Animated.Value(deferredRatio)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(resolvedAnim, { toValue: resolvedRatio, duration: 300, useNativeDriver: false }),
      Animated.timing(deferredAnim, { toValue: deferredRatio, duration: 300, useNativeDriver: false }),
    ]).start();
  }, [resolvedAnim, deferredAnim, resolvedRatio, deferredRatio]);

  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        {/* 已解决（绿色实心） */}
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.primary,
              width: resolvedAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
        {/* 已推迟（黄色，紧跟在绿色之后） */}
        <Animated.View
          style={[
            styles.progressFillDeferred,
            {
              left: resolvedAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              width: deferredAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.progressLabel, { color: theme.mutedForeground }]}>
        {resolved + deferred} / {total}
      </Text>
    </View>
  );
}

function TodayFocusControl() {
  const { t } = useTranslation();
  const { creatorFocusMode, setCreatorFocusMode } = useCreatorFocusMode();

  return (
    <SegmentedControl
      options={[
        { id: 'quiet' as const, label: t('account.focusModes.quiet.label'), icon: 'moon-outline' },
        { id: 'work' as const, label: t('account.focusModes.work.label'), icon: 'flash-outline' },
      ]}
      value={creatorFocusMode}
      onChange={setCreatorFocusMode}
    />
  );
}

function UndoDecisionBanner({
  entry,
  onUndo,
}: {
  entry: { card: DecisionCard; disposition: 'resolved' | 'deferred'; actionLabel: string } | null;
  onUndo: () => void;
}) {
  const { t } = useTranslation();

  if (!entry) return null;

  const verb = entry.disposition === 'deferred' ? t('today.undo.deferredVerb') : t('today.undo.resolvedVerb');

  return (
    <HubNoticeStrip
      testID="today-undo"
      message={`${verb} · ${entry.card.headline}`}
      actionLabel={t('today.undo.button')}
      onAction={onUndo}
    />
  );
}

// ─── 决策卡（带手势） ─────────────────────────────────────────────────────

function SwipeableDecisionCard({
  card,
  onResolve,
  onDefer,
}: {
  card: DecisionCard;
  onResolve: (card: DecisionCard, actionLabel: string, href?: string) => void;
  onDefer: (card: DecisionCard) => void;
}) {
  const { t } = useTranslation();
  const categoryLabels = useDecisionCategoryLabels();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const cfg = categoryLabels[card.category];
  const contextLine = decisionCardContext(card);

  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = translateX.interpolate({
    inputRange: [-SWIPE_OUT_X, 0, SWIPE_OUT_X],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });
  const confirmOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const deferOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // 入场动画
  const entryY = useRef(new Animated.Value(36)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    entryY.setValue(36);
    entryOpacity.setValue(0);
    translateX.setValue(0);
    Animated.parallel([
      Animated.spring(entryY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.timing(entryOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [card.id, entryY, entryOpacity, translateX]);

  function flyOut(direction: 'left' | 'right', cb: () => void) {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'right' ? SWIPE_OUT_X : -SWIPE_OUT_X,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(entryOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(cb);
  }

  function handlePrimaryAction() {
    const primary = card.actions[0];
    flyOut('right', () => {
      onResolve(card, primary.label, primary.href);
      if (primary.href) router.push(primary.href as Href);
    });
  }

  function handleDefer() {
    flyOut('left', () => onDefer(card));
  }

  function handleActionButton(actionId: string, href?: string) {
    const action = card.actions.find((a) => a.id === actionId)!;
    if (action.style === 'ghost') {
      handleDefer();
    } else if (href && (action.id === 'open' || action.id === 'review')) {
      router.push(href as Href);
    } else {
      flyOut('right', () => {
        onResolve(card, action.label, href);
        if (href) router.push(href as Href);
      });
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          handlePrimaryAction();
        } else if (g.dx < -SWIPE_THRESHOLD) {
          handleDefer();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
        }
      },
    })
  ).current;

  return (
    <View testID={`today-decision-card-${card.id}`} style={styles.swipeContainer}>
      {/* 右滑底层提示 */}
      <Animated.View style={[styles.swipeBg, styles.swipeBgRight, { opacity: confirmOpacity }]}>
        <Ionicons name="checkmark-circle" size={28} color="#34D399" />
        <Text style={[styles.swipeBgLabel, { color: '#34D399' }]}>{t('today.confirm')}</Text>
      </Animated.View>
      {/* 左滑底层提示 */}
      <Animated.View style={[styles.swipeBg, styles.swipeBgLeft, { opacity: deferOpacity }]}>
        <Text style={[styles.swipeBgLabel, { color: '#F59E0B' }]}>{t('today.defer')}</Text>
        <Ionicons name="time" size={28} color="#F59E0B" />
      </Animated.View>

      {/* 卡片本体 */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            borderColor: theme.border,
            backgroundColor: theme.card,
            borderLeftColor: cfg.color,
          },
          { transform: [{ translateX }, { rotate }, { translateY: entryY }], opacity: entryOpacity },
        ]}>

        {/* 类型标签行 */}
        <View style={styles.categoryRow}>
          <View style={[styles.categoryIcon, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon} size={15} color={cfg.color} />
          </View>
          <Text style={[styles.categoryLabel, { color: theme.foregroundEyebrow }]}>{cfg.label}</Text>
          {card.amountLabel ? (
            <Text style={[styles.amountLabel, { color: cfg.color }]}>{card.amountLabel}</Text>
          ) : null}
        </View>

        {/* 标题 + 品牌 + 一行上下文 */}
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.headline, { color: theme.foreground }]}>{card.headline}</Text>
          <Text style={[styles.entityName, { color: theme.mutedForeground }]}>{card.entityName}</Text>
          {contextLine ? (
            <Pressable
              accessibilityRole={card.sourceHref ? 'link' : undefined}
              disabled={!card.sourceHref}
              onPress={() => card.sourceHref && router.push(card.sourceHref as Href)}
              style={styles.contextRow}>
              <Text style={[styles.contextText, { color: theme.mutedForeground }]} numberOfLines={2}>
                {contextLine}
              </Text>
              {card.sourceHref ? (
                <Ionicons name="chevron-forward" size={12} color={theme.foregroundEyebrow} />
              ) : null}
            </Pressable>
          ) : null}
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionsCol}>
          {card.actions.map((action) => (
            <ActionButton
              key={action.id}
              testID={`today-action-${card.id}-${action.id}`}
              label={action.label}
              btnStyle={action.style}
              onPress={() => handleActionButton(action.id, action.href)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── 按钮 ──────────────────────────────────────────────────────────────────

function ActionButton({
  testID,
  label,
  btnStyle,
  onPress,
}: {
  testID?: string;
  label: string;
  btnStyle: 'primary' | 'secondary' | 'ghost';
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (btnStyle === 'primary') {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.btnPrimary, { backgroundColor: theme.primary }]}>
        <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>{label}</Text>
      </Pressable>
    );
  }
  if (btnStyle === 'secondary') {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.btnSecondary, { borderColor: theme.border }]}>
        <Text style={[styles.btnSecondaryLabel, { color: theme.foreground }]}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={styles.btnGhost}>
      <Text style={[styles.btnGhostLabel, { color: theme.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function QueuePreviewCard({ items }: { items: DecisionCard[] }) {
  const { t } = useTranslation();
  const categoryLabels = useDecisionCategoryLabels();
  const router = useRouter();
  const preview = items.slice(1, 3);

  if (preview.length === 0) return null;

  return (
    <SettingsGroup title={t('today.queueNextTitle')}>
      {preview.map((item) => {
        const cfg = categoryLabels[item.category];
        return (
          <HubListRow
            key={item.id}
            icon={cfg.icon}
            title={item.headline}
            subtitle={item.entityName}
            detail={cfg.label}
            onPress={() => {
              if (item.sourceHref) router.push(item.sourceHref as Href);
            }}
          />
        );
      })}
    </SettingsGroup>
  );
}

// ─── 全部完成态 ────────────────────────────────────────────────────────────

function DoneState({
  aiActionLog,
  deferred,
  hiddenByFocusCount,
  onReprocessDeferred,
  onStartWorkMode,
}: {
  aiActionLog: AiActionLogEntry[];
  deferred: DecisionCard[];
  hiddenByFocusCount: number;
  onReprocessDeferred: () => void;
  onStartWorkMode: () => void;
}) {
  const { t, i18n } = useTranslation();
  const timeTag = calendarLocaleTagForLanguage(i18n.language);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  return (
    <Animated.View style={[{ gap: spacing.lg }, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* 完成 header */}
      <View style={styles.doneHeader}>
        <View style={[styles.doneIconBox, { backgroundColor: theme.primary + '14' }]}>
          <Ionicons name="checkmark-circle" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.doneTitle, { color: theme.foreground }]}>{t('today.doneTitle')}</Text>
        {hiddenByFocusCount > 0 ? (
          <Text style={[styles.doneSub, { color: theme.mutedForeground }]}>
            {t('today.doneSubHidden', { count: hiddenByFocusCount })}
          </Text>
        ) : null}
        {hiddenByFocusCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={onStartWorkMode}
            style={[styles.doneInlineButton, { borderColor: theme.border }]}>
            <Text style={[styles.doneInlineButtonLabel, { color: theme.primary }]}>{t('today.seeOpportunities')}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* 推迟的事项 */}
      {deferred.length > 0 ? (
        <SettingsGroup title={t('today.deferredCardTitle', { count: deferred.length })}>
          {deferred.map((c) => (
            <HubListRow
              key={c.id}
              icon="time-outline"
              title={c.headline}
              subtitle={c.entityName}
              onPress={() => {
                if (c.sourceHref) router.push(c.sourceHref as Href);
              }}
            />
          ))}
          <HubListRow icon="refresh-outline" title={t('today.processDeferredCta')} onPress={onReprocessDeferred} />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={t('today.aiLogTitle')}>
        {aiActionLog.slice(0, 5).map((entry) => (
          <HubListRow
            key={entry.id}
            icon="receipt-outline"
            title={entry.title}
            subtitle={new Date(entry.occurredAtISO).toLocaleTimeString(timeTag, {
              hour: '2-digit',
              minute: '2-digit',
            })}
            onPress={() => {
              if (entry.sourceHref) router.push(entry.sourceHref as Href);
            }}
          />
        ))}
      </SettingsGroup>

      <HubLinkGroup
        title={t('hubLinks.related')}
        links={[
          { label: t('today.shortcuts.mail'), href: '/inbox', icon: 'mail-outline' },
          { label: t('today.shortcuts.deals'), href: '/deals', icon: 'briefcase-outline' },
          { label: t('today.shortcuts.assets'), href: '/growth', icon: 'folder-open-outline' },
        ]}
      />
    </Animated.View>
  );
}

// ─── 主屏 ──────────────────────────────────────────────────────────────────

export default function DecisionQueueScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const profile = useSessionStore((s) => s.profileBasics);
  const { creatorFocusMode, setCreatorFocusMode } = useCreatorFocusMode();
  const queryClient = useQueryClient();
  const queue = useDecisionQueue();
  const aiActionLog = useAiActionLog();
  const refreshToday = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['decisions'] }),
        queryClient.invalidateQueries({ queryKey: ['home', 'action-log'] }),
      ]),
    [queryClient]
  );
  const { refreshing, onRefresh } = useTabRefresh(refreshToday);

  function handleResolve(card: DecisionCard, actionLabel: string, href?: string) {
    queue.resolve(card, actionLabel);
  }

  function handleDefer(card: DecisionCard) {
    queue.defer(card);
  }

  /** 将推迟的卡片重新放回待处理队列 */
  function handleReprocessDeferred() {
    queue.reprocessDeferred();
  }

  if (queue.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const displayPending =
    creatorFocusMode === 'quiet'
      ? queue.pending.filter(
          (card) =>
            card.category !== 'opportunity' || !!card.interruptReason || !!card.urgencyNote
        )
      : queue.pending;
  const hiddenByFocusCount = queue.pending.length - displayPending.length;
  const displayCurrent = displayPending[0] ?? null;
  const displayDone = !queue.isPending && displayPending.length === 0;

  const highPriorityCount = displayPending.filter(
    (c) => c.category === 'payout' || !!c.urgencyNote
  ).length;

  const moneyPhrase =
    highPriorityCount > 0 ? t('today.pendingMoneySuffix', { count: highPriorityCount }) : '';

  const pendingSummary =
    !displayDone && displayPending.length > 0
      ? t('today.pendingSummary', { count: displayPending.length, money: moneyPhrase })
      : null;

  const screenTitle = displayDone
    ? t('today.greetingDone')
    : (pendingSummary ?? t('today.greetingActive', { name: profile?.displayName ?? t('auth.creatorFallback') }));

  const toolbar = (
    <>
      {queue.totalCount > 0 ? (
        <ProgressBar
          total={queue.totalCount}
          resolved={queue.resolvedCount}
          deferred={queue.deferred.length}
        />
      ) : null}
      {queue.totalCount > 0 ? (
        <HubMetrics>
          <HubMetric
            value={String(displayPending.length)}
            label={t('today.metrics.pending')}
            accent={displayPending.length > 0}
          />
          <HubMetric value={String(queue.resolvedCount)} label={t('today.metrics.done')} />
          <HubMetric
            value={String(queue.deferred.length)}
            label={t('today.metrics.snoozed')}
            accent={queue.deferred.length > 0}
          />
        </HubMetrics>
      ) : null}
      <TodayFocusControl />
      {!displayDone ? <UndoDecisionBanner entry={queue.lastEntry} onUndo={queue.undoLast} /> : null}
    </>
  );

  return (
    <HubScreen
      testID="screen-today"
      eyebrow={t('tabs.today')}
      title={screenTitle}
      toolbar={toolbar}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      {displayDone ? (
        <DoneState
          aiActionLog={aiActionLog}
          deferred={queue.deferred}
          hiddenByFocusCount={hiddenByFocusCount}
          onReprocessDeferred={handleReprocessDeferred}
          onStartWorkMode={() => setCreatorFocusMode('work')}
        />
      ) : displayCurrent ? (
        <View style={styles.cardSection}>
          <SwipeableDecisionCard
            card={displayCurrent}
            onResolve={handleResolve}
            onDefer={handleDefer}
          />
          <QueuePreviewCard items={displayPending} />
        </View>
      ) : null}
    </HubScreen>
  );
}

// ─── 样式 ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2 },
  progressFillDeferred: { position: 'absolute', top: 0, height: '100%', borderRadius: 2, backgroundColor: '#F59E0B', opacity: 0.6 },
  progressLabel: { fontSize: fontSize.caption, fontWeight: '700', minWidth: 32, textAlign: 'right' },

  // 滑动容器
  swipeContainer: { position: 'relative' },
  swipeBg: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    flexDirection: 'row',
  },
  swipeBgRight: { right: 0, backgroundColor: '#34D39910', paddingRight: spacing.xxl },
  swipeBgLeft: { left: 0, backgroundColor: '#F59E0B10', paddingLeft: spacing.xxl },
  swipeBgLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },

  // 决策卡
  cardSection: { gap: spacing.md },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryIcon: { width: 26, height: 26, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', flex: 1 },
  amountLabel: { fontSize: fontSize.caption, fontWeight: '700', fontVariant: ['tabular-nums'] },
  headline: { fontSize: fontSize.sectionTitle, fontWeight: '800', letterSpacing: -0.35, lineHeight: lineHeight.lead },
  entityName: { fontSize: fontSize.bodySmall, fontWeight: '500' },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  contextText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  actionsCol: { gap: spacing.sm, marginTop: spacing.sm },
  btnPrimary: { borderRadius: radii.md, minHeight: layout.touchMin, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  btnSecondary: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, minHeight: layout.touchMin, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryLabel: { fontSize: fontSize.bodySmall, fontWeight: '600' },
  btnGhost: { minHeight: layout.touchMin * 0.75, alignItems: 'center', justifyContent: 'center' },
  btnGhostLabel: { fontSize: fontSize.bodySmall, fontWeight: '600' },

  // 完成态
  doneHeader: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  doneIconBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: fontSize.sectionTitle, fontWeight: '800', letterSpacing: -0.35 },
  doneSub: { fontSize: fontSize.body, textAlign: 'center', lineHeight: lineHeight.bodyRelaxed },
  doneInlineButton: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  doneInlineButtonLabel: { fontSize: fontSize.bodySmall, fontWeight: '800' },
});
