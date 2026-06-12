import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type Href, useRouter } from 'expo-router';

import {
  EmptyStateCard,
  HubCallout,
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
import { useDisputes } from '@/src/hooks/use-money';

export default function DisputesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const disputes = useDisputes();

  function disputeStateLabel(state: 'open' | 'mediation' | 'resolved') {
    switch (state) {
      case 'resolved':
        return t('disputesScreen.stateResolved');
      case 'mediation':
        return t('disputesScreen.stateMediation');
      default:
        return t('disputesScreen.stateOpen');
    }
  }

  function causeCopy(code?: string) {
    if (!code) return t('disputesScreen.causeFallback');
    switch (code) {
      case 'PUBLISH_WINDOW':
        return t('disputesScreen.causePublishWindow');
      case 'DISCLOSURE_MISSING':
        return t('disputesScreen.causeDisclosureMissing');
      default:
        return t('disputesScreen.causeFallback');
    }
  }

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['disputes', 'creator'] });
  };

  if (disputes.isPending) {
    return (
      <View testID="screen-disputes" style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('disputesScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (disputes.error) {
    return (
      <PlaceholderScreen title={t('disputesScreen.errorTitle')} description={t('disputesScreen.errorDesc')}>
        <QueryRetryCard message={disputes.error.message} onRetry={refetch} />
      </PlaceholderScreen>
    );
  }

  const rows = disputes.data ?? [];
  const openCount = rows.filter((item) => item.state !== 'resolved').length;

  return (
    <HubScreen
      testID="screen-disputes"
      eyebrow={t('tabs.assets')}
      title={t('disputesScreen.title')}
      lead={t('disputesScreen.description', { count: rows.length })}
      toolbar={
        <HubMetrics>
          <HubMetric value={String(rows.length)} label={t('disputesScreen.metricTotal')} />
          <HubMetric value={String(openCount)} label={t('disputesScreen.metricOpen')} accent={openCount > 0} />
        </HubMetrics>
      }>
      <HubCallout body={t('disputesScreen.organizedHint')} />

      {rows.length === 0 ? (
        <EmptyStateCard
          title={t('disputesScreen.emptyTitle')}
          description={t('disputesScreen.emptyDesc')}
          primaryAction={{
            label: t('disputesScreen.emptyCtaPacket'),
            onPress: () => router.push('/deals' as Href),
          }}
        />
      ) : (
        <SettingsGroup title={t('disputesScreen.listHeading')}>
          {rows.map((item) => {
            const subtitleParts = [
              item.causeCode ? causeCopy(item.causeCode) : null,
              item.nextActionLabel,
              item.slaHint,
              item.evidenceItems?.length
                ? `${item.evidenceItems.length} ${t('disputesScreen.evidenceTitle')}`
                : null,
            ].filter(Boolean);

            return (
              <HubListRow
                key={item.id}
                icon="shield-outline"
                title={item.title}
                subtitle={subtitleParts.join(' · ')}
                detail={disputeStateLabel(item.state)}
                detailAccent={item.state !== 'resolved'}
                onPress={() => {
                  const dealId = item.dealId ?? '1';
                  router.push(`/deal/${dealId}/delivery` as Href);
                }}
              />
            );
          })}
        </SettingsGroup>
      )}
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
