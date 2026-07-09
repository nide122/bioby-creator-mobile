import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SettingsGroup, SettingsRow } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { requestAccountDeletion } from '@/src/api/account-api';
import { ApiError } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import { useAccountOverview } from '@/src/hooks/use-account-overview';
import { alertAction } from '@/src/lib/app-dialog';
import { confirmAction } from '@/src/lib/confirm-action';
import { exportAndSharePipelineCsv } from '@/src/lib/pipeline-export';
import { exportAndShareWorkspaceJson } from '@/src/lib/workspace-export';

export default function DataExportSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const overview = useAccountOverview();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [exportingPipeline, setExportingPipeline] = useState(false);
  const [exportingWorkspace, setExportingWorkspace] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);

  const apiMode = shouldUseBackendApi();
  const deletionStatus = overview.data?.deletionStatus;
  const deletionScheduledAtISO = overview.data?.deletionScheduledAtISO;
  const retentionDays = overview.data?.accountDataRetentionDays ?? 30;
  const deletionAlreadyPending = deletionStatus === 'PENDING_FINALIZATION';

  const exportPipeline = async () => {
    if (exportingPipeline) return;
    setExportingPipeline(true);
    try {
      await exportAndSharePipelineCsv();
    } catch {
      void alertAction(
        t('dataExportScreen.pipelineExport.failedTitle'),
        t('dataExportScreen.pipelineExport.failedMessage'),
      );
    } finally {
      setExportingPipeline(false);
    }
  };

  const exportWorkspace = async () => {
    if (!apiMode || exportingWorkspace) return;
    setExportingWorkspace(true);
    try {
      await exportAndShareWorkspaceJson();
    } catch {
      void alertAction(
        t('dataExportScreen.workspaceExport.failedTitle'),
        t('dataExportScreen.workspaceExport.failedMessage'),
      );
    } finally {
      setExportingWorkspace(false);
    }
  };

  const exportInbox = () => {
    void alertAction(
      t('dataExportScreen.inboxAlert.title'),
      t('dataExportScreen.inboxAlert.message'),
    );
  };

  const onRequestDeletion = async () => {
    if (!apiMode || deletionPending || deletionAlreadyPending) return;
    const confirmed = await confirmAction({
      title: t('dataExportScreen.deleteAccount.confirmTitle'),
      message: t('dataExportScreen.deleteAccount.confirmMessage', { days: retentionDays }),
      confirmLabel: t('dataExportScreen.deleteAccount.confirmCta'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;

    setDeletionPending(true);
    try {
      const result = await requestAccountDeletion();
      await overview.refetch();
      await signOut();
      const scheduled = result.deletionScheduledAtISO ?? deletionScheduledAtISO;
      void alertAction(
        t('dataExportScreen.deleteAccount.successTitle'),
        scheduled
          ? t('dataExportScreen.deleteAccount.successMessageScheduled', {
              date: new Date(scheduled).toLocaleString(),
            })
          : t('dataExportScreen.deleteAccount.successMessage', { days: retentionDays }),
      );
    } catch (error) {
      const message =
        error instanceof ApiError && error.code === 'DELETION_ALREADY_REQUESTED'
          ? t('dataExportScreen.deleteAccount.alreadyRequested')
          : error instanceof ApiError
            ? error.message
            : t('dataExportScreen.deleteAccount.failedMessage');
      void alertAction(t('dataExportScreen.deleteAccount.failedTitle'), message);
    } finally {
      setDeletionPending(false);
    }
  };

  return (
    <ScrollView
      testID="screen-data-export"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('dataExportScreen.lead')}</Text>

      {deletionAlreadyPending ? (
        <View style={[styles.pendingBanner, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Ionicons name="time-outline" size={18} color={theme.primary} />
          <Text style={[styles.pendingText, { color: theme.foreground }]}>
            {deletionScheduledAtISO
              ? t('dataExportScreen.deleteAccount.pendingBannerScheduled', {
                  date: new Date(deletionScheduledAtISO).toLocaleString(),
                })
              : t('dataExportScreen.deleteAccount.pendingBanner', { days: retentionDays })}
          </Text>
        </View>
      ) : null}

      <SettingsGroup title={t('dataExportScreen.exportHeading')}>
        <ExportRow
          title={t('dataExportScreen.rows.pipelineTitle')}
          subtitle={t('dataExportScreen.rows.pipelineSubtitle')}
          onPress={() => void exportPipeline()}
          testID="data-export-pipeline"
          loading={exportingPipeline}
        />
        <ExportRow
          title={t('dataExportScreen.rows.workspaceTitle')}
          subtitle={t('dataExportScreen.rows.workspaceSubtitle')}
          onPress={() => void exportWorkspace()}
          testID="data-export-workspace"
          loading={exportingWorkspace}
          disabled={!apiMode}
        />
        <ExportRow
          title={t('dataExportScreen.rows.inboxTitle')}
          subtitle={t('dataExportScreen.rows.inboxSubtitle')}
          onPress={exportInbox}
          testID="data-export-inbox"
        />
      </SettingsGroup>

      <SettingsGroup title={t('dataExportScreen.recordsHeading')}>
        <ExportRow
          title={t('dataExportScreen.rows.paymentsTitle')}
          subtitle={t('dataExportScreen.rows.paymentsSubtitle')}
          onPress={() => router.push('/payments' as Href)}
          testID="data-export-payments"
        />
        <ExportRow
          title={t('dataExportScreen.rows.disputesTitle')}
          subtitle={t('dataExportScreen.rows.disputesSubtitle')}
          onPress={() => router.push('/disputes' as Href)}
          testID="data-export-disputes"
        />
      </SettingsGroup>

      {apiMode ? (
        <SettingsGroup title={t('dataExportScreen.deleteAccount.heading')}>
          <View style={[styles.dangerCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.dangerTitle, { color: theme.foreground }]}>
              {t('dataExportScreen.deleteAccount.title')}
            </Text>
            <Text style={[styles.dangerBody, { color: theme.mutedForeground }]}>
              {t('dataExportScreen.deleteAccount.body', { days: retentionDays })}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={deletionPending || deletionAlreadyPending}
              onPress={() => void onRequestDeletion()}
              style={[
                styles.dangerBtn,
                {
                  borderColor: '#EF4444',
                  opacity: deletionPending || deletionAlreadyPending ? 0.6 : 1,
                },
              ]}>
              {deletionPending ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={styles.dangerBtnLabel}>
                  {deletionAlreadyPending
                    ? t('dataExportScreen.deleteAccount.pendingCta')
                    : t('dataExportScreen.deleteAccount.cta')}
                </Text>
              )}
            </Pressable>
          </View>
        </SettingsGroup>
      ) : null}

      <View style={[styles.note, { backgroundColor: theme.muted }]}>
        <Text style={[styles.noteText, { color: theme.mutedForeground }]}>{t('dataExportScreen.footer')}</Text>
      </View>
    </ScrollView>
  );
}

function ExportRow({
  title,
  subtitle,
  onPress,
  testID,
  loading = false,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <SettingsRow testID={testID} onPress={loading || disabled ? undefined : onPress}>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: theme.foreground, opacity: disabled ? 0.5 : 1 }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.mutedForeground, opacity: disabled ? 0.5 : 1 }]}>
          {subtitle}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.foregroundEyebrow} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={theme.foregroundEyebrow} />
      )}
    </SettingsRow>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  lead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  pendingBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  pendingText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  rowBody: { flex: 1, gap: 2, paddingVertical: spacing.xs },
  rowTitle: { fontSize: fontSize.body, fontWeight: '600' },
  rowSubtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  dangerCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dangerTitle: { fontSize: fontSize.body, fontWeight: '700' },
  dangerBody: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  dangerBtn: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnLabel: { color: '#EF4444', fontWeight: '700', fontSize: fontSize.body },
  note: { borderRadius: spacing.md, padding: spacing.md },
  noteText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
