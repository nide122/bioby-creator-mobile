import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { RateCardPackageList } from '@/components/pricing/RateCardPackageList';
import { HubLinkGroup, QueryRetryCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
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

  const nextSteps = (
    <HubLinkGroup
      title={t('pricingScreen.nextStepsTitle')}
      links={[
        {
          label: t('pricingScreen.ctaOpenMediaKit'),
          icon: 'images-outline',
          hint: t('pricingScreen.ctaOpenMediaKitHint'),
          onPress: () => assetsNav.openMediaKit(),
        },
      ]}
    />
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

  const useDraggableScrollRoot = rateCard.data.length > 1 && Platform.OS !== 'web';

  if (useDraggableScrollRoot) {
    return (
      <RateCardPackageList
        packages={rateCard.data}
        scrollRoot={{
          lead: t('pricingScreen.description'),
          footer: nextSteps,
        }}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        testID="screen-pricing"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageLead, { color: theme.mutedForeground }]}>{t('pricingScreen.description')}</Text>
        <RateCardPackageList packages={rateCard.data} />
        {nextSteps}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  pageLead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
