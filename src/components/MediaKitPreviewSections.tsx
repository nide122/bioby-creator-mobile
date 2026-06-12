import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge, HubListRow, HubMetric, HubMetrics, SectionCard } from '@/components/product';
import { PlatformIcon } from '@/src/components/PlatformIcon';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { platformFromServiceLabel } from '@/src/lib/platform-icon-key';
import { isMediaKitSectionVisible } from '@/src/lib/media-kit-sections';
import type { CreatorProfileBasics } from '@/src/stores/session-store';
import type { MediaKitPreview, MediaKitSectionId } from '@/src/types/domain';

export type MediaKitPreviewSectionsProps = {
  data: MediaKitPreview;
  headline: string;
  bio: string;
  sectionOrder: MediaKitSectionId[];
  variant: 'owner' | 'public';
  useProfileOverlay?: boolean;
  profile?: CreatorProfileBasics | null;
  canCopyContactUrl?: boolean;
  onCopyContactUrl?: () => void;
  onEditCases?: () => void;
  onCompleteProfile?: () => void;
  ratesSyncedFromPackages?: boolean;
};

export function MediaKitPreviewSections({
  data,
  headline,
  bio,
  sectionOrder,
  variant,
  useProfileOverlay = false,
  profile,
  canCopyContactUrl = false,
  onCopyContactUrl,
  onEditCases,
  onCompleteProfile,
  ratesSyncedFromPackages = false,
}: MediaKitPreviewSectionsProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const renderSection = (id: MediaKitSectionId) => {
    if (!isMediaKitSectionVisible(id, data)) return null;

    switch (id) {
      case 'about':
        return (
          <SectionCard key={id} title={headline} subtitle={t('mediaKitScreen.aboutSubtitle')}>
            <Text style={[styles.bio, { color: theme.foreground }]}>{bio}</Text>
            {data.aboutTags?.length ? (
              <View style={styles.tagRow}>
                {data.aboutTags.map((tag) => (
                  <Badge key={tag} tone="mint" label={tag} />
                ))}
              </View>
            ) : null}
          </SectionCard>
        );
      case 'stats':
        return (
          <HubMetrics key={id}>
            {data.heroStats?.map((stat) => (
              <HubMetric key={stat.label} value={stat.value} label={stat.label} />
            )) ?? null}
          </HubMetrics>
        );
      case 'trust_proof':
        return (
          <SectionCard
            key={id}
            title={t('mediaKitScreen.trustProofTitle')}
            subtitle={t('mediaKitScreen.trustProofSubtitle')}>
            <View style={styles.trustProofGrid}>
              {data.publicProofs?.map((proof) => (
                <View
                  key={proof.id}
                  style={[styles.trustProofTile, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <Text style={[styles.trustProofValue, { color: theme.foreground }]}>{proof.value}</Text>
                  <Text style={[styles.trustProofLabel, { color: theme.foreground }]}>{proof.label}</Text>
                  {proof.trendNote ? (
                    <Text style={[styles.trustProofTrend, { color: theme.mutedForeground }]}>{proof.trendNote}</Text>
                  ) : null}
                  {proof.disclaimer ? (
                    <Text style={[styles.trustProofDisclaimer, { color: theme.foregroundEyebrow }]}>
                      {proof.disclaimer}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </SectionCard>
        );
      case 'audience':
        return (
          <SectionCard key={id} title={t('mediaKitScreen.audienceTitle')} subtitle={t('mediaKitScreen.audienceSubtitle')}>
            <View style={{ gap: spacing.sm }}>
              {data.audience?.topLocations ? (
                <AudienceRow label={t('mediaKitScreen.audienceLocations')} value={data.audience.topLocations} />
              ) : null}
              {data.audience?.genderAge ? (
                <AudienceRow label={t('mediaKitScreen.audienceDemographics')} value={data.audience.genderAge} />
              ) : null}
              {data.audience?.postingCadence ? (
                <AudienceRow label={t('mediaKitScreen.audienceCadence')} value={data.audience.postingCadence} />
              ) : null}
            </View>
          </SectionCard>
        );
      case 'channels':
        return (
          <SectionCard key={id} title={t('mediaKitScreen.channelsTitle')} subtitle={t('mediaKitScreen.channelsSubtitle')}>
            <View style={{ gap: spacing.md }}>
              {useProfileOverlay && profile?.platformLabel ? (
                <View
                  style={[styles.platformCard, { borderColor: theme.primary, backgroundColor: theme.accentMintSoft }]}>
                  <View style={styles.platformTop}>
                    <Text style={[styles.platformName, { color: theme.foreground }]}>{profile.platformLabel}</Text>
                    {profile.followerCountLabel ? <Badge tone="mint" label={profile.followerCountLabel} /> : null}
                  </View>
                  <Text style={[styles.platformNote, { color: theme.foregroundSubtitle }]}>
                    {profile.handle ? `@${profile.handle}` : profile.profileUrl}
                  </Text>
                </View>
              ) : null}
              {data.platforms.map((p) => (
                <View
                  key={p.name}
                  style={[styles.platformCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                  <View style={styles.platformTop}>
                    <Text style={[styles.platformName, { color: theme.foreground }]}>{p.name}</Text>
                    <Badge tone="neutral" label={p.followersRange} />
                  </View>
                  {p.handle ? (
                    <Text style={[styles.platformHandle, { color: theme.foregroundSubtitle }]}>@{p.handle}</Text>
                  ) : null}
                  <Text style={[styles.platformNote, { color: theme.mutedForeground }]}>{p.nicheNote}</Text>
                  {p.monthlyViews ? (
                    <Text style={[styles.platformViews, { color: theme.primary }]}>{p.monthlyViews}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </SectionCard>
        );
      case 'rates':
        return (
          <SectionCard
            key={id}
            title={t('mediaKitScreen.rateSummaryTitle')}
            subtitle={
              ratesSyncedFromPackages
                ? t('mediaKitScreen.rateSummarySyncedSubtitle')
                : t('mediaKitScreen.rateSummarySubtitle')
            }>
            {ratesSyncedFromPackages ? (
              <View style={styles.tagRow}>
                <Badge tone="mint" label={t('assetsScreen.summaries.mediaKitPricingSynced')} />
              </View>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rateScroll}>
              {data.rateSummaries?.map((rate) => (
                <View
                  key={rate.id}
                  style={[styles.rateCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <View style={styles.rateCardTop}>
                    <PlatformIcon platform={rate.title} size={16} />
                    <Text style={[styles.ratePrice, { color: theme.primary }]}>{rate.startingPrice}</Text>
                  </View>
                  <Text style={[styles.rateTitle, { color: theme.foreground }]}>{rate.title}</Text>
                  <Text style={[styles.rateDesc, { color: theme.mutedForeground }]}>{rate.description}</Text>
                </View>
              ))}
            </ScrollView>
          </SectionCard>
        );
      case 'services':
        return (
          <SectionCard key={id} title={t('mediaKitScreen.servicesTitle')} subtitle={t('mediaKitScreen.servicesSubtitle')}>
            <View style={[styles.table, { borderColor: theme.border }]}>
              <View style={[styles.tableHeader, { backgroundColor: theme.secondary }]}>
                <Text style={[styles.tableHeaderCell, styles.tableServiceCol, { color: theme.foreground }]}>
                  {t('mediaKitScreen.servicesColService')}
                </Text>
                <Text style={[styles.tableHeaderCell, styles.tableFeeCol, { color: theme.foreground }]}>
                  {t('mediaKitScreen.servicesColFee')}
                </Text>
              </View>
              {data.servicesTable?.map((row, index) => (
                <View
                  key={`${row.service}-${index}`}
                  style={[
                    styles.tableRow,
                    { borderTopColor: theme.border },
                    index % 2 === 1 ? { backgroundColor: theme.secondary } : null,
                  ]}>
                  <View style={[styles.tableCell, styles.tableServiceCol, styles.tableServiceContent]}>
                    <PlatformIcon platform={platformFromServiceLabel(row.service)} size={16} />
                    <Text style={[styles.tableServiceText, { color: theme.foreground }]}>{row.service}</Text>
                  </View>
                  <Text style={[styles.tableCell, styles.tableFeeCol, { color: theme.primary, fontWeight: '700' }]}>
                    {row.fee}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        );
      case 'partnerships':
        return (
          <SectionCard key={id} title={t('mediaKitScreen.partnershipsTitle')} subtitle={t('mediaKitScreen.partnershipsSubtitle')}>
            <View style={styles.tagRow}>
              {data.partnerships?.map((brand) => <Badge key={brand} tone="neutral" label={brand} />)}
            </View>
          </SectionCard>
        );
      case 'cases':
        if (data.cases.length === 0) {
          if (variant === 'public') {
            return (
              <SectionCard key={id} title={t('mediaKitScreen.proofTitle')} subtitle={t('mediaKitPublicScreen.proofEmptySubtitle')} />
            );
          }
          return (
            <SectionCard key={id} title={t('mediaKitScreen.proofTitle')} subtitle={t('mediaKitScreen.proofEmptySubtitle')}>
              <HubListRow icon="create-outline" title={t('mediaKitScreen.proofEmptyEdit')} onPress={onEditCases} />
            </SectionCard>
          );
        }
        return (
          <SectionCard key={id} title={t('mediaKitScreen.proofTitle')}>
            <View style={{ gap: spacing.md }}>
              {data.cases.map((c) => {
                const resultHighlight = c.resultSummary?.trim() || c.outcomeNote?.trim();
                const outcomeDetail =
                  c.resultSummary?.trim() &&
                  c.outcomeNote?.trim() &&
                  c.outcomeNote.trim() !== c.resultSummary.trim()
                    ? c.outcomeNote.trim()
                    : null;
                return (
                  <View key={c.id} style={[styles.caseCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    {resultHighlight ? (
                      <View style={[styles.caseResultBanner, { backgroundColor: theme.accentMintSoft, borderColor: theme.primary }]}>
                        <Text style={[styles.caseResultLabel, { color: theme.foregroundEyebrow }]}>
                          {t('mediaKitScreen.caseResultLabel')}
                        </Text>
                        <Text style={[styles.caseResultHighlight, { color: theme.primary }]}>{resultHighlight}</Text>
                      </View>
                    ) : variant === 'owner' ? (
                      <View style={[styles.caseResultPlaceholder, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                        <Text style={[styles.caseResultPlaceholderText, { color: theme.mutedForeground }]}>
                          {t('mediaKitScreen.pendingFill')}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={[styles.caseTitle, { color: theme.foreground }]}>{c.title}</Text>
                    <Badge tone="mint" label={c.industry} />
                    {outcomeDetail ? (
                      <Text style={[styles.caseResult, { color: theme.mutedForeground }]}>{outcomeDetail}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </SectionCard>
        );
      case 'contact':
        return (
          <SectionCard
            key={id}
            title={t('mediaKitScreen.contactTitle')}
            subtitle={
              variant === 'public' || canCopyContactUrl
                ? t('mediaKitScreen.contactSubtitle')
                : t('mediaKitScreen.contactUrlProfileHint')
            }
            emphasis>
            {variant === 'owner' && data.contactUrl && canCopyContactUrl ? (
              <Text style={[styles.contactUrl, { color: theme.mutedForeground }]} selectable>
                {data.contactUrl}
              </Text>
            ) : null}
            {data.contactEmail ? (
              <Text style={[styles.contactEmail, { color: theme.foreground }]}>{data.contactEmail}</Text>
            ) : null}
            <Text style={[styles.cta, { color: theme.foreground }]}>{data.inviteCta}</Text>
            {data.paymentTerms ? (
              <Text style={[styles.paymentTerms, { color: theme.mutedForeground }]}>{data.paymentTerms}</Text>
            ) : null}
            {variant === 'owner' ? (
              canCopyContactUrl ? (
                <HubListRow
                  icon="link-outline"
                  title={t('mediaKitScreen.copyLink')}
                  subtitle={t('mediaKitScreen.copyLinkHint')}
                  onPress={onCopyContactUrl}
                />
              ) : (
                <HubListRow
                  icon="person-outline"
                  title={t('mediaKitScreen.contactUrlProfileCta')}
                  onPress={onCompleteProfile}
                />
              )
            ) : null}
          </SectionCard>
        );
      default:
        return null;
    }
  };

  return <>{sectionOrder.map((id) => renderSection(id))}</>;
}

function AudienceRow({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return (
    <View style={styles.audienceRow}>
      <Text style={[styles.audienceLabel, { color: theme.mutedForeground }]}>{label}</Text>
      <Text style={[styles.audienceValue, { color: theme.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bio: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  audienceRow: { gap: spacing.xs },
  audienceLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  audienceValue: { fontSize: fontSize.body, lineHeight: lineHeight.body },
  platformCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  platformTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'center' },
  platformName: { fontSize: fontSize.body, fontWeight: '700' },
  platformHandle: { fontSize: fontSize.bodySmall, fontWeight: '600' },
  platformNote: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  platformViews: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  rateScroll: { gap: spacing.md, paddingVertical: spacing.xs },
  rateCard: {
    width: 200,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rateCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  ratePrice: { fontSize: fontSize.cardTitle, fontWeight: '800' },
  rateTitle: { fontSize: fontSize.body, fontWeight: '700' },
  rateDesc: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tableHeaderCell: { fontSize: fontSize.caption, fontWeight: '700', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tableCell: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  tableServiceCol: { flex: 2 },
  tableServiceContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tableServiceText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  tableFeeCol: { flex: 1, textAlign: 'right' },
  caseCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  caseResultBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  caseResultLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  caseResultHighlight: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    lineHeight: lineHeight.bodyRelaxed,
  },
  caseResultPlaceholder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  caseResultPlaceholderText: { fontSize: fontSize.caption, fontWeight: '600' },
  caseTitle: { fontSize: fontSize.cardTitle, fontWeight: '600' },
  caseResult: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  trustProofGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  trustProofTile: {
    flex: 1,
    minWidth: '46%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  trustProofValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  trustProofLabel: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  trustProofTrend: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  trustProofDisclaimer: { fontSize: 11, lineHeight: 14, marginTop: spacing.xs },
  contactUrl: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  contactEmail: { fontSize: fontSize.body, fontWeight: '700', marginBottom: spacing.sm },
  cta: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed, fontWeight: '600' },
  paymentTerms: { fontSize: fontSize.caption, lineHeight: lineHeight.bodyRelaxed, marginTop: spacing.sm, fontStyle: 'italic' },
});
