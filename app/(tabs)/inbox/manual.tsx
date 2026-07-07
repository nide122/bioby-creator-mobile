import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getTextInputProps,
  getTextInputStyle,
  HubScreen,
  SectionCard,
  SegmentedControl,
} from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
import { createManualOpportunity } from '@/src/api/opportunities-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { alertAction } from '@/src/lib/app-dialog';
import { tenantQueryKey } from '@/src/lib/tenant-query';
import { useSessionStore } from '@/src/stores/session-store';

const PLATFORM_IDS = ['tiktok', 'youtube', 'instagram', 'other'] as const;

type PlatformValue = (typeof PLATFORM_IDS)[number];

const CURRENCY_OPTIONS = [
  { id: 'USD' as const, label: 'USD' },
  { id: 'CNY' as const, label: 'CNY' },
];

export default function InboxManualOpportunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tenantPublicId = useSessionStore((s) => s.tenantPublicId);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const platformOptions = useMemo(
    () =>
      PLATFORM_IDS.map((id) => ({
        id,
        label: t(`opportunityManualScreen.platform.${id}`),
      })),
    [t],
  );

  const [brandName, setBrandName] = useState('');
  const [platform, setPlatform] = useState<PlatformValue>('tiktok');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState<'CNY' | 'USD'>('USD');
  const [budgetLabel, setBudgetLabel] = useState('');
  const [deliverableLabel, setDeliverableLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = brandName.trim().length > 0 && !submitting && shouldUseBackendApi();

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const parsedAmount = budgetAmount.trim() ? Number(budgetAmount.trim()) : undefined;
      const detail = await createManualOpportunity({
        brandName: brandName.trim(),
        platform,
        budgetAmount: parsedAmount != null && Number.isFinite(parsedAmount) ? parsedAmount : undefined,
        budgetCurrency: budgetAmount.trim() ? budgetCurrency : undefined,
        budgetLabel: budgetLabel.trim() || undefined,
        deliverableLabel: deliverableLabel.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantPublicId, 'inbox') }),
        queryClient.invalidateQueries({ queryKey: ['home', 'inbox-summary'] }),
      ]);
      router.replace(`/inbox/${detail.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('opportunityManualScreen.saveFailedBody');
      void alertAction(t('opportunityManualScreen.saveFailedTitle'), message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!shouldUseBackendApi()) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.mutedForeground }}>{t('opportunityManualScreen.backendRequired')}</Text>
      </View>
    );
  }

  return (
    <HubScreen
      eyebrow={t('opportunityManualScreen.eyebrow')}
      title={t('opportunityManualScreen.title')}
      lead={t('opportunityManualScreen.lead')}
      scrollBottomInset={layout.tabBarScrollInset}>
        <SectionCard title={t('opportunityManualScreen.basicSectionTitle')}>
          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
            {t('opportunityManualScreen.brandNameLabel')}
          </Text>
          <TextInput
            {...getTextInputProps(theme)}
            value={brandName}
            onChangeText={setBrandName}
            placeholder={t('opportunityManualScreen.brandNamePlaceholder')}
            placeholderTextColor={theme.mutedForeground}
            style={getTextInputStyle(theme)}
          />

          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
            {t('opportunityManualScreen.platformLabel')}
          </Text>
          <SegmentedControl options={platformOptions} value={platform} onChange={setPlatform} />
        </SectionCard>

        <SectionCard title={t('opportunityManualScreen.budgetSectionTitle')}>
          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
            {t('opportunityManualScreen.budgetAmountLabel')}
          </Text>
          <View style={styles.row}>
            <TextInput
              {...getTextInputProps(theme)}
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              placeholder={t('opportunityManualScreen.budgetAmountPlaceholder')}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.mutedForeground}
              style={[getTextInputStyle(theme), styles.amountInput]}
            />
            <SegmentedControl
              options={CURRENCY_OPTIONS}
              value={budgetCurrency}
              onChange={setBudgetCurrency}
            />
          </View>
          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
            {t('opportunityManualScreen.budgetLabelFieldLabel')}
          </Text>
          <TextInput
            {...getTextInputProps(theme)}
            value={budgetLabel}
            onChangeText={setBudgetLabel}
            placeholder={t('opportunityManualScreen.budgetLabelPlaceholder')}
            placeholderTextColor={theme.mutedForeground}
            style={getTextInputStyle(theme)}
          />
        </SectionCard>

        <SectionCard title={t('opportunityManualScreen.deliverablesSectionTitle')}>
          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
            {t('opportunityManualScreen.deliverableLabel')}
          </Text>
          <TextInput
            {...getTextInputProps(theme)}
            value={deliverableLabel}
            onChangeText={setDeliverableLabel}
            placeholder={t('opportunityManualScreen.deliverablePlaceholder')}
            placeholderTextColor={theme.mutedForeground}
            style={getTextInputStyle(theme)}
          />
          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
            {t('opportunityManualScreen.notesLabel')}
          </Text>
          <TextInput
            {...getTextInputProps(theme)}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('opportunityManualScreen.notesPlaceholder')}
            placeholderTextColor={theme.mutedForeground}
            multiline
            style={[getTextInputStyle(theme), styles.notesInput]}
          />
        </SectionCard>

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => void onSubmit()}
          style={[
            styles.saveButton,
            { backgroundColor: canSubmit ? theme.primary : theme.muted },
          ]}>
          {submitting ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <Text style={[styles.saveLabel, { color: theme.primaryForeground }]}>
              {t('opportunityManualScreen.saveCta')}
            </Text>
          )}
        </Pressable>

        <Pressable accessibilityRole="link" onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: theme.mutedForeground }]}>
            {t('opportunityManualScreen.cancel')}
          </Text>
        </Pressable>
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  label: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.sm,
  },
  amountInput: {
    marginBottom: spacing.sm,
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  saveButton: {
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  cancel: {
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: fontSize.bodySmall,
  },
});
