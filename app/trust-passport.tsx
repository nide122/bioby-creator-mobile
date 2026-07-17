import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  EmptyStateCard,
  HubCallout,
  HubLinkGroup,
  HubListRow,
  HubScreen,
  QueryRetryCard,
  SectionCard,
  SettingsGroup,
} from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { useTrustMetrics } from '@/src/hooks/use-trust-metrics';
import { localizeTrustMetrics } from '@/src/lib/trust-metric-i18n';
import type { TrustMetricCard } from '@/src/types/domain';

function TrustMetricTile({ metric }: { metric: TrustMetricCard }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.metricTile, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.metricValue, { color: theme.foreground }]}>{metric.value}</Text>
      <Text style={[styles.metricLabel, { color: theme.foreground }]}>{metric.label}</Text>
      {metric.trendNote ? (
        <Text style={[styles.metricTrend, { color: theme.mutedForeground }]}>{metric.trendNote}</Text>
      ) : null}
      {metric.disclaimer ? (
        <Text style={[styles.metricDisclaimer, { color: theme.foregroundEyebrow }]}>{metric.disclaimer}</Text>
      ) : null}
    </View>
  );
}

function TrustMetricGrid({ metrics }: { metrics: TrustMetricCard[] }) {
  const rows: TrustMetricCard[][] = [];
  for (let index = 0; index < metrics.length; index += 2) {
    rows.push(metrics.slice(index, index + 2));
  }

  return (
    <View style={styles.metricsGrid}>
      {rows.map((row, rowIndex) => (
        <View key={row.map((item) => item.id).join('-') || `row-${rowIndex}`} style={styles.metricsRow}>
          {row.map((metric) => (
            <TrustMetricTile key={metric.id} metric={metric} />
          ))}
          {row.length === 1 ? <View style={styles.metricTileSpacer} /> : null}
        </View>
      ))}
    </View>
  );
}

export default function TrustPassportScreen() {
  const { t } = useTranslation();
  const assetsNav = useAssetsHubNavigation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const metrics = useTrustMetrics();
  const localizedMetrics = useMemo(
    () => (metrics.data ? localizeTrustMetrics(metrics.data, t) : []),
    [metrics.data, t]
  );

  return (
    <HubScreen
      eyebrow={t('trustPassportScreen.eyebrow')}
      title={t('trustPassportScreen.title')}
      lead={t('trustPassportScreen.description')}>
      <HubCallout
        title={t('trustPassportScreen.repositionTitle')}
        body={t('trustPassportScreen.repositionBody')}
      />

      <SettingsGroup title={t('trustPassportScreen.primaryActionTitle')}>
        <HubListRow
          icon="images-outline"
          title={t('trustPassportScreen.ctaOpenMediaKit')}
          subtitle={t('trustPassportScreen.ctaOpenMediaKitHint')}
          onPress={() => assetsNav.openMediaKit()}
        />
        <HubListRow
          icon="pricetag-outline"
          title={t('trustPassportScreen.linkPricing')}
          subtitle={t('trustPassportScreen.ctaPricingHint')}
          onPress={() => assetsNav.openPricing()}
        />
      </SettingsGroup>

      <SectionCard
        title={t('trustPassportScreen.appendixTitle')}
        subtitle={t('trustPassportScreen.appendixSubtitle')}>
        <Text style={[styles.appendixNote, { color: theme.mutedForeground }]}>
          {t('trustPassportScreen.appendixNote')}
        </Text>
        {metrics.isPending ? (
          <View style={styles.centeredBlock}>
            <ActivityIndicator accessibilityLabel={t('trustPassportScreen.loadingA11y')} color={theme.primary} />
          </View>
        ) : metrics.error ? (
          <QueryRetryCard
            message={metrics.error.message}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['tenant'] })}
          />
        ) : localizedMetrics.length === 0 ? (
          <EmptyStateCard
            title={t('trustPassportScreen.emptyMetricsTitle')}
            description={t('trustPassportScreen.emptyMetricsDesc')}
          />
        ) : (
          <TrustMetricGrid metrics={localizedMetrics} />
        )}
      </SectionCard>

      <HubLinkGroup
        title={t('trustPassportScreen.relatedTitle')}
        links={[
          {
            label: t('trustPassportScreen.linkMediaKit'),
            icon: 'images-outline',
            onPress: () => assetsNav.openMediaKit(),
          },
          {
            label: t('trustPassportScreen.linkPricing'),
            icon: 'pricetag-outline',
            onPress: () => assetsNav.openPricing(),
          },
        ]}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centeredBlock: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  appendixNote: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    marginBottom: spacing.md,
  },
  metricsGrid: { gap: spacing.sm },
  metricsRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  metricTile: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    minHeight: layout.touchMin + spacing.lg,
  },
  metricTileSpacer: { flex: 1 },
  metricValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  metricTrend: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  metricDisclaimer: { fontSize: 11, lineHeight: 14, marginTop: spacing.xs },
});
