import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation, type TFunction } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, spacing } from '@/constants/tokens';
import { formatDeadlineLine } from '@/src/lib/deadline-display';
import { translateMissingField, type AttentionListItem } from '@/src/lib/inbox-detail-labels';
import type { InboxDeliverableItem, InboxDeliverablePackage } from '@/src/types/domain';

function formatDeliverableLine(item: InboxDeliverableItem, t: TFunction, locale: string): string {
  const quantity = item.quantity ?? 1;
  const name = quantity > 1 ? `${quantity}× ${item.name}` : item.name;
  const schedule = formatDeadlineLine(t, {
    atISO: item.dueAtISO,
    kind: item.dueAtKind,
    text: item.dueAtText,
    locale,
    context: 'item',
  });
  return schedule ? `${name} · ${schedule}` : name;
}

export type BriefExtractionPanelProps = {
  aiBriefText?: string | null;
  budgetDisplay?: string | null;
  briefConfidencePercent?: number | null;
  briefExtracting: boolean;
  threadAnalysisPending: boolean;
  packages: InboxDeliverablePackage[];
  usageRights?: string[];
  deadlineAtISO?: string | null;
  deadlineKind?: string | null;
  deadlineText?: string | null;
  systemHintItems?: AttentionListItem[];
  riskNoteItems?: AttentionListItem[];
  attentionItems: AttentionListItem[];
  missingFields: string[];
  correctedByUser?: boolean;
};

export function BriefExtractionPanel({
  aiBriefText,
  budgetDisplay,
  briefConfidencePercent,
  briefExtracting,
  threadAnalysisPending,
  packages,
  usageRights = [],
  deadlineAtISO,
  deadlineKind,
  deadlineText,
  systemHintItems = [],
  riskNoteItems = [],
  attentionItems,
  missingFields,
  correctedByUser,
}: BriefExtractionPanelProps) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';

  const showPending = threadAnalysisPending || briefExtracting;
  const packagesWithItems = packages.filter((pkg) => (pkg.items?.length ?? 0) > 0);
  const hasMultipleOptions = packagesWithItems.length > 1;
  const deadlineLine = formatDeadlineLine(t, {
    atISO: deadlineAtISO,
    kind: deadlineKind,
    text: deadlineText,
    locale,
    context: 'thread',
  });
  const hasUsage = usageRights.length > 0;
  const hasDeadline = !!deadlineLine;
  const hasSystemHints = systemHintItems.length > 0;
  const hasRiskNotes = riskNoteItems.length > 0;
  const hasSuggestions = attentionItems.length > 0;
  const showTopBudget =
    !!budgetDisplay?.trim() &&
    !packagesWithItems.some((pkg) => pkg.quoteDisplay?.trim() === budgetDisplay?.trim());
  const hasDealTerms =
    showTopBudget || packagesWithItems.length > 0 || hasUsage || hasDeadline;

  return (
    <View style={styles.root}>
      {correctedByUser ? (
        <Text style={[styles.metaLine, { color: '#34D399' }]}>{t('inboxThreadDetail.overrideNotice')}</Text>
      ) : null}

      {showPending ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
            {threadAnalysisPending
              ? t('inboxThreadDetail.threadAnalysisPending')
              : t('inboxThreadDetail.aiBriefExtracting')}
          </Text>
        </View>
      ) : null}

      {aiBriefText ? (
        <Text style={[styles.summary, { color: theme.foreground }]}>{aiBriefText}</Text>
      ) : !showPending ? (
        <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
          {t('inboxThreadDetail.aiBriefPending')}
        </Text>
      ) : null}

      {hasDealTerms ? (
        <View style={[styles.dealSheet, { borderTopColor: theme.border }]}>
          {showTopBudget ? (
            <Text style={[styles.budgetHero, { color: theme.primary }]}>{budgetDisplay}</Text>
          ) : null}

          {packagesWithItems.map((pkg, index) => (
            <View key={`${pkg.label ?? 'pkg'}-${pkg.quoteDisplay ?? index}`} style={styles.packageGroup}>
              {hasMultipleOptions ? (
                <Text style={[styles.optionLabel, { color: theme.foregroundEyebrow }]}>
                  {pkg.label?.trim()
                    ? t('inboxThreadDetail.briefLayout.optionLabel', { label: pkg.label.trim() })
                    : t('inboxThreadDetail.briefLayout.optionFallback', { index: index + 1 })}
                  {pkg.quoteDisplay?.trim() ? ` · ${pkg.quoteDisplay.trim()}` : ''}
                </Text>
              ) : pkg.quoteDisplay?.trim() && !showTopBudget ? (
                <Text style={[styles.budgetHero, { color: theme.primary }]}>{pkg.quoteDisplay.trim()}</Text>
              ) : null}
              {(pkg.items ?? []).map((item, itemIndex) => (
                <Text
                  key={`${item.name}-${itemIndex}`}
                  style={[styles.dealLine, { color: theme.foregroundSubtitle }]}>
                  {formatDeliverableLine(item, t, locale)}
                </Text>
              ))}
            </View>
          ))}

          {hasUsage ? (
            <Text style={[styles.dealLine, { color: theme.foregroundSubtitle }]}>
              <Text style={[styles.dealPrefix, { color: theme.foregroundEyebrow }]}>
                {t('inboxThreadDetail.briefLayout.usagePrefix')}
              </Text>
              {usageRights.join(' · ')}
            </Text>
          ) : null}

          {hasDeadline ? (
            <Text style={[styles.dealLine, { color: theme.foregroundSubtitle }]}>{deadlineLine}</Text>
          ) : null}
        </View>
      ) : null}

      {hasSystemHints ? (
        <View style={[styles.hintSheet, { borderLeftColor: theme.mutedForeground }]}>
          <Text style={[styles.actionHeading, { color: theme.foregroundEyebrow }]}>
            {t('inboxThreadDetail.systemHintsTitle')}
          </Text>
          {systemHintItems.map((item) => (
            <Text key={item.id} style={[styles.hintLine, { color: theme.foregroundSubtitle }]}>
              {item.text}
            </Text>
          ))}
        </View>
      ) : null}

      {hasRiskNotes ? (
        <View style={[styles.hintSheet, { borderLeftColor: theme.mutedForeground }]}>
          <Text style={[styles.actionHeading, { color: theme.foregroundEyebrow }]}>
            {t('inboxThreadDetail.riskNotesTitle')}
          </Text>
          {riskNoteItems.map((item) => (
            <Text key={item.id} style={[styles.hintLine, { color: theme.foregroundSubtitle }]}>
              {item.text}
            </Text>
          ))}
        </View>
      ) : null}

      {hasSuggestions ? (
        <View style={[styles.actionSheet, { borderLeftColor: theme.primary }]}>
          <Text style={[styles.actionHeading, { color: theme.foregroundEyebrow }]}>
            {t('inboxThreadDetail.attentionTitle')}
          </Text>
          {attentionItems.map((item, index) => (
            <Text key={item.id} style={[styles.actionLine, { color: theme.foreground }]}>
              <Text style={[styles.actionIndex, { color: theme.primary }]}>{index + 1}. </Text>
              {item.text}
            </Text>
          ))}
        </View>
      ) : null}

      {missingFields.length > 0 ? (
        <Text style={[styles.footnote, { color: theme.mutedForeground }]}>
          {t('inboxThreadDetail.missingFieldsHint', {
            fields: missingFields.map((field) => translateMissingField(t, field)).join(' · '),
          })}
        </Text>
      ) : null}

      {briefConfidencePercent != null ? (
        <Text style={[styles.footnote, { color: theme.mutedForeground }]}>
          {t('inboxThreadDetail.briefConfidence', { percent: briefConfidencePercent })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  metaLine: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '600',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingText: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  summary: {
    fontSize: fontSize.lead,
    lineHeight: lineHeight.bodyRelaxed,
    fontWeight: '500',
  },
  dealSheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  budgetHero: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    lineHeight: lineHeight.lead,
  },
  packageGroup: {
    gap: 2,
  },
  optionLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    lineHeight: lineHeight.body,
    marginBottom: 2,
  },
  dealLine: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    fontWeight: '500',
  },
  dealPrefix: {
    fontWeight: '700',
  },
  actionSheet: {
    borderLeftWidth: 2,
    paddingLeft: spacing.sm,
    gap: spacing.xs,
  },
  hintSheet: {
    borderLeftWidth: 2,
    paddingLeft: spacing.sm,
    gap: spacing.xs,
  },
  hintLine: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    fontWeight: '500',
  },
  actionHeading: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    lineHeight: lineHeight.body,
  },
  actionLine: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    fontWeight: '500',
  },
  actionIndex: {
    fontWeight: '800',
  },
  footnote: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
});
