import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
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
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { resolveDispute } from '@/src/api/money-api';
import { useDisputes } from '@/src/hooks/use-money';
import { invalidateDealWorkspaceQueries } from '@/src/lib/invalidate-deal-queries';
import { invalidateMoneyQueries } from '@/src/lib/invalidate-money-queries';
import { getActiveTenantPublicId, tenantQueryKey } from '@/src/lib/tenant-query';

export default function DisputesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const disputes = useDisputes();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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
    invalidateMoneyQueries(queryClient);
  };

  const onResolve = (disputeId: string, dealId?: string) => {
    if (!shouldUseBackendApi() || !/^\d+$/.test(disputeId)) {
      Alert.alert(t('disputesScreen.resolveDemoTitle'), t('disputesScreen.resolveDemoBody'));
      return;
    }
    setResolvingId(disputeId);
    void resolveDispute(disputeId)
      .then(() => {
        invalidateMoneyQueries(queryClient);
        if (dealId) invalidateDealWorkspaceQueries(queryClient, dealId);
        void queryClient.invalidateQueries({ queryKey: tenantQueryKey(getActiveTenantPublicId(), 'decisions') });
      })
      .catch(() => {
        Alert.alert(t('disputesScreen.resolveErrorTitle'), t('disputesScreen.resolveErrorBody'));
      })
      .finally(() => setResolvingId(null));
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
      eyebrow={t('disputesScreen.eyebrow')}
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
            const canResolve = item.state !== 'resolved';

            return (
              <View key={item.id} style={{ gap: spacing.sm }}>
                <HubListRow
                  icon="shield-outline"
                  title={item.title}
                  subtitle={subtitleParts.join(' · ')}
                  detail={disputeStateLabel(item.state)}
                  detailAccent={canResolve}
                  onPress={() => {
                    if (item.dealId) {
                      router.push(`/deal/${item.dealId}` as Href);
                    }
                  }}
                />
                {canResolve ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={resolvingId === item.id}
                    onPress={() => onResolve(item.id, item.dealId)}
                    style={[
                      styles.resolveBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.secondary,
                        opacity: resolvingId === item.id ? 0.6 : 1,
                      },
                    ]}>
                    <Text style={[styles.resolveLabel, { color: theme.foreground }]}>
                      {resolvingId === item.id
                        ? t('disputesScreen.resolving')
                        : t('disputesScreen.resolveCta')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </SettingsGroup>
      )}
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resolveBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  resolveLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
});
