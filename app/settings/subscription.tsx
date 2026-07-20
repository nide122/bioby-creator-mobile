import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, HubCallout, HubMetric, HubMetrics, QueryRetryCard, SectionCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useSubscriptionUsage } from '@/src/hooks/use-account-settings';
import { useSessionStore } from '@/src/stores/session-store';

function UsageMeter(props: {
  label: string;
  used: number;
  limit: number;
  trackBg: string;
  fillColor: string;
  mutedColor: string;
}) {
  const { label, used, limit, trackBg, fillColor, mutedColor } = props;
  const pct = limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <Text style={{ color: mutedColor, fontSize: fontSize.bodySmall, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: mutedColor, fontSize: fontSize.bodySmall, fontVariant: ['tabular-nums'] }}>
          {used} / {limit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

export default function SettingsSubscriptionScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [nextBillingAction, setNextBillingAction] = useState<'upgrade' | 'billing' | null>(null);
  const isPublicDemo = useSessionStore((state) => state.demoWorkspaceKind === 'public');

  const sub = useSubscriptionUsage();

  if (sub.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('subscriptionSettingsScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (sub.error || !sub.data) {
    const msg = sub.error?.message ?? t('subscriptionSettingsScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('subscriptionSettingsScreen.loadFailedTitle')}
        description={t('subscriptionSettingsScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() =>
            queryClient.invalidateQueries({ queryKey: ['account', 'subscription-usage'] })
          }
        />
      </PlaceholderScreen>
    );
  }

  const snap = sub.data;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        testID="screen-subscription-settings"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageLead, { color: theme.mutedForeground }]}>
          {t('subscriptionSettingsScreen.description')}
        </Text>

        {isPublicDemo ? (
          <HubCallout
            title={t('publicDemo.samplePlanTitle')}
            body={t('publicDemo.subscriptionReadOnly')}
          />
        ) : null}

        <HubMetrics>
          <HubMetric value={snap.planName} label={t('subscriptionSettingsScreen.metricPlan')} />
          <HubMetric
            value={`${snap.brandPitchesUsed}`}
            label={t('subscriptionSettingsScreen.meterBrandEmails')}
            hint={`/ ${snap.brandPitchesLimit}`}
          />
        </HubMetrics>

      <SectionCard title={t('subscriptionSettingsScreen.currentPlanTitle')} subtitle={snap.billingCycleLabel} emphasis>
        <Text style={[styles.planName, { color: theme.foreground }]}>{snap.planName}</Text>
        <Text style={[styles.renewal, { color: theme.mutedForeground }]}>{snap.renewalHint}</Text>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setNextBillingAction('upgrade');
            }}
            style={[styles.primary, { backgroundColor: theme.primary }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t('subscriptionSettingsScreen.ctaEvaluateUpgrade')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setNextBillingAction('billing');
            }}
            style={[styles.secondary, { borderColor: theme.border }]}>
            <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
              {t('subscriptionSettingsScreen.ctaViewBilling')}
            </Text>
          </Pressable>
        </View>
      </SectionCard>

      {nextBillingAction ? (
        <SectionCard
          title={
            nextBillingAction === 'upgrade'
              ? t('subscriptionSettingsScreen.cardUpgradeTitle')
              : t('subscriptionSettingsScreen.cardBillingTitle')
          }
          subtitle={
            nextBillingAction === 'upgrade'
              ? t('subscriptionSettingsScreen.cardUpgradeSubtitle')
              : t('subscriptionSettingsScreen.cardBillingSubtitle')
          }
          emphasis>
          <View style={styles.statusRow}>
            <Badge tone="warning" label={t('subscriptionSettingsScreen.badgeNeedsConfirm')} />
            <Text style={[styles.renewal, { color: theme.foreground }]}>
              {nextBillingAction === 'upgrade'
                ? t('subscriptionSettingsScreen.upgradeExplain')
                : t('subscriptionSettingsScreen.billingExplain')}
            </Text>
          </View>
        </SectionCard>
      ) : null}

      <SectionCard title={t('subscriptionSettingsScreen.usageEvidenceTitle')}>
        <UsageMeter
          label={t('subscriptionSettingsScreen.meterBrandEmails')}
          used={snap.brandPitchesUsed}
          limit={snap.brandPitchesLimit}
          trackBg={theme.secondary}
          fillColor={theme.primary}
          mutedColor={theme.mutedForeground}
        />
        <View style={{ height: spacing.md }} />
        <UsageMeter
          label={t('subscriptionSettingsScreen.meterDraftConcurrency')}
          used={snap.draftConcurrentUsed}
          limit={snap.draftConcurrentLimit}
          trackBg={theme.secondary}
          fillColor={theme.primaryHover}
          mutedColor={theme.mutedForeground}
        />
      </SectionCard>

      <SectionCard title={t('subscriptionSettingsScreen.billingBoundaryTitle')}>
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.guardrailRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="mint" label={t('subscriptionSettingsScreen.includedBadge')} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[styles.guardrailTitle, { color: theme.foreground }]}>
                {t('subscriptionSettingsScreen.brandEmailQuotaTitle')}
              </Text>
              <Text style={[styles.renewal, { color: theme.mutedForeground }]}>
                {t('subscriptionSettingsScreen.brandEmailQuotaHint')}
              </Text>
            </View>
          </View>
          <View style={[styles.guardrailRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="warning" label={t('subscriptionSettingsScreen.badgeNeedsConfirm')} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[styles.guardrailTitle, { color: theme.foreground }]}>
                {t('subscriptionSettingsScreen.seatsTitle')}
              </Text>
              <Text style={[styles.renewal, { color: theme.mutedForeground }]}>
                {t('subscriptionSettingsScreen.seatsHint')}
              </Text>
            </View>
          </View>
        </View>
      </SectionCard>

      <Text style={[styles.renewal, { color: theme.mutedForeground }]}>
        {t('subscriptionSettingsScreen.footerNote')}
      </Text>
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
  planName: { fontSize: fontSize.sectionTitle, fontWeight: '700' },
  renewal: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed, marginTop: spacing.sm },
  actionRow: { gap: spacing.sm, marginTop: spacing.md },
  statusRow: { gap: spacing.sm },
  guardrailRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  guardrailTitle: { fontSize: fontSize.bodySmall, fontWeight: '800', lineHeight: lineHeight.body },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  track: {
    height: 10,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.sm,
  },
});
