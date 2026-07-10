import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import {
  mergeDetailSignals,
  translateDetailSignal,
  translateMissingField,
  visibleMissingFields,
} from '@/src/lib/inbox-detail-labels';
import type { InboxThreadDetail } from '@/src/types/domain';

type DraftOpportunityBriefProps = {
  detail: InboxThreadDetail | undefined;
  loading?: boolean;
};

function BriefListSection({ title, items }: { title: string; items: string[] }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  if (!items.length) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.fieldLabel, { color: theme.foregroundEyebrow }]}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={[styles.fieldValue, { color: theme.foregroundSubtitle }]}>
          · {item}
        </Text>
      ))}
    </View>
  );
}

export function DraftOpportunityBrief({ detail, loading }: DraftOpportunityBriefProps) {
  const { t } = useTranslation();
  const { inboxLeadStageLabel, inboxCategoryLabel } = useDomainLabels();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!detail) {
    return null;
  }

  const summary = detail.classificationSummary?.trim() || detail.preview?.trim();
  const packages = detail.packages ?? [];
  const deliverables =
    packages.length > 0
      ? packages.flatMap((pkg) =>
          (pkg.items ?? []).map((item) => {
            const name = item.name?.trim();
            if (!name) return null;
            return pkg.quoteDisplay ? `${pkg.quoteDisplay} · ${name}` : name;
          }).filter((line): line is string => !!line),
        )
      : (detail.deliverables ?? []);
  const missingFields = visibleMissingFields(detail.missingFields, detail.budgetDisplay, {
    packages: detail.packages,
    usageRights: detail.usageRights,
  });
  const signals = mergeDetailSignals(detail.signals, detail.classificationSignals)
    .slice(0, 5)
    .map((signal) => translateDetailSignal(t, signal));
  const keyHighlights = [
    deliverables[0],
    detail.usageRights?.[0],
    detail.postingSchedule?.trim(),
  ].filter((value): value is string => !!value?.trim());

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.headerPressable}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="sparkles" size={14} color={theme.primary} />
          </View>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>{t('draftDetail.opportunityBriefTitle')}</Text>
          {detail.budgetDisplay ? (
            <View style={[styles.budgetBadge, { borderColor: theme.primary + '50', backgroundColor: theme.primary + '10' }]}>
              <Text style={[styles.budgetText, { color: theme.primary }]}>{detail.budgetDisplay}</Text>
            </View>
          ) : null}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.mutedForeground} />
        </View>
      </Pressable>

      <View style={styles.badgeRow}>
        <Badge tone="neutral" label={inboxCategoryLabel[detail.category]} />
        <Badge tone="mint" label={inboxLeadStageLabel[detail.leadStage]} />
      </View>

      {summary ? (
        <Text style={[styles.summary, { color: theme.foregroundSubtitle }]} numberOfLines={expanded ? undefined : 3}>
          {summary}
        </Text>
      ) : detail.extractionStatus === 'PENDING' ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
            {t('inboxThreadDetail.aiBriefExtracting')}
          </Text>
        </View>
      ) : (
        <Text style={[styles.pendingText, { color: theme.mutedForeground }]}>
          {t('inboxThreadDetail.aiBriefPending')}
        </Text>
      )}

      {!expanded && keyHighlights.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {keyHighlights.slice(0, 2).map((item) => (
            <Text key={item} style={[styles.fieldValue, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
              · {item}
            </Text>
          ))}
        </View>
      ) : null}

      {!expanded ? (
        <Text style={[styles.expandHint, { color: theme.mutedForeground }]}>{t('draftDetail.opportunityBriefExpand')}</Text>
      ) : (
        <>
          <BriefListSection title={t('inboxThreadDetail.deliverablesTitle')} items={deliverables} />
          <BriefListSection title={t('inboxThreadDetail.usageRightsTitle')} items={detail.usageRights ?? []} />

          {detail.postingSchedule?.trim() ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.fieldLabel, { color: theme.foregroundEyebrow }]}>
                {t('inboxThreadDetail.postingScheduleTitle')}
              </Text>
              <Text style={[styles.fieldValue, { color: theme.foregroundSubtitle }]}>
                · {detail.postingSchedule.trim()}
              </Text>
            </View>
          ) : null}

          {signals.length > 0 ? (
            <BriefListSection title={t('inboxThreadDetail.signalsTitle')} items={signals} />
          ) : null}

          {missingFields.length > 0 ? (
            <Text style={[styles.missingHint, { color: theme.mutedForeground }]}>
              {t('inboxThreadDetail.missingFieldsHint', {
                fields: missingFields.map((field) => translateMissingField(t, field)).join(', '),
              })}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerPressable: { alignSelf: 'stretch' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  iconBox: { width: 26, height: 26, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  eyebrow: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  budgetBadge: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  budgetText: { fontSize: fontSize.caption, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summary: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pendingText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  fieldLabel: { fontSize: fontSize.eyebrow, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  fieldValue: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  missingHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  expandHint: { fontSize: fontSize.caption, fontWeight: '600' },
});
