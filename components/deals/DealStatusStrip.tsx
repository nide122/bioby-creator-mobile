import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { localizeFulfillmentStatusBlock } from '@/src/lib/deal-fulfillment-status';
import type { DealFulfillmentStatusBlock, DealFulfillmentStatusView } from '@/src/types/deal-workflow';

type Props = {
  dealId: string;
  status: DealFulfillmentStatusView;
  compact?: boolean;
  onNavigate?: (href: string) => void;
};

function blockTone(phase: DealFulfillmentStatusBlock['phase']) {
  switch (phase) {
    case 'done':
      return { icon: 'checkmark-circle' as const, colorKey: 'primary' as const };
    case 'active':
      return { icon: 'ellipse' as const, colorKey: 'warning' as const };
    case 'blocked':
      return { icon: 'alert-circle' as const, colorKey: 'danger' as const };
    default:
      return { icon: 'time-outline' as const, colorKey: 'muted' as const };
  }
}

function hrefForBlock(dealId: string, blockId: string) {
  switch (blockId) {
    case 'payment':
      return '/payments';
    case 'revision':
      return `/deal/${dealId}/delivery`;
    case 'brandReview':
      return `/deal/${dealId}/verification`;
    default:
      return `/deal/${dealId}`;
  }
}

/** Minimum width per block before switching to a horizontal strip. */
const BLOCK_MIN_WIDTH = 168;

function shouldStackBlocks(containerWidth: number, compact?: boolean) {
  if (compact) return true;
  if (containerWidth <= 0) return true;
  const horizontalGap = spacing.sm * 2;
  return containerWidth < BLOCK_MIN_WIDTH * 3 + horizontalGap;
}

export function DealStatusStrip({ dealId, status, compact, onNavigate }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const blocks = [status.payment, status.revision, status.brandReview];
  const [containerWidth, setContainerWidth] = useState(0);
  const stacked = shouldStackBlocks(containerWidth, compact);

  return (
    <View
      style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        setContainerWidth((current) => (current === nextWidth ? current : nextWidth));
      }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t('dealStatusStrip.title')}</Text>
      <View style={[styles.row, stacked && styles.rowStacked]}>
        {blocks.map((block) => {
          const copy = localizeFulfillmentStatusBlock(block, t);
          const tone = blockTone(block.phase);
          const accent =
            tone.colorKey === 'primary'
              ? theme.primary
              : tone.colorKey === 'warning'
                ? theme.foregroundEyebrow
                : tone.colorKey === 'danger'
                  ? '#EF4444'
                  : theme.mutedForeground;
          return (
            <Pressable
              key={block.id}
              accessibilityRole="button"
              onPress={() => {
                const href = hrefForBlock(dealId, block.id);
                if (onNavigate) {
                  onNavigate(href);
                } else {
                  router.push(href as never);
                }
              }}
              style={({ pressed }) => [
                styles.block,
                stacked && styles.blockStacked,
                { borderColor: theme.border, backgroundColor: theme.secondary },
                pressed && { opacity: 0.9 },
              ]}>
              <View style={styles.blockTop}>
                <Ionicons name={tone.icon} size={14} color={accent} />
                <Text style={[styles.blockTitle, { color: theme.foreground }]} numberOfLines={1}>
                  {copy.title}
                </Text>
              </View>
              <Text style={[styles.status, { color: accent }]} numberOfLines={2}>
                {copy.status}
              </Text>
              <Text style={[styles.next, { color: theme.mutedForeground }]} numberOfLines={2}>
                {copy.nextStep}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rowStacked: { flexDirection: 'column' },
  block: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: BLOCK_MIN_WIDTH,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
    minWidth: 0,
  },
  blockStacked: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
  },
  blockTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  blockTitle: { flex: 1, fontSize: fontSize.eyebrow, fontWeight: '700' },
  status: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  next: { fontSize: fontSize.eyebrow, lineHeight: lineHeight.body },
});
