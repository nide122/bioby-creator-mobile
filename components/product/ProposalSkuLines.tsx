import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  buildProposalSkuDisplay,
  isProposalAddonLine,
} from '@/src/lib/proposal-sku-display';
import type { ProposalSkuLine } from '@/src/types/domain';

type Props = {
  lines: ProposalSkuLine[];
};

export function ProposalSkuLines({ lines }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (lines.length === 0) {
    return null;
  }

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
      {lines.map((line, index) => {
        const display = buildProposalSkuDisplay(line);
        const platformLabel = resolvePlatformLabel(line.platform, t);
        const isLast = index === lines.length - 1;

        return (
          <View
            key={line.id}
            style={[
              styles.row,
              !isLast && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}>
            <View style={styles.rowMain}>
              <View style={styles.header}>
                <View
                  style={[
                    styles.platformPill,
                    display.isAddon
                      ? { backgroundColor: theme.secondary, borderColor: theme.border }
                      : { backgroundColor: theme.accentMintSoft, borderColor: theme.accentMintStrong + '44' },
                  ]}>
                  <Text
                    style={[
                      styles.platformPillText,
                      { color: display.isAddon ? theme.mutedForeground : theme.accentMintStrong },
                    ]}>
                    {platformLabel}
                  </Text>
                </View>
                <Text
                  style={[styles.price, { color: theme.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}>
                  {formatPriceLabel(line.priceLabel, t)}
                </Text>
              </View>

              <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={2}>
                {display.title}
              </Text>

              {display.chips.length > 0 ? (
                <View style={styles.chipRow}>
                  {display.chips.map((chip) => (
                    <View
                      key={`${line.id}-${chip}`}
                      style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.background }]}>
                      <Text style={[styles.chipText, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
                        {chip}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {display.footnote ? (
                <View style={styles.footnoteRow}>
                  <Ionicons name="time-outline" size={13} color={theme.mutedForeground} />
                  <Text style={[styles.footnote, { color: theme.mutedForeground }]} numberOfLines={2}>
                    {display.footnote}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function resolvePlatformLabel(platform: string, t: (key: string) => string): string {
  if (isProposalAddonLine(platform)) {
    return t('proposalDetailScreen.skuPlatformAddon');
  }
  const normalized = platform.trim().toLowerCase();
  if (normalized === 'package' || normalized === '套餐') {
    return t('proposalDetailScreen.skuPlatformPackage');
  }
  return platform.trim() || t('proposalDetailScreen.skuPlatformPackage');
}

function formatPriceLabel(priceLabel: string, t: (key: string) => string): string {
  const trimmed = priceLabel.trim();
  if (!trimmed) return t('proposalDetailScreen.skuQuotedSeparately');
  const normalized = trimmed.toLowerCase();
  if (normalized === 'quoted separately') {
    return t('proposalDetailScreen.skuQuotedSeparately');
  }
  return trimmed;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowMain: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  platformPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  platformPillText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  price: {
    flexShrink: 0,
    fontSize: fontSize.body,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    maxWidth: '52%',
    textAlign: 'right',
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: fontSize.caption,
    lineHeight: 14,
    fontWeight: '500',
  },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: 2,
  },
  footnote: {
    flex: 1,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
});
