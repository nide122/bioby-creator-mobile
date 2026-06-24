import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { elevation, fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { ReplyTemplateBodyPreview } from '@/src/components/reply-templates/ReplyTemplateBodyPreview';
import {
  deliverableRowLabel,
  parseDeliverables,
  parseRevisionRounds,
  revisionRowLabel,
} from '@/src/lib/rate-card-package-form';
import type { RateCardPackage } from '@/src/types/domain';
import type { ReplyTemplate } from '@/src/types/reply-template';

export type ReplyDraftDetailState =
  | { kind: 'rateCard'; item: RateCardPackage }
  | { kind: 'template'; item: ReplyTemplate };

type ReplyDraftGeneratorDetailDialogProps = {
  visible: boolean;
  detail: ReplyDraftDetailState | null;
  onClose: () => void;
};

export function ReplyDraftGeneratorDetailDialog({
  visible,
  detail,
  onClose,
}: ReplyDraftGeneratorDetailDialogProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (!detail) return null;

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
            <Text style={[styles.dialogTitle, { color: theme.foreground }]} numberOfLines={2}>
              {detail.item.name}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={theme.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogBody}>
            {detail.kind === 'rateCard' ? (
              <RateCardDetailBody pkg={detail.item} theme={theme} />
            ) : (
              <View style={[styles.templateBody, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                <ReplyTemplateBodyPreview body={detail.item.body} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RateCardDetailBody({ pkg, theme }: { pkg: RateCardPackage; theme: (typeof palette)['light'] }) {
  const { t } = useTranslation();
  const deliverableRows = parseDeliverables(pkg.deliverables, t);
  const revisionRows = parseRevisionRounds(pkg.revisionRounds, t);

  return (
    <View style={styles.rateCardBody}>
      {pkg.priceLabel ? (
        <Text style={[styles.price, { color: theme.primary }]}>{pkg.priceLabel}</Text>
      ) : null}
      {pkg.tagline.trim() ? (
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>{pkg.tagline.trim()}</Text>
      ) : null}

      {deliverableRows.length ? (
        <DetailSection title={t('pricingScreen.deliverablesSection')} theme={theme}>
          {deliverableRows.map((row, index) => {
            const label = deliverableRowLabel(row, t);
            if (!label) return null;
            return (
              <Text key={`${label}-${index}`} style={[styles.bullet, { color: theme.foreground }]}>
                · {row.quantity ? `${row.quantity} ` : ''}
                {label}
              </Text>
            );
          })}
        </DetailSection>
      ) : null}

      {revisionRows.length ? (
        <DetailSection title={t('pricingScreen.revisionsSection')} theme={theme}>
          {revisionRows.map((row, index) => {
            const label = revisionRowLabel(row, t);
            if (!label) return null;
            return (
              <Text key={`${label}-${index}`} style={[styles.bullet, { color: theme.foreground }]}>
                · {row.quantity ? `${row.quantity} ` : ''}
                {label}
              </Text>
            );
          })}
        </DetailSection>
      ) : null}

      {pkg.usageRights ? (
        <DetailSection title={t('pricingScreen.badgeRightsBoundary')} theme={theme}>
          <Text style={[styles.meta, { color: theme.foreground }]}>{pkg.usageRights}</Text>
        </DetailSection>
      ) : null}

      {pkg.addOnHint ? (
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>{pkg.addOnHint}</Text>
      ) : null}
      {pkg.prepayLabel ? (
        <Text style={[styles.meta, { color: theme.foregroundSubtitle }]}>{pkg.prepayLabel}</Text>
      ) : null}

      {pkg.highlights.filter((item) => item.trim()).length ? (
        <DetailSection title={t('replyDraftGenerator.peek.highlights')} theme={theme}>
          {pkg.highlights
            .filter((item) => item.trim())
            .map((item) => (
              <Text key={item} style={[styles.bullet, { color: theme.foreground }]}>
                · {item.trim()}
              </Text>
            ))}
        </DetailSection>
      ) : null}
    </View>
  );
}

function DetailSection({
  title,
  children,
  theme,
}: {
  title: string;
  children: ReactNode;
  theme: (typeof palette)['light'];
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.foregroundSubtitle }]}>{title}</Text>
      {children}
    </View>
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
    maxHeight: '78%',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dialogTitle: {
    flex: 1,
    fontSize: fontSize.cardTitle,
    lineHeight: lineHeight.lead,
    fontWeight: '600',
  },
  dialogBody: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  rateCardBody: {
    gap: spacing.sm,
  },
  price: {
    fontSize: fontSize.sectionTitle,
    fontWeight: '700',
  },
  meta: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bullet: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  templateBody: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
  },
});
