import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type Href, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  EmptyStateCard,
  HubCallout,
  HubLinkGroup,
  HubListRow,
  HubMetric,
  HubMetrics,
  QueryRetryCard,
  SectionCard,
  SettingsGroup,
  HubScreen,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { EscrowLifecyclePhase } from '@/src/types/domain';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { usePayments, usePaymentsOverview } from '@/src/hooks/use-money';
import { formatMinorUnits } from '@/src/lib/format-money';

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { escrowLifecycleLabel } = useDomainLabels();
  const payments = usePayments();
  const overview = usePaymentsOverview();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [summaryOpen, setSummaryOpen] = useState(false);

  function rowCtaLabel(phase: EscrowLifecyclePhase): string {
    if (phase === 'pending_verification') return t('paymentsScreen.rowCtaProof');
    if (phase === 'remediation' || phase === 'disputed') return t('paymentsScreen.rowCtaDispute');
    return t('paymentsScreen.rowCtaDeal');
  }

  function navigatePayment(item: { dealId?: string; phase: EscrowLifecyclePhase }) {
    if (!item.dealId) return;
    if (item.phase === 'pending_verification') {
      router.push(`/deal/${item.dealId}/verification` as Href);
    } else if (item.phase === 'remediation' || item.phase === 'disputed') {
      router.push('/disputes' as Href);
    } else {
      router.push(`/deal/${item.dealId}` as Href);
    }
  }

  const pending = payments.isPending || overview.isPending;

  if (pending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('paymentsScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (payments.error || overview.error) {
    const msg = payments.error?.message ?? overview.error?.message ?? t('paymentsScreen.unknownError');
    return (
      <PlaceholderScreen title={t('paymentsScreen.errorTitle')} description={t('paymentsScreen.errorDesc')}>
        <QueryRetryCard message={msg} onRetry={() => queryClient.invalidateQueries({ queryKey: ['payments'] })} />
      </PlaceholderScreen>
    );
  }

  if (!payments.data || !overview.data) {
    return (
      <PlaceholderScreen title={t('paymentsScreen.emptyTitle')} description={t('paymentsScreen.emptyDesc')} />
    );
  }

  const ov = overview.data;
  const rows = payments.data;

  return (
    <HubScreen
      eyebrow={t('tabs.deals')}
      title={t('paymentsScreen.title')}
      lead={t('paymentsScreen.description')}
      toolbar={
        <HubMetrics>
          <HubMetric
            value={formatMinorUnits(ov.inEscrowCents, ov.currency)}
            label={t('paymentsScreen.metricInEscrow')}
            accent
          />
          <HubMetric
            value={formatMinorUnits(ov.pendingVerificationCents, ov.currency)}
            label={t('paymentsScreen.metricPendingProof')}
          />
          <HubMetric
            value={formatMinorUnits(ov.awaitingSettlementCents, ov.currency)}
            label={t('paymentsScreen.metricAwaitingPrepay')}
          />
        </HubMetrics>
      }>
      <HubCallout title={t('paymentsScreen.prioritiesTitle')} body={ov.footnote} />

      <Pressable
        accessibilityRole="button"
        onPress={() => setSummaryOpen((v) => !v)}
        style={[styles.exportButton, { borderColor: theme.border }]}>
        <Text style={[styles.exportLabel, { color: theme.primary }]}>{t('paymentsScreen.exportSummary')}</Text>
        <Ionicons name={summaryOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.primary} />
      </Pressable>
      {summaryOpen ? (
        <SectionCard title={t('paymentsScreen.summaryCardTitle')}>
          <Text style={[styles.summaryLine, { color: theme.foreground }]}>
            {t('paymentsScreen.summaryInEscrow', { amount: formatMinorUnits(ov.inEscrowCents, ov.currency) })}
          </Text>
          <Text style={[styles.summaryLine, { color: theme.foreground }]}>
            {t('paymentsScreen.summaryPendingRelease', {
              amount: formatMinorUnits(ov.pendingVerificationCents, ov.currency),
            })}
          </Text>
          <Text style={[styles.summaryLine, { color: theme.foreground }]}>
            {t('paymentsScreen.summaryAwaitingPrepay', {
              amount: formatMinorUnits(ov.awaitingSettlementCents, ov.currency),
            })}
          </Text>
        </SectionCard>
      ) : null}

      {rows.length === 0 ? (
        <EmptyStateCard
          title={t('paymentsScreen.listEmptyTitle')}
          description={t('paymentsScreen.listEmptyDesc')}
          primaryAction={{
            label: t('paymentsScreen.goDeals'),
            onPress: () => router.push('/deals' as Href),
          }}
          secondaryAction={{
            label: t('paymentsScreen.goInbox'),
            onPress: () => router.push('/inbox' as Href),
          }}
        />
      ) : (
        <SettingsGroup title={t('paymentsScreen.listHeading')}>
          {rows.map((item) => (
            <HubListRow
              key={item.id}
              icon="wallet-outline"
              title={item.label}
              subtitle={item.dealTitle ?? item.nextStepHint}
              detail={formatMinorUnits(item.amountCents, item.currency)}
              onPress={() => navigatePayment(item)}
            />
          ))}
        </SettingsGroup>
      )}

      <HubLinkGroup
        title={t('paymentsScreen.relatedHeading')}
        links={[
          {
            label: t('paymentsScreen.goDeals'),
            href: '/deals',
            icon: 'briefcase-outline',
          },
          {
            label: t('paymentsScreen.goDisputes'),
            href: '/disputes',
            icon: 'lock-closed-outline',
          },
        ]}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  exportLabel: { fontSize: fontSize.caption, fontWeight: '700' },
  summaryLine: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
