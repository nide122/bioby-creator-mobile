import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import type { RateCardPackage } from '@/src/types/domain';
import {
  deliverableRowLabel,
  parseDeliverables,
  parseRevisionRounds,
  revisionRowLabel,
} from '@/src/lib/rate-card-package-form';

type Props = {
  packages: RateCardPackage[];
};

function joinParts(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(' · ');
}

function packageCollapsedSummary(
  pkg: RateCardPackage,
  t: TFunction,
): { tagline: string; metaLine: string } {
  const tagline = pkg.tagline.trim();
  const deliverableCount = pkg.deliverables.filter((item) => item.trim().length > 0).length;
  const metaLine = joinParts([pkg.usageRights, pkg.addOnHint]);

  return {
    tagline: tagline || (deliverableCount > 0 ? t('pricingScreen.deliverablesCount', { count: deliverableCount }) : ''),
    metaLine,
  };
}

function QuantityChip({
  quantity,
  label,
  theme,
  compact,
}: {
  quantity: string;
  label: string;
  theme: ThemePalette;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.chip,
        compact && styles.chipCompact,
        { borderColor: theme.border, backgroundColor: theme.card },
      ]}>
      <View style={[styles.chipQty, compact && styles.chipQtyCompact, { backgroundColor: theme.primary + '14' }]}>
        <Text style={[styles.chipQtyText, compact && styles.chipQtyTextCompact, { color: theme.primary }]}>
          {quantity}
        </Text>
      </View>
      <Text
        style={[styles.chipLabel, compact && styles.chipLabelCompact, { color: theme.foreground }]}
        numberOfLines={1}>
        {label}
      </Text>
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
  theme: ThemePalette;
}) {
  return (
    <View style={styles.detailSection}>
      <Text style={[styles.detailSectionTitle, { color: theme.foregroundEyebrow }]}>{title}</Text>
      {children}
    </View>
  );
}

function RateCardPackageCard({
  pkg,
  expanded,
  onToggle,
}: {
  pkg: RateCardPackage;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { tagline, metaLine } = packageCollapsedSummary(pkg, t);
  const prepayLabel = pkg.prepayLabel.trim();
  const deliverableRows = parseDeliverables(pkg.deliverables, t);
  const revisionRows = parseRevisionRounds(pkg.revisionRounds, t);
  const previewChips = deliverableRows.slice(0, 3);
  const recommended = pkg.recommended === true;

  return (
    <View
      style={[
        styles.packageCard,
        {
          borderColor: recommended ? theme.accentMintStrong + '66' : theme.border,
          backgroundColor: recommended ? theme.accentMintSoft + '55' : theme.card,
        },
        recommended && styles.packageCardRecommended,
      ]}>
      {recommended ? <View style={[styles.recommendedAccent, { backgroundColor: theme.accentMintStrong }]} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('pricingEditScreen.collapsePackageA11y', { name: pkg.name })
            : t('pricingEditScreen.expandPackageA11y', { name: pkg.name })
        }
        onPress={onToggle}
        android_ripple={{ color: `${theme.primary}18`, borderless: false }}
        style={({ pressed }) => [pressed && styles.rowPressed]}>
        <View style={styles.cardHeader}>
          <View style={[styles.packageIcon, { backgroundColor: recommended ? theme.accentMintSoft : theme.secondary }]}>
            <Ionicons
              name="pricetag-outline"
              size={18}
              color={recommended ? theme.accentMintStrong : theme.primary}
            />
          </View>
          <View style={styles.cardHeaderCopy}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={2}>
                {pkg.name}
              </Text>
              {recommended ? <Badge tone="mint" label={t('pricingScreen.badgeRecommendedShort')} /> : null}
            </View>
            {tagline ? (
              <Text style={[styles.subtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
                {tagline}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text
            style={[
              styles.priceHero,
              { color: recommended ? theme.accentMintStrong : theme.foreground },
            ]}
            numberOfLines={1}>
            {pkg.priceLabel}
          </Text>
          {prepayLabel ? (
            <View style={[styles.prepayTag, { backgroundColor: '#2A1A09' }]}>
              <Text style={styles.prepayTagText} numberOfLines={1}>
                {prepayLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {!expanded && previewChips.length > 0 ? (
          <View style={styles.previewChipRow}>
            {previewChips.map((row, index) => {
              const label = deliverableRowLabel(row, t);
              if (!label) return null;
              return (
                <QuantityChip
                  key={`${label}-${index}`}
                  quantity={row.quantity}
                  label={label}
                  theme={theme}
                  compact
                />
              );
            })}
            {deliverableRows.length > previewChips.length ? (
              <Text style={[styles.moreChips, { color: theme.mutedForeground }]}>
                {t('pricingScreen.deliverablesMore', { count: deliverableRows.length - previewChips.length })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {!expanded && metaLine ? (
          <Text style={[styles.metaLine, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
            {metaLine}
          </Text>
        ) : null}

        <View style={styles.expandHintRow}>
          <Text style={[styles.expandHint, { color: theme.mutedForeground }]}>
            {expanded ? t('pricingScreen.collapsePackageHint') : t('pricingScreen.expandPackageHint')}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.foregroundEyebrow}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={[styles.detail, { borderTopColor: theme.border }]}>
          {recommended ? (
            <View style={styles.badges}>
              <Badge tone="mint" label={t('pricingScreen.badgeRecommendedForProposal')} />
            </View>
          ) : null}

          {deliverableRows.length > 0 ? (
            <DetailSection title={t('pricingScreen.deliverablesSection')} theme={theme}>
              <View style={styles.chipRow}>
                {deliverableRows.map((row, index) => {
                  const label = deliverableRowLabel(row, t);
                  if (!label) return null;
                  return (
                    <QuantityChip
                      key={`${label}-${index}`}
                      quantity={row.quantity}
                      label={label}
                      theme={theme}
                    />
                  );
                })}
              </View>
            </DetailSection>
          ) : null}

          {revisionRows.length > 0 ? (
            <DetailSection title={t('pricingScreen.revisionsSection')} theme={theme}>
              <View style={styles.chipRow}>
                {revisionRows.map((row, index) => {
                  const label = revisionRowLabel(row, t);
                  if (!label) return null;
                  return (
                    <QuantityChip
                      key={`${label}-${index}`}
                      quantity={row.quantity}
                      label={label}
                      theme={theme}
                    />
                  );
                })}
              </View>
            </DetailSection>
          ) : null}

          {(pkg.usageRights || pkg.addOnHint || pkg.prepayLabel) ? (
            <View style={[styles.boundaryBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Badge tone="warning" label={t('pricingScreen.badgeRightsBoundary')} />
              {pkg.usageRights ? (
                <Text style={[styles.boundaryTitle, { color: theme.foreground }]}>{pkg.usageRights}</Text>
              ) : null}
              {pkg.addOnHint ? (
                <Text style={[styles.boundaryHint, { color: theme.mutedForeground }]}>{pkg.addOnHint}</Text>
              ) : null}
              {pkg.prepayLabel ? (
                <Text style={[styles.boundaryHint, { color: theme.foregroundSubtitle }]}>{pkg.prepayLabel}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/pricing-edit?packageId=${encodeURIComponent(pkg.id)}` as Href)}
              style={[styles.secondary, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                {t('pricingScreen.ctaEditPackage')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/proposal/sample' as Href)}
              style={[
                pkg.recommended ? styles.primary : styles.secondary,
                pkg.recommended
                  ? { backgroundColor: theme.primary }
                  : { borderColor: theme.border, backgroundColor: theme.background },
              ]}>
              <Text
                style={[
                  pkg.recommended ? styles.primaryLabel : styles.secondaryLabel,
                  { color: pkg.recommended ? theme.primaryForeground : theme.foreground },
                ]}>
                {pkg.recommended ? t('pricingScreen.ctaUseForProposal') : t('pricingScreen.ctaPreviewProposal')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EmptyPackagesCard({ theme }: { theme: ThemePalette }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      testID="pricing-packages-empty"
      accessibilityRole="button"
      onPress={() => router.push('/pricing-edit?new=1' as Href)}
      style={({ pressed }) => [
        styles.emptyCard,
        { borderColor: theme.border, backgroundColor: theme.card },
        pressed && { opacity: 0.9 },
      ]}>
      <View style={[styles.packageIcon, { backgroundColor: theme.secondary }]}>
        <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
      </View>
      <View style={styles.emptyCopy}>
        <Text style={[styles.emptyTitle, { color: theme.foreground }]}>{t('pricingScreen.packagesEmptyTitle')}</Text>
        <Text style={[styles.emptyBody, { color: theme.mutedForeground }]}>{t('pricingScreen.packagesEmptyBody')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.foregroundEyebrow} />
    </Pressable>
  );
}

export function RateCardPackageList({ packages }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const sortedPackages = useMemo(() => {
    return [...packages].sort((a, b) => {
      if (a.recommended === b.recommended) return 0;
      return a.recommended ? -1 : 1;
    });
  }, [packages]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <View testID="pricing-package-list" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>{t('pricingScreen.packagesTitle')}</Text>
        {packages.length > 0 ? (
          <Badge tone="neutral" label={t('pricingScreen.packagesCount', { count: packages.length })} />
        ) : null}
      </View>

      {packages.length === 0 ? (
        <EmptyPackagesCard theme={theme} />
      ) : (
        <View style={styles.cardStack}>
          {sortedPackages.map((pkg) => (
            <RateCardPackageCard
              key={pkg.id}
              pkg={pkg}
              expanded={expandedIds.has(pkg.id)}
              onToggle={() => toggle(pkg.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  cardStack: { gap: spacing.md },
  packageCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  packageCardRecommended: {
    borderWidth: 1,
  },
  recommendedAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
  },
  rowPressed: { opacity: 0.88 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  packageIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardHeaderCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: fontSize.body, fontWeight: '800', lineHeight: lineHeight.body, flexShrink: 1 },
  subtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  priceHero: {
    fontSize: fontSize.sectionTitle,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 28,
    flex: 1,
  },
  prepayTag: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    maxWidth: '46%',
  },
  prepayTagText: {
    color: '#FACC15',
    fontSize: fontSize.caption,
    lineHeight: 16,
    fontWeight: '700',
  },
  previewChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  moreChips: { fontSize: fontSize.caption, fontWeight: '600' },
  metaLine: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  expandHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  expandHint: { fontSize: fontSize.caption, fontWeight: '600' },
  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  detailSection: { gap: spacing.sm },
  detailSectionTitle: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingRight: spacing.sm,
    paddingLeft: 3,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  chipCompact: {
    paddingRight: spacing.xs + 2,
    paddingVertical: 2,
  },
  chipQty: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  chipQtyCompact: {
    minWidth: 20,
    height: 20,
  },
  chipQtyText: { fontSize: fontSize.caption, fontWeight: '800', lineHeight: 16 },
  chipQtyTextCompact: { fontSize: fontSize.eyebrow, lineHeight: 14 },
  chipLabel: { fontSize: fontSize.caption, fontWeight: '600', lineHeight: 16, flexShrink: 1 },
  chipLabelCompact: { fontSize: fontSize.eyebrow, lineHeight: 14 },
  boundaryBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  boundaryTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  boundaryHint: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  actions: { gap: spacing.xs, marginTop: spacing.xs },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '700', fontSize: fontSize.bodySmall },
  secondary: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: layout.touchMin - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontWeight: '700', fontSize: fontSize.bodySmall },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touchMin + 8,
  },
  emptyCopy: { flex: 1, gap: spacing.xs },
  emptyTitle: { fontSize: fontSize.body, fontWeight: '700' },
  emptyBody: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
});
