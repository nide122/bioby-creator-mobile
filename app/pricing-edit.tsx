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
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  getTextInputProps,
  getTextInputStyle,
  HubScreen,
  QueryRetryCard,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  isPackageFormValid,
  RateCardPackageStructuredFields,
} from '@/components/pricing/RateCardPackageFields';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';
import { useRateCardPackages, rateCardPackagesQueryKey, useUpsertRateCardPackages } from '@/src/hooks/use-growth';
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

function normalizePackage(pkg: RateCardPackage): RateCardPackage {
  return {
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
  };
}

function mergePackagesForSave(
  allPackages: RateCardPackage[],
  edited: RateCardPackage,
  isNew: boolean,
): RateCardPackage[] {
  const normalized = normalizePackage(edited);
  const merged = isNew
    ? [...allPackages, normalized]
    : allPackages.map((item) => (item.id === normalized.id ? normalized : item));

  if (!normalized.recommended) {
    return merged.map((item) => normalizePackage(item));
  }

  return merged.map((item) =>
    normalizePackage({
      ...item,
      recommended: item.id === normalized.id ? true : undefined,
    }),
  );
}

function paramFlag(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === '1' || raw === 'true';
}

function paramString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

function excludeDeletedPackage(
  packages: RateCardPackage[],
  target: RateCardPackage,
  packageIdParam?: string,
): RateCardPackage[] {
  return packages.filter((item) => {
    if (item.id === target.id) return false;
    if (packageIdParam && item.id === packageIdParam) return false;
    return true;
  });
}

export default function PricingEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ packageId?: string | string[]; new?: string | string[] }>();
  const packageId = paramString(params.packageId);
  const isNew = paramFlag(params.new);

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
  const [pkg, setPkg] = useState<RateCardPackage | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!rateCardQuery.data) return;
    if (isNew) {
      setPkg(createEmptyPackage());
      return;
    }
    if (!packageId) {
      setPkg(null);
      return;
    }
    const existing = rateCardQuery.data.find((item) => item.id === packageId);
    setPkg(existing ? structuredClone(existing) : null);
  }, [rateCardQuery.data, packageId, isNew]);

  const canSave = useMemo(() => {
    if (!pkg || !rateCardQuery.data) return false;
    if (!isPackageFormValid(pkg, t)) return false;
    if (!pkg.recommended) return true;
    return !rateCardQuery.data.some((item) => item.id !== pkg.id && item.recommended);
  }, [pkg, rateCardQuery.data, t]);

  const saveDisabledReason = useMemo(() => {
    if (!pkg) return t('pricingEditScreen.missingPackageBody');
    if (!pkg.name.trim()) {
      return t('pricingEditScreen.saveBlockedMissingName', {
        title: pkg.name.trim() || t('pricingEditScreen.titleNew'),
      });
    }
    if (!isPackageFormValid(pkg, t)) {
      return t('pricingEditScreen.saveBlockedMissingPrice', {
        title: pkg.name.trim() || t('pricingEditScreen.titleNew'),
      });
    }
    if (pkg.recommended && rateCardQuery.data?.some((item) => item.id !== pkg.id && item.recommended)) {
      return t('pricingEditScreen.saveBlockedMultipleRecommended');
    }
    return null;
  }, [pkg, rateCardQuery.data, t]);

  const screenTitle = isNew
    ? t('pricingEditScreen.titleNew')
    : pkg?.name.trim() || t('pricingEditScreen.titleEdit');

  const onSave = async () => {
    if (!pkg || !rateCardQuery.data || !canSave) return;
    try {
      await saveMutation.mutateAsync(mergePackagesForSave(rateCardQuery.data, pkg, isNew));
      setSavedFlash(true);
      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/pricing' as Href);
      }, 400);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('pricingEditScreen.saveFailedBody');
      void alertAction(t('pricingEditScreen.saveFailedTitle'), message);
    }
  };

  const onDelete = async () => {
    if (!pkg || !rateCardQuery.data || isNew) return;
    const confirmed = await confirmAction({
      title: t('pricingEditScreen.deleteConfirmTitle'),
      message: t('pricingEditScreen.deleteConfirmBody', { name: pkg.name.trim() || t('pricingEditScreen.titleEdit') }),
      confirmLabel: t('pricingEditScreen.removePackage'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const remaining = excludeDeletedPackage(rateCardQuery.data, pkg, packageId).map(normalizePackage);
      await saveMutation.mutateAsync(remaining);
      if (router.canGoBack()) router.back();
      else router.replace('/pricing' as Href);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('pricingEditScreen.saveFailedBody');
      void alertAction(t('pricingEditScreen.saveFailedTitle'), message);
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
          onRetry={() => queryClient.invalidateQueries({ queryKey: rateCardPackagesQueryKey() })}
        />
      </PlaceholderScreen>
    );
  }

  if (!isNew && !packageId) {
    return (
      <PlaceholderScreen
        title={t('pricingEditScreen.missingPackageTitle')}
        description={t('pricingEditScreen.missingPackageBody')}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/pricing' as Href)}
          style={[styles.backLink, { borderColor: theme.border }]}>
          <Text style={[styles.backLinkLabel, { color: theme.primary }]}>{t('pricingEditScreen.backToPricing')}</Text>
        </Pressable>
      </PlaceholderScreen>
    );
  }

  if (!pkg) {
    return (
      <PlaceholderScreen
        title={t('pricingEditScreen.packageNotFoundTitle')}
        description={t('pricingEditScreen.packageNotFoundBody')}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/pricing' as Href)}
          style={[styles.backLink, { borderColor: theme.border }]}>
          <Text style={[styles.backLinkLabel, { color: theme.primary }]}>{t('pricingEditScreen.backToPricing')}</Text>
        </Pressable>
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
          title={screenTitle}
          lead={isNew ? t('pricingEditScreen.descriptionNew') : t('pricingEditScreen.descriptionEdit')}
          scrollBottomInset={scrollBottomInset}>
          <PackageEditForm
            pkg={pkg}
            theme={theme}
            t={t}
            onUpdate={(patch) => setPkg((current) => (current ? { ...current, ...patch } : current))}
            onSetRecommended={(enabled) =>
              setPkg((current) => (current ? { ...current, recommended: enabled ? true : undefined } : current))
            }
            onDelete={!isNew ? onDelete : undefined}
          />

          {!canSave && saveDisabledReason ? (
            <Text style={[styles.saveHint, { color: theme.mutedForeground }]}>{saveDisabledReason}</Text>
          ) : null}
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

type PackageEditFormProps = {
  pkg: RateCardPackage;
  theme: (typeof palette)['light'];
  t: ReturnType<typeof useTranslation>['t'];
  onUpdate: (patch: Partial<RateCardPackage>) => void;
  onSetRecommended: (enabled: boolean) => void;
  onDelete?: () => void;
};

function PackageEditForm({ pkg, theme, t, onUpdate, onSetRecommended, onDelete }: PackageEditFormProps) {
  return (
    <View style={[styles.packageCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
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
        <RateCardPackageStructuredFields key={pkg.id} pkg={pkg} theme={theme} t={t} onUpdate={onUpdate} />
        <FieldLabel theme={theme} label={t('pricingEditScreen.labelAddOnHint')} />
        <TextInput
          value={pkg.addOnHint}
          onChangeText={(value) => onUpdate({ addOnHint: value })}
          placeholder={t('pricingEditScreen.placeholderAddOnHint')}
          multiline
          {...getTextInputProps(theme)}
          style={getTextInputStyle(theme, { multiline: true, minHeight: 72 })}
        />
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[styles.toggleLabel, { color: theme.foreground }]}>{t('pricingEditScreen.labelRecommended')}</Text>
            <Text style={[styles.toggleHint, { color: theme.mutedForeground }]}>{t('pricingEditScreen.recommendedHint')}</Text>
          </View>
          <Switch value={pkg.recommended === true} onValueChange={onSetRecommended} trackColor={{ true: theme.primary }} />
        </View>
        {onDelete ? (
          <Pressable
            testID="pricing-edit-delete-package"
            accessibilityRole="button"
            onPress={onDelete}
            style={[styles.deleteRow, { borderColor: '#FDA4AF55', backgroundColor: '#2A101208' }]}>
            <Ionicons name="trash-outline" size={16} color="#FDA4AF" />
            <Text style={styles.deleteLabel}>{t('pricingEditScreen.removePackage')}</Text>
          </Pressable>
        ) : null}
      </View>
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
  },
  packageBody: { gap: spacing.sm },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.xs },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  toggleLabel: { fontSize: fontSize.body, fontWeight: '600' },
  toggleHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin - 6,
    paddingHorizontal: spacing.md,
  },
  deleteLabel: { color: '#FDA4AF', fontSize: fontSize.bodySmall, fontWeight: '700' },
  saveHint: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backLink: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  backLinkLabel: { fontSize: fontSize.body, fontWeight: '700' },
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
