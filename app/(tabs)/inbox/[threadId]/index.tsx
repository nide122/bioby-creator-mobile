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

import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import type { InboxMessage, DraftKind } from '@/src/types/domain';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  HubScreen,
  QueryRetryCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { ContractSummaryCard } from '@/components/deals/ContractSummaryCard';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { InboxEmailCategory } from '@/src/types/domain';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { inboxMessageHref, inboxThreadMessagesHref } from '@/src/lib/open-brand-detail';
import { useReturnToBackNavigation } from '@/src/lib/use-return-to-back-navigation';
import {
  archiveOpportunity,
  acknowledgeOpportunityBriefRisks,
  confirmOpportunityBrief,
  restoreOpportunityClassification,
  updateOpportunityClassification,
} from '@/src/api/opportunities-api';
import { createDraftForOpportunity } from '@/src/api/drafts-api';
import { resolveOpportunityReplyDraftId, isResolvableReplyDraftId } from '@/src/lib/opportunity-reply-draft';
import { ApiError } from '@/src/api/api-client';
import { contractSummaryErrorMessage } from '@/src/lib/contract-summary-error';
import { restoreSession } from '@/src/api/auth-api';
import { hasStoredSession } from '@/src/auth/token-storage';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { useContractSummaryEditor } from '@/src/hooks/use-contract-summary-editor';
import { pickContractPdf } from '@/src/lib/pick-contract-pdf';
import { useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';
import { getActiveTenantPublicId, invalidateTenantScopedQueries, tenantQueryKey, useTenantQueryKey } from '@/src/lib/tenant-query';
import { useSessionStore } from '@/src/stores/session-store';
import {
  translateRiskLabelText,
} from '@/src/lib/inbox-detail-labels';
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
import { preferCooperationTitle, resolveOpportunityBrandLabel } from '@/src/lib/cooperation-display-name';
import { PriorityBreakdownSheet } from '@/src/components/inbox/PriorityBreakdownSheet';
import { CollapsibleThread } from '@/components/inbox/CollapsibleThread';
import {
  ThreadAiSummaryCard,
  ThreadPriorityBanner,
  ThreadRiskCheckCard,
} from '@/components/inbox/InboxThreadSummaryPanels';
import { contractWarningSeverity, resolveThreadRiskPartitions } from '@/src/lib/contract-warning';

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
  const { inboxCategoryLabel, inboxLeadStageLabel, inboxPriorityLabel } = useDomainLabels();
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
  const [showPriorityBreakdownSheet, setShowPriorityBreakdownSheet] = useState(false);

  const query = useInboxThreadDetail(threadId);
  const briefConfirmed = query.data ? isBriefConfirmed(query.data) : false;
  const contractEditor = useContractSummaryEditor({
    opportunityId: threadId,
    saved: briefConfirmed ? (query.data?.contractSummary ?? null) : null,
    queryClient,
    threadQueryKey: detailQueryKey,
  });

  const alertContractSaveBlocked = () => {
    void alertAction(t('contractSummary.title'), t('contractSummary.saveContractBlockedHint'));
  };

  const saveContractSummary = async () => {
    if (!briefConfirmed) {
      alertContractSaveBlocked();
      return;
    }
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
    briefConfirmed &&
    !!query.data?.contractSummary?.persisted &&
    !contractEditor.unsaved &&
    !contractEditor.draft;

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
  const screenTitle = detail.subject;
  const brandLabel = resolveOpportunityBrandLabel(detail.brandName, detail.subject, detail.claimedBrandName);
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
        router.replace('/home' as Href);
        return;
      }
      const restored = await restoreSession();
      if (restored) {
        applyAuthSession(restored);
      } else if (!(await hasStoredSession())) {
        clearLocalSession();
        queryClient.clear();
        router.replace('/home' as Href);
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
        router.replace('/home' as Href);
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
  const { contractRisks } = resolveThreadRiskPartitions(detail);
  const effectiveContractRisks = contractRisks.map((flag) =>
    localAckedRiskIds.includes(flag.id) ? { ...flag, acknowledged: true } : flag
  );
  const detailForConfirm = { ...detail, riskFlags: effectiveContractRisks };
  const priorityUiEnabled = isInboxPriorityUiEnabled([detail]);
  const displayPriority = resolveDisplayInboxPriority(detail);
  const showContractWarning =
    isCommercial && contractWarningSeverity(effectiveContractRisks) != null;
  const packages = detail.packages ?? [];
  const aiBriefText = detail.preview?.trim() || detail.classificationSummary?.trim();
  const threadAnalysisPending = detail.classificationPending === true;
  const showThreadAnalysisBanner = threadAnalysisPending && !aiBriefText;
  const briefExtracting = detail.extractionStatus === 'PENDING';
  const briefConfidencePercent =
    detail.extractionConfidence != null ? Math.round(detail.extractionConfidence * 100) : null;

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

  const openPriorityBreakdown = () => {
    if (!detail.priorityBreakdown && !detail.priorityAssessment) return;
    setShowPriorityBreakdownSheet(true);
  };

  const localizedNextAction = detail.nextActionLabel
    ? translateInboxNextAction(t, detail.nextActionLabel) ??
      translateRiskLabelText(t, detail.nextActionLabel) ??
      detail.nextActionLabel
    : null;

  const leadParts = [
    preferCooperationTitle({ brand: detail.brandName, title: detail.subject }),
    inboxLeadStageLabel[detail.leadStage],
    inboxCategoryLabel[detail.category],
    correctedByUser ? t('inboxThreadDetail.userCorrectedBadge') : null,
  ].filter(Boolean);

  const cooperationTitle = preferCooperationTitle({ brand: detail.brandName, title: detail.subject });
  const canShowRankingExplain =
    priorityUiEnabled &&
    isCommercial &&
    !!(detail.priorityAssessment || detail.priorityBreakdown);

  const commercialToolbar = isCommercial ? (
    <ThreadPriorityBanner
      priority={priorityUiEnabled ? displayPriority : null}
      priorityLabel={displayPriority ? inboxPriorityLabel[displayPriority] : undefined}
      nextAction={localizedNextAction}
      showExplain={canShowRankingExplain}
      onExplainPress={openPriorityBreakdown}
    />
  ) : null;

  const toolbar = commercialToolbar;

  const showDraftActions = isCommercial && opportunityPathStep !== 'completed' && !confirmedDeal;

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
          {readyToConfirm ? (
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
          {(showDraftActions || (confirmedDeal && detail.dealId)) ? (
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
                  <Ionicons name="create-outline" size={16} color={theme.primaryForeground} />
                )}
                <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>
                  {t('inboxThreadDetail.ctaReplyDraft')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!!draftActionLoading || confirmLoading}
                onPress={() => router.push(inboxThreadMessagesHref(threadId, returnTo || parentReturnTo ? { returnTo, parentReturnTo } : null))}
                android_ripple={{ color: `${theme.primary}18` }}
                style={({ pressed }) => [
                  styles.btnSecondary,
                  { borderColor: theme.border, backgroundColor: 'transparent', flex: 1 },
                  (!!draftActionLoading || confirmLoading) && styles.btnDisabled,
                  pressed && { opacity: 0.88 },
                ]}>
                <Ionicons name="mail-open-outline" size={16} color={theme.foreground} />
                <Text style={[styles.btnSecondaryLabel, { color: theme.foreground }]}>
                  {t('inboxThreadDetail.ctaOpenOriginalEmail')}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {detail.dealId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenDeal(detail.dealId!)}
              style={({ pressed }) => [styles.dealLinkRow, pressed && { opacity: 0.8 }]}>
              <Ionicons name="briefcase-outline" size={14} color={theme.primary} />
              <Text style={[styles.dealLinkText, { color: theme.primary }]}>
                {t('inboxThreadDetail.ctaOpenDeal')}
              </Text>
            </Pressable>
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
    <Stack.Screen
      options={{
        title: isCommercial ? t('stacks.inboxThread') : screenTitle,
      }}
    />
    <HubScreen
      testID="screen-inbox-thread-detail"
      eyebrow={isCommercial ? t('tabs.inbox') : t('tabs.inbox')}
      title={isCommercial ? undefined : screenTitle}
      lead={isCommercial ? undefined : leadParts.join(' · ')}
      toolbar={toolbar}
      fixedFooter={stickyFooter}
      scrollBottomInset={140}>
      {isCommercial ? (
        <>
          <ThreadAiSummaryCard
            title={cooperationTitle}
            summaryText={aiBriefText}
            confidencePercent={detail.extractionStatus === 'COMPLETE' ? briefConfidencePercent : null}
            extracting={briefExtracting}
            analysisPending={showThreadAnalysisBanner}
            budgetDisplay={detail.budgetDisplay}
            packages={packages}
            deadlineAtISO={detail.deadlineAtISO}
            deadlineKind={detail.deadlineKind}
            deadlineText={detail.deadlineText}
          />
          {showContractWarning ? <ThreadRiskCheckCard flags={effectiveContractRisks} /> : null}
          {detail.latestApprovedScript ? (
            <View style={[styles.approvedScriptCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.approvedScriptEyebrow, { color: theme.primary }]}>
                {t('inboxThreadDetail.approvedScriptTitle')}
              </Text>
              <Text style={[styles.approvedScriptHeading, { color: theme.foreground }]}>
                {detail.latestApprovedScript.title}
              </Text>
              <Text style={[styles.approvedScriptExcerpt, { color: theme.foregroundSubtitle }]}>
                {detail.latestApprovedScript.excerpt}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <>
      {detail.latestApprovedScript ? (
        <View style={[styles.approvedScriptCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.approvedScriptEyebrow, { color: theme.primary }]}>
            {t('inboxThreadDetail.approvedScriptTitle')}
          </Text>
          <Text style={[styles.approvedScriptHeading, { color: theme.foreground }]}>
            {detail.latestApprovedScript.title}
          </Text>
          <Text style={[styles.approvedScriptExcerpt, { color: theme.foregroundSubtitle }]}>
            {detail.latestApprovedScript.excerpt}
          </Text>
        </View>
      ) : null}

      <View style={[styles.aiCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.aiCardHeader}>
            <View style={[styles.aiIconBox, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="sparkles" size={14} color={theme.primary} />
            </View>
            <Text style={[styles.aiCardEyebrow, { color: theme.primary }]}>{t('inboxThreadDetail.aiBriefEyebrow')}</Text>
          </View>

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

        </View>

        {(contractEditor.parsing ||
          contractEditor.draft ||
          contractEditor.unsaved ||
          (briefConfirmed && (contractEditor.displayed || detail.contractSummary)) ||
          apiMode) ? (
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
              contractSaveAllowed={confirmedDeal}
              onContractSaveBlocked={alertContractSaveBlocked}
              onChange={contractEditor.patchDraft}
              onSave={() => void saveContractSummary()}
              onCancel={contractEditor.cancelDraft}
              onDelete={showDeleteSavedContract ? () => void deleteSavedContractSummary() : undefined}
              onUploadPdf={apiMode ? () => void uploadContractPdf() : undefined}
              uploadDisabled={contractEditor.parsing || contractEditor.saving || contractEditor.deleting}
            />
          </View>
        ) : null}

        <CollapsibleThread
          messages={detail.messages}
          messageStats={detail.messageStats}
          initiallyOpen
          dateLocale={dateLocale}
          counterpartyLabel={brandLabel ?? undefined}
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
        </>
      )}
    </HubScreen>
    {detail.priorityBreakdown || detail.priorityAssessment ? (
      <PriorityBreakdownSheet
        visible={showPriorityBreakdownSheet}
        onClose={() => setShowPriorityBreakdownSheet(false)}
        inboxPriority={displayPriority}
        assessment={detail.priorityAssessment}
        breakdown={detail.priorityBreakdown}
        dealEconomics={detail.dealEconomics}
        leadValueBand={resolvePriorityLeadValueBand(detail)}
      />
    ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  threadMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionStripMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    minWidth: 0,
  },
  brandToolbarHint: { fontSize: fontSize.eyebrow },
  originalSubject: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  approvedScriptCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  approvedScriptEyebrow: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  approvedScriptHeading: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: '600',
  },
  approvedScriptExcerpt: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  actionStripHint: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  rankingWhyPressable: {
    flexShrink: 0,
    marginLeft: spacing.xs,
  },
  rankingWhyLink: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
    lineHeight: lineHeight.body,
  },

  aiCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  aiIconBox: { width: 26, height: 26, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  aiCardEyebrow: { fontSize: fontSize.caption, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  budgetBadge: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  budgetDisplayText: { fontSize: fontSize.caption, fontWeight: '800' },
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
  dealLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  dealLinkText: { fontSize: fontSize.bodySmall, fontWeight: '700' },
});
