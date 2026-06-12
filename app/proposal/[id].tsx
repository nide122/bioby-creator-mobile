import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, HubLinkGroup, HubListRow, HubScreen, QueryRetryCard, SectionCard, SettingsGroup } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { alertAction } from '@/src/lib/app-dialog';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { useProposalPreview } from '@/src/hooks/use-growth';
import { useSessionStore } from '@/src/stores/session-store';

export default function ProposalDetailScreen() {
  const { t } = useTranslation();
  const assetsNav = useAssetsHubNavigation();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const safeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const query = useProposalPreview(safeId);
  const profile = useSessionStore((s) => s.profileBasics);
  const [proposalSent, setProposalSent] = useState(false);

  if (!safeId) {
    return (
      <PlaceholderScreen
        title={t('proposalDetailScreen.missingTitle')}
        description={t('proposalDetailScreen.missingDesc')}
      />
    );
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('proposalDetailScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    const msg = query.error?.message ?? t('proposalDetailScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('proposalDetailScreen.loadFailedTitle')}
        description={t('proposalDetailScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() =>
            safeId
              ? queryClient.invalidateQueries({ queryKey: ['growth', 'proposal', safeId] })
              : queryClient.invalidateQueries({ queryKey: ['growth'] })
          }
        />
      </PlaceholderScreen>
    );
  }

  const proposal = query.data;
  const creatorName = profile?.displayName ?? proposal.creatorDisplayName;
  const shareSummary = `${proposal.title}\nCreator: ${creatorName}\nBrand: ${proposal.brandHint}\n${proposal.executiveSummary}`;

  const onShareProposal = async () => {
    try {
      await Share.share({
        title: proposal.title,
        message: shareSummary,
      });
      setProposalSent(true);
    } catch {
      void alertAction(t('proposalDetailScreen.shareFailTitle'), t('proposalDetailScreen.shareFailDesc'));
    }
  };

  return (
    <HubScreen
      eyebrow={t('tabs.assets')}
      title={proposal.title}
      lead={t('proposalDetailScreen.heroEvidenceLine', {
        brand: proposal.brandHint,
        title: proposal.title,
      })}>
      <SectionCard title={t('proposalDetailScreen.brandPreviewTitle')} subtitle={t('proposalDetailScreen.brandPreviewSubtitle')}>
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>
          {t('proposalDetailScreen.metaCreatorPrefix')}{' '}
          <Text style={{ color: theme.foreground }}>{creatorName}</Text>
        </Text>
        {profile?.platformLabel ? (
          <Text style={[styles.meta, { color: theme.mutedForeground }]}>
            {t('proposalDetailScreen.metaPlatformPrefix')}{' '}
            <Text style={{ color: theme.foreground }}>
              {profile.platformLabel}
              {profile.handle ? ` · @${profile.handle}` : ''}
            </Text>
          </Text>
        ) : null}
        <Text style={[styles.summary, { color: theme.foreground }]}>{proposal.executiveSummary}</Text>
      </SectionCard>

      <SectionCard title={t('proposalDetailScreen.whyCheckTitle')} emphasis>
        <View style={styles.relationGrid}>
          <View style={[styles.relationCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="mint" label={t('proposalDetailScreen.badgeClear')} />
            <Text style={[styles.relationTitle, { color: theme.foreground }]}>
              {t('proposalDetailScreen.priceScopeSplitTitle')}
            </Text>
            <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>
              {t('proposalDetailScreen.priceScopeSplitHint')}
            </Text>
          </View>
          <View style={[styles.relationCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="warning" label={t('proposalDetailScreen.badgeNeedsConfirm')} />
            <Text style={[styles.relationTitle, { color: theme.foreground }]}>
              {t('proposalDetailScreen.rightsNotDefaultTitle')}
            </Text>
            <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>
              {t('proposalDetailScreen.rightsNotDefaultHint')}
            </Text>
          </View>
        </View>
      </SectionCard>

      {proposal.creatorSnapshot ? (
        <SectionCard
          title={t('proposalDetailScreen.creatorSnapshotTitle')}
          subtitle={t('proposalDetailScreen.creatorSnapshotSubtitle')}>
          <Text style={[styles.snapshotHeadline, { color: theme.foreground }]}>{proposal.creatorSnapshot.headline}</Text>
          <Text style={[styles.summary, { color: theme.foreground }]}>{proposal.creatorSnapshot.bio}</Text>
          {proposal.creatorSnapshot.heroStats?.length ? (
            <View style={styles.snapshotStats}>
              {proposal.creatorSnapshot.heroStats.map((stat) => (
                <View key={stat.label} style={[styles.snapshotStat, { borderColor: theme.border }]}>
                  <Text style={[styles.snapshotStatValue, { color: theme.primary }]}>{stat.value}</Text>
                  <Text style={[styles.snapshotStatLabel, { color: theme.mutedForeground }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {proposal.creatorSnapshot.platforms.length ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {proposal.creatorSnapshot.platforms.slice(0, 3).map((platform) => (
                <View key={platform.name} style={[styles.snapshotPlatform, { borderColor: theme.border }]}>
                  <Text style={[styles.relationTitle, { color: theme.foreground }]}>{platform.name}</Text>
                  <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>
                    {platform.followersRange}
                    {platform.handle ? ` · @${platform.handle}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {proposal.creatorSnapshot.cases.length ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {proposal.creatorSnapshot.cases.map((item) => (
                <View key={item.id} style={[styles.snapshotPlatform, { borderColor: theme.border }]}>
                  <Text style={[styles.relationTitle, { color: theme.foreground }]}>{item.title}</Text>
                  <Text style={[styles.relationHint, { color: theme.mutedForeground }]}>{item.outcomeNote}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <HubListRow
            icon="images-outline"
            title={t('proposalDetailScreen.creatorSnapshotCta')}
            subtitle={t('proposalDetailScreen.creatorSnapshotCtaHint')}
            onPress={() => assetsNav.openMediaKit()}
          />
        </SectionCard>
      ) : null}

      <HubLinkGroup
        title={t('proposalDetailScreen.basisTitle')}
        links={[
          {
            label: t('proposalDetailScreen.rateCardTitle'),
            hint: t('proposalDetailScreen.rateCardHint'),
            href: '/pricing',
            icon: 'pricetag-outline',
          },
          {
            label: t('proposalDetailScreen.mediaKitCardTitle'),
            hint: t('proposalDetailScreen.mediaKitCardHint'),
            icon: 'images-outline',
            onPress: () => assetsNav.openMediaKit(),
          },
        ]}
      />

      <SectionCard title={t('proposalDetailScreen.lineItemsTitle')}>
        <View style={{ gap: spacing.md }}>
          {proposal.skuLines.map((line) => (
            <View
              key={line.id}
              style={[styles.skuCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.skuTop}>
                <Badge tone="mint" label={line.platform} />
                <Text style={[styles.price, { color: theme.primary }]}>{line.priceLabel}</Text>
              </View>
              <Text style={[styles.skuTitle, { color: theme.foreground }]}>{line.deliverable}</Text>
              <Text style={[styles.skuMeta, { color: theme.mutedForeground }]}>{line.turnaroundLabel}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title={t('proposalDetailScreen.moneyTermsTitle')}
        subtitle={t('proposalDetailScreen.moneyTermsSubtitle')}>
        <View style={{ gap: spacing.md }}>
          <ReviewBlock title={t('proposalDetailScreen.reviewRights')} tone="warning" items={proposal.rightsBullets} />
          <ReviewBlock title={t('proposalDetailScreen.reviewPayment')} tone="warning" items={proposal.paymentBullets} />
          <ReviewBlock title={t('proposalDetailScreen.reviewRisk')} tone="danger" items={proposal.riskBullets} />
        </View>
      </SectionCard>

      {proposalSent ? (
        <Badge tone="mint" label={t('proposalDetailScreen.badgeAwaitingBrand')} />
      ) : null}

      <SettingsGroup title={t('hubLinks.actions')}>
        <HubListRow
          icon="share-outline"
          title={t('proposalDetailScreen.ctaShare')}
          subtitle={
            proposalSent
              ? t('proposalDetailScreen.ctaShareSentSubtitle')
              : t('proposalDetailScreen.ctaShareDraftSubtitle')
          }
          onPress={onShareProposal}
        />
        <HubListRow
          icon="copy-outline"
          title={t('proposalDetailScreen.ctaCopySummary')}
          onPress={() => {
            setProposalSent(true);
            void alertAction(t('proposalDetailScreen.alertSummaryTitle'), shareSummary);
          }}
        />
      </SettingsGroup>

      {proposalSent ? (
        <HubLinkGroup
          title={t('proposalDetailScreen.afterBrandTitle')}
          links={[
            {
              label: t('proposalDetailScreen.ctaOpenPacket'),
              href: '/deal/mock-deal-alpha/packet',
              icon: 'document-text-outline',
            },
            {
              label: t('proposalDetailScreen.ctaViewPayments'),
              href: '/payments',
              icon: 'wallet-outline',
            },
          ]}
        />
      ) : null}
    </HubScreen>
  );
}

function ReviewBlock({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: 'warning' | 'danger';
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.reviewBlock, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Badge tone={tone} label={title} />
      {items.map((item) => (
        <Text key={item} style={[styles.reviewText, { color: theme.foreground }]}>
          {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  meta: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  summary: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed, marginTop: spacing.sm },
  templateGrid: { flexDirection: 'row', gap: spacing.sm },
  templateItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  templateTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  templateHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  relationGrid: { flexDirection: 'row', gap: spacing.sm },
  relationCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  relationTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  relationHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  snapshotHeadline: { fontSize: fontSize.cardTitle, fontWeight: '700', lineHeight: lineHeight.lead },
  snapshotStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  snapshotStat: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    minWidth: 120,
    gap: spacing.xs,
  },
  snapshotStatValue: { fontSize: fontSize.body, fontWeight: '800' },
  snapshotStatLabel: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  snapshotPlatform: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  skuCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  skuTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  skuTitle: { fontSize: fontSize.body, fontWeight: '600', lineHeight: lineHeight.lead },
  skuMeta: { fontSize: fontSize.bodySmall },
  price: { fontSize: fontSize.cardTitle, fontWeight: '700', fontVariant: ['tabular-nums'] },
  reviewBlock: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reviewText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '700', fontSize: fontSize.body },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontWeight: '700', fontSize: fontSize.body },
});
