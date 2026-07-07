import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import DraggableFlatList, {
  ScaleDecorator,
  ShadowDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

import { Badge } from '@/components/product';
import { WebPackageDragGhostShell, WebPackageDragPlaceholder } from '@/components/pricing/WebPackageDragGhost';
import { hubStyles } from '@/components/product/HubScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import type { RateCardPackage } from '@/src/types/domain';
import { alertAction } from '@/src/lib/app-dialog';
import {
  hasSamePackageOrder,
} from '@/src/lib/rate-card-package-reorder';
import {
  deliverableRowLabel,
  parseDeliverables,
  parseRevisionRounds,
  revisionRowLabel,
} from '@/src/lib/rate-card-package-form';
import { useUpsertRateCardPackages } from '@/src/hooks/use-growth';
import { useOpenProposal } from '@/src/hooks/use-open-proposal';
import { useWebLongPressPackageReorder } from '@/src/hooks/use-web-long-press-reorder';

type Props = {
  packages: RateCardPackage[];
  /** When set with 2+ packages, the list becomes the page scroll root (avoids nested ScrollView + web findNodeHandle). */
  scrollRoot?: {
    eyebrow?: string;
    title?: string;
    lead?: string;
    footer?: ReactNode;
  };
};

function joinParts(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(' · ');
}

function readWebPointerEvent(event: {
  nativeEvent: unknown;
  clientX?: number;
  clientY?: number;
}): { clientX: number; clientY: number; target: EventTarget | null } {
  const native = event.nativeEvent as {
    clientX?: number;
    clientY?: number;
    pageX?: number;
    pageY?: number;
    target?: EventTarget | null;
  };
  return {
    clientX: event.clientX ?? native.clientX ?? native.pageX ?? 0,
    clientY: event.clientY ?? native.clientY ?? native.pageY ?? 0,
    target: native.target ?? null,
  };
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

function DefaultPackageBadge({
  label,
  theme,
}: {
  label: string;
  theme: ThemePalette;
}) {
  return (
    <View
      style={[styles.defaultBadge, { backgroundColor: theme.accentMintSoft }]}
      accessibilityLabel={label}>
      <Ionicons name="star" size={12} color={theme.accentMintStrong} />
      <Text style={[styles.defaultBadgeLabel, { color: theme.accentMintStrong }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function DefaultPackageHint({
  packages,
  theme,
}: {
  packages: RateCardPackage[];
  theme: ThemePalette;
}) {
  const { t } = useTranslation();
  const defaultPackage = packages.find((pkg) => pkg.recommended === true);

  return (
    <View style={[styles.defaultHint, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Ionicons
        name={defaultPackage ? 'star' : 'star-outline'}
        size={16}
        color={defaultPackage ? theme.accentMintStrong : theme.mutedForeground}
      />
      <Text style={[styles.defaultHintText, { color: theme.mutedForeground }]}>
        {defaultPackage
          ? t('pricingScreen.defaultPackageHintNamed', { name: defaultPackage.name.trim() || t('pricingEditScreen.titleEdit') })
          : t('pricingScreen.defaultPackageHintNone')}
      </Text>
    </View>
  );
}

function PackageDragHandle({
  packageId,
  packageName,
  theme,
}: {
  packageId: string;
  packageName: string;
  theme: ThemePalette;
}) {
  const { t } = useTranslation();
  const label = t('pricingScreen.dragHandleA11y', { name: packageName });

  return (
    <View
      testID={`pricing-package-drag-handle-${packageId}`}
      accessibilityLabel={label}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.dragHandle, Platform.OS === 'web' && styles.dragHandleWeb, { backgroundColor: theme.secondary }]}>
      <Ionicons name="reorder-three-outline" size={18} color={theme.mutedForeground} />
    </View>
  );
}

function RateCardPackageCard({
  pkg,
  expanded,
  onToggle,
  onOpenProposal,
  openingProposal,
  reorderEnabled,
  onNativeDrag,
  onWebPointerDown,
  suppressWebPress,
  isDragging,
  ghostPreview,
}: {
  pkg: RateCardPackage;
  expanded: boolean;
  onToggle: () => void;
  onOpenProposal?: (packageId: string) => void;
  openingProposal?: boolean;
  reorderEnabled?: boolean;
  onNativeDrag?: () => void;
  onWebPointerDown?: (id: string, clientX: number, clientY: number, target?: EventTarget | null) => void;
  suppressWebPress?: boolean;
  isDragging?: boolean;
  ghostPreview?: boolean;
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

  const collapsedBody = (
    <>
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
            {recommended ? (
              <Ionicons
                name="star"
                size={16}
                color={theme.accentMintStrong}
                accessibilityLabel={t('pricingScreen.badgeDefaultShort')}
              />
            ) : null}
            <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={2}>
              {pkg.name}
            </Text>
            {recommended ? <DefaultPackageBadge label={t('pricingScreen.badgeDefaultShort')} theme={theme} /> : null}
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

      {(!expanded || ghostPreview) && previewChips.length > 0 ? (
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

      {(!expanded || ghostPreview) && metaLine ? (
        <Text style={[styles.metaLine, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
          {metaLine}
        </Text>
      ) : null}
    </>
  );

  if (ghostPreview) {
    return (
      <View
        style={[
          styles.packageCard,
          {
            borderColor: recommended ? theme.accentMintStrong + '66' : theme.border,
            backgroundColor: recommended ? theme.accentMintSoft + '55' : theme.card,
          },
          recommended && styles.packageCardRecommended,
          styles.packageCardDragging,
        ]}>
        {recommended ? <View style={[styles.recommendedAccent, { backgroundColor: theme.accentMintStrong }]} /> : null}
        <View style={styles.ghostPreviewBody}>{collapsedBody}</View>
      </View>
    );
  }

  return (
    <View
      dataSet={{ packageId: pkg.id, packageCard: pkg.id }}
      onPointerDown={
        Platform.OS === 'web' && reorderEnabled && onWebPointerDown
          ? (event) => {
              const { clientX, clientY, target } = readWebPointerEvent(event);
              onWebPointerDown(pkg.id, clientX, clientY, target);
            }
          : undefined
      }
      style={[
        styles.packageCard,
        {
          borderColor: recommended ? theme.accentMintStrong + '66' : theme.border,
          backgroundColor: recommended ? theme.accentMintSoft + '55' : theme.card,
        },
        recommended && styles.packageCardRecommended,
        isDragging && styles.packageCardDragging,
        Platform.OS === 'web' && reorderEnabled && styles.packageCardWebDraggable,
      ]}>
      {recommended ? <View style={[styles.recommendedAccent, { backgroundColor: theme.accentMintStrong }]} /> : null}

      {reorderEnabled ? (
        <PackageDragHandle packageId={pkg.id} packageName={pkg.name} theme={theme} />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('pricingEditScreen.collapsePackageA11y', { name: pkg.name })
            : t('pricingEditScreen.expandPackageA11y', { name: pkg.name })
        }
        onPress={() => {
          if (suppressWebPress) return;
          onToggle();
        }}
        onPointerDown={
          Platform.OS === 'web' && reorderEnabled && onWebPointerDown
            ? (event) => {
                const { clientX, clientY, target } = readWebPointerEvent(event);
                onWebPointerDown(pkg.id, clientX, clientY, target);
              }
            : undefined
        }
        onLongPress={reorderEnabled && onNativeDrag ? onNativeDrag : undefined}
        delayLongPress={200}
        android_ripple={{ color: `${theme.primary}18`, borderless: false }}
        style={({ pressed }) => [pressed && !suppressWebPress && styles.rowPressed]}>
        {collapsedBody}

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
              <DefaultPackageBadge label={t('pricingScreen.badgeRecommendedForProposal')} theme={theme} />
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
              disabled={openingProposal}
              onPress={() => onOpenProposal?.(pkg.id)}
              style={[
                pkg.recommended ? styles.primary : styles.secondary,
                pkg.recommended
                  ? { backgroundColor: theme.primary }
                  : { borderColor: theme.border, backgroundColor: theme.background },
                openingProposal && { opacity: 0.7 },
              ]}>
              {openingProposal ? (
                <ActivityIndicator color={pkg.recommended ? theme.primaryForeground : theme.primary} />
              ) : (
                <Text
                  style={[
                    pkg.recommended ? styles.primaryLabel : styles.secondaryLabel,
                    { color: pkg.recommended ? theme.primaryForeground : theme.foreground },
                  ]}>
                  {pkg.recommended ? t('pricingScreen.ctaUseForProposal') : t('pricingScreen.ctaPreviewProposal')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PricingSectionToolbar({ theme }: { theme: ThemePalette }) {
  const { t } = useTranslation();
  const router = useRouter();

  const showWhyRules = () => {
    void alertAction(t('pricingScreen.whyRulesTitle'), t('pricingScreen.whyRulesBody'));
  };

  return (
    <View style={styles.toolbar}>
      <Pressable
        testID="pricing-add-package"
        accessibilityRole="button"
        onPress={() => router.push('/pricing-edit?new=1' as Href)}
        style={({ pressed }) => [
          styles.addPill,
          { borderColor: theme.primary + '55', backgroundColor: theme.primary + '12' },
          pressed && { opacity: 0.82 },
        ]}>
        <Ionicons name="add" size={15} color={theme.primary} />
        <Text style={[styles.addPillLabel, { color: theme.primary }]}>{t('pricingScreen.ctaAddPackage')}</Text>
      </Pressable>
      <Pressable
        testID="pricing-why-rules-info"
        accessibilityRole="button"
        accessibilityLabel={t('pricingScreen.whyRulesInfoA11y')}
        onPress={showWhyRules}
        hitSlop={6}
        style={({ pressed }) => [
          styles.infoDot,
          { borderColor: theme.border, backgroundColor: theme.secondary },
          pressed && { opacity: 0.82 },
        ]}>
        <Text style={[styles.infoMark, { color: theme.mutedForeground }]}>!</Text>
      </Pressable>
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

export function RateCardPackageList({ packages, scrollRoot }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const saveMutation = useUpsertRateCardPackages();
  const { openProposal, openingProposal } = useOpenProposal();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [orderedPackages, setOrderedPackages] = useState<RateCardPackage[]>(packages);
  const reorderEnabled = packages.length > 1;
  const useNativeDraggableList = reorderEnabled && scrollRoot && Platform.OS !== 'web';

  useEffect(() => {
    setOrderedPackages(packages);
  }, [packages]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showReorderError = useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : t('pricingScreen.reorderFailedBody');
      void alertAction(t('pricingScreen.reorderFailedTitle'), message);
    },
    [t],
  );

  const persistReorder = useCallback(
    (next: RateCardPackage[]) => {
      const previous = orderedPackages;
      if (hasSamePackageOrder(previous, next)) return;

      setOrderedPackages(next);
      saveMutation.mutate(next, {
        onError: (error) => {
          setOrderedPackages(previous);
          showReorderError(error);
        },
      });
    },
    [orderedPackages, saveMutation, showReorderError],
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: RateCardPackage[] }) => {
      persistReorder(data);
    },
    [persistReorder],
  );

  const webReorder = useWebLongPressPackageReorder(orderedPackages, persistReorder);
  const webDraggingPackage = webReorder.draggingId
    ? orderedPackages.find((pkg) => pkg.id === webReorder.draggingId)
    : undefined;

  const handleOpenProposal = useCallback(
    (packageId: string) => {
      void openProposal({ packageId });
    },
    [openProposal],
  );

  const renderPackageCard = useCallback(
    (pkg: RateCardPackage, onNativeDrag?: () => void, isDragging?: boolean) => (
      <RateCardPackageCard
        pkg={pkg}
        expanded={expandedIds.has(pkg.id)}
        onToggle={() => toggle(pkg.id)}
        onOpenProposal={handleOpenProposal}
        openingProposal={openingProposal}
        reorderEnabled={reorderEnabled}
        onNativeDrag={onNativeDrag}
        onWebPointerDown={Platform.OS === 'web' ? webReorder.onCardPointerDown : undefined}
        suppressWebPress={Platform.OS === 'web' ? webReorder.suppressCardPress : false}
        isDragging={isDragging}
      />
    ),
    [expandedIds, handleOpenProposal, openingProposal, reorderEnabled, toggle, webReorder.onCardPointerDown, webReorder.suppressCardPress],
  );

  const renderWebReorderRow = useCallback(
    (pkg: RateCardPackage) => {
      const isSource = webReorder.draggingId === pkg.id;
      const isDropTarget =
        webReorder.isDragging && webReorder.dragOverId === pkg.id && webReorder.draggingId !== pkg.id;

      return (
        <View
          key={pkg.id}
          dataSet={{ packageId: pkg.id }}
          style={[
            styles.webReorderRow,
            isDropTarget && [styles.packageDropTarget, { outlineColor: theme.primary + '99' }],
          ]}>
          {isSource ? (
            <WebPackageDragPlaceholder height={webReorder.ghostSize.height} theme={theme} />
          ) : (
            renderPackageCard(pkg)
          )}
        </View>
      );
    },
    [renderPackageCard, theme, webReorder.dragOverId, webReorder.draggingId, webReorder.ghostSize.height, webReorder.isDragging],
  );

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<RateCardPackage>) => (
      <ScaleDecorator activeScale={1.03}>
        <ShadowDecorator elevation={14} radius={10} opacity={0.2}>
          {renderPackageCard(item, drag, isActive)}
        </ShadowDecorator>
      </ScaleDecorator>
    ),
    [renderPackageCard],
  );

  const sectionHeader = (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderMain}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>{t('pricingScreen.packagesTitle')}</Text>
        {packages.length > 0 ? (
          <Badge tone="neutral" label={t('pricingScreen.packagesCount', { count: packages.length })} />
        ) : null}
        {saveMutation.isPending ? (
          <ActivityIndicator
            accessibilityLabel={t('pricingScreen.reorderSavingA11y')}
            size="small"
            color={theme.primary}
          />
        ) : null}
      </View>
      <PricingSectionToolbar theme={theme} />
    </View>
  );

  const listHeader = scrollRoot ? (
    <View style={styles.scrollRootHeader}>
      <View style={hubStyles.header}>
        {scrollRoot.eyebrow ? (
          <Text style={[hubStyles.eyebrow, { color: theme.foregroundEyebrow }]}>{scrollRoot.eyebrow}</Text>
        ) : null}
        {scrollRoot.title ? (
          <Text style={[hubStyles.title, { color: theme.foreground }]}>{scrollRoot.title}</Text>
        ) : null}
        {scrollRoot.lead ? (
          <Text style={[hubStyles.lead, { color: theme.mutedForeground }]}>{scrollRoot.lead}</Text>
        ) : null}
      </View>
      <View style={styles.section}>
        {sectionHeader}
        <DefaultPackageHint packages={orderedPackages} theme={theme} />
      </View>
    </View>
  ) : null;

  if (useNativeDraggableList) {
    return (
      <DraggableFlatList
        testID="pricing-package-list"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={hubStyles.scroll}
        data={orderedPackages}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        dragItemOverflow
        enableLayoutAnimationExperimental
        ItemSeparatorComponent={PackageListSeparator}
        renderItem={renderDraggableItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          scrollRoot?.footer ? <View style={styles.scrollRootFooter}>{scrollRoot.footer}</View> : undefined
        }
      />
    );
  }

  return (
    <>
      <View testID="pricing-package-list" style={styles.section}>
        {sectionHeader}

        {packages.length === 0 ? (
          <EmptyPackagesCard theme={theme} />
        ) : (
          <>
            <DefaultPackageHint packages={orderedPackages} theme={theme} />
            <View style={styles.cardStack}>
              {reorderEnabled && Platform.OS === 'web'
                ? orderedPackages.map((pkg) => renderWebReorderRow(pkg))
                : orderedPackages.map((pkg) => renderPackageCard(pkg))}
            </View>
          </>
        )}
      </View>

      {webDraggingPackage && webReorder.ghostActive ? (
        <WebPackageDragGhostShell
          active={webReorder.ghostActive}
          grabOffset={webReorder.grabOffset}
          ghostSize={webReorder.ghostSize}
          seedPointer={webReorder.ghostSeedPointer}>
          <RateCardPackageCard
            pkg={webDraggingPackage}
            expanded={false}
            ghostPreview
            onToggle={() => {}}
          />
        </WebPackageDragGhostShell>
      ) : null}
    </>
  );
}

function PackageListSeparator() {
  return <View style={styles.listSeparator} />;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  scrollRootHeader: { gap: layout.tabScreenSectionGap, marginBottom: spacing.sm },
  scrollRootFooter: { marginTop: layout.tabScreenSectionGap },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    letterSpacing: -0.15,
    flexShrink: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  addPillLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    lineHeight: 16,
  },
  infoDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoMark: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
    marginTop: -0.5,
  },
  cardStack: { gap: spacing.md },
  webReorderRow: Platform.select<ViewStyle>({
    web: {
      transitionProperty: 'opacity',
      transitionDuration: '150ms',
      transitionTimingFunction: 'ease-out',
    },
    default: {},
  }),
  packageDropTarget: {
    borderRadius: radii.lg,
    outlineWidth: 2,
    outlineStyle: 'solid',
  },
  ghostPreviewBody: {
    paddingBottom: spacing.lg,
  },
  listSeparator: { height: spacing.md },
  dragHandle: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleWeb: Platform.select<ViewStyle>({
    web: { cursor: 'grab' } as ViewStyle,
    default: {},
  }),
  packageCardWebDraggable: Platform.select<ViewStyle>({
    web: { cursor: 'grab', userSelect: 'none', touchAction: 'none' } as ViewStyle,
    default: {},
  }),
  packageCardDragging: {
    opacity: 0.96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  defaultHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  defaultHintText: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: '100%',
  },
  defaultBadgeLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    lineHeight: 16,
  },
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
