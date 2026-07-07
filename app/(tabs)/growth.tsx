import type { ComponentProps } from 'react';
import { useCallback } from 'react';
import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import {
  HubCallout,
  HubListRow,
  HubMetric,
  HubMetrics,
  HubPromoRow,
  HubScreen,
  SettingsGroup,
} from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { primeMockGrowthQueryFailure } from '@/src/api/mock-growth';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { useTabRefresh } from '@/src/hooks/use-tab-refresh';
import { useAssetsHubSummaries } from '@/src/hooks/use-assets-hub-summaries';
import { useOpenProposal } from '@/src/hooks/use-open-proposal';

export default function AssetsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const hub = useAssetsHubSummaries();
  const { openProposal } = useOpenProposal();

  const refreshAssets = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['growth'] }),
      queryClient.invalidateQueries({ queryKey: ['battle-reports'] }),
      queryClient.invalidateQueries({ queryKey: ['drafts'] }),
      queryClient.invalidateQueries({ queryKey: ['trust'] }),
      queryClient.invalidateQueries({ queryKey: ['disputes'] }),
      invalidateTenantScopedQueries(queryClient),
    ]);
  }, [queryClient]);
  const { refreshing, onRefresh } = useTabRefresh(refreshAssets);

  const toolbar = (
    <>
      <HubMetrics>
        <HubMetric
          value={`${hub.onTimeRate}%`}
          label={t('assetsScreen.metrics.onTime')}
          hint={t('assetsScreen.metrics.onTimeHint')}
        />
        <HubMetric
          value={hub.isLoading ? '—' : String(hub.shareableCount)}
          label={t('assetsScreen.metrics.shareable')}
          hint={t('assetsScreen.metrics.shareableHint')}
        />
        <HubMetric
          value={hub.isLoading ? '—' : String(hub.pendingDrafts)}
          label={t('assetsScreen.metrics.drafts')}
          hint={t('assetsScreen.metrics.draftsHint')}
          accent={hub.pendingDrafts > 0}
        />
      </HubMetrics>
      <HubPromoRow
        testID="assets-hero-media-kit"
        icon="share-social-outline"
        title={t('assetsScreen.heroCtaTitle')}
        subtitle={t('assetsScreen.heroCtaSubtitle')}
        onPress={() => router.push('/media-kit' as Href)}
      />
    </>
  );

  return (
    <HubScreen
      testID="screen-assets"
      eyebrow={t('tabs.assets')}
      title={t('assetsScreen.title')}
      lead={t('assetsScreen.lead')}
      toolbar={toolbar}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      <SettingsGroup title={t('assetsScreen.sections.brandFacing')}>
        <AssetRow
          testID="assets-row-media-kit"
          icon="images-outline"
          title={t('assetsScreen.rows.mediaKit.title')}
          subtitle={t('assetsScreen.rows.mediaKit.subtitle')}
          detail={hub.mediaKitDetail}
          detailAccent={hub.mediaKitNeedsAttention}
          onPress={() => router.push('/media-kit' as Href)}
        />
        <AssetRow
          testID="assets-row-trust"
          icon="shield-checkmark-outline"
          title={t('assetsScreen.rows.fulfillment.title')}
          subtitle={t('assetsScreen.rows.fulfillment.subtitle')}
          detail={hub.fulfillmentDetail}
          onPress={() => router.push('/trust-passport' as Href)}
        />
      </SettingsGroup>

      <SettingsGroup title={t('assetsScreen.sections.pitch')}>
        <AssetRow
          testID="assets-row-rate-card"
          icon="pricetag-outline"
          title={t('assetsScreen.rows.rateCard.title')}
          subtitle={t('assetsScreen.rows.rateCard.subtitle')}
          detail={hub.rateCardDetail}
          onPress={() => router.push('/pricing' as Href)}
        />
        <AssetRow
          testID="assets-row-proposal"
          icon="document-text-outline"
          title={t('assetsScreen.rows.proposal.title')}
          subtitle={t('assetsScreen.rows.proposal.subtitle')}
          detail={hub.proposalDetail}
          onPress={() => void openProposal()}
        />
        <AssetRow
          testID="assets-row-reply-templates"
          icon="chatbubble-ellipses-outline"
          title={t('assetsScreen.rows.replyTemplates.title')}
          subtitle={t('assetsScreen.rows.replyTemplates.subtitle')}
          detail={hub.replyTemplatesDetail}
          onPress={() => router.push('/settings/reply-templates' as Href)}
        />
      </SettingsGroup>

      <SettingsGroup title={t('assetsScreen.sections.playbook')}>
        <AssetRow
          testID="assets-row-battle-reports"
          icon="trophy-outline"
          title={t('assetsScreen.rows.battleReports.title')}
          subtitle={t('assetsScreen.rows.battleReports.subtitle')}
          detail={hub.battleReportsDetail}
          onPress={() => router.push('/battle-reports' as Href)}
        />
        <AssetRow
          testID="assets-row-drafts"
          icon="create-outline"
          title={t('assetsScreen.rows.drafts.title')}
          subtitle={t('assetsScreen.rows.drafts.subtitle')}
          detail={hub.draftsDetail}
          detailAccent={hub.pendingDrafts > 0}
          onPress={() => router.push('/drafts' as Href)}
        />
      </SettingsGroup>

      <SettingsGroup title={t('assetsScreen.sections.private')}>
        <AssetRow
          testID="assets-row-disputes"
          icon="lock-closed-outline"
          title={t('assetsScreen.rows.disputes.title')}
          subtitle={t('assetsScreen.rows.disputes.subtitle')}
          detail={hub.disputesDetail}
          detailAccent={hub.disputesNeedsAttention}
          onPress={() => router.push('/disputes' as Href)}
        />
      </SettingsGroup>

      <HubCallout title={t('assetsScreen.safety.title')} body={t('assetsScreen.safety.body')} />

      {__DEV__ && !shouldUseBackendApi() ? (
        <SettingsGroup title={t('assetsScreen.sections.devDemo')}>
          <AssetRow
            testID="assets-dev-mock-failure"
            icon="bug-outline"
            title={t('assetsScreen.devMockFailureTitle')}
            subtitle={t('assetsScreen.devMockFailureHint')}
            onPress={() => {
              primeMockGrowthQueryFailure();
              void queryClient.invalidateQueries({ queryKey: ['growth'] });
            }}
          />
        </SettingsGroup>
      ) : null}

      {hub.isLoading ? (
        <ActivityIndicator color={theme.primary} accessibilityLabel={t('assetsScreen.loadingA11y')} />
      ) : null}
    </HubScreen>
  );
}

function AssetRow(props: ComponentProps<typeof HubListRow>) {
  return <HubListRow {...props} />;
}
