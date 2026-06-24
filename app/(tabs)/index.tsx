import { useQueryClient } from '@tanstack/react-query';
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
import { LeadValueBandIconShell } from '@/components/inbox/LeadValueBandChrome';
import { InboxPriorityIconShell } from '@/components/inbox/InboxPriorityChrome';
import { RiskBanner } from '@/components/inbox/RiskBanner';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { useDecisionQueue } from '@/src/hooks/use-decisions';
import { useAiActionLog } from '@/src/hooks/use-ai-action-log';
import { useTabRefresh } from '@/src/hooks/use-tab-refresh';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { useSessionStore } from '@/src/stores/session-store';
import type { AiActionLogEntry, DecisionAction, DecisionCard, DecisionCategory } from '@/src/types/domain';
import {
  resolveDecisionCardBandAccent,
  resolveDecisionCardBorderAccent,
  resolveDecisionCardPriority,
} from '@/src/lib/decision-card-visuals';
import { contractWarningSeverity } from '@/src/lib/contract-warning';
import { parseDecisionSourceHint } from '@/src/lib/decision-card-content';
import {
  formatLocalizedDecisionQueuePreviewLines,
  getLocalizedDecisionPresentation,
  localizeDecisionHeadline,
} from '@/src/lib/decision-card-i18n';
import { leadValueBandBadgeTone } from '@/src/lib/lead-value-band-visuals';
import { inboxPriorityBadgeTone } from '@/src/lib/inbox-priority-visuals';

// ─── 常量 ──────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 90;
const SWIPE_OUT_X = 400;

import { runDecisionActionEffect } from '@/src/lib/decision-action-effects';
import {
  invalidateDealClosureArtifacts,
  invalidateDealWorkspaceQueries,
} from '@/src/lib/invalidate-deal-queries';
import { getActiveTenantPublicId, tenantQueryKey } from '@/src/lib/tenant-query';

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
  const categoryLabels = useDecisionCategoryLabels();
  const { leadValueBandLabel, inboxPriorityLabel } = useDomainLabels();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const cfg = categoryLabels[card.category];
  const bandAccent = resolveDecisionCardBandAccent(card, theme);
  const displayPriority = resolveDecisionCardPriority(card);
  const { display } = getLocalizedDecisionPresentation(card, t);

  return (
    <View style={styles.categoryRow}>
      {bandAccent && displayPriority ? (
        <InboxPriorityIconShell priority={displayPriority} icon={cfg.icon} />
      ) : bandAccent && card.leadValueBand ? (
        <LeadValueBandIconShell band={card.leadValueBand} icon={cfg.icon} />
      ) : (
        <View style={[styles.categoryIcon, { backgroundColor: cfg.color + '18' }]}>
          <Ionicons name={cfg.icon} size={15} color={cfg.color} />
        </View>
      )}
      <Badge tone="neutral" label={cfg.label} />
      {displayPriority ? (
        <Badge tone={inboxPriorityBadgeTone(displayPriority)} label={inboxPriorityLabel[displayPriority]} />
      ) : card.leadValueBand && card.leadValueBand !== 'archived' ? (
        <Badge tone={leadValueBandBadgeTone(card.leadValueBand)} label={leadValueBandLabel[card.leadValueBand]} />
      ) : null}
      {display.urgencyLabel ? <Badge tone="warning" label={display.urgencyLabel} /> : null}
      {card.amountLabel ? (
        <Text style={[styles.amountLabel, { color: bandAccent?.iconColor ?? cfg.color }]}>{card.amountLabel}</Text>
      ) : null}
    </View>
  );
}

function DecisionCardIdentityBlock({ card }: { card: DecisionCard }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { display } = getLocalizedDecisionPresentation(card, t);

  return (
    <View style={styles.identityBlock}>
      <Text style={[styles.brandName, { color: theme.foreground }]}>{display.brand}</Text>
      {display.subject ? (
        <Text style={[styles.subjectLine, { color: theme.foregroundSubtitle }]} numberOfLines={2}>
          {display.subject}
        </Text>
      ) : null}
      {display.actionSummary ? (
        <Text style={[styles.actionSummary, { color: theme.mutedForeground }]} numberOfLines={1}>
          {display.actionSummary}
        </Text>
      ) : null}
    </View>
  );
}

function DecisionCardNextStepRow({ card }: { card: DecisionCard }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const primaryAction = getLocalizedDecisionPresentation(card, t).display.primaryAction;

  if (!primaryAction) return null;

  return (
    <View style={[styles.nextStepRow, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Ionicons name="arrow-forward-circle-outline" size={15} color={theme.primary} />
      <View style={styles.nextStepCopy}>
        <Text style={[styles.nextStepEyebrow, { color: theme.foregroundEyebrow }]}>{t('today.card.nextStep')}</Text>
        <Text style={[styles.nextStepLabel, { color: theme.foreground }]} numberOfLines={2}>
          {primaryAction.label}
        </Text>
      </View>
    </View>
  );
}

function DecisionCardWhyNowBlock({ card }: { card: DecisionCard }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const aiNote = getLocalizedDecisionPresentation(card, t).aiNote;

  if (!aiNote?.trim()) return null;

  return (
    <View style={styles.whyBlock}>
      <Text style={[styles.whyEyebrow, { color: theme.foregroundEyebrow }]}>{t('today.card.whyNow')}</Text>
      <Text style={[styles.whyText, { color: theme.mutedForeground }]} numberOfLines={3}>
        {aiNote}
      </Text>
    </View>
  );
}

function DecisionCardSourceRow({ card }: { card: DecisionCard }) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const sourceHint = getLocalizedDecisionPresentation(card, t).sourceHint;
  const { prefix, detail } = parseDecisionSourceHint(sourceHint);
  const sourceLabel = [prefix, detail].filter(Boolean).join(' · ');

  if (!sourceLabel) return null;

  return (
    <Pressable
      accessibilityRole={card.sourceHref ? 'link' : undefined}
      disabled={!card.sourceHref}
      onPress={() => card.sourceHref && router.push(card.sourceHref as Href)}
      style={styles.sourceRow}>
      <Text style={[styles.sourceEyebrow, { color: theme.foregroundEyebrow }]}>{t('today.card.source')}</Text>
      <View style={styles.sourceLinkRow}>
        <Text style={[styles.sourceText, { color: theme.mutedForeground }]} numberOfLines={1}>
          {sourceLabel}
        </Text>
        {card.sourceHref ? <Ionicons name="chevron-forward" size={12} color={theme.foregroundEyebrow} /> : null}
      </View>
    </Pressable>
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
          if (action.href) router.push(action.href as Href);
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
    if (action.href) router.push(action.href as Href);
  }

  function handlePrimaryAction() {
    const primary = card.actions[0];
    flyOut('right', () => runPrimaryAction(primary));
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
      flyOut('right', () => runPrimaryAction({ ...action, href }));
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
            borderLeftColor: borderAccentColor,
          },
          { transform: [{ translateX }, { rotate }, { translateY: entryY }], opacity: entryOpacity },
        ]}>

        {/* 类型标签行 */}
        <DecisionCardMetaRow card={card} />

        <DecisionCardIdentityBlock card={card} />
        {card.contractRiskFlags && contractWarningSeverity(card.contractRiskFlags) ? (
          <RiskBanner flags={card.contractRiskFlags} compact />
        ) : null}
        <DecisionCardNextStepRow card={card} />
        <DecisionCardWhyNowBlock card={card} />
        <DecisionCardSourceRow card={card} />

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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const categoryLabels = useDecisionCategoryLabels();
  const { leadValueBandLabel } = useDomainLabels();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const preview = items.slice(1, 3);
  const remaining = items.slice(3);
  const visibleItems = expanded ? items.slice(1) : preview;

  if (visibleItems.length === 0 && remaining.length === 0) return null;

  return (
    <View style={styles.queuePreviewWrap}>
      {visibleItems.length > 0 ? (
        <SettingsGroup title={t('today.queueNextTitle')}>
          {visibleItems.map((item) => {
            const cfg = categoryLabels[item.category];
            const bandAccent = resolveDecisionCardBandAccent(item, theme);
            const previewLines = formatLocalizedDecisionQueuePreviewLines(item, t);
            const detail =
              item.leadValueBand && item.leadValueBand !== 'archived'
                ? leadValueBandLabel[item.leadValueBand]
                : cfg.label;
            const queueRiskFlags = item.contractRiskFlags ?? [];
            const subtitleContent =
              queueRiskFlags.length > 0 ? (
                <View style={{ gap: spacing.xs }}>
                  <Text style={[hubListStyles.subtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
                    {previewLines.subtitle}
                  </Text>
                  <RiskBanner flags={queueRiskFlags} compact />
                </View>
              ) : (
                previewLines.subtitle
              );
            return (
              <HubListRow
                key={item.id}
                iconElement={
                  bandAccent ? (
                    <LeadValueBandIconShell band={item.leadValueBand} icon={cfg.icon} />
                  ) : undefined
                }
                icon={bandAccent ? undefined : cfg.icon}
                title={previewLines.title}
                subtitle={subtitleContent}
                detail={detail}
                detailAccent={bandAccent?.detailAccent}
                onPress={() => {
                  if (item.sourceHref) router.push(item.sourceHref as Href);
                }}
              />
            );
          })}
        </SettingsGroup>
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
}: {
  aiActionLog: AiActionLogEntry[];
  deferred: DecisionCard[];
  onReprocessDeferred: () => void;
}) {
  const { t, i18n } = useTranslation();
  const timeTag = calendarLocaleTagForLanguage(i18n.language);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const categoryLabels = useDecisionCategoryLabels();
  const { leadValueBandLabel } = useDomainLabels();

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
      </View>

      {/* 推迟的事项 */}
      {deferred.length > 0 ? (
        <SettingsGroup title={t('today.deferredCardTitle', { count: deferred.length })}>
          {deferred.map((c) => {
            const cfg = categoryLabels[c.category];
            const bandAccent = resolveDecisionCardBandAccent(c, theme);
            const previewLines = formatLocalizedDecisionQueuePreviewLines(c, t);
            const { display } = getLocalizedDecisionPresentation(c, t);
            const detail =
              c.leadValueBand && c.leadValueBand !== 'archived'
                ? leadValueBandLabel[c.leadValueBand]
                : display.urgencyLabel ?? cfg.label;
            return (
              <HubListRow
                key={c.id}
                iconElement={
                  bandAccent ? <LeadValueBandIconShell band={c.leadValueBand} icon={cfg.icon} /> : undefined
                }
                icon={bandAccent ? undefined : 'time-outline'}
                title={previewLines.title}
                subtitle={previewLines.subtitle}
                detail={detail}
                detailAccent={bandAccent?.detailAccent}
                onPress={() => {
                  if (c.sourceHref) router.push(c.sourceHref as Href);
                }}
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
                if (entry.sourceHref) router.push(entry.sourceHref as Href);
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

  const displayPending = queue.pending;
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
          onReprocessDeferred={handleReprocessDeferred}
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
  queuePreviewWrap: { gap: spacing.sm },
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
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  categoryIcon: { width: 26, height: 26, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  amountLabel: { fontSize: fontSize.caption, fontWeight: '700', fontVariant: ['tabular-nums'], marginLeft: 'auto' },
  identityBlock: { gap: spacing.xs },
  brandName: { fontSize: fontSize.sectionTitle, fontWeight: '800', letterSpacing: -0.35, lineHeight: lineHeight.lead },
  subjectLine: { fontSize: fontSize.body, fontWeight: '600', lineHeight: lineHeight.body },
  actionSummary: { fontSize: fontSize.bodySmall, fontWeight: '600' },
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nextStepCopy: { flex: 1, gap: 2 },
  nextStepEyebrow: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  nextStepLabel: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  whyBlock: { gap: spacing.xs },
  whyEyebrow: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  whyText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  sourceRow: { gap: spacing.xs },
  sourceEyebrow: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  sourceLinkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sourceText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
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
