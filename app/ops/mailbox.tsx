import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComponentProps, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, FilterChipRow, HubMetric, HubMetrics, HubScreen, QueryRetryCard, SectionCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  cancelMailboxSubscription,
  cancelMailboxWritebackJob,
  fetchMailboxSubscriptions,
  fetchMailboxSyncCursors,
  fetchMailboxSyncStatus,
  fetchMailboxWritebackJobs,
  registerMailboxSubscription,
  renewMailboxSubscription,
  retryFailedMailboxWritebackJobs,
  retryMailboxWritebackJob,
  syncMailbox,
  type MailboxSubscriptionRow,
  type MailboxSyncCursorRow,
  type MailboxWritebackJob,
} from '@/src/api/mailbox-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { alertAction } from '@/src/lib/app-dialog';
import { confirmAction } from '@/src/lib/confirm-action';
import { useTenantApiQueryEnabled, useTenantQueryKey } from '@/src/lib/tenant-query';
import { useSessionStore } from '@/src/stores/session-store';

type IconName = ComponentProps<typeof Ionicons>['name'];
type JobFilter = 'ALL' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'SUCCEEDED' | 'CANCELLED';

const JOB_FILTERS: readonly JobFilter[] = ['ALL', 'PENDING', 'PROCESSING', 'FAILED', 'SUCCEEDED', 'CANCELLED'];

export default function MailboxOpsScreen() {
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const apiMode = shouldUseBackendApi();
  const tenantQueryEnabled = useTenantApiQueryEnabled();
  const membershipRole = useSessionStore((s) => s.membershipRole);
  const canUseOps = apiMode && membershipRole === 'OWNER';
  const [jobFilter, setJobFilter] = useState<JobFilter>('ALL');

  const statusKey = useTenantQueryKey('ops', 'mailbox', 'status');
  const subscriptionsKey = useTenantQueryKey('ops', 'mailbox', 'subscriptions');
  const cursorsKey = useTenantQueryKey('ops', 'mailbox', 'cursors');
  const jobsKey = useTenantQueryKey('ops', 'mailbox', 'writeback-jobs');

  const status = useQuery({
    queryKey: statusKey,
    queryFn: fetchMailboxSyncStatus,
    enabled: tenantQueryEnabled && canUseOps,
    retry: false,
  });
  const subscriptions = useQuery({
    queryKey: subscriptionsKey,
    queryFn: fetchMailboxSubscriptions,
    enabled: tenantQueryEnabled && canUseOps,
    retry: false,
  });
  const cursors = useQuery({
    queryKey: cursorsKey,
    queryFn: fetchMailboxSyncCursors,
    enabled: tenantQueryEnabled && canUseOps,
    retry: false,
  });
  const jobs = useQuery({
    queryKey: jobsKey,
    queryFn: () => fetchMailboxWritebackJobs({ limit: 100 }),
    enabled: tenantQueryEnabled && canUseOps,
    retry: false,
    refetchInterval: (current) => {
      const active = current.state.data?.some((job) => job.status === 'PENDING' || job.status === 'PROCESSING');
      return active ? 3000 : false;
    },
  });

  const refreshOps = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: statusKey }),
      queryClient.invalidateQueries({ queryKey: subscriptionsKey }),
      queryClient.invalidateQueries({ queryKey: cursorsKey }),
      queryClient.invalidateQueries({ queryKey: jobsKey }),
    ]);
  };

  const mutationOptions = {
    onSuccess: () => {
      void refreshOps();
    },
    onError: (error: unknown) => {
      void alertAction('Mailbox operation failed', error instanceof Error ? error.message : 'Please try again.');
    },
  };

  const syncMutation = useMutation({
    mutationFn: () => syncMailbox({ lookback: 'INCREMENTAL' }),
    ...mutationOptions,
  });
  const registerMutation = useMutation({
    mutationFn: registerMailboxSubscription,
    ...mutationOptions,
  });
  const renewMutation = useMutation({
    mutationFn: renewMailboxSubscription,
    ...mutationOptions,
  });
  const cancelSubscriptionMutation = useMutation({
    mutationFn: cancelMailboxSubscription,
    ...mutationOptions,
  });
  const retryFailedMutation = useMutation({
    mutationFn: () => retryFailedMailboxWritebackJobs(100),
    ...mutationOptions,
  });
  const retryJobMutation = useMutation({
    mutationFn: retryMailboxWritebackJob,
    ...mutationOptions,
  });
  const cancelJobMutation = useMutation({
    mutationFn: cancelMailboxWritebackJob,
    ...mutationOptions,
  });

  const subscriptionRows = subscriptions.data ?? [];
  const cursorRows = cursors.data ?? [];
  const jobRows = jobs.data ?? [];
  const visibleJobs = useMemo(
    () => (jobFilter === 'ALL' ? jobRows : jobRows.filter((job) => job.status === jobFilter)),
    [jobFilter, jobRows],
  );
  const jobCounts = useMemo(() => {
    const counts: Record<JobFilter, number> = {
      ALL: jobRows.length,
      PENDING: 0,
      PROCESSING: 0,
      FAILED: 0,
      SUCCEEDED: 0,
      CANCELLED: 0,
    };
    for (const job of jobRows) {
      if (job.status in counts) counts[job.status as JobFilter] += 1;
    }
    return counts;
  }, [jobRows]);

  if (!apiMode) {
    return (
      <PlaceholderScreen
        title="Backend API required"
        description="Set EXPO_PUBLIC_API_BASE_URL and sign in to a real workspace before using mailbox operations."
      />
    );
  }

  if (!canUseOps) {
    return (
      <PlaceholderScreen
        title="Owner access required"
        description="Mailbox operations are limited to workspace owners while this is a tenant-scoped admin view."
      />
    );
  }

  const initialLoading = status.isPending || subscriptions.isPending || cursors.isPending || jobs.isPending;
  if (initialLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel="Loading mailbox operations" color={theme.primary} />
      </View>
    );
  }

  const firstError = status.error ?? subscriptions.error ?? cursors.error ?? jobs.error;
  if (firstError) {
    return (
      <PlaceholderScreen title="Mailbox ops failed to load" description="Refresh the tenant mailbox state and try again.">
        <QueryRetryCard
          message={firstError instanceof Error ? firstError.message : 'Unknown mailbox ops error'}
          onRetry={() => void refreshOps()}
        />
      </PlaceholderScreen>
    );
  }

  const connection = status.data?.connection;
  const failedJobs = jobCounts.FAILED;
  const activeJobs = jobCounts.PENDING + jobCounts.PROCESSING;
  const activeSubscriptions = subscriptionRows.filter((row) => row.status === 'ACTIVE').length;
  const watchProblems = subscriptionRows.filter((row) =>
    ['ERROR', 'EXPIRED', 'RENEWAL_DUE'].includes(row.status),
  ).length;
  const busy =
    syncMutation.isPending ||
    registerMutation.isPending ||
    renewMutation.isPending ||
    cancelSubscriptionMutation.isPending ||
    retryFailedMutation.isPending;

  const confirmCancelSubscriptions = () => {
    void (async () => {
      const confirmed = await confirmAction({
        title: 'Cancel provider watch?',
        message: 'This disables the current Gmail or Graph push subscription. Polling/manual sync can still work.',
        cancelLabel: 'Keep watch',
        confirmLabel: 'Cancel watch',
        destructive: true,
      });
      if (confirmed) cancelSubscriptionMutation.mutate();
    })();
  };

  const confirmCancelJob = (job: MailboxWritebackJob) => {
    void (async () => {
      const confirmed = await confirmAction({
        title: `Cancel job #${job.id}?`,
        message: 'Only pending or failed writeback jobs can be cancelled. Processing jobs are left untouched.',
        cancelLabel: 'Keep job',
        confirmLabel: 'Cancel job',
        destructive: true,
      });
      if (confirmed) cancelJobMutation.mutate(job.id);
    })();
  };

  return (
    <HubScreen
      testID="screen-mailbox-ops"
      eyebrow="Ops"
      title="Mailbox operations"
      lead="Tenant-scoped provider state for Gmail and Microsoft Graph sync, push watches, cursors, and writeback jobs."
      refreshing={status.isRefetching || subscriptions.isRefetching || cursors.isRefetching || jobs.isRefetching}
      onRefresh={() => void refreshOps()}
      toolbar={
        <HubMetrics>
          <HubMetric value={connection?.provider ?? '-'} label="Provider" hint={connection?.status ?? 'No connection'} />
          <HubMetric value={String(activeSubscriptions)} label="Active watches" hint={`${watchProblems} need attention`} />
          <HubMetric value={String(activeJobs)} label="Writeback active" hint={`${failedJobs} failed`} accent={failedJobs > 0} />
        </HubMetrics>
      }>
      <SectionCard title="Connection" subtitle={connection?.emailAddress ?? 'No active mailbox connection'}>
        <View style={styles.badgeRow}>
          <StatusBadge status={connection?.status ?? 'UNKNOWN'} />
          {connection?.reconsentRequired ? <Badge tone="danger" label="Reconsent" /> : null}
          {(connection?.capabilities ?? []).map((capability) => (
            <Badge key={capability} tone="mint" label={capability} />
          ))}
        </View>
        <MetaGrid
          rows={[
            ['Account', connection?.providerAccountId ?? '-'],
            ['Last sync', formatDate(connection?.lastSyncAtISO)],
            ['Watch expires', formatDate(connection?.watchExpiresAtISO)],
            ['Cursor', connection?.syncCursor ? truncate(connection.syncCursor, 80) : '-'],
          ]}
        />
        <View style={styles.actionRow}>
          <ActionButton
            icon="sync-outline"
            label="Sync now"
            loading={syncMutation.isPending}
            disabled={busy}
            onPress={() => syncMutation.mutate()}
          />
          <ActionButton
            icon="refresh-circle-outline"
            label="Refresh view"
            disabled={busy}
            onPress={() => void refreshOps()}
            variant="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard title="Subscription rows" subtitle="Provider push watch registrations for inbox changes.">
        <View style={styles.actionRow}>
          <ActionButton
            icon="radio-outline"
            label="Register"
            loading={registerMutation.isPending}
            disabled={busy}
            onPress={() => registerMutation.mutate()}
          />
          <ActionButton
            icon="time-outline"
            label="Renew"
            loading={renewMutation.isPending}
            disabled={busy}
            onPress={() => renewMutation.mutate()}
            variant="secondary"
          />
          <ActionButton
            icon="stop-circle-outline"
            label="Cancel watch"
            loading={cancelSubscriptionMutation.isPending}
            disabled={busy || subscriptionRows.length === 0}
            onPress={confirmCancelSubscriptions}
            variant="danger"
          />
        </View>
        {subscriptionRows.length === 0 ? (
          <EmptyOpsText text="No subscription rows yet." />
        ) : (
          <View style={styles.tableStack}>
            {subscriptionRows.map((row) => (
              <SubscriptionRow key={row.id} row={row} />
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Cursor rows" subtitle="Sync positions stored per provider resource. Cursor values are previewed only.">
        {cursorRows.length === 0 ? (
          <EmptyOpsText text="No cursor rows yet. Run a sync to create provider cursor state." />
        ) : (
          <View style={styles.tableStack}>
            {cursorRows.map((row) => (
              <CursorRow key={row.id} row={row} />
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Writeback jobs" subtitle="Remote labels, native drafts, and sends queued against the connected mailbox.">
        <View style={styles.actionRow}>
          <ActionButton
            icon="reload-outline"
            label="Retry failed"
            loading={retryFailedMutation.isPending}
            disabled={retryFailedMutation.isPending || failedJobs === 0}
            onPress={() => retryFailedMutation.mutate()}
          />
        </View>
        <FilterChipRow
          value={jobFilter}
          onChange={setJobFilter}
          items={JOB_FILTERS.map((id) => ({
            id,
            label: id === 'ALL' ? 'All' : titleCase(id),
            count: jobCounts[id],
          }))}
        />
        {visibleJobs.length === 0 ? (
          <EmptyOpsText text="No writeback jobs match this filter." />
        ) : (
          <View style={styles.tableStack}>
            {visibleJobs.map((job) => (
              <WritebackJobRow
                key={job.id}
                job={job}
                retrying={retryJobMutation.isPending}
                cancelling={cancelJobMutation.isPending}
                onRetry={() => retryJobMutation.mutate(job.id)}
                onCancel={() => confirmCancelJob(job)}
              />
            ))}
          </View>
        )}
      </SectionCard>
    </HubScreen>
  );
}

function SubscriptionRow({ row }: { row: MailboxSubscriptionRow }) {
  return (
    <OpsRow
      icon="radio-outline"
      title={`${row.provider} / ${row.resource}`}
      subtitle={row.remoteSubscriptionId ? `remote ${truncate(row.remoteSubscriptionId, 42)}` : 'No remote id'}
      status={row.status}
      details={[
        ['Expires', formatDate(row.expiresAtISO)],
        ['Renewed', formatDate(row.lastRenewedAtISO)],
        ['Updated', formatDate(row.updatedAtISO)],
        ['Notify', row.notificationUrl ? truncate(row.notificationUrl, 80) : '-'],
      ]}
    />
  );
}

function CursorRow({ row }: { row: MailboxSyncCursorRow }) {
  return (
    <OpsRow
      icon="git-branch-outline"
      title={`${row.provider} / ${row.resource}`}
      subtitle={row.cursorPreview ?? 'Empty cursor'}
      status={row.cursorType}
      details={[
        ['Connection', `#${row.mailboxConnectionId}`],
        ['Length', String(row.cursorLength)],
        ['Full sync', formatDate(row.lastFullSyncAtISO)],
        ['Updated', formatDate(row.updatedAtISO)],
      ]}
    />
  );
}

function WritebackJobRow({
  job,
  retrying,
  cancelling,
  onRetry,
  onCancel,
}: {
  job: MailboxWritebackJob;
  retrying: boolean;
  cancelling: boolean;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const canRetry = job.status === 'FAILED' || job.status === 'CANCELLED';
  const canCancel = job.status === 'PENDING' || job.status === 'FAILED';

  return (
    <OpsRow
      icon={job.operation.includes('SEND') ? 'send-outline' : job.operation.includes('DRAFT') ? 'document-text-outline' : 'pricetag-outline'}
      title={`#${job.id} ${titleCase(job.operation)}`}
      subtitle={job.errorMessage ? truncate(job.errorMessage, 120) : `message ${job.emailMessageId ?? '-'}`}
      status={job.status}
      details={[
        ['Provider', job.provider],
        ['Attempts', String(job.attemptCount)],
        ['Created', formatDate(job.createdAtISO)],
        ['Updated', formatDate(job.updatedAtISO)],
      ]}
      actions={
        <View style={styles.rowActions}>
          <MiniAction icon="reload-outline" label="Retry" disabled={!canRetry || retrying} onPress={onRetry} />
          <MiniAction icon="close-circle-outline" label="Cancel" disabled={!canCancel || cancelling} danger onPress={onCancel} />
        </View>
      }
    />
  );
}

function OpsRow({
  icon,
  title,
  subtitle,
  status,
  details,
  actions,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  status: string;
  details: [string, string][];
  actions?: ReactNode;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.opsRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={[styles.rowIcon, { backgroundColor: theme.muted }]}>
        <Ionicons name={icon} size={17} color={theme.primary} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <View style={styles.rowTitleBlock}>
            <Text style={[styles.rowTitle, { color: theme.foreground }]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={[styles.rowSubtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          <StatusBadge status={status} />
        </View>
        <MetaGrid rows={details} compact />
        {actions}
      </View>
    </View>
  );
}

function MetaGrid({ rows, compact }: { rows: [string, string][]; compact?: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.metaGrid, compact && styles.metaGridCompact]}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: theme.foregroundEyebrow }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.metaValue, { color: theme.foreground }]} numberOfLines={2}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone =
    normalized === 'ACTIVE' || normalized === 'CONNECTED' || normalized === 'SUCCEEDED'
      ? 'mint'
      : normalized === 'FAILED' || normalized === 'ERROR' || normalized === 'EXPIRED'
        ? 'danger'
        : normalized === 'PENDING' || normalized === 'PROCESSING' || normalized === 'RENEWAL_DUE'
          ? 'warning'
          : 'neutral';
  return <Badge tone={tone} label={status} />;
}

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const background =
    variant === 'primary' ? theme.primary : variant === 'danger' ? '#7F1D1D' : theme.secondary;
  const foreground =
    variant === 'primary' ? theme.primaryForeground : variant === 'danger' ? '#FEE2E2' : theme.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: background, borderColor: variant === 'primary' ? theme.primary : theme.border },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={foreground} />
          <Text style={[styles.actionLabel, { color: foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function MiniAction({
  icon,
  label,
  disabled,
  danger,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniAction,
        { borderColor: theme.border, backgroundColor: danger ? '#7F1D1D22' : theme.secondary },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Ionicons name={icon} size={14} color={danger ? '#FDA4AF' : theme.primary} />
      <Text style={[styles.miniActionLabel, { color: danger ? '#FDA4AF' : theme.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function EmptyOpsText({ text }: { text: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return <Text style={[styles.empty, { color: theme.mutedForeground }]}>{text}</Text>;
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    minHeight: layout.touchMin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionLabel: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  tableStack: { gap: spacing.sm },
  opsRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0, gap: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowTitleBlock: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: fontSize.body, fontWeight: '800', lineHeight: lineHeight.body },
  rowSubtitle: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaGridCompact: { marginTop: 0 },
  metaCell: { minWidth: 130, flex: 1, gap: 2 },
  metaLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  metaValue: { fontSize: fontSize.caption, lineHeight: 18, fontVariant: ['tabular-nums'] },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  miniAction: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  miniActionLabel: { fontSize: fontSize.caption, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  empty: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
