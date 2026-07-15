import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { type Href, useRouter } from 'expo-router';

import {
  EmptyStateCard,
  FilterChipRow,
  HubListRow,
  HubScreen,
  QueryRetryCard,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette, fontSize, spacing } from '@/constants/tokens';
import { useDeals } from '@/src/hooks/use-deals';
import { useDealListFocusRefresh, useDealListRefresh } from '@/src/hooks/use-deal-refresh';
import { useBattleReports, useGenerateBattleReport } from '@/src/hooks/use-battle-reports';
import { invalidateDealListQueries } from '@/src/lib/invalidate-deal-queries';
import {
  activeDeals,
  countDealsByOverviewFilter,
  DEAL_OVERVIEW_CHIP_ORDER,
  filterDealsForOverview,
  type DealOverviewFilter,
} from '@/src/lib/deal-overview-filter';
import {
  battleReportDetailHref,
  findBattleReportForDeal,
} from '@/src/lib/battle-report-deal';
import { alertAction } from '@/src/lib/app-dialog';
import { DealCard } from '@/components/deals/DealCard';
import { DealSidePanel } from '@/components/deals/DealSidePanel';
import type { DealSummary } from '@/src/types/domain';

export default function DealsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const deals = useDeals();
  const battleReports = useBattleReports();
  const generateBattleReport = useGenerateBattleReport();
  const { refreshing, onRefresh } = useDealListRefresh();
  useDealListFocusRefresh();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [previewDealId, setPreviewDealId] = useState<string | null>(null);
  const [overviewFilter, setOverviewFilter] = useState<DealOverviewFilter>('all_active');
  const [generatingDealId, setGeneratingDealId] = useState<string | null>(null);

  const activeRows = useMemo(() => activeDeals(deals.data ?? []), [deals.data]);
  const filterCounts = useMemo(() => countDealsByOverviewFilter(deals.data ?? []), [deals.data]);
  const visibleDeals = useMemo(
    () => filterDealsForOverview(deals.data ?? [], overviewFilter),
    [deals.data, overviewFilter]
  );
  const previewDeal = deals.data?.find((deal) => deal.id === previewDealId) ?? null;
  const isCompletedFilter = overviewFilter === 'settled';

  const filterChips = useMemo(
    () =>
      DEAL_OVERVIEW_CHIP_ORDER.map((id) => ({
        id,
        label: t(`dealsScreen.filters.${id}`),
        count: filterCounts[id],
      })),
    [filterCounts, t]
  );

  function openDeal(deal: DealSummary) {
    router.push(`/deal/${deal.id}` as Href);
  }

  async function openBattleReportForDeal(deal: DealSummary) {
    const linked = findBattleReportForDeal(deal.id, battleReports.data);
    if (linked) {
      router.push(battleReportDetailHref(linked.id));
      return;
    }
    if (generatingDealId) return;
    setGeneratingDealId(deal.id);
    try {
      const created = await generateBattleReport.mutateAsync({
        dealId: deal.id,
        title: deal.title,
      });
      router.push(battleReportDetailHref(created.id));
    } catch {
      void alertAction(
        t('dealsScreen.generateBattleReportFailTitle'),
        t('dealsScreen.generateBattleReportFailDesc')
      );
    } finally {
      setGeneratingDealId(null);
    }
  }

  function battleReportActionFor(deal: DealSummary) {
    if (deal.escrowPhase !== 'settled') return undefined;
    const linked = findBattleReportForDeal(deal.id, battleReports.data);
    return {
      label: linked ? t('dealsScreen.viewBattleReport') : t('dealsScreen.generateBattleReport'),
      loading: generatingDealId === deal.id,
      onPress: () => void openBattleReportForDeal(deal),
    };
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

  const toolbar = <FilterChipRow items={filterChips} value={overviewFilter} onChange={setOverviewFilter} />;

  return (
    <HubScreen
      testID="screen-deals"
      refreshing={refreshing}
      onRefresh={onRefresh}
      eyebrow={t('tabs.deals')}
      title={t('dealsScreen.title')}
      lead={
        isCompletedFilter
          ? t('dealsScreen.descriptionCompleted', { count: filterCounts.settled })
          : t('dealsScreen.description', { active: activeRows.length })
      }
      toolbar={toolbar}>
      {activeRows.length === 0 && !isCompletedFilter ? (
        <EmptyStateCard
          title={t('dealsScreen.emptyTitle')}
          description={t('dealsScreen.emptyDesc')}
          primaryAction={{ label: t('dealsScreen.goMail'), onPress: () => router.push('/inbox' as Href) }}
          secondaryAction={{ label: t('dealsScreen.goPricing'), onPress: () => router.push('/pricing' as Href) }}
        />
      ) : null}

      {isCompletedFilter && filterCounts.settled > 0 ? (
        <HubListRow
          testID="deals-battle-report-archive"
          icon="albums-outline"
          title={t('dealsScreen.battleReportArchive')}
          subtitle={t('dealsScreen.battleReportArchiveHint')}
          onPress={() => router.push('/battle-reports' as Href)}
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
        <View style={styles.activeSection}>
          <Text style={[styles.sectionTitle, { color: theme.foregroundEyebrow }]}>
            {isCompletedFilter ? t('dealsScreen.sectionCompleted') : t('dealsScreen.sectionActive')}
          </Text>
          <View style={styles.cardList}>
            {visibleDeals.map((item) => (
              <DealCard
                key={item.id}
                deal={item}
                selected={item.id === previewDealId}
                battleReportAction={battleReportActionFor(item)}
                onPress={() => openDeal(item)}
                onPreviewPress={() => setPreviewDealId(item.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <DealSidePanel deal={previewDeal} onClose={() => setPreviewDealId(null)} />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
  activeSection: { gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: spacing.xs,
  },
  cardList: { gap: spacing.md },
});
