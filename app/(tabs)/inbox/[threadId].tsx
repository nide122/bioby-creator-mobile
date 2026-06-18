import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import type { InboxMessage, DraftKind } from '@/src/types/domain';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Badge,
  HubLinkGroup,
  HubMetric,
  HubMetrics,
  HubScreen,
  OpportunityPath,
  QueryRetryCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { InboxEmailCategory } from '@/src/types/domain';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  archiveOpportunity,
  acknowledgeOpportunityBriefRisks,
  confirmOpportunityBrief,
  restoreOpportunityClassification,
  updateOpportunityClassification,
} from '@/src/api/opportunities-api';
import { createDraftForOpportunity } from '@/src/api/drafts-api';
import { ApiError } from '@/src/api/api-client';
import { restoreSession } from '@/src/api/auth-api';
import { hasStoredSession } from '@/src/auth/token-storage';
import { alertAction } from '@/src/lib/app-dialog';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';
import { useAgentTrainingRules } from '@/src/hooks/use-agent-training';
import { useAgentTrainingStore } from '@/src/stores/agent-training-store';
import { getActiveTenantPublicId, invalidateTenantScopedQueries, tenantQueryKey, useTenantQueryKey } from '@/src/lib/tenant-query';
import { useSessionStore } from '@/src/stores/session-store';
import {
  commercialAttentionFallback,
  isUnclearBudgetLabel,
  mergeDetailSignals,
  buildAttentionList,
  filterSignalsApartFromAttention,
  localizedVisibleRiskLabel,
  resolveAttentionCount,
  translateActionReason,
  translateDetailSignal,
  translateMissingField,
  translateRiskLabelText,
  visibleMissingFields,
  visibleRiskFlags,
} from '@/src/lib/inbox-detail-labels';
import { inboxRiskReasons } from '@/src/lib/inbox-risk-badges';
import { formatExceptionalBudgetLabel } from '@/src/lib/exceptional-budget-label';
import { leadValueBandBadgeTone } from '@/src/lib/lead-value-band-visuals';
import { resolvePriorityLeadValueBand } from '@/src/lib/priority-lead-value-band';
import { stripQuotedPlainText } from '@/src/lib/email-body';
import {
  briefConfirmBlocker,
  canProceedToConfirmBrief,
  isBriefConfirmed,
  unacknowledgedDangerFlags,
} from '@/src/lib/brief-confirm-eligibility';
import { resolveOpportunityPathStep } from '@/src/lib/opportunity-path-step';
import { formatThreadToggleLabel } from '@/src/lib/inbox-message-stats';
import type { InboxMessageStats } from '@/src/types/domain';
import { preferCooperationTitle } from '@/src/lib/cooperation-display-name';
import {
  rulesProcessingScope,
  rulesScopeI18nKey,
} from '@/src/lib/ai-processing-labels';

// ─── 可折叠原文区 ──────────────────────────────────────────────────────────

function isOutboundMessage(message: InboxMessage): boolean {
  return message.direction === 'outbound';
}

function messageFromLabel(message: InboxMessage, t: (key: string) => string): string {
  if (isOutboundMessage(message)) {
    return t('inboxThreadDetail.youLabel');
  }
  return message.fromLabel;
}

function CollapsibleThread({
  messages,
  messageStats,
  initiallyOpen = false,
  dateLocale,
  onOpenMessage,
}: {
  messages: InboxMessage[];
  messageStats?: InboxMessageStats;
  initiallyOpen?: boolean;
  dateLocale: string;
  onOpenMessage: (message: InboxMessage) => void;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [open, setOpen] = useState(initiallyOpen);
  const heightAnim = useRef(new Animated.Value(0)).current;

  function toggle() {
    Animated.timing(heightAnim, {
      toValue: open ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
    setOpen((v) => !v);
  }

  return (
    <View style={[styles.threadBox, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Pressable accessibilityRole="button" onPress={toggle} style={styles.threadToggleRow}>
        <Ionicons name="mail-outline" size={14} color={theme.foregroundEyebrow} />
        <Text style={[styles.threadToggleLabel, { color: theme.foregroundEyebrow }]}>
          {formatThreadToggleLabel(messageStats, messages.length, t)}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={theme.mutedForeground}
        />
      </Pressable>

      {open && (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {messages.map((m) => {
            const outbound = isOutboundMessage(m);
            const unread = !outbound && m.read === false;
            const snippet = stripQuotedPlainText(m.snippet) || m.snippet;
            return (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              onPress={() => onOpenMessage(m)}
              style={({ pressed }) => [
                styles.msgRow,
                outbound ? styles.msgRowOutbound : styles.msgRowInbound,
                {
                  borderColor: outbound ? theme.accentMintStrong + '55' : theme.border,
                  backgroundColor: outbound ? theme.accentMintSoft + 'CC' : theme.card,
                },
                pressed && { opacity: 0.88 },
              ]}>
              <View style={styles.msgRowTop}>
                <View style={styles.msgMetaGroup}>
                  <Ionicons
                    name={outbound ? 'arrow-up-circle-outline' : 'mail-outline'}
                    size={14}
                    color={outbound ? theme.accentMintStrong : theme.foregroundEyebrow}
                  />
                  <Text style={[styles.msgMeta, { color: theme.foregroundEyebrow, flex: 1 }]}>
                    {messageFromLabel(m, t)} ·{' '}
                    {new Date(m.sentAtISO).toLocaleString(dateLocale, {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {unread ? (
                    <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} accessibilityLabel={t('inboxThreadDetail.unreadA11y')} />
                  ) : null}
                </View>
                {outbound ? (
                  <View style={[styles.replyBadge, { borderColor: theme.accentMintStrong + '66', backgroundColor: theme.accentMintSoft }]}>
                    <Text style={[styles.replyBadgeText, { color: theme.accentMintStrong }]}>
                      {t('inboxThreadDetail.yourReplyBadge')}
                    </Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={14} color={theme.mutedForeground} />
              </View>
              <Text style={[styles.msgSnippet, { color: theme.foreground }]} numberOfLines={3}>
                {snippet}
              </Text>
            </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function AttentionItemRow({ text }: { text: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={styles.aiActionRow}>
      <View style={[styles.aiActionDot, { backgroundColor: theme.primary }]} />
      <Text style={[styles.aiActionText, { color: theme.foregroundSubtitle }]}>{text}</Text>
    </View>
  );
}

// ─── AI 纠偏行（内联，无 Alert） ───────────────────────────────────────────

function CorrectionRow({
  label,
  hint,
  onCorrect,
}: {
  label: string;
  hint: string;
  onCorrect: () => void;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [corrected, setCorrected] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={corrected}
      onPress={() => { onCorrect(); setCorrected(true); }}
      style={[
        styles.correctionRow,
        { borderColor: corrected ? '#34D39940' : theme.border, backgroundColor: corrected ? '#34D39910' : theme.card },
      ]}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={[styles.correctionLabel, { color: corrected ? '#34D399' : theme.foreground }]}>
          {corrected ? t('inboxThreadDetail.correctionApplied', { label }) : label}
        </Text>
        {!corrected && (
          <Text style={[styles.correctionHint, { color: theme.mutedForeground }]}>{hint}</Text>
        )}
      </View>
      {!corrected && (
        <Ionicons name="chevron-forward" size={14} color={theme.mutedForeground} />
      )}
    </Pressable>
  );
}

function CategoryCorrectionPanel({
  currentCategory,
  correctedByUser,
  categoryLabels,
  onSelectCategory,
  onRestore,
}: {
  currentCategory: InboxEmailCategory;
  correctedByUser: boolean;
  categoryLabels: Record<InboxEmailCategory, string>;
  onSelectCategory: (category: InboxEmailCategory) => void;
  onRestore: () => void;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const categories: InboxEmailCategory[] = ['commercial', 'pr_sample', 'media', 'personal', 'spam', 'other'];

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>
        {correctedByUser ? t('inboxThreadDetail.adjustCategory') : t('inboxThreadDetail.categoryWrong')}
      </Text>
      <View style={styles.categoryGrid}>
        {categories.map((category) => {
          const active = currentCategory === category;
          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={active}
              onPress={() => onSelectCategory(category)}
              style={[
                styles.categoryCorrectionChip,
                {
                  borderColor: active ? theme.primary + '80' : theme.border,
                  backgroundColor: active ? theme.primary + '12' : theme.card,
                  opacity: active ? 1 : 0.88,
                },
              ]}>
              <Text style={[styles.categoryCorrectionLabel, { color: active ? theme.primary : theme.mutedForeground }]}>
                {categoryLabels[category]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {correctedByUser && (
        <CorrectionRow
          label={t('inboxThreadDetail.restoreAiLabel')}
          hint={t('inboxThreadDetail.restoreAiHint')}
          onCorrect={onRestore}
        />
      )}
    </View>
  );
}

function TrainingRulePrompt({
  category,
  brandName,
}: {
  category: InboxEmailCategory;
  brandName: string;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { rules, createRule } = useAgentTrainingRules();
  const addRuleLocal = useAgentTrainingStore((s) => s.addRule);
  const title = t(`inboxThreadDetail.trainingTitle.${category}`);
  const description = t(`inboxThreadDetail.trainingDesc.${category}`, { brand: brandName });
  const saved = rules.some((rule) => rule.category === category);

  const rememberRule = () => {
    const payload = { title, description, category };
    if (shouldUseBackendApi()) {
      void createRule(payload).catch(() => addRuleLocal(payload));
      return;
    }
    addRuleLocal(payload);
  };

  return (
    <View style={[styles.trainingPrompt, { borderColor: saved ? '#34D39940' : theme.border, backgroundColor: saved ? '#34D39910' : theme.card }]}>
      <View style={styles.trainingHeader}>
        <Ionicons name={saved ? 'checkmark-circle-outline' : 'school-outline'} size={15} color={saved ? '#34D399' : theme.primary} />
        <Text style={[styles.trainingTitle, { color: saved ? '#34D399' : theme.foreground }]}>
          {saved ? t('inboxThreadDetail.trainingSaved') : t('inboxThreadDetail.trainingPrompt')}
        </Text>
      </View>
      <Text style={[styles.trainingDesc, { color: theme.mutedForeground }]}>{description}</Text>
      {!saved ? (
        <Pressable
          accessibilityRole="button"
          onPress={rememberRule}
          style={[styles.trainingButton, { borderColor: theme.primary + '60' }]}>
          <Text style={[styles.trainingButtonLabel, { color: theme.primary }]}>{t('inboxThreadDetail.trainingRemember')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── 主屏 ──────────────────────────────────────────────────────────────────

export default function InboxThreadDetailScreen() {
  const { t, i18n } = useTranslation();
  const { inboxCategoryLabel, inboxLeadStageLabel, leadValueBandLabel } = useDomainLabels();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const apiMode = shouldUseBackendApi();
  const detailQueryKey = useTenantQueryKey('inbox', 'thread', threadId, { api: apiMode });

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const dateLocale = calendarLocaleTagForLanguage(i18n.language);
  const setCategory = useInboxCorrectionStore((s) => s.setCategory);
  const clearCorrection = useInboxCorrectionStore((s) => s.clearCorrection);
  const applyAuthSession = useSessionStore((s) => s.applyAuthSession);
  const clearLocalSession = useSessionStore((s) => s.clearLocalSession);
  const correctedByUserLocal = useInboxCorrectionStore((s) =>
    threadId ? !!s.classificationByThreadId[threadId] : false
  );
  const [draftActionLoading, setDraftActionLoading] = useState<DraftKind | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [localAckedRiskIds, setLocalAckedRiskIds] = useState<string[]>([]);
  const [lastCorrectedCategory, setLastCorrectedCategory] = useState<InboxEmailCategory | null>(null);

  const query = useInboxThreadDetail(threadId);

  // Refetch once when this screen gains focus (e.g. back from draft). Do NOT put queryKey
  // objects in deps — useTenantQueryKey() returns a new array every render and causes a loop.
  useFocusEffect(
    useCallback(() => {
      if (!threadId || !apiMode) return;
      void queryClient.refetchQueries({
        queryKey: tenantQueryKey(getActiveTenantPublicId(), 'inbox', 'thread', threadId),
      });
    }, [apiMode, queryClient, threadId])
  );

  if (!threadId) {
    return (
      <PlaceholderScreen
        title={t('inboxThreadDetail.missingTitle')}
        description={t('inboxThreadDetail.missingDesc')}
      />
    );
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('inboxThreadDetail.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    return (
      <PlaceholderScreen title={t('inboxThreadDetail.errorTitle')} description={t('inboxThreadDetail.errorDesc')}>
        <QueryRetryCard
          message={query.error?.message ?? t('inboxThreadDetail.noData')}
          onRetry={() => queryClient.invalidateQueries({ queryKey: detailQueryKey })}
        />
      </PlaceholderScreen>
    );
  }

  const detail = query.data;
  const correctedByUser = correctedByUserLocal || !!detail.userCorrected;
  const isCommercial = detail.category === 'commercial';
  const decisionTitle = isCommercial
    ? detail.budgetLabel
      ? t('inboxThreadDetail.decisionTitleWithBudget')
      : t('inboxThreadDetail.decisionTitleNoBudget')
    : detail.subject;
  const canOpenExistingDraft = (draftId: string) =>
    !!draftId && (!apiMode || /^\d+$/.test(draftId));
  const openOrCreateDraft = async (kind: DraftKind, suggestedDraftId?: string) => {
    if (draftActionLoading) return;
    if (suggestedDraftId && canOpenExistingDraft(suggestedDraftId)) {
      router.push(`/drafts/${suggestedDraftId}?threadId=${encodeURIComponent(threadId)}` as Href);
      return;
    }
    if (!apiMode) return;
    setDraftActionLoading(kind);
    try {
      if (!(await hasStoredSession())) {
        clearLocalSession();
        queryClient.clear();
        router.replace('/welcome' as Href);
        return;
      }
      const restored = await restoreSession();
      if (restored) {
        applyAuthSession(restored);
      } else if (!(await hasStoredSession())) {
        clearLocalSession();
        queryClient.clear();
        router.replace('/welcome' as Href);
        return;
      }
      const draft = await createDraftForOpportunity(detail.id, kind);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['drafts'] }),
        queryClient.invalidateQueries({ queryKey: ['decisions'] }),
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
      ]);
      router.push(`/drafts/${draft.id}?threadId=${encodeURIComponent(threadId)}` as Href);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession();
        queryClient.clear();
        router.replace('/welcome' as Href);
        return;
      }
      const message = error instanceof Error ? error.message : t('inboxThreadDetail.draftCreateErrorBody');
      void alertAction(t('inboxThreadDetail.draftCreateErrorTitle'), message);
    } finally {
      setDraftActionLoading(null);
    }
  };
  const openMessage = (message: InboxMessage) => {
    router.push(
      `/inbox/message/${encodeURIComponent(message.id)}?threadId=${encodeURIComponent(threadId)}` as Href
    );
  };
  const detailSignals = mergeDetailSignals(detail.signals, detail.classificationSignals).map((signal) =>
    translateDetailSignal(t, signal)
  );
  const missingFields = visibleMissingFields(detail.missingFields, detail.budgetLabel);
  const riskFlags = visibleRiskFlags(detail.riskFlags, detail.budgetLabel);
  const effectiveRiskFlags = riskFlags.map((flag) =>
    localAckedRiskIds.includes(flag.id) ? { ...flag, acknowledged: true } : flag
  );
  const detailForConfirm = { ...detail, riskFlags: effectiveRiskFlags };
  const displayRiskLabel = localizedVisibleRiskLabel(t, detail.riskLabel, detail.budgetLabel);
  const priorityBand = resolvePriorityLeadValueBand(detail);
  const highValueRiskReasons =
    priorityBand === 'high_value' ? inboxRiskReasons(detail.actionReasons) : [];
  const showAttentionFallback = commercialAttentionFallback(
    isCommercial,
    detail.extractionStatus === 'COMPLETE',
    effectiveRiskFlags,
    detail.recommendedActions,
    detail.attentionCount
  );
  const attentionList = buildAttentionList(
    detail.recommendedActions,
    effectiveRiskFlags,
    t,
    showAttentionFallback ? t('inboxThreadDetail.attentionFallback') : null
  );
  const classificationSignals = filterSignalsApartFromAttention(detailSignals, attentionList);
  const attentionCount = resolveAttentionCount(
    detail.attentionCount,
    effectiveRiskFlags,
    detail.recommendedActions,
    showAttentionFallback
  );
  const suppressSignalRiskBadges = isCommercial && attentionCount > 0;
  const packages = detail.packages ?? [];
  const aiBriefText = detail.preview?.trim() || detail.classificationSummary?.trim();
  const briefExtracting = detail.extractionStatus === 'PENDING';
  const showExtractingBanner = briefExtracting && !aiBriefText;
  const briefConfidencePercent =
    detail.extractionConfidence != null ? Math.round(detail.extractionConfidence * 100) : null;
  const showBriefSource = isCommercial && detail.extractionStatus !== 'SKIPPED';
  const showProcessingSource =
    !!detail.classificationSource || (showBriefSource && (briefExtracting || !!detail.briefExtractionSource));
  const rulesScope = rulesProcessingScope(detail);

  const sourceBadgeStyle = (source: 'llm' | 'rules' | 'snapshot') => {
    if (source === 'llm') {
      return { borderColor: theme.primary + '50', backgroundColor: theme.primary + '10' };
    }
    if (source === 'rules') {
      return { borderColor: '#F59E0B55', backgroundColor: '#F59E0B14' };
    }
    return { borderColor: theme.border, backgroundColor: theme.secondary };
  };

  const sourceTextColor = (source: 'llm' | 'rules' | 'snapshot') => {
    if (source === 'llm') return theme.primary;
    if (source === 'rules') return '#B45309';
    return theme.foregroundSubtitle;
  };

  const confirmedDeal = isBriefConfirmed(detail);
  const readyToConfirm = apiMode && isCommercial && canProceedToConfirmBrief(detailForConfirm);
  const confirmBlockerRaw = apiMode && isCommercial ? briefConfirmBlocker(detailForConfirm) : null;
  const confirmBlocker = confirmBlockerRaw === 'danger_risks' ? null : confirmBlockerRaw;
  const pendingDangerFlags = unacknowledgedDangerFlags(effectiveRiskFlags);
  const opportunityPathStep = resolveOpportunityPathStep(detail);

  const refreshThreadAndDeals = async () => {
    const tenantId = getActiveTenantPublicId();
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'inbox', 'thread', detail.id),
      }),
      queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'deals') }),
      queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'decisions') }),
      queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'home', 'inbox-summary') }),
    ]);
  };

  const onOpenDeal = (dealId: string) => {
    router.push({ pathname: '/deal/[dealId]', params: { dealId } } as Href);
  };

  const onConfirmBrief = async () => {
    if (!apiMode || confirmLoading || !readyToConfirm) return;

    setConfirmLoading(true);
    try {
      if (pendingDangerFlags.length > 0) {
        await acknowledgeOpportunityBriefRisks(
          detail.id,
          pendingDangerFlags.map((flag) => flag.id)
        );
        setLocalAckedRiskIds((prev) => [
          ...prev,
          ...pendingDangerFlags.map((flag) => flag.id).filter((id) => !prev.includes(id)),
        ]);
      }
      const result = await confirmOpportunityBrief(detail.id);
      await refreshThreadAndDeals();
      if (result.dealId) {
        onOpenDeal(result.dealId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('inboxThreadDetail.confirmBriefErrorBody');
      void alertAction(t('inboxThreadDetail.confirmBriefErrorTitle'), message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const leadParts = [
    preferCooperationTitle({ brand: detail.brandName, title: detail.subject }),
    inboxCategoryLabel[detail.category],
    detail.leadValueBand ? leadValueBandLabel[priorityBand ?? detail.leadValueBand] : null,
    inboxLeadStageLabel[detail.leadStage],
    correctedByUser ? t('inboxThreadDetail.userCorrectedBadge') : null,
  ].filter(Boolean);

  const toolbar = (
    <>
      {isCommercial ? (
        <HubMetrics>
          <HubMetric
            value={detail.budgetLabel ?? '—'}
            label={t('inboxThreadDetail.metricBudget')}
            accent={!!detail.budgetLabel}
          />
          <HubMetric value={inboxLeadStageLabel[detail.leadStage]} label={t('inboxThreadDetail.metricStage')} />
          <HubMetric
            value={String(attentionCount)}
            label={t('inboxThreadDetail.metricRisks')}
            accent={attentionCount > 0}
          />
        </HubMetrics>
      ) : null}
      {isCommercial ? <OpportunityPath currentStep={opportunityPathStep} /> : null}
    </>
  );

  const showDraftActions = isCommercial && opportunityPathStep !== 'completed' && !confirmedDeal;
  const exceptionalBudgetLabel = formatExceptionalBudgetLabel(detail.budgetFloorRatio, t);

  const stickyFooter = (
    <View style={[styles.stickyFooter, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <View style={[styles.footerNote, { backgroundColor: theme.secondary }]}>
        <Ionicons name="lock-closed-outline" size={11} color={theme.foregroundEyebrow} />
        <Text style={[styles.footerNoteText, { color: theme.foregroundEyebrow }]}>
          {isCommercial ? t('inboxThreadDetail.footerCommercial') : t('inboxThreadDetail.footerNonCommercial')}
        </Text>
      </View>
      {isCommercial ? (
        <View style={{ gap: spacing.sm }}>
          {confirmedDeal && detail.dealId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenDeal(detail.dealId!)}
              android_ripple={{ color: `${theme.primary}33` }}
              style={({ pressed }) => [
                styles.btnPrimary,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.92 },
              ]}>
              <Ionicons name="briefcase-outline" size={16} color={theme.primaryForeground} />
              <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>
                {t('inboxThreadDetail.ctaOpenDeal')}
              </Text>
            </Pressable>
          ) : readyToConfirm ? (
            <Pressable
              accessibilityRole="button"
              disabled={confirmLoading}
              onPress={() => void onConfirmBrief()}
              android_ripple={{ color: `${theme.primary}33` }}
              style={({ pressed }) => [
                styles.btnPrimary,
                { backgroundColor: theme.primary },
                confirmLoading && styles.btnDisabled,
                pressed && { opacity: 0.92 },
              ]}>
              {confirmLoading ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Ionicons name="shield-checkmark-outline" size={16} color={theme.primaryForeground} />
              )}
              <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>
                {t('inboxThreadDetail.ctaConfirmBrief')}
              </Text>
            </Pressable>
          ) : confirmBlocker && confirmBlocker !== 'already_confirmed' ? (
            <View style={{ gap: spacing.sm }}>
              <View style={[styles.confirmBlocker, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                <Ionicons name="information-circle-outline" size={14} color={theme.foregroundEyebrow} />
                <Text style={[styles.confirmBlockerText, { color: theme.foregroundSubtitle }]}>
                  {t(`inboxThreadDetail.confirmBlocker.${confirmBlocker}`)}
                </Text>
              </View>
              {confirmBlocker === 'lead_stage_draft_ready' &&
              canOpenExistingDraft(detail.suggestedDraftIds.quote) ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void openOrCreateDraft('quote', detail.suggestedDraftIds.quote)}
                  style={({ pressed }) => [
                    styles.btnSecondary,
                    { borderColor: theme.primary + '60' },
                    pressed && { opacity: 0.88 },
                  ]}>
                  <Ionicons name="pricetag-outline" size={16} color={theme.primary} />
                  <Text style={[styles.btnSecondaryLabel, { color: theme.primary }]}>
                    {t('inboxThreadDetail.openQuoteDraftCta')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {showDraftActions ? (
            <View style={styles.footerButtons}>
              <Pressable
                accessibilityRole="button"
                disabled={!!draftActionLoading || confirmLoading}
                onPress={() => void openOrCreateDraft('ai_reply', detail.suggestedDraftIds.aiReply)}
                android_ripple={{ color: `${theme.primary}33` }}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: theme.primary },
                  (!!draftActionLoading || confirmLoading) && styles.btnDisabled,
                  pressed && { opacity: 0.92 },
                ]}>
                {draftActionLoading === 'ai_reply' ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.primaryForeground} />
                )}
                <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>
                  {t('inboxThreadDetail.ctaReplyDraft')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!!draftActionLoading || confirmLoading}
                onPress={() => void openOrCreateDraft('quote', detail.suggestedDraftIds.quote)}
                android_ripple={{ color: `${theme.primary}18` }}
                style={({ pressed }) => [
                  styles.btnSecondary,
                  { borderColor: theme.border },
                  (!!draftActionLoading || confirmLoading) && styles.btnDisabled,
                  pressed && { opacity: 0.88 },
                ]}>
                {draftActionLoading === 'quote' ? (
                  <ActivityIndicator color={theme.foreground} />
                ) : (
                  <Ionicons name="pricetag-outline" size={16} color={theme.foreground} />
                )}
                <Text style={[styles.btnSecondaryLabel, { color: theme.foreground }]}>
                  {t('inboxThreadDetail.ctaQuoteDraft')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.footerButtons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (apiMode) {
                void archiveOpportunity(detail.id).then(async () => {
                  await Promise.all([
                    invalidateTenantScopedQueries(queryClient),
                    queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
                    queryClient.invalidateQueries({ queryKey: ['decisions'] }),
                  ]);
                  router.back();
                });
                return;
              }
              router.back();
            }}
            android_ripple={{ color: `${theme.primary}33` }}
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.92 },
            ]}>
            <Ionicons name="archive-outline" size={16} color={theme.primaryForeground} />
            <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>
              {apiMode ? t('inboxThreadDetail.ctaArchive') : t('inboxThreadDetail.backToInbox')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <HubScreen
      testID="screen-inbox-thread-detail"
      eyebrow={t('tabs.inbox')}
      title={decisionTitle}
      lead={leadParts.join(' · ')}
      toolbar={toolbar}
      fixedFooter={stickyFooter}
      scrollBottomInset={140}>
      {isCommercial ? (
        <Text style={[styles.originalSubject, { color: theme.mutedForeground }]}>
          {t('inboxThreadDetail.originalSubjectPrefix')} {detail.subject}
        </Text>
      ) : null}

      {rulesScope ? (
        <View style={[styles.rulesCallout, { borderColor: '#F59E0B55', backgroundColor: '#F59E0B12' }]}>
          <Ionicons name="information-circle-outline" size={16} color="#B45309" />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[styles.rulesCalloutTitle, { color: theme.foreground }]}>
              {t('inboxThreadDetail.aiRulesCalloutTitle')}
            </Text>
            <Text style={[styles.rulesCalloutBody, { color: theme.foregroundSubtitle }]}>
              {t(rulesScopeI18nKey(rulesScope, 'inboxThreadDetail.aiRulesCalloutBody'))}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.aiCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.aiCardHeader}>
            <View style={[styles.aiIconBox, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="sparkles" size={14} color={theme.primary} />
            </View>
            <Text style={[styles.aiCardEyebrow, { color: theme.primary }]}>{t('inboxThreadDetail.aiBriefEyebrow')}</Text>
            {briefConfidencePercent != null && detail.extractionStatus === 'COMPLETE' ? (
              <View style={[styles.budgetBadge, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                <Text style={[styles.budgetLabel, { color: theme.foregroundSubtitle }]}>
                  {t('inboxThreadDetail.briefConfidence', { percent: briefConfidencePercent })}
                </Text>
              </View>
            ) : null}
            {detail.budgetLabel && !briefExtracting ? (
              <View style={[styles.budgetBadge, { borderColor: theme.primary + '50', backgroundColor: theme.primary + '10' }]}>
                <Text style={[styles.budgetLabel, { color: theme.primary }]}>{detail.budgetLabel}</Text>
              </View>
            ) : null}
          </View>

          {showProcessingSource ? (
            <View style={styles.sourceRow}>
              {detail.classificationSource ? (
                <View
                  style={[
                    styles.budgetBadge,
                    sourceBadgeStyle(detail.classificationSource),
                  ]}>
                  <Text
                    style={[
                      styles.budgetLabel,
                      { color: sourceTextColor(detail.classificationSource) },
                    ]}>
                    {t(`inboxThreadDetail.aiSourceClassification.${detail.classificationSource}`)}
                  </Text>
                </View>
              ) : null}
              {showBriefSource ? (
                briefExtracting ? (
                  <View
                    style={[
                      styles.budgetBadge,
                      { borderColor: theme.border, backgroundColor: theme.secondary },
                    ]}>
                    <Text style={[styles.budgetLabel, { color: theme.mutedForeground }]}>
                      {t('inboxThreadDetail.aiSourceBriefPending')}
                    </Text>
                  </View>
                ) : detail.briefExtractionSource ? (
                  <View
                    style={[
                      styles.budgetBadge,
                      sourceBadgeStyle(detail.briefExtractionSource),
                    ]}>
                    <Text
                      style={[
                        styles.budgetLabel,
                        { color: sourceTextColor(detail.briefExtractionSource) },
                      ]}>
                      {t(`inboxThreadDetail.aiSourceBrief.${detail.briefExtractionSource}`)}
                    </Text>
                  </View>
                ) : null
              ) : null}
            </View>
          ) : null}

          {isCommercial ? (
            <View style={{ gap: spacing.sm }}>
              {correctedByUser && (
                <View style={[styles.overrideNotice, { borderColor: '#34D39940', backgroundColor: '#34D39910' }]}>
                  <Ionicons name="person-outline" size={13} color="#34D399" />
                  <Text style={[styles.overrideNoticeText, { color: '#34D399' }]}>
                    {t('inboxThreadDetail.overrideNotice')}
                  </Text>
                </View>
              )}
              {showExtractingBanner ? (
                <View style={styles.extractingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.classificationText, { color: theme.mutedForeground }]}>
                    {t('inboxThreadDetail.aiBriefExtracting')}
                  </Text>
                </View>
              ) : null}
              {aiBriefText ? (
                <Text style={[styles.aiPreviewText, { color: theme.foregroundSubtitle }]}>{aiBriefText}</Text>
              ) : !briefExtracting ? (
                <Text style={[styles.classificationText, { color: theme.mutedForeground }]}>
                  {t('inboxThreadDetail.aiBriefPending')}
                </Text>
              ) : null}
              {aiBriefText && (packages.length > 0 || (detail.deliverables?.length ?? 0) > 0 || attentionList.length > 0) ? (
                <Text style={[styles.briefIntro, { color: theme.mutedForeground }]}>
                  {t('inboxThreadDetail.briefIntro')}
                </Text>
              ) : null}
              {packages.length > 0 ? (
                    <View style={{ gap: spacing.xs }}>
                      <Text style={[styles.classificationLabel, { color: theme.foregroundEyebrow }]}>
                        {t('inboxThreadDetail.packagesTitle')}
                      </Text>
                      {packages.map((pkg) => (
                        <Text
                          key={`${pkg.deliverable}-${pkg.budgetLabel ?? 'quote'}`}
                          style={[styles.aiActionText, { color: theme.foregroundSubtitle }]}>
                          · {pkg.budgetLabel ? `${pkg.budgetLabel} · ` : ''}
                          {pkg.deliverable}
                        </Text>
                      ))}
                    </View>
                  ) : (detail.deliverables?.length ?? 0) > 0 ? (
                    <View style={{ gap: spacing.xs }}>
                      <Text style={[styles.classificationLabel, { color: theme.foregroundEyebrow }]}>
                        {t('inboxThreadDetail.deliverablesTitle')}
                      </Text>
                      {detail.deliverables!.map((item) => (
                        <Text key={item} style={[styles.aiActionText, { color: theme.foregroundSubtitle }]}>
                          · {item}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {attentionList.length > 0 ? (
                    <View style={{ gap: spacing.sm }}>
                      <View style={{ gap: spacing.xs }}>
                        <Text style={[styles.classificationLabel, { color: theme.foregroundEyebrow }]}>
                          {t('inboxThreadDetail.attentionTitle')}
                        </Text>
                        <Text style={[styles.sectionHint, { color: theme.mutedForeground }]}>
                          {t('inboxThreadDetail.attentionSubtitle')}
                        </Text>
                      </View>
                      {attentionList.map((item) => (
                        <AttentionItemRow key={item.id} text={item.text} />
                      ))}
                    </View>
                  ) : null}
                  {(detail.usageRights?.length ?? 0) > 0 ? (
                    <View style={{ gap: spacing.xs }}>
                      <Text style={[styles.classificationLabel, { color: theme.foregroundEyebrow }]}>
                        {t('inboxThreadDetail.usageRightsTitle')}
                      </Text>
                      {detail.usageRights!.map((item) => (
                        <Text key={item} style={[styles.aiActionText, { color: theme.foregroundSubtitle }]}>
                          · {item}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {detail.postingSchedule?.trim() ? (
                    <View style={{ gap: spacing.xs }}>
                      <Text style={[styles.classificationLabel, { color: theme.foregroundEyebrow }]}>
                        {t('inboxThreadDetail.postingScheduleTitle')}
                      </Text>
                      <Text style={[styles.aiActionText, { color: theme.foregroundSubtitle }]}>
                        · {detail.postingSchedule.trim()}
                      </Text>
                    </View>
                  ) : null}
              {missingFields.length > 0 ? (
                <Text style={[styles.classificationText, { color: theme.mutedForeground }]}>
                  {t('inboxThreadDetail.missingFieldsHint', {
                    fields: missingFields.map((field) => translateMissingField(t, field)).join(', '),
                  })}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.classificationBox, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              {correctedByUser && (
                <View style={[styles.overrideNotice, { borderColor: '#34D39940', backgroundColor: '#34D39910' }]}>
                  <Ionicons name="person-outline" size={13} color="#34D399" />
                  <Text style={[styles.overrideNoticeText, { color: '#34D399' }]}>
                    {t('inboxThreadDetail.overrideNotice')}
                  </Text>
                </View>
              )}
              {aiBriefText ? (
                <Text style={[styles.aiPreviewText, { color: theme.foregroundSubtitle, marginBottom: spacing.sm }]}>
                  {aiBriefText}
                </Text>
              ) : null}
              <Text style={[styles.classificationLabel, { color: theme.foregroundEyebrow }]}>
                {t('inboxThreadDetail.classificationWhy')}
              </Text>
              <Text style={[styles.classificationText, { color: theme.foregroundSubtitle }]}>
                {t(`inboxThreadDetail.categoryReason.${detail.category}` as const)}
              </Text>
            </View>
          )}

          {classificationSignals.length > 0 ? (
            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.classificationLabel, { color: theme.foregroundEyebrow }]}>
                  {t('inboxThreadDetail.signalsTitle')}
                </Text>
                <Text style={[styles.sectionHint, { color: theme.mutedForeground }]}>
                  {t('inboxThreadDetail.signalsSubtitle')}
                </Text>
              </View>
              {classificationSignals.map((signal) => (
                <AttentionItemRow key={signal} text={signal} />
              ))}
            </View>
          ) : null}

        </View>

        {/* 关键信号行 */}
        <View style={styles.signalRow}>
          {priorityBand ? (
            <Badge tone={leadValueBandBadgeTone(priorityBand)} label={leadValueBandLabel[priorityBand]} />
          ) : null}
          {exceptionalBudgetLabel ? <Badge tone="mint" label={exceptionalBudgetLabel} /> : null}
          {!suppressSignalRiskBadges && displayRiskLabel ? (
            <Badge tone="warning" label={displayRiskLabel} />
          ) : null}
          {!suppressSignalRiskBadges
            ? highValueRiskReasons.map((reason) => (
                <Badge key={reason.code} tone="warning" label={translateActionReason(t, reason)} />
              ))
            : null}
          {!suppressSignalRiskBadges &&
            !displayRiskLabel &&
            highValueRiskReasons.length === 0 &&
            detail.actionReasons
              ?.filter(
                (reason) =>
                  reason.code !== 'MISSING_BUDGET' || isUnclearBudgetLabel(detail.budgetLabel)
              )
              .slice(0, 2)
              .map((reason) => (
                <Badge key={reason.code} tone="neutral" label={translateActionReason(t, reason)} />
              ))}
          {detail.nextActionLabel && (
            <View style={[styles.nextHint, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Ionicons name="arrow-forward-circle-outline" size={13} color={theme.foregroundEyebrow} />
              <Text style={[styles.nextHintText, { color: theme.foregroundSubtitle }]}>
                {translateRiskLabelText(t, detail.nextActionLabel) ?? detail.nextActionLabel}
              </Text>
            </View>
          )}
        </View>

        {/* 原始邮件（折叠） */}
        <CollapsibleThread
          messages={detail.messages}
          messageStats={detail.messageStats}
          initiallyOpen={!isCommercial}
          dateLocale={dateLocale}
          onOpenMessage={openMessage}
        />

        <SettingsGroup title={t('inboxThreadDetail.categorySectionTitle')}>
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
            <CategoryCorrectionPanel
              currentCategory={detail.category}
              correctedByUser={correctedByUser}
              categoryLabels={inboxCategoryLabel}
              onSelectCategory={(category) => {
                setCategory(detail, category);
                setLastCorrectedCategory(category);
                if (apiMode) {
                  const leadStage =
                    category === 'commercial' && detail.leadStage === 'new' ? 'needs_reply' : detail.leadStage;
                  void updateOpportunityClassification(detail.id, {
                    emailCategory: category,
                    leadStage,
                  }).then((updatedDetail) => {
                    queryClient.setQueryData(detailQueryKey, updatedDetail);
                    clearCorrection(detail.id);
                    void Promise.all([
                      invalidateTenantScopedQueries(queryClient),
                      queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
                      queryClient.invalidateQueries({ queryKey: ['decisions'] }),
                      queryClient.invalidateQueries({ queryKey: ['home', 'action-log'] }),
                    ]);
                  });
                }
              }}
              onRestore={() => {
                if (apiMode) {
                  void restoreOpportunityClassification(detail.id).then((updatedDetail) => {
                    queryClient.setQueryData(detailQueryKey, updatedDetail);
                    clearCorrection(detail.id);
                    setLastCorrectedCategory(null);
                    void Promise.all([
                      invalidateTenantScopedQueries(queryClient),
                      queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
                      queryClient.invalidateQueries({ queryKey: ['decisions'] }),
                      queryClient.invalidateQueries({ queryKey: ['home', 'action-log'] }),
                    ]);
                  });
                  return;
                }
                clearCorrection(detail.id);
                setLastCorrectedCategory(null);
              }}
            />
          </View>
        </SettingsGroup>

        {correctedByUser && lastCorrectedCategory ? (
          <TrainingRulePrompt category={lastCorrectedCategory} brandName={detail.brandName} />
        ) : null}

        {isCommercial && !correctedByUser ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>{t('inboxThreadDetail.supplementAi')}</Text>
            <CorrectionRow
              label={t('inboxThreadDetail.riskHigherLabel')}
              hint={t('inboxThreadDetail.riskHigherHint')}
              onCorrect={() => {}}
            />
            <CorrectionRow
              label={t('inboxThreadDetail.budgetUnclearLabel')}
              hint={t('inboxThreadDetail.budgetUnclearHint')}
              onCorrect={() => {}}
            />
          </View>
        ) : null}

        {isCommercial ? (
          <HubLinkGroup
            title={t('hubLinks.related')}
            links={[
              ...(detail.dealId
                ? [
                    {
                      label: t('inboxThreadDetail.linkDeal'),
                      hint: t('inboxThreadDetail.linkDealHint'),
                      href: `/deal/${detail.dealId}` as Href,
                      icon: 'briefcase-outline' as const,
                    },
                  ]
                : []),
              {
                label: t('inboxThreadDetail.linkPricing'),
                hint: t('inboxThreadDetail.linkPricingHint'),
                href: '/pricing',
                icon: 'pricetag-outline',
              },
              {
                label: t('inboxThreadDetail.linkMediaKit'),
                hint: t('inboxThreadDetail.linkMediaKitHint'),
                href: '/media-kit',
                icon: 'images-outline',
              },
              {
                label: t('inboxThreadDetail.linkProposal'),
                hint: t('inboxThreadDetail.linkProposalHint'),
                href: '/proposal/sample',
                icon: 'document-text-outline',
              },
            ]}
          />
        ) : null}
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  originalSubject: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },

  aiCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  aiIconBox: { width: 26, height: 26, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  aiCardEyebrow: { fontSize: fontSize.caption, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  budgetBadge: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  budgetLabel: { fontSize: fontSize.caption, fontWeight: '800' },
  aiActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  extractingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiActionDot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  aiActionText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  aiPreviewText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  classificationBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  classificationLabel: { fontSize: fontSize.eyebrow, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  briefIntro: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  classificationText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  rulesCallout: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rulesCalloutTitle: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  rulesCalloutBody: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  overrideNotice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  overrideNoticeText: { flex: 1, fontSize: fontSize.caption, lineHeight: lineHeight.body },

  confirmBlocker: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  confirmBlockerText: { flex: 1, fontSize: fontSize.caption, lineHeight: lineHeight.body },

  // 信号行
  signalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  nextHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  nextHintText: { fontSize: fontSize.caption, fontWeight: '600' },

  // 折叠原文
  threadBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md },
  threadToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  threadToggleLabel: { flex: 1, fontSize: fontSize.caption, fontWeight: '600' },
  msgRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  msgRowInbound: {
    borderLeftWidth: 2,
  },
  msgRowOutbound: {
    borderLeftWidth: 2,
    marginLeft: spacing.sm,
  },
  msgRowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  msgMetaGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  msgMeta: { fontSize: fontSize.caption, fontWeight: '600' },
  replyBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  replyBadgeText: { fontSize: fontSize.caption, fontWeight: '700' },
  msgSnippet: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },

  // 纠偏行
  sectionLabel: { fontSize: fontSize.eyebrow, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  correctionRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  correctionLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  correctionHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryCorrectionChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryCorrectionLabel: { fontSize: fontSize.caption, fontWeight: '800' },
  trainingPrompt: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  trainingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trainingTitle: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  trainingDesc: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  trainingButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin - 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  trainingButtonLabel: { fontSize: fontSize.bodySmall, fontWeight: '800' },

  // 固定底部
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: 32,
    gap: spacing.sm,
  },
  footerNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignSelf: 'center' },
  footerNoteText: { fontSize: fontSize.caption },
  footerButtons: { flexDirection: 'row', gap: spacing.sm },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radii.md, minHeight: layout.touchMin },
  btnPrimaryLabel: { fontSize: fontSize.body, fontWeight: '800' },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, minHeight: layout.touchMin },
  btnSecondaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
});
