import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { elevation, fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { DealEconomicsView, PriorityAssessmentView } from '@/src/lib/priority-assessment';
import { buildPlainPriorityExplain } from '@/src/lib/priority-breakdown';
import type { InboxPriority, LeadValueBand, PriorityBreakdown } from '@/src/types/domain';

type PriorityBreakdownSheetProps = {
  visible: boolean;
  onClose: () => void;
  inboxPriority?: InboxPriority;
  assessment?: PriorityAssessmentView | null;
  breakdown?: PriorityBreakdown | null;
  dealEconomics?: DealEconomicsView | null;
  leadValueBand?: LeadValueBand;
};

export function PriorityBreakdownSheet({
  visible,
  onClose,
  inboxPriority,
  assessment,
  breakdown,
  dealEconomics,
  leadValueBand,
}: PriorityBreakdownSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const explain = buildPlainPriorityExplain({
    t,
    inboxPriority,
    assessment,
    breakdown,
    dealEconomics,
    leadValueBand,
  });

  if (!explain) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="none" style={styles.backdropHit} onPress={onClose} />
        <View
          style={[
            styles.dialog,
            elevation.surface,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          <View style={styles.dialogHeader}>
            <View style={styles.titleBlock}>
              <Text style={[styles.dialogTitle, { color: theme.foreground }]}>
                {t('inboxPriority.explain.title')}
              </Text>
              <Text style={[styles.scoreCaption, { color: theme.mutedForeground }]}>
                {t('inboxPriority.explain.subtitle')}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={theme.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogBody}>
            <Text style={[styles.tierBadge, { color: theme.primary }]}>{explain.tierLabel}</Text>
            {explain.sections.map((section) => (
              <View
                key={section.title}
                style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                <Text style={[styles.sectionTitle, { color: theme.foregroundSubtitle }]}>{section.title}</Text>
                {section.lines.map((line, index) => (
                  <Text
                    key={`${section.title}-${index}`}
                    style={[styles.body, index > 0 && styles.bodySpaced, { color: theme.foreground }]}>
                    {line}
                  </Text>
                ))}
              </View>
            ))}
            {explain.footnote ? (
              <Text style={[styles.footnote, { color: theme.mutedForeground }]}>{explain.footnote}</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropHit: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    borderWidth: 1,
    borderRadius: radii.lg,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  dialogTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    lineHeight: lineHeight.subtitle,
  },
  scoreCaption: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
  },
  dialogBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  tierBadge: {
    fontSize: fontSize.body,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  sectionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
  },
  bodySpaced: {
    marginTop: spacing.xs,
  },
  footnote: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    marginTop: spacing.xs,
  },
});
