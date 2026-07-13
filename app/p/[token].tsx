import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, HubScreen, ProposalSkuLines, QueryRetryCard, SectionCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { usePublicProposal } from '@/src/hooks/use-public-proposal';

export default function PublicProposalScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const normalizedToken = token?.trim() ?? '';
  const query = usePublicProposal(normalizedToken);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (!normalizedToken) {
    return <InvalidProposalLink />;
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('proposalPublicScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    const status = query.error && 'status' in query.error ? query.error.status : undefined;
    if (status === 404) return <InvalidProposalLink />;
    return (
      <PlaceholderScreen
        title={t('proposalPublicScreen.loadFailedTitle')}
        description={t('proposalPublicScreen.loadFailedDesc')}>
        <QueryRetryCard
          message={query.error?.message ?? t('proposalPublicScreen.loadFailedDesc')}
          onRetry={() => query.refetch()}
        />
      </PlaceholderScreen>
    );
  }

  const { proposal, version, expiresAt } = query.data;
  const expiryLabel = expiresAt
    ? new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }).format(
        new Date(expiresAt),
      )
    : undefined;

  return (
    <HubScreen
      eyebrow={t('proposalPublicScreen.eyebrow')}
      title={proposal.title}
      lead={t('proposalPublicScreen.lead', { brand: proposal.brandHint })}>
      <View style={styles.metaRow}>
        <Badge tone="mint" label={t('proposalPublicScreen.version', { version })} />
        {expiryLabel ? (
          <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
            {t('proposalPublicScreen.validUntil', { date: expiryLabel })}
          </Text>
        ) : null}
      </View>

      <SectionCard
        title={t('proposalPublicScreen.summaryTitle')}
        subtitle={t('proposalPublicScreen.creatorLabel', { creator: proposal.creatorDisplayName })}>
        <Text style={[styles.summary, { color: theme.foreground }]}>{proposal.executiveSummary}</Text>
      </SectionCard>

      <SectionCard
        title={t('proposalPublicScreen.lineItemsTitle')}
        subtitle={t('proposalPublicScreen.lineItemsSubtitle', { count: proposal.skuLines.length })}>
        <ProposalSkuLines lines={proposal.skuLines} />
      </SectionCard>

      <SectionCard
        title={t('proposalPublicScreen.termsTitle')}
        subtitle={t('proposalPublicScreen.termsSubtitle')}>
        <View style={styles.termsList}>
          <PublicTermBlock title={t('proposalPublicScreen.rightsTitle')} items={proposal.rightsBullets} tone="warning" />
          <PublicTermBlock title={t('proposalPublicScreen.paymentTitle')} items={proposal.paymentBullets} tone="warning" />
          <PublicTermBlock title={t('proposalPublicScreen.riskTitle')} items={proposal.riskBullets} tone="danger" />
        </View>
      </SectionCard>

      <Text style={[styles.disclaimer, { color: theme.mutedForeground }]}>
        {t('proposalPublicScreen.disclaimer')}
      </Text>
    </HubScreen>
  );
}

function InvalidProposalLink() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('proposalPublicScreen.invalidTitle')}
      description={t('proposalPublicScreen.invalidDesc')}
    />
  );
}

function PublicTermBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'warning' | 'danger';
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  if (items.length === 0) return null;

  return (
    <View style={[styles.termBlock, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Badge tone={tone} label={title} />
      {items.map((item, index) => (
        <View key={`${title}-${index}`} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color: theme.primary }]}>•</Text>
          <Text style={[styles.termText, { color: theme.foreground }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  metaText: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  summary: { fontSize: fontSize.body, lineHeight: lineHeight.body },
  termsList: { gap: spacing.md },
  termBlock: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { fontSize: fontSize.body, fontWeight: '800', lineHeight: lineHeight.body },
  termText: { flex: 1, fontSize: fontSize.body, lineHeight: lineHeight.body },
  disclaimer: { textAlign: 'center', fontSize: fontSize.caption, lineHeight: lineHeight.body, padding: spacing.md },
});
