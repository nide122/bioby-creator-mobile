import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';

export type OpportunityPathStep = 'inbox' | 'draft' | 'deal';

export function OpportunityPath({ currentStep }: { currentStep: OpportunityPathStep }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const steps = useMemo(
    (): { id: OpportunityPathStep; label: string; hint: string }[] => [
      { id: 'inbox', label: t('opportunityPath.inboxLabel'), hint: t('opportunityPath.inboxHint') },
      { id: 'draft', label: t('opportunityPath.draftLabel'), hint: t('opportunityPath.draftHint') },
      { id: 'deal', label: t('opportunityPath.dealLabel'), hint: t('opportunityPath.dealHint') },
    ],
    [t]
  );

  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t('opportunityPath.title')}</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <View key={step.id} style={styles.step}>
              <View
                style={[
                  styles.dot,
                  {
                    borderColor: active || done ? theme.primary : theme.border,
                    backgroundColor: done ? theme.primary : active ? theme.primary + '18' : theme.secondary,
                  },
                ]}>
                {done ? (
                  <Ionicons name="checkmark" size={12} color={theme.primaryForeground} />
                ) : (
                  <Text style={[styles.dotLabel, { color: active ? theme.primary : theme.foregroundEyebrow }]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, { color: active ? theme.foreground : theme.mutedForeground }]}>
                {step.label}
              </Text>
              <Text style={[styles.stepHint, { color: theme.foregroundEyebrow }]} numberOfLines={2}>
                {step.hint}
              </Text>
            </View>
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
    gap: spacing.md,
  },
  title: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  steps: { flexDirection: 'row', gap: spacing.sm },
  step: { flex: 1, gap: spacing.xs },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: { fontSize: fontSize.caption, fontWeight: '800' },
  stepLabel: { fontSize: fontSize.caption, fontWeight: '800' },
  stepHint: { fontSize: fontSize.eyebrow, lineHeight: lineHeight.body },
});
