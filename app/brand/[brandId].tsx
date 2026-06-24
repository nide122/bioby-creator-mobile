import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { Badge, HubLinkGroup, HubScreen, QueryRetryCard, SectionCard } from '@/components/product';
import { BrandTimelineList } from '@/components/brands/BrandTimelineList';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { useBrandDetail, useBrandTimeline } from '@/src/hooks/use-brand-detail';
import { brandReturnTarget, dealHref, inboxThreadHref } from '@/src/lib/open-brand-detail';
import { useReturnToBackNavigation } from '@/src/lib/use-return-to-back-navigation';

export default function BrandDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ brandId?: string | string[]; returnTo?: string | string[] }>();
  const brandId = Array.isArray(params.brandId) ? params.brandId[0] : params.brandId;
  const parentReturnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { escrowLifecycleLabel, opportunityPipelinePhaseLabel } = useDomainLabels();
  const detailQuery = useBrandDetail(brandId);
  const timelineQuery = useBrandTimeline(brandId);
  useReturnToBackNavigation(parentReturnTo);

  if (!brandId) {
    return (
      <PlaceholderScreen title={t('brandDetail.missingTitle')} description={t('brandDetail.missingDesc')} />
    );
  }

  if (detailQuery.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('brandDetail.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <PlaceholderScreen title={t('brandDetail.errorTitle')} description={t('brandDetail.errorDesc')}>
        <QueryRetryCard
          message={detailQuery.error?.message ?? t('brandDetail.noData')}
          onRetry={() => detailQuery.refetch()}
        />
      </PlaceholderScreen>
    );
  }

  const brand = detailQuery.data;
  const timelineItems = timelineQuery.data?.items ?? [];
  const emailReturnLink = {
    returnTo: brandReturnTarget(brandId),
    parentReturnTo,
  };

  return (
    <HubScreen
      testID="screen-brand-detail"
      eyebrow={t('brandDetail.eyebrow')}
      title={brand.name}
      lead={brand.domain ? t('brandDetail.domainSubtitle', { domain: brand.domain }) : t('brandDetail.subtitle')}>
      <View style={styles.statsRow}>
        <StatPill label={t('brandDetail.statThreads')} value={String(brand.threadCount)} theme={theme} />
        <StatPill label={t('brandDetail.statDeals')} value={String(brand.dealCount)} theme={theme} />
        <StatPill label={t('brandDetail.statMessages')} value={String(brand.messageCount)} theme={theme} />
      </View>

      <SectionCard title={t('brandDetail.timelineTitle')} subtitle={t('brandDetail.timelineSubtitle')}>
        {timelineQuery.isPending ? (
          <ActivityIndicator color={theme.primary} />
        ) : timelineQuery.error ? (
          <QueryRetryCard
            message={timelineQuery.error.message}
            onRetry={() => timelineQuery.refetch()}
          />
        ) : (
          <BrandTimelineList brandId={brandId} emailReturnLink={emailReturnLink} items={timelineItems} />
        )}
      </SectionCard>

      {brand.threads.length > 0 ? (
        <SectionCard title={t('brandDetail.threadsTitle')} subtitle={t('brandDetail.threadsSubtitle')}>
          <View style={styles.linkGroup}>
            {brand.threads.map((thread) => (
              <Pressable
                key={thread.id}
                accessibilityRole="button"
                onPress={() => router.push(inboxThreadHref(thread.id, emailReturnLink))}
                style={({ pressed }) => [
                  styles.linkRow,
                  { borderColor: theme.border, backgroundColor: theme.secondary },
                  pressed && { opacity: 0.88 },
                ]}>
                <View style={styles.linkCopy}>
                  <Text style={[styles.linkTitle, { color: theme.foreground }]} numberOfLines={2}>
                    {thread.title}
                  </Text>
                  <Text style={[styles.linkMeta, { color: theme.mutedForeground }]}>
                    {t('brandDetail.threadMeta', { count: thread.messageCount })}
                  </Text>
                </View>
                {thread.pipelinePhase ? (
                  <Badge
                    tone="neutral"
                    label={
                      opportunityPipelinePhaseLabel[
                        thread.pipelinePhase as keyof typeof opportunityPipelinePhaseLabel
                      ] ?? thread.pipelinePhase
                    }
                  />
                ) : null}
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {brand.deals.length > 0 ? (
        <SectionCard title={t('brandDetail.dealsTitle')} subtitle={t('brandDetail.dealsSubtitle')}>
          <View style={styles.linkGroup}>
            {brand.deals.map((deal) => (
              <Pressable
                key={deal.id}
                accessibilityRole="button"
                onPress={() => router.push(dealHref(deal.id, emailReturnLink.returnTo))}
                style={({ pressed }) => [
                  styles.linkRow,
                  { borderColor: theme.border, backgroundColor: theme.secondary },
                  pressed && { opacity: 0.88 },
                ]}>
                <View style={styles.linkCopy}>
                  <Text style={[styles.linkTitle, { color: theme.foreground }]} numberOfLines={2}>
                    {deal.title}
                  </Text>
                  <Text style={[styles.linkMeta, { color: theme.mutedForeground }]}>
                    {new Date(deal.updatedAtISO).toLocaleDateString()}
                  </Text>
                </View>
                <Badge tone="primary" label={escrowLifecycleLabel[deal.escrowPhase as keyof typeof escrowLifecycleLabel] ?? deal.escrowPhase} />
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <HubLinkGroup
        links={[
          {
            label: t('brandDetail.openInboxHint'),
            href: '/(tabs)/inbox',
            icon: 'mail-outline',
          },
          {
            label: t('brandDetail.openDealsHint'),
            href: '/(tabs)/deals',
            icon: 'briefcase-outline',
          },
        ]}
      />
    </HubScreen>
  );
}

function StatPill({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: (typeof palette)['light'];
}) {
  return (
    <View style={[styles.statPill, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Text style={[styles.statValue, { color: theme.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statPill: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: fontSize.body, fontWeight: '700' },
  statLabel: { fontSize: fontSize.eyebrow, textAlign: 'center' },
  linkGroup: { gap: spacing.sm },
  linkRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkCopy: { flex: 1, gap: 2 },
  linkTitle: { fontSize: fontSize.bodySmall, fontWeight: '600', lineHeight: lineHeight.body },
  linkMeta: { fontSize: fontSize.eyebrow },
});
