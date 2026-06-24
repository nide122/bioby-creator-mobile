import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { type Href, useRouter } from 'expo-router';

import {
  EmptyStateCard,
  FilterChipRow,
  HubMetric,
  HubMetrics,
  HubScreen,
  QueryRetryCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { useDeals } from '@/src/hooks/use-deals';
import { useDealListFocusRefresh, useDealListRefresh } from '@/src/hooks/use-deal-refresh';
import { invalidateDealListQueries } from '@/src/lib/invalidate-deal-queries';
import {
  activeDeals,
  countDealsByOverviewFilter,
  DEAL_OVERVIEW_FILTER_ORDER,
  filterDealsForOverview,
  type DealOverviewFilter,
} from '@/src/lib/deal-overview-filter';
import { DealCard } from '@/components/deals/DealCard';
import { DealSidePanel } from '@/components/deals/DealSidePanel';
import type { DealSummary } from '@/src/types/domain';

export default function DealsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const deals = useDeals();
  const { refreshing, onRefresh } = useDealListRefresh();
  useDealListFocusRefresh();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [previewDealId, setPreviewDealId] = useState<string | null>(null);
  const [overviewFilter, setOverviewFilter] = useState<DealOverviewFilter>('all_active');

  const activeRows = useMemo(() => activeDeals(deals.data ?? []), [deals.data]);
  const filterCounts = useMemo(() => countDealsByOverviewFilter(deals.data ?? []), [deals.data]);
  const visibleDeals = useMemo(
    () => filterDealsForOverview(deals.data ?? [], overviewFilter),
    [deals.data, overviewFilter]
  );
  const previewDeal = deals.data?.find((deal) => deal.id === previewDealId) ?? null;

  const filterChips = useMemo(
    () =>
      DEAL_OVERVIEW_FILTER_ORDER.map((id) => ({
        id,
        label: t(`dealsScreen.filters.${id}`),
        count: filterCounts[id],
      })),
    [filterCounts, t]
  );

  function openDeal(deal: DealSummary) {
    router.push(`/deal/${deal.id}` as Href);
  }

  if (deals.isPending && !deals.data) {
    return (
      <HubScreen
        testID="screen-deals"
        refreshing={refreshing}
        onRefresh={onRefresh}
        eyebrow={t('tabs.deals')}
        title={t('dealsScreen.title')}>
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel={t('dealsScreen.loadingA11y')} color={theme.primary} />
        </View>
      </HubScreen>
    );
  }

  if (deals.error && !deals.data) {
    return (
      <PlaceholderScreen title={t('dealsScreen.errorTitle')} description={t('dealsScreen.errorDesc')}>
        <QueryRetryCard
          message={deals.error.message}
          onRetry={() => invalidateDealListQueries(queryClient)}
        />
      </PlaceholderScreen>
    );
  }

  const toolbar = (
    <>
      <HubMetrics>
        <HubMetric value={String(filterCounts.all_active)} label={t('dealsScreen.metrics.active')} accent />
        <HubMetric
          value={String(filterCounts.awaiting_payment)}
          label={t('dealsScreen.metrics.awaitingPayment')}
          accent={filterCounts.awaiting_payment > 0}
        />
        <HubMetric
          value={String(filterCounts.pending_review)}
          label={t('dealsScreen.metrics.pendingReview')}
          accent={filterCounts.pending_review > 0}
        />
      </HubMetrics>
      <FilterChipRow items={filterChips} value={overviewFilter} onChange={setOverviewFilter} />
    </>
  );

  return (
    <HubScreen
      testID="screen-deals"
      refreshing={refreshing}
      onRefresh={onRefresh}
      eyebrow={t('tabs.deals')}
      title={t('dealsScreen.title')}
      lead={t('dealsScreen.description', { total: activeRows.length })}
      toolbar={toolbar}>
      {activeRows.length === 0 && overviewFilter !== 'settled' ? (
        <EmptyStateCard
          title={t('dealsScreen.emptyTitle')}
          description={t('dealsScreen.emptyDesc')}
          primaryAction={{ label: t('dealsScreen.goMail'), onPress: () => router.push('/inbox' as Href) }}
          secondaryAction={{ label: t('dealsScreen.goPricing'), onPress: () => router.push('/pricing' as Href) }}
        />
      ) : null}

      {visibleDeals.length === 0 ? (
        <EmptyStateCard
          title={t('dealsScreen.filterEmptyTitle')}
          description={t('dealsScreen.filterEmptyDesc')}
          primaryAction={{
            label: t('dealsScreen.filterReset'),
            onPress: () => setOverviewFilter('all_active'),
          }}
        />
      ) : null}

      {visibleDeals.length > 0 ? (
        <SettingsGroup title={t('dealsScreen.sectionActive')}>
          <View style={styles.cardList}>
            {visibleDeals.map((item) => (
              <DealCard
                key={item.id}
                deal={item}
                recommended={item.source === 'recommended'}
                selected={item.id === previewDealId}
                onPress={() => openDeal(item)}
                onPreviewPress={() => setPreviewDealId(item.id)}
              />
            ))}
          </View>
        </SettingsGroup>
      ) : null}

      <DealSidePanel deal={previewDeal} onClose={() => setPreviewDealId(null)} />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
  cardList: { gap: 12 },
});
