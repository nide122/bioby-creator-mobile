import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, SettingsGroup } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { RateCardPackage } from '@/src/types/domain';

type Props = {
  packages: RateCardPackage[];
};

function deliverablesSummary(
  items: string[],
  moreLabel: (count: number) => string,
  max = 2,
): string {
  if (items.length === 0) return '';
  const visible = items.slice(0, max);
  const rest = items.length - visible.length;
  const base = visible.join(' · ');
  return rest > 0 ? `${base} · ${moreLabel(rest)}` : base;
}

function joinParts(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(' · ');
}

function packageCollapsedSummary(
  pkg: RateCardPackage,
  moreLabel: (count: number) => string,
): { offerLine: string; metaLine: string } {
  const tagline = pkg.tagline.trim();
  const deliverables = deliverablesSummary(pkg.deliverables, moreLabel);
  const offerLine =
    joinParts([tagline, deliverables]) ||
    pkg.revisionRounds.trim() ||
    joinParts(pkg.deliverables);

  const metaLine = joinParts([pkg.usageRights, pkg.addOnHint]);

  return { offerLine, metaLine };
}

function RateCardPackageRow({
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
  const { offerLine, metaLine } = packageCollapsedSummary(pkg, (count) =>
    t('pricingScreen.deliverablesMore', { count }),
  );
  const prepayLabel = pkg.prepayLabel.trim();

  return (
    <View>
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
        style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}>
        <View style={styles.row}>
          <View style={styles.rowBody}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={1}>
                {pkg.name}
              </Text>
              {prepayLabel ? (
                <View style={[styles.prepayTag, styles.titleBadge, { backgroundColor: '#2A1A09' }]}>
                  <Text style={styles.prepayTagText} numberOfLines={1}>
                    {prepayLabel}
                  </Text>
                </View>
              ) : null}
              {pkg.recommended ? (
                <Badge tone="mint" label={t('pricingScreen.badgeRecommendedShort')} />
              ) : null}
            </View>
            {offerLine ? (
              <Text style={[styles.subtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
                {offerLine}
              </Text>
            ) : null}
            {metaLine ? (
              <Text style={[styles.metaLine, { color: theme.foregroundSubtitle }]} numberOfLines={2}>
                {metaLine}
              </Text>
            ) : null}
          </View>
          <View style={styles.trailing}>
            <Text
              style={[styles.price, { color: pkg.recommended ? theme.primary : theme.foregroundEyebrow }]}
              numberOfLines={1}>
              {pkg.priceLabel}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.foregroundEyebrow}
            />
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={[styles.detail, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <View style={styles.badges}>
            {pkg.recommended ? (
              <Badge tone="mint" label={t('pricingScreen.badgeRecommendedForProposal')} />
            ) : null}
            {pkg.revisionRounds ? <Badge tone="neutral" label={pkg.revisionRounds} /> : null}
          </View>

          {pkg.deliverables.length > 0 ? (
            <View style={styles.deliverables}>
              {pkg.deliverables.map((item) => (
                <Text key={item} style={[styles.deliverable, { color: theme.foreground }]}>
                  {item}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={[styles.boundaryBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
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

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/pricing-edit?packageId=${encodeURIComponent(pkg.id)}` as Href)}
              style={[styles.secondary, { borderColor: theme.border }]}>
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
                  : { borderColor: theme.border },
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

export function RateCardPackageList({ packages }: Props) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (packages.length === 0) {
    return null;
  }

  return (
    <SettingsGroup title={t('pricingScreen.packagesTitle')} insetDividers={false}>
      {packages.map((pkg) => (
        <RateCardPackageRow
          key={pkg.id}
          pkg={pkg}
          expanded={expandedIds.has(pkg.id)}
          onToggle={() => toggle(pkg.id)}
        />
      ))}
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  rowPressable: {},
  rowPressed: { opacity: 0.72 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: layout.touchMin - 4,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: fontSize.body, fontWeight: '700', lineHeight: lineHeight.body, flexShrink: 0 },
  titleBadge: { flexShrink: 1, minWidth: 0, maxWidth: '52%' },
  prepayTag: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
  },
  prepayTagText: {
    color: '#FACC15',
    fontSize: fontSize.eyebrow,
    lineHeight: 16,
    fontWeight: '500',
  },
  subtitle: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  metaLine: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
    maxWidth: '42%',
    paddingTop: 2,
  },
  price: { fontSize: fontSize.caption, fontWeight: '700', textAlign: 'right' },
  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  deliverables: { gap: spacing.xs },
  deliverable: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
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
});
