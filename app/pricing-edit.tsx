import { useEffect, useMemo, useState } from 'react';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  Badge,
  getTextInputProps,
  getTextInputStyle,
  HubScreen,
  QueryRetryCard,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useRateCardPackages, useUpsertRateCardPackages } from '@/src/hooks/use-growth';
import type { RateCardPackage } from '@/src/types/domain';

function createRateCardPackageId(): string {
  return `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyPackage(): RateCardPackage {
  return {
    id: createRateCardPackageId(),
    name: '',
    tagline: '',
    priceLabel: '',
    deliverables: [],
    revisionRounds: '',
    usageRights: '',
    prepayLabel: '',
    addOnHint: '',
    highlights: [],
  };
}

function deliverablesToText(values: string[]): string {
  return values.join('\n');
}

function textToDeliverables(value: string): string[] {
  return value
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizePackages(packages: RateCardPackage[]): RateCardPackage[] {
  return packages.map((pkg) => ({
    ...pkg,
    name: pkg.name.trim(),
    tagline: pkg.tagline.trim(),
    priceLabel: pkg.priceLabel.trim(),
    deliverables: pkg.deliverables.map((item) => item.trim()).filter(Boolean),
    revisionRounds: pkg.revisionRounds.trim(),
    usageRights: pkg.usageRights.trim(),
    prepayLabel: pkg.prepayLabel.trim(),
    addOnHint: pkg.addOnHint.trim(),
    highlights: pkg.highlights,
    recommended: pkg.recommended ? true : undefined,
  }));
}

export default function PricingEditScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const floatingBottom = useMemo(() => {
    if (Platform.OS === 'web') return spacing.md;
    const initialBottom = initialWindowMetrics?.insets.bottom ?? 0;
    const fromContext = Math.max(insets.bottom, initialBottom);
    const systemBarFallback = Platform.OS === 'ios' ? 34 : 24;
    return Math.max(fromContext, systemBarFallback) + spacing.sm;
  }, [insets.bottom]);
  const scrollBottomInset = layout.touchMin + spacing.md + floatingBottom;

  const rateCardQuery = useRateCardPackages();
  const saveMutation = useUpsertRateCardPackages();
  const [packages, setPackages] = useState<RateCardPackage[]>([]);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!rateCardQuery.data) return;
    setPackages(structuredClone(rateCardQuery.data));
  }, [rateCardQuery.data]);

  const canSave = useMemo(
    () =>
      packages.length > 0 &&
      packages.every((pkg) => pkg.name.trim().length > 0 && pkg.priceLabel.trim().length > 0),
    [packages]
  );

  const updatePackage = (index: number, patch: Partial<RateCardPackage>) => {
    setPackages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const setRecommended = (index: number, enabled: boolean) => {
    setPackages((prev) =>
      prev.map((pkg, pkgIndex) => {
        if (enabled) {
          return { ...pkg, recommended: pkgIndex === index ? true : undefined };
        }
        if (pkgIndex === index) {
          return { ...pkg, recommended: undefined };
        }
        return pkg;
      })
    );
  };

  const onSave = async () => {
    if (!canSave) return;
    try {
      await saveMutation.mutateAsync(normalizePackages(packages));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      // surfaced via saveMutation if needed
    }
  };

  if (rateCardQuery.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('pricingEditScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (rateCardQuery.error || !rateCardQuery.data) {
    return (
      <PlaceholderScreen
        title={t('pricingEditScreen.loadFailedTitle')}
        description={t('pricingEditScreen.retryDesc')}>
        <QueryRetryCard
          message={rateCardQuery.error?.message ?? t('pricingEditScreen.emptyFallback')}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['growth', 'rate-cards'] })}
        />
      </PlaceholderScreen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      enabled={Platform.OS === 'ios'}>
      <View style={styles.screen}>
        <HubScreen
          eyebrow={t('tabs.assets')}
          title={t('pricingEditScreen.title')}
          lead={t('pricingEditScreen.description')}
          scrollBottomInset={scrollBottomInset}>
          <View style={{ gap: spacing.md }}>
            {packages.map((pkg, index) => (
              <PackageEditCard
                key={pkg.id}
                index={index}
                pkg={pkg}
                expanded={expandedPackageId === pkg.id}
                canRemove={packages.length > 1}
                theme={theme}
                onToggle={() =>
                  setExpandedPackageId((current) => (current === pkg.id ? null : pkg.id))
                }
                onUpdate={(patch) => updatePackage(index, patch)}
                onSetRecommended={(enabled) => setRecommended(index, enabled)}
                onRemove={() => {
                  setPackages(packages.filter((_, rowIndex) => rowIndex !== index));
                  setExpandedPackageId((current) => (current === pkg.id ? null : current));
                }}
                t={t}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const nextPackage = createEmptyPackage();
              setPackages([...packages, nextPackage]);
              setExpandedPackageId(nextPackage.id);
            }}
            style={[styles.addButton, { borderColor: theme.border }]}>
            <Text style={[styles.addLabel, { color: theme.foreground }]}>{t('pricingEditScreen.addPackage')}</Text>
          </Pressable>
        </HubScreen>

        <View
          pointerEvents="box-none"
          style={[styles.floatingSave, { bottom: floatingBottom, paddingHorizontal: layout.tabScreenPaddingX }]}>
          <Pressable
            accessibilityRole="button"
            disabled={!canSave || saveMutation.isPending}
            onPress={onSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: canSave ? theme.primary : theme.secondary },
              pressed && canSave && { opacity: 0.9 },
            ]}>
            {saveMutation.isPending ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={[styles.saveLabel, { color: canSave ? theme.primaryForeground : theme.mutedForeground }]}>
                {savedFlash ? t('pricingEditScreen.saved') : t('pricingEditScreen.save')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label, theme }: { label: string; theme: (typeof palette)['light'] }) {
  return <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>{label}</Text>;
}

type PackageEditCardProps = {
  index: number;
  pkg: RateCardPackage;
  expanded: boolean;
  canRemove: boolean;
  theme: (typeof palette)['light'];
  onToggle: () => void;
  onUpdate: (patch: Partial<RateCardPackage>) => void;
  onSetRecommended: (enabled: boolean) => void;
  onRemove: () => void;
  t: ReturnType<typeof useTranslation>['t'];
};

function PackageEditCard({
  index,
  pkg,
  expanded,
  canRemove,
  theme,
  onToggle,
  onUpdate,
  onSetRecommended,
  onRemove,
  t,
}: PackageEditCardProps) {
  const title = pkg.name.trim() || t('pricingEditScreen.packageFallbackTitle', { index: index + 1 });
  const priceLabel = pkg.priceLabel.trim();
  const tagline = pkg.tagline.trim();
  const priceLine = [priceLabel, tagline].filter(Boolean).join(' · ');
  const headerSubtitle =
    expanded || !priceLine
      ? priceLabel || t('pricingEditScreen.packageFallbackSubtitle')
      : priceLine;

  return (
    <View
      style={[
        styles.packageCard,
        {
          backgroundColor: pkg.recommended ? theme.secondary : theme.card,
          borderColor: theme.border,
        },
      ]}>
      {pkg.recommended ? <View style={[styles.packageAccent, { backgroundColor: theme.primary }]} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('pricingEditScreen.collapsePackageA11y', { name: title })
            : t('pricingEditScreen.expandPackageA11y', { name: title })
        }
        onPress={onToggle}
        style={({ pressed }) => [styles.packageHeader, pressed && { opacity: 0.85 }]}>
        <View style={styles.packageHeaderText}>
          <Text style={[styles.packageTitle, { color: theme.foreground }]}>{title}</Text>
          <Text style={[styles.packageSubtitle, { color: theme.mutedForeground }]}>{headerSubtitle}</Text>
          {!expanded && pkg.recommended ? (
            <Badge tone="mint" label={t('pricingEditScreen.badgeRecommended')} />
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.foregroundEyebrow}
        />
      </Pressable>

      {!expanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('pricingEditScreen.expandPackageA11y', { name: title })}
          onPress={onToggle}
          style={({ pressed }) => [styles.collapsedPreview, pressed && { opacity: 0.85 }]}>
          <PackageCollapsedPreview pkg={pkg} theme={theme} t={t} />
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={styles.packageBody}>
          <FieldLabel theme={theme} label={t('pricingEditScreen.labelName')} />
          <TextInput
            value={pkg.name}
            onChangeText={(value) => onUpdate({ name: value })}
            placeholder={t('pricingEditScreen.placeholderName')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('pricingEditScreen.labelTagline')} />
          <TextInput
            value={pkg.tagline}
            onChangeText={(value) => onUpdate({ tagline: value })}
            placeholder={t('pricingEditScreen.placeholderTagline')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('pricingEditScreen.labelPrice')} />
          <TextInput
            value={pkg.priceLabel}
            onChangeText={(value) => onUpdate({ priceLabel: value })}
            placeholder={t('pricingEditScreen.placeholderPrice')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('pricingEditScreen.labelDeliverables')} />
          <TextInput
            value={deliverablesToText(pkg.deliverables)}
            onChangeText={(value) => onUpdate({ deliverables: textToDeliverables(value) })}
            placeholder={t('pricingEditScreen.placeholderDeliverables')}
            multiline
            {...getTextInputProps(theme)}
            style={[getTextInputStyle(theme), styles.multiline]}
          />
          <FieldLabel theme={theme} label={t('pricingEditScreen.labelRevisionRounds')} />
          <TextInput
            value={pkg.revisionRounds}
            onChangeText={(value) => onUpdate({ revisionRounds: value })}
            placeholder={t('pricingEditScreen.placeholderRevisionRounds')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('pricingEditScreen.labelUsageRights')} />
          <TextInput
            value={pkg.usageRights}
            onChangeText={(value) => onUpdate({ usageRights: value })}
            placeholder={t('pricingEditScreen.placeholderUsageRights')}
            multiline
            {...getTextInputProps(theme)}
            style={[getTextInputStyle(theme), styles.multiline]}
          />
          <FieldLabel theme={theme} label={t('pricingEditScreen.labelPrepay')} />
          <TextInput
            value={pkg.prepayLabel}
            onChangeText={(value) => onUpdate({ prepayLabel: value })}
            placeholder={t('pricingEditScreen.placeholderPrepay')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('pricingEditScreen.labelAddOnHint')} />
          <TextInput
            value={pkg.addOnHint}
            onChangeText={(value) => onUpdate({ addOnHint: value })}
            placeholder={t('pricingEditScreen.placeholderAddOnHint')}
            multiline
            {...getTextInputProps(theme)}
            style={[getTextInputStyle(theme), styles.multiline]}
          />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[styles.toggleLabel, { color: theme.foreground }]}>
                {t('pricingEditScreen.labelRecommended')}
              </Text>
              <Text style={[styles.toggleHint, { color: theme.mutedForeground }]}>
                {t('pricingEditScreen.recommendedHint')}
              </Text>
            </View>
            <Switch
              value={pkg.recommended === true}
              onValueChange={onSetRecommended}
              trackColor={{ true: theme.primary }}
            />
          </View>
          {canRemove ? (
            <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeRow}>
              <Text style={{ color: theme.mutedForeground, fontSize: fontSize.caption }}>
                {t('pricingEditScreen.removePackage')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PackageCollapsedPreview({
  pkg,
  theme,
  t,
}: {
  pkg: RateCardPackage;
  theme: (typeof palette)['light'];
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const revisionRounds = pkg.revisionRounds.trim();
  const usageRights = pkg.usageRights.trim();
  const addOnHint = pkg.addOnHint.trim();
  const prepayLabel = pkg.prepayLabel.trim();
  const hasBoundary = usageRights.length > 0 || addOnHint.length > 0 || prepayLabel.length > 0;

  return (
    <View style={styles.collapsedContent}>
      {revisionRounds.length > 0 ? (
        <View style={styles.collapsedBadgeRow}>
          <Badge tone="neutral" label={revisionRounds} />
        </View>
      ) : null}

      {pkg.deliverables.length > 0 ? (
        <View style={styles.collapsedList}>
          {pkg.deliverables.map((item) => (
            <Text key={item} style={[styles.collapsedHint, { color: theme.foreground }]}>
              {item}
            </Text>
          ))}
        </View>
      ) : null}

      {hasBoundary ? (
        <View style={[styles.collapsedBoundary, { borderColor: theme.border, backgroundColor: theme.card }]}>
          {usageRights.length > 0 ? (
            <>
              <Badge tone="warning" label={t('pricingScreen.badgeRightsBoundary')} />
              <Text style={[styles.collapsedBoundaryTitle, { color: theme.foreground }]}>{usageRights}</Text>
            </>
          ) : null}
          {addOnHint.length > 0 ? (
            <Text style={[styles.collapsedHint, { color: theme.mutedForeground }]}>{addOnHint}</Text>
          ) : null}
          {prepayLabel.length > 0 ? (
            <Text style={[styles.collapsedHint, { color: theme.foregroundSubtitle }]}>{prepayLabel}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screen: { flex: 1 },
  packageCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  packageAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.65,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  packageHeaderText: { flex: 1, gap: spacing.xs },
  packageTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  packageSubtitle: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  packageBody: { gap: spacing.sm, marginTop: spacing.xs },
  collapsedPreview: { marginTop: -spacing.xs },
  collapsedContent: { gap: spacing.sm },
  collapsedBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  collapsedList: { gap: spacing.xs },
  collapsedHint: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  collapsedBoundary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  collapsedBoundaryTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.xs },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  toggleLabel: { fontSize: fontSize.body, fontWeight: '600' },
  toggleHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  removeRow: { alignSelf: 'flex-start', marginTop: spacing.sm },
  addButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  addLabel: { fontSize: fontSize.body, fontWeight: '700' },
  floatingSave: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  saveButton: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: { fontSize: fontSize.body, fontWeight: '700' },
});
