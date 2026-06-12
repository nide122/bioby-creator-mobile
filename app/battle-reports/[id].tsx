import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, HubLinkGroup, HubMetric, HubMetrics, HubScreen, QueryRetryCard, SectionCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { alertAction } from '@/src/lib/app-dialog';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { useBattleReport, useUpdateBattleReportShareable } from '@/src/hooks/use-battle-reports';
import { useImportBattleReportToMediaKit } from '@/src/hooks/use-growth';

export default function BattleReportDetailScreen() {
  const { t } = useTranslation();
  const assetsNav = useAssetsHubNavigation();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const reportId = Array.isArray(rawId) ? rawId[0] : rawId;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const query = useBattleReport(reportId);
  const shareableMutation = useUpdateBattleReportShareable(reportId);
  const importMutation = useImportBattleReportToMediaKit();

  if (!reportId) {
    return (
      <PlaceholderScreen
        title={t('battleReportDetailScreen.missingTitle')}
        description={t('battleReportDetailScreen.missingDesc')}
      />
    );
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('battleReportDetailScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    const msg = query.error?.message ?? t('battleReportDetailScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('battleReportDetailScreen.loadFailedTitle')}
        description={t('battleReportDetailScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() =>
            reportId
              ? queryClient.invalidateQueries({ queryKey: ['battle-report', reportId] })
              : queryClient.invalidateQueries({ queryKey: ['battle-reports'] })
          }
        />
      </PlaceholderScreen>
    );
  }

  const report = query.data;
  const shareSummary = `${report.title}\n${report.metrics.slice(0, 3).join('\n')}\n${t('battleReportDetailScreen.lessonSharePrefix')} ${report.lesson}`;

  const onShareReport = async () => {
    try {
      await Share.share({ title: report.title, message: shareSummary });
    } catch {
      void alertAction(t('battleReportDetailScreen.shareFailTitle'), t('battleReportDetailScreen.shareFailDesc'));
    }
  };

  const onToggleShareable = async (next: boolean) => {
    try {
      await shareableMutation.mutateAsync(next);
    } catch {
      void alertAction(t('battleReportDetailScreen.loadFailedTitle'), t('battleReportDetailScreen.retryDesc'));
    }
  };

  const onImportToMediaKit = async () => {
    try {
      await importMutation.mutateAsync(report.id);
      void alertAction(
        t('battleReportDetailScreen.importMediaKitSuccessTitle'),
        t('battleReportDetailScreen.importMediaKitSuccessDesc')
      );
    } catch {
      void alertAction(
        t('battleReportDetailScreen.importMediaKitFailTitle'),
        t('battleReportDetailScreen.importMediaKitFailDesc')
      );
    }
  };

  return (
    <HubScreen
      eyebrow={t('tabs.assets')}
      title={report.title}
      lead={t('battleReportDetailScreen.heroEvidenceLine', { title: report.title })}
      toolbar={
        <HubMetrics>
          <HubMetric
            value={String(report.metrics.length)}
            label={t('battleReportDetailScreen.metricSignals')}
          />
          <HubMetric
            value={
              report.shareableToMediaKit
                ? t('battleReportsScreen.badgeShareable')
                : t('battleReportsScreen.badgePrivate')
            }
            label={t('battleReportDetailScreen.metricVisibility')}
          accent={report.shareableToMediaKit}
        />
        </HubMetrics>
      }>
      <SectionCard
        title={t('battleReportDetailScreen.reusePublicTitle')}
        subtitle={t('battleReportDetailScreen.reusePublicSubtitle')}
        emphasis>
        <View style={styles.shareableRow}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[styles.shareableLabel, { color: theme.foreground }]}>
              {t('battleReportDetailScreen.shareableToggleLabel')}
            </Text>
            <Text style={[styles.shareableHint, { color: theme.mutedForeground }]}>
              {t('battleReportDetailScreen.shareableToggleHint')}
            </Text>
          </View>
          <Switch
            value={report.shareableToMediaKit}
            disabled={shareableMutation.isPending}
            onValueChange={onToggleShareable}
            trackColor={{ true: theme.primary }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={importMutation.isPending}
          onPress={onImportToMediaKit}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.primary, marginTop: spacing.md },
            pressed && { opacity: 0.92 },
          ]}>
          {importMutation.isPending ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t('battleReportDetailScreen.ctaImportMediaKit')}
            </Text>
          )}
        </Pressable>
        <Text style={[styles.importHint, { color: theme.mutedForeground }]}>
          {t('battleReportDetailScreen.ctaImportMediaKitHint')}
        </Text>
        <View style={[styles.templateGrid, { marginTop: spacing.md }]}>
          <View style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Badge tone="mint" label={t('battleReportDetailScreen.badgeReusable')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('battleReportDetailScreen.reuseOutcomeTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('battleReportDetailScreen.reuseOutcomeHint')}
            </Text>
          </View>
          <View style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Badge tone="warning" label={t('battleReportDetailScreen.badgeNeedsReview')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('battleReportDetailScreen.brandDataTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('battleReportDetailScreen.brandDataHint')}
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={t('battleReportDetailScreen.verifiedResultsTitle')}>
        <View style={{ gap: spacing.sm }}>
          {report.metrics.map((metric) => (
            <View key={metric} style={[styles.metricRow, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Text style={[styles.metricText, { color: theme.foreground }]}>{metric}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title={t('battleReportDetailScreen.whereToUseTitle')}>
        <View style={styles.templateGrid}>
          <View style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Badge tone="mint" label={t('battleReportDetailScreen.badgeProposal')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('battleReportDetailScreen.nextDealEvidenceTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('battleReportDetailScreen.nextDealEvidenceHint')}
            </Text>
          </View>
          <View style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Badge tone="warning" label={t('battleReportDetailScreen.badgeReviewShort')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('battleReportDetailScreen.publicFieldsTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('battleReportDetailScreen.publicFieldsHint')}
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={t('battleReportDetailScreen.lessonTitle')}>
        <Text style={[styles.lesson, { color: theme.foreground }]}>{report.lesson}</Text>
      </SectionCard>

      <HubLinkGroup
        title={t('battleReportDetailScreen.reuseNextTitle')}
        links={[
          {
            label: t('battleReportDetailScreen.ctaOpenMediaKit'),
            icon: 'images-outline',
            detail: report.shareableToMediaKit
              ? t('battleReportDetailScreen.badgeMediaKitFit')
              : t('battleReportDetailScreen.badgePrivateDefault'),
            detailAccent: report.shareableToMediaKit,
            onPress: () => assetsNav.openMediaKit(),
          },
          {
            label: t('battleReportDetailScreen.ctaAddToProposal'),
            href: '/proposal/sample',
            icon: 'document-text-outline',
          },
          {
            label: t('battleReportDetailScreen.ctaShareSummary'),
            icon: 'share-outline',
            onPress: onShareReport,
          },
          {
            label: t('battleReportsScreen.title'),
            icon: 'list-outline',
            onPress: () => assetsNav.openBattleReportsList(),
          },
        ]}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lesson: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed, fontWeight: '600' },
  metricRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
  },
  metricText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body, fontWeight: '600' },
  templateGrid: { flexDirection: 'row', gap: spacing.sm },
  templateItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  templateTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  templateHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  shareableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shareableLabel: { fontSize: fontSize.body, fontWeight: '600' },
  shareableHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  importHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body, marginTop: spacing.xs },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '700', fontSize: fontSize.body },
});
