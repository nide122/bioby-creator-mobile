import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Badge,
  getTextInputProps,
  getTextInputStyle,
  HubLinkGroup,
  HubListRow,
  HubScreen,
  ProposalSkuLines,
  QueryRetryCard,
  SectionCard,
  SettingsGroup,
} from '@/components/product';
import { AutoGrowTextInput } from '@/components/product/AutoGrowTextInput';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { alertAction } from '@/src/lib/app-dialog';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import {
  readCachedProposalPreview,
  useConfirmProposalDraft,
  useGenerateProposalRevision,
  useProposalDraft,
  useProposalPreview,
  useProposalRevisions,
  useSaveProposal,
} from '@/src/hooks/use-growth';
import { useSessionStore } from '@/src/stores/session-store';
import type { ProposalPreview } from '@/src/types/domain';

function bulletsToText(items: string[]): string {
  return items.join('\n');
}

function textToBullets(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isProposalSeedRicher(next: ProposalPreview, current: ProposalPreview): boolean {
  if (!current.title.trim() && next.title.trim()) return true;
  if (!current.executiveSummary.trim() && next.executiveSummary.trim()) return true;
  if (current.skuLines.length === 0 && next.skuLines.length > 0) return true;
  return false;
}

export default function ProposalDetailScreen() {
  const { t, i18n } = useTranslation();
  const assetsNav = useAssetsHubNavigation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; draftId?: string | string[] }>();
  const safeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const draftId = Array.isArray(params.draftId) ? params.draftId[0] : params.draftId;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const query = useProposalPreview(draftId ? undefined : safeId);
  const proposalDraftQuery = useProposalDraft(draftId);
  const saveProposal = useSaveProposal();
  const confirmProposalDraft = useConfirmProposalDraft();
  const generateProposalRevision = useGenerateProposalRevision();
  const revisionsQuery = useProposalRevisions(draftId ? undefined : safeId);
  const profile = useSessionStore((s) => s.profileBasics);
  const cachedProposal = safeId ? readCachedProposalPreview(queryClient, safeId) : undefined;
  const seedProposal = proposalDraftQuery.data?.proposal ?? query.data ?? cachedProposal;
  const [draft, setDraft] = useState<ProposalPreview | null>(() => cachedProposal ?? null);
  const [proposalSent, setProposalSent] = useState(false);
  const seededIdRef = useRef<string | null>(cachedProposal?.id ?? null);

  useEffect(() => {
    if (!seedProposal) return;
    if (seedProposal.id !== seededIdRef.current) {
      seededIdRef.current = seedProposal.id;
      setDraft(seedProposal);
      return;
    }
    if (!draft || isProposalSeedRicher(seedProposal, draft)) {
      setDraft(seedProposal);
    }
  }, [draft, seedProposal]);

  const activeProposal = draft ?? seedProposal;

  const isDraft = useMemo(() => {
    if (!activeProposal) return false;
    return activeProposal.preview === true || activeProposal.saved === false;
  }, [activeProposal]);

  if (!safeId) {
    return (
      <PlaceholderScreen
        title={t('proposalDetailScreen.missingTitle')}
        description={t('proposalDetailScreen.missingDesc')}
      />
    );
  }

  if ((query.isPending || proposalDraftQuery.isPending) && !activeProposal) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('proposalDetailScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (((query.error || proposalDraftQuery.error) && !activeProposal)
      || (!query.isPending && !proposalDraftQuery.isPending && !activeProposal)) {
    const msg = query.error?.message ?? proposalDraftQuery.error?.message ?? t('proposalDetailScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('proposalDetailScreen.loadFailedTitle')}
        description={t('proposalDetailScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() =>
            draftId
              ? queryClient.invalidateQueries({ queryKey: ['growth', 'proposal-draft', draftId] })
              : safeId
              ? queryClient.invalidateQueries({ queryKey: ['growth', 'proposal', safeId] })
              : queryClient.invalidateQueries({ queryKey: ['growth'] })
          }
        />
      </PlaceholderScreen>
    );
  }

  // The loading and empty states above cover every undefined seed; keep the editor type-safe.
  if (!activeProposal) return null;

  const creatorName = profile?.displayName ?? activeProposal.creatorDisplayName;
  const shareSummary = `${activeProposal.title}\nCreator: ${creatorName}\nBrand: ${activeProposal.brandHint}\n${activeProposal.executiveSummary}`;

  const onShareProposal = async () => {
    if (isDraft) {
      void alertAction(t('proposalDetailScreen.saveBeforeShareTitle'), t('proposalDetailScreen.saveBeforeShareDesc'));
      return;
    }
    try {
      await Share.share({
        title: activeProposal.title,
        message: shareSummary,
      });
      setProposalSent(true);
    } catch {
      void alertAction(t('proposalDetailScreen.shareFailTitle'), t('proposalDetailScreen.shareFailDesc'));
    }
  };

  const onSaveDraft = async () => {
    try {
      const saved = draftId
        ? await confirmProposalDraft.mutateAsync({ draftId, proposal: activeProposal })
        : await saveProposal.mutateAsync(activeProposal);
      setDraft(saved);
      if (draftId) {
        router.replace(`/proposal/${saved.id}` as Href);
      }
      void alertAction(t('proposalDetailScreen.saveSuccessTitle'), t('proposalDetailScreen.saveSuccessDesc'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('proposalDetailScreen.saveFailedDesc');
      void alertAction(t('proposalDetailScreen.saveFailedTitle'), message);
    }
  };

  const onUpdateProposal = async () => {
    try {
      const nextDraft = await generateProposalRevision.mutateAsync({
        proposalId: activeProposal.id,
        locale: i18n.language,
      });
      router.push(`/proposal/${nextDraft.proposal.id}?draftId=${nextDraft.id}` as Href);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('proposalDetailScreen.emptyDataFallback');
      void alertAction(t('proposalDetailScreen.loadFailedTitle'), message);
    }
  };

  const generationLabel =
    activeProposal.generationSource === 'llm'
      ? t('proposalDetailScreen.badgeAiDraft')
      : t('proposalDetailScreen.badgeRulesDraft');

  return (
    <HubScreen
      eyebrow={t('tabs.assets')}
      title={isDraft ? t('proposalDetailScreen.draftTitle') : activeProposal.title}
      lead={t('proposalDetailScreen.heroEvidenceLine', {
        brand: activeProposal.brandHint,
        title: activeProposal.title,
      })}>
      {isDraft ? (
        <View style={styles.badgeRow}>
          <Badge tone="warning" label={t('proposalDetailScreen.badgeDraft')} />
          <Badge tone="mint" label={generationLabel} />
        </View>
      ) : null}

      <SectionCard
        title={t('proposalDetailScreen.brandPreviewTitle')}
        subtitle={
          isDraft
            ? t('proposalDetailScreen.draftEditHint')
            : t('proposalDetailScreen.brandPreviewSubtitle')
        }>
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>
          {t('proposalDetailScreen.metaCreatorPrefix')}{' '}
          <Text style={{ color: theme.foreground }}>{creatorName}</Text>
        </Text>
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>
          {t('proposalDetailScreen.metaBrandPrefix')}{' '}
          <Text style={{ color: theme.foreground }}>{activeProposal.brandHint}</Text>
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
        {isDraft ? (
          <>
            <Text style={[styles.fieldLabel, { color: theme.mutedForeground }]}>
              {t('proposalDetailScreen.fieldTitle')}
            </Text>
            <AutoGrowTextInput
              {...getTextInputProps(theme)}
              style={[getTextInputStyle(theme), styles.input]}
              value={activeProposal.title}
              onChangeText={(title) =>
                setDraft((current) => ({ ...(current ?? activeProposal), title }))
              }
            />
            <Text style={[styles.fieldLabel, { color: theme.mutedForeground }]}>
              {t('proposalDetailScreen.fieldSummary')}
            </Text>
            <AutoGrowTextInput
              {...getTextInputProps(theme)}
              style={[getTextInputStyle(theme, { multiline: true }), styles.input]}
              value={activeProposal.executiveSummary}
              onChangeText={(executiveSummary) =>
                setDraft((current) => ({ ...(current ?? activeProposal), executiveSummary }))
              }
            />
          </>
        ) : (
          <Text style={[styles.summary, { color: theme.foreground }]}>{activeProposal.executiveSummary}</Text>
        )}
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

      {activeProposal.creatorSnapshot ? (
        <SectionCard
          title={t('proposalDetailScreen.creatorSnapshotTitle')}
          subtitle={t('proposalDetailScreen.creatorSnapshotSubtitle')}>
          <Text style={[styles.snapshotHeadline, { color: theme.foreground }]}>{activeProposal.creatorSnapshot.headline}</Text>
          <Text style={[styles.summary, { color: theme.foreground }]}>{activeProposal.creatorSnapshot.bio}</Text>
          {activeProposal.creatorSnapshot.heroStats?.length ? (
            <View style={styles.snapshotStats}>
              {activeProposal.creatorSnapshot.heroStats.map((stat) => (
                <View key={stat.label} style={[styles.snapshotStat, { borderColor: theme.border }]}>
                  <Text style={[styles.snapshotStatValue, { color: theme.primary }]}>{stat.value}</Text>
                  <Text style={[styles.snapshotStatLabel, { color: theme.mutedForeground }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {activeProposal.creatorSnapshot.platforms.length ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {activeProposal.creatorSnapshot.platforms.slice(0, 3).map((platform) => (
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
          {activeProposal.creatorSnapshot.cases.length ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {activeProposal.creatorSnapshot.cases.map((item) => (
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

      <SectionCard
        title={t('proposalDetailScreen.lineItemsTitle')}
        subtitle={t('proposalDetailScreen.lineItemsSubtitle', { count: activeProposal.skuLines.length })}>
        <ProposalSkuLines lines={activeProposal.skuLines} />
      </SectionCard>

      <SectionCard
        title={t('proposalDetailScreen.moneyTermsTitle')}
        subtitle={
          isDraft
            ? t('proposalDetailScreen.moneyTermsDraftSubtitle')
            : t('proposalDetailScreen.moneyTermsSubtitle')
        }>
        <View style={{ gap: spacing.md }}>
          {isDraft ? (
            <>
              <EditableReviewBlock
                title={t('proposalDetailScreen.reviewRights')}
                tone="warning"
                value={bulletsToText(activeProposal.rightsBullets)}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...(current ?? activeProposal),
                    rightsBullets: textToBullets(value),
                  }))
                }
              />
              <EditableReviewBlock
                title={t('proposalDetailScreen.reviewPayment')}
                tone="warning"
                value={bulletsToText(activeProposal.paymentBullets)}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...(current ?? activeProposal),
                    paymentBullets: textToBullets(value),
                  }))
                }
              />
              <EditableReviewBlock
                title={t('proposalDetailScreen.reviewRisk')}
                tone="danger"
                value={bulletsToText(activeProposal.riskBullets)}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...(current ?? activeProposal),
                    riskBullets: textToBullets(value),
                  }))
                }
              />
            </>
          ) : (
            <>
              <ReviewBlock title={t('proposalDetailScreen.reviewRights')} tone="warning" items={activeProposal.rightsBullets} />
              <ReviewBlock title={t('proposalDetailScreen.reviewPayment')} tone="warning" items={activeProposal.paymentBullets} />
              <ReviewBlock title={t('proposalDetailScreen.reviewRisk')} tone="danger" items={activeProposal.riskBullets} />
            </>
          )}
        </View>
      </SectionCard>

      {proposalSent ? (
        <Badge tone="mint" label={t('proposalDetailScreen.badgeAwaitingBrand')} />
      ) : null}

      {!isDraft && revisionsQuery.data && revisionsQuery.data.length > 1 ? (
        <SettingsGroup title={t('proposalDetailScreen.versionHistoryTitle')}>
          {revisionsQuery.data.map((revision) => (
            <HubListRow
              key={revision.id}
              icon="git-branch-outline"
              title={t('proposalDetailScreen.versionHistoryItem', { version: revision.version ?? 1 })}
              subtitle={revision.title}
              detail={revision.current ? t('proposalDetailScreen.versionCurrent') : undefined}
              onPress={() => router.push(`/proposal/${revision.id}` as Href)}
            />
          ))}
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={t('hubLinks.actions')}>
        {isDraft ? (
          <HubListRow
            icon="save-outline"
            title={t('proposalDetailScreen.ctaSaveDraft')}
            subtitle={t('proposalDetailScreen.ctaSaveDraftSubtitle')}
            onPress={() => void onSaveDraft()}
            detail={saveProposal.isPending || confirmProposalDraft.isPending ? t('proposalDetailScreen.savingA11y') : undefined}
          />
        ) : null}
        {!isDraft ? (
          <HubListRow
            icon="refresh-outline"
            title={t('proposalDetailScreen.ctaUpdateProposal')}
            subtitle={t('proposalDetailScreen.ctaUpdateProposalSubtitle')}
            onPress={() => void onUpdateProposal()}
            detail={generateProposalRevision.isPending ? t('proposalDetailScreen.savingA11y') : undefined}
          />
        ) : null}
        <HubListRow
          icon="share-outline"
          title={t('proposalDetailScreen.ctaShare')}
          subtitle={
            isDraft
              ? t('proposalDetailScreen.ctaShareBlockedSubtitle')
              : proposalSent
                ? t('proposalDetailScreen.ctaShareSentSubtitle')
                : t('proposalDetailScreen.ctaShareDraftSubtitle')
          }
          onPress={onShareProposal}
        />
        <HubListRow
          icon="copy-outline"
          title={t('proposalDetailScreen.ctaCopySummary')}
          onPress={() => {
            if (isDraft) {
              void alertAction(
                t('proposalDetailScreen.saveBeforeShareTitle'),
                t('proposalDetailScreen.saveBeforeShareDesc'),
              );
              return;
            }
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

function EditableReviewBlock({
  title,
  tone,
  value,
  onChange,
}: {
  title: string;
  tone: 'warning' | 'danger';
  value: string;
  onChange: (value: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.reviewBlock, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Badge tone={tone} label={title} />
      <AutoGrowTextInput
        {...getTextInputProps(theme)}
        style={[getTextInputStyle(theme, { multiline: true, minHeight: 88 }), styles.input]}
        value={value}
        onChangeText={onChange}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  meta: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  fieldLabel: { fontSize: fontSize.caption, lineHeight: lineHeight.body, marginTop: spacing.md },
  input: { marginTop: spacing.xs },
  summary: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed, marginTop: spacing.sm },
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
  reviewBlock: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reviewText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
