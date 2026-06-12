import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Badge,
  HubLinkGroup,
  HubScreen,
  OpportunityPath,
  QueryRetryCard,
  SectionCard,
  type BadgeTone,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { acceptRecommendedDeal, declineRecommendedDeal } from '@/src/api/deals-api';
import { useDealDetail } from '@/src/hooks/use-deals';

function escrowTone(phase: EscrowLifecyclePhase): BadgeTone {
  switch (phase) {
    case 'settled':
      return 'primary';
    case 'escrowed':
      return 'mint';
    case 'remediation':
    case 'disputed':
      return 'danger';
    case 'pending_verification':
      return 'warning';
    default:
      return 'neutral';
  }
}

export default function DealOverviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  function primaryNextFor(dealRow: DealSummary): { label: string; href: Href } {
    switch (dealRow.escrowPhase) {
      case 'pending_verification':
        return {
          label: t('dealsScreen.uploadProof'),
          href: { pathname: '/deal/[dealId]/verification', params: { dealId: dealRow.id } },
        };
      case 'in_execution':
        return {
          label: t('dealsScreen.viewDelivery'),
          href: { pathname: '/deal/[dealId]/delivery', params: { dealId: dealRow.id } },
        };
      case 'remediation':
        return {
          label: t('dealDetailScreen.primaryHandleRemediation'),
          href: { pathname: '/deal/[dealId]/delivery', params: { dealId: dealRow.id } },
        };
      default:
        return {
          label: t('dealsScreen.openPacket'),
          href: { pathname: '/deal/[dealId]/packet', params: { dealId: dealRow.id } },
        };
    }
  }

  const queryClient = useQueryClient();
  const { escrowLifecycleLabel } = useDomainLabels();
  const params = useLocalSearchParams<{ dealId?: string | string[] }>();
  const safeId = Array.isArray(params.dealId) ? params.dealId[0] : params.dealId;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const query = useDealDetail(safeId);
  const [actionPending, setActionPending] = useState(false);

  const showRecommendedActions =
    shouldUseBackendApi() &&
    query.data?.source === 'recommended' &&
    query.data.escrowPhase === 'awaiting_prepay' &&
    /^\d+$/.test(safeId ?? '');

  const onAcceptRecommended = () => {
    if (!safeId || actionPending) return;
    setActionPending(true);
    void acceptRecommendedDeal(safeId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['deals'] });
        void queryClient.invalidateQueries({ queryKey: ['deal', 'detail', safeId] });
        void queryClient.invalidateQueries({ queryKey: ['payments'] });
      })
      .finally(() => setActionPending(false));
  };

  const onDeclineRecommended = () => {
    if (!safeId || actionPending) return;
    setActionPending(true);
    void declineRecommendedDeal(safeId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['deals'] });
        router.back();
      })
      .finally(() => setActionPending(false));
  };

  if (!safeId) {
    return (
      <PlaceholderScreen
        title={t('dealDetailScreen.missingTitle')}
        description={t('dealDetailScreen.missingDesc')}
      />
    );
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('dealDetailScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    const msg = query.error?.message ?? t('dealDetailScreen.emptyDataFallback');
    return (
      <PlaceholderScreen title={t('dealDetailScreen.loadFailedTitle')} description={t('dealDetailScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() =>
            safeId
              ? queryClient.invalidateQueries({ queryKey: ['deal', 'detail', safeId] })
              : queryClient.invalidateQueries({ queryKey: ['deals'] })
          }
        />
      </PlaceholderScreen>
    );
  }

  const deal = query.data;
  const primary = primaryNextFor(deal);
  const decisionTitle =
    deal.escrowPhase === 'awaiting_prepay'
      ? t('dealDetailScreen.decisionTitleAwaitingPrepay')
      : deal.escrowPhase === 'pending_verification'
        ? t('dealDetailScreen.decisionTitlePendingVerification')
        : deal.escrowPhase === 'remediation' || deal.escrowPhase === 'disputed'
          ? t('dealDetailScreen.decisionTitleDisputeRemediation')
          : t('dealDetailScreen.decisionTitleDefault');

  const secondaryLinks: { label: string; href: Href; hint?: string }[] = [
    {
      label: t('dealDetailScreen.linkPacket'),
      href: { pathname: '/deal/[dealId]/packet', params: { dealId: deal.id } },
      hint: t('dealDetailScreen.linkPacketHint'),
    },
    {
      label: t('dealDetailScreen.linkDelivery'),
      href: { pathname: '/deal/[dealId]/delivery', params: { dealId: deal.id } },
      hint: t('dealDetailScreen.linkDeliveryHint'),
    },
    {
      label: t('dealDetailScreen.linkVerification'),
      href: { pathname: '/deal/[dealId]/verification', params: { dealId: deal.id } },
      hint: t('dealDetailScreen.linkVerificationHint'),
    },
    {
      label: t('dealDetailScreen.linkPayments'),
      href: '/payments' as Href,
      hint: t('dealDetailScreen.linkPaymentsHint'),
    },
  ];

  return (
    <HubScreen
      testID="screen-deal-detail"
      eyebrow={t('tabs.deals')}
      title={decisionTitle}
      lead={t('dealDetailScreen.heroEvidenceLine', {
        brand: deal.brandPlaceholder,
        title: deal.title,
      })}
      toolbar={<OpportunityPath currentStep="deal" />}>
      <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.heroTop}>
          <Text style={[styles.brand, { color: theme.foregroundEyebrow }]} numberOfLines={2}>
            {deal.brandPlaceholder}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {deal.source === 'recommended' ? <Badge tone="primary" label={t('dealDetailScreen.badgeRecommended')} /> : null}
            <Badge tone={escrowTone(deal.escrowPhase)} label={escrowLifecycleLabel[deal.escrowPhase]} />
          </View>
        </View>
        {deal.nextMilestone ? (
          <Text style={[styles.next, { color: theme.foreground }]}>{deal.nextMilestone}</Text>
        ) : null}
        {deal.outcomeSummary ? (
          <Text style={[styles.outcome, { color: theme.mutedForeground }]}>{deal.outcomeSummary}</Text>
        ) : null}
        {showRecommendedActions ? (
          <View style={styles.recommendedActions}>
            <Pressable
              accessibilityRole="button"
              disabled={actionPending}
              onPress={onDeclineRecommended}
              style={[styles.secondaryBtn, { borderColor: theme.border, opacity: actionPending ? 0.6 : 1 }]}>
              <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                {t('dealDetailScreen.declineCta')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={actionPending}
              onPress={onAcceptRecommended}
              style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1, opacity: actionPending ? 0.6 : 1 }]}>
              {actionPending ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                  {t('dealDetailScreen.acceptCta')}
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(primary.href)}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>{primary.label}</Text>
          </Pressable>
        )}
      </View>

      {deal.source === 'recommended' ? (
        <SectionCard title={t('dealDetailScreen.whyRecommendedTitle')} subtitle={t('dealDetailScreen.whyRecommendedSubtitle')}>
          {deal.recommendReasons?.length ? (
            <View style={[styles.recommendExplain, { borderColor: theme.border, backgroundColor: theme.card }]}>
              {deal.recommendReasons.map((reason) => (
                <View key={reason} style={styles.explainRow}>
                  <Ionicons name="sparkles-outline" size={14} color={theme.primary} />
                  <Text style={[styles.explainText, { color: theme.foregroundSubtitle }]}>{reason}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.relationGrid}>
            <View style={[styles.relationCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Badge tone="mint" label={t('dealDetailScreen.badgeFunds')} />
              <Text style={[styles.relationTitle, { color: theme.foreground }]}>
                {t('dealDetailScreen.payoutEscrowTitle')}
              </Text>
              <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>
                {deal.recommendPayoutNote ?? t('dealDetailScreen.payoutEscrowFallback')}
              </Text>
            </View>
            <View style={[styles.relationCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Badge tone="warning" label={t('dealDetailScreen.badgeRisk')} />
              <Text style={[styles.relationTitle, { color: theme.foreground }]}>
                {t('dealDetailScreen.riskConfirmTitle')}
              </Text>
              <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>
                {deal.recommendRiskNote ?? t('dealDetailScreen.riskConfirmFallback')}
              </Text>
            </View>
          </View>
        </SectionCard>
      ) : null}

      <SectionCard title={t('dealDetailScreen.whyDealNowTitle')} subtitle={t('dealDetailScreen.whyDealNowSubtitle')}>
        <View style={styles.relationGrid}>
          <View style={[styles.relationCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="mint" label={t('dealDetailScreen.badgeFunds')} />
            <Text style={[styles.relationTitle, { color: theme.foreground }]}>
              {deal.escrowPhase === 'awaiting_prepay'
                ? t('dealDetailScreen.escrowLockedTitle')
                : t('dealDetailScreen.escrowVisibleTitle')}
            </Text>
            <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>
              {t('dealDetailScreen.keyStatusEscrowMoneyHint')}
            </Text>
          </View>
          <View style={[styles.relationCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge
              tone={deal.escrowPhase === 'disputed' || deal.escrowPhase === 'remediation' ? 'danger' : 'warning'}
              label={t('dealDetailScreen.badgeRisk')}
            />
            <Text style={[styles.relationTitle, { color: theme.foreground }]}>
              {deal.escrowPhase === 'disputed' || deal.escrowPhase === 'remediation'
                ? t('dealDetailScreen.riskReworkTitle')
                : t('dealDetailScreen.riskPacketTitle')}
            </Text>
            <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>
              {t('dealDetailScreen.keyStatusRiskEvidenceHint')}
            </Text>
          </View>
        </View>
      </SectionCard>

      <HubLinkGroup
        title={t('dealDetailScreen.quickLinks')}
        links={secondaryLinks.map((link, index) => ({
          label: link.label,
          hint: link.hint,
          href: link.href,
          detailAccent: JSON.stringify(link.href) === JSON.stringify(primary.href),
          detail:
            JSON.stringify(link.href) === JSON.stringify(primary.href)
              ? t('dealDetailScreen.linkPrimaryBadge')
              : undefined,
          icon: (['document-text-outline', 'cube-outline', 'checkmark-circle-outline', 'wallet-outline'] as const)[
            index
          ],
        }))}
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
    gap: spacing.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'flex-start' },
  brand: {
    flex: 1,
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  next: { fontSize: fontSize.body, fontWeight: '700', lineHeight: lineHeight.lead },
  outcome: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  recommendExplain: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  explainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  explainText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  relationGrid: { flexDirection: 'row', gap: spacing.sm },
  relationCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  relationTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  relationHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  recommendedActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  primaryBtn: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '700', fontSize: fontSize.body },
  secondaryBtn: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontWeight: '700', fontSize: fontSize.body },
  sectionTitle: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.8, marginTop: spacing.sm },
  secondaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: layout.touchMin,
  },
  secondaryTitle: { fontSize: fontSize.body, fontWeight: '700' },
  secondaryHint: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
