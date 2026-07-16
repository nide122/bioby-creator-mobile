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
  HubScreen,
  HubSearchField,
  QueryRetryCard,
  SegmentedControl,
  SettingsBlock,
  SettingsGroup,
  SettingsRow,
  hubListStyles,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { BrandChip } from '@/components/brands/BrandChip';
import { LeadValueBandIconShell, LeadValueBandSectionHeader } from '@/components/inbox/LeadValueBandChrome';
import { InboxPriorityIconShell, InboxPrioritySectionHeader } from '@/components/inbox/InboxPriorityChrome';
import { RiskBanner } from '@/components/inbox/RiskBanner';
import { BasicMailboxInbox } from '@/components/inbox/BasicMailboxInbox';
import {
  InboxAddDealCard,
  InboxCollaborationCard,
  InboxEmailStatusCard,
  InboxNeedsActionToggle,
  InboxPriorityFilterRow,
} from '@/components/inbox/InboxHubCards';
import { CreatorVerificationBadge } from '@/components/inbox/CreatorVerificationBadge';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useTranslation } from 'react-i18next';

import type { InboxEmailCategory, InboxPriority, InboxThread, LeadValueBand } from '@/src/types/domain';
import { shouldShowInboxRateCardBanner } from '@/src/lib/inbox-rate-card-banner';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  registerMailboxSubscription,
  renewMailboxSubscription,
  retryFailedMailboxWritebackJobs,
  syncMailbox,
  type MailboxSyncLookback,
  type MailboxSyncStatus,
  type MailProcessingSummary,
  type MailSyncResult,
} from '@/src/api/mailbox-api';
import { useMailboxConnection } from '@/src/hooks/use-mailbox-connection';
import { useMailboxSyncStatus } from '@/src/hooks/use-mailbox-sync-status';
import { useInboxThreads, useAiDailySummary } from '@/src/hooks/use-inbox-threads';
import { useRateCardPackages, rateCardPackagesQueryKey } from '@/src/hooks/use-growth';
import { useAuthSessionReady } from '@/src/hooks/use-auth-session-ready';
import { useTabRefresh } from '@/src/hooks/use-tab-refresh';
import { resolveMailboxPushMissingReason, resolveMailboxRepairError } from '@/src/lib/mailbox-push-i18n';
import { formatInboxMessageStats, hasUnreadMessages } from '@/src/lib/inbox-message-stats';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { invalidateDecisionQueueQueries } from '@/src/lib/invalidate-deal-queries';
import {
  applyMailboxLastSyncToCache,
  refreshInboxQueries,
} from '@/src/lib/mailbox-sync-display';
import { inboxRiskReasons } from '@/src/lib/inbox-risk-badges';
import { localizedVisibleRiskLabel } from '@/src/lib/inbox-detail-labels';
import { contractWarningSeverity, listContractWarningFlags, isContractRiskLabel } from '@/src/lib/contract-warning';
import { formatExceptionalBudgetLabel } from '@/src/lib/exceptional-budget-label';
import { countPriorityLeadValueBands, resolvePriorityLeadValueBand } from '@/src/lib/priority-lead-value-band';
import { filterThreadsByPriorityChip } from '@/src/lib/inbox-priority-filter';
import { isInboxPriorityUiEnabled } from '@/src/lib/inbox-priority-feature';
import { translateInboxNextAction } from '@/src/lib/inbox-next-action-labels';
import { inboxPriorityAccent, inboxPriorityBadgeTone } from '@/src/lib/inbox-priority-visuals';
import {
  countArchivedInboxPriority,
  countInboxPriorities,
  resolveDisplayInboxPriority,
} from '@/src/lib/resolve-inbox-priority';
import { leadValueBandAccent } from '@/src/lib/lead-value-band-visuals';
import {
  commercialProgressDetailAccent,
  resolveCommercialProgressLabel,
} from '@/src/lib/opportunity-progress-label';
import { useSessionStore } from '@/src/stores/session-store';
import { isCreatorAiInboxEnabled, type CreatorVerificationStatus } from '@/src/lib/creator-verification';
import { useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';
import {
  useInboxViewStore,
  type InboxCategoryFilter,
  type InboxSortBy,
  type InboxSortOrder,
  type InboxTimeRangeFilter,
  type InboxViewMode,
} from '@/src/stores/inbox-view-store';

const DEFAULT_SYNC_LOOKBACK: MailboxSyncLookback = 'INCREMENTAL';
const SYNC_LOOKBACK_OPTIONS: readonly MailboxSyncLookback[] = [
  'INCREMENTAL',
  'ONE_WEEK',
  'ONE_MONTH',
  'THREE_MONTHS',
  'ALL',
];
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
  syncStatus,
  onReconnect,
  onRegisterWatch,
  onRenewWatch,
  onRetryWriteback,
  repairAction,
  repairError,
  verificationStatus,
}: {
  onSync?: () => void;
  syncing?: boolean;
  processingActive?: boolean;
  syncLookback: MailboxSyncLookback;
  onSyncLookbackChange: (value: MailboxSyncLookback) => void;
  syncStatus?: MailboxSyncStatus | null;
  onReconnect?: () => void;
  onRegisterWatch?: () => void;
  onRenewWatch?: () => void;
  onRetryWriteback?: () => void;
  repairAction?: 'reconnect' | 'watch' | 'writeback' | null;
  repairError?: string | null;
  verificationStatus?: CreatorVerificationStatus;
}) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const mailbox = useMailboxConnection();

  const connection = syncStatus?.connection ?? mailbox.data;
  if (!shouldUseBackendApi() || !connection?.emailAddress) return null;

  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';
  const formatDateTime = (value?: string | null) =>
    value
      ? new Date(value).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;
  const lastSyncLabel = connection.lastSyncAtISO
    ? new Date(connection.lastSyncAtISO).toLocaleString(
        locale,
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      )
    : t('inboxScreen.mailboxNeverSynced');
  const provider = connection.provider ?? 'IMAP';
  const capabilities = connection.capabilities ?? [];
  const watchExpiresAtISO = connection.watchExpiresAtISO ?? syncStatus?.subscription?.nextExpiresAtISO;
  const watchExpiresLabel = formatDateTime(watchExpiresAtISO);
  const subscription = syncStatus?.subscription;
  const writeback = syncStatus?.writeback;
  const nativeSyncEnabled = provider === 'GOOGLE' || provider === 'MICROSOFT';
  const watchExpired = watchExpiresAtISO ? new Date(watchExpiresAtISO).getTime() <= Date.now() : false;
  const hasAnyWatch = (subscription?.active ?? 0) > 0 || !!watchExpiresAtISO;
  const hasPushWatch = ((subscription?.active ?? 0) > 0 || !!watchExpiresAtISO) && !watchExpired;
  const watchNeedsRenewal =
    watchExpired || (subscription?.renewalDue ?? 0) + (subscription?.expired ?? 0) + (subscription?.error ?? 0) > 0;
  const writebackActive = (writeback?.pending ?? 0) + (writeback?.processing ?? 0);
  const writebackFailed = writeback?.failed ?? 0;
  const pushRegistrationConfigured = subscription?.pushRegistrationConfigured ?? false;
  const pushRegistrationMissingReason = subscription?.pushRegistrationMissingReason ?? null;
  const pushUnavailable = nativeSyncEnabled && !pushRegistrationConfigured;
  const aiInboxEnabled = isCreatorAiInboxEnabled(verificationStatus);
  const showWatchRepair =
    nativeSyncEnabled &&
    !connection.reconsentRequired &&
    pushRegistrationConfigured &&
    (!hasPushWatch || watchNeedsRenewal);
  const showPushConfigHint =
    nativeSyncEnabled &&
    !connection.reconsentRequired &&
    (subscription?.pushSetupRequired ?? false) &&
    !hasPushWatch;
  const statusChips = [
    {
      id: 'provider',
      icon: provider === 'GOOGLE' ? 'logo-google' : provider === 'MICROSOFT' ? 'logo-microsoft' : 'server-outline',
      label: provider === 'GOOGLE' ? 'Gmail API' : provider === 'MICROSOFT' ? 'Graph Mail' : provider,
      tone: nativeSyncEnabled ? 'good' : 'neutral',
    },
    {
      id: 'send',
      icon: 'paper-plane-outline',
      label:
        capabilities.includes('SEND') && capabilities.includes('NATIVE_DRAFTS')
          ? t('inboxScreen.mailboxSendReady')
          : t('inboxScreen.mailboxSendLimited'),
      tone: capabilities.includes('SEND') && capabilities.includes('NATIVE_DRAFTS') ? 'good' : 'neutral',
    },
    {
      id: 'sync',
      icon: 'mail-unread-outline',
      label: capabilities.includes('SYNC') ? t('inboxScreen.mailboxSyncReady') : t('inboxScreen.mailboxSyncLimited'),
      tone: capabilities.includes('SYNC') ? 'good' : 'neutral',
    },
  ] as const;

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
                {verificationStatus ? (
                  <CreatorVerificationBadge status={verificationStatus} compact />
                ) : null}
                <Text style={[styles.mailboxAddressText, { color: theme.foreground }]}>
                  {connection.emailAddress}
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
                <Ionicons name="refresh-outline" size={16} color={theme.primary} />
              )}
              <Text style={[styles.mailboxSyncButtonLabel, { color: theme.primary }]} numberOfLines={1}>
                {syncing ? t('inboxScreen.syncMailboxCtaBusy') : t('inboxScreen.syncMailboxCta')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {syncing || processingActive ? (
          <Text style={[styles.mailboxSyncingText, { color: theme.primary }]}>
            {t(aiInboxEnabled ? 'inboxScreen.syncingInline' : 'inboxScreen.syncingInlineMailbox')}
          </Text>
        ) : null}
        <View style={styles.mailboxChipRow}>
          {statusChips.map((chip) => (
            <View
              key={chip.id}
              style={[
                styles.mailboxStatusChip,
                {
                  borderColor: chip.tone === 'good' ? theme.primary + '55' : theme.border,
                  backgroundColor: chip.tone === 'good' ? theme.primary + '10' : theme.secondary,
                },
              ]}>
              <Ionicons
                name={chip.icon as ComponentProps<typeof Ionicons>['name']}
                size={14}
                color={chip.tone === 'good' ? theme.primary : theme.foregroundEyebrow}
              />
              <Text
                style={[
                  styles.mailboxStatusChipText,
                  { color: chip.tone === 'good' ? theme.primary : theme.mutedForeground },
                ]}
                numberOfLines={1}>
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.mailboxTelemetryStack}>
          {!pushUnavailable ? (
            <View style={styles.mailboxTelemetryRow}>
              <Ionicons
                name={hasPushWatch ? 'radio-outline' : 'time-outline'}
                size={15}
                color={hasPushWatch ? theme.primary : theme.foregroundEyebrow}
              />
              <Text style={[styles.mailboxTelemetryText, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
                {hasPushWatch
                  ? t('inboxScreen.mailboxWatchActive', { time: watchExpiresLabel ?? t('inboxScreen.mailboxWatchUnknown') })
                  : nativeSyncEnabled
                    ? t('inboxScreen.mailboxWatchPending')
                    : t('inboxScreen.mailboxWatchPolling')}
              </Text>
            </View>
          ) : null}
          {writeback ? (
            <View style={styles.mailboxTelemetryRow}>
              <Ionicons
                name={writebackFailed > 0 ? 'warning-outline' : writebackActive > 0 ? 'sync-outline' : 'checkmark-circle-outline'}
                size={15}
                color={writebackFailed > 0 ? '#B45309' : writebackActive > 0 ? theme.primary : theme.foregroundEyebrow}
              />
              <Text
                style={[
                  styles.mailboxTelemetryText,
                  { color: writebackFailed > 0 ? '#B45309' : theme.foregroundSubtitle },
                ]}
                numberOfLines={1}>
                {writebackFailed > 0
                  ? t('inboxScreen.mailboxWritebackFailed', { count: writebackFailed })
                  : writebackActive > 0
                    ? t('inboxScreen.mailboxWritebackActive', { count: writebackActive })
                    : t('inboxScreen.mailboxWritebackReady')}
              </Text>
            </View>
          ) : null}
          {connection.reconsentRequired ? (
            <View style={styles.mailboxTelemetryRow}>
              <Ionicons name="key-outline" size={15} color="#B45309" />
              <Text style={[styles.mailboxTelemetryText, { color: '#B45309' }]} numberOfLines={1}>
                {t('inboxScreen.mailboxReconsentRequired')}
              </Text>
            </View>
          ) : null}
        </View>
        {connection.reconsentRequired || showWatchRepair || showPushConfigHint || writebackFailed > 0 ? (
          <View style={styles.mailboxRepairStack}>
            <View style={styles.mailboxRepairActions}>
              {connection.reconsentRequired && onReconnect ? (
                <MailboxRepairButton
                  icon="key-outline"
                  label={t('inboxScreen.mailboxReconnectCta')}
                  a11yLabel={t('inboxScreen.mailboxReconnectA11y')}
                  onPress={onReconnect}
                  loading={repairAction === 'reconnect'}
                />
              ) : null}
              {showWatchRepair && (hasAnyWatch ? onRenewWatch : onRegisterWatch) ? (
                <MailboxRepairButton
                  icon={hasAnyWatch ? 'refresh-circle-outline' : 'radio-outline'}
                  label={hasAnyWatch ? t('inboxScreen.mailboxRenewWatchCta') : t('inboxScreen.mailboxRegisterWatchCta')}
                  a11yLabel={hasAnyWatch ? t('inboxScreen.mailboxRenewWatchA11y') : t('inboxScreen.mailboxRegisterWatchA11y')}
                  onPress={hasAnyWatch ? onRenewWatch : onRegisterWatch}
                  loading={repairAction === 'watch'}
                />
              ) : null}
              {writebackFailed > 0 && onRetryWriteback ? (
                <MailboxRepairButton
                  icon="repeat-outline"
                  label={t('inboxScreen.mailboxRetryWritebackCta')}
                  a11yLabel={t('inboxScreen.mailboxRetryWritebackA11y')}
                  onPress={onRetryWriteback}
                  loading={repairAction === 'writeback'}
                />
              ) : null}
            </View>
            {repairError ? (
              <Text style={[styles.mailboxRepairError, { color: '#B45309' }]} numberOfLines={2}>
                {repairError}
              </Text>
            ) : showPushConfigHint ? (
              <Text style={[styles.mailboxRepairError, { color: theme.foregroundSubtitle }]} numberOfLines={3}>
                {resolveMailboxPushMissingReason(pushRegistrationMissingReason, t)}
              </Text>
            ) : writeback?.lastErrorMessage && writebackFailed > 0 ? (
              <Text style={[styles.mailboxRepairError, { color: theme.foregroundSubtitle }]} numberOfLines={2}>
                {writeback.lastErrorMessage}
              </Text>
            ) : null}
          </View>
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

function MailboxRepairButton({
  icon,
  label,
  a11yLabel,
  onPress,
  loading,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  a11yLabel: string;
  onPress?: () => void;
  loading?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.mailboxRepairButton,
        {
          borderColor: theme.border,
          backgroundColor: theme.card,
        },
        pressed && !loading && styles.mailboxRepairButtonPressed,
        loading && styles.mailboxRepairButtonDisabled,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Ionicons name={icon} size={15} color={theme.primary} />
      )}
      <Text style={[styles.mailboxRepairButtonText, { color: theme.primary }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
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
  const writebackActive = (status.writeback?.pending ?? 0) + (status.writeback?.processing ?? 0);
  const writebackFailed = status.writeback?.failed ?? 0;
  const mailFailed = status.mailProcessing.failed + (status.lastSync?.failed ?? 0);
  const briefFailed = status.briefExtraction.failed;
  const failed = mailFailed + briefFailed + writebackFailed;
  const pending = summaryTotalCount > 0 ? summary.pending : 0;
  const processing = summaryTotalCount > 0 ? summary.processing : 0;
  const writebackOnlyActive = status.active && !hasActiveProcessing(status.mailProcessing) && !hasActiveProcessing(status.briefExtraction) && writebackActive > 0;
  const displayFailed = summaryTotalCount > 0 ? summary.failed : Math.max(writebackFailed, status.lastSync?.failed ?? 0);
  const total = Math.max(summaryTotalCount, writebackActive, status.lastSync?.processed ?? 0, status.active ? 1 : 0);
  const completed =
    writebackOnlyActive
      ? Math.max(0, writebackActive - (status.writeback?.processing ?? 0) - (status.writeback?.pending ?? 0))
      : summaryTotalCount > 0
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
    ? writebackOnlyActive
      ? t('inboxScreen.writebackProgressTitleActive')
      : t('inboxScreen.syncProgressTitleActive')
    : failed > 0
      ? briefFailed > 0 && mailFailed === 0 && writebackFailed === 0
        ? t('inboxScreen.syncProgressTitleBriefFailed')
        : t('inboxScreen.syncProgressTitleFailed')
      : t('inboxScreen.syncProgressTitleDone');
  const body = active
    ? writebackOnlyActive
      ? t('inboxScreen.writebackProgressBodyActive', {
          processing: status.writeback?.processing ?? 0,
          pending: status.writeback?.pending ?? 0,
        })
      : t('inboxScreen.syncProgressBodyActive', { completed, total, processing, pending })
    : failed > 0
      ? briefFailed > 0 && mailFailed === 0 && writebackFailed === 0
        ? t('inboxScreen.syncProgressBodyBriefFailed', { failed: briefFailed })
        : t('inboxScreen.syncProgressBodyFailed', { failed })
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
            {active && !writebackOnlyActive ? (
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

function InboxManualEntryBanner() {
  const { t } = useTranslation();
  const router = useRouter();

  if (!shouldUseBackendApi()) {
    return null;
  }

  return (
    <HubBanner
      testID="inbox-manual-entry-banner"
      primaryTestID="inbox-manual-entry-cta"
      title={t('inboxScreen.manualEntryBannerTitle')}
      body={t('inboxScreen.manualEntryBannerBody')}
      primaryLabel={t('inboxScreen.manualEntryBannerCta')}
      onPrimary={() => router.push('/inbox/manual' as Href)}
    />
  );
}

function InboxRateCardBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const rateCard = useRateCardPackages();

  if (!shouldShowInboxRateCardBanner({
    isPending: rateCard.isPending,
    packageCount: rateCard.data?.length ?? 0,
  })) {
    return null;
  }

  return (
    <HubBanner
      testID="inbox-rate-card-banner"
      primaryTestID="inbox-rate-card-banner-cta"
      title={t('inboxScreen.rateCardMissingTitle')}
      body={t('inboxScreen.rateCardMissingBody')}
      primaryLabel={t('inboxScreen.rateCardMissingCta')}
      onPrimary={() => router.push('/pricing-edit?new=1' as Href)}
    />
  );
}

function InboxReclassificationBanner() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const active = useSessionStore((s) => s.inboxReclassificationActive);

  if (!shouldUseBackendApi() || !active) return null;

  return (
    <View style={[reclassifyBannerStyles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <ActivityIndicator size="small" color={theme.primary} />
      <Text style={[reclassifyBannerStyles.text, { color: theme.foreground }]} numberOfLines={2}>
        {t('inboxScreen.reclassificationBanner')}
      </Text>
    </View>
  );
}

function AiSummaryCard({
  onPress,
  mailboxProcessingActive,
}: {
  onPress?: () => void;
  mailboxProcessingActive?: boolean;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const summary = useAiDailySummary({ mailboxProcessingActive });

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
  titleKey = 'inboxScreen.archiveRemaining',
}: {
  count: number;
  onPress: () => void;
  titleKey?: 'inboxScreen.archiveRemaining' | 'inboxScreen.archivedBandRemaining';
}) {
  const { t } = useTranslation();

  return (
    <SettingsGroup>
      <HubListRow
        iconElement={<LeadValueBandIconShell band="archived" icon="archive-outline" />}
        title={t(titleKey, { count })}
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
    { id: 'spam' as const, label: inboxCategoryLabel.spam, count: counts.spam },
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
  const sortLabel =
    sortBy === 'MESSAGE_COUNT'
      ? t('inboxScreen.sortByMessageCount')
      : sortBy === 'CLASSIFICATION_SCORE'
        ? t('inboxScreen.sortByClassificationScore')
        : t('inboxScreen.sortByTime');
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
    onSortOrderChange('DESC');
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
                order={sortBy === 'TIME' ? sortOrder : 'DESC'}
                onPress={() => handleSortPress('TIME')}
              />
              <SortToggleButton
                active={sortBy === 'MESSAGE_COUNT'}
                label={t('inboxScreen.sortByMessageCount')}
                order={sortBy === 'MESSAGE_COUNT' ? sortOrder : 'DESC'}
                onPress={() => handleSortPress('MESSAGE_COUNT')}
              />
              <SortToggleButton
                active={sortBy === 'CLASSIFICATION_SCORE'}
                label={t('inboxScreen.sortByClassificationScore')}
                order={sortBy === 'CLASSIFICATION_SCORE' ? sortOrder : 'DESC'}
                onPress={() => handleSortPress('CLASSIFICATION_SCORE')}
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
    case 'spam':
      return 'ban-outline';
    default:
      return 'ellipsis-horizontal-outline';
  }
}

function commercialProgressPillColors(
  item: Pick<InboxThread, 'dealEscrowPhase' | 'pipelinePhase' | 'category' | 'dealId'>,
  theme: (typeof palette)['light' | 'dark'],
) {
  if (item.dealEscrowPhase === 'settled' || item.pipelinePhase === 'CLOSED') {
    return {
      backgroundColor: theme.accentMintSoft,
      color: theme.accentMintStrong,
      borderColor: `${theme.accentMintStrong}44`,
    };
  }
  if (item.dealEscrowPhase === 'disputed' || item.dealEscrowPhase === 'remediation') {
    return {
      backgroundColor: '#2A1012',
      color: '#FDA4AF',
      borderColor: '#FDA4AF44',
    };
  }
  if (commercialProgressDetailAccent(item)) {
    return {
      backgroundColor: `${theme.primary}18`,
      color: theme.primary,
      borderColor: `${theme.primary}44`,
    };
  }
  return {
    backgroundColor: theme.secondary,
    color: theme.foregroundSubtitle,
    borderColor: theme.border,
  };
}

function CommercialTrailingMeta({
  budgetDisplay,
  brandLabel,
  progressLabel,
  progressPill,
  theme,
}: {
  budgetDisplay?: string;
  brandLabel?: string | null;
  progressLabel?: string;
  progressPill: ReturnType<typeof commercialProgressPillColors>;
  theme: (typeof palette)['light' | 'dark'];
}) {
  return (
    <View style={styles.threadTrailingTop}>
      <View style={styles.threadBudgetSlot}>
        <Text style={[styles.threadBudget, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
          {budgetDisplay ?? ''}
        </Text>
      </View>
      {brandLabel || progressLabel ? (
        <View style={styles.threadMetaSlot}>
          {brandLabel ? <BrandChip label={brandLabel} compact /> : null}
          {progressLabel ? (
            <View
              style={[
                styles.threadProgressPill,
                {
                  backgroundColor: progressPill.backgroundColor,
                  borderColor: progressPill.borderColor,
                },
              ]}>
              <Text style={[styles.threadProgressLabel, { color: progressPill.color }]} numberOfLines={1}>
                {progressLabel}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function InboxThreadHubRow({
  item,
  onPress,
  priorityUiEnabled = false,
}: {
  item: InboxThread;
  onPress: () => void;
  priorityUiEnabled?: boolean;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { inboxCategoryLabel, inboxLeadStageLabel, inboxPriorityLabel, escrowLifecycleLabel, opportunityPipelinePhaseLabel } =
    useDomainLabels();
  const correctedLocal = useInboxCorrectionStore((s) => !!s.classificationByThreadId[item.id]);
  const corrected = correctedLocal || !!item.userCorrected;
  const displayPriority = resolveDisplayInboxPriority(item);
  const priorityBand = resolvePriorityLeadValueBand(item);
  const showCommercialMeta = item.category === 'commercial' || !!item.leadValueBand || !!displayPriority;
  const progressLabel =
    item.category === 'commercial'
      ? resolveCommercialProgressLabel(item, {
          leadStage: inboxLeadStageLabel,
          escrow: escrowLifecycleLabel,
          pipeline: opportunityPipelinePhaseLabel,
        })
      : undefined;

  const messageStatsFooter = formatInboxMessageStats(item.messageStats, item.messageCount, t);
  const unreadHighlight = hasUnreadMessages(item.messageStats);
  const isCommercialRow = item.category === 'commercial';
  const progressPill =
    isCommercialRow && progressLabel ? commercialProgressPillColors(item, theme) : null;

  const subtitleParts: string[] = [];
  const localizedNextAction = translateInboxNextAction(t, item.nextActionLabel);
  const brandLabel =
    isCommercialRow && item.claimedBrandName?.trim() ? item.claimedBrandName.trim() : null;
  const actionKickerVisible =
    isCommercialRow && ((priorityUiEnabled && displayPriority) || localizedNextAction);
  if (actionKickerVisible && localizedNextAction) {
    // shown in row kicker
  } else if (localizedNextAction) {
    subtitleParts.push(localizedNextAction);
  } else if (item.preview) {
    subtitleParts.push(item.preview);
  }
  if (isCommercialRow) {
    const visibleRisk = localizedVisibleRiskLabel(t, item.riskLabel, item.budgetDisplay);
    if (visibleRisk && isContractRiskLabel(visibleRisk)) subtitleParts.push(visibleRisk);
    else if (priorityBand === 'high_value') {
      inboxRiskReasons(item.actionReasons).forEach((reason) => subtitleParts.push(reason.message));
    }
  } else if (!priorityUiEnabled) {
    if (item.riskLabel && showCommercialMeta) subtitleParts.push(item.riskLabel);
    else if (item.exceptionalBudget || item.budgetFloorRatio != null) {
      const exceptionalLabel = formatExceptionalBudgetLabel(item.budgetFloorRatio, t);
      if (exceptionalLabel) subtitleParts.push(exceptionalLabel);
    } else if (priorityBand === 'high_value') {
      inboxRiskReasons(item.actionReasons).forEach((reason) => subtitleParts.push(reason.message));
    }
  } else if (item.riskLabel && showCommercialMeta) {
    subtitleParts.push(item.riskLabel);
  } else if (item.exceptionalBudget || item.budgetFloorRatio != null) {
    const exceptionalLabel = formatExceptionalBudgetLabel(item.budgetFloorRatio, t);
    if (exceptionalLabel) subtitleParts.push(exceptionalLabel);
  } else if (item.actionReasons?.[0]?.message && showCommercialMeta) {
    subtitleParts.push(item.actionReasons[0].message);
  }
  if (corrected) subtitleParts.push(t('inboxScreen.userCorrected'));

  const metaLineSuffix = subtitleParts.length > 0 ? subtitleParts.join(' · ') : null;
  const subtitleLine =
    metaLineSuffix ?? (!actionKickerVisible && isCommercialRow && item.preview ? item.preview : null);
  const listRiskFlags = listContractWarningFlags(item, t);
  const subtitleContent =
    listRiskFlags.length > 0 ? (
      <View style={{ gap: spacing.xs }}>
        {subtitleLine ? (
          <Text style={[hubListStyles.subtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
            {subtitleLine}
          </Text>
        ) : null}
        <RiskBanner flags={listRiskFlags} compact />
      </View>
    ) : subtitleLine ? (
      <Text style={[hubListStyles.subtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
        {subtitleLine}
      </Text>
    ) : null;

  const detail =
    isCommercialRow && (progressPill || brandLabel) ? (
      <CommercialTrailingMeta
        budgetDisplay={item.budgetDisplay}
        brandLabel={brandLabel}
        progressLabel={progressLabel}
        progressPill={progressPill ?? commercialProgressPillColors(item, theme)}
        theme={theme}
      />
    ) : isCommercialRow ? (
      item.budgetDisplay
    ) : priorityUiEnabled ? (
      item.budgetDisplay
    ) : !showCommercialMeta ? (
      inboxCategoryLabel[item.category]
    ) : (
      item.budgetDisplay
    );

  const detailAccent = isCommercialRow
    ? false
    : priorityUiEnabled
      ? inboxPriorityAccent(displayPriority, theme).detailAccent
      : leadValueBandAccent(priorityBand ?? item.leadValueBand, theme).detailAccent;

  const iconElement = priorityUiEnabled ? (
    <InboxPriorityIconShell priority={displayPriority} icon={inboxThreadIcon(item.category)} />
  ) : (
    <LeadValueBandIconShell band={priorityBand ?? item.leadValueBand} icon={inboxThreadIcon(item.category)} />
  );

  const actionKicker =
    actionKickerVisible ? (
      <>
        {priorityUiEnabled && displayPriority ? (
          <Badge tone={inboxPriorityBadgeTone(displayPriority)} label={inboxPriorityLabel[displayPriority]} />
        ) : null}
        {localizedNextAction ? (
          <Text style={[hubListStyles.kickerHint, { color: theme.foreground }]} numberOfLines={1}>
            {localizedNextAction}
          </Text>
        ) : null}
      </>
    ) : undefined;

  return (
    <HubListRow
      testID={`inbox-thread-${item.id}`}
      iconElement={iconElement}
      kicker={actionKicker}
      title={item.subject}
      subtitle={subtitleContent}
      detail={detail}
      detailAccent={detailAccent}
      detailFooter={messageStatsFooter}
      detailFooterAccent={unreadHighlight}
      onPress={onPress}
    />
  );
}

function InboxPrioritySection({
  priority,
  items,
  count,
  onOpen,
}: {
  priority: InboxPriority;
  items: InboxThread[];
  count?: number;
  onOpen: (item: InboxThread) => void;
}) {
  const { inboxPriorityLabel } = useDomainLabels();
  const priorityUiEnabled = true;

  if (items.length === 0) return null;

  return (
    <View style={styles.bandSection}>
      <InboxPrioritySectionHeader
        priority={priority}
        label={inboxPriorityLabel[priority]}
        count={count ?? items.length}
      />
      <SettingsGroup insetDividers>
        {items.map((item) => (
          <InboxThreadHubRow
            key={item.id}
            item={item}
            priorityUiEnabled={priorityUiEnabled}
            onPress={() => onOpen(item)}
          />
        ))}
      </SettingsGroup>
    </View>
  );
}

function LeadValueBandSection({
  band,
  items,
  count,
  onOpen,
}: {
  band: LeadValueBand;
  items: InboxThread[];
  count?: number;
  onOpen: (item: InboxThread) => void;
}) {
  const { leadValueBandLabel } = useDomainLabels();

  if (items.length === 0) return null;

  return (
    <View style={styles.bandSection}>
      <LeadValueBandSectionHeader band={band} label={leadValueBandLabel[band]} count={count ?? items.length} />
      <SettingsGroup insetDividers>
        {items.map((item) => (
          <InboxThreadHubRow key={item.id} item={item} onPress={() => onOpen(item)} />
        ))}
      </SettingsGroup>
    </View>
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
  const priorityUiEnabled = isInboxPriorityUiEnabled(items);

  if (items.length === 0) return null;

  return (
    <SettingsGroup title={`${inboxCategoryLabel[category]} · ${count ?? items.length}`}>
      {items.map((item) => (
        <InboxThreadHubRow
          key={item.id}
          item={item}
          priorityUiEnabled={priorityUiEnabled}
          onPress={() => onOpen(item)}
        />
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
  const authReady = useAuthSessionReady();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const creatorVerificationStatus = useSessionStore((s) => s.creatorVerificationStatus);
  const accountEmail = useSessionStore((s) => s.accountEmail);
  const sessionMailboxEmail = useSessionStore((s) => s.mailboxConnection?.email);
  const aiInboxEnabled = isCreatorAiInboxEnabled(creatorVerificationStatus);
  const viewMode = useInboxViewStore((s) => s.viewMode);
  const priorityFilter = useInboxViewStore((s) => s.priorityFilter);
  const categoryFilter = useInboxViewStore((s) => s.categoryFilter);
  const timeRangeFilter = useInboxViewStore((s) => s.timeRangeFilter);
  const sortBy = useInboxViewStore((s) => s.sortBy);
  const sortOrder = useInboxViewStore((s) => s.sortOrder);
  const searchQuery = useInboxViewStore((s) => s.searchQuery);
  const setViewMode = useInboxViewStore((s) => s.setViewMode);
  const setPriorityFilter = useInboxViewStore((s) => s.setPriorityFilter);
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
  const scrollYByViewModeRef = useRef<Record<InboxViewMode, number>>({ priority: 0, all: 0 });
  const scrollYByCategoryRef = useRef<Partial<Record<InboxCategoryFilter, number>>>({});
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
  const [repairAction, setRepairAction] = useState<'reconnect' | 'watch' | 'writeback' | null>(null);
  const [repairError, setRepairError] = useState<string | null>(null);
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

  const handleViewModeChange = useCallback(
    (next: InboxViewMode) => {
      if (next === viewMode) return;
      scrollYByViewModeRef.current[viewMode] = useInboxViewStore.getState().scrollY;
      const restoreY = scrollYByViewModeRef.current[next] ?? 0;
      setScrollY(restoreY);
      setShowScrollTop(restoreY > SCROLL_TOP_THRESHOLD);
      shouldRestoreScrollRef.current = restoreY > 0;
      setViewMode(next);
      if (next === 'priority') {
        setCategoryFilter('all');
        setSearchQuery('');
      }
    },
    [viewMode, setCategoryFilter, setSearchQuery, setScrollY, setViewMode],
  );

  const handleSortByChange = useCallback(
    (next: InboxSortBy) => {
      setSortBy(next);
      setScrollY(0);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [setScrollY, setSortBy],
  );

  const handleSortOrderChange = useCallback(
    (next: InboxSortOrder) => {
      setSortOrder(next);
      setScrollY(0);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [setSortOrder, setScrollY],
  );

  const handleCategoryChange = useCallback(
    (next: InboxCategoryFilter) => {
      if (next === categoryFilter) return;
      scrollYByCategoryRef.current[categoryFilter] = useInboxViewStore.getState().scrollY;
      const restoreY = scrollYByCategoryRef.current[next] ?? useInboxViewStore.getState().scrollY;
      setScrollY(restoreY);
      setShowScrollTop(restoreY > SCROLL_TOP_THRESHOLD);
      shouldRestoreScrollRef.current = restoreY > 0;
      setCategoryFilter(next);
    },
    [categoryFilter, setCategoryFilter, setScrollY],
  );

  const listFilters = useMemo(() => {
    if (viewMode === 'priority') {
      return {
        needsAction: true,
        sortBy: 'CLASSIFICATION_SCORE' as const,
        sortDirection: 'DESC' as const,
      };
    }
    return {
      timeRange: timeRangeFilter,
      sortBy,
      sortDirection: sortOrder,
      ...(categoryFilter !== 'all' ? { emailCategory: categoryFilter } : {}),
    } as const;
  }, [viewMode, categoryFilter, timeRangeFilter, sortBy, sortOrder]);

  const inbox = useInboxThreads({ filters: listFilters, empty: !aiInboxEnabled });
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const processingActive = !!syncStatus.data?.active;

  useEffect(() => {
    if (!shouldRestoreScrollRef.current || inbox.isPending) return;
    restoreScrollY();
  }, [viewMode, categoryFilter, inbox.isPending, inbox.data, restoreScrollY]);

  const scrollToInboxBody = useCallback(() => {
    const scroll = () =>
      scrollRef.current?.scrollTo({ y: Math.max(0, bodyTopYRef.current - spacing.sm), animated: true });
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
  }, []);

  const handleAiSummaryPress = useCallback(() => {
    scrollYByViewModeRef.current[viewMode] = useInboxViewStore.getState().scrollY;
    pendingBodyScrollRef.current = true;
    shouldRestoreScrollRef.current = false;
    setViewMode('priority');
    setCategoryFilter('all');
    setSearchQuery('');
  }, [viewMode, setCategoryFilter, setSearchQuery, setViewMode]);

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
      if (!authReady || !isAuthenticated) return;
      try {
        const result = await syncMailbox({ lookback });
        if (result) {
          setLastSync(result);
          if (result.endedAtISO) applyMailboxLastSyncToCache(queryClient, result.endedAtISO);
        }
      } catch {
        setLastSync(null);
      }
    }
    await Promise.all([
      refreshInboxQueries(queryClient),
      invalidateTenantScopedQueries(queryClient),
      invalidateDecisionQueueQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'connection'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'sync-status'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'messages'] }),
      queryClient.invalidateQueries({ queryKey: ['account', 'overview'] }),
    ]);
  }, [authReady, isAuthenticated, queryClient]);
  const refreshInbox = useCallback(() => runMailboxSync(syncLookback), [runMailboxSync, syncLookback]);
  const { refreshing, onRefresh } = useTabRefresh(refreshInbox);

  const refreshMailboxState = useCallback(async () => {
    await Promise.all([
      refreshInboxQueries(queryClient),
      invalidateTenantScopedQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'connection'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'sync-status'] }),
      invalidateDecisionQueueQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
    ]);
  }, [queryClient]);

  const handleReconnectMailbox = useCallback(() => {
    setRepairError(null);
    router.push('/onboarding/email?source=inbox-repair' as Href);
  }, [router]);

  const handleRegisterWatch = useCallback(async () => {
    if (repairAction) return;
    setRepairAction('watch');
    setRepairError(null);
    try {
      await registerMailboxSubscription();
      await refreshMailboxState();
    } catch (error) {
      setRepairError(resolveMailboxRepairError(error, t));
    } finally {
      setRepairAction(null);
    }
  }, [refreshMailboxState, repairAction, t]);

  const handleRenewWatch = useCallback(async () => {
    if (repairAction) return;
    setRepairAction('watch');
    setRepairError(null);
    try {
      await renewMailboxSubscription();
      await refreshMailboxState();
    } catch (error) {
      setRepairError(resolveMailboxRepairError(error, t));
    } finally {
      setRepairAction(null);
    }
  }, [refreshMailboxState, repairAction, t]);

  const handleRetryWriteback = useCallback(async () => {
    if (repairAction) return;
    setRepairAction('writeback');
    setRepairError(null);
    try {
      await retryFailedMailboxWritebackJobs();
      await refreshMailboxState();
    } catch (error) {
      setRepairError(resolveMailboxRepairError(error, t));
    } finally {
      setRepairAction(null);
    }
  }, [refreshMailboxState, repairAction, t]);

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
      status.writeback?.pending ?? 0,
      status.writeback?.processing ?? 0,
      status.writeback?.failed ?? 0,
      status.subscription?.active ?? 0,
      status.subscription?.renewalDue ?? 0,
      status.subscription?.expired ?? 0,
      status.subscription?.error ?? 0,
    ].join('|');
  }, [syncStatus.data]);

  useEffect(() => {
    if (!shouldUseBackendApi() || !processingSignature) return;
    const status = syncStatus.data;
    const pipelineActive = !!status?.active;
    if (lastProcessingSignatureRef.current === null) {
      lastProcessingSignatureRef.current = processingSignature;
      if (!status || (!wasProcessingActiveRef.current && !pipelineActive)) return;
    }
    if (lastProcessingSignatureRef.current === processingSignature) return;
    lastProcessingSignatureRef.current = processingSignature;

    void Promise.all([
      refreshInboxQueries(queryClient),
      invalidateTenantScopedQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
      invalidateDecisionQueueQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['home', 'action-log'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'connection'] }),
      queryClient.invalidateQueries({ queryKey: ['mailbox', 'sync-status'] }),
    ]);
  }, [processingSignature, queryClient, syncStatus.data]);

  useFocusEffect(
    useCallback(() => {
      void queryClient.refetchQueries({ queryKey: rateCardPackagesQueryKey() });
    }, [queryClient]),
  );

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
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchableThreads = normalizedSearch
    ? allThreads.filter((thread) =>
        [
          thread.brandName,
          thread.subject,
          thread.preview,
          thread.budgetDisplay,
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

  const categoryCounts = inbox.categoryCounts;
  const valueBandCounts = inbox.valueBandCounts;
  const priorityBandCounts = countPriorityLeadValueBands(allThreads as Parameters<typeof countPriorityLeadValueBands>[0]);
  const priorityUiEnabled = isInboxPriorityUiEnabled(allThreads);
  const inboxPriorityCounts = useMemo(
    () =>
      priorityUiEnabled
        ? countInboxPriorities(allThreads as Parameters<typeof countInboxPriorities>[0])
        : null,
    [allThreads, priorityUiEnabled]
  );
  const archivedBandCount = priorityUiEnabled
    ? countArchivedInboxPriority(allThreads as Parameters<typeof countArchivedInboxPriority>[0])
    : (valueBandCounts.archived ?? 0);
  const priorityChipCounts = {
    p0: inboxPriorityCounts?.p0 ?? priorityBandCounts.high_value ?? 0,
    p1: inboxPriorityCounts?.p1 ?? 0,
    p2: inboxPriorityCounts?.p2 ?? priorityBandCounts.needs_negotiation ?? 0,
    archived: archivedBandCount,
  };
  const priorityThreads = filterThreadsByPriorityChip(searchableThreads, priorityFilter);
  const mailboxEmail =
    syncStatus.data?.connection?.emailAddress ??
    mailbox.data?.emailAddress ??
    sessionMailboxEmail ??
    accountEmail;

  const openThread = (item: InboxThread) => router.push(`/inbox/${item.id}` as Href);

  const toolbar = (
    <>
      <InboxConnectionBanner />
      {aiInboxEnabled ? <InboxReclassificationBanner /> : null}
      {aiInboxEnabled && processingActive ? (
        <HubCallout
          title={t('inboxScreen.syncResultTitleProcessing')}
          body={t('inboxScreen.syncResultBodyProcessing')}
        />
      ) : null}
    </>
  );

  const inboxHubStack = aiInboxEnabled ? (
    <>
      <InboxEmailStatusCard
        email={mailboxEmail}
        verificationStatus={creatorVerificationStatus}
        onPress={() => router.push('/onboarding/email?source=account' as Href)}
        onSync={onRefresh}
        syncing={refreshing || inbox.isRefetching}
      />
      <InboxAddDealCard />
      <InboxNeedsActionToggle value={viewMode} onChange={handleViewModeChange} />
      {viewMode === 'priority' ? (
        <InboxPriorityFilterRow
          value={priorityFilter}
          counts={priorityChipCounts}
          onChange={setPriorityFilter}
        />
      ) : null}
    </>
  ) : null;

  return (
    <View style={[styles.screenFrame, { backgroundColor: theme.background }]}>
      <HubScreen
        testID="screen-inbox"
        eyebrow={t('tabs.inbox')}
        title={aiInboxEnabled ? t('inboxScreen.titlePriority') : t('basicMailbox.screenTitle')}
        toolbar={toolbar}
        refreshing={refreshing || inbox.isRefetching}
        onRefresh={onRefresh}
        scrollRef={scrollRef}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onBodyLayout={handleBodyLayout}>
        {!aiInboxEnabled ? (
          <BasicMailboxInbox refreshing={refreshing} />
        ) : initialLoading ? (
          <InboxInlineLoading />
        ) : (
          <>
            {inboxHubStack}
            {viewMode === 'priority' ? (
              <>
                {priorityThreads.length > 0 ? (
                  <View style={styles.collabList}>
                    {priorityThreads.map((item: InboxThread) => (
                      <InboxCollaborationCard key={item.id} thread={item} onPress={() => openThread(item)} />
                    ))}
                  </View>
                ) : (
                  <EmptyStateCard
                    title={
                      processingActive
                        ? t('inboxScreen.emptyProcessingTitle')
                        : priorityFilter === 'archived'
                          ? t('inboxScreen.emptyArchivedTitle')
                          : t('inboxScreen.emptyPriorityTitle')
                    }
                    description={
                      processingActive
                        ? t('inboxScreen.emptyProcessingDesc')
                        : priorityFilter === 'archived'
                          ? t('inboxScreen.emptyArchivedDesc')
                          : t('inboxScreen.emptyPriorityDesc')
                    }
                    primaryAction={{
                      label: t('inboxScreen.viewSorted'),
                      onPress: () => handleViewModeChange('all'),
                    }}
                    secondaryAction={{
                      label: t('inboxScreen.emptyConnectMailbox'),
                      onPress: () => router.push('/onboarding/email' as Href),
                    }}
                  />
                )}
                {inbox.isFetchingNextPage ? <InboxInlineLoading /> : null}
              </>
            ) : (
              <>
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
                  onCategoryChange={handleCategoryChange}
                  onToggleExpanded={() => setClassifiedControlsExpanded((value) => !value)}
                  onTimeRangeChange={setTimeRangeFilter}
                  onSortByChange={handleSortByChange}
                  onSortOrderChange={handleSortOrderChange}
                />
                {searchableThreads.length > 0 ? (
                  <View style={styles.collabList}>
                    {searchableThreads.map((item: InboxThread) => (
                      <InboxCollaborationCard key={item.id} thread={item} onPress={() => openThread(item)} />
                    ))}
                  </View>
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
  collabList: { gap: spacing.sm },
  bandSection: { gap: spacing.sm },
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
  threadTrailingTop: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    minWidth: 96,
    maxWidth: 128,
  },
  threadMetaSlot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    maxWidth: '100%',
  },
  threadBudgetSlot: {
    alignItems: 'flex-end',
    width: '100%',
  },
  threadProgressPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  threadProgressLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  threadBudget: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    textAlign: 'right',
  },
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
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.lg,
    flexShrink: 0,
    maxWidth: 132,
  },
  mailboxSyncButtonLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    flexShrink: 1,
  },
  mailboxSyncButtonPressed: { opacity: 0.72 },
  mailboxSyncButtonDisabled: { opacity: 0.55 },
  mailboxSyncingText: {
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '700',
  },
  mailboxChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  mailboxStatusChip: {
    minHeight: 28,
    maxWidth: '100%',
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mailboxStatusChipText: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '800',
    flexShrink: 1,
  },
  mailboxTelemetryStack: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  mailboxTelemetryRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mailboxTelemetryText: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '700',
  },
  mailboxRepairStack: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  mailboxRepairActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  mailboxRepairButton: {
    minHeight: 34,
    maxWidth: '100%',
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexGrow: 1,
    flexBasis: 128,
  },
  mailboxRepairButtonPressed: { opacity: 0.72 },
  mailboxRepairButtonDisabled: { opacity: 0.58 },
  mailboxRepairButtonText: {
    flexShrink: 1,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '800',
    textAlign: 'center',
  },
  mailboxRepairError: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
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

const reclassifyBannerStyles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    fontWeight: '600',
  },
});
