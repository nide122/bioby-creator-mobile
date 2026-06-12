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
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  getTextInputProps,
  getTextInputStyle,
  HubScreen,
  QueryRetryCard,
  SectionCard,
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
              <SectionCard
                key={pkg.id}
                title={pkg.name.trim() || t('pricingEditScreen.packageFallbackTitle', { index: index + 1 })}
                subtitle={pkg.priceLabel.trim() || t('pricingEditScreen.packageFallbackSubtitle')}>
                <FieldLabel theme={theme} label={t('pricingEditScreen.labelName')} />
                <TextInput
                  value={pkg.name}
                  onChangeText={(value) => updatePackage(index, { name: value })}
                  placeholder={t('pricingEditScreen.placeholderName')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('pricingEditScreen.labelTagline')} />
                <TextInput
                  value={pkg.tagline}
                  onChangeText={(value) => updatePackage(index, { tagline: value })}
                  placeholder={t('pricingEditScreen.placeholderTagline')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('pricingEditScreen.labelPrice')} />
                <TextInput
                  value={pkg.priceLabel}
                  onChangeText={(value) => updatePackage(index, { priceLabel: value })}
                  placeholder={t('pricingEditScreen.placeholderPrice')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('pricingEditScreen.labelDeliverables')} />
                <TextInput
                  value={deliverablesToText(pkg.deliverables)}
                  onChangeText={(value) => updatePackage(index, { deliverables: textToDeliverables(value) })}
                  placeholder={t('pricingEditScreen.placeholderDeliverables')}
                  multiline
                  {...getTextInputProps(theme)}
                  style={[getTextInputStyle(theme), styles.multiline]}
                />
                <FieldLabel theme={theme} label={t('pricingEditScreen.labelRevisionRounds')} />
                <TextInput
                  value={pkg.revisionRounds}
                  onChangeText={(value) => updatePackage(index, { revisionRounds: value })}
                  placeholder={t('pricingEditScreen.placeholderRevisionRounds')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('pricingEditScreen.labelUsageRights')} />
                <TextInput
                  value={pkg.usageRights}
                  onChangeText={(value) => updatePackage(index, { usageRights: value })}
                  placeholder={t('pricingEditScreen.placeholderUsageRights')}
                  multiline
                  {...getTextInputProps(theme)}
                  style={[getTextInputStyle(theme), styles.multiline]}
                />
                <FieldLabel theme={theme} label={t('pricingEditScreen.labelPrepay')} />
                <TextInput
                  value={pkg.prepayLabel}
                  onChangeText={(value) => updatePackage(index, { prepayLabel: value })}
                  placeholder={t('pricingEditScreen.placeholderPrepay')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('pricingEditScreen.labelAddOnHint')} />
                <TextInput
                  value={pkg.addOnHint}
                  onChangeText={(value) => updatePackage(index, { addOnHint: value })}
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
                    onValueChange={(value) => setRecommended(index, value)}
                    trackColor={{ true: theme.primary }}
                  />
                </View>
                {packages.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPackages(packages.filter((_, rowIndex) => rowIndex !== index))}
                    style={styles.removeRow}>
                    <Text style={{ color: theme.mutedForeground, fontSize: fontSize.caption }}>
                      {t('pricingEditScreen.removePackage')}
                    </Text>
                  </Pressable>
                ) : null}
              </SectionCard>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setPackages([...packages, createEmptyPackage()])}
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

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screen: { flex: 1 },
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
