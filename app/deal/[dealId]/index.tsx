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
import { DealStatusStrip } from '@/components/deals/DealStatusStrip';
import { DealTermsWithContractSection } from '@/components/deals/DealTermsWithContractSection';
import { DeadlineReminderSection } from '@/components/deadline/DeadlineReminderSection';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { acceptRecommendedDeal, collectDealPrepay, declineRecommendedDeal, openDealDispute } from '@/src/api/deals-api';
import { ApiError } from '@/src/api/api-client';
import { alertAction } from '@/src/lib/app-dialog';
import { invalidateDealListQueries, invalidateDealWorkspaceQueries, refetchDealWorkspaceQueries } from '@/src/lib/invalidate-deal-queries';
import { localizeDealSummaryCopy } from '@/src/lib/deal-copy-i18n';
import { resolveFulfillmentStatus } from '@/src/lib/deal-fulfillment-status';
import { cooperationLeadLine, shouldShowCooperationBrandEyebrow } from '@/src/lib/cooperation-display-name';
import { getActiveTenantPublicId, tenantQueryKey } from '@/src/lib/tenant-query';
import { useDealWorkspaceFocusRefresh, useDealWorkspaceRefresh } from '@/src/hooks/use-deal-refresh';
import { useDealDetail } from '@/src/hooks/use-deals';
import { useDealPacket } from '@/src/hooks/use-deal-packet';
import { useDealTermsAndContract } from '@/src/hooks/use-deal-terms-and-contract';
import { useBattleReports, useGenerateBattleReport } from '@/src/hooks/use-battle-reports';
import {
  battleReportDetailHref,
  findBattleReportForDeal,
} from '@/src/lib/battle-report-deal';

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
      case 'escrowed':
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
  const packetQuery = useDealPacket(safeId);
  const termsContract = useDealTermsAndContract(query.data);
  const battleReports = useBattleReports();
  const generateBattleReport = useGenerateBattleReport();
  const { refreshing, onRefresh } = useDealWorkspaceRefresh(safeId);
  useDealWorkspaceFocusRefresh(safeId);
  const [actionPending, setActionPending] = useState(false);
  const [generatingBattleReport, setGeneratingBattleReport] = useState(false);

  const showRecommendedActions =
    shouldUseBackendApi() &&
    query.data?.source === 'recommended' &&
    query.data.escrowPhase === 'awaiting_prepay' &&
    /^\d+$/.test(safeId ?? '');

  const showCollectPrepay =
    shouldUseBackendApi() &&
    query.data?.source !== 'recommended' &&
    query.data?.escrowPhase === 'awaiting_prepay' &&
    /^\d+$/.test(safeId ?? '');

  const onCollectPrepay = () => {
    if (!safeId || actionPending) return;
    setActionPending(true);
    const detailKey = tenantQueryKey(getActiveTenantPublicId(), 'deals', 'detail', safeId, {
      api: shouldUseBackendApi(),
    });
    void collectDealPrepay(safeId)
      .then((updated) => {
        queryClient.setQueryData(detailKey, updated);
        invalidateDealListQueries(queryClient);
        invalidateDealWorkspaceQueries(queryClient, safeId);
      })
      .catch(async (error) => {
        await refetchDealWorkspaceQueries(queryClient, safeId);
        const refreshed = queryClient.getQueryData<DealSummary>(detailKey);
        if (refreshed?.escrowPhase && refreshed.escrowPhase !== 'awaiting_prepay') {
          return;
        }
        if (error instanceof ApiError && error.code === 'INVALID_PHASE') {
          invalidateDealListQueries(queryClient);
          invalidateDealWorkspaceQueries(queryClient, safeId);
          return;
        }
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : t('dealDetailScreen.collectPrepayErrorBody');
        void alertAction(t('dealDetailScreen.collectPrepayErrorTitle'), message);
      })
      .finally(() => setActionPending(false));
  };

  const onOpenDispute = (dealTitle: string) => {
    if (!safeId || actionPending) return;
    setActionPending(true);
    void openDealDispute(safeId, { title: `${dealTitle} dispute`, causeCode: 'GENERAL' })
      .then(() => {
        if (safeId) invalidateDealWorkspaceQueries(queryClient, safeId);
      })
      .catch(() => {
        void alertAction(t('dealDetailScreen.openDisputeErrorTitle'), t('dealDetailScreen.openDisputeErrorBody'));
      })
      .finally(() => setActionPending(false));
  };

  const onAcceptRecommended = () => {
    if (!safeId || actionPending) return;
    setActionPending(true);
    void acceptRecommendedDeal(safeId)
      .then(() => {
        invalidateDealListQueries(queryClient);
        if (safeId) invalidateDealWorkspaceQueries(queryClient, safeId);
        void queryClient.invalidateQueries({ queryKey: ['payments'] });
      })
      .finally(() => setActionPending(false));
  };

  const onDeclineRecommended = () => {
    if (!safeId || actionPending) return;
    setActionPending(true);
    void declineRecommendedDeal(safeId)
      .then(() => {
        invalidateDealListQueries(queryClient);
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

  if (query.isPending && !query.data) {
    return (
      <HubScreen
        eyebrow={t('tabs.deals')}
        title={t('dealDetailScreen.loadingA11y')}
        refreshing={refreshing}
        onRefresh={onRefresh}>
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel={t('dealDetailScreen.loadingA11y')} color={theme.primary} />
        </View>
      </HubScreen>
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
              ? invalidateDealWorkspaceQueries(queryClient, safeId)
              : invalidateDealListQueries(queryClient)
          }
        />
      </PlaceholderScreen>
    );
  }

  const deal = query.data;
  const dealCopy = localizeDealSummaryCopy(deal, t);
  const linkedBattleReport = findBattleReportForDeal(deal.id, battleReports.data);
  const fulfillmentStatus = resolveFulfillmentStatus(
    deal,
    packetQuery.data?.packet,
    packetQuery.data?.fulfillmentStatus,
  );
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

  const showOpenDispute =
    shouldUseBackendApi() &&
    /^\d+$/.test(deal.id) &&
    deal.escrowPhase !== 'settled' &&
    deal.escrowPhase !== 'disputed' &&
    deal.escrowPhase !== 'awaiting_prepay';

  return (
    <HubScreen
      testID="screen-deal-detail"
      eyebrow={t('tabs.deals')}
      title={decisionTitle}
      lead={cooperationLeadLine(deal.brandPlaceholder, deal.title)}
      refreshing={refreshing}
      onRefresh={onRefresh}
      toolbar={<OpportunityPath currentStep="deal" />}>
      <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.heroTop}>
          {shouldShowCooperationBrandEyebrow(deal.brandPlaceholder, deal.title) ? (
            <Text style={[styles.brand, { color: theme.foregroundEyebrow }]} numberOfLines={2}>
              {deal.brandPlaceholder}
            </Text>
          ) : (
            <Text style={[styles.brand, { color: theme.foreground }]} numberOfLines={2}>
              {deal.title}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {deal.source === 'recommended' ? <Badge tone="primary" label={t('dealDetailScreen.badgeRecommended')} /> : null}
            <Badge tone={escrowTone(deal.escrowPhase)} label={escrowLifecycleLabel[deal.escrowPhase]} />
          </View>
        </View>
        {dealCopy.nextMilestone ? (
          <Text style={[styles.next, { color: theme.foreground }]}>{dealCopy.nextMilestone}</Text>
        ) : null}
        {dealCopy.outcomeSummary ? (
          <Text style={[styles.outcome, { color: theme.mutedForeground }]}>{dealCopy.outcomeSummary}</Text>
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
        ) : showCollectPrepay ? (
          <Pressable
            accessibilityRole="button"
            disabled={actionPending}
            onPress={onCollectPrepay}
            style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: actionPending ? 0.6 : 1 }]}>
            {actionPending ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                {t('dealDetailScreen.collectPrepayCta')}
              </Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(primary.href)}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>{primary.label}</Text>
          </Pressable>
        )}
      </View>

      <DealStatusStrip dealId={deal.id} status={fulfillmentStatus} />

      <DeadlineReminderSection
        entityType="deal"
        entityId={deal.id}
        title={deal.title}
        brandLabel={deal.brandPlaceholder}
        deadlineAtISO={deal.deadlineAtISO}
        deadlineKind={deal.deadlineKind}
        deadlineText={deal.deadlineText}
      />

      <DealTermsWithContractSection
        loading={termsContract.loading}
        termLines={termsContract.termLines}
        deliverableLines={termsContract.deliverableLines}
        usageRights={termsContract.usageRights}
        showContractBlock={termsContract.showContractBlock}
        contractCardProps={termsContract.contractCardProps}
      />

      {deal.source === 'recommended' ? (
        <SectionCard title={t('dealDetailScreen.whyRecommendedTitle')} subtitle={t('dealDetailScreen.whyRecommendedSubtitle')}>
          {dealCopy.recommendReasons?.length ? (
            <View style={[styles.recommendExplain, { borderColor: theme.border, backgroundColor: theme.card }]}>
              {dealCopy.recommendReasons.map((reason) => (
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
                {dealCopy.recommendPayoutNote ?? t('dealDetailScreen.payoutEscrowFallback')}
              </Text>
            </View>
            <View style={[styles.relationCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Badge tone="warning" label={t('dealDetailScreen.badgeRisk')} />
              <Text style={[styles.relationTitle, { color: theme.foreground }]}>
                {t('dealDetailScreen.riskConfirmTitle')}
              </Text>
              <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>
                {dealCopy.recommendRiskNote ?? t('dealDetailScreen.riskConfirmFallback')}
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

      {deal.escrowPhase === 'settled' ? (
        <HubLinkGroup
          title={t('dealDetailScreen.quickLinks')}
          links={[
            {
              label: linkedBattleReport
                ? t('dealsScreen.viewBattleReport')
                : t('dealsScreen.generateBattleReport'),
              hint: t('dealDetailScreen.battleReportHint'),
              icon: 'ribbon-outline',
              detailAccent: true,
              onPress: () => {
                if (linkedBattleReport) {
                  router.push(battleReportDetailHref(linkedBattleReport.id));
                  return;
                }
                if (generatingBattleReport) return;
                setGeneratingBattleReport(true);
                void generateBattleReport
                  .mutateAsync({ dealId: deal.id, title: deal.title })
                  .then((created) => router.push(battleReportDetailHref(created.id)))
                  .catch(() => {
                    void alertAction(
                      t('dealsScreen.generateBattleReportFailTitle'),
                      t('dealsScreen.generateBattleReportFailDesc')
                    );
                  })
                  .finally(() => setGeneratingBattleReport(false));
              },
            },
          ]}
        />
      ) : null}

      {showOpenDispute ? (
        <HubLinkGroup
          title={t('hubLinks.actions')}
          links={[
            {
              label: t('dealDetailScreen.openDisputeCta'),
              icon: 'shield-outline',
              detailAccent: true,
              onPress: () => onOpenDispute(deal.title),
            },
          ]}
        />
      ) : null}

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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
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
