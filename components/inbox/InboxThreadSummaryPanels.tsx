import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { formatDeadlineLine } from '@/src/lib/deadline-display';
import { contractWarningSeverity, sortContractWarningFlags } from '@/src/lib/contract-warning';
import { contractWarningVisuals } from '@/src/lib/contract-warning-visuals';
import { attentionItemText, localizeRiskFlag } from '@/src/lib/inbox-detail-labels';
import { inboxPriorityBadgeTone } from '@/src/lib/inbox-priority-visuals';
import { Badge } from '@/components/product';
import type { InboxDeliverablePackage, InboxPriority, InboxRiskFlag, ProposalPreview } from '@/src/types/domain';

function summarizeDeliverables(packages: InboxDeliverablePackage[]): string {
  const items = packages.flatMap((pkg) => pkg.items ?? []);
  if (items.length === 0) return '—';
  return items
    .map((item) => {
      const quantity = item.quantity ?? 1;
      return quantity > 1 ? `${quantity}× ${item.name}` : item.name;
    })
    .join(' + ');
}

function resolveOfferDisplay(budgetDisplay: string | null | undefined, packages: InboxDeliverablePackage[]): string {
  const budget = budgetDisplay?.trim();
  if (budget) return budget;
  const quote = packages.find((pkg) => pkg.quoteDisplay?.trim())?.quoteDisplay?.trim();
  return quote ?? '—';
}

function buildRiskCheckBody(flags: InboxRiskFlag[], t: TFunction): string | null {
  const sorted = sortContractWarningFlags(flags).map((flag) => localizeRiskFlag(flag, t));
  const parts = sorted.map((flag) => attentionItemText(flag, t)).filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

type ThreadPriorityBannerProps = {
  priority?: InboxPriority | null;
  priorityLabel?: string;
  nextAction?: string | null;
  onExplainPress?: () => void;
  showExplain?: boolean;
};

export function ThreadPriorityBanner({
  priority,
  priorityLabel,
  nextAction,
  onExplainPress,
  showExplain = false,
}: ThreadPriorityBannerProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (!priority && !nextAction) return null;

  return (
    <View style={styles.priorityBannerWrap}>
      <View
        style={[
          styles.priorityBanner,
          {
            borderColor: theme.border,
            backgroundColor: theme.secondary,
          },
        ]}>
        <View style={styles.priorityBannerMain}>
          {priority && priorityLabel ? (
            <Badge tone={inboxPriorityBadgeTone(priority)} label={priorityLabel} />
          ) : null}
          {nextAction ? (
            <Text style={[styles.priorityHint, { color: theme.foregroundSubtitle }]} numberOfLines={2}>
              {nextAction}
            </Text>
          ) : null}
        </View>
      </View>
      {showExplain && onExplainPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('inboxPriority.rankingExplain.a11y')}
          hitSlop={6}
          onPress={onExplainPress}
          style={({ pressed }) => [
            styles.explainPressable,
            { paddingHorizontal: spacing.md },
            pressed && { opacity: 0.7 },
          ]}>
          <Text style={[styles.explainLink, { color: theme.primary }]}>
            {t('inboxPriority.rankingExplain.button')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ThreadAiSummaryCardProps = {
  title: string;
  summaryText?: string | null;
  confidencePercent?: number | null;
  extracting?: boolean;
  analysisPending?: boolean;
  budgetDisplay?: string | null;
  packages: InboxDeliverablePackage[];
  deadlineAtISO?: string | null;
  deadlineKind?: string | null;
  deadlineText?: string | null;
  proposal?: ProposalPreview | null;
  onOpenProposal?: () => void;
  onCreateProposal?: () => void;
  proposalCreating?: boolean;
};

export function ThreadAiSummaryCard({
  title,
  summaryText,
  confidencePercent,
  extracting = false,
  analysisPending = false,
  budgetDisplay,
  packages,
  deadlineAtISO,
  deadlineKind,
  deadlineText,
  proposal,
  onOpenProposal,
  onCreateProposal,
  proposalCreating = false,
}: ThreadAiSummaryCardProps) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';
  const showPending = extracting || analysisPending;
  const offer = resolveOfferDisplay(budgetDisplay, packages);
  const deliverables = summarizeDeliverables(packages);
  const deadline = formatDeadlineLine(t, {
    atISO: deadlineAtISO,
    kind: deadlineKind,
    text: deadlineText,
    locale,
    context: 'thread',
  });

  const proposalEntry = proposal ? (
    <Pressable
      accessibilityRole="button"
      onPress={onOpenProposal}
      style={({ pressed }) => [
        styles.proposalRow,
        { borderColor: theme.primary + '55', backgroundColor: theme.primary + '0D' },
        pressed && { opacity: 0.8 },
      ]}>
      <View style={[styles.proposalIcon, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name="document-text-outline" size={18} color={theme.primary} />
      </View>
      <View style={styles.proposalCopy}>
        <Text style={[styles.proposalTitle, { color: theme.foreground }]}>
          {t('inboxThreadDetail.proposalSavedTitle')}
        </Text>
        <Text style={[styles.proposalHint, { color: theme.mutedForeground }]} numberOfLines={1}>
          {proposal.title}
        </Text>
      </View>
      <Text style={[styles.proposalLink, { color: theme.primary }]}>
        {t('inboxThreadDetail.proposalViewCta')}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={theme.primary} />
    </Pressable>
  ) : onCreateProposal ? (
    <Pressable
      accessibilityRole="button"
      disabled={proposalCreating}
      onPress={onCreateProposal}
      style={({ pressed }) => [
        styles.proposalRow,
        { borderColor: theme.primary + '55', backgroundColor: theme.primary + '0D' },
        (proposalCreating || pressed) && { opacity: 0.72 },
      ]}>
      <View style={[styles.proposalIcon, { backgroundColor: theme.primary + '18' }]}>
        {proposalCreating ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Ionicons name="document-text-outline" size={18} color={theme.primary} />
        )}
      </View>
      <View style={styles.proposalCopy}>
        <Text style={[styles.proposalTitle, { color: theme.foreground }]}>
          {t('inboxThreadDetail.proposalCreateTitle')}
        </Text>
        <Text style={[styles.proposalHint, { color: theme.mutedForeground }]} numberOfLines={1}>
          {t('inboxThreadDetail.proposalCreateHint')}
        </Text>
      </View>
      <Text style={[styles.proposalLink, { color: theme.primary }]}>
        {t('inboxThreadDetail.proposalCreateCta')}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={theme.primary} />
    </Pressable>
  ) : null;

  return (
    <View style={styles.aiSummaryStack}>
      <View
        style={[
          styles.aiCard,
          {
            borderColor: theme.accentMintStrong + '55',
            backgroundColor: theme.card,
          },
        ]}>
        <View style={styles.aiCardTop}>
          <View style={styles.aiCardHeader}>
            <View style={[styles.aiIconBox, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="sparkles" size={14} color={theme.primary} />
            </View>
            <Text style={[styles.aiEyebrow, { color: theme.primary }]}>
              {t('inboxThreadDetail.aiSummaryEyebrow')}
            </Text>
          </View>
          {confidencePercent != null ? (
            <View style={[styles.confidenceBadge, { borderColor: theme.accentMintStrong + '88' }]}>
              <Text style={[styles.confidenceText, { color: theme.accentMintStrong }]}>
                {t('inboxThreadDetail.briefConfidence', { percent: confidencePercent })}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.cooperationTitle, { color: theme.foreground }]} numberOfLines={3}>
          {title}
        </Text>

        {showPending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
              {analysisPending
                ? t('inboxThreadDetail.threadAnalysisPending')
                : t('inboxThreadDetail.aiBriefExtracting')}
            </Text>
          </View>
        ) : summaryText ? (
          <Text style={[styles.summaryText, { color: theme.foregroundSubtitle }]}>{summaryText}</Text>
        ) : (
          <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
            {t('inboxThreadDetail.aiBriefPending')}
          </Text>
        )}

        <View style={styles.factGrid}>
          <SummaryFact label={t('inboxThreadDetail.summaryOfferLabel')} value={offer} />
          <SummaryFact label={t('inboxThreadDetail.summaryDeliverablesLabel')} value={deliverables} />
          <SummaryFact label={t('inboxThreadDetail.summaryDeadlineLabel')} value={deadline ?? '—'} />
        </View>
      </View>

      {proposalEntry}
    </View>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.factBox, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Text style={[styles.factLabel, { color: theme.foregroundEyebrow }]}>{label}</Text>
      <Text style={[styles.factValue, { color: theme.foreground }]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

type ThreadRiskCheckCardProps = {
  flags: InboxRiskFlag[];
};

export function ThreadRiskCheckCard({ flags }: ThreadRiskCheckCardProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const body = buildRiskCheckBody(flags, t);

  if (!body) return null;

  const severity = contractWarningSeverity(flags) ?? 'warning';
  const visuals = contractWarningVisuals(severity, theme);

  return (
    <View
      style={[
        styles.riskCard,
        {
          borderColor: visuals.border,
          backgroundColor: visuals.background,
        },
      ]}>
      <Text style={[styles.riskTitle, { color: visuals.rail }]}>
        {t('inboxThreadDetail.riskToCheckTitle')}
      </Text>
      <Text style={[styles.riskBody, { color: theme.foregroundSubtitle }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  priorityBannerWrap: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  priorityBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priorityBannerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    minWidth: 0,
  },
  priorityHint: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  explainPressable: { alignSelf: 'flex-start' },
  explainLink: { fontSize: fontSize.bodySmall, fontWeight: '600' },

  aiSummaryStack: {
    gap: spacing.sm,
  },
  aiCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  aiCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiIconBox: { width: 26, height: 26, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  aiEyebrow: { fontSize: fontSize.caption, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  confidenceBadge: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  confidenceText: { fontSize: fontSize.caption, fontWeight: '700' },
  cooperationTitle: { fontSize: fontSize.cardTitle, fontWeight: '800', lineHeight: lineHeight.bodyRelaxed },
  proposalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  proposalIcon: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  proposalCopy: { flex: 1, gap: 2, minWidth: 0 },
  proposalTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  proposalHint: { fontSize: fontSize.caption, lineHeight: lineHeight.caption },
  proposalLink: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pendingText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  summaryText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  factGrid: { gap: spacing.sm, marginTop: spacing.xs },
  factBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  factLabel: {
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  factValue: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },

  riskCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  riskTitle: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  riskBody: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
