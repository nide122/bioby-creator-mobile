import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { type Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { RateCardPackageList } from '@/components/pricing/RateCardPackageList';
import { Badge, HubLinkGroup, HubScreen, QueryRetryCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
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

      <WhyRulesCollapsible theme={theme} />

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

function WhyRulesCollapsible({ theme }: { theme: (typeof palette)['light'] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.whyRulesCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <View style={[styles.whyRulesAccent, { backgroundColor: theme.primary }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('pricingScreen.collapseWhyRulesA11y')
            : t('pricingScreen.expandWhyRulesA11y')
        }
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.whyRulesHeader, pressed && { opacity: 0.88 }]}>
        <View style={styles.whyRulesHeaderCopy}>
          <Text style={[styles.whyRulesTitle, { color: theme.foreground }]}>{t('pricingScreen.whyRulesTitle')}</Text>
          {!expanded ? (
            <Text style={[styles.whyRulesSummary, { color: theme.mutedForeground }]} numberOfLines={2}>
              {t('pricingScreen.whyRulesSummary')}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.foregroundEyebrow}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.whyRulesBody}>
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  whyRulesCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  whyRulesAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.65,
  },
  whyRulesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  whyRulesHeaderCopy: { flex: 1, gap: spacing.xs },
  whyRulesTitle: { fontSize: fontSize.body, fontWeight: '700', letterSpacing: -0.15 },
  whyRulesSummary: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  whyRulesBody: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
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
