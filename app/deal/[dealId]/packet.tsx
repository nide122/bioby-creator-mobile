import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, HubLinkGroup, HubScreen, QueryRetryCard, SectionCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useDealPacket } from '@/src/hooks/use-deal-packet';

export default function DealPacketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ dealId?: string | string[] }>();
  const dealId = Array.isArray(params.dealId) ? params.dealId[0] : params.dealId;
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const query = useDealPacket(dealId);

  const fallbackDeliverables = useMemo(
    () => [
      { label: t('dealPacketScreen.termDeliverables'), value: t('dealPacketScreen.termDeliverablesValue') },
      { label: t('dealPacketScreen.termPublishWindow'), value: t('dealPacketScreen.termPublishWindowValue') },
      { label: t('dealPacketScreen.termDisclosure'), value: t('dealPacketScreen.termDisclosureValue') },
      { label: t('dealPacketScreen.termUsageRights'), value: t('dealPacketScreen.termUsageRightsValue') },
    ],
    [t],
  );

  if (!dealId) {
    return (
      <PlaceholderScreen
        title={t('dealPacketScreen.missingTitle')}
        description={t('dealPacketScreen.missingDesc')}
      />
    );
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('dealPacketScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    return (
      <PlaceholderScreen
        title={t('dealPacketScreen.loadFailedTitle')}
        description={t('dealPacketScreen.retryDesc')}>
        <QueryRetryCard message={query.error?.message ?? t('dealPacketScreen.emptyFallback')} onRetry={() => query.refetch()} />
      </PlaceholderScreen>
    );
  }

  const deal = query.data;
  const deliverables =
    deal.packet.deliverables.length > 0 ? deal.packet.deliverables : fallbackDeliverables;

  return (
    <HubScreen
      eyebrow={t('tabs.deals')}
      title={t('dealPacketScreen.title')}
      lead={t('dealPacketScreen.heroEvidenceLine', {
        brand: deal.brandPlaceholder,
        title: deal.title,
      })}>
      <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={[styles.brand, { color: theme.foregroundEyebrow }]}>{deal.brandPlaceholder}</Text>
          <Text style={[styles.title, { color: theme.foreground }]}>{deal.title}</Text>
          {deal.packet.summary ? (
            <Text style={[styles.next, { color: theme.mutedForeground }]}>{deal.packet.summary}</Text>
          ) : null}
        </View>
        <Badge tone="mint" label={t('dealPacketScreen.badgeConfirmed')} />
      </View>

      <SectionCard title={t('dealPacketScreen.whyPacketTitle')} subtitle={t('dealPacketScreen.whyPacketSubtitle')} emphasis>
        <View style={styles.boundaryGrid}>
          <View style={[styles.boundaryCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="mint" label={t('dealPacketScreen.badgeCommitted')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('dealPacketScreen.deliveryAlignedTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('dealPacketScreen.deliveryAlignedHint')}
            </Text>
          </View>
          <View style={[styles.boundaryCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="warning" label={t('dealPacketScreen.badgeNeedsConfirm')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('dealPacketScreen.changesNeedApprovalTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('dealPacketScreen.changesNeedApprovalHint')}
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={t('dealPacketScreen.confirmedTermsTitle')}>
        <View style={{ gap: spacing.sm }}>
          {deliverables.map((item) => (
            <View key={item.label} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Text style={[styles.rowLabel, { color: theme.foregroundSubtitle }]}>{item.label}</Text>
              <Text style={[styles.rowValue, { color: theme.foreground }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title={t('dealPacketScreen.boundaryCheckTitle')}>
        <View style={styles.templateGrid}>
          <View style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Badge tone="mint" label={t('dealPacketScreen.badgeSettled')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('dealPacketScreen.boundaryDeliverablesTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('dealPacketScreen.boundaryDeliverablesHint')}
            </Text>
          </View>
          <View style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Badge tone="mint" label={t('dealPacketScreen.badgeSettled')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('dealPacketScreen.boundaryAcceptanceTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('dealPacketScreen.boundaryAcceptanceHint')}
            </Text>
          </View>
        </View>
        <View style={styles.templateGrid}>
          <View style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Badge tone="warning" label={t('dealPacketScreen.badgeNeedsConfirm')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('dealPacketScreen.boundaryUsageTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('dealPacketScreen.boundaryUsageHint')}
            </Text>
          </View>
          <View style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Badge tone="neutral" label={t('dealPacketScreen.badgeLinked')} />
            <Text style={[styles.templateTitle, { color: theme.foreground }]}>
              {t('dealPacketScreen.boundaryPaymentsTitle')}
            </Text>
            <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
              {t('dealPacketScreen.boundaryPaymentsHint')}
            </Text>
          </View>
        </View>
      </SectionCard>

      <HubLinkGroup
        title={t('hubLinks.nextSteps')}
        links={[
          {
            label: t('dealPacketScreen.ctaDelivery'),
            href: `/deal/${dealId}/delivery` as Href,
            icon: 'cube-outline',
          },
          {
            label: t('dealPacketScreen.ctaVerification'),
            href: `/deal/${dealId}/verification` as Href,
            icon: 'checkmark-circle-outline',
          },
          {
            label: t('dealDetailScreen.linkPayments'),
            href: '/payments',
            icon: 'wallet-outline',
          },
        ]}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  brand: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.8 },
  title: { fontSize: fontSize.cardTitle, fontWeight: '700', lineHeight: lineHeight.lead },
  next: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowLabel: { fontSize: fontSize.caption, fontWeight: '700' },
  rowValue: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  templateGrid: { flexDirection: 'row', gap: spacing.sm },
  boundaryGrid: { flexDirection: 'row', gap: spacing.sm },
  boundaryCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  templateItem: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  templateTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  templateHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  actions: { gap: spacing.sm },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  secondary: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
});
