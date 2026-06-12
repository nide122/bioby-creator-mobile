import { Text, View, StyleSheet, type DimensionValue } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, radii, spacing } from '@/constants/tokens';

export type OnboardingStepKey = 'profile' | 'consent' | 'email' | 'complete';

const STEPS: { key: OnboardingStepKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'consent', label: 'Consent' },
  { key: 'email', label: 'Inbox' },
  { key: 'complete', label: 'Done' },
];

type Props = {
  current: OnboardingStepKey;
};

export function OnboardingProgress({ current }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const activeIndex = STEPS.findIndex((s) => s.key === current);
  const activeStep = STEPS[activeIndex] ?? STEPS[0];
  const progress = `${((activeIndex + 1) / STEPS.length) * 100}%` as DimensionValue;

  return (
    <View style={styles.wrap}>
      <View style={styles.metaRow}>
        <Text style={[styles.title, { color: theme.foregroundEyebrow }]}>
          Step {activeIndex + 1} of {STEPS.length}
        </Text>
        <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{activeStep.label}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.secondary }]}>
        <View style={[styles.fill, { backgroundColor: theme.primary, width: progress }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { fontSize: fontSize.caption, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  label: { fontSize: fontSize.caption, fontWeight: '800' },
  track: { height: 4, borderRadius: radii.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.sm },
});
