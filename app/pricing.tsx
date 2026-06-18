import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { type Href } from 'expo-router';

import { RateCardPackageList } from '@/components/pricing/RateCardPackageList';
import { Badge, HubLinkGroup, HubScreen, QueryRetryCard, SectionCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { useRateCardPackages } from '@/src/hooks/use-growth';

export default function PricingScreen() {
  const { t } = useTranslation();
  const assetsNav = useAssetsHubNavigation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const rateCard = useRateCardPackages();

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
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['growth', 'rate-cards'] })}
        />
      </PlaceholderScreen>
    );
  }

  return (
    <HubScreen eyebrow={t('tabs.assets')} title={t('pricingScreen.title')} lead={t('pricingScreen.description')}>
      <HubLinkGroup
        title={t('pricingScreen.manageTitle')}
        links={[
          {
            label: t('pricingScreen.ctaAddPackage'),
            href: '/pricing-edit?new=1' as Href,
            icon: 'add-circle-outline',
            hint: t('pricingScreen.ctaAddPackageHint'),
          },
          {
            label: t('pricingScreen.ctaEditPlatformRates'),
            icon: 'grid-outline',
            hint: t('pricingScreen.ctaEditPlatformRatesHint'),
            onPress: () => assetsNav.openMediaKitEdit(),
          },
        ]}
      />

      <RateCardPackageList packages={rateCard.data} />

      <SectionCard title={t('pricingScreen.whyRulesTitle')} emphasis>
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.aiRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="mint" label={t('pricingScreen.badgeAiDraft')} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[styles.aiTitle, { color: theme.foreground }]}>{t('pricingScreen.aiDraftTitle')}</Text>
              <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('pricingScreen.aiDraftHint')}</Text>
            </View>
          </View>
          <View style={[styles.aiRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="warning" label={t('pricingScreen.badgeNeedsApproval')} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[styles.aiTitle, { color: theme.foreground }]}>{t('pricingScreen.discountTitle')}</Text>
              <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('pricingScreen.discountHint')}</Text>
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title={t('pricingScreen.notSubscriptionTitle')}
        subtitle={t('pricingScreen.notSubscriptionSubtitle')}
      />

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
  hint: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  aiRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  aiTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
});
