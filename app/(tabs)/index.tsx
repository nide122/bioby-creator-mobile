import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  Animated,
  Alert,
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
  SettingsGroup,
  Badge,
  hubListStyles,
} from '@/components/product';
import { InboxPriorityIconShell } from '@/components/inbox/InboxPriorityChrome';
import { RiskBanner } from '@/components/inbox/RiskBanner';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing, elevation } from '@/constants/tokens';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { useDecisionQueue } from '@/src/hooks/use-decisions';
import { useAiActionLog } from '@/src/hooks/use-ai-action-log';
import { useTabRefresh } from '@/src/hooks/use-tab-refresh';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { useSessionStore } from '@/src/stores/session-store';
import type { AiActionLogEntry, DecisionAction, DecisionCard, DecisionCategory } from '@/src/types/domain';
import { resolveDecisionCardBorderAccent, resolveDecisionCardPriority } from '@/src/lib/decision-card-visuals';
import {
  decisionCardBrandLabel,
  decisionCardNextStepHint,
  formatDecisionCardTitle,
  shouldShowDecisionNextStep,
} from '@/src/lib/decision-card-content';
import {
  formatLocalizedDecisionQueuePreviewLines,
  getLocalizedDecisionPresentation,
  localizeDecisionActionReasonMessage,
  localizeDecisionHeadline,
} from '@/src/lib/decision-card-i18n';
import { inboxPriorityBadgeTone } from '@/src/lib/inbox-priority-visuals';
import { hrefWithReturnTo } from '@/src/lib/open-brand-detail';
import { runDecisionActionEffect } from '@/src/lib/decision-action-effects';
import {
  invalidateDealClosureArtifacts,
  invalidateDealWorkspaceQueries,
  refetchDecisionQueueQueries,
} from '@/src/lib/invalidate-deal-queries';
import { getActiveTenantPublicId, tenantQueryKey } from '@/src/lib/tenant-query';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';

// ─── 常量 ──────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 90;
const SWIPE_OUT_X = 400;
const SWIPE_HINT_X = -112;
/** Today tab home — attach as returnTo so inbox/detail back returns here, not the inbox list. */
const TODAY_HOME = '/';

function pushFromToday(router: ReturnType<typeof useRouter>, href: string) {
  router.push(hrefWithReturnTo(href, TODAY_HOME) as Href);
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

function openDecisionCard(router: ReturnType<typeof useRouter>, card: DecisionCard) {
  if (card.sourceHref) {
    pushFromToday(router, card.sourceHref);
  }
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
  const headline = localizeDecisionHeadline(entry.card.headline, entry.card, t);

  return (
    <HubNoticeStrip
      testID="today-undo"
      message={`${verb} · ${headline}`}
      actionLabel={t('today.undo.button')}
      onAction={onUndo}
    />
  );
}

function DecisionCardMetaRow({ card }: { card: DecisionCard }) {
  const { t } = useTranslation();
  const { inboxPriorityLabel } = useDomainLabels();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const displayPriority = resolveDecisionCardPriority(card);

  if (!displayPriority && !card.amountLabel) return null;

  return (
    <View style={styles.categoryRow}>
      {displayPriority ? (
        <Badge
          tone={inboxPriorityBadgeTone(displayPriority)}
          label={displayPriority === 'p0' ? t('today.priorityP0') : inboxPriorityLabel[displayPriority]}
        />
      ) : null}
      {card.amountLabel ? (
        <Text style={[styles.amountLabel, { color: theme.primary }]}>{card.amountLabel}</Text>
      ) : null}
    </View>
  );
}

function DecisionCardIdentityBlock({ card }: { card: DecisionCard }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { display } = getLocalizedDecisionPresentation(card, t);
  const brandLabel = decisionCardBrandLabel(card) ?? display.brand;
  const title = formatDecisionCardTitle(brandLabel, display.subject);
  const statusSubtitle = display.urgencyLabel || display.actionSummary;

  return (
    <View style={styles.identityBlock}>
      <Text style={[styles.cardTitle, { color: theme.foreground }]} numberOfLines={2}>
        {title}
      </Text>
      {statusSubtitle ? (
        <Text style={[styles.cardStatusSubtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
          {statusSubtitle}
        </Text>
      ) : null}
    </View>
  );
}

function DecisionCardNoteBlock({ card }: { card: DecisionCard }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const aiNote = getLocalizedDecisionPresentation(card, t).aiNote;

  if (!aiNote?.trim()) return null;

  return (
    <View style={[styles.noteBox, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Text style={[styles.noteEyebrow, { color: theme.foregroundEyebrow }]}>{t('today.card.note')}</Text>
      <Text style={[styles.noteText, { color: theme.foregroundSubtitle }]} numberOfLines={4}>
        {aiNote}
      </Text>
    </View>
  );
}

function DecisionCardNextStepBlock({ card }: { card: DecisionCard }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const hint = localizeDecisionActionReasonMessage(decisionCardNextStepHint(card), t);
  const note = getLocalizedDecisionPresentation(card, t).aiNote?.trim();

  if (!shouldShowDecisionNextStep(card, hint) || hint === note) return null;

  return (
    <View
      style={[
        styles.nextStepBox,
        {
          borderColor: theme.primary + '55',
          backgroundColor: theme.primary + '10',
        },
      ]}>
      <Text style={[styles.nextStepEyebrow, { color: theme.foregroundEyebrow }]}>{t('today.card.nextStep')}</Text>
      <Text style={[styles.nextStepLabel, { color: theme.foreground }]} numberOfLines={3}>
        {hint}
      </Text>
    </View>
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
  const queryClient = useQueryClient();
  const categoryLabels = useDecisionCategoryLabels();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const cfg = categoryLabels[card.category];
  const borderAccentColor = resolveDecisionCardBorderAccent(card, cfg.color, theme);
  const localizedPresentation = getLocalizedDecisionPresentation(card, t);
  const [actionPending, setActionPending] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  // Left-swipe only (defer). Right swipe is disabled — confirm happens via buttons.
  const rotate = translateX.interpolate({
    inputRange: [-SWIPE_OUT_X, 0],
    outputRange: ['-8deg', '0deg'],
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

  // 每次进入 Today 时，在首张卡片上露出左滑操作层并自动回弹。
  useEffect(() => {
    const hintAnimation = Animated.sequence([
      Animated.delay(650),
      Animated.timing(translateX, {
        toValue: SWIPE_HINT_X,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.delay(950),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }),
    ]);
    hintAnimation.start();

    return () => {
      hintAnimation.stop();
    };
  }, [translateX]);

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

  function finishResolvedAction(action: DecisionAction) {
    onResolve(card, action.label, action.href);
  }

  function afterApproveSuccess(dealId: string, action: DecisionAction) {
    invalidateDealWorkspaceQueries(queryClient, dealId);
    invalidateDealClosureArtifacts(queryClient);
    void queryClient.invalidateQueries({ queryKey: tenantQueryKey(getActiveTenantPublicId(), 'decisions') });
    finishResolvedAction(action);
    router.push(`/deal/${dealId}` as Href);
  }

  function runPrimaryAction(action: DecisionAction) {
    if (actionPending) return;
    if (action.id === 'approve') {
      setActionPending(true);
      void runDecisionActionEffect(action)
        .then((result) => {
          if (result.handled && result.dealId) {
            afterApproveSuccess(result.dealId, action);
            return;
          }
          finishResolvedAction(action);
          if (action.href) pushFromToday(router, action.href);
        })
        .catch(() => {
          Alert.alert(
            t('dealVerificationScreen.approveErrorTitle'),
            t('dealVerificationScreen.approveErrorBody')
          );
        })
        .finally(() => setActionPending(false));
      return;
    }
    finishResolvedAction(action);
    if (action.href) pushFromToday(router, action.href);
  }

  function handleDefer() {
    flyOut('left', () => onDefer(card));
  }

  function handleActionButton(actionId: string, href?: string) {
    const action = card.actions.find((a) => a.id === actionId)!;
    if (action.style === 'ghost') {
      handleDefer();
    } else if (href && (action.id === 'open' || action.id === 'review')) {
      pushFromToday(router, href);
    } else {
      flyOut('right', () => runPrimaryAction({ ...action, href }));
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      // Only claim horizontal pans that move left (defer). Right swipe does nothing.
      onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        translateX.setValue(Math.min(0, g.dx));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          handleDefer();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
        }
      },
    })
  ).current;

  return (
    <View testID={`today-decision-card-${card.id}`} style={styles.swipeContainer}>
      {/* 左滑底层提示（推迟） */}
      <Animated.View style={[styles.swipeBg, styles.swipeBgLeft, { opacity: deferOpacity }]}>
        <Ionicons name="time-outline" size={24} color="#F59E0B" />
        <Text style={[styles.swipeBgLabel, { color: '#F59E0B' }]}>{t('today.swipe.deferHint')}</Text>
      </Animated.View>

      {/* 卡片本体 */}
      <Animated.View
        {...panResponder.panHandlers}
        className={webClassName(corporateCleanClass.card, corporateCleanClass.animateIn)}
        style={[
          styles.card,
          {
            borderColor: theme.border,
            backgroundColor: theme.card,
            borderLeftColor: borderAccentColor,
          },
          { transform: [{ translateX }, { rotate }, { translateY: entryY }], opacity: entryOpacity },
        ]}>

        {/* 品牌 / 商机身份 */}
        <DecisionCardMetaRow card={card} />
        <DecisionCardIdentityBlock card={card} />
        <DecisionCardNoteBlock card={card} />
        <DecisionCardNextStepBlock card={card} />

        {/* 操作按钮 */}
        <View style={styles.actionsCol}>
          {localizedPresentation.actions.map((action) => (
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
        className={webClassName(corporateCleanClass.btnPrimary, corporateCleanClass.gradient)}
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
        className={webClassName(corporateCleanClass.btnSecondary)}
        style={[styles.btnSecondary, { borderColor: theme.border, backgroundColor: theme.card }]}>
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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { inboxPriorityLabel } = useDomainLabels();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const preview = items.slice(1, 3);
  const remaining = items.slice(3);
  const visibleItems = expanded ? items.slice(1) : preview;

  if (visibleItems.length === 0 && remaining.length === 0) return null;

  return (
    <View style={styles.queuePreviewWrap}>
      {visibleItems.length > 0 ? (
        <View style={styles.queuePreviewSection}>
          <Text style={[styles.queuePreviewTitle, { color: theme.foregroundEyebrow }]}>
            {t('today.queueNextTitle')}
          </Text>
          <View style={styles.queuePreviewList}>
            {visibleItems.map((item) => {
              const previewLines = formatLocalizedDecisionQueuePreviewLines(item, t);
              const displayPriority = resolveDecisionCardPriority(item);
              const priorityBadge =
                displayPriority ? (
                  <Badge
                    tone={inboxPriorityBadgeTone(displayPriority)}
                    label={displayPriority === 'p0' ? t('today.priorityP0') : inboxPriorityLabel[displayPriority]}
                  />
                ) : null;

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => openDecisionCard(router, item)}
                  className={webClassName(corporateCleanClass.card, corporateCleanClass.row)}
                  style={({ pressed }) => [
                    styles.queueRow,
                    elevation.surface,
                    { borderColor: theme.border, backgroundColor: theme.card },
                    pressed && { opacity: 0.88 },
                  ]}>
                  <View style={styles.queueRowCopy}>
                    {priorityBadge}
                    <Text style={[styles.queueRowTitle, { color: theme.foreground }]} numberOfLines={2}>
                      {previewLines.title}
                    </Text>
                    {previewLines.subtitle ? (
                      <Text style={[styles.queueRowSubtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
                        {previewLines.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {remaining.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('today.queueCollapse') : t('today.queueRemaining', { count: remaining.length })}
          onPress={() => setExpanded((open) => !open)}
          style={({ pressed }) => [styles.queueExpandButton, pressed && styles.queueExpandButtonPressed]}>
          <Text style={[styles.queueExpandLabel, { color: theme.primary }]}>
            {expanded ? t('today.queueCollapse') : t('today.queueRemaining', { count: remaining.length })}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── 全部完成态 ────────────────────────────────────────────────────────────

function DoneState({
  aiActionLog,
  deferred,
  onReprocessDeferred,
  hiddenOpportunityCount,
  creatorFocusMode,
}: {
  aiActionLog: AiActionLogEntry[];
  deferred: DecisionCard[];
  onReprocessDeferred: () => void;
  hiddenOpportunityCount: number;
  creatorFocusMode: 'quiet' | 'work';
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
        <Text style={[styles.doneSub, { color: theme.mutedForeground }]}>
          {creatorFocusMode === 'quiet' && hiddenOpportunityCount > 0
            ? t('today.doneSubHidden', { count: hiddenOpportunityCount })
            : t('today.doneSubDefault')}
        </Text>
      </View>

      {/* 推迟的事项 */}
      {deferred.length > 0 ? (
        <SettingsGroup title={t('today.deferredCardTitle', { count: deferred.length })}>
          {deferred.map((c) => {
            const previewLines = formatLocalizedDecisionQueuePreviewLines(c, t);
            const displayPriority = resolveDecisionCardPriority(c);
            return (
              <HubListRow
                key={c.id}
                iconElement={
                  displayPriority ? <InboxPriorityIconShell priority={displayPriority} icon="time-outline" /> : undefined
                }
                icon={displayPriority ? undefined : 'time-outline'}
                title={previewLines.title}
                subtitle={previewLines.subtitle}
                onPress={() => openDecisionCard(router, c)}
              />
            );
          })}
          <HubListRow icon="refresh-outline" title={t('today.processDeferredCta')} onPress={onReprocessDeferred} />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={t('today.aiLogTitle')}>
        {aiActionLog.slice(0, 5).map((entry) => {
          const riskSubtitle =
            entry.kind === 'risk_flagged' && entry.description ? (
              <View style={{ gap: spacing.xs }}>
                <Text style={[hubListStyles.subtitle, { color: theme.mutedForeground }]}>
                  {new Date(entry.occurredAtISO).toLocaleTimeString(timeTag, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <RiskBanner
                  flags={[
                    {
                      id: entry.id,
                      label: entry.description,
                      severity: 'warning',
                    },
                  ]}
                  compact
                />
              </View>
            ) : (
              new Date(entry.occurredAtISO).toLocaleTimeString(timeTag, {
                hour: '2-digit',
                minute: '2-digit',
              })
            );
          return (
            <HubListRow
              key={entry.id}
              icon="receipt-outline"
              title={entry.title}
              subtitle={riskSubtitle}
              onPress={() => {
                if (entry.sourceHref) pushFromToday(router, entry.sourceHref);
              }}
            />
          );
        })}
      </SettingsGroup>

      <HubLinkGroup
        title={t('hubLinks.related')}
        links={[
          { label: t('today.shortcuts.mail'), href: '/inbox', icon: 'mail-outline' },
          { label: t('today.shortcuts.deals'), href: '/deals', icon: 'briefcase-outline' },
          { label: t('today.shortcuts.account'), href: '/account', icon: 'person-circle-outline' },
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
  const creatorFocusMode = useSessionStore((s) => s.creatorFocusMode);
  const queryClient = useQueryClient();
  const queue = useDecisionQueue();
  const aiActionLog = useAiActionLog();
  const refreshToday = useCallback(async () => {
    await Promise.all([
      refetchDecisionQueueQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['home', 'action-log'] }),
    ]);
  }, [queryClient]);
  const { refreshing, onRefresh } = useTabRefresh(refreshToday);

  useFocusEffect(
    useCallback(() => {
      void refetchDecisionQueueQueries(queryClient);
    }, [queryClient]),
  );

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

  const displayPending = queue.pending;
  const displayCurrent = displayPending[0] ?? null;
  const displayDone = !queue.isPending && displayPending.length === 0;

  const highPriorityCount = displayPending.filter(
    (c) => c.category === 'payout' || !!c.urgencyNote
  ).length;

  const pendingSummary =
    !displayDone && displayPending.length > 0
      ? t('today.pendingSummary', { count: displayPending.length })
      : null;

  const screenTitle = displayDone
    ? t('today.greetingDone')
    : (pendingSummary ?? t('today.greetingActive', { name: profile?.displayName ?? t('auth.creatorFallback') }));

  const toolbar = (
    <>
      {!displayDone && highPriorityCount > 0 ? (
        <View style={styles.riskSummaryRow}>
          <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
          <Text style={[styles.riskSummaryText, { color: theme.mutedForeground }]}>
            {t('today.riskSummary', { count: highPriorityCount })}
          </Text>
        </View>
      ) : null}
      {!displayDone && queue.pendingEstimatedMinutes > 0 ? (
        <Text style={[styles.totalMinutesSummary, { color: theme.mutedForeground }]}>
          {t('today.totalEstimatedMinutes', { minutes: queue.pendingEstimatedMinutes })}
        </Text>
      ) : null}
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
      {!displayDone ? <UndoDecisionBanner entry={queue.lastEntry} onUndo={queue.undoLast} /> : null}
      {!displayDone && creatorFocusMode === 'quiet' && queue.hiddenOpportunityCount > 0 ? (
        <Text style={[styles.focusHiddenSummary, { color: theme.mutedForeground }]}>
          {t('today.focusHiddenSummary', { count: queue.hiddenOpportunityCount })}
        </Text>
      ) : null}
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
          onReprocessDeferred={handleReprocessDeferred}
          hiddenOpportunityCount={queue.hiddenOpportunityCount}
          creatorFocusMode={creatorFocusMode}
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
  swipeBgLeft: { right: 0, backgroundColor: '#F59E0B10', paddingHorizontal: spacing.md },
  swipeBgLabel: { fontSize: fontSize.caption, fontWeight: '700', flexShrink: 1 },

  // 决策卡
  cardSection: { gap: spacing.md },
  queuePreviewWrap: { gap: spacing.sm },
  queuePreviewSection: { gap: spacing.sm },
  queuePreviewTitle: {
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: spacing.xs,
  },
  queuePreviewList: { gap: spacing.sm },
  queueExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: layout.touchMin * 0.75,
    paddingVertical: spacing.xs,
  },
  queueExpandButtonPressed: { opacity: 0.72 },
  queueExpandLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...elevation.surface,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  brandBelowStatusColumn: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: spacing.xs,
    flexShrink: 0,
  },
  categoryIcon: { width: 26, height: 26, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  amountLabel: { fontSize: fontSize.caption, fontWeight: '700', fontVariant: ['tabular-nums'], marginLeft: 'auto' },
  totalMinutesSummary: { fontSize: fontSize.bodySmall, fontWeight: '600' },
  riskSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  riskSummaryText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  focusHiddenSummary: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  identityBlock: { gap: spacing.xs },
  cardTitle: { fontSize: fontSize.sectionTitle, fontWeight: '800', letterSpacing: -0.35, lineHeight: lineHeight.lead },
  cardStatusSubtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  noteBox: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  noteEyebrow: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  noteText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  nextStepBox: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  nextStepEyebrow: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  nextStepLabel: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  queueRowCopy: { flex: 1, gap: spacing.xs },
  queueRowTitle: { fontSize: fontSize.body, fontWeight: '700', lineHeight: lineHeight.body },
  queueRowSubtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
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
