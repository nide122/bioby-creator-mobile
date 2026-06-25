import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { RateCardPackageList } from '@/components/pricing/RateCardPackageList';
import { HubLinkGroup, HubScreen, QueryRetryCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { useRateCardPackages, rateCardPackagesQueryKey } from '@/src/hooks/use-growth';

export default function PricingScreen() {
  const { t } = useTranslation();
  const assetsNav = useAssetsHubNavigation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const rateCard = useRateCardPackages();

  useFocusEffect(
    useCallback(() => {
      void queryClient.refetchQueries({ queryKey: rateCardPackagesQueryKey() });
    }, [queryClient]),
  );

  if (rateCard.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('pricingScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (rateCard.error || !rateCard.data) {
    const msg = rateCard.error?.message ?? t('pricingScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('pricingScreen.loadFailedTitle')}
        description={t('pricingScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() => queryClient.invalidateQueries({ queryKey: rateCardPackagesQueryKey() })}
        />
      </PlaceholderScreen>
    );
  }

  return (
    <HubScreen eyebrow={t('tabs.assets')} title={t('pricingScreen.title')} lead={t('pricingScreen.description')}>
      <RateCardPackageList packages={rateCard.data} />

      <HubLinkGroup
        title={t('pricingScreen.nextStepsTitle')}
        links={[
          {
            label: t('pricingScreen.ctaCreateProposal'),
            href: '/proposal/sample',
            icon: 'document-text-outline',
            hint: t('pricingScreen.ctaCreateProposalHint'),
          },
          {
            label: t('pricingScreen.ctaOpenMediaKit'),
            icon: 'images-outline',
            hint: t('pricingScreen.ctaOpenMediaKitHint'),
            onPress: () => assetsNav.openMediaKit(),
          },
        ]}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
