import { useQueryClient } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type DimensionValue,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Badge,
  EmptyStateCard,
  FilterChipRow,
  HubBanner,
  HubCallout,
  HubListRow,
  HubNavRow,
  HubScreen,
  HubStaticRow,
  HubSearchField,
  QueryRetryCard,
  SegmentedControl,
  SettingsBlock,
  SettingsGroup,
  SettingsRow,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useTranslation } from 'react-i18next';

import type { InboxEmailCategory, InboxLeadStage, InboxThread } from '@/src/types/domain';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  syncMailbox,
  type MailboxSyncLookback,
  type MailboxSyncStatus,
  type MailProcessingSummary,
  type MailSyncResult,
} from '@/src/api/mailbox-api';
import { useMailboxConnection } from '@/src/hooks/use-mailbox-connection';
import { useMailboxSyncStatus } from '@/src/hooks/use-mailbox-sync-status';
import { useInboxThreads, useAiDailySummary } from '@/src/hooks/use-inbox-threads';
import { useTabRefresh } from '@/src/hooks/use-tab-refresh';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { useSessionStore } from '@/src/stores/session-store';
import { useAgentTrainingRules } from '@/src/hooks/use-agent-training';
import { useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';
import {
  useInboxViewStore,
  type InboxCategoryFilter,
  type InboxSortBy,
  type InboxSortOrder,
  type InboxTimeRangeFilter,
  type InboxViewMode,
} from '@/src/stores/inbox-view-store';

const DEFAULT_SYNC_LOOKBACK: MailboxSyncLookback = 'ONE_WEEK';
const SYNC_LOOKBACK_OPTIONS: readonly MailboxSyncLookback[] = ['ONE_WEEK', 'ONE_MONTH', 'THREE_MONTHS', 'ALL'];
const INBOX_TIME_RANGE_OPTIONS: readonly InboxTimeRangeFilter[] = ['ALL', 'ONE_WEEK', 'ONE_MONTH', 'THREE_MONTHS'];
const SCROLL_TOP_THRESHOLD = 360;
const LOAD_MORE_THRESHOLD = 360;
const SYNC_COMPLETE_CARD_VISIBLE_MS = 4200;

// Connection banner

function InboxConnectionBanner() {
  const { t } = useTranslation();
  const router = useRouter();

  const emailSkipped = useSessionStore((s) => s.emailSkipped);
  const mailboxConnection = useSessionStore((s) => s.mailboxConnection);
  const [dismissed, setDismissed] = useState(false);

  if (!emailSkipped || mailboxConnection || dismissed) return null;

  return (
    <HubBanner
      title={t('inboxScreen.connectionBannerTitle')}
      body={t('inboxScreen.connectionBannerBody')}
      primaryLabel={t('inboxScreen.connectCta')}
      onPrimary={() => router.push('/onboarding/email?source=account' as Href)}
      secondaryLabel={t('inboxScreen.later')}
      onSecondary={() => setDismissed(true)}
    />
  );
}

function InboxMailboxStatusCard({
  onSync,
  syncing,
  processingActive,
  syncLookback,
  onSyncLookbackChange,
}: {
  onSync?: () => void;
  syncing?: boolean;
  processingActive?: boolean;
  syncLookback: MailboxSyncLookback;
  onSyncLookbackChange: (value: MailboxSyncLookback) => void;
}) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const mailbox = useMailboxConnection();

  if (!shouldUseBackendApi() || !mailbox.data?.emailAddress) return null;

  const lastSyncLabel = mailbox.data.lastSyncAtISO
    ? new Date(mailbox.data.lastSyncAtISO).toLocaleString(
        i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US',
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      )
    : t('inboxScreen.mailboxNeverSynced');

  return (
    <SettingsGroup insetDividers={false}>
      <View style={styles.mailboxStatusContent}>
        <View style={styles.mailboxStatusRow}>
          <View style={styles.mailboxStatusMain}>
            <View style={styles.mailboxIdentityRow}>
              <View style={[styles.mailboxIconBadge, { backgroundColor: theme.accentMintSoft }]}>
                <Ionicons name="mail-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.mailboxIdentityText}>
                <Text style={[styles.mailboxAddressText, { color: theme.foreground }]}>
                  {mailbox.data.emailAddress}
                </Text>
                <Text style={[styles.mailboxLastSyncText, { color: theme.foregroundSubtitle }]}>
                  {t('inboxScreen.mailboxLastSync', { time: lastSyncLabel })}
                </Text>
              </View>
            </View>
          </View>
          {onSync ? (
            <Pressable
              testID="inbox-sync-button"
              accessibilityRole="button"
              accessibilityLabel={t('inboxScreen.syncNowA11y')}
              disabled={syncing}
              onPress={onSync}
              hitSlop={8}
              style={({ pressed }) => [
                styles.mailboxSyncButton,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && !syncing && styles.mailboxSyncButtonPressed,
                syncing && styles.mailboxSyncButtonDisabled,
              ]}>
              {syncing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={18} color={theme.primary} />
              )}
            </Pressable>
          ) : null}
        </View>
        {syncing || processingActive ? (
          <Text style={[styles.mailboxSyncingText, { color: theme.primary }]}>
            {t('inboxScreen.syncingInline')}
          </Text>
        ) : null}
        <View style={styles.syncLookbackBlock}>
          <Text style={[styles.syncLookbackLabel, { color: theme.foregroundSubtitle }]}>
            {t('inboxScreen.syncLookbackLabel')}
          </Text>
          <FilterChipRow
            items={SYNC_LOOKBACK_OPTIONS.map((id) => ({
              id,
              label: t(`inboxScreen.syncLookback.${id}`),
            }))}
            value={syncLookback}
            onChange={(next) => {
              if (!syncing) onSyncLookbackChange(next);
            }}
          />
        </View>
      </View>
    </SettingsGroup>
  );
}

// AI summary and sync status

function stageLabel(stage: string | null | undefined, t: ReturnType<typeof useTranslation>['t']) {
  switch (stage) {
    case 'CLASSIFY':
      return t('inboxScreen.syncStageClassify');
    case 'LINK_OPPORTUNITY':
      return t('inboxScreen.syncStageOpportunity');
    case 'EXTRACT_BRIEF':
      return t('inboxScreen.syncStageBrief');
    case 'AUTO_REPLY':
      return t('inboxScreen.syncStageReply');
    case 'REBUILD_DECISION_QUEUE':
      return t('inboxScreen.syncStageDecisions');
    case 'BRIEF_PENDING':
      return t('inboxScreen.syncStageBriefQueued');
    case 'DONE':
      return t('inboxScreen.syncStageDone');
    default:
      return t('inboxScreen.syncStageProcessing');
  }
}

function summaryTotal(summary: MailProcessingSummary) {
  return summary.pending + summary.processing + summary.completed + summary.failed + summary.skipped;
}

function syncResultCounts(result: MailSyncResult) {
  const newCount = result.newCount ?? result.newMessageIds.length;
  return {
    newCount,
    duplicateCount: result.duplicateCount ?? Math.max(0, result.success - newCount),
    inboxNewCount: result.inboxNewCount ?? newCount,
    otherFolderNewCount: result.nonInboxNewCount ?? 0,
  };
}

function syncResultBody(
  result: MailSyncResult,
  counts: ReturnType<typeof syncResultCounts>,
  t: ReturnType<typeof useTranslation>['t']
) {
  const parts = [t('inboxScreen.syncResultChecked', { count: result.processed })];
  if (counts.duplicateCount > 0) {
    parts.push(t('inboxScreen.syncResultDuplicate', { count: counts.duplicateCount }));
  }
  if (counts.inboxNewCount > 0) {
    parts.push(t('inboxScreen.syncResultInboxQueued', { count: counts.inboxNewCount }));
  }
  if (counts.otherFolderNewCount > 0) {
    parts.push(t('inboxScreen.syncResultOtherFolderSaved', { count: counts.otherFolderNewCount }));
  }
  if (result.failed > 0) {
    parts.push(t('inboxScreen.syncResultFailed', { count: result.failed }));
  }
  if (parts.length === 1) {
    parts.push(t('inboxScreen.syncResultNoChanges'));
  }
  return parts.join(' · ');
}

function hasActiveProcessing(summary: MailProcessingSummary) {
  return summary.pending + summary.processing > 0;
}

function progressSummaryForStatus(status: MailboxSyncStatus): MailProcessingSummary {
  if (hasActiveProcessing(status.mailProcessing)) return status.mailProcessing;
  if (hasActiveProcessing(status.briefExtraction)) return status.briefExtraction;
  if (summaryTotal(status.mailProcessing) > 0) return status.mailProcessing;
  return status.briefExtraction;
}

function InboxSyncProgressCard({
  expanded,
  onToggle,
  showComplete,
  status,
}: {
  expanded: boolean;
  onToggle: () => void;
  showComplete: boolean;
  status?: MailboxSyncStatus | null;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (!shouldUseBackendApi() || !status) return null;

  const summary = progressSummaryForStatus(status);
  const summaryTotalCount = summaryTotal(summary);
  const failed = status.mailProcessing.failed + status.briefExtraction.failed + (status.lastSync?.failed ?? 0);
  const pending = summaryTotalCount > 0 ? summary.pending : 0;
  const processing = summaryTotalCount > 0 ? summary.processing : 0;
  const displayFailed = summaryTotalCount > 0 ? summary.failed : (status.lastSync?.failed ?? 0);
  const total = Math.max(summaryTotalCount, status.lastSync?.processed ?? 0, status.active ? 1 : 0);
  const completed =
    summaryTotalCount > 0
      ? summary.completed
      : status.active
        ? 0
        : Math.max(0, total - displayFailed);
  const active = status.active;

  if (!active && failed === 0 && !showComplete) return null;

  const currentStage = summary.currentStage;
  const progress = total > 0 ? Math.min(1, Math.max(0, completed / total)) : active ? 0.08 : 1;
  const progressWidth = `${Math.max(active ? 8 : 100, Math.round(progress * 100))}%` as DimensionValue;
  const title = active
    ? t('inboxScreen.syncProgressTitleActive')
    : failed > 0
      ? t('inboxScreen.syncProgressTitleFailed')
      : t('inboxScreen.syncProgressTitleDone');
  const body = active
    ? t('inboxScreen.syncProgressBodyActive', { completed, total, processing, pending })
    : failed > 0
      ? t('inboxScreen.syncProgressBodyFailed', { failed })
      : t('inboxScreen.syncProgressBodyDone', { completed, total });
  const isExpanded = active || expanded || failed > 0;

  return (
    <SettingsGroup insetDividers={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          active
            ? title
            : expanded
              ? t('inboxScreen.syncProgressCollapseA11y')
              : t('inboxScreen.syncProgressExpandA11y')
        }
        onPress={() => {
          if (!active) onToggle();
        }}
        style={({ pressed }) => [
          styles.syncProgressHeader,
          pressed && !active && styles.syncProgressHeaderPressed,
        ]}>
        <View style={styles.syncProgressHeaderCopy}>
          <Text style={[styles.syncProgressHeaderTitle, { color: theme.foreground }]}>{title}</Text>
          {!isExpanded ? (
            <Text style={[styles.syncProgressHeaderSub, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
              {body}
            </Text>
          ) : null}
        </View>
        {!active ? (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.foregroundEyebrow}
          />
        ) : null}
      </Pressable>
      {isExpanded ? (
        <SettingsBlock>
          <View style={styles.syncProgressBody}>
            <View style={[styles.syncProgressTrack, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.syncProgressFill,
                  {
                    backgroundColor: failed > 0 && !active ? '#F59E0B' : theme.primary,
                    width: progressWidth,
                  },
                ]}
              />
            </View>
            <Text style={[styles.syncProgressText, { color: theme.foregroundSubtitle }]}>{body}</Text>
            {active ? (
              <Text style={[styles.syncProgressStage, { color: theme.mutedForeground }]}>
                {t('inboxScreen.syncProgressStage', { stage: stageLabel(currentStage, t) })}
              </Text>
            ) : null}
          </View>
        </SettingsBlock>
      ) : null}
    </SettingsGroup>
  );
}

function AiSummaryCard({ onPress }: { onPress?: () => void }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const summary = useAiDailySummary();

  if (summary.isPending || !summary.data) return null;
  const { processedCount, commercialCount, needsActionCount, archivedCount } = summary.data;

  return (
    <SettingsGroup insetDividers={false}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? t('inboxScreen.aiSummaryOpenA11y') : undefined}
        onPress={onPress}
        style={({ pressed }) => [pressed && onPress && styles.aiSummaryPressed]}>
        <SettingsBlock label={t('inboxScreen.aiSummaryTitle', { count: processedCount })}>
          <View style={styles.aiSummaryContentRow}>
            <View style={styles.aiSummaryCopy}>
              {needsActionCount > 0 ? (
                <View style={styles.aiSummaryBadgeRow}>
                  <Badge tone="warning" label={t('inboxScreen.needsActionBadge', { count: needsActionCount })} />
                </View>
              ) : null}
              <Text style={[styles.aiCardSub, { color: theme.mutedForeground }]}>
                {t('inboxScreen.aiSummarySub', { commercial: commercialCount, archived: archivedCount })}
              </Text>
            </View>
          </View>
        </SettingsBlock>
      </Pressable>
    </SettingsGroup>
  );
}

function InboxViewToggle({
  value,
  onChange,
}: {
  value: InboxViewMode;
  onChange: (value: InboxViewMode) => void;
}) {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      options={[
        { id: 'priority' as const, label: t('inboxScreen.viewNeedsAction') },
        { id: 'all' as const, label: t('inboxScreen.viewAllMail') },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

function ArchiveSummaryCard({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <SettingsGroup>
      <HubListRow
        icon="archive-outline"
        title={t('inboxScreen.archiveRemaining', { count })}
        subtitle={t('inboxScreen.archiveHint')}
        detail={String(count)}
        detailAccent={count > 0}
        onPress={onPress}
      />
    </SettingsGroup>
  );
}

function CategoryFilterBar({
  value,
  counts,
  onChange,
}: {
  value: InboxCategoryFilter;
  counts: Record<InboxEmailCategory, number>;
  onChange: (value: InboxCategoryFilter) => void;
}) {
  const { t } = useTranslation();
  const { inboxCategoryLabel } = useDomainLabels();
  const allItems: { id: InboxCategoryFilter; label: string; count: number }[] = [
    { id: 'all' as const, label: t('inboxScreen.filterAll'), count: Object.values(counts).reduce((sum, n) => sum + n, 0) },
    { id: 'commercial' as const, label: inboxCategoryLabel.commercial, count: counts.commercial },
    { id: 'pr_sample' as const, label: inboxCategoryLabel.pr_sample, count: counts.pr_sample },
    { id: 'media' as const, label: inboxCategoryLabel.media, count: counts.media },
    { id: 'personal' as const, label: inboxCategoryLabel.personal, count: counts.personal },
    { id: 'other' as const, label: inboxCategoryLabel.other, count: counts.other },
  ];
  const items = allItems.filter((item) => item.id === 'all' || item.count > 0);

  return <FilterChipRow items={items} value={value} onChange={onChange} />;
}

function SortToggleButton({
  active,
  label,
  order,
  onPress,
}: {
  active: boolean;
  label: string;
  order: InboxSortOrder;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sortToggleButton,
        {
          borderColor: active ? theme.primary + '80' : theme.border,
          backgroundColor: active ? theme.primary + '14' : theme.card,
        },
        pressed && styles.sortToggleButtonPressed,
      ]}>
      <Ionicons
        name={order === 'ASC' ? 'arrow-up-outline' : 'arrow-down-outline'}
        size={15}
        color={active ? theme.primary : theme.foregroundEyebrow}
      />
      <Text style={[styles.sortToggleText, { color: active ? theme.primary : theme.mutedForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ClassifiedMailControls({
  categoryFilter,
  categoryCounts,
  expanded,
  sortBy,
  sortOrder,
  timeRange,
  onCategoryChange,
  onToggleExpanded,
  onSortByChange,
  onSortOrderChange,
  onTimeRangeChange,
}: {
  categoryFilter: InboxCategoryFilter;
  categoryCounts: Record<InboxEmailCategory, number>;
  expanded: boolean;
  sortBy: InboxSortBy;
  sortOrder: InboxSortOrder;
  timeRange: InboxTimeRangeFilter;
  onCategoryChange: (value: InboxCategoryFilter) => void;
  onToggleExpanded: () => void;
  onSortByChange: (value: InboxSortBy) => void;
  onSortOrderChange: (value: InboxSortOrder) => void;
  onTimeRangeChange: (value: InboxTimeRangeFilter) => void;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { inboxCategoryLabel } = useDomainLabels();

  const categoryLabel = categoryFilter === 'all' ? t('inboxScreen.filterAll') : inboxCategoryLabel[categoryFilter];
  const sortLabel = sortBy === 'MESSAGE_COUNT' ? t('inboxScreen.sortByMessageCount') : t('inboxScreen.sortByTime');
  const directionLabel = sortOrder === 'ASC' ? t('inboxScreen.sortAscending') : t('inboxScreen.sortDescending');
  const summary = t('inboxScreen.classifiedControlsSummary', {
    category: categoryLabel,
    time: t(`inboxScreen.timeFilter.${timeRange}`),
    sort: sortLabel,
    direction: directionLabel,
  });
  const handleSortPress = (nextSortBy: InboxSortBy) => {
    if (sortBy === nextSortBy) {
      onSortOrderChange(sortOrder === 'ASC' ? 'DESC' : 'ASC');
      return;
    }
    onSortByChange(nextSortBy);
    onSortOrderChange('ASC');
  };

  return (
    <SettingsGroup insetDividers={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? t('inboxScreen.classifiedControlsCollapseA11y') : t('inboxScreen.classifiedControlsExpandA11y')
        }
        onPress={onToggleExpanded}
        style={({ pressed }) => [
          styles.classifiedControlsHeader,
          pressed && styles.classifiedControlsHeaderPressed,
        ]}>
        <View style={styles.classifiedControlsHeaderCopy}>
          <Text style={[styles.classifiedControlsTitle, { color: theme.foreground }]}>
            {t('inboxScreen.classifiedControlsTitle')}
          </Text>
          <Text style={[styles.classifiedControlsSummary, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.foregroundEyebrow} />
      </Pressable>
      {expanded ? (
        <SettingsBlock>
          <View style={styles.classifiedControlStack}>
            <Text style={[styles.classifiedControlLabel, { color: theme.foregroundSubtitle }]}>
              {t('inboxScreen.categoryFilterLabel')}
            </Text>
            <CategoryFilterBar value={categoryFilter} counts={categoryCounts} onChange={onCategoryChange} />
          </View>
          <View style={styles.classifiedControlStack}>
            <Text style={[styles.classifiedControlLabel, { color: theme.foregroundSubtitle }]}>
              {t('inboxScreen.timeFilterLabel')}
            </Text>
            <FilterChipRow
              items={INBOX_TIME_RANGE_OPTIONS.map((id) => ({
                id,
                label: t(`inboxScreen.timeFilter.${id}`),
              }))}
              value={timeRange}
              onChange={onTimeRangeChange}
            />
          </View>
          <View style={styles.classifiedControlStack}>
            <Text style={[styles.classifiedControlLabel, { color: theme.foregroundSubtitle }]}>
              {t('inboxScreen.sortLabel')}
            </Text>
            <View style={styles.sortToggleRow}>
              <SortToggleButton
                active={sortBy === 'TIME'}
                label={t('inboxScreen.sortByTime')}
                order={sortBy === 'TIME' ? sortOrder : 'ASC'}
                onPress={() => handleSortPress('TIME')}
              />
              <SortToggleButton
                active={sortBy === 'MESSAGE_COUNT'}
                label={t('inboxScreen.sortByMessageCount')}
                order={sortBy === 'MESSAGE_COUNT' ? sortOrder : 'ASC'}
                onPress={() => handleSortPress('MESSAGE_COUNT')}
              />
            </View>
          </View>
        </SettingsBlock>
      ) : null}
    </SettingsGroup>
  );
}

function InboxInlineLoading() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.inlineLoading, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <ActivityIndicator accessibilityLabel={t('inboxScreen.loadingA11y')} color={theme.primary} />
    </View>
  );
}

function AgentTrainingRulesCard() {
  const { t } = useTranslation();
  const { inboxCategoryLabel } = useDomainLabels();
  const { rules, clearRules } = useAgentTrainingRules();

  if (!shouldUseBackendApi() || rules.length === 0) return null;

  return (
    <SettingsGroup title={t('inboxScreen.agentRulesTitle')} insetDividers={false}>
      <HubNavRow
        title={t('inboxScreen.agentRulesHint', { count: rules.length })}
        detail={t('inboxScreen.learningClear')}
        onPress={() => void clearRules()}
      />
      {rules.slice(0, 3).map((rule) => (
        <HubStaticRow
          key={rule.id}
          icon="sparkles-outline"
          title={rule.title}
          detail={inboxCategoryLabel[rule.category]}
          detailAccent
        />
      ))}
    </SettingsGroup>
  );
}

function LearningRecordCard({
  corrections,
  threads,
  onClear,
  apiMode,
}: {
  corrections: Record<string, { category: InboxEmailCategory; correctedAtISO: string }>;
  threads: InboxThread[];
  onClear: () => void;
  apiMode: boolean;
}) {
  const { t } = useTranslation();
  const { inboxCategoryLabel } = useDomainLabels();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const serverEntries = apiMode
    ? threads
        .filter((thread) => thread.userCorrected)
        .map((thread) => ({
          thread,
          correction: {
            category: thread.category,
            correctedAtISO: thread.classificationCorrectedAtISO ?? thread.updatedAtISO,
          },
        }))
    : [];

  const localEntries = Object.entries(corrections)
    .map(([threadId, correction]) => ({
      thread: threads.find((item) => item.id === threadId),
      correction,
    }))
    .filter((entry) => !!entry.thread);

  const entries = apiMode ? serverEntries : localEntries;

  if (entries.length === 0) return null;

  return (
    <SettingsGroup title={t('inboxScreen.learningTitle')} insetDividers={false}>
      {!apiMode ? (
        <HubNavRow
          title={t('inboxScreen.learningHint', { count: entries.length })}
          detail={t('inboxScreen.learningClear')}
          onPress={onClear}
        />
      ) : (
        <Text style={[styles.aiCardSub, { color: theme.mutedForeground }]}>
          {t('inboxScreen.learningHint', { count: entries.length })}
        </Text>
      )}
      {entries.slice(0, 3).map(({ thread, correction }) => (
        <HubStaticRow
          key={thread!.id}
          icon="school-outline"
          title={thread!.subject}
          detail={inboxCategoryLabel[correction.category]}
          detailAccent
        />
      ))}
    </SettingsGroup>
  );
}

// Thread list

type IconName = ComponentProps<typeof Ionicons>['name'];

function inboxThreadIcon(category: InboxEmailCategory): IconName {
  switch (category) {
    case 'commercial':
      return 'mail-unread-outline';
    case 'pr_sample':
      return 'gift-outline';
    case 'media':
      return 'newspaper-outline';
    case 'personal':
      return 'person-outline';
    default:
      return 'ellipsis-horizontal-outline';
  }
}

function inboxThreadDetailAccent(stage: InboxLeadStage): boolean {
  return stage === 'negotiating' || stage === 'draft_ready';
}

function InboxThreadHubRow({
  item,
  onPress,
}: {
  item: InboxThread;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { inboxCategoryLabel, inboxLeadStageLabel } = useDomainLabels();
  const correctedLocal = useInboxCorrectionStore((s) => !!s.classificationByThreadId[item.id]);
  const corrected = correctedLocal || !!item.userCorrected;

  const subtitleParts = [item.brandName];
  if (item.nextActionLabel) subtitleParts.push(item.nextActionLabel);
  else if (item.preview) subtitleParts.push(item.preview);
  if (item.riskLabel && item.category === 'commercial') subtitleParts.push(item.riskLabel);
  else if (item.actionReasons?.[0]?.message && item.category === 'commercial') {
    subtitleParts.push(item.actionReasons[0].message);
  }
  if (corrected) subtitleParts.push(t('inboxScreen.userCorrected'));
  const messageCount = Math.max(1, item.messageCount ?? 1);

  const detail =
    item.category === 'commercial'
      ? item.budgetLabel ?? inboxLeadStageLabel[item.leadStage]
      : inboxCategoryLabel[item.category];

  return (
    <HubListRow
      testID={`inbox-thread-${item.id}`}
      icon={inboxThreadIcon(item.category)}
      title={item.subject}
      subtitle={subtitleParts.join(' · ')}
      detail={detail}
      detailAccent={item.category === 'commercial' && inboxThreadDetailAccent(item.leadStage)}
      detailFooter={t('inboxScreen.threadMessageCount', { count: messageCount })}
      detailFooterAccent
      onPress={onPress}
    />
  );
}

function MailCategorySection({
  category,
  items,
  count,
  onOpen,
}: {
  category: InboxEmailCategory;
  items: InboxThread[];
  count?: number;
  onOpen: (item: InboxThread) => void;
}) {
  const { inboxCategoryLabel } = useDomainLabels();

  if (items.length === 0) return null;

  return (
    <SettingsGroup title={`${inboxCategoryLabel[category]} · ${count ?? items.length}`}>
      {items.map((item) => (
        <InboxThreadHubRow key={item.id} item={item} onPress={() => onOpen(item)} />
      ))}
    </SettingsGroup>
  );
}

// Screen

export default function InboxScreen() {
  const { t } = useTranslation();
  const { inboxCategoryLabel } = useDomainLabels();
  const router = useRouter();
  const queryClient = useQueryClient();
  useAgentTrainingRules();
  const viewMode = useInboxViewStore((s) => s.viewMode);
  const categoryFilter = useInboxViewStore((s) => s.categoryFilter);
  const timeRangeFilter = useInboxViewStore((s) => s.timeRangeFilter);
  const sortBy = useInboxViewStore((s) => s.sortBy);
  const sortOrder = useInboxViewStore((s) => s.sortOrder);
  const searchQuery = useInboxViewStore((s) => s.searchQuery);
  const setViewMode = useInboxViewStore((s) => s.setViewMode);
  const setCategoryFilter = useInboxViewStore((s) => s.setCategoryFilter);
  const setTimeRangeFilter = useInboxViewStore((s) => s.setTimeRangeFilter);
  const setSortBy = useInboxViewStore((s) => s.setSortBy);
  const setSortOrder = useInboxViewStore((s) => s.setSortOrder);
  const setSearchQuery = useInboxViewStore((s) => s.setSearchQuery);
  const setScrollY = useInboxViewStore((s) => s.setScrollY);
  const scrollRef = useRef<ScrollView>(null);
  const bodyTopYRef = useRef(0);
  const pendingBodyScrollRef = useRef(false);
  const shouldRestoreScrollRef = useRef(false);
  const autoSyncedMailboxRef = useRef<string | null>(null);
  const lastProcessingSignatureRef = useRef<string | null>(null);
  const wasProcessingActiveRef = useRef(false);
  const scrollTopVisibleUntilRef = useRef(0);
  const mailbox = useMailboxConnection();
  const syncStatus = useMailboxSyncStatus();
  const [syncLookback, setSyncLookback] = useState<MailboxSyncLookback>(DEFAULT_SYNC_LOOKBACK);
  const [syncProgressExpanded, setSyncProgressExpanded] = useState(true);
  const [showSyncCompleteCard, setShowSyncCompleteCard] = useState(false);
  const [classifiedControlsExpanded, setClassifiedControlsExpanded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(
    () => useInboxViewStore.getState().scrollY > SCROLL_TOP_THRESHOLD
  );
  const [lastSync, setLastSync] = useState<MailSyncResult | null>(null);
  const corrections = useInboxCorrectionStore((s) => s.classificationByThreadId);
  const clearAllCorrections = useInboxCorrectionStore((s) => s.clearAllCorrections);
  const lastSyncCompletedKey = lastSync?.endedAtISO ?? null;

  const restoreScrollY = useCallback(() => {
    const y = useInboxViewStore.getState().scrollY;
    if (y <= 0) return;
    const scroll = () => scrollRef.current?.scrollTo({ y, animated: false });
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
  }, []);

  const listFilters = useMemo(() => {
    if (viewMode === 'priority') {
      return {
        needsAction: true,
        ...(categoryFilter !== 'all' ? { emailCategory: categoryFilter } : {}),
      } as const;
    }
    return {
      timeRange: timeRangeFilter,
      sortBy,
      sortDirection: sortOrder,
      ...(categoryFilter !== 'all' ? { emailCategory: categoryFilter } : {}),
    } as const;
  }, [viewMode, categoryFilter, timeRangeFilter, sortBy, sortOrder]);

  const inbox = useInboxThreads({ filters: listFilters });
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const processingActive = !!syncStatus.data?.active;

  const resetInboxScroll = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setScrollY(0);
    setShowScrollTop(false);
  }, [setScrollY]);

  const scrollToInboxBody = useCallback(() => {
    const scroll = () =>
      scrollRef.current?.scrollTo({ y: Math.max(0, bodyTopYRef.current - spacing.sm), animated: true });
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
  }, []);

  const handleAiSummaryPress = useCallback(() => {
    pendingBodyScrollRef.current = true;
    setViewMode('priority');
    setCategoryFilter('commercial');
    setSearchQuery('');
  }, [setCategoryFilter, setSearchQuery, setViewMode]);

  const handleBodyLayout = useCallback((event: LayoutChangeEvent) => {
    bodyTopYRef.current = event.nativeEvent.layout.y;
    if (!pendingBodyScrollRef.current) return;
    pendingBodyScrollRef.current = false;
    scrollToInboxBody();
  }, [scrollToInboxBody]);

  useEffect(() => {
    if (processingActive) {
      setSyncProgressExpanded(true);
    } else if (wasProcessingActiveRef.current) {
      setSyncProgressExpanded(false);
    }
    wasProcessingActiveRef.current = processingActive;
  }, [processingActive]);

  useEffect(() => {
    if (!lastSyncCompletedKey || !lastSync || processingActive || lastSync.processed <= 0) return;
    setShowSyncCompleteCard(true);
    const timer = setTimeout(() => setShowSyncCompleteCard(false), SYNC_COMPLETE_CARD_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [lastSyncCompletedKey, lastSync, processingActive]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const y = contentOffset.y;
      setScrollY(y);
      setShowScrollTop(y > SCROLL_TOP_THRESHOLD || Date.now() < scrollTopVisibleUntilRef.current);

      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + y);
      if (
        distanceFromBottom < LOAD_MORE_THRESHOLD &&
        inbox.hasNextPage &&
        !inbox.isFetchingNextPage &&
        !inbox.isRefetching
      ) {
        void inbox.fetchNextPage();
      }
    },
    [inbox, setScrollY]
  );

  const runMailboxSync = useCallback(async (lookback: MailboxSyncLookback) => {
    if (shouldUseBackendApi()) {
      try {
        const result = await syncMailbox({ lookback });
        if (result) setLastSync(result);
      } catch {
        setLastSync(null);
      }
    }
    await Promise.all([
      invalidateTenantScopedQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['inbox'] }),
      queryClient.invalidateQueries({ queryKey: ['decisions'] }),
      queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['account', 'agent-training-rules'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'connection'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'sync-status'] }),
      queryClient.invalidateQueries({ queryKey: ['account', 'overview'] }),
    ]);
  }, [queryClient]);
  const refreshInbox = useCallback(() => runMailboxSync(syncLookback), [runMailboxSync, syncLookback]);
  const { refreshing, onRefresh } = useTabRefresh(refreshInbox);

  const processingSignature = useMemo(() => {
    const status = syncStatus.data;
    if (!status) return null;
    return [
      status.active ? 'active' : 'idle',
      status.mailProcessing.pending,
      status.mailProcessing.processing,
      status.mailProcessing.completed,
      status.mailProcessing.failed,
      status.mailProcessing.skipped,
      status.briefExtraction.pending,
      status.briefExtraction.processing,
      status.briefExtraction.completed,
      status.briefExtraction.failed,
      status.briefExtraction.skipped,
      status.lastSync?.processed ?? 0,
      status.lastSync?.success ?? 0,
      status.lastSync?.failed ?? 0,
      status.lastSync?.endedAtISO ?? '',
    ].join('|');
  }, [syncStatus.data]);

  useEffect(() => {
    if (!shouldUseBackendApi() || !processingSignature) return;
    const status = syncStatus.data;
    if (lastProcessingSignatureRef.current === null) {
      lastProcessingSignatureRef.current = processingSignature;
      if (!status || !wasProcessingActiveRef.current) return;
    }
    if (lastProcessingSignatureRef.current === processingSignature) return;
    lastProcessingSignatureRef.current = processingSignature;

    void Promise.all([
      invalidateTenantScopedQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['inbox'] }),
      queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['decisions'] }),
      queryClient.invalidateQueries({ queryKey: ['home', 'action-log'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'connection'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'sync-status'] }),
    ]);
  }, [processingSignature, queryClient]);

  useFocusEffect(
    useCallback(() => {
      shouldRestoreScrollRef.current = useInboxViewStore.getState().scrollY > 0;
      if (inbox.isPending || inbox.error) return;
      restoreScrollY();
      return () => {
        shouldRestoreScrollRef.current = false;
      };
    }, [inbox.isPending, inbox.error, restoreScrollY])
  );

  const handleContentSizeChange = useCallback(() => {
    if (!shouldRestoreScrollRef.current) return;
    restoreScrollY();
    shouldRestoreScrollRef.current = false;
  }, [restoreScrollY]);

  useFocusEffect(
    useCallback(() => {
      const emailAddress = mailbox.data?.emailAddress;
      if (!shouldUseBackendApi() || !emailAddress) return;
      if (autoSyncedMailboxRef.current === emailAddress) return;
      autoSyncedMailboxRef.current = emailAddress;
      void runMailboxSync(DEFAULT_SYNC_LOOKBACK);
    }, [mailbox.data?.emailAddress, runMailboxSync])
  );

  if (inbox.error && !inbox.data?.length) {
    return (
      <PlaceholderScreen title={t('inboxScreen.errorTitle')} description={t('inboxScreen.errorDesc')}>
        <QueryRetryCard
          message={inbox.error.message}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['inbox'] })}
        />
      </PlaceholderScreen>
    );
  }

  const allThreads = inbox.data ?? [];
  const initialLoading = inbox.isPending && allThreads.length === 0;
  const commercial = allThreads.filter((thread) => thread.category === 'commercial');
  const nonCommercial = allThreads.filter((thread) => thread.category !== 'commercial');
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchableThreads = normalizedSearch
    ? allThreads.filter((thread) =>
        [
          thread.brandName,
          thread.subject,
          thread.preview,
          thread.budgetLabel,
          thread.riskLabel,
          thread.nextActionLabel,
          inboxCategoryLabel[thread.category],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : allThreads;

  const grouped = searchableThreads.reduce<Record<InboxEmailCategory, InboxThread[]>>(
    (acc, thread) => {
      if (!acc[thread.category]) acc[thread.category] = [];
      acc[thread.category].push(thread);
      return acc;
    },
    {} as Record<InboxEmailCategory, InboxThread[]>
  );
  const categoryCounts = inbox.categoryCounts;

  const openThread = (item: InboxThread) => router.push(`/inbox/${item.id}` as Href);
  const allModeCategories: InboxEmailCategory[] =
    categoryFilter === 'all'
      ? ['commercial', 'pr_sample', 'media', 'personal', 'other']
      : [categoryFilter];
  const visibleAllModeCount = allModeCategories.reduce((sum, category) => sum + (grouped[category]?.length ?? 0), 0);
  const nonCommercialTotalCount = Object.entries(categoryCounts)
    .filter(([category]) => category !== 'commercial')
    .reduce((sum, [, count]) => sum + count, 0);
  const lastSyncCounts = lastSync ? syncResultCounts(lastSync) : null;

  const toolbar = (
    <>
      <InboxConnectionBanner />
      <InboxMailboxStatusCard
        onSync={onRefresh}
        syncing={refreshing || inbox.isRefetching}
        processingActive={processingActive}
        syncLookback={syncLookback}
        onSyncLookbackChange={setSyncLookback}
      />
      <InboxSyncProgressCard
        expanded={syncProgressExpanded}
        onToggle={() => setSyncProgressExpanded((value) => !value)}
        showComplete={showSyncCompleteCard}
        status={syncStatus.data}
      />
      {lastSync && (lastSync.processed > 0 || lastSync.upToDate) && lastSyncCounts ? (
        <HubCallout
          title={
            processingActive
              ? t('inboxScreen.syncResultTitleProcessing')
              : lastSyncCounts.newCount > 0
                ? t('inboxScreen.syncResultTitle', { count: lastSyncCounts.newCount })
                : t('inboxScreen.syncResultTitleUpToDate')
          }
          body={
            processingActive
              ? t('inboxScreen.syncResultBodyProcessing')
              : syncResultBody(lastSync, lastSyncCounts, t)
          }
        />
      ) : null}
      <AiSummaryCard onPress={handleAiSummaryPress} />
      <InboxViewToggle
        value={viewMode}
        onChange={(next) => {
          setViewMode(next);
          resetInboxScroll();
          if (next === 'priority') {
            setCategoryFilter('all');
            setSearchQuery('');
          }
        }}
      />
    </>
  );

  return (
    <View style={[styles.screenFrame, { backgroundColor: theme.background }]}>
      <HubScreen
        testID="screen-inbox"
        eyebrow={t('tabs.inbox')}
        title={viewMode === 'priority' ? t('inboxScreen.titlePriority') : t('inboxScreen.titleAll')}
        toolbar={toolbar}
        refreshing={refreshing || inbox.isRefetching}
        onRefresh={onRefresh}
        scrollRef={scrollRef}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onBodyLayout={handleBodyLayout}>
        {initialLoading ? (
          <InboxInlineLoading />
        ) : viewMode === 'priority' ? (
          <>
            <MailCategorySection
              category="commercial"
              items={commercial}
              count={categoryCounts.commercial}
              onOpen={openThread}
            />
            {commercial.length === 0 ? (
              <EmptyStateCard
                title={t('inboxScreen.emptyCommercialTitle')}
                description={t('inboxScreen.emptyCommercialDesc')}
                primaryAction={{
                  label: t('inboxScreen.viewAllMail'),
                  onPress: () => {
                    setViewMode('all');
                    resetInboxScroll();
                  },
                }}
                secondaryAction={{
                  label: t('inboxScreen.emptyConnectMailbox'),
                  onPress: () => router.push('/onboarding/email' as Href),
                }}
              />
            ) : null}
            {nonCommercialTotalCount > 0 ? (
              <ArchiveSummaryCard
                count={nonCommercialTotalCount}
                onPress={() => setViewMode('all')}
              />
            ) : null}
            {inbox.isFetchingNextPage ? <InboxInlineLoading /> : null}
          </>
        ) : (
          <>
            <AgentTrainingRulesCard />
            <LearningRecordCard
              corrections={corrections}
              threads={allThreads}
              onClear={clearAllCorrections}
              apiMode={shouldUseBackendApi()}
            />
            <HubSearchField
              value={searchQuery}
              resultCount={searchableThreads.length}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              accessibilityLabel={t('inboxScreen.searchA11y')}
              placeholder={t('inboxScreen.searchPlaceholder')}
            />
            <ClassifiedMailControls
              categoryFilter={categoryFilter}
              categoryCounts={categoryCounts}
              expanded={classifiedControlsExpanded}
              timeRange={timeRangeFilter}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onCategoryChange={setCategoryFilter}
              onToggleExpanded={() => setClassifiedControlsExpanded((value) => !value)}
              onTimeRangeChange={setTimeRangeFilter}
              onSortByChange={setSortBy}
              onSortOrderChange={setSortOrder}
            />
            {visibleAllModeCount > 0 ? (
              allModeCategories.map((category) => (
                <MailCategorySection
                  key={category}
                  category={category}
                  items={grouped[category] ?? []}
                  count={categoryCounts[category]}
                  onOpen={openThread}
                />
              ))
            ) : (
              <EmptyStateCard
                title={t('inboxScreen.emptySearchTitle')}
                description={t('inboxScreen.emptySearchDesc')}
                primaryAction={{
                  label: t('inboxScreen.emptyClearSearch'),
                  onPress: () => setSearchQuery(''),
                }}
              />
            )}
            {inbox.isFetchingNextPage ? <InboxInlineLoading /> : null}
          </>
        )}
      </HubScreen>
      {showScrollTop ? (
        <Pressable
          testID="inbox-scroll-top-button"
          accessibilityRole="button"
          accessibilityLabel={t('inboxScreen.scrollTopA11y')}
          onPress={() => {
            scrollTopVisibleUntilRef.current = Date.now() + 280;
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            setTimeout(() => {
              setScrollY(0);
              setShowScrollTop(false);
            }, 280);
          }}
          style={({ pressed }) => [
            styles.scrollTopButton,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
            },
            pressed && styles.scrollTopButtonPressed,
          ]}>
          <Ionicons name="chevron-up" size={24} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  screenFrame: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aiCardSub: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  aiSummaryPressed: { opacity: 0.78 },
  aiSummaryContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aiSummaryCopy: { flex: 1, minWidth: 0, gap: spacing.sm },
  aiSummaryBadgeRow: { alignSelf: 'flex-start' },
  classifiedControlStack: { gap: spacing.xs },
  classifiedControlLabel: { fontSize: fontSize.caption, fontWeight: '700' },
  classifiedControlsHeader: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  classifiedControlsHeaderPressed: { opacity: 0.72 },
  classifiedControlsHeaderCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  classifiedControlsTitle: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    fontWeight: '800',
  },
  classifiedControlsSummary: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  sortToggleRow: { flexDirection: 'row', gap: spacing.sm },
  sortToggleButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sortToggleButtonPressed: { opacity: 0.72 },
  sortToggleText: { fontSize: fontSize.caption, fontWeight: '800' },
  inlineLoading: {
    minHeight: 96,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailboxStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mailboxStatusContent: { gap: spacing.sm },
  mailboxStatusMain: { flex: 1, minWidth: 0 },
  mailboxIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  mailboxIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mailboxIdentityText: { flex: 1, minWidth: 0, gap: spacing.xs },
  mailboxAddressText: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: '700',
  },
  mailboxLastSyncText: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '600',
  },
  mailboxSyncButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    flexShrink: 0,
  },
  mailboxSyncButtonPressed: { opacity: 0.72 },
  mailboxSyncButtonDisabled: { opacity: 0.55 },
  mailboxSyncingText: {
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  syncLookbackBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  syncLookbackLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    flexShrink: 0,
  },
  syncProgressHeader: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  syncProgressHeaderPressed: { opacity: 0.72 },
  syncProgressHeaderCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  syncProgressHeaderTitle: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    fontWeight: '800',
  },
  syncProgressHeaderSub: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  syncProgressBody: { gap: spacing.sm },
  syncProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  syncProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  syncProgressText: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  syncProgressStage: { fontSize: fontSize.caption, fontWeight: '700' },
  scrollTopButton: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  scrollTopButtonPressed: { transform: [{ scale: 0.98 }] },
});
