import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
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
import { ReplyDraftGeneratorSheet } from '@/components/drafts/ReplyDraftGeneratorSheet';
import { BrandNameLink } from '@/components/brands/BrandNameLink';
import { ContractSummaryCard } from '@/components/deals/ContractSummaryCard';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { InboxEmailCategory } from '@/src/types/domain';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { inboxMessageHref } from '@/src/lib/open-brand-detail';
import { useReturnToBackNavigation } from '@/src/lib/use-return-to-back-navigation';
import {
  archiveOpportunity,
  acknowledgeOpportunityBriefRisks,
  confirmOpportunityBrief,
  restoreOpportunityClassification,
  updateOpportunityClassification,
} from '@/src/api/opportunities-api';
import { createDraftForOpportunity, type GeneratedReplyDraft } from '@/src/api/drafts-api';
import { resolveOpportunityReplyDraftId, isResolvableReplyDraftId } from '@/src/lib/opportunity-reply-draft';
import { ApiError } from '@/src/api/api-client';
import { contractSummaryErrorMessage } from '@/src/lib/contract-summary-error';
import { restoreSession } from '@/src/api/auth-api';
import { hasStoredSession } from '@/src/auth/token-storage';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { useRateCardPackages } from '@/src/hooks/use-growth';
import { useContractSummaryEditor } from '@/src/hooks/use-contract-summary-editor';
import { pickContractPdf } from '@/src/lib/pick-contract-pdf';
import { useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';
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
} from '@/src/lib/inbox-detail-labels';
import { inboxRiskReasons } from '@/src/lib/inbox-risk-badges';
import { formatExceptionalBudgetLabel } from '@/src/lib/exceptional-budget-label';
import { leadValueBandBadgeTone } from '@/src/lib/lead-value-band-visuals';
import { inboxPriorityBadgeTone } from '@/src/lib/inbox-priority-visuals';
import { isInboxPriorityUiEnabled } from '@/src/lib/inbox-priority-feature';
import { translateInboxNextAction } from '@/src/lib/inbox-next-action-labels';
import { resolveDisplayInboxPriority } from '@/src/lib/resolve-inbox-priority';
import { resolvePriorityLeadValueBand } from '@/src/lib/priority-lead-value-band';
import {
  briefConfirmBlocker,
  canProceedToConfirmBrief,
  isBriefConfirmed,
  unacknowledgedDangerFlags,
} from '@/src/lib/brief-confirm-eligibility';
import { resolveOpportunityPathStep } from '@/src/lib/opportunity-path-step';
import { preferCooperationTitle } from '@/src/lib/cooperation-display-name';
import {
  rulesProcessingScope,
  rulesScopeI18nKey,
} from '@/src/lib/ai-processing-labels';
import { RiskBanner } from '@/components/inbox/RiskBanner';
import { CollapsibleThread } from '@/components/inbox/CollapsibleThread';
import {
  contractWarningSeverity,
  resolveThreadRiskPartitions,
} from '@/src/lib/contract-warning';

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

// ─── 主屏 ──────────────────────────────────────────────────────────────────

export default function InboxThreadDetailScreen() {
  const { t, i18n } = useTranslation();
  const { inboxCategoryLabel, inboxLeadStageLabel, leadValueBandLabel, inboxPriorityLabel } = useDomainLabels();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    threadId?: string | string[];
    returnTo?: string | string[];
    parentReturnTo?: string | string[];
  }>();
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const parentReturnTo = Array.isArray(params.parentReturnTo) ? params.parentReturnTo[0] : params.parentReturnTo;
  useReturnToBackNavigation(returnTo, parentReturnTo);
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
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  const query = useInboxThreadDetail(threadId);
  const rateCardQuery = useRateCardPackages();
  const contractEditor = useContractSummaryEditor({
    opportunityId: threadId,
    saved: query.data?.contractSummary ?? null,
    queryClient,
    threadQueryKey: detailQueryKey,
  });

  const saveContractSummary = async () => {
    try {
      await contractEditor.saveDraft();
    } catch (error) {
      void alertAction(
        t('contractSummary.title'),
        contractSummaryErrorMessage(error, t),
      );
    }
  };

  const deleteSavedContractSummary = async () => {
    const ok = await confirmAction({
      title: t('contractSummary.deleteConfirmTitle'),
      message: t('contractSummary.deleteContractConfirmMessage'),
      confirmLabel: t('contractSummary.deleteConfirmAction'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await contractEditor.deleteSavedContract();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('contractSummary.failed');
      void alertAction(t('contractSummary.title'), message);
    }
  };

  const showDeleteSavedContract =
    !!query.data?.contractSummary?.persisted && !contractEditor.unsaved && !contractEditor.draft;

  const uploadContractPdf = async () => {
    try {
      const picked = await pickContractPdf();
      if (!picked) return;
      await contractEditor.parseFromUpload(picked);
    } catch (error) {
      void alertAction(
        t('contractSummary.title'),
        contractSummaryErrorMessage(error, t),
      );
    }
  };

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

  const onAiGeneratedFromThread = useCallback(
    (result: GeneratedReplyDraft) => {
      if (!result.draft) return;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['drafts'] }),
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
      ]).then(() => {
        router.push(`/drafts/${result.draft!.id}?threadId=${encodeURIComponent(threadId ?? '')}` as Href);
      });
    },
    [detailQueryKey, queryClient, router, threadId],
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
  const replyDraftId = resolveOpportunityReplyDraftId(detail.suggestedDraftIds);
  const canOpenExistingDraft = (draftId: string) => isResolvableReplyDraftId(draftId, apiMode);
  const openReplyDraft = async () => {
    if (draftActionLoading) return;
    if (replyDraftId && canOpenExistingDraft(replyDraftId)) {
      router.push(`/drafts/${replyDraftId}?threadId=${encodeURIComponent(threadId)}` as Href);
      return;
    }
    if (!apiMode) return;
    setDraftActionLoading('ai_reply');
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
      const draft = await createDraftForOpportunity(detail.id, 'ai_reply');
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
      inboxMessageHref(message.id, threadId ?? '', returnTo || parentReturnTo ? { returnTo, parentReturnTo } : null),
    );
  };
  const detailSignals = mergeDetailSignals(detail.signals, detail.classificationSignals).map((signal) =>
    translateDetailSignal(t, signal)
  );
  const missingFields = visibleMissingFields(detail.missingFields, detail.budgetLabel);
  const { contractRisks, attentionFlags } = resolveThreadRiskPartitions(detail);
  const effectiveContractRisks = contractRisks.map((flag) =>
    localAckedRiskIds.includes(flag.id) ? { ...flag, acknowledged: true } : flag
  );
  const effectiveAttentionFlags = attentionFlags.map((flag) =>
    localAckedRiskIds.includes(flag.id) ? { ...flag, acknowledged: true } : flag
  );
  const detailForConfirm = { ...detail, riskFlags: effectiveContractRisks };
  const displayRiskLabel = localizedVisibleRiskLabel(t, detail.riskLabel, detail.budgetLabel);
  const priorityUiEnabled = isInboxPriorityUiEnabled([detail]);
  const displayPriority = resolveDisplayInboxPriority(detail);
  const priorityBand = resolvePriorityLeadValueBand(detail);
  const highValueRiskReasons =
    (priorityUiEnabled && (displayPriority === 'p0' || displayPriority === 'p1')) || priorityBand === 'high_value'
      ? inboxRiskReasons(detail.actionReasons)
      : [];
  const showAttentionFallback = commercialAttentionFallback(
    isCommercial,
    detail.extractionStatus === 'COMPLETE',
    effectiveAttentionFlags,
    detail.recommendedActions,
    detail.attentionCount
  );
  const showContractWarning = isCommercial && contractWarningSeverity(effectiveContractRisks) != null;
  const attentionList = buildAttentionList(
    detail.recommendedActions,
    effectiveAttentionFlags,
    t,
    showAttentionFallback ? t('inboxThreadDetail.attentionFallback') : null
  );
  const classificationSignals = filterSignalsApartFromAttention(detailSignals, attentionList);
  const attentionCount = resolveAttentionCount(
    detail.attentionCount,
    effectiveAttentionFlags,
    detail.recommendedActions,
    showAttentionFallback
  );
  const suppressSignalRiskBadges = isCommercial && attentionCount > 0;
  const packages = detail.packages ?? [];
  const aiBriefText = detail.preview?.trim() || detail.classificationSummary?.trim();
  const threadAnalysisPending = detail.classificationPending === true;
  const showThreadAnalysisBanner = threadAnalysisPending && !aiBriefText;
  const briefExtracting = detail.extractionStatus === 'PENDING';
  const showExtractingBanner = briefExtracting && !aiBriefText && !threadAnalysisPending;
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
  const pendingDangerFlags = unacknowledgedDangerFlags(effectiveContractRisks);
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

  const showPriorityBreakdown = () => {
    const breakdown = detail.priorityBreakdown;
    if (!breakdown) return;
    const body = [
      `${t('inboxPriority.breakdown.brandFit')} +${breakdown.brandFit}`,
      `${t('inboxPriority.breakdown.budgetValue')} +${breakdown.budgetValue}`,
      `${t('inboxPriority.breakdown.timelineUrgency')} +${breakdown.timelineUrgency}`,
      `${t('inboxPriority.breakdown.relationshipValue')} +${breakdown.relationshipValue}`,
      `${t('inboxPriority.breakdown.effort')} −${breakdown.effort}`,
      `${t('inboxPriority.breakdown.risk')} −${breakdown.risk}`,
      detail.priorityScore != null ? `Score ${Math.round(detail.priorityScore)}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    void alertAction(t('inboxPriority.breakdownTitle'), body);
  };

  const leadParts = [
    preferCooperationTitle({ brand: detail.brandName, title: detail.subject }),
    priorityUiEnabled && displayPriority
      ? inboxPriorityLabel[displayPriority]
      : detail.leadValueBand
        ? leadValueBandLabel[priorityBand ?? detail.leadValueBand]
        : null,
    inboxLeadStageLabel[detail.leadStage],
    inboxCategoryLabel[detail.category],
    correctedByUser ? t('inboxThreadDetail.userCorrectedBadge') : null,
  ].filter(Boolean);

  const toolbar = (
    <>
      {apiMode && detail.brandId ? (
        <View style={[styles.brandToolbarRow, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
          <Ionicons name="business-outline" size={14} color={theme.primary} />
          <BrandNameLink brandId={detail.brandId} label={detail.brandName} />
          <Text style={[styles.brandToolbarHint, { color: theme.mutedForeground }]}>
            {t('brandDetail.openBrandWorkspace')}
          </Text>
        </View>
      ) : null}
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
      {!isCommercial ? (
        <View style={[styles.footerNote, { backgroundColor: theme.secondary }]}>
          <Ionicons name="lock-closed-outline" size={11} color={theme.foregroundEyebrow} />
          <Text style={[styles.footerNoteText, { color: theme.foregroundEyebrow }]}>
            {t('inboxThreadDetail.footerNonCommercial')}
          </Text>
        </View>
      ) : null}
      {isCommercial ? (
        <View style={{ gap: spacing.sm }}>
          {confirmedDeal && detail.dealId ? (
            <View style={styles.footerButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('inboxThreadDetail.ctaSendEmailA11y')}
                disabled={!!draftActionLoading}
                onPress={() => void openReplyDraft()}
                style={({ pressed }) => [
                  styles.btnIcon,
                  { borderColor: theme.border, backgroundColor: theme.card },
                  !!draftActionLoading && styles.btnDisabled,
                  pressed && { opacity: 0.88 },
                ]}>
                {draftActionLoading === 'ai_reply' ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <Ionicons name="mail-outline" size={20} color={theme.primary} />
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => onOpenDeal(detail.dealId!)}
                android_ripple={{ color: `${theme.primary}33` }}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: theme.primary, flex: 1 },
                  pressed && { opacity: 0.92 },
                ]}>
                <Ionicons name="briefcase-outline" size={16} color={theme.primaryForeground} />
                <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>
                  {t('inboxThreadDetail.ctaOpenDeal')}
                </Text>
              </Pressable>
            </View>
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
          ) : confirmBlocker && confirmBlocker !== 'already_confirmed' && confirmBlocker !== 'lead_stage_draft_ready' ? (
            <View style={[styles.confirmBlocker, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Ionicons name="information-circle-outline" size={14} color={theme.foregroundEyebrow} />
              <Text style={[styles.confirmBlockerText, { color: theme.foregroundSubtitle }]}>
                {t(`inboxThreadDetail.confirmBlocker.${confirmBlocker}`)}
              </Text>
            </View>
          ) : null}
          {showDraftActions ? (
            <View style={styles.footerButtons}>
              <Pressable
                accessibilityRole="button"
                disabled={!!draftActionLoading || confirmLoading}
                onPress={() => void openReplyDraft()}
                android_ripple={{ color: `${theme.primary}33` }}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: theme.primary, flex: 1 },
                  (!!draftActionLoading || confirmLoading) && styles.btnDisabled,
                  pressed && { opacity: 0.92 },
                ]}>
                {draftActionLoading === 'ai_reply' ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Ionicons name="mail-outline" size={16} color={theme.primaryForeground} />
                )}
                <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>
                  {t('inboxThreadDetail.ctaReplyEmail')}
                </Text>
              </Pressable>
              {apiMode ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={!!draftActionLoading || confirmLoading}
                  onPress={() => setShowAiGenerator(true)}
                  android_ripple={{ color: `${theme.primary}18` }}
                  style={({ pressed }) => [
                    styles.btnSecondary,
                    { borderColor: theme.primary, backgroundColor: theme.secondary, flex: 1 },
                    (!!draftActionLoading || confirmLoading) && styles.btnDisabled,
                    pressed && { opacity: 0.88 },
                  ]}>
                  <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
                  <Text style={[styles.btnSecondaryLabel, { color: theme.primary }]}>
                    {t('replyDraftGenerator.openCta')}
                  </Text>
                </Pressable>
              ) : null}
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
    <>
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

      {pendingDangerFlags.length > 0 ? (
        <RiskBanner flags={pendingDangerFlags} pinned showAckRequired={readyToConfirm} />
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

          {showContractWarning ? (
            <RiskBanner
              flags={effectiveContractRisks}
              showAckRequired={pendingDangerFlags.length > 0 && readyToConfirm}
            />
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
              {showThreadAnalysisBanner ? (
                <View style={styles.extractingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.classificationText, { color: theme.mutedForeground }]}>
                    {t('inboxThreadDetail.threadAnalysisPending')}
                  </Text>
                </View>
              ) : null}
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
              ) : !briefExtracting && !threadAnalysisPending ? (
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

        {contractEditor.displayed || contractEditor.parsing || detail.contractSummary || isCommercial || apiMode ? (
          <View style={{ marginTop: spacing.md }}>
            <ContractSummaryCard
              summary={contractEditor.displayed}
              loading={contractEditor.parsing}
              saving={contractEditor.saving}
              savingTarget={contractEditor.savingTarget}
              deleting={contractEditor.deleting}
              unsaved={contractEditor.unsaved}
              editable={!!contractEditor.displayed && contractEditor.displayed.status !== 'FAILED'}
              saveLayout="contract"
              collapsible
              onChange={contractEditor.patchDraft}
              onSave={() => void saveContractSummary()}
              onCancel={contractEditor.cancelDraft}
              onDelete={showDeleteSavedContract ? () => void deleteSavedContractSummary() : undefined}
              onUploadPdf={apiMode ? () => void uploadContractPdf() : undefined}
              uploadDisabled={contractEditor.parsing || contractEditor.saving || contractEditor.deleting}
            />
          </View>
        ) : null}

        {/* 关键信号行 */}
        <View style={styles.signalRow}>
          {priorityUiEnabled && displayPriority ? (
            <Pressable
              accessibilityRole="button"
              accessibilityHint={t('inboxPriority.breakdownHint')}
              onLongPress={detail.priorityBreakdown ? showPriorityBreakdown : undefined}
              onPress={detail.priorityBreakdown ? showPriorityBreakdown : undefined}>
              <Badge tone={inboxPriorityBadgeTone(displayPriority)} label={inboxPriorityLabel[displayPriority]} />
            </Pressable>
          ) : priorityBand ? (
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
                {translateInboxNextAction(t, detail.nextActionLabel) ??
                  translateRiskLabelText(t, detail.nextActionLabel) ??
                  detail.nextActionLabel}
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
              }}
            />
          </View>
        </SettingsGroup>

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
    {apiMode && threadId ? (
      <ReplyDraftGeneratorSheet
        visible={showAiGenerator}
        opportunityId={threadId}
        rateCardPackages={rateCardQuery.data}
        locale={i18n.language}
        onClose={() => setShowAiGenerator(false)}
        onGenerated={onAiGeneratedFromThread}
      />
    ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  brandToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  brandToolbarHint: { fontSize: fontSize.eyebrow },
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
  btnIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    minWidth: layout.touchMin,
    paddingHorizontal: spacing.md,
  },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radii.md, minHeight: layout.touchMin },
  btnPrimaryLabel: { fontSize: fontSize.body, fontWeight: '800' },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, minHeight: layout.touchMin },
  btnSecondaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
});
