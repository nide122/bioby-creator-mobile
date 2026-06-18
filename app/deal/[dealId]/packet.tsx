import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, HubLinkGroup, HubScreen, QueryRetryCard, SectionCard, type BadgeTone } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useDealPacket } from '@/src/hooks/use-deal-packet';
import { useDealWorkspaceFocusRefresh, useDealWorkspaceRefresh } from '@/src/hooks/use-deal-refresh';
import {
  localizeDeliveryFeedbackNote,
  localizeDeliveryTimeline,
} from '@/src/lib/delivery-workflow-i18n';
import type { DealDeliveryStep } from '@/src/types/deal-workflow';
import { cooperationLeadLine, shouldShowCooperationBrandEyebrow } from '@/src/lib/cooperation-display-name';

function stepBadge(
  status: DealDeliveryStep['status'],
  t: (key: string) => string,
): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'done':
      return { label: t('dealPacketScreen.stepStatusDone'), tone: 'mint' };
    case 'current':
      return { label: t('dealPacketScreen.stepStatusCurrent'), tone: 'warning' };
    case 'blocked':
      return { label: t('dealPacketScreen.stepStatusBlocked'), tone: 'danger' };
    default:
      return { label: t('dealPacketScreen.stepStatusUpcoming'), tone: 'neutral' };
  }
}

export default function DealPacketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ dealId?: string | string[] }>();
  const dealId = Array.isArray(params.dealId) ? params.dealId[0] : params.dealId;
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const query = useDealPacket(dealId);
  const { refreshing, onRefresh } = useDealWorkspaceRefresh(dealId);
  useDealWorkspaceFocusRefresh(dealId);

  const fallbackDeliverables = useMemo(
    () => [
      { label: t('dealPacketScreen.termDeliverables'), value: t('dealPacketScreen.termDeliverablesValue') },
      { label: t('dealPacketScreen.termPublishWindow'), value: t('dealPacketScreen.termPublishWindowValue') },
      { label: t('dealPacketScreen.termDisclosure'), value: t('dealPacketScreen.termDisclosureValue') },
      { label: t('dealPacketScreen.termUsageRights'), value: t('dealPacketScreen.termUsageRightsValue') },
    ],
    [t],
  );

  const rawTimeline = query.data?.packet.delivery?.timeline ?? [];
  const deliveryTimeline = useMemo(
    () => localizeDeliveryTimeline(rawTimeline, t),
    [rawTimeline, t],
  );
  const rawFeedbackNote = query.data?.packet.delivery?.feedbackNote;
  const localizedFeedbackNote = useMemo(
    () => localizeDeliveryFeedbackNote(rawFeedbackNote, t),
    [rawFeedbackNote, t],
  );

  if (!dealId) {
    return (
      <PlaceholderScreen
        title={t('dealPacketScreen.missingTitle')}
        description={t('dealPacketScreen.missingDesc')}
      />
    );
  }

  if (query.isPending && !query.data) {
    return (
      <HubScreen
        eyebrow={t('tabs.deals')}
        title={t('dealPacketScreen.title')}
        refreshing={refreshing}
        onRefresh={onRefresh}>
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel={t('dealPacketScreen.loadingA11y')} color={theme.primary} />
        </View>
      </HubScreen>
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
  const verification = deal.packet.verification;
  const verificationPassed =
    verification?.checklist.filter((item) => item.passed).length ?? 0;
  const verificationTotal = verification?.checklist.length ?? 0;

  return (
    <HubScreen
      eyebrow={t('tabs.deals')}
      title={t('dealPacketScreen.title')}
      lead={cooperationLeadLine(deal.brandPlaceholder, deal.title)}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          {shouldShowCooperationBrandEyebrow(deal.brandPlaceholder, deal.title) ? (
            <Text style={[styles.brand, { color: theme.foregroundEyebrow }]}>{deal.brandPlaceholder}</Text>
          ) : null}
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

      {deliveryTimeline.length > 0 ? (
        <SectionCard
          title={t('dealPacketScreen.deliveryTimelineTitle')}
          subtitle={localizedFeedbackNote ?? t('dealPacketScreen.deliveryTimelineSubtitle')}>
          <View style={{ gap: spacing.sm }}>
            {deliveryTimeline.map((step) => {
              const badge = stepBadge(step.status, t);
              return (
                <View
                  key={step.id}
                  style={[styles.row, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <Text style={[styles.rowLabel, { color: theme.foregroundSubtitle, flex: 1 }]}>
                      {step.title}
                    </Text>
                    <Badge tone={badge.tone} label={badge.label} />
                  </View>
                  <Text style={[styles.rowValue, { color: theme.foreground }]}>{step.due}</Text>
                  {step.note ? (
                    <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>{step.note}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </SectionCard>
      ) : null}

      {verification ? (
        <SectionCard
          title={t('dealPacketScreen.verificationPreviewTitle')}
          subtitle={verification.payoutHint ?? t('dealPacketScreen.verificationPreviewSubtitle')}>
          <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <Text style={[styles.rowLabel, { color: theme.foregroundSubtitle }]}>
              {t('dealPacketScreen.verificationChecklistLabel')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.foreground }]}>
              {t('dealPacketScreen.verificationChecklistProgress', {
                passed: verificationPassed,
                total: verificationTotal,
              })}
            </Text>
          </View>
          {verification.evidence.length > 0 ? (
            <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
              {verification.evidence.map((item) => (
                <View
                  key={item.id}
                  style={[styles.templateItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <Badge
                    tone={item.status === 'done' ? 'mint' : item.status === 'reviewing' ? 'warning' : 'neutral'}
                    label={t(`dealPacketScreen.evidenceStatus.${item.status}`)}
                  />
                  <Text style={[styles.templateTitle, { color: theme.foreground }]}>
                    {t(`dealPacketScreen.evidence.${item.id}`, { defaultValue: item.id })}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>
      ) : null}

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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
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
