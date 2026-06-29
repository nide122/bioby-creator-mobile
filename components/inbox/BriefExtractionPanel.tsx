import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  translateDetailSignal,
  translateMissingField,
  type AttentionListItem,
} from '@/src/lib/inbox-detail-labels';
import type { InboxDeliverablePackage } from '@/src/types/domain';

type SectionTone = 'primary' | 'amber' | 'mint' | 'slate';

type BriefSectionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  tone: SectionTone;
  indentBody?: boolean;
  children: ReactNode;
};

function BriefSection({ icon, title, subtitle, tone, indentBody = true, children }: BriefSectionProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const toneStyle = {
    primary: {
      border: theme.primary + '44',
      background: theme.primary + '0C',
      icon: theme.primary,
      title: theme.foreground,
    },
    amber: {
      border: '#F59E0B55',
      background: '#F59E0B10',
      icon: '#B45309',
      title: theme.foreground,
    },
    mint: {
      border: '#34D39944',
      background: '#34D39910',
      icon: '#059669',
      title: theme.foreground,
    },
    slate: {
      border: theme.border,
      background: theme.secondary,
      icon: theme.foregroundEyebrow,
      title: theme.foreground,
    },
  }[tone];

  return (
    <View
      style={[
        styles.section,
        { borderColor: toneStyle.border, backgroundColor: toneStyle.background },
      ]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: toneStyle.icon + '18' }]}>
          <Ionicons name={icon} size={15} color={toneStyle.icon} />
        </View>
        <View style={styles.sectionHeaderCopy}>
          <Text style={[styles.sectionTitle, { color: toneStyle.title }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.sectionSubtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {children ? (
        <View style={indentBody ? styles.sectionBody : styles.sectionBodyFlush}>{children}</View>
      ) : null}
    </View>
  );
}

function PackageQuoteCard({ pkg }: { pkg: InboxDeliverablePackage }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return (
    <View style={[styles.quoteCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      {pkg.budgetLabel ? (
        <Text style={[styles.quoteAmount, { color: theme.primary }]}>{pkg.budgetLabel}</Text>
      ) : null}
      <Text style={[styles.quoteDeliverable, { color: theme.foreground }]}>{pkg.deliverable}</Text>
    </View>
  );
}

function BulletValue({ text, accent }: { text: string; accent: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return (
    <View style={styles.valueRow}>
      <View style={[styles.valueDot, { backgroundColor: accent }]} />
      <Text style={[styles.valueText, { color: theme.foregroundSubtitle }]}>{text}</Text>
    </View>
  );
}

function AttentionCheckItem({ text }: { text: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return (
    <View style={styles.attentionItem}>
      <View style={[styles.attentionBullet, { backgroundColor: '#B45309' }]} />
      <Text style={[styles.attentionText, { color: theme.foreground }]}>{text}</Text>
    </View>
  );
}

function SignalChip({ label }: { label: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return (
    <View style={[styles.signalChip, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.signalChipText, { color: theme.foregroundSubtitle }]}>{label}</Text>
    </View>
  );
}

export type BriefExtractionPanelProps = {
  aiBriefText?: string | null;
  briefExtracting: boolean;
  threadAnalysisPending: boolean;
  packages: InboxDeliverablePackage[];
  deliverables?: string[];
  usageRights?: string[];
  postingSchedule?: string;
  attentionItems: AttentionListItem[];
  classificationSignals: string[];
  missingFields: string[];
  correctedByUser?: boolean;
};

export function BriefExtractionPanel({
  aiBriefText,
  briefExtracting,
  threadAnalysisPending,
  packages,
  deliverables = [],
  usageRights = [],
  postingSchedule,
  attentionItems,
  classificationSignals,
  missingFields,
  correctedByUser,
}: BriefExtractionPanelProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const hasQuoteSection = packages.length > 0 || deliverables.length > 0;
  const hasUsage = usageRights.length > 0;
  const hasSchedule = !!postingSchedule?.trim();
  const hasAttention = attentionItems.length > 0;
  const hasSignals = classificationSignals.length > 0;

  return (
    <View style={styles.root}>
      {correctedByUser ? (
        <View style={[styles.overrideNotice, { borderColor: '#34D39940', backgroundColor: '#34D39910' }]}>
          <Ionicons name="person-outline" size={13} color="#34D399" />
          <Text style={[styles.overrideNoticeText, { color: '#34D399' }]}>
            {t('inboxThreadDetail.overrideNotice')}
          </Text>
        </View>
      ) : null}

      {threadAnalysisPending ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
            {t('inboxThreadDetail.threadAnalysisPending')}
          </Text>
        </View>
      ) : null}

      {briefExtracting ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
            {t('inboxThreadDetail.aiBriefExtracting')}
          </Text>
        </View>
      ) : null}

      {aiBriefText ? (
        <Text style={[styles.summary, { color: theme.foreground }]}>{aiBriefText}</Text>
      ) : !briefExtracting && !threadAnalysisPending ? (
        <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
          {t('inboxThreadDetail.aiBriefPending')}
        </Text>
      ) : null}

      {hasQuoteSection ? (
        <BriefSection
          icon="cash-outline"
          title={t('inboxThreadDetail.briefSections.quoteTitle')}
          subtitle={t('inboxThreadDetail.briefSections.quoteSubtitle')}
          tone="primary"
          indentBody={false}>
          {packages.length > 0 ? (
            <View style={styles.quoteGrid}>
              {packages.map((pkg) => (
                <PackageQuoteCard key={`${pkg.deliverable}-${pkg.budgetLabel ?? 'quote'}`} pkg={pkg} />
              ))}
            </View>
          ) : (
            <View style={styles.valueList}>
              {deliverables.map((item) => (
                <BulletValue key={item} text={item} accent={theme.primary} />
              ))}
            </View>
          )}
        </BriefSection>
      ) : null}

      {hasUsage ? (
        <BriefSection
          icon="document-text-outline"
          title={t('inboxThreadDetail.usageRightsTitle')}
          subtitle={t('inboxThreadDetail.briefSections.usageSubtitle')}
          tone="slate">
          <View style={styles.valueList}>
            {usageRights.map((item) => (
              <BulletValue key={item} text={item} accent={theme.foregroundEyebrow} />
            ))}
          </View>
        </BriefSection>
      ) : null}

      {hasSchedule ? (
        <BriefSection
          icon="calendar-outline"
          title={t('inboxThreadDetail.postingScheduleTitle')}
          subtitle={t('inboxThreadDetail.briefSections.scheduleSubtitle')}
          tone="slate">
          <Text style={[styles.scheduleValue, { color: theme.foreground }]}>{postingSchedule!.trim()}</Text>
        </BriefSection>
      ) : null}

      {hasAttention ? (
        <BriefSection
          icon="chatbubble-ellipses-outline"
          title={t('inboxThreadDetail.attentionTitle')}
          subtitle={t('inboxThreadDetail.attentionSubtitle')}
          tone="amber">
          <View style={styles.attentionList}>
            {attentionItems.map((item) => (
              <AttentionCheckItem key={item.id} text={item.text} />
            ))}
          </View>
        </BriefSection>
      ) : null}

      {hasSignals ? (
        <BriefSection
          icon="git-branch-outline"
          title={t('inboxThreadDetail.signalsTitle')}
          subtitle={t('inboxThreadDetail.signalsSubtitle')}
          tone="slate">
          <View style={styles.signalRow}>
            {classificationSignals.map((signal) => (
              <SignalChip key={signal} label={translateDetailSignal(t, signal)} />
            ))}
          </View>
        </BriefSection>
      ) : null}

      {missingFields.length > 0 ? (
        <View style={[styles.missingCallout, { borderColor: '#F59E0B44', backgroundColor: '#F59E0B0C' }]}>
          <Ionicons name="help-circle-outline" size={14} color="#B45309" />
          <Text style={[styles.missingText, { color: theme.foregroundSubtitle }]}>
            {t('inboxThreadDetail.missingFieldsHint', {
              fields: missingFields.map((field) => translateMissingField(t, field)).join(' · '),
            })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  summary: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
    fontWeight: '500',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingText: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  overrideNotice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  overrideNoticeText: {
    flex: 1,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: fontSize.bodySmall,
    fontWeight: '800',
    lineHeight: lineHeight.body,
  },
  sectionSubtitle: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  sectionBody: {
    paddingLeft: 36,
    gap: spacing.sm,
  },
  sectionBodyFlush: {
    gap: spacing.sm,
  },
  quoteGrid: {
    gap: spacing.sm,
  },
  quoteCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  quoteAmount: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    lineHeight: lineHeight.lead,
  },
  quoteDeliverable: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
    lineHeight: lineHeight.body,
  },
  valueList: {
    gap: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  valueDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
  },
  valueText: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    fontWeight: '500',
  },
  scheduleValue: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
    lineHeight: lineHeight.bodyRelaxed,
  },
  attentionList: {
    gap: spacing.sm,
  },
  attentionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  attentionBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  attentionText: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    fontWeight: '500',
    lineHeight: lineHeight.bodyRelaxed,
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  signalChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  signalChipText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    lineHeight: lineHeight.body,
  },
  missingCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  missingText: {
    flex: 1,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
});
