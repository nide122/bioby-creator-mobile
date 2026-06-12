import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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
import type { InboxMessage } from '@/src/types/domain';
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
  type BadgeTone,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { InboxEmailCategory, InboxRiskFlag, InboxRiskSeverity } from '@/src/types/domain';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  archiveOpportunity,
  restoreOpportunityClassification,
  updateOpportunityClassification,
} from '@/src/api/opportunities-api';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';
import { useAgentTrainingRules } from '@/src/hooks/use-agent-training';
import { useAgentTrainingStore } from '@/src/stores/agent-training-store';
import { invalidateTenantScopedQueries, useTenantQueryKey } from '@/src/lib/tenant-query';

function riskTone(severity: InboxRiskSeverity): BadgeTone {
  switch (severity) {
    case 'danger':  return 'danger';
    case 'warning': return 'warning';
    default:        return 'mint';
  }
}

// ─── 可折叠原文区 ──────────────────────────────────────────────────────────

function CollapsibleThread({
  messages,
  initiallyOpen = false,
  dateLocale,
  onOpenMessage,
}: {
  messages: InboxMessage[];
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
          {t('inboxThreadDetail.threadToggle', { count: messages.length })}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={theme.mutedForeground}
        />
      </Pressable>

      {open && (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {messages.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              onPress={() => onOpenMessage(m)}
              style={({ pressed }) => [
                styles.msgRow,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && { opacity: 0.88 },
              ]}>
              <View style={styles.msgRowTop}>
                <Text style={[styles.msgMeta, { color: theme.foregroundEyebrow, flex: 1 }]}>
                  {m.fromLabel} ·{' '}
                  {new Date(m.sentAtISO).toLocaleString(dateLocale, {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.mutedForeground} />
              </View>
              <Text style={[styles.msgSnippet, { color: theme.foreground }]} numberOfLines={3}>
                {m.snippet}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── 风险条目 ──────────────────────────────────────────────────────────────

function RiskPill({ flag }: { flag: InboxRiskFlag }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [expanded, setExpanded] = useState(false);

  const bgColor = flag.severity === 'danger' ? '#EF444415' : flag.severity === 'warning' ? '#F59E0B12' : '#34D39912';
  const borderColor = flag.severity === 'danger' ? '#EF444440' : flag.severity === 'warning' ? '#F59E0B40' : '#34D39940';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => setExpanded((v) => !v)}
      style={[styles.riskPill, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.riskPillTop}>
        <Badge tone={riskTone(flag.severity)} label={flag.label} />
        {flag.hint && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={theme.mutedForeground}
          />
        )}
      </View>
      {expanded && flag.hint && (
        <Text style={[styles.riskPillHint, { color: theme.foregroundSubtitle }]}>{flag.hint}</Text>
      )}
    </Pressable>
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
  const categories: InboxEmailCategory[] = ['commercial', 'pr_sample', 'media', 'personal', 'other'];

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
  const { inboxCategoryLabel, inboxLeadStageLabel } = useDomainLabels();
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
  const correctedByUserLocal = useInboxCorrectionStore((s) =>
    threadId ? !!s.classificationByThreadId[threadId] : false
  );
  const [lastCorrectedCategory, setLastCorrectedCategory] = useState<InboxEmailCategory | null>(null);

  const query = useInboxThreadDetail(threadId);

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
  const canOpenDraft = (draftId: string) =>
    !!draftId && (!apiMode || /^\d+$/.test(draftId));
  const openDraft = (draftId: string) => {
    if (!canOpenDraft(draftId)) return;
    router.push(`/drafts/${draftId}?threadId=${encodeURIComponent(threadId)}` as Href);
  };
  const openMessage = (message: InboxMessage) => {
    router.push(
      `/inbox/message/${encodeURIComponent(message.id)}?threadId=${encodeURIComponent(threadId)}` as Href
    );
  };
  const hasAiActions = detail.recommendedActions.length > 0;
  const aiBriefPreview = detail.preview?.trim();
  const briefExtracting = detail.extractionStatus === 'PENDING';
  const briefConfidencePercent =
    detail.extractionConfidence != null ? Math.round(detail.extractionConfidence * 100) : null;

  const leadParts = [
    detail.brandName,
    inboxCategoryLabel[detail.category],
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
            value={String(detail.riskFlags.length)}
            label={t('inboxThreadDetail.metricRisks')}
            accent={detail.riskFlags.length > 0}
          />
        </HubMetrics>
      ) : null}
      {isCommercial ? <OpportunityPath currentStep="inbox" /> : null}
    </>
  );

  const stickyFooter = (
    <View style={[styles.stickyFooter, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <View style={[styles.footerNote, { backgroundColor: theme.secondary }]}>
        <Ionicons name="lock-closed-outline" size={11} color={theme.foregroundEyebrow} />
        <Text style={[styles.footerNoteText, { color: theme.foregroundEyebrow }]}>
          {isCommercial ? t('inboxThreadDetail.footerCommercial') : t('inboxThreadDetail.footerNonCommercial')}
        </Text>
      </View>
      {isCommercial ? (
        <View style={styles.footerButtons}>
          <Pressable
            accessibilityRole="button"
            disabled={!canOpenDraft(detail.suggestedDraftIds.aiReply)}
            onPress={() => openDraft(detail.suggestedDraftIds.aiReply)}
            android_ripple={{ color: `${theme.primary}18` }}
            style={({ pressed }) => [
              styles.btnSecondary,
              { borderColor: theme.border },
              !canOpenDraft(detail.suggestedDraftIds.aiReply) && styles.btnDisabled,
              pressed && { opacity: 0.88 },
            ]}>
            <Ionicons name="chatbubble-outline" size={16} color={theme.foreground} />
            <Text style={[styles.btnSecondaryLabel, { color: theme.foreground }]}>{t('inboxThreadDetail.ctaReplyDraft')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!canOpenDraft(detail.suggestedDraftIds.quote)}
            onPress={() => openDraft(detail.suggestedDraftIds.quote)}
            android_ripple={{ color: `${theme.primary}33` }}
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: theme.primary },
              !canOpenDraft(detail.suggestedDraftIds.quote) && styles.btnDisabled,
              pressed && { opacity: 0.92 },
            ]}>
            <Ionicons name="pricetag-outline" size={16} color={theme.primaryForeground} />
            <Text style={[styles.btnPrimaryLabel, { color: theme.primaryForeground }]}>{t('inboxThreadDetail.ctaQuoteDraft')}</Text>
          </Pressable>
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
              {briefExtracting ? (
                <View style={styles.extractingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.classificationText, { color: theme.mutedForeground }]}>
                    {t('inboxThreadDetail.aiBriefExtracting')}
                  </Text>
                </View>
              ) : hasAiActions ? (
                detail.recommendedActions.map((action, i) => (
                  <View key={i} style={styles.aiActionRow}>
                    <View style={[styles.aiActionDot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.aiActionText, { color: theme.foregroundSubtitle }]}>{action}</Text>
                  </View>
                ))
              ) : aiBriefPreview ? (
                <Text style={[styles.aiPreviewText, { color: theme.foregroundSubtitle }]}>{aiBriefPreview}</Text>
              ) : (
                <Text style={[styles.classificationText, { color: theme.mutedForeground }]}>
                  {t('inboxThreadDetail.aiBriefPending')}
                </Text>
              )}
              {(detail.deliverables?.length ?? 0) > 0 ? (
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
              {(detail.missingFields?.length ?? 0) > 0 && !briefExtracting ? (
                <Text style={[styles.classificationText, { color: theme.mutedForeground }]}>
                  {t('inboxThreadDetail.missingFieldsHint', { fields: detail.missingFields!.join(', ') })}
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
              <Text style={[styles.classificationLabel, { color: theme.foregroundEyebrow }]}>
                {t('inboxThreadDetail.classificationWhy')}
              </Text>
              <Text style={[styles.classificationText, { color: theme.foregroundSubtitle }]}>
                {t(`inboxThreadDetail.categoryReason.${detail.category}` as const)}
              </Text>
            </View>
          )}

          {/* 风险条目（内联，可展开） */}
          {detail.riskFlags.length > 0 && (
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              {detail.riskFlags.map((flag) => (
                <RiskPill key={flag.id} flag={flag} />
              ))}
            </View>
          )}
        </View>

        {/* 关键信号行 */}
        <View style={styles.signalRow}>
          {detail.riskLabel && <Badge tone="warning" label={detail.riskLabel} />}
          {!detail.riskLabel &&
            detail.actionReasons?.slice(0, 2).map((reason) => (
              <Badge key={reason.code} tone="neutral" label={reason.message} />
            ))}
          {detail.nextActionLabel && (
            <View style={[styles.nextHint, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Ionicons name="arrow-forward-circle-outline" size={13} color={theme.foregroundEyebrow} />
              <Text style={[styles.nextHintText, { color: theme.foregroundSubtitle }]}>{detail.nextActionLabel}</Text>
            </View>
          )}
        </View>

        {/* 原始邮件（折叠） */}
        <CollapsibleThread
          messages={detail.messages}
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
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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

  // 风险药丸
  riskPill: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  riskPillTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riskPillHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },

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
  msgRowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  msgMeta: { fontSize: fontSize.caption, fontWeight: '600' },
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
