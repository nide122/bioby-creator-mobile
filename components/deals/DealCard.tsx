import { useTranslation } from 'react-i18next';
import type { PressableProps } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/product';
import { BrandChip } from '@/components/brands/BrandChip';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { openBrandDetail } from '@/src/lib/open-brand-detail';
import { resolveOpportunityBrandLabel } from '@/src/lib/cooperation-display-name';
import { localizeDealSummaryCopy, resolveNextMilestone } from '@/src/lib/deal-copy-i18n';
import { resolveDealPaymentStatus } from '@/src/lib/deal-payment-status';
import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';

type Props = {
  deal: DealSummary;
  selected?: boolean;
  onPreviewPress?: () => void;
} & Pick<PressableProps, 'onPress'>;

function escrowTone(phase: EscrowLifecyclePhase): 'primary' | 'mint' | 'warning' | 'danger' | 'neutral' {
  switch (phase) {
    case 'settled':
      return 'primary';
    case 'escrowed':
      return 'mint';
    case 'remediation':
    case 'disputed':
      return 'danger';
    case 'pending_verification':
    case 'awaiting_prepay':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function DealCard({
  deal,
  selected,
  onPress,
  onPreviewPress,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const dealCopy = localizeDealSummaryCopy(deal, t);
  const nextStep =
    dealCopy.nextMilestone ??
    resolveNextMilestone(deal.nextMilestone, deal.escrowPhase, t) ??
    t('dealsScreen.panelProgressFallback');
  const paymentStatus = resolveDealPaymentStatus(deal, t);
  const brandLabel =
    deal.brandName ?? resolveOpportunityBrandLabel(deal.brandPlaceholder, deal.title) ?? null;
  const openBrand = () => {
    openBrandDetail(router, deal.brandId, '/deals');
  };

  return (
    <Pressable
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: pressed ? theme.secondary : theme.card,
          shadowColor: theme.foreground,
        },
        selected ? styles.selected : null,
      ]}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          {brandLabel ? (
            <BrandChip
              label={brandLabel}
              compact
              onPress={
                shouldUseBackendApi() && deal.brandId
                  ? openBrand
                  : undefined
              }
            />
          ) : null}
          <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={2}>
            {deal.title}
          </Text>
        </View>
        <Badge tone={escrowTone(deal.escrowPhase)} label={paymentStatus} />
      </View>

      {dealCopy.outcomeSummary ? (
        <Text style={[styles.summary, { color: theme.mutedForeground }]} numberOfLines={2}>
          {dealCopy.outcomeSummary}
        </Text>
      ) : null}

      <View style={[styles.nextStepRow, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
        <Text style={[styles.nextStepEyebrow, { color: theme.foregroundEyebrow }]}>{t('dealsScreen.nextStep')}</Text>
        <Text style={[styles.nextStepLabel, { color: theme.foreground }]} numberOfLines={2}>
          {nextStep}
        </Text>
      </View>

      <View style={styles.footer}>
        {onPreviewPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              onPreviewPress();
            }}
            style={({ pressed }) => [styles.previewButton, pressed && styles.previewButtonPressed]}>
            <Ionicons name="eye-outline" size={14} color={theme.primary} />
            <Text style={[styles.previewLabel, { color: theme.primary }]}>{t('dealsScreen.previewCta')}</Text>
          </Pressable>
        ) : null}
        <View style={styles.openHint}>
          <Text style={[styles.openHintLabel, { color: theme.mutedForeground }]}>{t('dealsScreen.openDealCta')}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  selected: {
    transform: [{ translateY: -1 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  summary: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  nextStepRow: {
    gap: spacing.xs / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nextStepEyebrow: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  nextStepLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    minHeight: layout.touchMin * 0.65,
    paddingHorizontal: spacing.sm,
  },
  previewButtonPressed: {
    opacity: 0.72,
  },
  previewLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  openHintLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
});
