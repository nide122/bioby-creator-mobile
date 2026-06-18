import { useQueryClient } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { type Href, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmptyStateCard, HubListRow, HubScreen, QueryRetryCard, SettingsGroup } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';
import { useDeals } from '@/src/hooks/use-deals';
import { useDealListFocusRefresh, useDealListRefresh } from '@/src/hooks/use-deal-refresh';
import { invalidateDealListQueries } from '@/src/lib/invalidate-deal-queries';
import { isEmailLikeLabel } from '@/src/lib/cooperation-display-name';
import { localizeDealSummaryCopy } from '@/src/lib/deal-copy-i18n';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';

type IconName = ComponentProps<typeof Ionicons>['name'];

function dealRowAccent(phase: EscrowLifecyclePhase): boolean {
  return phase === 'pending_verification' || phase === 'remediation' || phase === 'disputed';
}

function DealHubRow({ item, recommended }: { item: DealSummary; recommended?: boolean }) {
  const { t } = useTranslation();
  const { escrowLifecycleLabel } = useDomainLabels();
  const router = useRouter();
  const dealCopy = localizeDealSummaryCopy(item, t);

  const subtitleParts: string[] = [];
  const brandLine = item.brandPlaceholder?.trim();
  if (brandLine && brandLine !== item.title && !isEmailLikeLabel(brandLine)) {
    subtitleParts.push(brandLine);
  }
  if (dealCopy.outcomeSummary) subtitleParts.push(dealCopy.outcomeSummary);
  else if (dealCopy.nextMilestone) subtitleParts.push(dealCopy.nextMilestone);
  if (recommended && dealCopy.recommendReasons?.[0]) subtitleParts.push(dealCopy.recommendReasons[0]);

  const icon: IconName = recommended ? 'sparkles' : 'briefcase-outline';

  return (
    <HubListRow
      testID={`deal-card-${item.id}`}
      icon={icon}
      title={item.title}
      subtitle={subtitleParts.join(' · ')}
      detail={escrowLifecycleLabel[item.escrowPhase]}
      detailAccent={dealRowAccent(item.escrowPhase)}
      onPress={() => router.push({ pathname: '/deal/[dealId]', params: { dealId: item.id } })}
    />
  );
}

export default function DealsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const deals = useDeals();
  const { refreshing, onRefresh } = useDealListRefresh();
  useDealListFocusRefresh();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

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

  const recommended = deals.data?.filter((d) => d.source === 'recommended') ?? [];
  const selfDeals = deals.data?.filter((d) => d.source === 'self') ?? [];
  const total = deals.data?.length ?? 0;

  return (
    <HubScreen
      testID="screen-deals"
      refreshing={refreshing}
      onRefresh={onRefresh}
      eyebrow={t('tabs.deals')}
      title={t('dealsScreen.title')}
      lead={t('dealsScreen.description', { total })}>
      {total === 0 ? (
        <EmptyStateCard
          title={t('dealsScreen.emptyTitle')}
          description={t('dealsScreen.emptyDesc')}
          primaryAction={{ label: t('dealsScreen.goMail'), onPress: () => router.push('/inbox' as Href) }}
          secondaryAction={{ label: t('dealsScreen.goPricing'), onPress: () => router.push('/pricing' as Href) }}
        />
      ) : null}

      {recommended.length > 0 ? (
        <SettingsGroup title={t('dealsScreen.sectionRecommended')}>
          {recommended.map((item) => (
            <DealHubRow key={item.id} item={item} recommended />
          ))}
        </SettingsGroup>
      ) : null}

      {selfDeals.length > 0 ? (
        <SettingsGroup title={t('dealsScreen.sectionConfirmed')}>
          {selfDeals.map((item) => (
            <DealHubRow key={item.id} item={item} />
          ))}
        </SettingsGroup>
      ) : null}
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
});
