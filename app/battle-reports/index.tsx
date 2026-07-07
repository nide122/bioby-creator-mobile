import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  HubLinkGroup,
  HubListRow,
  HubMetric,
  HubMetrics,
  HubScreen,
  QueryRetryCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { useBattleReports } from '@/src/hooks/use-battle-reports';
import { useOpenProposal } from '@/src/hooks/use-open-proposal';

export default function BattleReportsIndexScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const assetsNav = useAssetsHubNavigation();
  const { openProposal } = useOpenProposal();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const reports = useBattleReports();

  if (reports.isPending) {
    return (
      <View testID="screen-battle-reports" style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('battleReportsScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (reports.error || !reports.data) {
    const msg = reports.error?.message ?? t('battleReportsScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('battleReportsScreen.loadFailedTitle')}
        description={t('battleReportsScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['battle-reports'] })}
        />
      </PlaceholderScreen>
    );
  }

  const shareableCount = reports.data.filter((r) => r.shareableToMediaKit).length;

  return (
    <HubScreen
      testID="screen-battle-reports"
      eyebrow={t('tabs.assets')}
      title={t('battleReportsScreen.title')}
      lead={t('battleReportsScreen.description')}
      toolbar={
        <HubMetrics>
          <HubMetric value={String(reports.data.length)} label={t('battleReportsScreen.metricTotal')} />
          <HubMetric
            value={String(shareableCount)}
            label={t('battleReportsScreen.metricShareable')}
            accent={shareableCount > 0}
          />
        </HubMetrics>
      }>
      <SettingsGroup title={t('battleReportsScreen.listHeading')}>
        {reports.data.map((item) => (
          <HubListRow
            key={item.id}
            icon="trophy-outline"
            title={item.title}
            subtitle={item.metrics[0]}
            detail={
              item.shareableToMediaKit
                ? t('battleReportsScreen.badgeShareable')
                : t('battleReportsScreen.badgePrivate')
            }
            detailAccent={item.shareableToMediaKit}
            onPress={() => router.push(`/battle-reports/${item.id}` as Href)}
          />
        ))}
      </SettingsGroup>

      <HubLinkGroup
        title={t('battleReportsScreen.reuseTitle')}
        links={[
          {
            label: t('battleReportsScreen.ctaUpdateMediaKit'),
            icon: 'images-outline',
            hint: t('battleReportsScreen.ctaUpdateMediaKitHint'),
            onPress: () => assetsNav.openMediaKit(),
          },
          {
            label: t('battleReportsScreen.ctaAddToProposal'),
            icon: 'document-text-outline',
            hint: t('battleReportsScreen.ctaAddToProposalHint'),
            onPress: () => void openProposal(),
          },
        ]}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
